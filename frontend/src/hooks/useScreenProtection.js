import { useState, useEffect, useCallback, useRef } from 'react';
import { axiosInstance } from '@/App';

// Detect OS
const getOS = () => {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
  
  if (macosPlatforms.indexOf(platform) !== -1) return 'macos';
  if (iosPlatforms.indexOf(platform) !== -1) return 'ios';
  if (windowsPlatforms.indexOf(platform) !== -1) return 'windows';
  if (/Android/.test(userAgent)) return 'android';
  if (/Linux/.test(platform)) return 'linux';
  return 'unknown';
};

// Get browser info
const getBrowser = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Safari')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';
  if (userAgent.includes('Opera')) return 'opera';
  return 'unknown';
};

// Generate device ID (persistent per browser)
const getDeviceId = () => {
  let deviceId = localStorage.getItem('showmelive_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('showmelive_device_id', deviceId);
  }
  return deviceId;
};

export const useScreenProtection = (eventId, sessionId = null) => {
  const [isProtected, setIsProtected] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [captureDetected, setCaptureDetected] = useState(false);
  const [canContinue, setCanContinue] = useState(true);
  const [violationCount, setViolationCount] = useState(0);
  
  const lastVisibilityState = useRef('visible');
  const keySequence = useRef([]);
  const reportingRef = useRef(false);

  // Report capture attempt to backend
  const reportCapture = useCallback(async (captureType, details = null) => {
    if (reportingRef.current) return; // Prevent duplicate reports
    reportingRef.current = true;
    
    try {
      const response = await axiosInstance.post('/security/report-capture', {
        event_id: eventId,
        capture_type: captureType,
        device_id: getDeviceId(),
        session_id: sessionId,
        os: getOS(),
        browser: getBrowser(),
        app_version: '1.0.0',
        details
      });
      
      setViolationCount(response.data.violation_count || 0);
      setWarningMessage(response.data.message);
      setCanContinue(response.data.can_continue);
      setShowWarning(true);
      setCaptureDetected(true);
      
      // If cannot continue, keep protection on permanently
      if (!response.data.can_continue) {
        setIsProtected(true);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to report capture:', error);
      // Still show local warning even if reporting fails
      setWarningMessage('Screen capture is not allowed on ShowMeLive.');
      setShowWarning(true);
      setCaptureDetected(true);
    } finally {
      setTimeout(() => {
        reportingRef.current = false;
      }, 1000);
    }
  }, [eventId, sessionId]);

  // Detect keyboard shortcuts for screenshots
  const detectScreenshotKeys = useCallback((e) => {
    // Track key sequence
    keySequence.current.push(e.key);
    if (keySequence.current.length > 5) {
      keySequence.current.shift();
    }
    
    const os = getOS();
    let detected = false;
    let details = '';
    
    // Windows: Print Screen, Win+Shift+S, Win+PrintScreen
    if (os === 'windows') {
      if (e.key === 'PrintScreen') {
        detected = true;
        details = 'PrintScreen key pressed';
      }
      if ((e.metaKey || e.key === 'Meta') && e.shiftKey && e.key.toLowerCase() === 's') {
        detected = true;
        details = 'Win+Shift+S pressed';
      }
    }
    
    // macOS: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
    if (os === 'macos') {
      if (e.metaKey && e.shiftKey) {
        if (['3', '4', '5'].includes(e.key)) {
          detected = true;
          details = `Cmd+Shift+${e.key} pressed`;
        }
      }
      // Cmd+Ctrl+Shift+3/4 (copy to clipboard)
      if (e.metaKey && e.ctrlKey && e.shiftKey) {
        if (['3', '4'].includes(e.key)) {
          detected = true;
          details = `Cmd+Ctrl+Shift+${e.key} pressed`;
        }
      }
    }
    
    // iOS: Power+Volume (can't detect, but visibility change can)
    // Android: Power+Volume Down (can't detect directly)
    
    if (detected) {
      e.preventDefault();
      setIsProtected(true);
      reportCapture('screenshot', details);
    }
  }, [reportCapture]);

  // Detect visibility changes (tab switch, screen recording start)
  const handleVisibilityChange = useCallback(() => {
    const currentState = document.visibilityState;
    
    if (currentState === 'hidden') {
      // User switched away - could be screen recording starting
      setIsProtected(true);
      
      // Only report if was previously visible (not on initial load)
      if (lastVisibilityState.current === 'visible') {
        // Don't immediately report - could be innocent tab switch
        // But protect the content
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            // Still hidden after delay - more suspicious
            reportCapture('visibility_hidden', 'Tab hidden for extended period');
          }
        }, 2000);
      }
    } else if (currentState === 'visible') {
      // Tab became visible again
      if (!captureDetected || canContinue) {
        // Allow content to show again if user hasn't exceeded violations
        setTimeout(() => {
          if (canContinue) {
            setIsProtected(false);
            setShowWarning(false);
          }
        }, 500);
      }
    }
    
    lastVisibilityState.current = currentState;
  }, [captureDetected, canContinue, reportCapture]);

  // Detect screen capture API (some browsers)
  const detectScreenCapture = useCallback(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      // Override getDisplayMedia to detect screen sharing attempts
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      
      navigator.mediaDevices.getDisplayMedia = async function(constraints) {
        setIsProtected(true);
        reportCapture('screen_share', 'getDisplayMedia called');
        
        // Still allow the call but protect content
        return originalGetDisplayMedia(constraints);
      };
    }
  }, [reportCapture]);

  // CSS-based protection
  useEffect(() => {
    // Add CSS to prevent easy screenshots
    const style = document.createElement('style');
    style.id = 'screen-protection-css';
    style.textContent = `
      .screen-protected {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      
      /* Hide content in print */
      @media print {
        .screen-protected-content {
          display: none !important;
        }
        body::before {
          content: "Printing is disabled for protected content.";
          display: block;
          font-size: 24px;
          text-align: center;
          padding: 100px;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById('screen-protection-css');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Keyboard detection
    document.addEventListener('keydown', detectScreenshotKeys, true);
    document.addEventListener('keyup', detectScreenshotKeys, true);
    
    // Visibility detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Screen capture API detection
    detectScreenCapture();
    
    // Prevent context menu (right-click)
    const preventContextMenu = (e) => {
      if (e.target.closest('.screen-protected-content')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Prevent print
    const preventPrint = (e) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setIsProtected(true);
        reportCapture('screenshot', 'Print attempt blocked');
      }
    };
    document.addEventListener('keydown', preventPrint);
    
    // Blur event (window loses focus)
    const handleBlur = () => {
      // Could be screen recording or screenshot tool
      setIsProtected(true);
    };
    window.addEventListener('blur', handleBlur);
    
    // Focus event
    const handleFocus = () => {
      if (canContinue && !captureDetected) {
        setIsProtected(false);
      }
    };
    window.addEventListener('focus', handleFocus);
    
    // Initial state - content visible
    setIsProtected(false);
    
    return () => {
      document.removeEventListener('keydown', detectScreenshotKeys, true);
      document.removeEventListener('keyup', detectScreenshotKeys, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventPrint);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [detectScreenshotKeys, handleVisibilityChange, detectScreenCapture, reportCapture, canContinue, captureDetected]);

  // Dismiss warning (only if can continue)
  const dismissWarning = useCallback(() => {
    if (canContinue) {
      setShowWarning(false);
      setCaptureDetected(false);
      setIsProtected(false);
    }
  }, [canContinue]);

  return {
    isProtected,
    showWarning,
    warningMessage,
    captureDetected,
    canContinue,
    violationCount,
    dismissWarning,
    setIsProtected
  };
};

export default useScreenProtection;
