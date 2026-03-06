import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { 
  Mic, 
  MicOff, 
  Settings, 
  Video,
  VideoOff,
  Users,
  Volume2,
  Plus,
  Minus,
  RotateCcw,
  MessageCircle,
  Heart,
  SwitchCamera,
  Sliders,
  Shield,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import ScreenProtectionOverlay, { ProtectedContent } from "@/components/ScreenProtectionOverlay";
import { useReactionEnergyMeter, ENERGY_STATES, getEnergyStateClasses } from "@/hooks/useReactionEnergyMeter";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Energy Meter Indicator - Shows current energy state to creator
const EnergyMeterIndicator = ({ energyState, reactionCount, isCreatorMomentActive }) => {
  const getStateColor = () => {
    switch (energyState) {
      case ENERGY_STATES.HYPE: return 'from-yellow-500 to-orange-500';
      case ENERGY_STATES.SURGE: return 'from-orange-500 to-red-500';
      case ENERGY_STATES.CROWD_WAVE: return 'from-red-500 to-pink-500';
      case ENERGY_STATES.CREATOR_MOMENT: return 'from-pink-500 to-purple-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStateLabel = () => {
    switch (energyState) {
      case ENERGY_STATES.HYPE: return 'HYPE';
      case ENERGY_STATES.SURGE: return 'SURGE';
      case ENERGY_STATES.CROWD_WAVE: return 'WAVE';
      case ENERGY_STATES.CREATOR_MOMENT: return '🎉 MOMENT!';
      default: return 'NORMAL';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getStateColor()} ${isCreatorMomentActive ? 'animate-pulse' : ''}`}>
      <Zap className={`w-4 h-4 text-white ${isCreatorMomentActive ? 'animate-bounce' : ''}`} />
      <span className="text-white font-bold text-xs">{getStateLabel()}</span>
      <span className="text-white/80 text-xs">({reactionCount})</span>
    </div>
  );
};

// Audio Settings Dropdown Component
const AudioSettingsDropdown = ({ 
  isOpen, onClose, speakerVolume, setSpeakerVolume, 
  micVolume, setMicVolume, balance, setBalance, 
  treble, setTreble, bass, setBass, onReset
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const SliderControl = ({ icon: Icon, label, value, onChange, color = "#3b82f6" }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3 text-gray-400" />
        <span className="text-gray-300 text-xs">{label} {value}%</span>
      </div>
      <input type="range" min="0" max="100" value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #374151 ${value}%, #374151 100%)` }}
      />
    </div>
  );

  return (
    <div ref={dropdownRef} className="absolute bottom-full right-0 mb-3 w-[320px] bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl z-50">
      <div className="text-center py-2 border-b border-gray-700">
        <h3 className="text-white font-bold text-sm">AUDIO SETTINGS</h3>
      </div>
      <div className="p-3 space-y-3">
        {/* Speaker & Mic Row */}
        <div className="grid grid-cols-2 gap-3">
          <SliderControl icon={Volume2} label="Speaker" value={speakerVolume} onChange={setSpeakerVolume} />
          <SliderControl icon={Mic} label="Mic" value={micVolume} onChange={setMicVolume} />
        </div>
        
        {/* Treble & Bass Row */}
        <div className="grid grid-cols-2 gap-3">
          <SliderControl icon={Volume2} label="Treble" value={treble} onChange={setTreble} color="#10b981" />
          <SliderControl icon={Volume2} label="Bass" value={bass} onChange={setBass} color="#f59e0b" />
        </div>
        
        {/* Balance (full width) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">L</span>
            <span className="text-gray-300 text-xs">Balance {balance === 50 ? 'Center' : balance < 50 ? `L ${50 - balance}` : `R ${balance - 50}`}</span>
            <span className="text-gray-400 text-xs">R</span>
          </div>
          <input type="range" min="0" max="100" value={balance}
            onChange={(e) => setBalance(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #374151 0%, #374151 ${balance}%, #8b5cf6 ${balance}%, #374151 ${balance}%, #374151 100%)` }}
          />
        </div>
        
        <div className="flex justify-end pt-1">
          <button onClick={onReset} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        </div>
      </div>
    </div>
  );
};

// Live Chat Component for Creator
const LiveChatPanel = ({ messages }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-800/50 rounded-lg p-2">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-4 h-4 text-blue-400" />
        <h4 className="text-white text-sm font-bold">Live Chat</h4>
        <span className="text-gray-400 text-xs">({messages.length})</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">Waiting for messages...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-gray-900/50 rounded px-2 py-1">
              <span className="font-bold text-xs" style={{ color: msg.color }}>{msg.username}:</span>
              <span className="text-gray-300 text-xs ml-1">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// Live Reactions Component for Creator
const LiveReactionsPanel = ({ reactions }) => {
  return (
    <div className="relative h-full bg-gray-800/50 rounded-lg p-2 overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-red-400" />
        <h4 className="text-white text-sm font-bold">Live Reactions</h4>
        <span className="text-gray-400 text-xs">({reactions.length})</span>
      </div>
      
      {reactions.length === 0 ? (
        <p className="text-gray-500 text-xs text-center py-4">Waiting for reactions...</p>
      ) : (
        reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute text-2xl animate-bounce"
            style={{ left: `${reaction.left}%`, bottom: '40px' }}
          >
            {reaction.emoji}
          </div>
        ))
      )}
    </div>
  );
};

// Floating Chat Overlay - Messages that animate upward and fade out with gradient
const FloatingChatOverlay = ({ messages }) => {
  const [displayMessages, setDisplayMessages] = useState([]);

  useEffect(() => {
    // Add new messages with timestamp
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      const msgWithTime = { ...latestMsg, addedAt: Date.now() };
      setDisplayMessages(prev => [...prev.slice(-8), msgWithTime]);
    }
  }, [messages.length]);

  // Clean up old messages after 6 seconds (3s hold + 3s fade)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setDisplayMessages(prev => prev.filter(msg => now - msg.addedAt < 6000));
    }, 500);
    return () => clearInterval(cleanup);
  }, []);

  return (
    <div className="absolute bottom-0 left-0 w-[55%] h-[25%] pointer-events-none overflow-hidden">
      {/* No gradient - clean overlay */}
      
      <div className="absolute bottom-3 left-4 right-4 space-y-2">
        {displayMessages.map((msg) => {
          const age = Date.now() - msg.addedAt;
          const holdTime = 3000; // 3s hold
          const fadeTime = 3000; // 3s fade
          let opacity = 1;
          
          if (age > holdTime) {
            // Start fading after hold time
            opacity = Math.max(0, 1 - (age - holdTime) / fadeTime);
          }
          
          return (
            <div
              key={msg.id}
              className="chat-message-animate"
              style={{
                opacity,
                transform: `translateY(${Math.min(0, -(age / 100))}px)`,
                transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
              }}
            >
              <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg shadow-black/20">
                <span 
                  className="font-bold text-sm drop-shadow-glow"
                  style={{ color: msg.color || '#60a5fa' }}
                >
                  {msg.username}
                </span>
                <span className="text-white text-sm font-medium">{msg.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Modern Reaction Component with motion animations - Energy state aware
const AnimatedReaction = ({ emoji, left, onComplete, energyState = 'normal', animationConfig = {} }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  // Map emojis to their animation types
  const getAnimationType = (emoji) => {
    if (['👏', '🙌', '🎉', '🏆'].includes(emoji)) return 'clap';
    if (['😂', '🤣', '😭', '💀', '🪦', '😆'].includes(emoji)) return 'laugh';
    if (['❤️', '❤️‍🔥', '💖', '💕', '😍'].includes(emoji)) return 'heart';
    if (['🔥', '🔥🔥', '🚀', '🌋'].includes(emoji)) return 'fire';
    return 'default';
  };
  
  const animationType = getAnimationType(emoji);
  const { speedMultiplier = 1, glow = 0, scaleBoost = 1 } = animationConfig;
  
  // Duration based on energy state
  const duration = Math.round(2000 / speedMultiplier);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);
  
  if (!isVisible) return null;
  
  // Energy state classes
  const energyClass = energyState !== 'normal' ? `energy-${energyState}` : '';
  
  return (
    <div
      className={`absolute reaction-${animationType} ${energyClass}`}
      style={{
        left: `${left}%`,
        bottom: '10%',
        '--glow-intensity': glow,
        '--scale-boost': scaleBoost,
        animationDuration: `${duration}ms`,
      }}
    >
      <span 
        className="text-4xl md:text-5xl drop-shadow-2xl"
        style={{
          filter: glow > 0 ? `drop-shadow(0 0 ${glow * 30}px currentColor)` : undefined,
          transform: `scale(${scaleBoost})`,
        }}
      >
        {emoji}
      </span>
    </div>
  );
};

// Floating Reactions Overlay - Modern flashy design with motion and energy states
const FloatingReactionsOverlay = ({ reactions, energyState = 'normal', animationConfig = {} }) => {
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

  // Get glow color based on emoji
  const getGlowColor = (emoji) => {
    if (emoji.includes('❤') || emoji.includes('🔥')) return 'rgba(239,68,68,0.6)';
    if (emoji.includes('😂') || emoji.includes('🤣') || emoji.includes('😭') || emoji.includes('💀') || emoji.includes('🪦')) return 'rgba(251,191,36,0.6)';
    if (emoji.includes('👏') || emoji.includes('🙌') || emoji.includes('🎉') || emoji.includes('🏆')) return 'rgba(168,85,247,0.6)';
    if (emoji.includes('🚀') || emoji.includes('🌋')) return 'rgba(251,146,60,0.6)';
    return 'rgba(168,85,247,0.6)';
  };

  return (
    <div className={`absolute bottom-0 right-0 w-[30%] h-[50%] pointer-events-none overflow-hidden ${getEnergyStateClasses(energyState)}`}>
      {/* Glow effect background - intensifies with energy state */}
      <div className="absolute inset-0" style={{ opacity: 0.3 + (animationConfig.glow || 0) }}>
        {activeReactions.slice(-5).map((r, i) => (
          <div 
            key={`glow-${r.id}`}
            className="absolute w-20 h-20 rounded-full blur-xl"
            style={{
              left: `${r.left}%`,
              bottom: `${20 + i * 12}%`,
              background: getGlowColor(r.emoji),
              animation: 'pulse 1s ease-in-out infinite',
              transform: `scale(${1 + (animationConfig.scaleBoost || 0) * 0.3})`,
            }}
          />
        ))}
      </div>
      
      {activeReactions.map((reaction) => (
        <AnimatedReaction
          key={reaction.id}
          emoji={reaction.emoji}
          left={reaction.left}
          onComplete={() => handleComplete(reaction.id)}
          energyState={energyState}
          animationConfig={animationConfig}
        />
      ))}
    </div>
  );
};

// LiveKit Stream Publisher Component
const StreamPublisher = ({ onViewerCount, isCameraOn, isMicOn, streamTime, facingMode, videoQuality }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  const cameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

  // Quality presets
  const qualityPresets = {
    'auto': { width: 1920, height: 1080, frameRate: 60 },
    '1080p': { width: 1920, height: 1080, frameRate: 60 },
    '720p': { width: 1280, height: 720, frameRate: 30 },
    '480p': { width: 854, height: 480, frameRate: 30 },
  };
  
  useEffect(() => {
    if (room) {
      const updateCount = () => onViewerCount(room.remoteParticipants.size);
      room.on('participantConnected', updateCount);
      room.on('participantDisconnected', updateCount);
      updateCount();
      return () => {
        room.off('participantConnected', updateCount);
        room.off('participantDisconnected', updateCount);
      };
    }
  }, [room, onViewerCount]);

  useEffect(() => {
    const syncMedia = async () => {
      if (localParticipant) {
        try {
          const resolution = qualityPresets[videoQuality] || qualityPresets['1080p'];
          await localParticipant.setCameraEnabled(isCameraOn, {
            resolution,
            facingMode: facingMode,
          });
          await localParticipant.setMicrophoneEnabled(isMicOn);
        } catch (error) {
          console.error("Error syncing media:", error);
        }
      }
    };
    syncMedia();
  }, [localParticipant, isCameraOn, isMicOn, facingMode, videoQuality]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative">
      {cameraTrack && isCameraOn ? (
        <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
      ) : (
        <div className="text-center">
          <VideoOff className="w-12 h-12 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Camera is off</p>
        </div>
      )}
      
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className="bg-red-600 px-2 py-0.5 rounded flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-xs">LIVE</span>
        </div>
        <div className="bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{room?.remoteParticipants?.size || 0}</span>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
        <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
      </div>
      
      {!isMicOn && (
        <div className="absolute bottom-2 left-2 bg-red-600/80 px-2 py-0.5 rounded flex items-center gap-1">
          <MicOff className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Muted</span>
        </div>
      )}
    </div>
  );
};

// Pre-stream Camera Preview
const CameraPreview = ({ isCameraOn }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let mediaStream = null;
    const startPreview = async () => {
      if (isCameraOn) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (videoRef.current) videoRef.current.srcObject = mediaStream;
        } catch (error) {
          console.error("Error accessing camera:", error);
        }
      }
    };
    startPreview();
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOn]);

  if (!isCameraOn) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <VideoOff className="w-12 h-12 text-gray-700 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Camera is off</p>
        </div>
      </div>
    );
  }
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
};

