/**
 * Chat WebSocket Connection Manager
 */

class ChatManager {
  constructor() {
    // Map: eventId -> Set of WebSocket connections
    this.connections = new Map();
  }

  handleConnection(ws, eventId) {
    // Add connection to event room
    if (!this.connections.has(eventId)) {
      this.connections.set(eventId, new Set());
    }
    this.connections.get(eventId).add(ws);

    console.log(`[Chat] Client connected to event ${eventId}. Total: ${this.connections.get(eventId).size}`);

    // Handle incoming messages
    ws.on('message', (data) => {
      const message = data.toString();
      
      // Handle ping/pong
      if (message === 'ping') {
        ws.send('pong');
        return;
      }

      try {
        const parsed = JSON.parse(message);
        this.broadcastToEvent(eventId, parsed, ws);
      } catch (error) {
        console.error('[Chat] Invalid message format:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.removeConnection(eventId, ws);
    });

    ws.on('error', (error) => {
      console.error('[Chat] WebSocket error:', error);
      this.removeConnection(eventId, ws);
    });
  }

  removeConnection(eventId, ws) {
    const eventConnections = this.connections.get(eventId);
    if (eventConnections) {
      eventConnections.delete(ws);
      if (eventConnections.size === 0) {
        this.connections.delete(eventId);
      }
      console.log(`[Chat] Client disconnected from event ${eventId}. Remaining: ${eventConnections?.size || 0}`);
    }
  }

  broadcastToEvent(eventId, message, excludeWs = null) {
    const eventConnections = this.connections.get(eventId);
    if (!eventConnections) return;

    const messageStr = JSON.stringify(message);
    const disconnected = [];

    eventConnections.forEach((ws) => {
      if (ws !== excludeWs && ws.readyState === 1) { // 1 = OPEN
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('[Chat] Error sending message:', error);
          disconnected.push(ws);
        }
      }
    });

    // Clean up disconnected sockets
    disconnected.forEach((ws) => this.removeConnection(eventId, ws));
  }

  getConnectionCount(eventId) {
    return this.connections.get(eventId)?.size || 0;
  }

  // Broadcast to all connections for an event (including sender)
  broadcastToAll(eventId, message) {
    const eventConnections = this.connections.get(eventId);
    if (!eventConnections) return;

    const messageStr = JSON.stringify(message);
    eventConnections.forEach((ws) => {
      if (ws.readyState === 1) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('[Chat] Error broadcasting:', error);
        }
      }
    });
  }
}

module.exports = { ChatManager };
