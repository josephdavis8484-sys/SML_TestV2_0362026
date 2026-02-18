import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Circle, 
  User, 
  Building2, 
  Calendar,
  ArrowRight,
  Sparkles,
  X
} from "lucide-react";
import { toast } from "sonner";

const CreatorOnboarding = ({ user, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const response = await axiosInstance.get("/creator/onboarding-status");
      setStatus(response.data);
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    try {
      await axiosInstance.post("/creator/complete-onboarding");
      toast.success("Welcome aboard! You're all set to start creating events.");
      if (onComplete) onComplete();
      if (onClose) onClose();
    } catch (error) {
      toast.error("Failed to complete onboarding");
    }
  };

  const steps = [
    {
      id: "profile_complete",
      title: "Complete Your Profile",
      description: "Your basic profile is set up",
      icon: User,
      action: null, // Already done via Google auth
      completed: status?.steps?.profile_complete
    },
    {
      id: "bank_linked",
      title: "Link Bank Account",
      description: "Connect your bank to receive payouts",
      icon: Building2,
      action: () => navigate("/creator/settings"),
      actionLabel: "Link Bank",
      completed: status?.steps?.bank_linked
    },
    {
      id: "first_event_created",
      title: "Create Your First Event",
      description: "Schedule your first live show",
      icon: Calendar,
      action: () => navigate("/creator/create-event"),
      actionLabel: "Create Event",
      completed: status?.steps?.first_event_created
    }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // If onboarding is complete, don't show anything
  if (status?.is_complete && status?.steps?.onboarding_completed) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" data-testid="creator-onboarding">
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-yellow-300" />
            <h2 className="text-white text-2xl font-bold">Welcome, Creator!</h2>
          </div>
          <p className="text-white/80">
            Let's get you set up to start earning on ShowMeLive
          </p>
        </div>

        {/* Progress */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-400 text-sm">Your progress</span>
            <span className="text-white font-bold">
              {status?.current_step || 0} of {status?.total_steps || 3} completed
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((status?.current_step || 0) / (status?.total_steps || 3)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                  step.completed 
                    ? "bg-green-900/20 border border-green-600/30" 
                    : "bg-gray-800/50 border border-gray-700"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? "bg-green-600" 
                    : "bg-gray-700"
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <step.icon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold ${step.completed ? "text-green-400" : "text-white"}`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>

                {!step.completed && step.action && (
                  <Button
                    onClick={step.action}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {step.actionLabel}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                
                {step.completed && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            ))}
          </div>

          {/* Complete Button */}
          {status?.is_complete && !status?.steps?.onboarding_completed && (
            <Button
              onClick={handleCompleteOnboarding}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Complete Setup & Start Creating!
            </Button>
          )}

          {/* Skip for now */}
          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-500 hover:text-gray-400 text-sm"
          >
            I'll finish this later
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatorOnboarding;
