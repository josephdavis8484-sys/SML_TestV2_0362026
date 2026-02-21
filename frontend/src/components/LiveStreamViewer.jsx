import React, { useState, useEffect, useCallback, useRef } from "react";
import { axiosInstance } from "@/App";
import { toast } from "sonner";
import { 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RefreshCw, 
  Users, 
  Share2,
  Send,
  X
} from "lucide-react";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useRoomContext,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Video Player Component that shows the stream
const VideoPlayer = ({ viewerCount, streamTime, onShare }) => {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const participants = useParticipants();
  
  // Find the first video track from a publisher (creator)
  const videoTrack = tracks.find(
    (track) => 
      track.publication?.kind === "video" && 
      track.publication?.isSubscribed
  );

  const audioTracks = tracks.filter(
    (track) => track.publication?.kind === "audio"
  );

  // Format stream time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!videoTrack) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Waiting for stream to start...</p>
          <p className="text-gray-500 text-sm mt-2">The creator will begin streaming shortly</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-sm">{participants.length} viewer(s) connected</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <VideoTrack
        trackRef={videoTrack}
        className="w-full h-full object-contain"
      />
      {/* Render audio tracks */}
      {audioTracks.map((track) => (
        <AudioTrack key={track.publication?.trackSid} trackRef={track} />
      ))}
      
      {/* Live indicator - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <div className="bg-red-600 px-3 py-1.5 rounded flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-sm">LIVE</span>
        </div>
        <div className="bg-black/60 px-3 py-1.5 rounded flex items-center gap-2">
          <Users className="w-4 h-4 text-white" />
          <span className="text-white font-medium text-sm">{viewerCount || participants.length}</span>
        </div>
      </div>
      
      {/* Stream time and Share - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <div className="bg-black/60 px-3 py-1.5 rounded flex items-center gap-2">
          <span className="text-white font-mono text-sm">{formatTime(streamTime)}</span>
        </div>
        <button
          onClick={onShare}
          className="bg-black/60 hover:bg-black/80 px-3 py-1.5 rounded flex items-center gap-2 transition-colors"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span className="text-white text-sm">Share</span>
        </button>
      </div>
    </div>
  );
};

// Live Chat Component for Viewer
const LiveChatPanel = ({ eventId, userName, onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sample messages for demonstration
  const sampleMessages = [
    { id: 1, username: "Alex", message: "Hi everyone", color: "#60a5fa" },
    { id: 2, username: "Jessica", message: "Excited for this topic!", color: "#f472b6" },
    { id: 3, username: "Brian", message: "Looking great on camera!", color: "#34d399" },
    { id: 4, username: "Amanda", message: "Hello there!", color: "#fbbf24" },
  ];

  useEffect(() => {
    if (eventId) {
      // Connect to WebSocket for live chat
      const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/chat/${eventId}`;
      
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log("Chat WebSocket connected");
        };

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "message") {
            setMessages(prev => [...prev.slice(-50), {
              id: Date.now(),
              username: data.username || "Anonymous",
              message: data.message,
              color: data.color || "#60a5fa"
            }]);
          }
        };

        wsRef.current.onclose = () => {
          console.log("Chat WebSocket disconnected");
        };
      } catch (error) {
        console.error("Failed to connect to chat:", error);
      }

      // Initialize with sample messages
      setMessages(sampleMessages);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [eventId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        username: userName || "You",
        message: inputMessage.trim()
      }));
      
      // Add message locally
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: userName || "You",
        message: inputMessage.trim(),
        color: "#60a5fa"
      }]);
      
      setInputMessage("");
    } else if (inputMessage.trim()) {
      // Fallback for demo when WS not connected
      setMessages(prev => [...prev, {
        id: Date.now(),
        username: userName || "You",
        message: inputMessage.trim(),
        color: "#60a5fa"
      }]);
      setInputMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-gray-800/50 rounded-lg px-3 py-2">
            <span className="font-bold" style={{ color: msg.color }}>
              {msg.username}:
            </span>
            <span className="text-gray-300 ml-2">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// Live Reactions Component for Viewer
const LiveReactionsPanel = ({ eventId, onSendReaction }) => {
  const [reactions, setReactions] = useState([]);
  const wsRef = useRef(null);

  // Available reaction emojis
  const reactionEmojis = ["👍", "😄", "❤️", "👏", "🔥"];

  useEffect(() => {
    if (eventId) {
      // Demo: Add random reactions periodically
      const interval = setInterval(() => {
        const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        addReaction(randomEmoji);
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [eventId]);

  const addReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 60 + 20; // 20% to 80%
    
    setReactions(prev => [...prev, { id, emoji, left }]);

    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  const handleReactionClick = (emoji) => {
    addReaction(emoji);
    if (onSendReaction) {
      onSendReaction(emoji);
    }
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Floating reactions */}
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl pointer-events-none"
          style={{
            left: `${reaction.left}%`,
            bottom: '20px',
            animation: 'floatUp 3s ease-out forwards'
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      {/* Static emoji display */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-3 items-end">
        <div className="text-5xl opacity-80 animate-bounce" style={{ animationDelay: '0.1s' }}>👍</div>
        <div className="text-5xl opacity-90 animate-bounce" style={{ animationDelay: '0.3s' }}>😄</div>
        <div className="text-5xl animate-bounce" style={{ animationDelay: '0.5s' }}>❤️</div>
        <div className="flex gap-2">
          <div className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>👏</div>
          <div className="text-4xl animate-bounce" style={{ animationDelay: '0.4s' }}>👏</div>
          <div className="text-4xl animate-bounce" style={{ animationDelay: '0.6s' }}>👏</div>
        </div>
      </div>

      {/* CSS for float animation */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-250px) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Share Modal Component
const ShareModal = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const shareLinks = [
    {
      name: "X (Twitter)",
      icon: "𝕏",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch ${eventTitle} live!`)}&url=${encodeURIComponent(eventUrl)}`
    },
    {
      name: "Facebook",
      icon: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`
    },
    {
      name: "WhatsApp",
      icon: "📱",
      url: `https://wa.me/?text=${encodeURIComponent(`Watch ${eventTitle} live! ${eventUrl}`)}`
    }
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-xl font-bold">Share This Stream</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-3">
          {shareLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors"
            >
              <span className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                {link.icon}
              </span>
              <span>{link.name}</span>
            </a>
          ))}
          
          <button
            onClick={copyLink}
            className="flex items-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
          >
            <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              🔗
            </span>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveStreamViewer = ({ eventId, userId, userName, event }) => {
  const [connectionState, setConnectionState] = useState("disconnected");
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamTime, setStreamTime] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatWsRef = useRef(null);

  // Stream timer
  useEffect(() => {
    let interval;
    if (connectionState === "connected") {
      interval = setInterval(() => {
        setStreamTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionState]);

  const connectToStream = useCallback(async () => {
    try {
      setError(null);
      setConnectionState("connecting");
      
      const response = await axiosInstance.post("/livekit/join-as-viewer", {
        event_id: eventId,
        user_id: userId,
        user_name: userName || "Viewer"
      });
      
      if (response.data.token && response.data.url) {
        setToken(response.data.token);
        setWsUrl(response.data.url);
        setConnectionState("connected");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Failed to connect to stream:", err);
      setError(err.response?.data?.detail || "Failed to connect to stream");
      setConnectionState("error");
      
      if (err.response?.status === 400) {
        toast.error("LiveKit is not configured for this event");
      } else if (err.response?.status === 404) {
        toast.error("Event not found");
      } else {
        toast.error("Failed to connect to live stream");
      }
    }
  }, [eventId, userId, userName]);

  useEffect(() => {
    connectToStream();
  }, [connectToStream]);

  const handleRetry = () => {
    connectToStream();
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleSendChat = () => {
    if (chatMessage.trim()) {
      // Send via WebSocket
      if (chatWsRef.current?.readyState === WebSocket.OPEN) {
        chatWsRef.current.send(JSON.stringify({
          type: "message",
          username: userName || "Viewer",
          message: chatMessage.trim()
        }));
      }
      setChatMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Check if chat/reactions are enabled
  const chatEnabled = event?.chat_enabled;
  const reactionsEnabled = event?.reactions_enabled;
  const showInteraction = chatEnabled || reactionsEnabled;

  if (connectionState === "connecting") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg">Connecting to live stream...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (connectionState === "error" || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Unable to connect to stream</p>
          <p className="text-gray-400 text-sm mb-4">{error || "Connection failed"}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Initializing stream viewer...</p>
        </div>
      </div>
    );
  }

  const eventUrl = `${window.location.origin}/event/${eventId}`;

  return (
    <div id="stream-container" className="flex flex-col h-full bg-black">
      {/* Video Player Area */}
      <div className="flex-1 relative">
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          video={false}
          audio={false}
          onDisconnected={() => {
            setConnectionState("disconnected");
            toast.info("Disconnected from stream");
          }}
          onError={(error) => {
            console.error("LiveKit error:", error);
            setError(error.message);
            setConnectionState("error");
          }}
        >
          <VideoPlayer 
            viewerCount={0}
            streamTime={streamTime}
            onShare={handleShare}
          />
        </LiveKitRoom>
      </div>

      {/* Chat & Reactions Panel - Only shown when enabled */}
      {showInteraction && (
        <div className="bg-gradient-to-b from-gray-900/90 to-black">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-6 p-4 h-[200px]">
            {/* Live Chat - Left Side */}
            {chatEnabled && (
              <div className="h-full">
                <LiveChatPanel 
                  eventId={eventId} 
                  userName={userName}
                />
              </div>
            )}
            
            {/* Live Reactions - Right Side */}
            {reactionsEnabled && (
              <div className="h-full">
                <LiveReactionsPanel eventId={eventId} />
              </div>
            )}
            
            {/* If only one is enabled, fill the space */}
            {chatEnabled && !reactionsEnabled && <div></div>}
            {!chatEnabled && reactionsEnabled && <div></div>}
          </div>

          {/* Chat Input - Bottom */}
          {chatEnabled && (
            <div className="border-t border-gray-800 p-4">
              <div className="max-w-4xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="chat-input"
                />
                <button
                  onClick={handleSendChat}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                  data-testid="send-chat-btn"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventTitle={event?.title || "Live Stream"}
        eventUrl={eventUrl}
      />
    </div>
  );
};

export default LiveStreamViewer;
