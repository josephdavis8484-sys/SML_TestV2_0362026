import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { 
  Mic, 
  MicOff, 
  Settings, 
  X,
  Video,
  VideoOff,
  Users,
  ChevronLeft,
  Volume2,
  Music,
  Sliders,
  ChevronRight
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
import { Slider } from "@/components/ui/slider";

// Settings Panel Overlay
const SettingsOverlay = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onClose} className="text-white p-2 hover:bg-gray-800 rounded-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold">Settings</h2>
        <div className="w-10" />
      </div>
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
    </div>
  );
};

// Setting Control Item
const SettingControl = ({ icon: Icon, label, value, onClick, color = "blue" }) => (
  <button
    onClick={onClick}
    className="w-full bg-gray-900 hover:bg-gray-800 rounded-xl p-5 flex items-center justify-between transition-all border border-gray-800"
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 bg-${color}-600/20 rounded-xl flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
      <div className="text-left">
        <h3 className="text-white text-lg font-medium">{label}</h3>
        <p className="text-gray-500 text-sm">{value}</p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-gray-600" />
  </button>
);

// Slider Overlay for Individual Controls
const SliderOverlay = ({ isOpen, onClose, title, value, onChange, icon: Icon, color = "blue" }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onClose} className="text-white p-2 hover:bg-gray-800 rounded-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-white text-xl font-bold">{title}</h2>
        <div className="w-10" />
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className={`w-20 h-20 bg-${color}-600/20 rounded-2xl flex items-center justify-center mb-6`}>
          <Icon className={`w-10 h-10 text-${color}-400`} />
        </div>
        
        <div className="text-white text-6xl font-bold mb-10">
          {value}%
        </div>
        
        <div className="w-full max-w-sm">
          <Slider
            value={[value]}
            onValueChange={(v) => onChange(v[0])}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-3 mt-8">
          {[0, 25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-all ${
                value === preset
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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

// LiveKit Stream Publisher Component
const StreamPublisher = ({ onViewerCount, isCameraOn, isMicOn, onToggleCamera, onToggleMic }) => {
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

  // Handle toggle camera
  useEffect(() => {
    const syncCamera = async () => {
      if (localParticipant) {
        await localParticipant.setCameraEnabled(isCameraOn);
      }
    };
    syncCamera();
  }, [localParticipant, isCameraOn]);

  // Handle toggle mic
  useEffect(() => {
    const syncMic = async () => {
      if (localParticipant) {
        await localParticipant.setMicrophoneEnabled(isMicOn);
      }
    };
    syncMic();
  }, [localParticipant, isMicOn]);

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
      
      {/* Live indicator overlay */}
      <div className="absolute top-4 left-4 bg-red-600 px-4 py-2 rounded-lg flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
        <span className="text-white font-bold text-sm">LIVE</span>
      </div>
      
      {/* Viewer count overlay */}
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-2 rounded-lg flex items-center gap-2">
        <Users className="w-4 h-4 text-white" />
        <span className="text-white font-medium text-sm">{room?.remoteParticipants?.size || 0}</span>
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
  const [activeSettingOverlay, setActiveSettingOverlay] = useState(null);

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

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    toast.info(isCameraOn ? "Camera off" : "Camera on");
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    toast.info(isMicOn ? "Microphone muted" : "Microphone on");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Video Preview Area - Takes most of the screen */}
      <div className="flex-1 relative">
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
                onToggleCamera={toggleCamera}
                onToggleMic={toggleMic}
              />
            </LiveKitRoom>
          ) : (
            <CameraPreview isCameraOn={isCameraOn} />
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-gray-900 px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-800">
        <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-xl mx-auto">
          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            data-testid="camera-toggle-btn"
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all ${
              isCameraOn 
                ? "bg-gray-800 hover:bg-gray-700 text-white" 
                : "bg-gray-800 hover:bg-gray-700 text-white"
            }`}
          >
            {isCameraOn ? (
              <Video className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <VideoOff className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </button>

          {/* Microphone Toggle */}
          <button
            onClick={toggleMic}
            data-testid="mic-toggle-btn"
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center transition-all relative ${
              isMicOn 
                ? "bg-gray-800 hover:bg-gray-700 text-white" 
                : "bg-gray-800 hover:bg-gray-700 text-white"
            }`}
          >
            {isMicOn ? (
              <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <>
                <Mic className="w-6 h-6 sm:w-7 sm:h-7" />
                {/* Red slash line */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full"></div>
                </div>
              </>
            )}
          </button>

          {/* Go Live / End Stream Button */}
          <button
            onClick={handleStartStream}
            data-testid="go-live-button"
            className={`px-8 sm:px-12 py-4 sm:py-5 rounded-xl font-bold text-lg sm:text-xl transition-all shadow-lg ${
              isStreaming
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white"
            }`}
            style={{
              background: isStreaming 
                ? undefined 
                : "linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)"
            }}
          >
            {isStreaming ? "End Stream" : "Go Live"}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            data-testid="settings-button"
            className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-800 hover:bg-gray-700 rounded-xl flex flex-col items-center justify-center transition-all text-white"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
            <span className="text-[10px] sm:text-xs text-gray-400">Settings</span>
          </button>
        </div>

        {/* Event Title - Small text below controls */}
        <div className="text-center mt-3">
          <p className="text-gray-500 text-sm truncate max-w-md mx-auto">{event.title}</p>
        </div>
      </div>

      {/* Settings Panel Overlay */}
      <SettingsOverlay 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
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
    </div>
  );
};

export default ControlPanel;
