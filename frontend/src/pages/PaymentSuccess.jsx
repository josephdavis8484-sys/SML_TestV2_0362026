import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "@/App";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const PaymentSuccess = ({ user, onLogout }) => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    if (attempts >= 5) {
      setChecking(false);
      return;
    }

    try {
      const response = await axiosInstance.get(`/payments/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === "paid") {
        setVerified(true);
        setChecking(false);
        return;
      }

      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    } catch (error) {
      console.error("Error checking payment:", error);
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 px-4 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          {checking ? (
            <div>
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-white text-2xl font-bold mb-2">Processing Payment...</h2>
              <p className="text-gray-400">Please wait while we confirm your payment</p>
            </div>
          ) : verified ? (
            <div className="animate-fadeIn">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-white text-3xl font-bold mb-4">Payment Successful!</h2>
              <p className="text-gray-400 mb-8">Thank you for your purchase</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate(user?.role === "creator" ? "/creator/dashboard" : "/my-tickets")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {user?.role === "creator" ? "Go to Dashboard" : "View My Tickets"}
                </Button>
                <Button
                  onClick={() => navigate("/browse")}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold"
                >
                  Browse Events
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">Payment Processing</h2>
              <p className="text-gray-400 mb-6">Your payment is being processed. You'll receive a confirmation email shortly.</p>
              <Button
                onClick={() => navigate("/")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Return Home
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;