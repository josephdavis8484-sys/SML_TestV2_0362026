/**
 * Notification WebSocket Connection Manager
 */

class NotificationManager {
  constructor() {
    // Map: userId -> Set of WebSocket connections
    this.connections = new Map();
  }

  handleConnection(ws, userId) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(ws);

    console.log(`[Notifications] User ${userId} connected. Total connections: ${this.connections.get(userId).size}`);

    // Handle ping/pong
    ws.on('message', (data) => {
      const message = data.toString();
      if (message === 'ping') {
        ws.send('pong');
      }
    });

    ws.on('close', () => {
      this.removeConnection(userId, ws);
    });

    ws.on('error', (error) => {
      console.error('[Notifications] WebSocket error:', error);
      this.removeConnection(userId, ws);
    });
  }

  removeConnection(userId, ws) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
      console.log(`[Notifications] User ${userId} disconnected. Remaining: ${userConnections?.size || 0}`);
    }
  }

  async sendToUser(userId, notification) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return false;

    const messageStr = JSON.stringify(notification);
    const disconnected = [];

    userConnections.forEach((ws) => {
      if (ws.readyState === 1) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('[Notifications] Error sending:', error);
          disconnected.push(ws);
        }
      }
    });

    disconnected.forEach((ws) => this.removeConnection(userId, ws));
    return true;
  }

  async sendToMultipleUsers(userIds, notification) {
    const results = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, notification))
    );
    return results.filter(Boolean).length;
  }

  isUserConnected(userId) {
    const connections = this.connections.get(userId);
    return connections && connections.size > 0;
  }
}

module.exports = { NotificationManager };
