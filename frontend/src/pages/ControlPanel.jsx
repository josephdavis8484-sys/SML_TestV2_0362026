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
      className="absolute bottom-full right-0 mb-3 w-[500px] bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl z-50"
      style={{ transform: 'translateX(10%)' }}
    >
      <div className="absolute -bottom-2 right-[15%] w-4 h-4 bg-gray-900/95 border-r border-b border-gray-700 transform rotate-45"></div>
      
      <div className="text-center py-3 border-b border-gray-700">
        <h3 className="text-white font-bold text-base tracking-wide">AUDIO SETTINGS</h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
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
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${speakerVolume}%, #374151 ${speakerVolume}%, #374151 100%)`
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">Microphone</span>
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
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <span className="text-gray-300 text-sm">Balance</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">L</span>
              <input
                type="range"
                min="0"
                max="100"
                value={balance}
                onChange={(e) => setBalance(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-gray-400 text-xs">R</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-gray-300 text-sm">Treble</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setTreble(Math.max(0, treble - 5))} className="text-gray-400 hover:text-white">
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={treble}
                onChange={(e) => setTreble(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <button onClick={() => setTreble(Math.min(100, treble + 5))} className="text-gray-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-gray-300 text-sm">Bass</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setBass(Math.max(0, bass - 5))} className="text-gray-400 hover:text-white">
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={bass}
                onChange={(e) => setBass(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <button onClick={() => setBass(Math.min(100, bass + 5))} className="text-gray-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onReset}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// Live Chat Component for Creator - receives messages from WebSocket
const LiveChatPanel = ({ messages }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <h4 className="text-white text-sm font-bold mb-2">Live Chat</h4>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">Waiting for messages...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="bg-gray-800/50 rounded px-2 py-1.5">
              <span className="font-bold text-sm" style={{ color: msg.color }}>
                {msg.username}:
              </span>
              <span className="text-gray-300 text-sm ml-1">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// Live Reactions Component for Creator - shows floating reactions
const LiveReactionsPanel = ({ reactions }) => {
  return (
    <div className="relative h-full overflow-hidden">
      <h4 className="text-white text-sm font-bold mb-2">Live Reactions</h4>
      
      {/* Floating reactions from viewers */}
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-3xl"
          style={{
            left: `${reaction.left}%`,
            bottom: '20px',
            animation: 'floatUp 3s ease-out forwards'
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      {reactions.length === 0 && (
        <p className="text-gray-500 text-sm">Waiting for reactions...</p>
      )}

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-150px) scale(1.2); opacity: 0; }
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
  
  const cameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );
  
  useEffect(() => {
    if (room) {
      const updateCount = () => {
        onViewerCount(room.remoteParticipants.size);
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

  // Sync camera and mic state with LiveKit
  useEffect(() => {
    const syncMedia = async () => {
      if (localParticipant) {
        try {
          await localParticipant.setCameraEnabled(isCameraOn);
          await localParticipant.setMicrophoneEnabled(isMicOn);
          console.log("Media synced - Camera:", isCameraOn, "Mic:", isMicOn);
        } catch (error) {
          console.error("Error syncing media:", error);
        }
      }
    };
    syncMedia();
  }, [localParticipant, isCameraOn, isMicOn]);

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
          <VideoOff className="w-16 h-16 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Camera is off</p>
        </div>
      )}
      
      {/* Live indicator - Top Left */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="bg-red-600 px-2.5 py-1 rounded flex items-center gap-1.5">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-xs">LIVE</span>
        </div>
        <div className="bg-black/60 px-2 py-1 rounded flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{room?.remoteParticipants?.size || 0}</span>
        </div>
      </div>
      
      {/* Stream time - Top Right */}
      <div className="absolute top-3 right-3 bg-black/60 px-2.5 py-1 rounded flex items-center gap-1.5">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
      </div>
      
      {/* Mic indicator */}
      {!isMicOn && (
        <div className="absolute bottom-3 left-3 bg-red-600/80 px-2 py-1 rounded flex items-center gap-1">
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
          <VideoOff className="w-16 h-16 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Camera is off</p>
        </div>
      </div>
    );
  }

  return (
    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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

  // Chat and Reactions state - SHARED WebSocket
  const [chatMessages, setChatMessages] = useState([]);
  const [liveReactions, setLiveReactions] = useState([]);
  const chatWsRef = useRef(null);

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

  // Single WebSocket connection for chat and reactions
  useEffect(() => {
    if (isStreaming && eventId && (event?.chat_enabled || event?.reactions_enabled)) {
      const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/chat/${eventId}`;
      
      try {
        chatWsRef.current = new WebSocket(wsUrl);
        
        chatWsRef.current.onopen = () => {
          console.log("Creator WebSocket connected for chat/reactions");
        };

        chatWsRef.current.onmessage = (wsEvent) => {
          try {
            const data = JSON.parse(wsEvent.data);
            console.log("Received WebSocket message:", data);
            
            if (data.type === "message") {
              setChatMessages(prev => [...prev.slice(-50), {
                id: Date.now() + Math.random(),
                username: data.username || "Anonymous",
                message: data.message || "",
                color: data.color || "#60a5fa"
              }]);
            } else if (data.type === "reaction") {
              const reactionId = Date.now() + Math.random();
              const left = Math.random() * 60 + 20;
              setLiveReactions(prev => [...prev, { id: reactionId, emoji: data.emoji, left }]);
              
              // Remove after animation
              setTimeout(() => {
                setLiveReactions(prev => prev.filter(r => r.id !== reactionId));
              }, 3000);
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };

        chatWsRef.current.onclose = () => {
          console.log("Creator WebSocket disconnected");
        };

        chatWsRef.current.onerror = (error) => {
          console.error("Creator WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to connect WebSocket:", error);
      }
    }

    return () => {
      if (chatWsRef.current) {
        chatWsRef.current.close();
      }
    };
  }, [isStreaming, eventId, event?.chat_enabled, event?.reactions_enabled]);

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
    toast.info("Audio settings reset");
  };

  const showChatReactions = event?.chat_enabled || event?.reactions_enabled;

  if (!event) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Video Preview Area */}
      <div className="flex-1 min-h-0 p-3">
        <div className="h-full bg-gray-900 rounded-xl overflow-hidden">
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

      {/* Bottom Control Bar */}
      <div className="bg-gray-900 px-3 py-3 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 max-w-xl mx-auto">
          {/* Camera Toggle */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleCamera}
              data-testid="camera-toggle-btn"
              className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white"
            >
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <span className={`text-xs mt-1 ${isCameraOn ? 'text-green-400' : 'text-red-400'}`}>
              {isCameraOn ? 'On' : 'Off'}
            </span>
          </div>

          {/* Microphone Toggle */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleMic}
              data-testid="mic-toggle-btn"
              className="w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white relative"
            >
              <Mic className="w-5 h-5" />
              {!isMicOn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                </div>
              )}
            </button>
            <span className={`text-xs mt-1 ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>
              {isMicOn ? 'On' : 'Off'}
            </span>
          </div>

          {/* Go Live / End Stream Button */}
          <button
            onClick={handleStartStream}
            data-testid="go-live-button"
            className={`px-6 py-3 rounded-lg font-bold text-base transition-all ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white'
            }`}
            style={{ boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)" }}
          >
            {isStreaming ? 'End Live' : 'Go Live'}
          </button>

          {/* Settings Button */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setShowSettings(!showSettings)}
              data-testid="settings-button"
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${
                showSettings ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <span className="text-xs mt-1 text-gray-400">Settings</span>

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
      </div>

      {/* Chat & Reactions Panel - Only shown when enabled AND streaming */}
      {showChatReactions && isStreaming && (
        <div className="bg-gray-900/90 px-4 py-3 border-t border-gray-800 flex-shrink-0 h-[180px]">
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4 h-full">
            {event?.chat_enabled && (
              <LiveChatPanel messages={chatMessages} />
            )}
            {event?.reactions_enabled && (
              <LiveReactionsPanel reactions={liveReactions} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
