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
  Heart
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
  isOpen, onClose, speakerVolume, setSpeakerVolume, 
  micVolume, setMicVolume, balance, setBalance, 
  treble, setTreble, bass, setBass, balance, setBalance, onReset
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
          // Enable camera with Full HD 1080p @ 60fps for maximum quality
          await localParticipant.setCameraEnabled(isCameraOn, {
            resolution: { width: 1920, height: 1080, frameRate: 60 },
          });
          await localParticipant.setMicrophoneEnabled(isMicOn);
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
  
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [liveReactions, setLiveReactions] = useState([]);
  const chatWsRef = useRef(null);

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
      {/* Video Preview */}
      <div className="flex-1 min-h-0 p-2">
        <div className="h-full bg-gray-900 rounded-xl overflow-hidden">
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
              />
            </LiveKitRoom>
          ) : (
            <CameraPreview isCameraOn={isCameraOn} />
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-gray-900 px-3 py-2 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-center gap-3 max-w-xl mx-auto">
          <div className="flex flex-col items-center">
            <button onClick={toggleCamera} className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white">
              {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <span className={`text-xs mt-0.5 ${isCameraOn ? 'text-green-400' : 'text-red-400'}`}>{isCameraOn ? 'On' : 'Off'}</span>
          </div>

          <div className="flex flex-col items-center">
            <button onClick={toggleMic} className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white relative">
              <Mic className="w-5 h-5" />
              {!isMicOn && <div className="absolute inset-0 flex items-center justify-center"><div className="w-7 h-0.5 bg-red-500 rotate-45 rounded-full"></div></div>}
            </button>
            <span className={`text-xs mt-0.5 ${isMicOn ? 'text-green-400' : 'text-red-400'}`}>{isMicOn ? 'On' : 'Off'}</span>
          </div>

          <button
            onClick={handleStartStream}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm ${
              isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-b from-red-500 to-red-700'
            } text-white`}
          >
            {isStreaming ? 'End Live' : 'Go Live'}
          </button>

          <div className="relative flex flex-col items-center">
            <button onClick={() => setShowSettings(!showSettings)} className={`w-11 h-11 rounded-lg flex items-center justify-center text-white ${showSettings ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
              <Settings className="w-5 h-5" />
            </button>
            <span className="text-xs mt-0.5 text-gray-400">Settings</span>
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

      {/* Chat & Reactions Panel */}
      {showChatReactions && isStreaming && (
        <div className="bg-gray-900/90 px-3 py-2 border-t border-gray-800 flex-shrink-0 h-[150px]">
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3 h-full">
            {event?.chat_enabled && (
              <div className="relative">
                <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${chatConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} title={chatConnected ? 'Connected' : 'Reconnecting...'} />
                <LiveChatPanel messages={chatMessages} />
              </div>
            )}
            {event?.reactions_enabled && <LiveReactionsPanel reactions={liveReactions} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
