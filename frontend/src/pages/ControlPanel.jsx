import React, { useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  Monitor,
  X,
  Minimize2,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";

const ControlPanel = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showQR, setShowQR] = useState(null);
  const [activeCamera, setActiveCamera] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Audio controls
  const [micVolume, setMicVolume] = useState(75);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [treble, setTreble] = useState(50);
  const [bass, setBass] = useState(50);
  const [audioBalance, setAudioBalance] = useState(50);
  
  // Video transition
  const [transitionType, setTransitionType] = useState("cut");
  const [fadeSpeed, setFadeSpeed] = useState(50);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, devicesRes] = await Promise.all([
        axiosInstance.get(`/events/${eventId}`),
        axiosInstance.get(`/streaming/devices/${eventId}`)
      ]);
      setEvent(eventRes.data);
      setDevices(devicesRes.data);
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

  const handleStartStream = () => {
    setIsStreaming(!isStreaming);
    toast.success(isStreaming ? "Stream stopped" : "Stream started!");
  };

  const switchCamera = (index) => {
    setActiveCamera(index);
    toast.success(`Switched to Camera ${index + 1}`);
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const streamDevices = devices.filter(d => !d.is_control_panel);
  const maxDevices = event.streaming_package === "premium" ? 5 : 1;
  const isPremium = event.streaming_package === "premium";

  // Generate placeholder cameras for demo
  const cameras = Array.from({ length: Math.max(streamDevices.length, isPremium ? 5 : 1) }, (_, i) => ({
    id: i,
    name: `Camera ${i + 1}`,
    connected: i < streamDevices.length,
    device: streamDevices[i]
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e]" data-testid="control-panel">
      {/* Window Title Bar */}
      <div className="bg-gray-900/80 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/creator/dashboard")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-semibold">{event.title} - Control Panel</span>
          {isPremium && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded font-medium">
              PRO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="text-gray-400 hover:text-white p-1"><Minimize2 className="w-4 h-4" /></button>
          <button className="text-gray-400 hover:text-white p-1"><Maximize2 className="w-4 h-4" /></button>
          <button 
            onClick={() => navigate("/creator/dashboard")}
            className="text-gray-400 hover:text-red-500 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Main Content Area */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Main Camera View */}
          <div className="flex-1 bg-black rounded-lg overflow-hidden relative mb-4">
            <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-white text-sm font-medium">
              Camera {activeCamera + 1}
            </div>
            {isStreaming && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">LIVE</span>
              </div>
            )}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              {cameras[activeCamera]?.connected ? (
                <div className="text-center">
                  <Radio className="w-20 h-20 text-blue-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-white text-lg">Camera {activeCamera + 1} Active</p>
                  <p className="text-gray-500 text-sm mt-1">Ready for streaming</p>
                </div>
              ) : (
                <div className="text-center">
                  <Monitor className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Camera {activeCamera + 1}</p>
                  <p className="text-gray-500 text-sm mt-1">Not connected</p>
                  <Button
                    onClick={generateDevice}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Device
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-gray-900/80 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-4 gap-6">
              {/* Camera Switch */}
              <div>
                <h3 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Switch Camera</h3>
                <div className="flex gap-2 flex-wrap">
                  {cameras.slice(0, maxDevices).map((cam, index) => (
                    <button
                      key={cam.id}
                      onClick={() => switchCamera(index)}
                      disabled={!isPremium && index > 0}
                      className={`px-4 py-2 rounded font-medium text-sm transition-all ${
                        activeCamera === index
                          ? "bg-blue-600 text-white"
                          : cam.connected
                          ? "bg-gray-700 text-white hover:bg-gray-600"
                          : "bg-gray-800 text-gray-500"
                      } ${!isPremium && index > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Cam {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mic Controls */}
              <div>
                <h3 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Mic Volume</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMicMuted(!micMuted)}
                    className={`p-2 rounded transition-colors ${
                      micMuted ? "bg-red-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <Slider
                      value={[micMuted ? 0 : micVolume]}
                      onValueChange={(value) => setMicVolume(value[0])}
                      max={100}
                      step={1}
                      className="w-full"
                      disabled={micMuted}
                    />
                  </div>
                  <span className="text-white text-sm w-8">{micMuted ? 0 : micVolume}%</span>
                </div>
                {/* Volume bars visualization */}
                <div className="flex gap-0.5 mt-2 h-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-colors ${
                        !micMuted && i < (micVolume / 5)
                          ? i < 14 ? "bg-green-500" : i < 17 ? "bg-yellow-500" : "bg-red-500"
                          : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Speaker Controls */}
              <div>
                <h3 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Speaker</h3>
                <div className="flex items-center gap-3 mb-3">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <Slider
                    value={[speakerVolume]}
                    onValueChange={(value) => setSpeakerVolume(value[0])}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-white text-sm w-8">{speakerVolume}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 text-xs">Treble</span>
                    <Slider
                      value={[treble]}
                      onValueChange={(value) => setTreble(value[0])}
                      max={100}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Bass</span>
                    <Slider
                      value={[bass]}
                      onValueChange={(value) => setBass(value[0])}
                      max={100}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Video Transitions */}
              <div>
                <h3 className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Video Transition</h3>
                <div className="flex gap-2 mb-3">
                  {["cut", "fade", "crossfade"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTransitionType(type)}
                      disabled={!isPremium && type !== "cut"}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        transitionType === type
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      } ${!isPremium && type !== "cut" ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                {transitionType !== "cut" && (
                  <div>
                    <span className="text-gray-500 text-xs">Fade Speed</span>
                    <Slider
                      value={[fadeSpeed]}
                      onValueChange={(value) => setFadeSpeed(value[0])}
                      max={100}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6 pt-4 border-t border-gray-700">
              <Button
                onClick={handleStartStream}
                className={`flex-1 py-6 text-lg font-bold transition-all ${
                  isStreaming
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-6 h-6 mr-2" />
                    Stop Stream
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    Start Stream
                  </>
                )}
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 py-6 px-8"
              >
                <Settings className="w-6 h-6 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Camera Preview Sidebar */}
        <div className="w-64 bg-gray-900/50 border-l border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-gray-400 text-xs font-medium mb-4 uppercase tracking-wider">Camera Previews</h3>
          <div className="space-y-3">
            {cameras.slice(0, maxDevices).map((cam, index) => (
              <button
                key={cam.id}
                onClick={() => switchCamera(index)}
                disabled={!isPremium && index > 0}
                className={`w-full rounded-lg overflow-hidden transition-all ${
                  activeCamera === index
                    ? "ring-2 ring-blue-500"
                    : "hover:ring-2 hover:ring-gray-600"
                } ${!isPremium && index > 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="aspect-video bg-black flex items-center justify-center relative">
                  {cam.connected ? (
                    <>
                      <Radio className={`w-8 h-8 ${activeCamera === index ? "text-blue-500" : "text-gray-500"}`} />
                      {cam.device?.is_active && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </>
                  ) : (
                    <Monitor className="w-8 h-8 text-gray-700" />
                  )}
                </div>
                <div className="bg-gray-800 px-2 py-1">
                  <p className="text-white text-xs font-medium">Camera {index + 1}</p>
                  <p className={`text-xs ${cam.connected ? "text-green-400" : "text-gray-500"}`}>
                    {cam.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </button>
            ))}

            {/* Add Camera Button */}
            {streamDevices.length < maxDevices && (
              <button
                onClick={generateDevice}
                className="w-full aspect-video bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center hover:border-blue-500 transition-colors"
              >
                <Plus className="w-8 h-8 text-gray-500 mb-1" />
                <span className="text-gray-500 text-xs">Add Camera</span>
              </button>
            )}
          </div>

          {/* Package Info */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-xs">
              {isPremium ? "Premium" : "Free"} Package
            </p>
            <p className="text-white text-sm font-medium">
              {streamDevices.length}/{maxDevices} cameras
            </p>
            {!isPremium && (
              <Button
                onClick={() => navigate("/creator/create-event")}
                className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700 text-xs py-1"
              >
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-white text-2xl font-bold mb-4">Connect Camera Device</h3>
            <p className="text-gray-400 text-sm mb-4">
              Scan this QR code with your phone or tablet to use it as a camera
            </p>
            <div className="bg-white p-4 rounded-lg mb-4">
              <img src={showQR.qr_code} alt="Device QR" className="w-full" />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(showQR.device_url);
                  toast.success("Link copied!");
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Copy Link
              </Button>
              <Button
                onClick={() => setShowQR(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
