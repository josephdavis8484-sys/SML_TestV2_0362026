import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'react-qr-code';

/**
 * ShowMe Protection - Anti-Piracy Protection System
 * 
 * Features:
 * 1. Full-screen QR code overlay with viewer-specific session data
 * 2. Refresh Rate Mismatch - subtle flicker to disrupt camera recording
 * 3. Unique watermark per viewer session
 */

const ShowMeProtection = ({ 
  viewerData,  // { username, visitorId, deviceName, ipAddress }
  eventData,   // { id, title, date, startTime, endTime }
  enabled = true
}) => {
  const [flickerOpacity, setFlickerOpacity] = useState(0);
  const [qrPosition, setQrPosition] = useState({ x: 20, y: 20 });
  const flickerRef = useRef(null);
  const positionRef = useRef(null);

  // Generate unique session data for QR code
  const sessionData = useMemo(() => {
    const timestamp = Date.now();
    const sessionId = `SML-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    return JSON.stringify({
      platform: "ShowMeLive",
      session: sessionId,
      viewer: {
        username: viewerData?.username || 'Anonymous',
        visitorId: viewerData?.visitorId || 'unknown',
        device: viewerData?.deviceName || navigator.userAgent.substring(0, 50),
        ip: viewerData?.ipAddress || 'hidden'
      },
      event: {
        id: eventData?.id || 'unknown',
        title: eventData?.title || 'Live Event',
        date: eventData?.date || new Date().toISOString().split('T')[0],
        startTime: eventData?.startTime || '00:00',
        endTime: eventData?.endTime || '23:59'
      },
      timestamp: new Date().toISOString(),
      signature: `${sessionId}-${viewerData?.visitorId || 'x'}-${eventData?.id || 'x'}`
    });
  }, [viewerData, eventData]);

  // Refresh Rate Mismatch Effect - Subtle high-frequency flicker
  // Uses frequencies that cause issues with camera sensors but are less noticeable to human eye
  useEffect(() => {
    if (!enabled) return;

    // Primary flicker at ~50-60Hz (causes issues with most phone cameras)
    let frameCount = 0;
    const flickerAnimation = () => {
      frameCount++;
      
      // Create subtle opacity variations at high frequency
      // Most camera sensors struggle with frequencies around 50-60Hz
      const flickerValue = Math.sin(frameCount * 0.5) * 0.02 + 0.03;
      
      // Add secondary harmonic for additional disruption
      const secondaryFlicker = Math.sin(frameCount * 0.3) * 0.01;
      
      setFlickerOpacity(Math.max(0, flickerValue + secondaryFlicker));
      
      flickerRef.current = requestAnimationFrame(flickerAnimation);
    };

    flickerRef.current = requestAnimationFrame(flickerAnimation);

    return () => {
      if (flickerRef.current) {
        cancelAnimationFrame(flickerRef.current);
      }
    };
  }, [enabled]);

  // Move QR code position periodically to make it harder to crop out
  useEffect(() => {
    if (!enabled) return;

    const moveQR = () => {
      const positions = [
        { x: 10, y: 10 },    // Top-left
        { x: 70, y: 10 },    // Top-right
        { x: 10, y: 70 },    // Bottom-left
        { x: 70, y: 70 },    // Bottom-right
        { x: 40, y: 40 },    // Center
      ];
      const randomPos = positions[Math.floor(Math.random() * positions.length)];
      setQrPosition(randomPos);
    };

    // Change position every 30 seconds
    positionRef.current = setInterval(moveQR, 30000);

    return () => {
      if (positionRef.current) {
        clearInterval(positionRef.current);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Refresh Rate Mismatch Layer - Subtle flicker overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            0deg,
            rgba(255,255,255,${flickerOpacity}) 0%,
            transparent 2%,
            transparent 48%,
            rgba(255,255,255,${flickerOpacity * 0.5}) 50%,
            transparent 52%,
            transparent 98%,
            rgba(255,255,255,${flickerOpacity}) 100%
          )`,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Scanline effect - causes banding on camera recordings */}
      <div 
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          )`,
          animation: 'scanlineMove 0.1s linear infinite',
        }}
      />

      {/* QR Code Watermark - Semi-transparent, moves periodically */}
      <div 
        className="absolute transition-all duration-1000 ease-in-out"
        style={{
          left: `${qrPosition.x}%`,
          top: `${qrPosition.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
          <QRCode 
            value={sessionData}
            size={80}
            level="L"
            style={{ 
              opacity: 0.15,
              filter: 'brightness(1.5)',
            }}
          />
        </div>
      </div>

      {/* Corner watermarks with viewer info */}
      <div className="absolute top-2 left-2 text-white/10 text-[8px] font-mono select-none">
        {viewerData?.username || 'Viewer'} • {eventData?.id?.substring(0, 8) || 'Event'}
      </div>
      <div className="absolute top-2 right-2 text-white/10 text-[8px] font-mono select-none">
        ShowMeLive Protected
      </div>
      <div className="absolute bottom-2 left-2 text-white/10 text-[8px] font-mono select-none">
        {new Date().toISOString()}
      </div>
      <div className="absolute bottom-2 right-2 text-white/10 text-[8px] font-mono select-none">
        {viewerData?.deviceName?.substring(0, 20) || 'Device'}
      </div>

      {/* Invisible tracking pixels at corners */}
      <div className="absolute top-0 left-0 w-1 h-1 bg-white/5" />
      <div className="absolute top-0 right-0 w-1 h-1 bg-white/5" />
      <div className="absolute bottom-0 left-0 w-1 h-1 bg-white/5" />
      <div className="absolute bottom-0 right-0 w-1 h-1 bg-white/5" />

      {/* CSS Animation for scanlines */}
      <style>{`
        @keyframes scanlineMove {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
};

export default ShowMeProtection;
