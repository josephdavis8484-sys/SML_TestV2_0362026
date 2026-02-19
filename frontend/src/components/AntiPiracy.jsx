import React, { useEffect, useCallback } from "react";

/**
 * AntiPiracy component that adds protection against screen recording and screenshots
 * Note: These are deterrents and cannot fully prevent determined users
 */
const AntiPiracy = ({ children, enabled = true }) => {
  // Disable right-click context menu
  const handleContextMenu = useCallback((e) => {
    if (enabled) {
      e.preventDefault();
      return false;
    }
  }, [enabled]);

  // Disable keyboard shortcuts for screenshots
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    // Windows: PrintScreen, Alt+PrintScreen
    // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
    // Common: Ctrl+P (print), Ctrl+S (save)
    
    const blockedKeys = [
      // PrintScreen
      { key: 'PrintScreen' },
      // Mac screenshot shortcuts
      { key: '3', metaKey: true, shiftKey: true },
      { key: '4', metaKey: true, shiftKey: true },
      { key: '5', metaKey: true, shiftKey: true },
      // Ctrl shortcuts
      { key: 'p', ctrlKey: true },
      { key: 's', ctrlKey: true },
      { key: 'u', ctrlKey: true }, // View source
      // Dev tools
      { key: 'F12' },
      { key: 'i', ctrlKey: true, shiftKey: true },
      { key: 'j', ctrlKey: true, shiftKey: true },
      { key: 'c', ctrlKey: true, shiftKey: true },
    ];

    for (const blocked of blockedKeys) {
      let match = true;
      
      if (blocked.key && e.key !== blocked.key && e.key.toLowerCase() !== blocked.key.toLowerCase()) {
        match = false;
      }
      if (blocked.ctrlKey !== undefined && e.ctrlKey !== blocked.ctrlKey) {
        match = false;
      }
      if (blocked.metaKey !== undefined && e.metaKey !== blocked.metaKey) {
        match = false;
      }
      if (blocked.shiftKey !== undefined && e.shiftKey !== blocked.shiftKey) {
        match = false;
      }
      
      if (match && blocked.key) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  }, [enabled]);

  // Detect visibility change (potential screen recording indicator)
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    
    if (document.visibilityState === 'hidden') {
      // User switched tabs - could be starting screen recording
      console.log('Tab hidden - monitoring for screen recording');
    }
  }, [enabled]);

  // Detect if DevTools is open
  const detectDevTools = useCallback(() => {
    if (!enabled) return;

    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      console.warn('DevTools may be open');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Check for DevTools periodically
    const devToolsInterval = setInterval(detectDevTools, 1000);

    // Disable text selection on protected content
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    // Disable drag on images
    const handleDragStart = (e) => {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
      }
    };
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('dragstart', handleDragStart);
      clearInterval(devToolsInterval);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [enabled, handleContextMenu, handleKeyDown, handleVisibilityChange, detectDevTools]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div 
      className="anti-piracy-wrapper"
      style={{
        // Prevent selection
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        // Prevent touch callout on iOS
        WebkitTouchCallout: 'none',
      }}
    >
      {children}
      
      {/* CSS to add additional protections */}
      <style>{`
        .anti-piracy-wrapper img,
        .anti-piracy-wrapper video {
          pointer-events: none;
          -webkit-user-drag: none;
          user-drag: none;
        }
        
        .anti-piracy-wrapper video::-webkit-media-controls-enclosure {
          overflow: hidden;
        }
        
        .anti-piracy-wrapper video::-webkit-media-controls-panel {
          width: calc(100% + 30px);
        }
        
        /* Hide download button in video controls */
        .anti-piracy-wrapper video::-webkit-media-controls-download-button {
          display: none !important;
        }
        
        .anti-piracy-wrapper video::-webkit-media-controls-fullscreen-button {
          display: none !important;
        }
        
        /* Prevent text selection */
        .anti-piracy-wrapper * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        /* Allow selection in input fields */
        .anti-piracy-wrapper input,
        .anti-piracy-wrapper textarea {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `}</style>
    </div>
  );
};

export default AntiPiracy;
