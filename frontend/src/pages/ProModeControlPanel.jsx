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
  RotateCcw,
  ArrowLeft,
  Radio,
  Wifi,
  WifiOff,
  SwitchCamera,
  Sliders,
  Play,
  Square
} from "lucide-react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Transition types
const TRANSITIONS = [
  { id: "cut", name: "Instant Cut", icon: "⚡" },
  { id: "fade", name: "Fade", icon: "🌅" },
  { id: "dissolve", name: "Dissolve", icon: "💫" },
  { id: "blend", name: "Blend", icon: "🎨" },
];

// Camera Preview Component
const CameraPreview = ({ device, isActive, onSelect, isConnected }) => {
  const borderColor = isActive 
    ? "border-red-500 ring-2 ring-red-500/50" 
    : isConnected 
      ? "border-green-500/50" 
      : "border-gray-700";

  return (
    <div 
      onClick={() => isConnected && onSelect(device)}
      className={`relative aspect-video bg-gray-900 rounded-lg border-2 ${borderColor} overflow-hidden cursor-pointer transition-all hover:border-blue-500 ${!isConnected && 'opacity-50 cursor-not-allowed'}`}
    >
      {/* Camera Number Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${isActive ? 'bg-red-600' : 'bg-gray-800/80'} text-white`}>
          CAM {device.device_number}
        </div>
        {isActive && (
          <div className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs text-white">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="absolute top-2 right-2 z-10">
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-400" />
        )}
      </div>

      {/* Video Preview Placeholder */}
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        {isConnected ? (
          <Video className="w-8 h-8 text-gray-600" />
        ) : (
          <div className="text-center">
            <VideoOff className="w-8 h-8 text-gray-600 mx-auto mb-1" />
            <span className="text-gray-500 text-xs">Not Connected</span>
          </div>
        )}
      </div>

      {/* Device Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <span className="text-white text-xs">{device.device_name || `Camera ${device.device_number}`}</span>
      </div>

      {/* Audio Indicator */}
      {device.audio_settings?.mic_enabled && (
        <div className="absolute bottom-2 right-2">
          <Mic className="w-4 h-4 text-green-400" />
        </div>
      )}
    </div>
  );
};

