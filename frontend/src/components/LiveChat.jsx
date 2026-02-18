import React, { useState, useEffect, useRef, useCallback } from "react";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  Send, 
  HelpCircle,
  Pin,
  X,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { toast } from "sonner";

const REACTION_EMOJIS = {
  heart: "❤️",
  clap: "👏",
  fire: "🔥",
  laugh: "😂",
  wow: "😮"
};

const LiveChat = ({ eventId, user, chatEnabled, reactionsEnabled, chatMode, isCreator = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [reactionCounts, setReactionCounts] = useState({});
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get WebSocket URL from environment
  const getWebSocketUrl = useCallback(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    // Convert http(s) to ws(s)
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = backendUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${wsHost}/ws/chat/${eventId}`;
  }, [eventId]);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds (unless intentionally closed)
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnected(false);
    }
  }, [getWebSocketUrl]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'connected':
        setViewerCount(data.viewer_count);
        break;
        
      case 'new_message':
      case 'announcement':
        setMessages(prev => [...prev, data.message]);
        break;
        
      case 'reaction':
        // Add floating reaction animation
        const id = Date.now();
        const left = Math.random() * 80 + 10;
        setFloatingReactions(prev => [...prev, { id, type: data.reaction_type, left }]);
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
        // Update count
        setReactionCounts(prev => ({
          ...prev,
          [data.reaction_type]: (prev[data.reaction_type] || 0) + 1
        }));
        break;
        
      case 'viewer_count':
        setViewerCount(data.count);
        break;
        
      case 'typing':
        if (data.user_name !== user?.name) {
          setTypingUser(data.user_name);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 2000);
        }
        break;
        
      case 'message_pinned':
        setMessages(prev => prev.map(msg => 
          msg.id === data.message_id ? { ...msg, is_pinned: true } : msg
        ));
        break;
        
      case 'message_hidden':
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, [user?.name]);

  // Initialize WebSocket and fetch initial data
  useEffect(() => {
    if (chatEnabled) {
      // Fetch initial messages
      fetchMessages();
      // Connect to WebSocket
      connectWebSocket();
      
      // Set up ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send('ping');
        }
      }, 30000);
      
      return () => {
        clearInterval(pingInterval);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (wsRef.current) {
          wsRef.current.close(1000, 'Component unmounting');
        }
      };
    }
    
    if (reactionsEnabled) {
      fetchReactionCounts();
    }
  }, [eventId, chatEnabled, connectWebSocket, reactionsEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await axiosInstance.get(`/events/${eventId}/chat`);
      if (response.data.enabled) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchReactionCounts = async () => {
    try {
      const response = await axiosInstance.get(`/events/${eventId}/reactions/count`);
      setReactionCounts(response.data.counts || {});
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        user_name: user.name
      }));
    }
  }, [user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    setSending(true);
    try {
      const messageType = chatMode === "questions_only" ? "question" : "chat";
      await axiosInstance.post(`/events/${eventId}/chat`, {
        message: newMessage,
        message_type: messageType
      });
      setNewMessage("");
      // Note: Message will be added via WebSocket broadcast
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send message");
      // Fallback: fetch messages if WebSocket fails
      fetchMessages();
    } finally {
      setSending(false);
    }
  };

  const handleSendReaction = async (type) => {
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }
    
    try {
      await axiosInstance.post(`/events/${eventId}/reactions`, {
        reaction_type: type
      });
      // Note: Reaction will be broadcast via WebSocket
    } catch (error) {
      toast.error("Failed to send reaction");
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      await axiosInstance.post(`/events/${eventId}/chat/${messageId}/pin`);
      toast.success("Message pinned");
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_pinned: true } : msg
      ));
    } catch (error) {
      toast.error("Failed to pin message");
    }
  };

  const handleHideMessage = async (messageId) => {
    try {
      await axiosInstance.post(`/events/${eventId}/chat/${messageId}/hide`);
      toast.success("Message hidden");
      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      toast.error("Failed to hide message");
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    sendTypingIndicator();
  };

  if (!chatEnabled && !reactionsEnabled) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/80 rounded-lg border border-gray-700 overflow-hidden relative" data-testid="live-chat">
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-4xl animate-float-up"
            style={{
              left: `${reaction.left}%`,
              bottom: "20%",
              animation: "floatUp 3s ease-out forwards"
            }}
          >
            {REACTION_EMOJIS[reaction.type]}
          </div>
        ))}
      </div>

      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <span className="text-white font-semibold">Live Chat</span>
          {chatMode === "questions_only" && (
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Q&A Mode</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1" title={isConnected ? "Connected" : "Reconnecting..."}>
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
            )}
          </div>
          {/* Viewer Count */}
          <div className="flex items-center gap-1 text-gray-400 text-sm" data-testid="viewer-count">
            <Users className="w-4 h-4" />
            <span>{viewerCount}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {chatEnabled && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">No messages yet</p>
              <p className="text-gray-600 text-sm">Be the first to say something!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`group flex gap-3 ${msg.message_type === "announcement" ? "bg-blue-600/20 p-3 rounded-lg" : ""} ${msg.is_pinned ? "border-l-2 border-yellow-500 pl-2" : ""}`}
              >
                {msg.user_picture ? (
                  <img 
                    src={msg.user_picture} 
                    alt={msg.user_name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {msg.user_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${msg.message_type === "announcement" ? "text-blue-400" : "text-gray-300"}`}>
                      {msg.user_name}
                    </span>
                    {msg.message_type === "question" && (
                      <HelpCircle className="w-3 h-3 text-purple-400" />
                    )}
                    {msg.message_type === "announcement" && (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Announcement</span>
                    )}
                    {msg.is_pinned && (
                      <Pin className="w-3 h-3 text-yellow-500" />
                    )}
                    <span className="text-gray-600 text-xs">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-sm ${msg.message_type === "question" ? "text-purple-300" : "text-white"}`}>
                    {msg.message_type === "question" && "Q: "}
                    {msg.message}
                  </p>
                </div>
                {/* Creator moderation buttons */}
                {isCreator && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!msg.is_pinned && (
                      <button
                        onClick={() => handlePinMessage(msg.id)}
                        className="p-1 text-gray-500 hover:text-yellow-500"
                        title="Pin message"
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleHideMessage(msg.id)}
                      className="p-1 text-gray-500 hover:text-red-500"
                      title="Hide message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Typing Indicator */}
      {typingUser && (
        <div className="px-4 py-1 text-gray-500 text-xs italic">
          {typingUser} is typing...
        </div>
      )}

      {/* Reaction Buttons */}
      {reactionsEnabled && (
        <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-2">
          <span className="text-gray-500 text-xs">React:</span>
          {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
            <button
              key={type}
              onClick={() => handleSendReaction(type)}
              className="text-2xl hover:scale-125 transition-transform relative"
              title={type}
              data-testid={`reaction-${type}`}
            >
              {emoji}
              {reactionCounts[type] > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {reactionCounts[type] > 99 ? "99+" : reactionCounts[type]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Message Input */}
      {chatEnabled && (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
          {!user ? (
            <p className="text-gray-500 text-center text-sm py-2">Sign in to chat</p>
          ) : (
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder={chatMode === "questions_only" ? "Ask a question..." : "Type a message..."}
                className="flex-1 bg-gray-800 border-gray-700 text-white text-sm"
                disabled={sending}
                data-testid="chat-input"
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 px-3"
                data-testid="send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </form>
      )}

      {/* CSS for floating animation */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px) scale(1.5);
          }
        }
      `}</style>
    </div>
  );
};

export default LiveChat;
