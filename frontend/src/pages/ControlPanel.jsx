import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  RotateCcw,
  MessageCircle,
  Heart,
  SwitchCamera,
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ============================================
// SHOWMELIVE REACTION ENERGY METER SYSTEM
// Creator-only engagement overlay system
// ============================================

// Energy States and Thresholds
const ENERGY_STATES = {
  LOW: 'low',
  WARM: 'warm',
  ACTIVE: 'active',
  HIGH: 'high',
  PEAK: 'peak',
};

const ENERGY_THRESHOLDS = [
  { min: 0, max: 15, state: ENERGY_STATES.LOW },
  { min: 16, max: 30, state: ENERGY_STATES.WARM },
  { min: 31, max: 50, state: ENERGY_STATES.ACTIVE },
  { min: 51, max: 75, state: ENERGY_STATES.HIGH },
  { min: 76, max: Infinity, state: ENERGY_STATES.PEAK },
];

// Reaction Resolution Logic - ShowMeLive Interaction Viewer
const resolveReactionEmoji = (reactionType, tapCount) => {
  if (reactionType === "laugh") {
    if (tapCount >= 15) return "🪦";
    if (tapCount >= 7) return "💀";
    if (tapCount >= 5) return "😭";
    if (tapCount >= 3) return "🤣";
    return "😂";
  }
  if (reactionType === "heart") {
    if (tapCount >= 6) return "❤️‍🔥";
    return "❤️";
  }
  if (reactionType === "fire") {
    if (tapCount >= 8) return "🌋";
    if (tapCount >= 4) return "🔥🔥";
    return "🔥";
  }
  if (reactionType === "clap") {
    if (tapCount >= 8) return "🏆";
    if (tapCount >= 4) return "🎉";
    return "👏";
  }
  if (reactionType === "like") {
    return "👍";
  }
  return "👍";
};

// Get reaction type from emoji
const getReactionTypeFromEmoji = (emoji) => {
  if (['😂', '🤣', '😭', '💀', '🪦'].includes(emoji)) return 'laugh';
  if (['❤️', '❤️‍🔥'].includes(emoji)) return 'heart';
  if (['🔥', '🔥🔥', '🌋', '🚀'].includes(emoji)) return 'fire';
  if (['👏', '🎉', '🙌', '🏆'].includes(emoji)) return 'clap';
  if (['👍'].includes(emoji)) return 'like';
  return 'default';
};

