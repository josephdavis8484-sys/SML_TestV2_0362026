import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import EventDetail from "@/pages/EventDetail";
import MyTickets from "@/pages/MyTickets";
import LoadingScreen from "@/components/LoadingScreen";

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
      // Check for session_id in URL fragment
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
          
          // Clean URL
          window.history.replaceState(null, "", window.location.pathname);
        } catch (error) {
          console.error("Auth error:", error);
        } finally {
          setProcessingAuth(false);
        }
      } else {
        // Check existing session
        try {
          const response = await axiosInstance.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          // Not authenticated, continue
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

  if (loading || processingAuth) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
          <Route path="/browse" element={<Browse user={user} onLogout={handleLogout} />} />
          <Route path="/event/:id" element={<EventDetail user={user} onLogout={handleLogout} />} />
          <Route path="/my-tickets" element={
            user ? <MyTickets user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;