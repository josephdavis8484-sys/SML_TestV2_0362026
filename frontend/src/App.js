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
import CreatorDashboard from "@/pages/CreatorDashboard";
import CreateEvent from "@/pages/CreateEvent";
import StreamDevice from "@/pages/StreamDevice";
import ControlPanel from "@/pages/ControlPanel";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCancel from "@/pages/PaymentCancel";

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
          setUser(response.data.user);
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
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;