// ============================================
// CREATOR CHAT LANE COMPONENT (Left Side Only)
// ============================================
const CreatorChatLane = ({ messages }) => {
  const [displayMessages, setDisplayMessages] = useState([]);
  const containerRef = useRef(null);

  // Add new messages with animation timing
  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      if (!displayMessages.find(m => m.id === latestMsg.id)) {
        const msgWithTime = { ...latestMsg, addedAt: Date.now(), exiting: false };
        setDisplayMessages(prev => [...prev.slice(-5), msgWithTime]); // Keep max 6 chats
      }
    }
  }, [messages.length]);

  // Cleanup old messages after 8 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setDisplayMessages(prev => {
        // Mark messages for exit animation after 6 seconds
        const updated = prev.map(msg => {
          if (now - msg.addedAt > 6000 && !msg.exiting) {
            return { ...msg, exiting: true };
          }
          return msg;
        });
        // Remove after 8 seconds
        return updated.filter(msg => now - msg.addedAt < 8000);
      });
    }, 500);
    return () => clearInterval(cleanup);
  }, []);

  // Random avatar colors
  const getAvatarColor = (username) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div 
      ref={containerRef}
      className="absolute left-0 top-0 bottom-0 w-[45%] pointer-events-none overflow-hidden z-30"
      style={{ paddingLeft: '16px', paddingTop: '60px', paddingBottom: '20%' }}
    >
      <div className="flex flex-col justify-end h-full gap-3">
        {displayMessages.map((msg) => {
          const age = Date.now() - msg.addedAt;
          const isExiting = msg.exiting || age > 6000;
          
          return (
            <div
              key={msg.id}
              className={`chat-bubble-enter ${isExiting ? 'chat-bubble-exit' : ''}`}
              style={{
                opacity: isExiting ? 0 : 1,
                transform: isExiting ? 'translateX(-20px) translateY(-10px)' : 'translateX(0)',
                transition: 'all 0.6s ease-out',
              }}
            >
              <div className="inline-flex items-center gap-2 max-w-[90%] chat-bubble-glass">
                {/* Avatar */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(msg.username) }}
                >
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                
                {/* Username and Message */}
                <div className="flex flex-col min-w-0">
                  <span className="text-blue-300 font-bold text-xs truncate">
                    {msg.username}
                  </span>
                  <span className="text-white text-sm font-medium break-words">
                    {msg.message}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// SHOWMELIVE EFFECT - FLOATING REACTION COMPONENT
// ============================================
const ShowMeLiveReaction = ({ emoji, startX, startY, energyLevel, onComplete }) => {
  const [style, setStyle] = useState({
    opacity: 0,
    transform: 'scale(0.3) translateY(0)',
  });
  const [sparkles, setSparkles] = useState([]);
  
  // Energy-based configuration
  const getEnergyConfig = () => {
    switch (energyLevel) {
      case ENERGY_STATES.PEAK:
        return { glow: 0.8, speed: 1.5, scale: 1.3, sparkleCount: 5 };
      case ENERGY_STATES.HIGH:
        return { glow: 0.6, speed: 1.3, scale: 1.2, sparkleCount: 4 };
      case ENERGY_STATES.ACTIVE:
        return { glow: 0.4, speed: 1.15, scale: 1.1, sparkleCount: 3 };
      case ENERGY_STATES.WARM:
        return { glow: 0.2, speed: 1.05, scale: 1.05, sparkleCount: 2 };
      default:
        return { glow: 0, speed: 1, scale: 1, sparkleCount: 1 };
    }
  };
  
  const config = getEnergyConfig();
  const duration = Math.round(1400 / config.speed);
  
  // Horizontal drift
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []);
  
  // Generate sparkles
  useEffect(() => {
    if (config.sparkleCount > 0) {
      const newSparkles = Array.from({ length: config.sparkleCount }, (_, i) => ({
        id: i,
        angle: (360 / config.sparkleCount) * i + Math.random() * 30,
        distance: 20 + Math.random() * 20,
        delay: Math.random() * 200,
      }));
      setSparkles(newSparkles);
    }
  }, [config.sparkleCount]);
  
  // Animation sequence
  useEffect(() => {
    // Pop in with bounce
    setTimeout(() => {
      setStyle({
        opacity: 1,
        transform: `scale(${config.scale * 1.2}) translateY(0)`,
      });
    }, 10);
    
    // Settle
    setTimeout(() => {
      setStyle({
        opacity: 1,
        transform: `scale(${config.scale}) translateY(-20px)`,
      });
    }, 150);
    
    // Float up
    setTimeout(() => {
      setStyle({
        opacity: 0.9,
        transform: `scale(${config.scale * 0.95}) translateY(-100px) translateX(${drift}px)`,
      });
    }, 400);
    
    // Fade out
    setTimeout(() => {
      setStyle({
        opacity: 0,
        transform: `scale(${config.scale * 0.7}) translateY(-180px) translateX(${drift * 1.2}px)`,
      });
    }, duration - 400);
    
    // Remove
    setTimeout(onComplete, duration);
  }, [config.scale, drift, duration, onComplete]);
  
  // Get glow color based on emoji type
  const getGlowColor = () => {
    const type = getReactionTypeFromEmoji(emoji);
    switch (type) {
      case 'heart': return 'rgba(239, 68, 68, VAL)';
      case 'laugh': return 'rgba(251, 191, 36, VAL)';
      case 'fire': return 'rgba(251, 146, 60, VAL)';
      case 'clap': return 'rgba(168, 85, 247, VAL)';
      default: return 'rgba(59, 130, 246, VAL)';
    }
  };
  
  const glowColor = getGlowColor().replace('VAL', config.glow);
  
  return (
    <div
      className="absolute pointer-events-none showmelive-reaction"
      style={{
        left: `${startX}%`,
        bottom: `${startY}%`,
        ...style,
        transition: `all ${duration * 0.4}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        zIndex: 25,
      }}
    >
      {/* Main Emoji */}
      <span 
        className="text-4xl md:text-5xl block"
        style={{
          filter: config.glow > 0 ? `drop-shadow(0 0 ${config.glow * 25}px ${glowColor})` : undefined,
          textShadow: config.glow > 0 ? `0 0 ${config.glow * 20}px ${glowColor}` : undefined,
        }}
      >
        {emoji}
      </span>
      
      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute w-2 h-2 rounded-full sparkle-particle"
          style={{
            left: '50%',
            top: '50%',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            transform: `translate(-50%, -50%) rotate(${sparkle.angle}deg) translateX(${sparkle.distance}px)`,
            animationDelay: `${sparkle.delay}ms`,
          }}
        />
      ))}
    </div>
  );
};

// ============================================
// FLOATING REACTION LAYER (ShowMeLive Effect)
// ============================================
const FloatingReactionLayer = ({ reactions, energyLevel }) => {
  const [activeReactions, setActiveReactions] = useState([]);
  const maxReactions = 25; // Performance cap

  useEffect(() => {
    if (reactions.length > 0) {
      const latest = reactions[reactions.length - 1];
      if (!activeReactions.find(r => r.id === latest.id)) {
        // Apply density based on energy level
        const shouldAdd = activeReactions.length < maxReactions;
        if (shouldAdd) {
          setActiveReactions(prev => [...prev, latest]);
        }
      }
    }
  }, [reactions]);

  const handleComplete = (id) => {
    setActiveReactions(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="absolute right-0 bottom-0 w-[50%] h-[50%] pointer-events-none overflow-hidden z-25">
      {activeReactions.map((reaction) => (
        <ShowMeLiveReaction
          key={reaction.id}
          emoji={reaction.emoji}
          startX={reaction.startX}
          startY={reaction.startY || 10}
          energyLevel={energyLevel}
          onComplete={() => handleComplete(reaction.id)}
        />
      ))}
    </div>
  );
};

// ============================================
// ENERGY METER CONTROLLER - Tracks engagement
// ============================================
const useEnergyMeter = () => {
  const [events, setEvents] = useState([]);
  const [energyScore, setEnergyScore] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(ENERGY_STATES.LOW);
  const [reactionVelocity, setReactionVelocity] = useState(0);
  
  const WINDOW_MS = 15000; // 15-second rolling window
  
  // Add event to the meter
  const addEvent = useCallback((event) => {
    const weightedEvent = {
      ...event,
      timestamp: Date.now(),
      weight: event.type === 'burst' ? 4 : event.type === 'escalated' ? 2 : 1,
    };
    setEvents(prev => [...prev, weightedEvent]);
  }, []);
  
  // Calculate energy score periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - WINDOW_MS;
      
      // Prune old events
      setEvents(prev => {
        const active = prev.filter(e => e.timestamp > cutoff);
        
        // Calculate score
        const score = active.reduce((sum, e) => sum + e.weight, 0);
        setEnergyScore(score);
        
        // Calculate velocity (events per second)
        const recentWindow = 5000; // 5 seconds
        const recentEvents = active.filter(e => e.timestamp > now - recentWindow);
        setReactionVelocity(Math.round(recentEvents.length / 5));
        
        // Determine energy level
        const level = ENERGY_THRESHOLDS.find(t => score >= t.min && score <= t.max)?.state || ENERGY_STATES.LOW;
        setEnergyLevel(level);
        
        return active;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, []);
  
  // Reset meter
  const reset = useCallback(() => {
    setEvents([]);
    setEnergyScore(0);
    setEnergyLevel(ENERGY_STATES.LOW);
    setReactionVelocity(0);
  }, []);
  
  return {
    energyScore,
    energyLevel,
    reactionVelocity,
    addEvent,
    reset,
  };
};

// ============================================
// ENERGY METER INDICATOR UI
// ============================================
const EnergyMeterIndicator = ({ energyLevel, energyScore, reactionVelocity }) => {
  const getStateConfig = () => {
    switch (energyLevel) {
      case ENERGY_STATES.PEAK:
        return { gradient: 'from-pink-500 via-purple-500 to-indigo-500', label: '🔥 PEAK!', animate: true };
      case ENERGY_STATES.HIGH:
        return { gradient: 'from-orange-500 to-red-500', label: '⚡ HIGH', animate: true };
      case ENERGY_STATES.ACTIVE:
        return { gradient: 'from-yellow-500 to-orange-500', label: '✨ ACTIVE', animate: false };
      case ENERGY_STATES.WARM:
        return { gradient: 'from-green-500 to-yellow-500', label: '💫 WARM', animate: false };
      default:
        return { gradient: 'from-gray-500 to-gray-600', label: 'READY', animate: false };
    }
  };
  
  const config = getStateConfig();
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} ${config.animate ? 'animate-pulse' : ''} shadow-lg`}>
      <Zap className={`w-4 h-4 text-white ${config.animate ? 'animate-bounce' : ''}`} />
      <span className="text-white font-bold text-xs">{config.label}</span>
      <div className="flex items-center gap-1 text-white/80 text-xs">
        <span>({energyScore})</span>
        {reactionVelocity > 0 && (
          <span className="text-yellow-300">+{reactionVelocity}/s</span>
        )}
      </div>
    </div>
  );
};

// ============================================
// AUDIO SETTINGS DROPDOWN
// ============================================
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
        <div className="grid grid-cols-2 gap-3">
          <SliderControl icon={Volume2} label="Speaker" value={speakerVolume} onChange={setSpeakerVolume} />
          <SliderControl icon={Mic} label="Mic" value={micVolume} onChange={setMicVolume} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderControl icon={Volume2} label="Treble" value={treble} onChange={setTreble} color="#10b981" />
          <SliderControl icon={Volume2} label="Bass" value={bass} onChange={setBass} color="#f59e0b" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">L</span>
            <span className="text-gray-300 text-xs">Balance {balance === 50 ? 'Center' : balance < 50 ? `L ${50 - balance}` : `R ${balance - 50}`}</span>
            <span className="text-gray-400 text-xs">R</span>
          </div>
          <input type="range" min="0" max="100" value={balance}
            onChange={(e) => setBalance(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
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

// ============================================
// LIVEKIT STREAM PUBLISHER
// ============================================
const StreamPublisher = ({ onViewerCount, isCameraOn, isMicOn, streamTime, facingMode, videoQuality }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  const cameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

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
      
      {!isMicOn && (
        <div className="absolute bottom-2 left-2 bg-red-600/80 px-2 py-0.5 rounded flex items-center gap-1">
          <MicOff className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Muted</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// CAMERA PREVIEW (Pre-stream)
// ============================================
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

// ============================================
// MAIN CONTROL PANEL COMPONENT
// ============================================
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
  const [facingMode, setFacingMode] = useState('user');
  const [videoQuality, setVideoQuality] = useState('1080p');
  
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [liveReactions, setLiveReactions] = useState([]);
  const chatWsRef = useRef(null);
  
  // Reaction tap tracking for escalation
  const reactionTapCountRef = useRef({});
  
  // Energy Meter
  const { energyScore, energyLevel, reactionVelocity, addEvent, reset: resetEnergyMeter } = useEnergyMeter();

  // Screen protection
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

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!eventId) return;
    if (isConnectingRef.current) return;
    
    let wsUrl = BACKEND_URL;
    if (!wsUrl) return;
    
    wsUrl = wsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    wsUrl = `${wsUrl}/api/ws/chat/${eventId}`;
    
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
        
        if (reconnectAttemptsRef.current === 0) {
          toast.success("Chat connected!");
        }
        
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
            const msgId = Date.now() + Math.random();
            setChatMessages(prev => {
              const newMessages = [...prev.slice(-50), {
                id: msgId,
                username: data.username || "Anonymous",
                message: data.message || "",
                color: data.color || "#60a5fa"
              }];
              return newMessages;
            });
            
            // Add to energy meter
            addEvent({ type: 'chat' });
            
          } else if (data.type === "reaction") {
            const reactionId = Date.now() + Math.random();
            const emoji = data.emoji;
            const reactionType = getReactionTypeFromEmoji(emoji);
            
            // Track tap count per viewer for escalation
            const viewerId = data.username || 'anonymous';
            const tapKey = `${viewerId}_${reactionType}`;
            const now = Date.now();
            
            // Reset tap count if more than 60 seconds since last tap
            if (!reactionTapCountRef.current[tapKey] || 
                now - reactionTapCountRef.current[tapKey].lastTap > 60000) {
              reactionTapCountRef.current[tapKey] = { count: 0, lastTap: now };
            }
            
            reactionTapCountRef.current[tapKey].count += 1;
            reactionTapCountRef.current[tapKey].lastTap = now;
            
            const tapCount = reactionTapCountRef.current[tapKey].count;
            
            // Resolve emoji based on tap count (escalation)
            const resolvedEmoji = resolveReactionEmoji(reactionType, tapCount);
            
            // Calculate spawn position
            const startX = Math.random() * 60 + 20; // 20-80% from left
            const startY = Math.random() * 10 + 5; // 5-15% from bottom
            
            setLiveReactions(prev => [...prev, { 
              id: reactionId, 
              emoji: resolvedEmoji, 
              startX,
              startY,
              tapCount,
            }]);
            
            // Add to energy meter (escalated reactions have more weight)
            const isEscalated = tapCount >= 3;
            addEvent({ type: isEscalated ? 'escalated' : 'reaction' });
            
            // Cleanup old reactions after animation
            setTimeout(() => {
              setLiveReactions(prev => prev.filter(r => r.id !== reactionId));
            }, 2000);
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
  }, [eventId, addEvent]);

  // Connect WebSocket when event loads
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
        resetEnergyMeter();
        reactionTapCountRef.current = {};
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
      
      {/* ShowMeLive Effect CSS Animations */}
      <style>{`
        /* Chat Bubble Glassmorphism Style */
        .chat-bubble-glass {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 16px;
          padding: 8px 12px;
          box-shadow: 
            0 0 15px rgba(59, 130, 246, 0.3),
            0 0 30px rgba(59, 130, 246, 0.1),
            inset 0 0 10px rgba(59, 130, 246, 0.05);
        }
        
        /* Chat Bubble Enter Animation */
        .chat-bubble-enter {
          animation: chatBubbleEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes chatBubbleEnter {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        /* Chat Bubble Exit Animation */
        .chat-bubble-exit {
          animation: chatBubbleExit 0.6s ease-out forwards;
        }
        @keyframes chatBubbleExit {
          from {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px) translateY(-15px);
            filter: blur(2px);
          }
        }
        
        /* ShowMeLive Reaction Animation */
        .showmelive-reaction {
          will-change: transform, opacity;
        }
        
        /* Sparkle Particle Animation */
        .sparkle-particle {
          animation: sparkle 0.8s ease-out forwards;
        }
        @keyframes sparkle {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
        }
        
        /* Pulse animation for energy states */
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        /* Stream Info Overlay Styling */
        .stream-info-badge {
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
      `}</style>
      
      {/* Video Preview with ShowMeLive Overlay */}
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
                  nextRetryDelayInMs: (ctx) => Math.min(1000 * Math.pow(2, ctx.retryCount), 10000),
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
          
          {/* ShowMeLive Reaction Energy Meter Overlay - CREATOR ONLY */}
          {isStreaming && showChatReactions && (
            <>
              {/* Left-Side Chat Lane */}
              {event?.chat_enabled && (
                <CreatorChatLane messages={chatMessages} />
              )}
              
              {/* Floating Reactions with ShowMeLive Effect */}
              {event?.reactions_enabled && (
                <FloatingReactionLayer 
                  reactions={liveReactions}
                  energyLevel={energyLevel}
                />
              )}
              
              {/* Stream Info Overlay - Top */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-40">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse stream-info-badge">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    LIVE
                  </div>
                  <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm stream-info-badge">
                    {Math.floor(streamTime / 60)}:{(streamTime % 60).toString().padStart(2, '0')}
                  </div>
                  
                  {/* Energy Meter Indicator */}
                  {event?.reactions_enabled && (
                    <EnergyMeterIndicator 
                      energyLevel={energyLevel}
                      energyScore={energyScore}
                      reactionVelocity={reactionVelocity}
                    />
                  )}
                </div>
                <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 stream-info-badge">
                  <Users className="w-4 h-4" />
                  {viewerCount}
                </div>
              </div>
              
              {/* Connection Status */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs stream-info-badge ${chatConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
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

          {/* Camera Switch */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white"
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
