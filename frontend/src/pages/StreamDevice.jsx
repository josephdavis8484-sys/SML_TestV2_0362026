import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

const StreamDevice = () => {
  const { deviceToken } = useParams();
  const [streaming, setStreaming] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (deviceToken) {
      activateDevice();
    }
  }, [deviceToken]);

  const activateDevice = async () => {
    try {
      await axiosInstance.post(`/streaming/activate-device?device_token=${deviceToken}`);
      setActivated(true);
      toast.success("Device activated successfully!");
    } catch (error) {
      console.error("Error activating device:", error);
      toast.error("Failed to activate device");
    }
  };

  const startStreaming = () => {
    setStreaming(true);
    toast.success("Streaming started!");
  };

  const stopStreaming = () => {
    setStreaming(false);
    toast.info("Streaming stopped");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4" data-testid="stream-device">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-white text-3xl font-black mb-2">
            <span className="text-blue-500">ShowMe</span><span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400">Streaming Device</p>
        </div>

        {/* Camera View */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-4">
            {streaming ? (
              <div className="text-center">
                <Video className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                <p className="text-white text-lg">Camera Active</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-500 text-sm font-bold">LIVE</span>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Camera Inactive</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {!streaming ? (
            <Button
              onClick={startStreaming}
              disabled={!activated}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg"
              data-testid="start-streaming-button"
            >
              <Video className="w-5 h-5 mr-2" />
              Start Streaming
            </Button>
          ) : (
            <Button
              onClick={stopStreaming}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
              data-testid="stop-streaming-button"
            >
              <VideoOff className="w-5 h-5 mr-2" />
              Stop Streaming
            </Button>
          )}

          {!activated && (
            <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-4 text-center">
              <p className="text-yellow-500 font-medium">Device activation in progress...</p>
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-white font-bold mb-2">Instructions:</h3>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Keep this device steady while streaming</li>
              <li>• Ensure good lighting for best quality</li>
              <li>• Monitor battery and connection</li>
              <li>• Creator can switch to this camera from control panel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamDevice;