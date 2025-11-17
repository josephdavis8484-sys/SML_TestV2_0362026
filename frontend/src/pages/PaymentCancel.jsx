import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const PaymentCancel = ({ user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="pt-24 px-4 flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-white text-3xl font-bold mb-4">Payment Cancelled</h2>
          <p className="text-gray-400 mb-8">
            Your payment was cancelled. No charges were made to your account.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate(-1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold"
            >
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;