const ControlPanel = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamTime, setStreamTime] = useState(0);
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
  const [videoQuality, setVideoQuality] = useState('1080p'); // Auto, 1080p, 720p, 480p
  
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [liveReactions, setLiveReactions] = useState([]);
  const chatWsRef = useRef(null);

  // Screen protection hook - also for creators
  const {
    isProtected,
    showWarning,
    warningMessage,
    canContinue,
    violationCount,
    dismissWarning
  } = useScreenProtection(eventId, user?.id);

  // Stream timer
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => setStreamTime(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStreaming]);

  const [chatConnected, setChatConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const isConnectingRef = useRef(false);
  const pingIntervalRef = useRef(null);

  // WebSocket connection - robust connection with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (!eventId) return;
    if (isConnectingRef.current) return; // Prevent multiple simultaneous connections
    
    // Build WebSocket URL
    let wsUrl = BACKEND_URL;
    if (!wsUrl) return;
    
    wsUrl = wsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    wsUrl = `${wsUrl}/api/ws/chat/${eventId}`;
    
    // Close existing connection cleanly
    if (chatWsRef.current) {
      if (chatWsRef.current.readyState === WebSocket.OPEN || 
          chatWsRef.current.readyState === WebSocket.CONNECTING) {
        chatWsRef.current.close(1000, 'Reconnecting');
      }
    }
    
    isConnectingRef.current = true;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        isConnectingRef.current = false;
        setChatConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Only show toast on first connection
        if (reconnectAttemptsRef.current === 0) {
          toast.success("Chat connected!");
        }
        
        // Setup ping interval - every 10 seconds for aggressive keepalive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 10000);
      };

      ws.onmessage = (wsEvent) => {
        if (wsEvent.data === "pong") return;
        
        try {
          const data = JSON.parse(wsEvent.data);
          
          if (data.type === "message") {
            setChatMessages(prev => {
              const newMessages = [...prev.slice(-50), {
                id: Date.now() + Math.random(),
                username: data.username || "Anonymous",
                message: data.message || "",
                color: data.color || "#60a5fa"
              }];
              return newMessages;
            });
          } else if (data.type === "reaction") {
            const reactionId = Date.now() + Math.random();
            const left = Math.random() * 60 + 20;
            setLiveReactions(prev => [...prev, { id: reactionId, emoji: data.emoji, left }]);
            setTimeout(() => {
              setLiveReactions(prev => prev.filter(r => r.id !== reactionId));
            }, 3000);
          }
        } catch (e) {
          // Silent error handling
        }
      };

      ws.onclose = (closeEvent) => {
        isConnectingRef.current = false;
        setChatConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Auto-reconnect with faster exponential backoff
        if (closeEvent.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(500 * Math.pow(1.3, reconnectAttemptsRef.current), 5000);
          reconnectAttemptsRef.current += 1;
          setTimeout(connectWebSocket, delay);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
      };
      
      chatWsRef.current = ws;
    } catch (error) {
      isConnectingRef.current = false;
    }
  }, [eventId]);

  // Connect WebSocket as soon as event is loaded with chat/reactions enabled
  useEffect(() => {
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (event && (chatEnabled || reactionsEnabled)) {
      connectWebSocket();
    }
    
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (chatWsRef.current) {
        chatWsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [event?.id, event?.chat_enabled, event?.reactions_enabled, connectWebSocket]);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const eventRes = await axiosInstance.get(`/events/${eventId}`);
      setEvent(eventRes.data);
      console.log("Event loaded:", eventRes.data.title, "Chat:", eventRes.data.chat_enabled, "Reactions:", eventRes.data.reactions_enabled);
      
      if (eventRes.data.status === "live") {
        handleStartStream();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load control panel");
    }
  };

  const handleStartStream = async () => {
    if (isStreaming) {
      try {
        await axiosInstance.post(`/livekit/end-stream/${eventId}`);
        await axiosInstance.post(`/events/${eventId}/end`);
        setIsStreaming(false);
        setLiveKitToken(null);
        setLiveKitUrl(null);
        setStreamTime(0);
        setChatMessages([]);
        setLiveReactions([]);
        toast.success("Stream ended");
        fetchData();
      } catch (error) {
        console.error("Error ending stream:", error);
        toast.error("Failed to end stream");
      }
    } else {
      try {
        const response = await axiosInstance.post("/livekit/join-as-creator", {
          event_id: eventId,
          device_name: "Main Camera",
          is_publisher: true
        });
        
        if (response.data.token && response.data.url) {
          setLiveKitToken(response.data.token);
          setLiveKitUrl(response.data.url);
          setIsStreaming(true);
          setStreamTime(0);
          
          try {
            const goLiveRes = await axiosInstance.post(`/events/${eventId}/go-live`);
            toast.success(`You're Live! ${goLiveRes.data.notified_count || 0} viewers notified.`);
          } catch (err) {
            toast.success("You're Live!");
          }
        } else {
          toast.error("Invalid response from server");
        }
      } catch (error) {
        console.error("Error starting stream:", error);
        toast.error(error.response?.data?.detail || "Failed to start stream");
      }
    }
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toast.info(isCameraOn ? "Camera off" : "Camera on");
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    toast.info(isMicOn ? "Muted" : "Unmuted");
  };

  const handleResetAudio = () => {
    setSpeakerVolume(80);
    setMicVolume(75);
    setBalance(50);
    setTreble(50);
    setBass(50);
    toast.info("Audio reset");
  };

  const showChatReactions = event?.chat_enabled || event?.reactions_enabled;

  if (!event) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Screen Protection Overlay */}
      <ScreenProtectionOverlay
        showWarning={showWarning}
        warningMessage={warningMessage}
        canContinue={canContinue}
        violationCount={violationCount}
        onDismiss={dismissWarning}
        isProtected={false}
      />
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Chat message glow effect */
        .drop-shadow-glow {
          text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
        }
        
        /* Default reaction - float up with gentle sway */
        .reaction-default {
          animation: reactionDefault 2s ease-out forwards;
        }
        @keyframes reactionDefault {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.5) rotate(0deg);
          }
          20% {
            opacity: 1;
            transform: translateY(-30px) scale(1.2) rotate(-5deg);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-80px) scale(1) rotate(5deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-150px) scale(0.6) rotate(0deg);
          }
        }
        
        /* Clapping hands - bounce and shake animation */
        .reaction-clap {
          animation: reactionClap 2s ease-out forwards;
        }
        @keyframes reactionClap {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.3) rotate(0deg);
          }
          10% {
            transform: translateY(-10px) scale(1.3) rotate(-15deg);
          }
          20% {
            transform: translateY(-25px) scale(1.1) rotate(15deg);
          }
          30% {
            transform: translateY(-40px) scale(1.2) rotate(-10deg);
          }
          40% {
            transform: translateY(-55px) scale(1) rotate(10deg);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-70px) scale(1.1) rotate(-5deg);
          }
          60% {
            transform: translateY(-90px) scale(1) rotate(5deg);
          }
          80% {
            opacity: 0.5;
            transform: translateY(-120px) scale(0.9) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-160px) scale(0.5) rotate(0deg);
          }
        }
        
        /* Laughing faces - wobble and bounce */
        .reaction-laugh {
          animation: reactionLaugh 2s ease-out forwards;
        }
        @keyframes reactionLaugh {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.5) rotate(0deg);
          }
          10% {
            transform: translateY(-15px) scale(1.4) rotate(-20deg);
          }
          20% {
            transform: translateY(-20px) scale(1.2) rotate(20deg);
          }
          30% {
            transform: translateY(-35px) scale(1.3) rotate(-15deg);
          }
          40% {
            transform: translateY(-50px) scale(1.1) rotate(15deg);
          }
          50% {
            opacity: 0.95;
            transform: translateY(-65px) scale(1.2) rotate(-10deg);
          }
          60% {
            transform: translateY(-85px) scale(1) rotate(10deg);
          }
          70% {
            opacity: 0.7;
            transform: translateY(-105px) scale(1.05) rotate(-5deg);
          }
          85% {
            opacity: 0.4;
            transform: translateY(-130px) scale(0.9) rotate(5deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-160px) scale(0.6) rotate(0deg);
          }
        }
        
        /* Pumping hearts - pulse and float with glow */
        .reaction-heart {
          animation: reactionHeart 2s ease-out forwards;
          filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.8));
        }
        @keyframes reactionHeart {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.3);
            filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5));
          }
          10% {
            transform: translateY(-10px) scale(1.5);
            filter: drop-shadow(0 0 25px rgba(239, 68, 68, 1));
          }
          20% {
            transform: translateY(-25px) scale(1.1);
            filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.8));
          }
          30% {
            transform: translateY(-40px) scale(1.4);
            filter: drop-shadow(0 0 30px rgba(239, 68, 68, 1));
          }
          40% {
            transform: translateY(-55px) scale(1);
            filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.7));
          }
          50% {
            opacity: 0.9;
            transform: translateY(-70px) scale(1.25);
            filter: drop-shadow(0 0 25px rgba(239, 68, 68, 0.9));
          }
          60% {
            transform: translateY(-90px) scale(1.05);
            filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6));
          }
          70% {
            opacity: 0.7;
            transform: translateY(-110px) scale(1.15);
            filter: drop-shadow(0 0 20px rgba(239, 68, 68, 0.7));
          }
          85% {
            opacity: 0.4;
            transform: translateY(-135px) scale(0.9);
            filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.4));
          }
          100% {
            opacity: 0;
            transform: translateY(-165px) scale(0.5);
            filter: drop-shadow(0 0 0px rgba(239, 68, 68, 0));
          }
        }
        
        /* Pulse animation for glow backgrounds */
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
        
        /* Chat message entrance */
        .chat-message-animate {
          animation: chatEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes chatEnter {
          from {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      
      {/* Video Preview with Overlay */}
      <div className="flex-1 min-h-0 p-2 relative">
        <div className="h-full bg-gray-900 rounded-xl overflow-hidden relative">
          {isStreaming && liveKitToken && liveKitUrl ? (
            <LiveKitRoom
              serverUrl={liveKitUrl}
              token={liveKitToken}
              connect={true}
              video={true}
              audio={true}
              options={{
                adaptiveStream: true,
                dynacast: true,
                disconnectOnPageLeave: false,
                reconnectPolicy: {
                  nextRetryDelayInMs: (ctx) => {
                    return Math.min(1000 * Math.pow(2, ctx.retryCount), 10000);
                  },
                  maxRetries: 10
                }
              }}
            >
              <StreamPublisher 
                onViewerCount={setViewerCount}
                isCameraOn={isCameraOn}
                isMicOn={isMicOn}
                streamTime={streamTime}
                facingMode={facingMode}
                videoQuality={videoQuality}
              />
            </LiveKitRoom>
          ) : (
            <CameraPreview isCameraOn={isCameraOn} />
          )}
          
          {/* Floating Overlays - Only when streaming */}
          {isStreaming && showChatReactions && (
            <>
              {event?.chat_enabled && (
                <FloatingChatOverlay messages={chatMessages} />
              )}
              {event?.reactions_enabled && (
                <FloatingReactionsOverlay reactions={liveReactions} />
              )}
              
              {/* Stream Info Overlay - Top */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    LIVE
                  </div>
                  <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                    {Math.floor(streamTime / 60)}:{(streamTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {viewerCount}
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${chatConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${chatConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}></span>
                  {chatConnected ? 'Chat Connected' : 'Connecting...'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-900 px-3 py-2 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 max-w-2xl mx-auto flex-wrap">
          {/* Camera On/Off */}
          <div className="flex flex-col items-center">
            <button onClick={toggleCamera} className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white">
              {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <span className={`text-[10px] mt-0.5 ${isCameraOn ? 'text-green-400' : 'text-red-400'}`}>{isCameraOn ? 'On' : 'Off'}</span>
          </div>

          {/* Camera Switch (Front/Back) */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white"
              title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
            <span className="text-[10px] mt-0.5 text-gray-400">{facingMode === 'user' ? 'Front' : 'Back'}</span>
          </div>

          {/* Quality Selector */}
          <div className="flex flex-col items-center">
            <select 
              value={videoQuality} 
              onChange={(e) => setVideoQuality(e.target.value)}
              className="w-16 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-xs px-1 border-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
            <span className="text-[10px] mt-0.5 text-gray-400">Quality</span>
          </div>

          {/* Mic On/Off */}
          <div className="flex flex-col items-center">
            <button onClick={toggleMic} className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white relative">
              <Mic className="w-4 h-4" />
              {!isMicOn && <div className="absolute inset-0 flex items-center justify-center"><div className="w-6 h-0.5 bg-red-500 rotate-45 rounded-full"></div></div>}
            </button>
            <span className={`text-[10px] mt-0.5 ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>{isMicOn ? 'On' : 'Off'}</span>
          </div>

          {/* Go Live Button */}
          <button
            onClick={handleStartStream}
            className={`px-4 py-2 rounded-lg font-bold text-sm ${
              isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-b from-red-500 to-red-700'
            } text-white`}
          >
            {isStreaming ? 'End Live' : 'Go Live'}
          </button>

          {/* Settings */}
          <div className="relative flex flex-col items-center">
            <button onClick={() => setShowSettings(!showSettings)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${showSettings ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
              <Settings className="w-4 h-4" />
            </button>
            <span className="text-[10px] mt-0.5 text-gray-400">Audio</span>
            <AudioSettingsDropdown
              isOpen={showSettings} onClose={() => setShowSettings(false)}
              speakerVolume={speakerVolume} setSpeakerVolume={setSpeakerVolume}
              micVolume={micVolume} setMicVolume={setMicVolume}
              balance={balance} setBalance={setBalance}
              treble={treble} setTreble={setTreble}
              bass={bass} setBass={setBass}
              onReset={handleResetAudio}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
