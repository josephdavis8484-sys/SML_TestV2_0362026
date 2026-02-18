import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/App";
import { Shield } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axiosInstance.post("/admin/login", null, {
        params: { email, password }
      });
      
      // Store admin session
      localStorage.setItem("admin_session", response.data.session_token);
      
      toast.success("Admin login successful!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white text-4xl font-black mb-2">
            Admin Access
          </h1>
          <p className="text-gray-400">
            <span className="text-blue-500">ShowMe</span>Live Platform
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-gray-900/50 rounded-2xl p-8">
          <div className="space-y-6">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Admin Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@showmelive.com"
                required
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="admin-email-input"
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="bg-gray-800 border-gray-700 text-white"
                data-testid="admin-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
              data-testid="admin-login-button"
            >
              {loading ? "Logging in..." : "Admin Login"}
            </Button>
          </div>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          <button onClick={() => navigate("/")} className="text-blue-500 hover:text-blue-400">
            ← Back to Platform
          </button>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
