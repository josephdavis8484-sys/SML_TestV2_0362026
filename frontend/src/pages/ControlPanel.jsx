import React, { useState, useEffect, useRef } from "react";
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
  Radio
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Audio Settings Dropdown Component
const AudioSettingsDropdown = ({ 
  isOpen, 
  onClose, 
  speakerVolume, 
  setSpeakerVolume, 
  micVolume, 
  setMicVolume, 
  balance, 
  setBalance, 
  treble, 
  setTreble, 
  bass, 
  setBass,
  onReset
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute bottom-full right-0 mb-3 w-[600px] bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl z-50"
      style={{ transform: 'translateX(10%)' }}
    >
      {/* Arrow pointer */}
      <div className="absolute -bottom-2 right-[15%] w-4 h-4 bg-gray-900/95 border-r border-b border-gray-700 transform rotate-45"></div>
      
      {/* Header */}
      <div className="text-center py-4 border-b border-gray-700">
        <h3 className="text-white font-bold text-lg tracking-wide">AUDIO SETTINGS</h3>
      </div>

      {/* Settings Content */}
      <div className="p-6 space-y-6">
        {/* Top Row - Speaker Volume and Balance */}
        <div className="grid grid-cols-3 gap-6">
          {/* Speaker Volume */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">Speaker Volume</span>
              <span className="text-gray-400 text-sm ml-auto">{speakerVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={speakerVolume}
              onChange={(e) => setSpeakerVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${speakerVolume}%, #374151 ${speakerVolume}%, #374151 100%)`
              }}
            />
          </div>

          {/* Audio Balance */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Audio Balance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">L</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={balance}
                  onChange={(e) => setBalance(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${balance}%, #3b82f6 ${balance}%, #3b82f6 ${balance + 1}%, #374151 ${balance + 1}%, #374151 100%)`
                  }}
                />
                {/* Center marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-500 pointer-events-none"></div>
              </div>
              <span className="text-gray-400 text-xs">R</span>
            </div>
            {/* Audio waveform visualization */}
            <div className="flex items-center justify-center gap-0.5 h-6 mt-2">
              {[...Array(40)].map((_, i) => {
                const height = Math.random() * 20 + 4;
                const isCenter = i >= 18 && i <= 21;
                return (
                  <div 
                    key={i} 
                    className={`w-1 rounded-sm transition-all ${isCenter ? 'bg-orange-500' : 'bg-gray-600'}`}
                    style={{ height: `${height}px` }}
                  ></div>
                );
              })}
            </div>
          </div>

          {/* Treble */}
          <div className="space-y-3">
            <span className="text-gray-300 text-sm block">Treble</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setTreble(Math.max(0, treble - 5))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={treble}
                onChange={(e) => setTreble(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${treble}%, #374151 ${treble}%, #374151 100%)`
                }}
              />
              <button 
                onClick={() => setTreble(Math.min(100, treble + 5))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row - Microphone Volume and Bass */}
        <div className="grid grid-cols-3 gap-6">
          {/* Microphone Volume */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">Microphone Volume</span>
              <span className="text-gray-400 text-sm ml-auto">{micVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={micVolume}
              onChange={(e) => setMicVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${micVolume}%, #374151 ${micVolume}%, #374151 100%)`
              }}
            />
          </div>

          {/* Empty space in middle */}
          <div></div>

          {/* Bass */}
          <div className="space-y-3">
            <span className="text-gray-300 text-sm block">Bass</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setBass(Math.max(0, bass - 5))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={bass}
                onChange={(e) => setBass(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${bass}%, #374151 ${bass}%, #374151 100%)`
                }}
              />
              <button 
                onClick={() => setBass(Math.min(100, bass + 5))}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onReset}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// Live Chat Component for Creator
const LiveChatPanel = ({ eventId, isStreaming }) => {
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sample messages for demonstration (will be replaced by WebSocket messages)
  const sampleMessages = [
    { id: 1, username: "Alex", message: "Hi everyone", color: "#60a5fa" },
    { id: 2, username: "Jessica", message: "Excited for this topic!", color: "#f472b6" },
    { id: 3, username: "Brian", message: "Looking great on camera!", color: "#34d399" },
    { id: 4, username: "Amanda", message: "Hello there!", color: "#fbbf24" },
  ];

  useEffect(() => {
    if (isStreaming && eventId) {
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

        wsRef.current.onerror = (error) => {
          console.error("Chat WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to connect to chat:", error);
      }

      // Initialize with sample messages for demo
      setMessages(sampleMessages);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isStreaming, eventId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <span className="font-bold text-white" style={{ color: msg.color }}>
              {msg.username}:
            </span>
            <span className="text-gray-300">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// Live Reactions Component for Creator
const LiveReactionsPanel = ({ eventId, isStreaming }) => {
  const [reactions, setReactions] = useState([]);
  const wsRef = useRef(null);

  // Available reaction emojis
  const reactionEmojis = ["👍", "😄", "❤️", "👏", "🔥", "😮", "🎉"];

  useEffect(() => {
    if (isStreaming && eventId) {
      // Connect to WebSocket for reactions
      const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/chat/${eventId}`;
      
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "reaction") {
            addReaction(data.emoji);
          }
        };
      } catch (error) {
        console.error("Failed to connect to reactions:", error);
      }

      // Demo: Add random reactions periodically
      const interval = setInterval(() => {
        const randomEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
        addReaction(randomEmoji);
      }, 2000);

      return () => {
        clearInterval(interval);
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [isStreaming, eventId]);

  const addReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.random() * 80 + 10; // 10% to 90%
    const delay = Math.random() * 0.5;
    
    setReactions(prev => [...prev, { id, emoji, left, delay }]);

    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  return (
    <div className="relative h-full overflow-hidden">
      {/* Floating reactions */}
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl animate-float-up"
          style={{
            left: `${reaction.left}%`,
            bottom: 0,
            animationDelay: `${reaction.delay}s`,
            animation: 'floatUp 3s ease-out forwards'
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      {/* Static emoji display for visual */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end">
        <div className="text-4xl opacity-80 animate-bounce" style={{ animationDelay: '0.1s' }}>👍</div>
        <div className="text-4xl opacity-90 animate-bounce" style={{ animationDelay: '0.3s' }}>😄</div>
        <div className="text-4xl animate-bounce" style={{ animationDelay: '0.5s' }}>❤️</div>
        <div className="flex gap-1">
          <div className="text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>👏</div>
          <div className="text-3xl animate-bounce" style={{ animationDelay: '0.4s' }}>👏</div>
          <div className="text-3xl animate-bounce" style={{ animationDelay: '0.6s' }}>👏</div>
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
            transform: translateY(-200px) scale(1.2);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: floatUp 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// LiveKit Stream Publisher Component
const StreamPublisher = ({ onViewerCount, isCameraOn, isMicOn, streamTime }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  // Get local camera track
  const cameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );
  
  // Update viewer count
  useEffect(() => {
    if (room) {
      const updateCount = () => {
        const viewers = room.remoteParticipants.size;
        onViewerCount(viewers);
      };
      
      room.on('participantConnected', updateCount);
      room.on('participantDisconnected', updateCount);
      updateCount();
      
      return () => {
        room.off('participantConnected', updateCount);
        room.off('participantDisconnected', updateCount);
      };
    }
  }, [room, onViewerCount]);

  // Enable camera and mic on mount and sync with parent state
  useEffect(() => {
    const enableMedia = async () => {
      if (localParticipant) {
        try {
          await localParticipant.setCameraEnabled(isCameraOn);
          await localParticipant.setMicrophoneEnabled(isMicOn);
          console.log("Media enabled - Camera:", isCameraOn, "Mic:", isMicOn);
        } catch (error) {
          console.error("Error enabling media:", error);
          toast.error("Failed to enable camera/microphone");
        }
      }
    };
    enableMedia();
  }, [localParticipant, isCameraOn, isMicOn]);

  // Format stream time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {cameraTrack && isCameraOn ? (
        <VideoTrack
          trackRef={cameraTrack}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-center">
          <VideoOff className="w-20 h-20 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Camera is off</p>
        </div>
      )}
      
      {/* Live indicator overlay - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <div className="bg-red-600 px-3 py-1.5 rounded flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-sm">LIVE</span>
        </div>
        <div className="bg-black/60 px-3 py-1.5 rounded flex items-center gap-2">
          <Users className="w-4 h-4 text-white" />
          <span className="text-white font-medium text-sm">{room?.remoteParticipants?.size || 0}</span>
        </div>
      </div>
      
      {/* Stream time overlay - Top Right */}
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1.5 rounded flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-white font-mono text-sm">LIVE {formatTime(streamTime)}</span>
        <span className="text-green-400 text-sm">▶</span>
      </div>
    </div>
  );
};

// Pre-stream Camera Preview
const CameraPreview = ({ isCameraOn }) => {
  const videoRef = React.useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    let mediaStream = null;
    
    const startPreview = async () => {
      if (isCameraOn) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: false 
          });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
        }
      }
    };

    startPreview();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOn]);

  if (!isCameraOn) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <VideoOff className="w-20 h-20 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Camera is off</p>
        </div>
      </div>
    );
  }

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      muted 
      className="w-full h-full object-cover"
    />
  );
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
  
  // Camera and Mic state
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  
  // Audio controls
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);

  // Stream timer
  useEffect(() => {
    let interval;
    if (isStreaming) {
      interval = setInterval(() => {
        setStreamTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

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
      // Stop stream
      try {
        await axiosInstance.post(`/livekit/end-stream/${eventId}`);
        await axiosInstance.post(`/events/${eventId}/end`);
        setIsStreaming(false);
        setLiveKitToken(null);
        setLiveKitUrl(null);
        setStreamTime(0);
        toast.success("Stream ended");
        fetchData();
      } catch (error) {
        console.error("Error ending stream:", error);
        toast.error("Failed to end stream");
      }
    } else {
      // Start stream
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
            console.error("Failed to notify viewers:", err);
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

  const handleDisconnect = () => {
    setIsStreaming(false);
    setLiveKitToken(null);
    setLiveKitUrl(null);
    setStreamTime(0);
    toast.info("Disconnected from stream");
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toast.info(isCameraOn ? "Camera off" : "Camera on");
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    toast.info(isMicOn ? "Microphone muted" : "Microphone on");
  };

  const handleResetAudio = () => {
    setSpeakerVolume(80);
    setMicVolume(75);
    setBalance(50);
    setTreble(50);
    setBass(50);
    toast.info("Audio settings reset to defaults");
  };

  // Check if chat/reactions are enabled
  const showChatReactions = event?.chat_enabled || event?.reactions_enabled;

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Video Preview Area */}
        <div className={`relative ${showChatReactions && isStreaming ? 'flex-1' : 'flex-1'}`}>
          <div className="absolute inset-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            {isStreaming && liveKitToken && liveKitUrl ? (
              <LiveKitRoom
                serverUrl={liveKitUrl}
                token={liveKitToken}
                connect={true}
                video={true}
                audio={true}
                onDisconnected={handleDisconnect}
                onError={(error) => {
                  console.error("LiveKit error:", error);
                  toast.error("Stream connection error");
                }}
              >
                <StreamPublisher 
                  onViewerCount={setViewerCount}
                  isCameraOn={isCameraOn}
                  isMicOn={isMicOn}
                  streamTime={streamTime}
                />
              </LiveKitRoom>
            ) : (
              <CameraPreview isCameraOn={isCameraOn} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-900/95 backdrop-blur px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-800 relative">
        <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-2xl mx-auto">
          {/* Camera Toggle */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleCamera}
              data-testid="camera-toggle-btn"
              className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-all text-white"
            >
              {isCameraOn ? (
                <Video className="w-6 h-6 sm:w-7 sm:h-7" />
              ) : (
                <VideoOff className="w-6 h-6 sm:w-7 sm:h-7" />
              )}
            </button>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-gray-400 text-xs">Camera</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isCameraOn ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </div>
            <span className={`text-xs ${isCameraOn ? 'text-green-400' : 'text-red-400'}`}>
              {isCameraOn ? 'On' : 'Off'}
            </span>
          </div>

          {/* Microphone Toggle */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleMic}
              data-testid="mic-toggle-btn"
              className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center transition-all text-white relative"
            >
              <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
              {/* Red slash when muted */}
              {!isMicOn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                </div>
              )}
            </button>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-gray-400 text-xs">Mic</span>
            </div>
            <span className={`text-xs ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>
              {isMicOn ? 'On' : 'Off'}
            </span>
          </div>

          {/* Go Live Button (Red, prominent) */}
          <button
            onClick={handleStartStream}
            data-testid="go-live-button"
            className={`px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-bold text-lg sm:text-xl transition-all shadow-lg ${
              isStreaming 
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white'
            }`}
            style={{ boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)" }}
          >
            {isStreaming ? 'End Live' : 'Go Live'}
          </button>

          {/* Secondary Go Live Button (darker) */}
          <button
            onClick={handleStartStream}
            disabled={isStreaming}
            data-testid="go-live-secondary-button"
            className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base transition-all flex items-center gap-2 ${
              isStreaming 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            Go Live
          </button>

          {/* Settings Button */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              data-testid="settings-button"
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all text-white ${
                showSettings 
                  ? 'bg-blue-600 ring-2 ring-blue-400' 
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <span className="mt-1 text-gray-400 text-xs">Settings</span>

            {/* Audio Settings Dropdown */}
            <AudioSettingsDropdown
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              speakerVolume={speakerVolume}
              setSpeakerVolume={setSpeakerVolume}
              micVolume={micVolume}
              setMicVolume={setMicVolume}
              balance={balance}
              setBalance={setBalance}
              treble={treble}
              setTreble={setTreble}
              bass={bass}
              setBass={setBass}
              onReset={handleResetAudio}
            />
          </div>
        </div>

        {/* Arrow indicator for dropdown */}
        {showChatReactions && isStreaming && (
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2">
            <div className="w-4 h-4 bg-gray-900 border-l border-t border-gray-700 transform rotate-[225deg]"></div>
          </div>
        )}
      </div>

      {/* Live Chat & Reactions Panel - Only shown when enabled AND streaming */}
      {showChatReactions && isStreaming && (
        <div className="bg-gradient-to-b from-gray-900/80 to-black px-4 py-6 min-h-[200px]">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8 h-full">
            {/* Live Chat - Left Side */}
            {event?.chat_enabled && (
              <div className="h-[180px]">
                <LiveChatPanel eventId={eventId} isStreaming={isStreaming} />
              </div>
            )}
            
            {/* Live Reactions - Right Side */}
            {event?.reactions_enabled && (
              <div className="h-[180px]">
                <LiveReactionsPanel eventId={eventId} isStreaming={isStreaming} />
              </div>
            )}
            
            {/* If only one is enabled, center it */}
            {event?.chat_enabled && !event?.reactions_enabled && (
              <div></div>
            )}
            {!event?.chat_enabled && event?.reactions_enabled && (
              <div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
