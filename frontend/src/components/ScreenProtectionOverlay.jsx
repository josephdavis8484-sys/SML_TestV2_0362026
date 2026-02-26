import React from 'react';
import { Shield, AlertTriangle, Ban, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ScreenProtectionOverlay = ({ 
  showWarning, 
  warningMessage, 
  canContinue, 
  violationCount,
  onDismiss,
  isProtected
}) => {
  
  // Determine severity level
  const getSeverity = () => {
    if (!canContinue) return 'severe';
    if (violationCount >= 3) return 'high';
    if (violationCount >= 1) return 'medium';
    return 'low';
  };
  
  const severity = getSeverity();
  
  // Warning overlay when capture is detected
  if (showWarning) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-lg">
        <div className="max-w-md mx-4">
          <div className={`
            rounded-2xl p-8 text-center
            ${severity === 'severe' ? 'bg-red-900/50 border-2 border-red-500' : 
              severity === 'high' ? 'bg-orange-900/50 border-2 border-orange-500' : 
              'bg-yellow-900/50 border-2 border-yellow-500'}
          `}>
            {/* Icon */}
            <div className={`
              w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center
              ${severity === 'severe' ? 'bg-red-500/30' : 
                severity === 'high' ? 'bg-orange-500/30' : 
                'bg-yellow-500/30'}
            `}>
              {severity === 'severe' ? (
                <Ban className="w-10 h-10 text-red-400 animate-pulse" />
              ) : severity === 'high' ? (
                <AlertTriangle className="w-10 h-10 text-orange-400 animate-pulse" />
              ) : (
                <Shield className="w-10 h-10 text-yellow-400 animate-pulse" />
              )}
            </div>
            
            {/* Title */}
            <h2 className={`
              text-2xl font-bold mb-4
              ${severity === 'severe' ? 'text-red-400' : 
                severity === 'high' ? 'text-orange-400' : 
                'text-yellow-400'}
            `}>
              {severity === 'severe' ? 'Account Restricted' : 
               severity === 'high' ? 'Session Terminated' : 
               'Screen Capture Detected'}
            </h2>
            
            {/* Message */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              {warningMessage || 'Screen capture is not allowed on ShowMeLive.'}
            </p>
            
            {/* Violation Count */}
            {violationCount > 0 && (
              <div className={`
                text-sm mb-6 py-2 px-4 rounded-lg inline-block
                ${severity === 'severe' ? 'bg-red-500/20 text-red-300' : 
                  severity === 'high' ? 'bg-orange-500/20 text-orange-300' : 
                  'bg-yellow-500/20 text-yellow-300'}
              `}>
                Violations recorded: {violationCount}
              </div>
            )}
            
            {/* Policy info */}
            <div className="text-xs text-gray-500 mb-6 space-y-1">
              <p>Our privacy policy protects content creators and viewers.</p>
              {severity !== 'severe' && canContinue && (
                <p className="text-yellow-500">Further violations may result in account suspension.</p>
              )}
            </div>
            
            {/* Action Button */}
            {canContinue ? (
              <Button
                onClick={onDismiss}
                className="bg-white text-black hover:bg-gray-200 font-bold px-8 py-3"
              >
                I Understand - Continue Watching
              </Button>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={() => window.location.href = '/'}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-8 py-3"
                >
                  Return to Home
                </Button>
                <p className="text-xs text-gray-500">
                  Contact support@showmelive.online if you believe this is an error.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Black screen protection overlay (when content should be hidden)
  if (isProtected) {
    return (
      <div className="absolute inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 text-lg">Content Protected</p>
          <p className="text-gray-600 text-sm mt-2">Return to this tab to continue viewing</p>
        </div>
      </div>
    );
  }
  
  return null;
};

// Wrapper component to apply screen protection to content
export const ProtectedContent = ({ children, isProtected, showWarning, className = '' }) => {
  return (
    <div className={`screen-protected screen-protected-content relative ${className}`}>
      {/* Content with conditional blur/black */}
      <div className={`
        transition-all duration-300
        ${isProtected ? 'filter blur-xl brightness-0' : ''}
      `}>
        {children}
      </div>
    </div>
  );
};

// Security status badge component
export const SecurityStatusBadge = ({ violationCount, status }) => {
  if (violationCount === 0 && status === 'clear') return null;
  
  const getStatusColor = () => {
    if (status === 'permanent_ban') return 'bg-red-500';
    if (status === 'suspended_30d') return 'bg-red-500';
    if (status === 'warned') return 'bg-yellow-500';
    if (violationCount >= 3) return 'bg-orange-500';
    return 'bg-gray-500';
  };
  
  return (
    <div className={`
      ${getStatusColor()} text-white text-xs px-2 py-1 rounded-full
      flex items-center gap-1
    `}>
      <Shield className="w-3 h-3" />
      <span>
        {status === 'permanent_ban' ? 'Restricted' :
         status === 'suspended_30d' ? 'Suspended' :
         `${violationCount} warning${violationCount !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
};

export default ScreenProtectionOverlay;
