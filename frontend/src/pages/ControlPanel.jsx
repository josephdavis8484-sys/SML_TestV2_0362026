import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "@/App";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode, Plus, Radio } from "lucide-react";
import { toast } from "sonner";

const ControlPanel = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showQR, setShowQR] = useState(null);
  const [activeDevice, setActiveDevice] = useState(null);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [eventRes, devicesRes] = await Promise.all([
        axiosInstance.get(`/events/${eventId}`),
        axiosInstance.get(`/streaming/devices/${eventId}`)
      ]);
      setEvent(eventRes.data);
      setDevices(devicesRes.data);
      
      const active = devicesRes.data.find(d => d.is_active && !d.is_control_panel);
      if (active) setActiveDevice(active.id);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load control panel");
    }
  };

  const generateDevice = async (isControlPanel = false) => {
    const maxDevices = event.streaming_package === "premium" ? 5 : 1;
    const streamDevices = devices.filter(d => !d.is_control_panel);
    
    if (!isControlPanel && streamDevices.length >= maxDevices) {
      toast.error(`Maximum ${maxDevices} streaming device(s) allowed for ${event.streaming_package} package`);
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/streaming/generate-device-token?event_id=${eventId}&device_name=Device ${devices.length + 1}&is_control_panel=${isControlPanel}`
      );
      
      setShowQR(response.data);
      fetchData();
    } catch (error) {
      console.error("Error generating device:", error);
      toast.error("Failed to generate device token");
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const streamDevices = devices.filter(d => !d.is_control_panel);
  const maxDevices = event.streaming_package === "premium" ? 5 : 1;

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4" data-testid="control-panel">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/creator/dashboard")}
            className="text-white hover:text-blue-500 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-white text-3xl font-black">{event.title} - Control Panel</h1>
        </div>

        {/* Active Stream Display */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-white text-xl font-bold mb-4">Live Stream View</h2>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            {activeDevice ? (
              <div className="text-center">
                <Radio className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
                <p className="text-white text-lg">Streaming from {devices.find(d => d.id === activeDevice)?.device_name}</p>
                <p className="text-gray-400 text-sm mt-2">Stream is active</p>
              </div>
            ) : (
              <p className="text-gray-400 text-lg">No active stream</p>
            )}
          </div>
        </div>

        {/* Device Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {streamDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => setActiveDevice(device.id)}
              className={`bg-gray-900 rounded-lg p-4 transition-all ${
                activeDevice === device.id
                  ? "ring-2 ring-blue-500"
                  : "hover:bg-gray-800"
              }`}
              data-testid={`device-${device.id}`}
            >
              <div className="aspect-video bg-black rounded mb-2 flex items-center justify-center">
                {device.is_active ? (
                  <Radio className="w-8 h-8 text-blue-500 animate-pulse" />
                ) : (
                  <p className="text-gray-500 text-sm">Inactive</p>
                )}
              </div>
              <p className="text-white font-medium">{device.device_name}</p>
              <p className={`text-sm ${device.is_active ? "text-green-500" : "text-gray-500"}`}>
                {device.is_active ? "Active" : "Inactive"}
              </p>
            </button>
          ))}

          {/* Add Device Button */}
          {streamDevices.length < maxDevices && (
            <button
              onClick={() => generateDevice(false)}
              className="bg-gray-900/50 border-2 border-dashed border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-all flex flex-col items-center justify-center min-h-[200px]"
              data-testid="add-device-button"
            >
              <Plus className="w-12 h-12 text-gray-500 mb-2" />
              <p className="text-gray-400">Add Streaming Device</p>
              <p className="text-gray-500 text-sm mt-1">
                {streamDevices.length}/{maxDevices}
              </p>
            </button>
          )}
        </div>

        {/* Package Info */}
        <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4">
          <p className="text-blue-400 font-medium">
            {event.streaming_package === "premium" 
              ? `Premium Package: ${streamDevices.length}/5 devices connected`
              : `Free Package: ${streamDevices.length}/1 device connected`}
          </p>
        </div>

        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full">
              <h3 className="text-white text-2xl font-bold mb-4">Scan QR Code on Device</h3>
              <div className="bg-white p-4 rounded-lg mb-4">
                <img src={showQR.qr_code} alt="Device QR" className="w-full" />
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Scan this QR code with your streaming device (phone/tablet) to connect
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(showQR.device_url);
                    toast.success("Link copied!");
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Copy Link
                </Button>
                <Button
                  onClick={() => setShowQR(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
