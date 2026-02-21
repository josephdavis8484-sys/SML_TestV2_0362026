import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowLeft, 
  Plus, 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  Play,
  Pause,
  X,
  Video,
  VideoOff,
  Users,
  Music,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Camera,
  CameraOff
} from "lucide-react";
import { toast } from "sonner";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
  AudioTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

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
        <div className="w-10" />
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
    className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl p-6 flex items-center justify-between transition-all"
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
        <div className={`w-24 h-24 bg-${color}-600/20 rounded-2xl flex items-center justify-center mb-8`}>
          <Icon className={`w-12 h-12 text-${color}-400`} />
        </div>
        
        <div className="text-white text-7xl font-bold mb-12">
          {value}%
        </div>
        
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
        
        <div className="flex gap-4 mt-8">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`px-6 py-3 rounded-xl text-lg font-semibold transition-all ${
                value === preset
                  ? "bg-blue-600 text-white"
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

// LiveKit Stream Publisher Component - This actually publishes the stream
const StreamPublisher = ({ onViewerCount }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  
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

  // Enable camera and mic on mount
  useEffect(() => {
    const enableMedia = async () => {
      if (localParticipant) {
        try {
          await localParticipant.setCameraEnabled(true);
          await localParticipant.setMicrophoneEnabled(true);
          console.log("Camera and microphone enabled");
        } catch (error) {
          console.error("Error enabling media:", error);
          toast.error("Failed to enable camera/microphone");
        }
      }
    };
    enableMedia();
  }, [localParticipant]);

  const toggleCamera = async () => {
    if (localParticipant) {
      const newState = !isCameraEnabled;
      await localParticipant.setCameraEnabled(newState);
      setIsCameraEnabled(newState);
      toast.info(newState ? "Camera enabled" : "Camera disabled");
    }
  };

  const toggleMic = async () => {
    if (localParticipant) {
      const newState = !isMicEnabled;
      await localParticipant.setMicrophoneEnabled(newState);
      setIsMicEnabled(newState);
      toast.info(newState ? "Microphone enabled" : "Microphone muted");
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Preview */}
      {cameraTrack ? (
        <VideoTrack
          trackRef={cameraTrack}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <CameraOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Camera is disabled or loading...</p>
          </div>
        </div>
      )}
      
      {/* Control buttons overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-full">
        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full transition-colors ${
            isCameraEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isCameraEnabled ? (
            <Camera className="w-6 h-6 text-white" />
          ) : (
            <CameraOff className="w-6 h-6 text-white" />
          )}
        </button>
        
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-colors ${
            isMicEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isMicEnabled ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
      
      {/* Live indicator */}
      <div className="absolute top-4 left-4 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        <span className="text-white font-bold">LIVE</span>
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Audio controls
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [balance, setBalance] = useState(50);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingOverlay, setActiveSettingOverlay] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const eventRes = await axiosInstance.get(`/events/${eventId}`);
      setEvent(eventRes.data);
      
      // Check if already live
      if (eventRes.data.status === "live") {
        // Try to reconnect
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
        toast.success("Stream ended");
        fetchData();
      } catch (error) {
        console.error("Error ending stream:", error);
        toast.error("Failed to end stream");
      }
    } else {
      // Start stream - get LiveKit token for publishing
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
          
          // Set event to live and notify all ticket holders
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
    toast.info("Disconnected from stream");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

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
            {/* Settings Button */}
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="font-bold">LIVE</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-full">
                  <Users className="w-4 h-4" />
                  <span>{viewerCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Video Preview / LiveKit Room */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="aspect-video bg-black relative">
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
                <StreamPublisher onViewerCount={setViewerCount} />
              </LiveKitRoom>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Ready to go live</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Go Live" to start streaming</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stream Info */}
        {isStreaming && (
          <div className="bg-green-900/20 border border-green-600/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-green-400 font-medium">Your stream is live!</p>
                <p className="text-green-300/70 text-sm">Viewers can now watch your event.</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Chat Mode Indicator */}
        {event.chat_enabled && (
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              <strong>Chat Mode:</strong> {event.chat_mode === "questions_only" ? "Questions Only" : event.chat_mode === "moderated" ? "Moderated" : "Open Chat"}
            </p>
            {event.reactions_enabled && (
              <p className="text-pink-400 text-sm mt-1">
                <strong>Live Reactions:</strong> Enabled
              </p>
            )}
          </div>
        )}
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
            value={`${micVolume}%`}
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
            <p className="text-gray-400 text-sm text-center">
              Scan this QR code with your mobile device to add it as a streaming camera
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
