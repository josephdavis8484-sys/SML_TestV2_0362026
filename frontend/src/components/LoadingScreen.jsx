import React from "react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-[#0f0f0f] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-blue-600/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;