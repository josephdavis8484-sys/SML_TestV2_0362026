import React, { useState, useEffect, useRef, useCallback } from "react";
import { axiosInstance } from "@/App";
import { toast } from "sonner";
import { 
  Video, 
  VideoOff, 
  RefreshCw, 
  Users, 
  Share2,
  X,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Simple Stage component that renders all remote video/audio
const Stage = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const remoteTracks = tracks.filter((track) => !track.participant.isLocal);
  const videoTracks = remoteTracks.filter((t) => t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare);

  return (
    <div className="w-full h-full">
      <RoomAudioRenderer />
      
      {videoTracks.length > 0 ? (
        <GridLayout tracks={videoTracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Waiting for creator to start streaming...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Share Modal
const ShareModal = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Share Stream</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch ${eventTitle} live!`)}&url=${encodeURIComponent(eventUrl)}`} 
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">𝕏</span>
            <span>Twitter</span>
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Watch ${eventTitle} live! ${eventUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">📱</span>
            <span>WhatsApp</span>
          </a>
          <button onClick={copyLink} className="flex items-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">🔗</span>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Overlay with LIVE badge
const StreamOverlay = ({ streamTime, onShare, viewerCount }) => {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="absolute top-3 left-12 flex items-center gap-2 z-10">
        <div className="bg-red-600 px-2.5 py-1 rounded flex items-center gap-1.5">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-xs">LIVE</span>
        </div>
        <div className="bg-black/60 px-2 py-1 rounded flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{viewerCount}</span>
        </div>
      </div>
      
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <div className="bg-black/60 px-2 py-1 rounded">
          <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
        </div>
        <button onClick={onShare} className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded flex items-center gap-1">
          <Share2 className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Share</span>
        </button>
      </div>
    </>
  );
};

const LiveStreamViewer = ({ eventId, userId, userName, event }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamTime, setStreamTime] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatConnected, setChatConnected] = useState(false);
  const chatWsRef = useRef(null);

  // Stream timer
  useEffect(() => {
    const timer = setInterval(() => setStreamTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get LiveKit token
  useEffect(() => {
    const getToken = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.post("/livekit/join-as-viewer", {
          event_id: eventId,
          user_id: userId,
          user_name: userName || "Viewer"
        });
        
        if (response.data.token && response.data.url) {
          setToken(response.data.token);
          setWsUrl(response.data.url);
        } else {
          throw new Error("Invalid response");
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to connect");
      } finally {
        setLoading(false);
      }
    };
    getToken();
  }, [eventId, userId, userName]);

  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  // Chat WebSocket - Connect function with auto-reconnect and exponential backoff
  const connectChatWebSocket = useCallback(() => {
    if (!eventId) return;
    
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (!(chatEnabled || reactionsEnabled)) return;
    
    // Build WebSocket URL
    let chatWsUrl = BACKEND_URL;
    if (!chatWsUrl) {
      console.error("❌ BACKEND_URL is not defined!");
      return;
    }
    
    chatWsUrl = chatWsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    chatWsUrl = `${chatWsUrl}/api/ws/chat/${eventId}`;
    
    // Close existing connection if any
    if (chatWsRef.current && chatWsRef.current.readyState !== WebSocket.CLOSED) {
      chatWsRef.current.close();
    }
    
    try {
      chatWsRef.current = new WebSocket(chatWsUrl);
      
      chatWsRef.current.onopen = () => {
        setChatConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        toast.success("Connected to chat!");
      };
      
      chatWsRef.current.onmessage = (wsEvent) => {
        // Ignore pong responses silently
        if (wsEvent.data === "pong") return;
        
        try {
          const data = JSON.parse(wsEvent.data);
          // Viewers don't display messages per design spec - only track connection state
        } catch (e) {
          // Silent error handling
        }
      };
      
      chatWsRef.current.onclose = (closeEvent) => {
        setChatConnected(false);
        
        // Auto-reconnect with exponential backoff
        if (closeEvent.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current += 1;
          setTimeout(() => {
            connectChatWebSocket();
          }, delay);
        }
      };
      
      chatWsRef.current.onerror = (error) => {
        setChatConnected(false);
      };
    } catch (err) {
      console.error("❌ Failed to create viewer WebSocket:", err);
    }
  }, [eventId, event?.chat_enabled, event?.reactions_enabled]);
  
  // Connect WebSocket and setup keepalive when event loads
  useEffect(() => {
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (eventId && (chatEnabled || reactionsEnabled)) {
      connectChatWebSocket();
    }
    
    // Aggressive keepalive ping every 15 seconds to prevent timeout
    const pingInterval = setInterval(() => {
      if (chatWsRef.current && chatWsRef.current.readyState === WebSocket.OPEN) {
        chatWsRef.current.send("ping");
      }
    }, 15000);
    
    return () => {
      clearInterval(pingInterval);
      if (chatWsRef.current) {
        console.log("🧹 Cleaning up viewer WebSocket");
        chatWsRef.current.close();
      }
    };
  }, [eventId, event?.chat_enabled, event?.reactions_enabled, connectChatWebSocket]);

  const handleSendChat = () => {
    if (!chatMessage.trim()) {
      console.log("❌ Empty message, not sending");
      return;
    }
    
    console.log("🔍 WebSocket state:", chatWsRef.current?.readyState, "OPEN state is:", WebSocket.OPEN);
    
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      const msg = { 
        type: "message", 
        username: userName || "Viewer", 
        message: chatMessage.trim() 
      };
      console.log("📤 Viewer SENDING chat message:", JSON.stringify(msg));
      chatWsRef.current.send(JSON.stringify(msg));
      toast.success("Message sent!");
      setChatMessage("");
    } else {
      console.error("❌ WebSocket not open. Current state:", chatWsRef.current?.readyState);
      toast.error("Chat not connected. Please refresh.");
    }
  };

  const handleSendReaction = (emoji) => {
    console.log("🔍 Sending reaction. WebSocket state:", chatWsRef.current?.readyState, "OPEN state is:", WebSocket.OPEN);
    
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      const msg = { 
        type: "reaction", 
        emoji, 
        username: userName || "Viewer" 
      };
      console.log("📤 Viewer SENDING reaction:", JSON.stringify(msg));
      chatWsRef.current.send(JSON.stringify(msg));
      toast.success(`${emoji} sent!`);
    } else {
      console.error("❌ WebSocket not open for reaction. Current state:", chatWsRef.current?.readyState);
      toast.error("Chat not connected. Please refresh.");
    }
  };

  const chatEnabled = event?.chat_enabled;
  const reactionsEnabled = event?.reactions_enabled;
  const showInteraction = chatEnabled || reactionsEnabled;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <VideoOff className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white mb-2">Unable to connect</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="absolute top-3 left-3 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Video Area */}
      <div className="flex-1 relative min-h-0">
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={false}
          video={false}
          options={{
            adaptiveStream: true,
            dynacast: true,
            disconnectOnPageLeave: false,
            reconnectPolicy: {
              nextRetryDelayInMs: (ctx) => {
                // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
                return Math.min(1000 * Math.pow(2, ctx.retryCount), 10000);
              },
              maxRetries: 10
            }
          }}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <Stage />
          <StreamOverlay streamTime={streamTime} onShare={() => setShowShareModal(true)} viewerCount={1} />
        </LiveKitRoom>
      </div>

      {/* Chat/Reactions Bar */}
      {showInteraction && (
        <div className="bg-gray-900 border-t border-gray-800 p-3">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            {chatEnabled && (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={chatConnected ? "Send a message..." : "Connecting to chat..."}
                  disabled={!chatConnected}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 disabled:opacity-50"
                />
                <button 
                  onClick={handleSendChat} 
                  disabled={!chatMessage.trim() || !chatConnected} 
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm"
                >
                  Send
                </button>
              </div>
            )}
            {reactionsEnabled && (
              <div className="flex gap-1.5">
                {["👍", "😄", "❤️", "👏"].map((emoji) => (
                  <button 
                    key={emoji} 
                    onClick={() => handleSendReaction(emoji)} 
                    disabled={!chatConnected}
                    className="w-11 h-11 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Connection status indicator */}
          <div className="text-center mt-2">
            <span className={`text-xs ${chatConnected ? 'text-green-400' : 'text-yellow-400'}`}>
              {chatConnected ? '● Chat connected' : '○ Connecting to chat...'}
            </span>
          </div>
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} eventTitle={event?.title || "Live Stream"} eventUrl={`${window.location.origin}/event/${eventId}`} />
    </div>
  );
};

export default LiveStreamViewer;
