import React, { useState, useEffect, useRef, useCallback } from "react";
import { axiosInstance } from "@/App";
import { toast } from "sonner";
import { 
  Video, 
  VideoOff, 
  RefreshCw, 
  Users, 
  Share2,
  X,
  ArrowLeft,
  Cast,
  Settings,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import ScreenProtectionOverlay, { ProtectedContent } from "@/components/ScreenProtectionOverlay";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Pro Mode Stage - Only shows the active camera selected by the control panel
const ProModeStage = ({ eventId }) => {
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [activeParticipantIdentity, setActiveParticipantIdentity] = useState(null);
  
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Fetch active device from backend periodically
  useEffect(() => {
    const fetchActiveDevice = async () => {
      try {
        const response = await axiosInstance.get(`/pro-mode/session/${eventId}`);
        const session = response.data;
        if (session.active_device_id) {
          setActiveDeviceId(session.active_device_id);
          // Extract device number from device_id (format: eventId-device-X)
          const deviceNumber = session.active_device_id.split('-device-')[1];
          if (deviceNumber) {
            setActiveParticipantIdentity(`Camera-${deviceNumber}`);
          }
        }
      } catch (error) {
        // Session might not exist for non-pro-mode events
        console.log('Pro Mode session not found, showing all tracks');
      }
    };

    fetchActiveDevice();
    // Poll for active device changes every 2 seconds
    const interval = setInterval(fetchActiveDevice, 2000);
    return () => clearInterval(interval);
  }, [eventId]);

  const remoteTracks = tracks.filter((track) => !track.participant.isLocal);
  
  // Filter to only show the active camera's video
  let videoTracks = remoteTracks.filter((t) => 
    t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare
  );
  
  // If we have an active participant identity, filter to only that camera
  if (activeParticipantIdentity) {
    const activeTrack = videoTracks.find((t) => 
      t.participant.identity === activeParticipantIdentity
    );
    if (activeTrack) {
      videoTracks = [activeTrack];
    }
  }

  return (
    <div className="w-full h-full">
      <RoomAudioRenderer />
      
      {videoTracks.length > 0 ? (
        <GridLayout tracks={videoTracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Waiting for creator to start streaming...</p>
            {activeParticipantIdentity && (
              <p className="text-gray-500 text-sm mt-2">Active camera: {activeParticipantIdentity}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Stage component that renders all remote video/audio (for regular events)
const Stage = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const remoteTracks = tracks.filter((track) => !track.participant.isLocal);
  const videoTracks = remoteTracks.filter((t) => t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare);

  return (
    <div className="w-full h-full">
      <RoomAudioRenderer />
      
      {videoTracks.length > 0 ? (
        <GridLayout tracks={videoTracks} style={{ height: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Waiting for creator to start streaming...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Share Modal
const ShareModal = ({ isOpen, onClose, eventTitle, eventUrl }) => {
  if (!isOpen) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Link copied!");
    onClose();
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
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watch ${eventTitle} live!`)}&url=${encodeURIComponent(eventUrl)}`} 
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">𝕏</span>
            <span>Twitter</span>
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Watch ${eventTitle} live! ${eventUrl}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-gray-800 hover:bg-gray-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center">📱</span>
            <span>WhatsApp</span>
          </a>
          <button onClick={copyLink} className="flex items-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg">
            <span className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">🔗</span>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Overlay with LIVE badge
const StreamOverlay = ({ streamTime, onShare, viewerCount }) => {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className="absolute top-3 left-12 flex items-center gap-2 z-10">
        <div className="bg-red-600 px-2.5 py-1 rounded flex items-center gap-1.5">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white font-bold text-xs">LIVE</span>
        </div>
        <div className="bg-black/60 px-2 py-1 rounded flex items-center gap-1.5">
          <Users className="w-3 h-3 text-white" />
          <span className="text-white font-medium text-xs">{viewerCount}</span>
        </div>
      </div>
      
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <div className="bg-black/60 px-2 py-1 rounded">
          <span className="text-white font-mono text-xs">{formatTime(streamTime)}</span>
        </div>
        <button onClick={onShare} className="bg-black/60 hover:bg-black/80 px-2 py-1 rounded flex items-center gap-1">
          <Share2 className="w-3 h-3 text-white" />
          <span className="text-white text-xs">Share</span>
        </button>
      </div>
    </>
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
  const [chatConnected, setChatConnected] = useState(false);
  const [videoQuality, setVideoQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const chatWsRef = useRef(null);

  // Screen protection hook
  const {
    isProtected,
    showWarning,
    warningMessage,
    canContinue,
    violationCount,
    dismissWarning
  } = useScreenProtection(eventId, userId);

  // Check security status on mount
  useEffect(() => {
    const checkSecurityStatus = async () => {
      try {
        const response = await axiosInstance.get('/security/check-status');
        if (!response.data.can_access) {
          toast.error(response.data.message);
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        // Continue if check fails - don't block
        console.warn('Security check failed:', err);
      }
    };
    checkSecurityStatus();
  }, [navigate]);

  // Cast to TV function
  const handleCastToTV = async () => {
    if ('presentation' in navigator && 'PresentationRequest' in window) {
      try {
        const presentationRequest = new window.PresentationRequest([window.location.href]);
        const connection = await presentationRequest.start();
        toast.success("Connected to display!");
        connection.onclose = () => toast.info("Cast disconnected");
      } catch (err) {
        if (err.name === 'NotFoundError') {
          toast.error("No cast devices found");
        } else {
          toast.error("Cast not available");
        }
      }
    } else if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
      // Fallback: Try Chrome Cast API
      toast.info("Use your browser's built-in Cast feature (⋮ menu → Cast)");
    } else {
      toast.error("Cast not supported on this browser");
    }
  };

  // Stream timer
  useEffect(() => {
    const timer = setInterval(() => setStreamTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get LiveKit token
  useEffect(() => {
    const getToken = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.post("/livekit/join-as-viewer", {
          event_id: eventId,
          user_id: userId,
          user_name: userName || "Viewer"
        });
        
        if (response.data.token && response.data.url) {
          setToken(response.data.token);
          setWsUrl(response.data.url);
        } else {
          throw new Error("Invalid response");
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to connect");
      } finally {
        setLoading(false);
      }
    };
    getToken();
  }, [eventId, userId, userName]);

  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 15;
  const messageQueueRef = useRef([]);
  const isConnectingRef = useRef(false);
  const pingIntervalRef = useRef(null);

  // Process queued messages when connection is restored
  const processMessageQueue = useCallback(() => {
    if (chatWsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      queue.forEach(msg => {
        try {
          chatWsRef.current.send(JSON.stringify(msg));
        } catch (e) {
          messageQueueRef.current.push(msg); // Re-queue on failure
        }
      });
    }
  }, []);

  // Chat WebSocket - Robust connection with auto-reconnect
  const connectChatWebSocket = useCallback(() => {
    if (!eventId) return;
    if (isConnectingRef.current) return; // Prevent multiple simultaneous connections
    
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (!(chatEnabled || reactionsEnabled)) return;
    
    // Build WebSocket URL
    let chatWsUrl = BACKEND_URL;
    if (!chatWsUrl) return;
    
    chatWsUrl = chatWsUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    chatWsUrl = `${chatWsUrl}/api/ws/chat/${eventId}`;
    
    // Close existing connection cleanly
    if (chatWsRef.current) {
      if (chatWsRef.current.readyState === WebSocket.OPEN || 
          chatWsRef.current.readyState === WebSocket.CONNECTING) {
        chatWsRef.current.close(1000, 'Reconnecting');
      }
    }
    
    isConnectingRef.current = true;
    
    try {
      const ws = new WebSocket(chatWsUrl);
      
      ws.onopen = () => {
        isConnectingRef.current = false;
        setChatConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Only show toast on first connection or after extended disconnect
        if (reconnectAttemptsRef.current === 0) {
          toast.success("Chat connected!");
        }
        
        // Process any queued messages
        processMessageQueue();
        
        // Setup ping interval
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 10000); // Ping every 10 seconds for more aggressive keepalive
      };
      
      ws.onmessage = (wsEvent) => {
        if (wsEvent.data === "pong") return;
        // Viewers don't need to process messages per design spec
      };
      
      ws.onclose = (closeEvent) => {
        isConnectingRef.current = false;
        setChatConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Auto-reconnect unless it was a clean close or max retries reached
        if (closeEvent.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(500 * Math.pow(1.3, reconnectAttemptsRef.current), 5000);
          reconnectAttemptsRef.current += 1;
          setTimeout(connectChatWebSocket, delay);
        }
      };
      
      ws.onerror = () => {
        isConnectingRef.current = false;
      };
      
      chatWsRef.current = ws;
    } catch (err) {
      isConnectingRef.current = false;
    }
  }, [eventId, event?.chat_enabled, event?.reactions_enabled, processMessageQueue]);
  
  // Connect WebSocket when event loads
  useEffect(() => {
    const chatEnabled = event?.chat_enabled;
    const reactionsEnabled = event?.reactions_enabled;
    
    if (eventId && (chatEnabled || reactionsEnabled)) {
      connectChatWebSocket();
    }
    
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (chatWsRef.current) {
        chatWsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [eventId, event?.chat_enabled, event?.reactions_enabled, connectChatWebSocket]);

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    
    const msg = { 
      type: "message", 
      username: userName || "Viewer", 
      message: chatMessage.trim() 
    };
    
    // Try to send immediately if connected
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        chatWsRef.current.send(JSON.stringify(msg));
        setChatMessage("");
        toast.success("Message sent!");
      } catch (e) {
        // Queue message for retry
        messageQueueRef.current.push(msg);
        toast.error("Message queued, sending when connected...");
      }
    } else {
      // Queue message and trigger reconnect
      messageQueueRef.current.push(msg);
      toast.info("Connecting... message will send automatically");
      connectChatWebSocket();
    }
  };

  const handleSendReaction = (emoji) => {
    const msg = { 
      type: "reaction", 
      emoji, 
      username: userName || "Viewer" 
    };
    
    if (chatWsRef.current?.readyState === WebSocket.OPEN) {
      try {
        chatWsRef.current.send(JSON.stringify(msg));
        toast.success(`${emoji} sent!`);
      } catch (e) {
        messageQueueRef.current.push(msg);
      }
    } else {
      messageQueueRef.current.push(msg);
      connectChatWebSocket();
    }
  };

  const chatEnabled = event?.chat_enabled;
  const reactionsEnabled = event?.reactions_enabled;
  const showInteraction = chatEnabled || reactionsEnabled;

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !token || !wsUrl) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <VideoOff className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-white mb-2">Unable to connect</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden">
      {/* Screen Protection Overlay */}
      <ScreenProtectionOverlay
        showWarning={showWarning}
        warningMessage={warningMessage}
        canContinue={canContinue}
        violationCount={violationCount}
        onDismiss={dismissWarning}
        isProtected={false}
      />
      
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="absolute top-3 left-3 z-20 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full">
        <ArrowLeft className="w-5 h-5" />
      </button>
      
      {/* Security Badge */}
      {violationCount > 0 && (
        <div className="absolute top-3 left-14 z-20 bg-yellow-500/80 text-black text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>{violationCount} warning{violationCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Protected Video Area - adjusted height when chat is shown */}
      <ProtectedContent 
        isProtected={isProtected} 
        showWarning={showWarning} 
        className={`relative ${showInteraction ? 'h-[calc(100vh-80px)]' : 'flex-1'}`}
      >
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={false}
          video={false}
          options={{
            adaptiveStream: {
              pixel: true,
            },
            dynacast: true,
            disconnectOnPageLeave: false,
            reconnectPolicy: {
              nextRetryDelayInMs: (ctx) => {
                return Math.min(1000 * Math.pow(2, ctx.retryCount), 10000);
              },
              maxRetries: 10
            }
          }}
          data-lk-theme="default"
          style={{ height: '100%' }}
        >
          <Stage />
          <StreamOverlay streamTime={streamTime} onShare={() => setShowShareModal(true)} viewerCount={1} />
        </LiveKitRoom>
      </ProtectedContent>

      {/* Chat/Reactions Bar - Fixed at bottom, always visible when enabled */}
      {showInteraction && (
        <div className="h-[80px] bg-gray-900 border-t border-gray-800 p-3 flex-shrink-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto h-full">
            {chatEnabled && (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder={chatConnected ? "Send a message..." : "Connecting to chat..."}
                  disabled={!chatConnected}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 disabled:opacity-50"
                />
                <button 
                  onClick={handleSendChat} 
                  disabled={!chatMessage.trim() || !chatConnected} 
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg text-sm font-medium"
                >
                  Send
                </button>
              </div>
            )}
            {reactionsEnabled && (
              <div className="flex gap-2">
                {["👏", "😂", "❤️", "🔥", "😍"].map((emoji) => (
                  <button 
                    key={emoji} 
                    onClick={() => handleSendReaction(emoji)} 
                    disabled={!chatConnected}
                    className="w-12 h-12 bg-gray-800 hover:bg-gray-700 hover:scale-110 disabled:opacity-50 rounded-lg text-2xl transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            
            {/* Quality Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white"
                title="Video Quality"
              >
                <Settings className="w-4 h-4" />
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-[100px]">
                  {['auto', '1080p', '720p', '480p'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setVideoQuality(q); setShowQualityMenu(false); toast.success(`Quality: ${q.toUpperCase()}`); }}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 ${videoQuality === q ? 'text-blue-400' : 'text-white'}`}
                    >
                      {q === 'auto' ? 'Auto' : q}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cast to TV Button */}
            <button 
              onClick={handleCastToTV}
              className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-white"
              title="Cast to TV"
            >
              <Cast className="w-4 h-4" />
            </button>
          </div>
          {/* Connection status indicator */}
          <div className="text-center mt-2">
            <span className={`text-xs ${chatConnected ? 'text-green-400' : 'text-yellow-400'}`}>
              {chatConnected ? '● Chat connected' : '○ Connecting to chat...'}
            </span>
          </div>
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} eventTitle={event?.title || "Live Stream"} eventUrl={`${window.location.origin}/event/${eventId}`} />
    </div>
  );
};

export default LiveStreamViewer;
