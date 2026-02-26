import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { ArrowLeft, Camera, Smartphone, QrCode, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

const FRONTEND_URL = window.location.origin;

const ProModeQRCodes = ({ user }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedDevice, setCopiedDevice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventRes = await axiosInstance.get(`/events/${eventId}`);
        setEvent(eventRes.data);

        const sessionRes = await axiosInstance.get(`/pro-mode/session/${eventId}`);
        setSession(sessionRes.data);
        setLoading(false);
      } catch (error) {
        toast.error("Failed to load session");
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const getDeviceUrl = (deviceNumber) => {
    return `${FRONTEND_URL}/pro-mode/camera/${eventId}/${deviceNumber}`;
  };

  const handleCopyLink = (deviceNumber) => {
    navigator.clipboard.writeText(getDeviceUrl(deviceNumber));
    setCopiedDevice(deviceNumber);
    toast.success(`Camera ${deviceNumber} link copied!`);
    setTimeout(() => setCopiedDevice(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/pro-mode/${eventId}`)}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-xl">Connect Camera Devices</h1>
              <p className="text-gray-400 text-sm">{event?.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 mb-8">
          <h2 className="text-blue-400 font-bold text-lg mb-3 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            How to Connect Camera Devices
          </h2>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside">
            <li>Open the camera on your phone/tablet</li>
            <li>Scan the QR code for the camera slot you want to use</li>
            <li>Grant camera and microphone permissions when prompted</li>
            <li>The camera will automatically connect to the Control Panel</li>
            <li>Repeat for up to 5 camera devices</li>
          </ol>
        </div>

        {/* QR Code Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((deviceNumber) => (
            <div 
              key={deviceNumber}
              className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">Camera {deviceNumber}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-6 flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg mb-4">
                  <QRCode 
                    value={getDeviceUrl(deviceNumber)} 
                    size={150}
                    level="H"
                  />
                </div>

                {/* Copy Link Button */}
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => handleCopyLink(deviceNumber)}
                >
                  {copiedDevice === deviceNumber ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>

                {/* URL Preview */}
                <p className="text-gray-500 text-xs mt-3 text-center break-all">
                  {getDeviceUrl(deviceNumber).replace(FRONTEND_URL, '...')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate(`/pro-mode/${eventId}`)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8"
          >
            Back to Control Panel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProModeQRCodes;
