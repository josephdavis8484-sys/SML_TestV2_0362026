import React, { useState, useEffect, useCallback, useRef } from "react";
import { axiosInstance } from "@/App";
import { toast } from "sonner";
import { 
  Video, 
  VideoOff, 
  RefreshCw, 
  Users, 
  Share2,
  Send,
  X,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useTracks,
  useParticipants,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState } from "livekit-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Video Player Component inside LiveKitRoom
const VideoPlayer = ({ streamTime, onShare }) => {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare, Track.Source.Microphone]);
  const participants = useParticipants();
  const connectionState = useConnectionState();
  
  // Find video track from remote participant (creator)
  const videoTrack = tracks.find(
    (track) => 
      !track.participant.isLocal && 
      track.publication?.kind === "video" && 
      track.publication?.isSubscribed
  );

  // Find audio tracks from remote participant
  const audioTracks = tracks.filter(
    (track) => 
      !track.participant.isLocal && 
      track.publication?.kind === "audio" && 
      track.publication?.isSubscribed
  );

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show connecting state
  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-white">Connecting to stream...</p>
        </div>
      </div>
    );
  }

  // Show waiting for video
  if (!videoTrack) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-xl relative">
        <div className="text-center">
          <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Waiting for creator to start streaming...</p>
          <p className="text-gray-500 text-sm mt-1">{participants.length} viewer(s) connected</p>
        </div>
        
        {/* Live indicator even without video */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="bg-yellow-600 px-2.5 py-1 rounded flex items-center gap-1.5">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-white font-bold text-xs">WAITING</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      <VideoTrack
        trackRef={videoTrack}
        className="w-full h-full object-contain"
      />
      
      {/* Render audio tracks */}
      {audioTracks.map((track) => (
        <AudioTrack key={track.publication?.trackSid} trackRef={track} />
      ))}
      
      {/* Live indicator - Top Left */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="bg-red-600 px-2.5 py-1 rounded flex items-center gap-1.5">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-xs">LIVE</span>
        </div>
        <div className="bg-black/60 px-2 py-1 rounded flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{participants.length}</span>
        </div>
      </div>
      
      {/* Stream time and Share - Top Right */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <div className="bg-black/60 px-2 py-1 rounded">
          <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
        </div>
        <button
          onClick={onShare}
          className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded flex items-center gap-1 transition-colors"
        >
          <Share2 className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Share</span>
        </button>
      </div>
    </div>
  );
};

// Share Modal Component
const ShareModal = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const shareLinks = [
    { name: "X (Twitter)", icon: "𝕏", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch ${eventTitle} live!`)}&url=${encodeURIComponent(eventUrl)}` },
    { name: "Facebook", icon: "f", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}` },
    { name: "WhatsApp", icon: "📱", url: `https://wa.me/?text=${encodeURIComponent(`Watch ${eventTitle} live! ${eventUrl}`)}` }
  ];

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied!");
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Share Stream</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {shareLinks.map((link) => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-lg transition-colors">
              <span className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-sm">{link.icon}</span>
              <span className="text-sm">{link.name}</span>
            </a>
          ))}
          <button onClick={copyLink} className="flex items-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg transition-colors">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-sm">🔗</span>
            <span className="text-sm">Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const LiveStreamViewer = ({ eventId, userId, userName, event }) => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [wsUrl, setWsUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamTime, setStreamTime] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatWsRef = useRef(null);
  const streamTimerRef = useRef(null);

  // Stream timer
  useEffect(() => {
    streamTimerRef.current = setInterval(() => {
      setStreamTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // Get LiveKit token
  useEffect(() => {
    const getToken = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosInstance.post("/livekit/join-as-viewer", {
          event_id: eventId,
          user_id: userId,
          user_name: userName || "Viewer"
        });
        
        if (response.data.token && response.data.url) {
          setToken(response.data.token);
          setWsUrl(response.data.url);
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("Failed to get token:", err);
        setError(err.response?.data?.detail || "Failed to connect to stream");
      } finally {
        setLoading(false);
      }
    };

    getToken();
  }, [eventId, userId, userName]);

  // Connect to chat WebSocket
  useEffect(() => {
    if (eventId && token) {
      const chatWsUrl = `${BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/api/ws/chat/${eventId}`;
      
      try {
        chatWsRef.current = new WebSocket(chatWsUrl);
        chatWsRef.current.onopen = () => console.log("Chat connected");
        chatWsRef.current.onclose = () => console.log("Chat disconnected");
        chatWsRef.current.onerror = (err) => console.error("Chat error:", err);
      } catch (error) {
        console.error("Failed to connect chat:", error);
      }
    }

    return () => {
      if (chatWsRef.current) {
        chatWsRef.current.close();
      }
    };
  }, [eventId, token]);

  const handleBack = () => navigate(-1);
  const handleShare = () => setShowShareModal(true);

  const handleSendChat = () => {
    if (chatMessage.trim() && chatWsRef.current?.readyState === WebSocket.OPEN) {
      chatWsRef.current.send(JSON.stringify({
        type: "message",
        username: userName || "Viewer",
        message: chatMessage.trim()
      }));
      toast.success("Message sent!");
      setChatMessage("");
    }
  };

  const handleSendReaction = (emoji) => {
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      chatWsRef.current.send(JSON.stringify({
        type: "reaction",
        emoji: emoji,
        username: userName || "Viewer"
      }));
      toast.success(`${emoji} sent!`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const chatEnabled = event?.chat_enabled;
  const reactionsEnabled = event?.reactions_enabled;
  const showInteraction = chatEnabled || reactionsEnabled;
  const reactionEmojis = ["👍", "😄", "❤️", "👏"];

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-white">Connecting to live stream...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <VideoOff className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white mb-2">Unable to connect</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 mx-auto text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No token state
  if (!token || !wsUrl) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Video className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">Initializing stream...</p>
        </div>
      </div>
    );
  }

  const eventUrl = `${window.location.origin}/event/${eventId}`;

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <button onClick={handleBack} className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Video Player Area */}
      <div className="flex-1 p-3 min-h-0">
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={true}
          video={false}
        >
          <VideoPlayer streamTime={streamTime} onShare={handleShare} />
        </LiveKitRoom>
      </div>

      {/* Bottom Control Bar */}
      {showInteraction && (
        <div className="bg-gray-900 border-t border-gray-800 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            {chatEnabled && (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send a message..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Send
                </button>
              </div>
            )}
            {reactionsEnabled && (
              <div className="flex gap-1.5">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-xl transition-all hover:scale-105"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        eventTitle={event?.title || "Live Stream"}
        eventUrl={eventUrl}
      />
    </div>
  );
};

export default LiveStreamViewer;