// Audio Settings Panel
const AudioSettingsPanel = ({ activeDevice, onUpdate }) => {
  const [settings, setSettings] = useState({
    mic_enabled: activeDevice?.audio_settings?.mic_enabled ?? true,
    balance: activeDevice?.audio_settings?.balance ?? 50,
    treble: activeDevice?.audio_settings?.treble ?? 50,
    bass: activeDevice?.audio_settings?.bass ?? 50,
  });

  useEffect(() => {
    if (activeDevice) {
      setSettings({
        mic_enabled: activeDevice.audio_settings?.mic_enabled ?? true,
        balance: activeDevice.audio_settings?.balance ?? 50,
        treble: activeDevice.audio_settings?.treble ?? 50,
        bass: activeDevice.audio_settings?.bass ?? 50,
      });
    }
  }, [activeDevice]);

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onUpdate(newSettings);
  };

  if (!activeDevice) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 text-center text-gray-400">
        Select a camera to adjust audio settings
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-sm">Audio - {activeDevice.device_name}</h3>
        <button
          onClick={() => handleChange('mic_enabled', !settings.mic_enabled)}
          className={`p-2 rounded-lg ${settings.mic_enabled ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {settings.mic_enabled ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
        </button>
      </div>

      {/* Balance */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>L</span>
          <span>Balance {settings.balance === 50 ? 'Center' : settings.balance < 50 ? `L${50-settings.balance}` : `R${settings.balance-50}`}</span>
          <span>R</span>
        </div>
        <input 
          type="range" min="0" max="100" value={settings.balance}
          onChange={(e) => handleChange('balance', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #10b981 0%, #10b981 ${settings.treble}%, #374151 ${settings.treble}%, #374151 100%)` }}
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
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${settings.bass}%, #374151 ${settings.bass}%, #374151 100%)` }}
        />
      </div>
    </div>
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
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamTime, setStreamTime] = useState(0);
  const [loading, setLoading] = useState(true);
  
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
        // Get event details
        const eventRes = await axiosInstance.get(`/events/${eventId}`);
        setEvent(eventRes.data);

        // Get or create Pro Mode session
        try {
          const sessionRes = await axiosInstance.get(`/pro-mode/session/${eventId}`);
          setSession(sessionRes.data);
          setTransitionType(sessionRes.data.transition_type || "cut");
          setIsLive(sessionRes.data.is_live || false);
          
          // Update devices with session data
          if (sessionRes.data.devices) {
            setDevices(prev => {
              const updated = [...prev];
              sessionRes.data.devices.forEach(d => {
                const idx = updated.findIndex(u => u.device_number === d.device_number);
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], ...d };
                }
              });
              return updated;
            });
            
            const active = sessionRes.data.devices.find(d => d.is_active);
            if (active) setActiveDeviceId(active.id);
          }
        } catch {
          // Create new session
          const createRes = await axiosInstance.post(`/pro-mode/session/create?event_id=${eventId}`);
          setSession(createRes.data);
        }

        setLoading(false);
      } catch (error) {
        toast.error("Failed to load Pro Mode session");
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // WebSocket connection for control panel
  useEffect(() => {
    if (!session) return;

    const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/pro-mode/control-panel/${eventId}`;
    
    const connectWs = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        toast.success("Control Panel connected");
      };
      
      wsRef.current.onmessage = (event) => {
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
        
        if (data.type === "session_state") {
          if (data.session?.devices) {
            setDevices(prev => {
              const updated = [...prev];
              data.session.devices.forEach(d => {
                const idx = updated.findIndex(u => u.device_number === d.device_number);
                if (idx !== -1) {
                  updated[idx] = { ...updated[idx], ...d };
                }
              });
              return updated;
            });
          }
        }
      };
      
      wsRef.current.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
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
      setStreamTime(0);
    }

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isLive]);

  // Handle device switch
  const handleDeviceSwitch = async (device) => {
    if (!device.is_connected) {
      toast.error("Device is not connected");
      return;
    }

    try {
      await axiosInstance.post("/pro-mode/switch-device", {
        event_id: eventId,
        device_id: device.id,
        transition_type: transitionType
      });

      // Update local state
      setDevices(prev => prev.map(d => ({
        ...d,
        is_active: d.id === device.id,
        audio_settings: {
          ...d.audio_settings,
          mic_enabled: d.id === device.id
        }
      })));
      setActiveDeviceId(device.id);

      toast.success(`Switched to ${device.device_name} with ${transitionType} transition`);
    } catch (error) {
      toast.error("Failed to switch device");
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
      toast.success(`Transition set to ${newTransition}`);
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

  const activeDevice = devices.find(d => d.id === activeDeviceId);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading Pro Mode...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-bold">Pro Mode Control Panel</h1>
            <p className="text-gray-400 text-sm">{event?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLive && (
            <>
              <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full animate-pulse">
                <Radio className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">LIVE</span>
              </div>
              <div className="text-white font-mono">{formatTime(streamTime)}</div>
              <div className="flex items-center gap-1 text-gray-400">
                <Users className="w-4 h-4" />
                <span>{viewerCount}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Main Preview & Camera Grid */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Main Active Camera Preview */}
          <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative min-h-0">
            {activeDevice ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                  <p className="text-white font-bold text-lg">{activeDevice.device_name}</p>
                  <p className="text-gray-400 text-sm">Active Broadcast Source</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <SwitchCamera className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Select a camera to preview</p>
                </div>
              </div>
            )}

            {/* Overlay Info */}
            {isLive && activeDevice && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="bg-red-600 px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  BROADCASTING
                </div>
              </div>
            )}
          </div>

          {/* Camera Grid (5 cameras) */}
          <div className="grid grid-cols-5 gap-3 flex-shrink-0">
            {devices.map((device) => (
              <CameraPreview
                key={device.id}
                device={device}
                isActive={device.id === activeDeviceId}
                isConnected={device.is_connected}
                onSelect={handleDeviceSwitch}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Go Live / End Button */}
          <Button
            onClick={isLive ? handleEndStream : handleGoLive}
            className={`w-full py-6 text-lg font-bold ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
            }`}
          >
            {isLive ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                End Stream
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Go Live
              </>
            )}
          </Button>

          {/* Connected Devices Status */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-bold text-sm mb-3">Connected Devices</h3>
            <div className="space-y-2">
              {devices.map((device) => (
                <div 
                  key={device.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    device.id === activeDeviceId ? 'bg-red-600/20 border border-red-500/50' : 'bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${device.is_connected ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-white text-sm">{device.device_name}</span>
                  </div>
                  {device.id === activeDeviceId && (
                    <span className="text-red-400 text-xs font-bold">LIVE</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Transition Type */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-white font-bold text-sm mb-3">Camera Transition</h3>
            <div className="grid grid-cols-2 gap-2">
              {TRANSITIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTransitionChange(t.id)}
                  className={`p-2 rounded text-sm flex items-center gap-2 ${
                    transitionType === t.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Settings */}
          <AudioSettingsPanel 
            activeDevice={activeDevice}
            onUpdate={handleAudioUpdate}
          />

          {/* QR Code for Device Connection */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <h3 className="text-white font-bold text-sm mb-3">Connect Cameras</h3>
            <p className="text-gray-400 text-xs mb-3">
              Scan QR code on camera devices to connect them to this session
            </p>
            <Button
              variant="outline"
              className="w-full border-gray-600"
              onClick={() => navigate(`/creator/pro-mode/${eventId}/qr`)}
            >
              Show QR Codes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProModeControlPanel;
