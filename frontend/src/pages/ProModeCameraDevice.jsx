import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "@/App";
import { 
  Camera, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Wifi, 
  WifiOff,
  Radio,
  SwitchCamera,
  AlertCircle
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
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Camera Publisher Component
const CameraPublisher = ({ deviceNumber, isActive, onStatusChange }) => {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const [facingMode, setFacingMode] = useState('user');
  
  const cameraTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );

  // Sync microphone based on active status
  useEffect(() => {
    const syncMic = async () => {
      if (localParticipant) {
        try {
          // Only unmute mic if this device is active
          await localParticipant.setMicrophoneEnabled(isActive);
        } catch (error) {
          console.error("Error syncing mic:", error);
        }
      }
    };
    syncMic();
  }, [localParticipant, isActive]);

  // Enable camera on mount
  useEffect(() => {
    const enableCamera = async () => {
      if (localParticipant) {
        try {
          await localParticipant.setCameraEnabled(true, {
            resolution: { width: 1920, height: 1080, frameRate: 30 },
            facingMode: facingMode,
          });
          onStatusChange?.('camera_enabled');
        } catch (error) {
          console.error("Error enabling camera:", error);
          onStatusChange?.('camera_error');
        }
      }
    };
    enableCamera();
  }, [localParticipant, facingMode, onStatusChange]);

  const toggleCamera = async () => {
    if (localParticipant) {
      const newFacing = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacing);
      try {
        await localParticipant.setCameraEnabled(true, {
          resolution: { width: 1920, height: 1080, frameRate: 30 },
          facingMode: newFacing,
        });
        toast.success(`Switched to ${newFacing === 'user' ? 'front' : 'back'} camera`);
      } catch (error) {
        toast.error("Failed to switch camera");
      }
    }
  };

  return (
    <div className="w-full h-full bg-black relative">
      {cameraTrack ? (
        <VideoTrack 
          trackRef={cameraTrack} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Camera Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        <button
          onClick={toggleCamera}
          className="w-14 h-14 bg-gray-800/80 hover:bg-gray-700 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-bold">CAM {deviceNumber}</span>
          </div>
          
          {isActive && (
            <div className="bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-2 animate-pulse">
              <Radio className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold">LIVE</span>
            </div>
          )}
        </div>

        <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${isActive ? 'bg-green-600' : 'bg-gray-700'}`}>
          {isActive ? (
            <>
              <Mic className="w-4 h-4 text-white" />
              <span className="text-white text-xs">MIC ON</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-white" />
              <span className="text-white text-xs">MIC OFF</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Camera Device Page
const ProModeCameraDevice = ({ user }) => {
  const { eventId, deviceNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  
  const [event, setEvent] = useState(null);
  const [session, setSession] = useState(null);
  const [livekitToken, setLivekitToken] = useState(null);
  const [livekitUrl, setLivekitUrl] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const deviceNum = parseInt(deviceNumber);
  const connectionToken = searchParams.get("token");

  // Register device and get LiveKit token
  useEffect(() => {
    const registerDevice = async () => {
      try {
        if (!connectionToken) {
          setError("Missing connection token. Please scan the QR code from the Control Panel.");
          setLoading(false);
          return;
        }
        
        // Get event details (public endpoint)
        const eventRes = await axiosInstance.get(`/events/${eventId}`);
        setEvent(eventRes.data);

        // Register this device using public endpoint with token
        const registerRes = await axiosInstance.post("/pro-mode/device/register-public", {
          event_id: eventId,
          device_number: deviceNum,
          device_name: `Camera ${deviceNum}`,
          connection_token: connectionToken
        });

        setLivekitToken(registerRes.data.livekit_token);
        setLivekitUrl(registerRes.data.livekit_url);
        setSession(registerRes.data);
        setLoading(false);
      } catch (error) {
        console.error("Registration error:", error);
        setError(error.response?.data?.detail || "Failed to register device");
        setLoading(false);
      }
    };

    registerDevice();
  }, [eventId, deviceNum, connectionToken]);

  // WebSocket connection to receive commands from control panel
  useEffect(() => {
    if (!session) return;

    const wsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/pro-mode/device/${eventId}/${deviceNum}`;
    
    let pingInterval;
    
    const connectWs = () => {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        toast.success("Connected to Control Panel");
        
        // Keepalive ping
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
          
          if (data.type === "device_switch") {
            const deviceId = `${eventId}-device-${deviceNum}`;
            const nowActive = data.active_device_id === deviceId;
            setIsActive(nowActive);
            
            if (nowActive) {
              toast.success("You are now LIVE!", { duration: 3000 });
            } else if (data.previous_device_id === deviceId) {
              toast.info("Camera switched", { duration: 2000 });
            }
          }
          
          if (data.type === "go_live") {
            toast.success("Stream started!");
          }
          
          if (data.type === "audio_settings_update") {
            // Handle audio settings update
            console.log("Audio settings updated:", data.settings);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        clearInterval(pingInterval);
        // Reconnect after delay
        setTimeout(connectWs, 3000);
      };
      
      wsRef.current.onerror = () => {
        setIsConnected(false);
      };
    };

    connectWs();

    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [session, eventId, deviceNum]);

  const handleStatusChange = (status) => {
    console.log("Camera status:", status);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-lg">Connecting Camera {deviceNum}...</p>
          <p className="text-gray-400 text-sm mt-2">Please allow camera access when prompted</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Connection Failed</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Connection Status Bar */}
      <div className={`flex items-center justify-between px-4 py-2 ${isConnected ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected to Control Panel' : 'Reconnecting...'}
          </span>
        </div>
        <span className="text-white text-sm">{event?.title}</span>
      </div>

      {/* Camera View */}
      <div className="flex-1 min-h-0">
        {livekitToken && livekitUrl ? (
          <LiveKitRoom
            serverUrl={livekitUrl}
            token={livekitToken}
            connect={true}
            video={true}
            audio={true}
            options={{
              adaptiveStream: true,
              dynacast: true,
              disconnectOnPageLeave: false,
            }}
          >
            <CameraPublisher 
              deviceNumber={deviceNum}
              isActive={isActive}
              onStatusChange={handleStatusChange}
            />
          </LiveKitRoom>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info */}
      <div className="bg-gray-900 px-4 py-3 text-center">
        <p className="text-gray-400 text-sm">
          Keep this page open while streaming. The control panel will manage your camera.
        </p>
      </div>
    </div>
  );
};

export default ProModeCameraDevice;
