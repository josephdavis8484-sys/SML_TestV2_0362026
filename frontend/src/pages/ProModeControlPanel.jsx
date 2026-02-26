import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { 
  Mic, 
  MicOff, 
  Video,
  VideoOff,
  Users,
  ArrowLeft,
  Radio,
  Wifi,
  WifiOff,
  SwitchCamera,
  Play,
  Square,
  QrCode,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Transition CSS Styles
const transitionStyles = `
  @keyframes fadeTransition {
    0% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  @keyframes dissolveTransition {
    0% { opacity: 1; filter: blur(0px); }
    50% { opacity: 0.3; filter: blur(8px); }
    100% { opacity: 1; filter: blur(0px); }
  }
  
  @keyframes blendTransition {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  .transition-cut {
    transition: none;
  }
  
  .transition-fade {
    animation: fadeTransition 0.8s ease-in-out;
  }
  
  .transition-dissolve {
    animation: dissolveTransition 1s ease-in-out;
  }
  
  .transition-blend {
    animation: blendTransition 1.2s ease-in-out;
  }
`;

// Transition types
const TRANSITIONS = [
  { id: "cut", name: "Cut", icon: "⚡", duration: 0 },
  { id: "fade", name: "Fade", icon: "🌅", duration: 800 },
  { id: "dissolve", name: "Dissolve", icon: "💫", duration: 1000 },
  { id: "blend", name: "Blend", icon: "🎨", duration: 1200 },
];

// LiveKit Video Display for a specific participant
const ParticipantVideo = ({ participant, isMain = false, className = "" }) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  
  const videoTrack = tracks.find(
    (t) => t.participant.identity === participant?.identity && t.source === Track.Source.Camera
  );

  if (!videoTrack) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center ${className}`}>
        <Video className={`text-gray-600 ${isMain ? 'w-16 h-16' : 'w-8 h-8'}`} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <VideoTrack 
        trackRef={videoTrack}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// Camera Grid Component that shows all connected cameras
const CameraGrid = ({ 
  devices, 
  participants, 
  activeDeviceId, 
  onSelect, 
  transitionClass 
}) => {
  // Map device numbers to participants
  const getParticipantForDevice = (deviceNum) => {
    return participants.find(p => p.identity === `Camera-${deviceNum}`);
  };

  return (
    <div className="grid grid-cols-5 gap-3">
      {devices.map((device) => {
        const participant = getParticipantForDevice(device.device_number);
        const isActive = device.id === activeDeviceId;
        const isConnected = device.is_connected || !!participant;
        
        return (
          <div
            key={device.id}
            onClick={() => isConnected && onSelect(device)}
            className={`
              relative aspect-video rounded-lg overflow-hidden cursor-pointer
              border-2 transition-all duration-200
              ${isActive 
                ? 'border-red-500 ring-2 ring-red-500/50' 
                : isConnected 
                  ? 'border-green-500/50 hover:border-blue-500' 
                  : 'border-gray-700 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Video or Placeholder */}
            {participant ? (
              <ParticipantVideo 
                participant={participant} 
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                {isConnected ? (
                  <Video className="w-8 h-8 text-gray-600" />
                ) : (
                  <VideoOff className="w-8 h-8 text-gray-700" />
                )}
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
              <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-red-600' : 'bg-black/60'} text-white`}>
                {device.device_number}
              </div>
              {isActive && (
                <div className="bg-red-600 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-0.5">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="absolute top-1.5 right-1.5">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-gray-500" />
              )}
            </div>

            {/* Device Name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
              <span className="text-white text-[10px]">{device.device_name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main Video Display with Transition Support
const MainVideoDisplay = ({ 
  activeParticipant, 
  transitionClass,
  isLive,
  streamTime,
  viewerCount 
}) => {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative w-full h-full bg-gray-900 rounded-xl overflow-hidden ${transitionClass}`}>
      {activeParticipant ? (
        <ParticipantVideo 
          participant={activeParticipant}
          isMain={true}
          className="w-full h-full"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <SwitchCamera className="w-16 h-16 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-lg">Select a camera to preview</p>
            <p className="text-gray-500 text-sm mt-1">Connected cameras will appear below</p>
          </div>
        </div>
      )}

      {/* Stream Info Overlay */}
      {isLive && activeParticipant && (
        <>
          {/* Top Left - LIVE Badge and Timer */}
          <div className="absolute top-4 left-4 flex items-center gap-3">
            <div className="bg-red-600 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse shadow-lg shadow-red-500/30">
              <Radio className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">LIVE</span>
            </div>
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white font-mono text-sm">{formatTime(streamTime)}</span>
            </div>
          </div>

          {/* Top Right - Viewer Count */}
          <div className="absolute top-4 right-4">
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              <span className="text-white text-sm">{viewerCount}</span>
            </div>
          </div>

          {/* Broadcasting Label */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <span className="text-green-400 text-sm font-medium">● Broadcasting to viewers</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Audio Settings Panel
const AudioSettingsPanel = ({ activeDevice, onUpdate }) => {
  const [settings, setSettings] = useState({
    mic_enabled: true,
    balance: 50,
    treble: 50,
    bass: 50,
  });

  useEffect(() => {
    if (activeDevice?.audio_settings) {
      setSettings({
        mic_enabled: activeDevice.audio_settings.mic_enabled ?? true,
        balance: activeDevice.audio_settings.balance ?? 50,
        treble: activeDevice.audio_settings.treble ?? 50,
        bass: activeDevice.audio_settings.bass ?? 50,
      });
    }
  }, [activeDevice]);

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdate?.(newSettings);
  };

  if (!activeDevice) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-500 text-sm">
        Select an active camera to adjust audio
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Audio Settings</h3>
        <button
          onClick={() => handleChange('mic_enabled', !settings.mic_enabled)}
          className={`p-2 rounded-lg transition-colors ${settings.mic_enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {settings.mic_enabled ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* Balance */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>L</span>
          <span>Balance</span>
          <span>R</span>
        </div>
        <input 
          type="range" min="0" max="100" value={settings.balance}
          onChange={(e) => handleChange('balance', parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>

      {/* Treble */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Treble</span>
          <span>{settings.treble}%</span>
        </div>
        <input 
          type="range" min="0" max="100" value={settings.treble}
          onChange={(e) => handleChange('treble', parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
        />
      </div>

      {/* Bass */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Bass</span>
          <span>{settings.bass}%</span>
        </div>
        <input 
          type="range" min="0" max="100" value={settings.bass}
          onChange={(e) => handleChange('bass', parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
      </div>
    </div>
  );
};

// LiveKit Room Content Component
const ProModeRoomContent = ({
  devices,
  activeDeviceId,
  transitionType,
  isLive,
  streamTime,
  viewerCount,
  onDeviceSwitch,
  onAudioUpdate,
  transitionClass,
}) => {
  const participants = useRemoteParticipants();
  
  // Get active participant
  const activeDevice = devices.find(d => d.id === activeDeviceId);
  const activeParticipant = activeDevice 
    ? participants.find(p => p.identity === `Camera-${activeDevice.device_number}`)
    : null;

  return (
    <>
      <RoomAudioRenderer />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Main Preview & Camera Grid */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Main Active Camera Preview */}
          <div className="flex-1 min-h-0">
            <MainVideoDisplay
              activeParticipant={activeParticipant}
              transitionClass={transitionClass}
              isLive={isLive}
              streamTime={streamTime}
              viewerCount={viewerCount}
            />
          </div>

          {/* Camera Grid */}
          <div className="flex-shrink-0">
            <CameraGrid
              devices={devices}
              participants={participants}
              activeDeviceId={activeDeviceId}
              onSelect={onDeviceSwitch}
              transitionClass={transitionClass}
            />
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Audio Settings */}
          <AudioSettingsPanel 
            activeDevice={activeDevice}
            onUpdate={onAudioUpdate}
          />

          {/* Connected Cameras List */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-bold text-sm mb-3">Cameras</h3>
            <div className="space-y-2">
              {devices.map((device) => {
                const participant = participants.find(p => p.identity === `Camera-${device.device_number}`);
                const isConnected = device.is_connected || !!participant;
                const isActive = device.id === activeDeviceId;
                
                return (
                  <div 
                    key={device.id}
                    className={`flex items-center justify-between p-2 rounded transition-colors ${
                      isActive ? 'bg-red-600/20 border border-red-500/50' : 'bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                      <span className="text-white text-sm">{device.device_name}</span>
                    </div>
                    {isActive && (
                      <span className="text-red-400 text-xs font-bold">LIVE</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Main Pro Mode Control Panel
const ProModeControlPanel = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [event, setEvent] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [transitionType, setTransitionType] = useState("cut");
  const [transitionClass, setTransitionClass] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamTime, setStreamTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  
  const wsRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Initialize devices (1-5)
  useEffect(() => {
    const initDevices = [];
    for (let i = 1; i <= 5; i++) {
      initDevices.push({
        id: `${eventId}-device-${i}`,
        device_number: i,
        device_name: `Camera ${i}`,
        is_connected: false,
        is_active: false,
        audio_settings: {
          mic_enabled: false,
          speaker_muted: true,
          balance: 50,
          treble: 50,
          bass: 50
        }
      });
    }
    setDevices(initDevices);
  }, [eventId]);

  // Fetch session data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventRes = await axiosInstance.get(`/events/${eventId}`);
        setEvent(eventRes.data);

        // Get or create Pro Mode session
        let sessionData;
        try {
          const sessionRes = await axiosInstance.get(`/pro-mode/session/${eventId}`);
          sessionData = sessionRes.data;
        } catch {
          const createRes = await axiosInstance.post(`/pro-mode/session/create?event_id=${eventId}`);
          sessionData = createRes.data;
        }
        
        setSession(sessionData);
        setTransitionType(sessionData.transition_type || "cut");
        setIsLive(sessionData.is_live || false);
        
        // Connect to LiveKit as control panel (subscriber only)
        const cpRes = await axiosInstance.post(`/pro-mode/control-panel/connect?event_id=${eventId}`);
        setLivekitToken(cpRes.data.livekit_token);
        setLivekitUrl(cpRes.data.livekit_url);
        
        // Update devices from session
        if (sessionData.devices) {
          setDevices(prev => {
            const updated = [...prev];
            sessionData.devices.forEach(d => {
              const idx = updated.findIndex(u => u.device_number === d.device_number);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], ...d };
              }
            });
            return updated;
          });
          
          const active = sessionData.devices.find(d => d.is_active);
          if (active) setActiveDeviceId(active.id);
        }

        setLoading(false);
      } catch (error) {
        toast.error("Failed to load Pro Mode session");
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // WebSocket connection
  useEffect(() => {
    if (!session) return;

    const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/pro-mode/control-panel/${eventId}`;
    
    let pingInterval;
    
    const connectWs = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        toast.success("Control Panel connected");
        pingInterval = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send("ping");
          }
        }, 15000);
      };
      
      wsRef.current.onmessage = (event) => {
        if (event.data === "pong") return;
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "device_connected") {
            setDevices(prev => prev.map(d => 
              d.device_number === data.device_number ? { ...d, is_connected: true } : d
            ));
            toast.success(`Camera ${data.device_number} connected`);
          }
          
          if (data.type === "device_disconnected") {
            setDevices(prev => prev.map(d => 
              d.device_number === data.device_number ? { ...d, is_connected: false } : d
            ));
            toast.info(`Camera ${data.device_number} disconnected`);
          }
        } catch (e) {}
      };
      
      wsRef.current.onclose = () => {
        clearInterval(pingInterval);
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [session, eventId]);

  // Stream timer
  useEffect(() => {
    if (isLive) {
      streamTimerRef.current = setInterval(() => {
        setStreamTime(prev => prev + 1);
      }, 1000);
    } else {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    }

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isLive]);

  // Handle device switch with transition
  const handleDeviceSwitch = async (device) => {
    if (!device.is_connected) {
      toast.error("Camera is not connected");
      return;
    }

    // Apply transition animation class
    const transition = TRANSITIONS.find(t => t.id === transitionType);
    if (transition && transition.duration > 0) {
      setTransitionClass(`transition-${transitionType}`);
      setTimeout(() => setTransitionClass(""), transition.duration);
    }

    try {
      await axiosInstance.post("/pro-mode/switch-device", {
        event_id: eventId,
        device_id: device.id,
        transition_type: transitionType
      });

      setDevices(prev => prev.map(d => ({
        ...d,
        is_active: d.id === device.id,
        audio_settings: {
          ...d.audio_settings,
          mic_enabled: d.id === device.id
        }
      })));
      setActiveDeviceId(device.id);

      toast.success(`Switched to ${device.device_name}`);
    } catch (error) {
      toast.error("Failed to switch camera");
    }
  };

  // Handle Go Live
  const handleGoLive = async () => {
    const connectedDevices = devices.filter(d => d.is_connected);
    if (connectedDevices.length === 0) {
      toast.error("Connect at least one camera to go live");
      return;
    }

    try {
      await axiosInstance.post(`/pro-mode/go-live/${eventId}`);
      setIsLive(true);
      toast.success("You are now LIVE!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to go live");
    }
  };

  // Handle End Stream
  const handleEndStream = async () => {
    try {
      await axiosInstance.post(`/livekit/end-stream/${eventId}`);
      setIsLive(false);
      setStreamTime(0);
      toast.success("Stream ended");
    } catch (error) {
      toast.error("Failed to end stream");
    }
  };

  // Update transition type
  const handleTransitionChange = async (newTransition) => {
    try {
      await axiosInstance.put(`/pro-mode/session/${eventId}/transition?transition_type=${newTransition}`);
      setTransitionType(newTransition);
    } catch (error) {
      toast.error("Failed to update transition");
    }
  };

  // Update audio settings
  const handleAudioUpdate = async (settings) => {
    if (!activeDeviceId) return;
    
    try {
      await axiosInstance.put(`/pro-mode/device/${activeDeviceId}/audio?event_id=${eventId}`, settings);
    } catch (error) {
      console.error("Failed to update audio settings");
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-500 mx-auto mb-3 animate-spin" />
          <p className="text-white">Loading Pro Mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Inject transition styles */}
      <style>{transitionStyles}</style>

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold flex items-center gap-2">
              Pro Mode 
              <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">MULTI-CAM</span>
            </h1>
            <p className="text-gray-400 text-sm">{event?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stream Status */}
          {isLive && (
            <>
              <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full animate-pulse">
                <Radio className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">LIVE</span>
              </div>
              <div className="text-white font-mono bg-gray-800 px-3 py-1.5 rounded-full text-sm">
                {formatTime(streamTime)}
              </div>
              <div className="flex items-center gap-1 text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
                <Users className="w-4 h-4" />
                <span className="text-sm">{viewerCount}</span>
              </div>
            </>
          )}

          {/* Transition Selector */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {TRANSITIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTransitionChange(t.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  transitionType === t.id 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                title={t.name}
              >
                {t.icon}
              </button>
            ))}
          </div>

          {/* QR Codes Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/pro-mode/${eventId}/qr`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Connect Cameras
          </Button>

          {/* Go Live / End Button */}
          <Button
            onClick={isLive ? handleEndStream : handleGoLive}
            className={`px-6 ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
            }`}
          >
            {isLive ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                End Stream
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Go Live
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content with LiveKit Room */}
      {livekitToken && livekitUrl ? (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={livekitToken}
          connect={true}
          video={false}
          audio={false}
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <ProModeRoomContent
            devices={devices}
            activeDeviceId={activeDeviceId}
            transitionType={transitionType}
            isLive={isLive}
            streamTime={streamTime}
            viewerCount={viewerCount}
            onDeviceSwitch={handleDeviceSwitch}
            onAudioUpdate={handleAudioUpdate}
            transitionClass={transitionClass}
          />
        </LiveKitRoom>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-purple-500 mx-auto mb-3 animate-spin" />
            <p className="text-white">Connecting to LiveKit...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProModeControlPanel;
