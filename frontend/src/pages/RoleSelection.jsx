import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/App";
import { User, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

const RoleSelection = ({ user, onRoleSelected }) => {
  const [selecting, setSelecting] = useState(false);
  const [showCreatorGuidelines, setShowCreatorGuidelines] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFee, setAcceptedFee] = useState(false);
  const navigate = useNavigate();

  // If user is already authenticated and just returned from OAuth, apply saved role
  useEffect(() => {
    if (user && !user.role) {
      const savedRole = localStorage.getItem('selected_role');
      if (savedRole) {
        applyRole(savedRole);
        localStorage.removeItem('selected_role');
      }
    }
  }, [user]);

  const handleViewerSelection = () => {
    if (!user) {
      // Save role choice and redirect to auth
      localStorage.setItem('selected_role', 'viewer');
      const redirectUrl = `${window.location.origin}/`;
      window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      applyRole('viewer');
    }
  };

  const handleCreatorSelection = () => {
    if (!user) {
      // Show guidelines first, then will save role and auth
      setShowCreatorGuidelines(true);
    } else {
      // Already authenticated, show guidelines
      setShowCreatorGuidelines(true);
    }
  };

  const applyRole = async (role) => {
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

  const confirmCreatorRole = () => {
    if (!acceptedGuidelines || !acceptedFee) {
      toast.error("Please accept all terms to continue");
      return;
    }
    setShowCreatorGuidelines(false);
    
    if (!user) {
      // Save role and redirect to auth
      localStorage.setItem('selected_role', 'creator');
      const redirectUrl = `${window.location.origin}/`;
      window.location.href = `${EMERGENT_AUTH_URL}/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      // Already authenticated, apply role
      applyRole('creator');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4" data-testid="role-selection-page">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-white text-6xl md:text-7xl font-black mb-6">
            Welcome to <span className="text-blue-500">ShowMe</span><span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400 text-2xl font-light">Premium Virtual Events Platform</p>
          <p className="text-gray-500 text-lg mt-2">Choose your experience to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Creator Option */}
          <button
            onClick={handleCreatorSelection}
            disabled={selecting}
            className="group relative bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 rounded-3xl p-12 hover:border-blue-500 transition-all duration-500 hover:scale-105"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.5), 0 0 45px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="creator-role-button"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Video className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-white text-4xl font-black mb-4">Content Creator</h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Host professional live events with multi-camera streaming
              </p>
              <div className="bg-black/40 rounded-xl p-6 mb-6 w-full">
                <ul className="text-gray-300 text-left space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span>Create unlimited events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span>Professional multi-camera control</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span>Earn 80% of ticket sales</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 text-xl">✓</span>
                    <span>Advanced analytics & insights</span>
                  </li>
                </ul>
              </div>
              <div className="text-sm text-gray-500 italic">
                *20% platform fee applies
              </div>
            </div>
          </button>

          {/* Viewer Option */}
          <button
            onClick={handleViewerSelection}
            disabled={selecting}
            className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-gray-600/50 rounded-3xl p-12 hover:border-blue-400 transition-all duration-500 hover:scale-105"
            style={{
              boxShadow: '0 0 0 rgba(59, 130, 246, 0)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.5), 0 0 45px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 rgba(59, 130, 246, 0)';
            }}
            data-testid="viewer-role-button"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:scale-110 transition-all">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-white text-4xl font-black mb-4">Content Viewer</h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Discover and enjoy premium live events
              </p>
              <div className="bg-black/40 rounded-xl p-6 mb-6 w-full">
                <ul className="text-gray-300 text-left space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">✓</span>
                    <span>Browse all events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">✓</span>
                    <span>High-quality live streaming</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">✓</span>
                    <span>Secure one-device viewing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 text-xl">✓</span>
                    <span>Add events to calendar</span>
                  </li>
                </ul>
              </div>
              <div className="text-sm text-blue-400 font-medium">
                Continue with sign-in
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-gray-500 mt-12 text-lg">
          Select your role to sign in with Google
        </p>
      </div>

      {/* Creator Guidelines Modal */}
      {showCreatorGuidelines && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" data-testid="creator-guidelines-modal">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white text-3xl font-bold">Content Creator Agreement</h3>
              <button onClick={() => setShowCreatorGuidelines(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-6">
                <h4 className="text-blue-400 text-xl font-bold mb-4">Content Guidelines</h4>
                <ul className="text-gray-300 space-y-3">
                  <li>• Content must comply with local laws and regulations</li>
                  <li>• No hate speech, harassment, or discriminatory content</li>
                  <li>• No explicit adult content without age verification</li>
                  <li>• Respect intellectual property rights</li>
                  <li>• No spam, scams, or fraudulent activities</li>
                  <li>• Maintain professional conduct during live events</li>
                </ul>
              </div>

              <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-6">
                <h4 className="text-yellow-400 text-xl font-bold mb-4">Platform Fee Structure</h4>
                <div className="text-gray-300 space-y-2">
                  <p className="text-lg"><strong>20% platform fee</strong> applies to all ticket sales</p>
                  <p>• You receive <strong className="text-green-400">80% of all revenue</strong></p>
                  <p>• Payouts processed 24 hours after event completion</p>
                  <p>• Secure payment via Stripe</p>
                  <p>• Detailed earnings dashboard provided</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={acceptedGuidelines}
                    onCheckedChange={setAcceptedGuidelines}
                    className="mt-1"
                    data-testid="accept-guidelines-checkbox"
                  />
                  <span className="text-gray-300">I have read and agree to the <strong className="text-white">Content Guidelines</strong> and will maintain professional standards in all content</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={acceptedFee}
                    onCheckedChange={setAcceptedFee}
                    className="mt-1"
                    data-testid="accept-fee-checkbox"
                  />
                  <span className="text-gray-300">I understand and accept the <strong className="text-white">20% platform fee</strong> on all ticket sales (I receive 80% of revenue)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={confirmCreatorRole}
                disabled={!acceptedGuidelines || !acceptedFee || selecting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg"
                data-testid="confirm-creator-button"
              >
                {selecting ? "Processing..." : "Agree & Continue"}
              </Button>
              <Button
                onClick={() => setShowCreatorGuidelines(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelection;