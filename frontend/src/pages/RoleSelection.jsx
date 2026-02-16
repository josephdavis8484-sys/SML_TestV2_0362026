import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/App";
import { User, Video } from "lucide-react";
import { toast } from "sonner";

const RoleSelection = ({ user, onRoleSelected }) => {
  const [selecting, setSelecting] = useState(false);

  const selectRole = async (role) => {
    setSelecting(true);
    try {
      const response = await axiosInstance.post("/auth/role", { role });
      toast.success(`Welcome as a ${role === "creator" ? "Content Creator" : "Viewer"}!`);
      onRoleSelected(response.data);
    } catch (error) {
      console.error("Error selecting role:", error);
      toast.error("Failed to select role");
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4" data-testid="role-selection-page">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-white text-5xl md:text-6xl font-black mb-4">
            Welcome to <span className="text-blue-500">ShowMe</span><span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400 text-xl">Choose how you want to use our platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Viewer Option */}
          <button
            onClick={() => selectRole("viewer")}
            disabled={selecting}
            className="group relative bg-gray-900/50 rounded-2xl p-8 hover:bg-gray-900/70 transition-all duration-300 hover:scale-105"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="viewer-role-button"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition-colors">
                <User className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-white text-3xl font-bold mb-4">Viewer</h2>
              <p className="text-gray-400 text-lg mb-6">
                Browse and purchase tickets to live events
              </p>
              <ul className="text-gray-300 text-left space-y-2">
                <li>✓ Access to all live events</li>
                <li>✓ Purchase tickets instantly</li>
                <li>✓ Watch live streams</li>
                <li>✓ Manage your tickets</li>
              </ul>
            </div>
          </button>

          {/* Creator Option */}
          <button
            onClick={() => selectRole("creator")}
            disabled={selecting}
            className="group relative bg-gray-900/50 rounded-2xl p-8 hover:bg-gray-900/70 transition-all duration-300 hover:scale-105"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 5px rgba(59, 130, 246, 0.8), 0 0 10px rgba(59, 130, 246, 0.5), 0 0 15px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="creator-role-button"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition-colors">
                <Video className="w-10 h-10 text-blue-500" />
              </div>
              <h2 className="text-white text-3xl font-bold mb-4">Content Creator</h2>
              <p className="text-gray-400 text-lg mb-6">
                Create and stream your own live events
              </p>
              <ul className="text-gray-300 text-left space-y-2">
                <li>✓ Create unlimited events</li>
                <li>✓ Multi-device streaming</li>
                <li>✓ Earn 80% of ticket sales</li>
                <li>✓ Professional control panel</li>
              </ul>
            </div>
          </button>
        </div>

        <p className="text-center text-gray-500 mt-8 text-sm">
          You can change your role anytime from your profile settings
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;