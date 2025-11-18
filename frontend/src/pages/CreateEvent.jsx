import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, QrCode } from "lucide-react";
import { toast } from "sonner";

const CreateEvent = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Music",
    date: "",
    time: "",
    description: "",
    venue: "",
    price: "",
    streaming_package: "free"
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload image first
      let imageUrl = "";
      if (imageFile) {
        const formDataImg = new FormData();
        formDataImg.append("file", imageFile);
        
        const uploadRes = await axiosInstance.post("/events/upload-image", formDataImg, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        imageUrl = `${process.env.REACT_APP_BACKEND_URL}${uploadRes.data.image_url}`;
      }

      // Create event
      const eventData = {
        ...formData,
        price: parseFloat(formData.price),
        image_url: imageUrl || "https://via.placeholder.com/400x600"
      };

      const response = await axiosInstance.post("/events", eventData);
      
      toast.success("Event created successfully!");
      navigate("/creator/dashboard");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="create-event-page">
      <Navbar user={user} onLogout={onLogout} isCreator={true} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-20">
        <h1 className="text-white text-4xl md:text-5xl font-black mb-8">Create New Event</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="text-white text-lg font-semibold mb-2 block">Event Poster</label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded" />
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400">Click to upload image</p>
                        <p className="text-gray-500 text-sm mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="image-upload-input"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Event Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter event title"
                required
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="title-input"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-md px-3 py-2"
                data-testid="category-select"
              >
                <option value="Music">Music</option>
                <option value="Comedy">Comedy</option>
                <option value="Sports">Sports</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Influencer">Influencer</option>
                <option value="Education">Education</option>
              </select>
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="date-input"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Time</label>
              <Input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                required
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="time-input"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Venue</label>
              <Input
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                placeholder="Event location"
                required
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="venue-input"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">Ticket Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
                required
                className="bg-gray-900 border-gray-700 text-white"
                data-testid="price-input"
              />
            </div>
          </div>

          <div>
            <label className="text-white text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your event"
              rows={4}
              required
              className="bg-gray-900 border-gray-700 text-white"
              data-testid="description-input"
            />
          </div>

          {/* Streaming Package */}
          <div>
            <label className="text-white text-lg font-semibold mb-4 block">Streaming Package</label>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, streaming_package: "free"})}
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.streaming_package === "free"
                    ? "border-blue-500 bg-blue-600/20"
                    : "border-gray-700 bg-gray-900/50"
                }`}
                data-testid="free-package-button"
              >
                <h3 className="text-white text-xl font-bold mb-2">Free</h3>
                <p className="text-gray-400 mb-2">1 streaming device</p>
                <p className="text-blue-500 text-2xl font-bold">$0</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({...formData, streaming_package: "premium"})}
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.streaming_package === "premium"
                    ? "border-blue-500 bg-blue-600/20"
                    : "border-gray-700 bg-gray-900/50"
                }`}
                data-testid="premium-package-button"
              >
                <h3 className="text-white text-xl font-bold mb-2">Premium</h3>
                <p className="text-gray-400 mb-2">5 streaming devices + control panel</p>
                <p className="text-blue-500 text-2xl font-bold">$1,000</p>
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg"
              data-testid="create-event-submit"
            >
              {loading ? "Creating..." : "Create Event"}
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/creator/dashboard")}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-6 px-8"
              data-testid="cancel-button"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
