import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Plus, 
  Radio, 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  Play,
  Pause,
  Monitor,
  X,
  Minimize2,
  Maximize2,
  Video,
  VideoOff,
  Users,
  AlertCircle,
  Music,
  Sliders,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useLocalParticipant,
  useParticipants,
  useTracks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, createLocalTracks, LocalVideoTrack, LocalAudioTrack } from "livekit-client";

// Mobile-friendly Settings Overlay Component
const SettingsOverlay = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button onClick={onClose} className="text-white p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold">{title}</h2>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
};

// Individual Setting Control Component
const SettingControl = ({ icon: Icon, label, onClick, value, color = "blue" }) => (
  <button
    onClick={onClick}
    className={`w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-6 flex items-center justify-between transition-all`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 bg-${color}-600/20 rounded-xl flex items-center justify-center`}>
        <Icon className={`w-7 h-7 text-${color}-400`} />
      </div>
      <div className="text-left">
        <h3 className="text-white text-lg font-semibold">{label}</h3>
        <p className="text-gray-400 text-sm">{value}</p>
      </div>
    </div>
    <ChevronRight className="w-6 h-6 text-gray-400" />
  </button>
);

// Large Slider Overlay for individual controls
const SliderOverlay = ({ isOpen, onClose, title, value, onChange, min = 0, max = 100, icon: Icon, color = "blue" }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] bg-black/98 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button onClick={onClose} className="text-white p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold">{title}</h2>
        <div className="w-10" />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Large Icon */}
        <div className={`w-24 h-24 bg-${color}-600/20 rounded-2xl flex items-center justify-center mb-8`}>
          <Icon className={`w-12 h-12 text-${color}-400`} />
        </div>
        
        {/* Large Value Display */}
        <div className="text-white text-7xl font-bold mb-12">
          {value}%
        </div>
        
        {/* Large Slider */}
        <div className="w-full max-w-md">
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={min}
            max={max}
            step={1}
            className="w-full h-4"
          />
        </div>
        
        {/* Quick Presets */}
        <div className="flex gap-4 mt-8">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
                value === preset
                  ? `bg-${color}-600 text-white`
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Video Transition Selector Overlay
const TransitionOverlay = ({ isOpen, onClose, transitionType, setTransitionType, fadeSpeed, setFadeSpeed, isPremium }) => {
  if (!isOpen) return null;
  
  const transitions = [
    { type: "cut", label: "Cut", description: "Instant switch between cameras", premium: false },
    { type: "fade", label: "Fade", description: "Smooth fade transition", premium: true },
    { type: "crossfade", label: "Crossfade", description: "Cross-dissolve between cameras", premium: true },
  ];
  
  return (
    <div className="fixed inset-0 z-[60] bg-black/98 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <button onClick={onClose} className="text-white p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold">Video Transitions</h2>
        <div className="w-10" />
      </div>
      
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {transitions.map((t) => (
          <button
            key={t.type}
            onClick={() => isPremium || !t.premium ? setTransitionType(t.type) : toast.error("Premium feature")}
            disabled={!isPremium && t.premium}
            className={`w-full p-6 rounded-xl text-left transition-all ${
              transitionType === t.type
                ? "bg-purple-600 border-2 border-purple-400"
                : "bg-gray-800 border-2 border-transparent hover:border-gray-600"
            } ${!isPremium && t.premium ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white text-xl font-bold">{t.label}</h3>
                <p className="text-gray-300 text-sm mt-1">{t.description}</p>
              </div>
              {t.premium && !isPremium && (
                <span className="bg-yellow-600 text-black text-xs font-bold px-2 py-1 rounded">PRO</span>
              )}
            </div>
          </button>
        ))}
        
        {transitionType !== "cut" && (
          <div className="mt-8 p-6 bg-gray-800 rounded-xl">
            <h4 className="text-white text-lg font-semibold mb-4">Fade Speed</h4>
            <Slider
              value={[fadeSpeed]}
              onValueChange={(v) => setFadeSpeed(v[0])}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-gray-400 text-sm">
              <span>Slow</span>
              <span>{fadeSpeed}%</span>
              <span>Fast</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ControlPanel = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showQR, setShowQR] = useState(null);
  const [activeCamera, setActiveCamera] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [streamStatus, setStreamStatus] = useState(null);
  
  // Audio controls
  const [micVolume, setMicVolume] = useState(75);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);
  
  // Video transition
  const [transitionType, setTransitionType] = useState("cut");
  const [fadeSpeed, setFadeSpeed] = useState(50);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingOverlay, setActiveSettingOverlay] = useState(null);

  // Available cameras
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  
  // Local tracks for streaming
  const localVideoRef = useRef(null);
  const localAudioRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    fetchData();
    enumerateCameras();
  }, [eventId]);

  // Initialize local media when streaming starts
  useEffect(() => {
    if (isStreaming && !localStream) {
      initializeLocalMedia();
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isStreaming]);

  // Apply audio settings to stream
  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micMuted;
      }
    }
  }, [micMuted, localStream]);

  const initializeLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: true
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast.success("Camera and microphone connected!");
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone. Please check permissions.");
    }
  };

  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(cameras);
      if (cameras.length > 0 && !selectedCameraId) {
        setSelectedCameraId(cameras[0].deviceId);
      }
    } catch (error) {
      console.error("Error enumerating cameras:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [eventRes, devicesRes, statusRes] = await Promise.all([
        axiosInstance.get(`/events/${eventId}`),
        axiosInstance.get(`/streaming/devices/${eventId}`),
        axiosInstance.get(`/livekit/stream-status/${eventId}`)
      ]);
      setEvent(eventRes.data);
      setDevices(devicesRes.data);
      setStreamStatus(statusRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load control panel");
    }
  };

  const generateDevice = async () => {
    const maxDevices = event?.streaming_package === "premium" ? 5 : 1;
    const streamDevices = devices.filter(d => !d.is_control_panel);
    
    if (streamDevices.length >= maxDevices) {
      toast.error(`Maximum ${maxDevices} streaming device(s) allowed for ${event.streaming_package} package`);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/streaming/generate-device-token?event_id=${eventId}&device_name=Camera ${devices.length + 1}&is_control_panel=false`
      );
      setShowQR(response.data);
      fetchData();
    } catch (error) {
      toast.error("Failed to generate device token");
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
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        toast.success("Stream ended");
        fetchData();
      } catch (error) {
        toast.error("Failed to end stream");
      }
    } else {
      // Start stream - get LiveKit token
      try {
        const response = await axiosInstance.post("/livekit/join-as-creator", {
          event_id: eventId,
          device_name: `Camera ${activeCamera + 1}`,
          is_publisher: true
        });
        
        setLiveKitToken(response.data.token);
        setLiveKitUrl(response.data.url);
        setRoomName(response.data.room_name);
        setIsStreaming(true);
        
        // Set event to live and notify all ticket holders
        try {
          const goLiveRes = await axiosInstance.post(`/events/${eventId}/go-live`);
          toast.success(`Stream started! ${goLiveRes.data.notified_count || 0} viewers notified.`);
        } catch (err) {
          toast.success("Stream started!");
          console.error("Failed to notify viewers:", err);
        }
        
        fetchData();
      } catch (error) {
        toast.error("Failed to start stream");
      }
    }
  };

  const switchCamera = async (index) => {
    setActiveCamera(index);
    if (availableCameras[index]) {
      setSelectedCameraId(availableCameras[index].deviceId);
      
      // If streaming, switch the camera
      if (localStream) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: availableCameras[index].deviceId } },
            audio: true
          });
          
          // Stop old tracks
          localStream.getTracks().forEach(track => track.stop());
          
          setLocalStream(newStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = newStream;
          }
        } catch (error) {
          console.error("Error switching camera:", error);
        }
      }
    }
    toast.success(`Switched to Camera ${index + 1}`);
  };

  const toggleMic = () => {
    setMicMuted(!micMuted);
    toast.info(micMuted ? "Microphone unmuted" : "Microphone muted");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const isPremium = event.streaming_package === "premium";
  const maxDevices = isPremium ? 5 : 1;
  const cameras = [
    { id: "main", name: "Main Camera", connected: true },
    ...devices.filter(d => !d.is_control_panel).map((d, i) => ({
      id: d.device_token,
      name: `Camera ${i + 2}`,
      connected: d.is_activated
    }))
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{event.title}</h1>
              <p className="text-gray-400 text-sm">Control Panel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Settings Button - Large and prominent for mobile */}
            <button
              onClick={() => setShowSettings(true)}
              className="bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition-all flex items-center gap-2"
              data-testid="settings-button"
            >
              <Settings className="w-6 h-6" />
              <span className="hidden sm:inline font-medium">Settings</span>
            </button>
            
            {/* Live Indicator */}
            {isStreaming && (
              <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Video Preview */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="aspect-video bg-black relative">
            {isStreaming && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Camera preview will appear here</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Go Live" to start streaming</p>
                </div>
              </div>
            )}
            
            {/* Overlay controls */}
            {isStreaming && (
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full ${micMuted ? "bg-red-600" : "bg-gray-800/80"}`}
                >
                  {micMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Camera Selection */}
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-gray-400 text-sm font-medium mb-3">Cameras</h3>
          <div className="flex gap-3 flex-wrap">
            {cameras.slice(0, maxDevices).map((cam, index) => (
              <button
                key={cam.id}
                onClick={() => switchCamera(index)}
                disabled={!isPremium && index > 0}
                className={`px-5 py-3 rounded-xl font-medium transition-all ${
                  activeCamera === index
                    ? "bg-blue-600 text-white"
                    : cam.connected
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-gray-800/50 text-gray-500"
                } ${!isPremium && index > 0 ? "opacity-50" : ""}`}
              >
                Cam {index + 1}
              </button>
            ))}
            
            {isPremium && cameras.length < maxDevices && (
              <button
                onClick={generateDevice}
                className="px-5 py-3 rounded-xl font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Camera
              </button>
            )}
          </div>
        </div>

        {/* Quick Audio Controls */}
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">Quick Audio</h3>
            <button
              onClick={toggleMic}
              className={`p-2 rounded-lg ${micMuted ? "bg-red-600" : "bg-gray-700"}`}
            >
              {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-gray-400" />
            <Slider
              value={[micMuted ? 0 : micVolume]}
              onValueChange={(v) => setMicVolume(v[0])}
              max={100}
              step={1}
              className="flex-1"
              disabled={micMuted}
            />
            <span className="text-gray-400 text-sm w-12 text-right">{micMuted ? 0 : micVolume}%</span>
          </div>
        </div>

        {/* Go Live Button */}
        <Button
          onClick={handleStartStream}
          className={`w-full py-8 text-xl font-bold rounded-xl transition-all ${
            isStreaming
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          }`}
          data-testid="go-live-button"
        >
          {isStreaming ? (
            <>
              <Pause className="w-7 h-7 mr-3" />
              End Stream
            </>
          ) : (
            <>
              <Play className="w-7 h-7 mr-3" />
              Go Live
            </>
          )}
        </Button>
      </div>

      {/* Settings Panel Overlay */}
      <SettingsOverlay 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        title="Settings"
      >
        <div className="space-y-4">
          <SettingControl
            icon={Mic}
            label="Microphone Volume"
            value={micMuted ? "Muted" : `${micVolume}%`}
            onClick={() => setActiveSettingOverlay("mic")}
            color="blue"
          />
          
          <SettingControl
            icon={Volume2}
            label="Speaker Volume"
            value={`${speakerVolume}%`}
            onClick={() => setActiveSettingOverlay("speaker")}
            color="green"
          />
          
          <SettingControl
            icon={Sliders}
            label="Audio Balance"
            value={balance === 50 ? "Center" : balance < 50 ? `Left ${50 - balance}%` : `Right ${balance - 50}%`}
            onClick={() => setActiveSettingOverlay("balance")}
            color="purple"
          />
          
          <SettingControl
            icon={Music}
            label="Treble"
            value={`${treble}%`}
            onClick={() => setActiveSettingOverlay("treble")}
            color="yellow"
          />
          
          <SettingControl
            icon={Music}
            label="Bass"
            value={`${bass}%`}
            onClick={() => setActiveSettingOverlay("bass")}
            color="orange"
          />
          
          <SettingControl
            icon={Video}
            label="Video Transitions"
            value={transitionType.charAt(0).toUpperCase() + transitionType.slice(1)}
            onClick={() => setActiveSettingOverlay("transitions")}
            color="pink"
          />
        </div>
      </SettingsOverlay>

      {/* Individual Setting Overlays */}
      <SliderOverlay
        isOpen={activeSettingOverlay === "mic"}
        onClose={() => setActiveSettingOverlay(null)}
        title="Microphone Volume"
        value={micVolume}
        onChange={setMicVolume}
        icon={Mic}
        color="blue"
      />
      
      <SliderOverlay
        isOpen={activeSettingOverlay === "speaker"}
        onClose={() => setActiveSettingOverlay(null)}
        title="Speaker Volume"
        value={speakerVolume}
        onChange={setSpeakerVolume}
        icon={Volume2}
        color="green"
      />
      
      <SliderOverlay
        isOpen={activeSettingOverlay === "balance"}
        onClose={() => setActiveSettingOverlay(null)}
        title="Audio Balance"
        value={balance}
        onChange={setBalance}
        icon={Sliders}
        color="purple"
      />
      
      <SliderOverlay
        isOpen={activeSettingOverlay === "treble"}
        onClose={() => setActiveSettingOverlay(null)}
        title="Treble"
        value={treble}
        onChange={setTreble}
        icon={Music}
        color="yellow"
      />
      
      <SliderOverlay
        isOpen={activeSettingOverlay === "bass"}
        onClose={() => setActiveSettingOverlay(null)}
        title="Bass"
        value={bass}
        onChange={setBass}
        icon={Music}
        color="orange"
      />
      
      <TransitionOverlay
        isOpen={activeSettingOverlay === "transitions"}
        onClose={() => setActiveSettingOverlay(null)}
        transitionType={transitionType}
        setTransitionType={setTransitionType}
        fadeSpeed={fadeSpeed}
        setFadeSpeed={setFadeSpeed}
        isPremium={isPremium}
      />

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Add Camera Device</h3>
              <button onClick={() => setShowQR(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg mb-4">
              <img src={showQR.qr_code} alt="QR Code" className="w-full" />
            </div>
            <p className="text-gray-400 text-sm text-center mb-4">
              Scan this QR code with your mobile device to add it as a streaming camera
            </p>
            <div className="bg-gray-800 rounded-lg p-3 break-all">
              <p className="text-xs text-gray-400 mb-1">Or open this URL:</p>
              <p className="text-blue-400 text-xs">{showQR.device_url}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
