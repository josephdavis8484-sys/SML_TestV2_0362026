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
  ArrowLeft,
  Cast,
  Settings,
  Shield,
  MessageCircle,
  Send
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
import { useScreenProtection } from "@/hooks/useScreenProtection";
import ScreenProtectionOverlay, { ProtectedContent } from "@/components/ScreenProtectionOverlay";
import { useReactionProgression, BASE_REACTION_EMOJIS, getReactionType } from "@/hooks/useReactionProgression";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Pro Mode Stage - Only shows the active camera selected by the control panel
const ProModeStage = ({ eventId }) => {
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [activeParticipantIdentity, setActiveParticipantIdentity] = useState(null);
  
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  useEffect(() => {
    const fetchActiveDevice = async () => {
      try {
        const response = await axiosInstance.get(`/pro-mode/session/${eventId}`);
        const session = response.data;
        if (session.active_device_id) {
          setActiveDeviceId(session.active_device_id);
          const deviceNumber = session.active_device_id.split('-device-')[1];
          if (deviceNumber) {
            setActiveParticipantIdentity(`Camera-${deviceNumber}`);
          }
        }
      } catch (error) {
        console.log('Pro Mode session not found, showing all tracks');
      }
    };

    fetchActiveDevice();
    const interval = setInterval(fetchActiveDevice, 2000);
    return () => clearInterval(interval);
  }, [eventId]);

  const remoteTracks = tracks.filter((track) => !track.participant.isLocal);
  
  let videoTracks = remoteTracks.filter((t) => {
    const identity = t.participant.identity;
    const isCamera = identity && identity.startsWith('Camera-');
    const isVideoSource = t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare;
    return isCamera && isVideoSource;
  });
  
  if (activeParticipantIdentity) {
    const activeTrack = videoTracks.find((t) => 
      t.participant.identity === activeParticipantIdentity
    );
    if (activeTrack) {
      videoTracks = [activeTrack];
    }
  }

  return (
    <div className="w-full h-full">
      <RoomAudioRenderer />
      
      {videoTracks.length > 0 ? (
        <GridLayout tracks={videoTracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Waiting for creator to start streaming...</p>
            {activeParticipantIdentity && (
              <p className="text-gray-500 text-sm mt-2">Active camera: {activeParticipantIdentity}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Stage component for regular events
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
  
  const videoTracks = remoteTracks.filter((t) => {
    const identity = t.participant.identity;
    const isCreator = identity && identity.startsWith('creator_');
    const isVideoSource = t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare;
    return isCreator && isVideoSource;
  });

  return (
    <div className="w-full h-full">
      <RoomAudioRenderer />
      
      {videoTracks.length > 0 ? (
        <GridLayout tracks={videoTracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
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

// Overlay with LIVE badge - positioned at top
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
        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{viewerCount}</span>
        </div>
      </div>
      
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
          <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
        </div>
        <button onClick={onShare} className="bg-black/60 backdrop-blur-sm hover:bg-black/80 px-2 py-1 rounded flex items-center gap-1">
          <Share2 className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Share</span>
        </button>
      </div>
    </>
  );
};

// Floating Chat Message - Single message that fades in and out
const FloatingChatMessage = ({ message, onComplete }) => {
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    // Fade in (200ms)
    const fadeInTimer = setTimeout(() => setOpacity(1), 10);
    
    // Start fade out after 1.7s (200ms fade-in + 1.5s visible)
    const fadeOutTimer = setTimeout(() => setOpacity(0), 1700);
    
    // Remove after total ~2.4s
    const removeTimer = setTimeout(onComplete, 2400);
    
    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className="chat-message-float"
      style={{
        opacity,
        transition: `opacity ${opacity === 0 ? '700ms' : '200ms'} ease-out`,
      }}
    >
      <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-xl rounded-2xl px-4 py-2 max-w-[90%]">
        <span 
          className="font-bold text-sm"
          style={{ color: message.color || '#60a5fa' }}
        >
          {message.username}
        </span>
        <span className="text-white text-sm font-medium">{message.message}</span>
      </div>
    </div>
  );
};

// Viewer Chat Message Queue - Shows sent messages briefly
const ViewerChatFeedback = ({ messages }) => {
  const [displayMessages, setDisplayMessages] = useState([]);

  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[messages.length - 1];
      // Only add if not already displayed
      if (!displayMessages.find(m => m.id === latest.id)) {
        setDisplayMessages(prev => [...prev, latest]);
      }
    }
  }, [messages]);

  const handleComplete = (id) => {
    setDisplayMessages(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="absolute bottom-16 left-4 right-4 pointer-events-none z-20 flex flex-col items-start gap-2" style={{ maxHeight: '10%' }}>
      {displayMessages.slice(-3).map((msg) => (
        <FloatingChatMessage 
          key={msg.id} 
          message={msg} 
          onComplete={() => handleComplete(msg.id)}
        />
      ))}
    </div>
  );
};

// Floating Reaction - Animates upward and fades
const FloatingReaction = ({ emoji, startX, onComplete }) => {
  const [style, setStyle] = useState({
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  });

  useEffect(() => {
    // Start animation after mount
    const animateTimer = setTimeout(() => {
      setStyle({
        opacity: 0,
        transform: 'translateY(-200px) scale(0.8)',
      });
    }, 50);

    // Remove after animation
    const removeTimer = setTimeout(onComplete, 2000);

    return () => {
      clearTimeout(animateTimer);
      clearTimeout(removeTimer);
    };
  }, [onComplete]);

  // Slight horizontal drift
  const drift = (Math.random() - 0.5) * 40;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        bottom: '80px',
        ...style,
        transform: `${style.transform} translateX(${drift}px)`,
        transition: 'all 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fontSize: '2.5rem',
        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        zIndex: 25,
      }}
    >
      {emoji}
    </div>
  );
};

// Reaction Animation Container
const ReactionAnimationContainer = ({ reactions }) => {
  const [activeReactions, setActiveReactions] = useState([]);

  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[reactions.length - 1];
      if (!activeReactions.find(r => r.id === latest.id)) {
        setActiveReactions(prev => [...prev, latest]);
      }
    }
  }, [reactions]);

  const handleComplete = (id) => {
    setActiveReactions(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {activeReactions.map((reaction) => (
        <FloatingReaction
          key={reaction.id}
          emoji={reaction.emoji}
          startX={reaction.startX}
          onComplete={() => handleComplete(reaction.id)}
        />
      ))}
    </div>
  );
};

// ShowMe Interaction Bar - Transparent overlay at bottom
const ShowMeInteractionBar = ({ 
  chatEnabled, 
  reactionsEnabled, 
  chatMessage, 
  setChatMessage, 
  onSendChat, 
  onSendReaction,
  chatConnected,
  reactionProgression
}) => {
  const { getCurrentEmoji, handleReactionTap, getTapCount } = reactionProgression;

  const handleReactionClick = (type) => {
    const emoji = handleReactionTap(type);
    onSendReaction(emoji, type);
  };

  // Reaction button with glow effect based on tap count
  const ReactionButton = ({ type, baseEmoji }) => {
    const currentEmoji = getCurrentEmoji(type);
    const tapCount = getTapCount(type);
    
    // Glow intensity increases with tap count
    const glowIntensity = Math.min(tapCount / 10, 1);
    const glowColor = {
      laugh: 'rgba(250, 204, 21, VAL)',
      heart: 'rgba(239, 68, 68, VAL)',
      fire: 'rgba(251, 146, 60, VAL)',
      clap: 'rgba(168, 85, 247, VAL)',
    }[type].replace('VAL', glowIntensity * 0.6);

    return (
      <button
        onClick={() => handleReactionClick(type)}
        disabled={!chatConnected}
        className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 disabled:opacity-50 hover:scale-110"
        style={{
          background: `rgba(255,255,255,0.1)`,
          boxShadow: tapCount > 0 ? `0 0 ${12 + tapCount * 2}px ${glowColor}` : 'none',
        }}
        data-testid={`reaction-btn-${type}`}
      >
        <span className="text-2xl">{currentEmoji || baseEmoji}</span>
      </button>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 p-3" style={{ maxHeight: '5%', minHeight: '60px' }}>
      {/* Transparent glass bar */}
      <div className="flex items-center gap-2 mx-auto max-w-3xl bg-black/40 backdrop-blur-xl rounded-full px-4 py-2 border border-white/10">
        {/* Chat Icon */}
        {chatEnabled && (
          <div className="flex items-center gap-2 text-gray-400">
            <MessageCircle className="w-5 h-5" />
          </div>
        )}
        
        {/* Chat Input */}
        {chatEnabled && (
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && onSendChat()}
            placeholder="Send a message..."
            disabled={!chatConnected}
            className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-400 disabled:opacity-50 min-w-[120px]"
            data-testid="chat-input"
          />
        )}
        
        {/* Reaction Buttons */}
        {reactionsEnabled && (
          <div className="flex items-center gap-1">
            <ReactionButton type="heart" baseEmoji={BASE_REACTION_EMOJIS.heart} />
            <ReactionButton type="laugh" baseEmoji={BASE_REACTION_EMOJIS.laugh} />
            <ReactionButton type="fire" baseEmoji={BASE_REACTION_EMOJIS.fire} />
            <ReactionButton type="clap" baseEmoji={BASE_REACTION_EMOJIS.clap} />
          </div>
        )}
        
        {/* Send Button */}
        {chatEnabled && (
          <button
            onClick={onSendChat}
            disabled={!chatMessage.trim() || !chatConnected}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
            data-testid="send-chat-btn"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

// Settings Dropdown
const SettingsDropdown = ({ isOpen, onClose, videoQuality, setVideoQuality, onCast }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 right-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg py-2 min-w-[140px] z-40">
      <div className="px-3 py-1 text-xs text-gray-400 uppercase tracking-wider">Quality</div>
      {['auto', '1080p', '720p', '480p'].map((q) => (
        <button
          key={q}
          onClick={() => { setVideoQuality(q); onClose(); }}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-white/10 ${videoQuality === q ? 'text-blue-400' : 'text-white'}`}
        >
          {q === 'auto' ? 'Auto' : q}
        </button>
      ))}
      <div className="border-t border-white/10 my-1"></div>
      <button
        onClick={() => { onCast(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
      >
        <Cast className="w-4 h-4" />
        Cast to TV
      </button>
    </div>
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
  const [videoQuality, setVideoQuality] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const chatWsRef = useRef(null);
  
  // Sent messages for viewer feedback
  const [sentMessages, setSentMessages] = useState([]);
  // Sent reactions for animation
  const [sentReactions, setSentReactions] = useState([]);
  
  // Reaction progression hook
  const reactionProgression = useReactionProgression();

  // Screen protection hook
  const {
    isProtected,
    showWarning,
    warningMessage,
    canContinue,
    violationCount,
    dismissWarning
  } = useScreenProtection(eventId, userId);

  // Check security status on mount
  useEffect(() => {
    const checkSecurityStatus = async () => {
      try {
        const response = await axiosInstance.get('/security/check-status');
        if (!response.data.can_access) {
          navigate('/');
        }
      } catch (err) {
        console.warn('Security check failed:', err);
      }
    };
    checkSecurityStatus();
  }, [navigate]);

  // Cast to TV function
  const handleCastToTV = async () => {
    if ('presentation' in navigator && 'PresentationRequest' in window) {
      try {
        const presentationRequest = new window.PresentationRequest([window.location.href]);
        await presentationRequest.start();
      } catch (err) {
        // Silent fail
      }
    }
  };

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
          setIsProMode(response.data.is_pro_mode || false);
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
  const maxReconnectAttempts = 15;
  const messageQueueRef = useRef([]);
  const isConnectingRef = useRef(false);
  const pingIntervalRef = useRef(null);

  // Process queued messages when connection is restored
  const processMessageQueue = useCallback(() => {
    if (chatWsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      queue.forEach(msg => {
        try {
          chatWsRef.current.send(JSON.stringify(msg));
        } catch (e) {
          messageQueueRef.current.push(msg);
        }
      });
    }
  }, []);

  // Chat WebSocket - Robust connection with auto-reconnect
  const connectChatWebSocket = useCallback(() => {
    if (!eventId) return;
    if (isConnectingRef.current) return;
    
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (!(chatEnabled || reactionsEnabled)) return;
    
    let chatWsUrl = BACKEND_URL;
    if (!chatWsUrl) return;
    
    chatWsUrl = chatWsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    chatWsUrl = `${chatWsUrl}/api/ws/chat/${eventId}`;
    
    if (chatWsRef.current) {
      if (chatWsRef.current.readyState === WebSocket.OPEN || 
          chatWsRef.current.readyState === WebSocket.CONNECTING) {
        chatWsRef.current.close(1000, 'Reconnecting');
      }
    }
    
    isConnectingRef.current = true;
    
    try {
      const ws = new WebSocket(chatWsUrl);
      
      ws.onopen = () => {
        isConnectingRef.current = false;
        setChatConnected(true);
        reconnectAttemptsRef.current = 0;
        processMessageQueue();
        
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 10000);
      };
      
      ws.onmessage = (wsEvent) => {
        if (wsEvent.data === "pong") return;
        // Viewers don't process incoming messages per design spec
      };
      
      ws.onclose = (closeEvent) => {
        isConnectingRef.current = false;
        setChatConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        if (closeEvent.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(500 * Math.pow(1.3, reconnectAttemptsRef.current), 5000);
          reconnectAttemptsRef.current += 1;
          setTimeout(connectChatWebSocket, delay);
        }
      };
      
      ws.onerror = () => {
        isConnectingRef.current = false;
      };
      
      chatWsRef.current = ws;
    } catch (err) {
      isConnectingRef.current = false;
    }
  }, [eventId, event?.chat_enabled, event?.reactions_enabled, processMessageQueue]);
  
  // Connect WebSocket when event loads
  useEffect(() => {
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (eventId && (chatEnabled || reactionsEnabled)) {
      connectChatWebSocket();
    }
    
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (chatWsRef.current) {
        chatWsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [eventId, event?.chat_enabled, event?.reactions_enabled, connectChatWebSocket]);

  // Send chat message with inline feedback (no toast)
  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    
    const msgId = Date.now() + Math.random();
    const msg = { 
      type: "message", 
      username: userName || "Viewer", 
      message: chatMessage.trim() 
    };
    
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        chatWsRef.current.send(JSON.stringify(msg));
        // Add to sent messages for inline feedback
        setSentMessages(prev => [...prev, {
          id: msgId,
          username: msg.username,
          message: msg.message,
          color: '#60a5fa'
        }]);
        setChatMessage("");
      } catch (e) {
        messageQueueRef.current.push(msg);
      }
    } else {
      messageQueueRef.current.push(msg);
      connectChatWebSocket();
    }
  };

  // Send reaction with float animation (no toast)
  const handleSendReaction = (emoji, type) => {
    const msg = { 
      type: "reaction", 
      emoji, 
      username: userName || "Viewer" 
    };
    
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        chatWsRef.current.send(JSON.stringify(msg));
        // Add to sent reactions for float animation
        // Position based on which button was clicked
        const buttonPositions = { heart: 55, laugh: 65, fire: 75, clap: 85 };
        setSentReactions(prev => [...prev, {
          id: Date.now() + Math.random(),
          emoji,
          startX: buttonPositions[type] || 70,
        }]);
      } catch (e) {
        messageQueueRef.current.push(msg);
      }
    } else {
      messageQueueRef.current.push(msg);
      connectChatWebSocket();
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
    <div className="h-screen w-full bg-black overflow-hidden relative" data-testid="live-stream-viewer">
      {/* CSS for ShowMe Interaction Viewer */}
      <style>{`
        .chat-message-float {
          animation: chatFadeIn 0.2s ease-out;
        }
        
        @keyframes chatFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      {/* Screen Protection Overlay */}
      <ScreenProtectionOverlay
        showWarning={showWarning}
        warningMessage={warningMessage}
        canContinue={canContinue}
        violationCount={violationCount}
        onDismiss={dismissWarning}
        isProtected={false}
      />
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="absolute top-3 left-3 z-30 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-full"
        data-testid="back-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      
      {/* Security Badge */}
      {violationCount > 0 && (
        <div className="absolute top-3 left-14 z-30 bg-yellow-500/80 text-black text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>{violationCount} warning{violationCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Settings Button */}
      <div className="absolute top-3 right-20 z-30 relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-full"
          data-testid="settings-btn"
        >
          <Settings className="w-5 h-5" />
        </button>
        <SettingsDropdown
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          videoQuality={videoQuality}
          setVideoQuality={setVideoQuality}
          onCast={handleCastToTV}
        />
      </div>

      {/* Full Screen Video - Landscape mode */}
      <ProtectedContent 
        isProtected={isProtected} 
        showWarning={showWarning} 
        className="w-full h-full"
      >
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={false}
          video={false}
          options={{
            adaptiveStream: { pixel: true },
            dynacast: true,
            disconnectOnPageLeave: false,
            reconnectPolicy: {
              nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000),
              maxRetries: 10
            }
          }}
          data-lk-theme="default"
          style={{ height: '100%', width: '100%' }}
        >
          {isProMode ? <ProModeStage eventId={eventId} /> : <Stage />}
          <StreamOverlay 
            streamTime={streamTime} 
            onShare={() => setShowShareModal(true)} 
            viewerCount={1} 
          />
        </LiveKitRoom>
      </ProtectedContent>

      {/* Viewer Chat Feedback - Shows sent messages briefly */}
      {chatEnabled && (
        <ViewerChatFeedback messages={sentMessages} />
      )}

      {/* Reaction Animation Container */}
      {reactionsEnabled && (
        <ReactionAnimationContainer reactions={sentReactions} />
      )}

      {/* ShowMe Interaction Bar - Transparent overlay at bottom */}
      {showInteraction && (
        <ShowMeInteractionBar
          chatEnabled={chatEnabled}
          reactionsEnabled={reactionsEnabled}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          onSendChat={handleSendChat}
          onSendReaction={handleSendReaction}
          chatConnected={chatConnected}
          reactionProgression={reactionProgression}
        />
      )}

      <ShareModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        eventTitle={event?.title || "Live Stream"} 
        eventUrl={`${window.location.origin}/event/${eventId}`} 
      />
    </div>
  );
};

export default LiveStreamViewer;
