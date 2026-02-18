import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, Crown, Check, Zap, MessageCircle, Heart, HelpCircle } from "lucide-react";
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
    streaming_package: "free",
    chat_enabled: false,
    reactions_enabled: false,
    chat_mode: "open"
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
        image_url: imageUrl || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&h=600&fit=crop"
      };

      const response = await axiosInstance.post("/events", eventData);
      const eventId = response.data.id;
      
      // If premium package selected, redirect to Stripe checkout
      if (formData.streaming_package === "premium") {
        try {
          const checkoutRes = await axiosInstance.post("/payments/checkout/session", {
            payment_type: "streaming_package",
            package: "premium",
            event_id: eventId,
            origin_url: window.location.origin
          });
          
          toast.success("Event created! Redirecting to payment...");
          window.location.href = checkoutRes.data.url;
          return;
        } catch (paymentError) {
          console.error("Payment setup error:", paymentError);
          toast.error("Event created but payment setup failed. You can upgrade later.");
        }
      }
      
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
                min="0"
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

          {/* Streaming Package Selection */}
          <div>
            <label className="text-white text-lg font-semibold mb-4 block">Streaming Package</label>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Free Package */}
              <button
                type="button"
                onClick={() => setFormData({...formData, streaming_package: "free"})}
                className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                  formData.streaming_package === "free"
                    ? "border-blue-500 bg-blue-600/20"
                    : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                }`}
                data-testid="free-package-button"
              >
                {formData.streaming_package === "free" && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-5 h-5 text-blue-500" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-6 h-6 text-gray-400" />
                  <h3 className="text-white text-xl font-bold">Basic</h3>
                </div>
                <p className="text-gray-400 mb-4 text-sm">Perfect for getting started</p>
                <p className="text-blue-500 text-3xl font-bold mb-4">FREE</p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    1 streaming device
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Standard quality
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Basic analytics
                  </li>
                </ul>
              </button>

              {/* Premium Package */}
              <button
                type="button"
                onClick={() => setFormData({...formData, streaming_package: "premium"})}
                className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                  formData.streaming_package === "premium"
                    ? "border-yellow-500 bg-yellow-600/20"
                    : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                }`}
                data-testid="premium-package-button"
              >
                {formData.streaming_package === "premium" && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-5 h-5 text-yellow-500" />
                  </div>
                )}
                <div className="absolute -top-3 left-4 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                  PRO MODE
                </div>
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <h3 className="text-white text-xl font-bold">Premium</h3>
                </div>
                <p className="text-gray-400 mb-4 text-sm">For professional creators</p>
                <p className="text-yellow-500 text-3xl font-bold mb-4">$1,000</p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Up to 5 cameras
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Professional control panel
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    HD streaming quality
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Live transitions & effects
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Advanced analytics
                  </li>
                </ul>
              </button>
            </div>
            
            {formData.streaming_package === "premium" && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <Crown className="w-4 h-4 inline mr-2" />
                  Pro Mode requires a one-time payment of $1,000. You'll be redirected to complete payment after creating the event.
                </p>
              </div>
            )}
          </div>

          {/* Audience Interaction Settings */}
          <div>
            <label className="text-white text-lg font-semibold mb-4 block flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              Audience Interaction
            </label>
            <p className="text-gray-400 text-sm mb-4">
              Enable live chat and reactions for your viewers. Great for Q&A sessions, educational content, and audience engagement.
            </p>
            
            <div className="bg-gray-900/50 rounded-lg p-6 space-y-6 border border-gray-700">
              {/* Live Chat Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Live Chat</h4>
                    <p className="text-gray-400 text-sm">Allow viewers to send messages during the stream</p>
                  </div>
                </div>
                <Switch
                  checked={formData.chat_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, chat_enabled: checked})}
                  data-testid="chat-toggle"
                />
              </div>

              {/* Chat Mode Selection (only show if chat is enabled) */}
              {formData.chat_enabled && (
                <div className="pl-13 ml-10 border-l-2 border-gray-700 space-y-3">
                  <p className="text-gray-300 text-sm font-medium">Chat Mode</p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, chat_mode: "open"})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        formData.chat_mode === "open"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                      data-testid="chat-mode-open"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Open Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, chat_mode: "questions_only"})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        formData.chat_mode === "questions_only"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                      data-testid="chat-mode-questions"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Questions Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, chat_mode: "moderated"})}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        formData.chat_mode === "moderated"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                      data-testid="chat-mode-moderated"
                    >
                      Moderated
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {formData.chat_mode === "open" && "Anyone can chat freely during the stream"}
                    {formData.chat_mode === "questions_only" && "Viewers can only submit questions - perfect for educational sessions"}
                    {formData.chat_mode === "moderated" && "All messages require approval before appearing"}
                  </p>
                </div>
              )}

              {/* Reactions Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600/20 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Live Reactions</h4>
                    <p className="text-gray-400 text-sm">Let viewers send floating reactions during the stream</p>
                  </div>
                </div>
                <Switch
                  checked={formData.reactions_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, reactions_enabled: checked})}
                  data-testid="reactions-toggle"
                />
              </div>

              {/* Reactions Preview */}
              {formData.reactions_enabled && (
                <div className="flex items-center gap-4 pl-13 ml-10">
                  <span className="text-gray-400 text-sm">Available reactions:</span>
                  <div className="flex gap-2">
                    {["❤️", "👏", "🔥", "😂", "😮"].map((emoji, i) => (
                      <span key={i} className="text-2xl">{emoji}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Educational Tip */}
            {(formData.chat_enabled || formData.reactions_enabled) && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Tip for Educators:</strong> Use "Questions Only" mode for lectures and Q&A sessions. 
                  This keeps the chat focused and allows you to address viewer questions directly during your presentation.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg"
              data-testid="create-event-submit"
            >
              {loading ? "Creating..." : formData.streaming_package === "premium" ? "Create & Pay $1,000" : "Create Event"}
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
