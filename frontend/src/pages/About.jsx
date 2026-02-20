import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { Phone, Mail, Globe, Facebook, Twitter, Instagram, Youtube, FileText, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [aboutData, setAboutData] = useState({
    description: "ShowMeLive is a premium virtual event platform that connects content creators with audiences worldwide. Our platform enables creators to host live events, concerts, educational sessions, and more, while providing viewers with an immersive viewing experience.",
    phone: "",
    email: "support@showmelive.com",
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      youtube: ""
    },
    termsUrl: "",
    privacyUrl: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      const response = await axiosInstance.get("/platform/about");
      if (response.data) {
        setAboutData(response.data);
      }
    } catch (error) {
      console.error("Error fetching about data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="about-page">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl md:text-5xl font-black mb-4">
            About <span className="text-blue-500">ShowMe</span><span className="text-white">Live</span>
          </h1>
          <p className="text-gray-400 text-lg">Your destination for premium live events</p>
        </div>

        {/* Description */}
        <div className="bg-gray-900/50 rounded-xl p-8 mb-8 border border-gray-800">
          <h2 className="text-white text-2xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            About Us
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            {aboutData.description}
          </p>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-900/50 rounded-xl p-8 mb-8 border border-gray-800">
          <h2 className="text-white text-2xl font-bold mb-6">Contact Us</h2>
          
          <div className="space-y-4">
            {aboutData.phone && (
              <a 
                href={`tel:${aboutData.phone}`}
                className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors"
              >
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Phone</p>
                  <p className="text-white font-medium">{aboutData.phone}</p>
                </div>
              </a>
            )}
            
            {aboutData.email && (
              <a 
                href={`mailto:${aboutData.email}`}
                className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors"
              >
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Email</p>
                  <p className="text-white font-medium">{aboutData.email}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* Social Media Links */}
        {(aboutData.socialLinks?.facebook || aboutData.socialLinks?.twitter || 
          aboutData.socialLinks?.instagram || aboutData.socialLinks?.youtube) && (
          <div className="bg-gray-900/50 rounded-xl p-8 mb-8 border border-gray-800">
            <h2 className="text-white text-2xl font-bold mb-6">Follow Us</h2>
            
            <div className="flex flex-wrap gap-4">
              {aboutData.socialLinks?.facebook && (
                <a 
                  href={aboutData.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gray-800 hover:bg-blue-600/20 px-5 py-3 rounded-lg transition-colors"
                >
                  <Facebook className="w-6 h-6 text-blue-400" />
                  <span className="text-white font-medium">Facebook</span>
                </a>
              )}
              
              {aboutData.socialLinks?.twitter && (
                <a 
                  href={aboutData.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-5 py-3 rounded-lg transition-colors"
                >
                  <Twitter className="w-6 h-6 text-gray-300" />
                  <span className="text-white font-medium">X (Twitter)</span>
                </a>
              )}
              
              {aboutData.socialLinks?.instagram && (
                <a 
                  href={aboutData.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gray-800 hover:bg-pink-600/20 px-5 py-3 rounded-lg transition-colors"
                >
                  <Instagram className="w-6 h-6 text-pink-400" />
                  <span className="text-white font-medium">Instagram</span>
                </a>
              )}
              
              {aboutData.socialLinks?.youtube && (
                <a 
                  href={aboutData.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-gray-800 hover:bg-red-600/20 px-5 py-3 rounded-lg transition-colors"
                >
                  <Youtube className="w-6 h-6 text-red-400" />
                  <span className="text-white font-medium">YouTube</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Legal Links */}
        <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-800">
          <h2 className="text-white text-2xl font-bold mb-6">Legal</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href={aboutData.termsUrl || "/terms"}
              target={aboutData.termsUrl ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-gray-800 hover:bg-gray-700 p-5 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">Terms of Service</p>
                <p className="text-gray-400 text-sm">Read our terms and conditions</p>
              </div>
            </a>
            
            <a 
              href={aboutData.privacyUrl || "/privacy"}
              target={aboutData.privacyUrl ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-gray-800 hover:bg-gray-700 p-5 rounded-lg transition-colors"
            >
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Privacy Policy</p>
                <p className="text-gray-400 text-sm">How we handle your data</p>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>© 2026 ShowMeLive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default About;
