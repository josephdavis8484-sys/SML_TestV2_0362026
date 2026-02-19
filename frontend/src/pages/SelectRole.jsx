import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Video, ArrowLeft } from "lucide-react";

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";
const APP_NAME = "ShowMeLive";

const SelectRole = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    // Store selected role in sessionStorage before auth
    sessionStorage.setItem("pending_role", role);
    
    // Redirect to Google auth with custom app name
    const redirectUrl = `${window.location.origin}/`;
    window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}&app_name=${encodeURIComponent(APP_NAME)}`;
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4" data-testid="select-role-page">
      <div className="max-w-4xl w-full">
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          data-testid="back-to-home"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-white text-4xl md:text-5xl font-black mb-4">
            Join <span className="text-blue-500">ShowMe</span><span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">How would you like to use ShowMeLive?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Viewer Option */}
          <button
            onClick={() => handleRoleSelect("viewer")}
            className="group relative bg-gray-900/50 rounded-2xl p-8 hover:bg-gray-900/70 transition-all duration-300 hover:scale-[1.02] text-left"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="viewer-option"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition-colors">
                <User className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">Content Viewer</h2>
              <p className="text-gray-400 text-base md:text-lg mb-6">
                Browse and watch live events
              </p>
              <ul className="text-gray-300 text-left space-y-2 text-sm md:text-base">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Access to all live events
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Purchase tickets instantly
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Watch live streams
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Add events to calendar
                </li>
              </ul>
              <div className="mt-6 w-full py-3 bg-blue-600/20 text-blue-400 rounded-lg font-semibold text-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                Continue as Viewer →
              </div>
            </div>
          </button>

          {/* Creator Option */}
          <button
            onClick={() => handleRoleSelect("creator")}
            className="group relative bg-gray-900/50 rounded-2xl p-8 hover:bg-gray-900/70 transition-all duration-300 hover:scale-[1.02] text-left"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="creator-option"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition-colors">
                <Video className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">Content Creator</h2>
              <p className="text-gray-400 text-base md:text-lg mb-6">
                Create and stream live events
              </p>
              <ul className="text-gray-300 text-left space-y-2 text-sm md:text-base">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Create unlimited events
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Multi-device streaming
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Earn 80% of ticket sales
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Professional control panel
                </li>
              </ul>
              <div className="mt-6 w-full py-3 bg-blue-600/20 text-blue-400 rounded-lg font-semibold text-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                Continue as Creator →
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Creators accept a 20% platform fee on all ticket sales
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectRole;
