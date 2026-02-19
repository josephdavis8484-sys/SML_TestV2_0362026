import React, { useState, useEffect, useCallback } from "react";
import { axiosInstance } from "@/App";
import { toast } from "sonner";
import { Video, VideoOff, Volume2, VolumeX, Maximize, RefreshCw, Users } from "lucide-react";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useRoomContext,
  useTracks,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

// Video Player Component that shows the stream
const VideoPlayer = () => {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const participants = useParticipants();
  
  // Find the first video track from a publisher (creator)
  const videoTrack = tracks.find(
    (track) => 
      track.publication?.kind === "video" && 
      track.publication?.isSubscribed
  );

  const audioTracks = tracks.filter(
    (track) => track.publication?.kind === "audio"
  );

  if (!videoTrack) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Waiting for stream to start...</p>
          <p className="text-gray-500 text-sm mt-2">The creator will begin streaming shortly</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-sm">{participants.length} viewer(s) connected</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <VideoTrack
        trackRef={videoTrack}
        className="w-full h-full object-contain"
      />
      {/* Render audio tracks */}
      {audioTracks.map((track) => (
        <AudioTrack key={track.publication?.trackSid} trackRef={track} />
      ))}
      
      {/* Viewer count overlay */}
      <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2">
        <Users className="w-4 h-4 text-white" />
        <span className="text-white text-sm">{participants.length}</span>
      </div>
    </div>
  );
};

const LiveStreamViewer = ({ eventId, userId, userName }) => {
  const [connectionState, setConnectionState] = useState("disconnected");
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const connectToStream = useCallback(async () => {
    try {
      setError(null);
      setConnectionState("connecting");
      
      const response = await axiosInstance.post("/livekit/join-as-viewer", {
        event_id: eventId,
        user_id: userId,
        user_name: userName || "Viewer"
      });
      
      if (response.data.token && response.data.url) {
        setToken(response.data.token);
        setWsUrl(response.data.url);
        setConnectionState("connected");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Failed to connect to stream:", err);
      setError(err.response?.data?.detail || "Failed to connect to stream");
      setConnectionState("error");
      
      // Show specific error message
      if (err.response?.status === 400) {
        toast.error("LiveKit is not configured for this event");
      } else if (err.response?.status === 404) {
        toast.error("Event not found");
      } else {
        toast.error("Failed to connect to live stream");
      }
    }
  }, [eventId, userId, userName]);

  useEffect(() => {
    connectToStream();
  }, [connectToStream]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    connectToStream();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("stream-container");
    if (!document.fullscreenElement) {
      container?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (connectionState === "connecting") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg">Connecting to live stream...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (connectionState === "error" || error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <VideoOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Unable to connect to stream</p>
          <p className="text-gray-400 text-sm mb-4">{error || "Connection failed"}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Video className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Initializing stream viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="stream-container" className="relative w-full h-full bg-black group">
      <LiveKitRoom
        serverUrl={wsUrl}
        token={token}
        connect={true}
        video={false}
        audio={false}
        onDisconnected={() => {
          setConnectionState("disconnected");
          toast.info("Disconnected from stream");
        }}
        onError={(error) => {
          console.error("LiveKit error:", error);
          setError(error.message);
          setConnectionState("error");
        }}
      >
        <VideoPlayer />
      </LiveKitRoom>

      {/* Controls overlay - show on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full flex items-center gap-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span className="text-white text-sm font-bold">LIVE</span>
      </div>
    </div>
  );
};

export default LiveStreamViewer;
