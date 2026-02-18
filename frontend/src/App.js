import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import EventDetail from "@/pages/EventDetail";
import MyTickets from "@/pages/MyTickets";
import LoadingScreen from "@/components/LoadingScreen";
import RoleSelection from "@/pages/RoleSelection";
import SelectRole from "@/pages/SelectRole";
import CreatorDashboard from "@/pages/CreatorDashboard";
import CreatorSettings from "@/pages/CreatorSettings";
import CreatorAnalytics from "@/pages/CreatorAnalytics";
import CreateEvent from "@/pages/CreateEvent";
import StreamDevice from "@/pages/StreamDevice";
import ControlPanel from "@/pages/ControlPanel";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const axiosInstance = axios.create({
  baseURL: API,
  withCredentials: true,
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    const processAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const sessionId = params.get("session_id");

      if (sessionId) {
        setProcessingAuth(true);
        try {
          const response = await axiosInstance.post("/auth/session", {
            session_id: sessionId,
          });
          let userData = response.data.user;
          
          // Check if there's a pending role from pre-auth selection
          const pendingRole = sessionStorage.getItem("pending_role");
          if (pendingRole && !userData.role) {
            // Apply the pending role
            try {
              const roleResponse = await axiosInstance.post("/auth/role", { role: pendingRole });
              userData = roleResponse.data;
            } catch (roleError) {
              console.error("Error setting role:", roleError);
            }
            sessionStorage.removeItem("pending_role");
          }
          
          setUser(userData);
          window.history.replaceState(null, "", window.location.pathname);
        } catch (error) {
          console.error("Auth error:", error);
        } finally {
          setProcessingAuth(false);
        }
      } else {
        try {
          const response = await axiosInstance.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          // Not authenticated
        }
      }
      
      setLoading(false);
    };

    processAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading || processingAuth) {
    return <LoadingScreen />;
  }

  // If user is logged in but hasn't selected a role, show role selection
  if (user && !user.role) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<RoleSelection user={user} onRoleSelected={updateUser} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={
            user?.role === "creator" ? 
            <Navigate to="/creator/dashboard" /> : 
            <Home user={user} onLogout={handleLogout} />
          } />
          <Route path="/browse" element={<Browse user={user} onLogout={handleLogout} />} />
          <Route path="/event/:id" element={<EventDetail user={user} onLogout={handleLogout} />} />
          
          {/* Pre-auth role selection */}
          <Route path="/select-role" element={
            user ? <Navigate to="/" /> : <SelectRole />
          } />
          
          {/* Viewer routes */}
          <Route path="/my-tickets" element={
            user ? <MyTickets user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          } />
          
          {/* Creator routes */}
          <Route path="/creator/dashboard" element={
            user?.role === "creator" ? 
            <CreatorDashboard user={user} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } />
          <Route path="/creator/create-event" element={
            user?.role === "creator" ? 
            <CreateEvent user={user} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } />
          <Route path="/creator/settings" element={
            user?.role === "creator" ? 
            <CreatorSettings user={user} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } />
          <Route path="/creator/analytics" element={
            user?.role === "creator" ? 
            <CreatorAnalytics user={user} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } />
          
          {/* Streaming routes */}
          <Route path="/stream/:deviceToken" element={<StreamDevice />} />
          <Route path="/control-panel/:eventId" element={
            user?.role === "creator" ? 
            <ControlPanel user={user} onLogout={handleLogout} /> : 
            <Navigate to="/" />
          } />
          
          {/* Payment routes */}
          <Route path="/payment-success" element={<PaymentSuccess user={user} onLogout={handleLogout} />} />
          <Route path="/payment-cancel" element={<PaymentCancel user={user} onLogout={handleLogout} />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;