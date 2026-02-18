import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Ticket, LogOut, Settings } from "lucide-react";
import NotificationBell from "./NotificationBell";

const EMERGENT_AUTH_URL = "https://auth.emergentagent.com";

const Navbar = ({ user, onLogout, isCreator = false }) => {
  const navigate = useNavigate();
  
  const handleLogin = () => {
    // Redirect to role selection page before authentication
    navigate("/select-role");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to={user?.role === "creator" ? "/creator/dashboard" : "/"} className="flex items-center" data-testid="logo-link">
              <div className="text-3xl font-black tracking-tight">
                <span className="text-blue-500">ShowMe</span>
                <span className="text-white">Live</span>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {user?.role === "creator" ? (
                <>
                  <Link to="/creator/dashboard" className="text-gray-300 hover:text-white text-sm font-medium" data-testid="dashboard-link">
                    Dashboard
                  </Link>
                  <Link to="/creator/create-event" className="text-gray-300 hover:text-white text-sm font-medium" data-testid="create-event-link">
                    Create Event
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/" className="text-gray-300 hover:text-white text-sm font-medium" data-testid="home-link">
                    Home
                  </Link>
                  <Link to="/browse" className="text-gray-300 hover:text-white text-sm font-medium" data-testid="browse-link">
                    Browse
                  </Link>
                  {user && (
                    <Link to="/my-tickets" className="text-gray-300 hover:text-white text-sm font-medium" data-testid="my-tickets-link">
                      My Tickets
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell user={user} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 focus:outline-none" data-testid="user-menu-button">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.picture} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-black/95 border-gray-800">
                    <DropdownMenuItem className="text-gray-300 hover:text-white" data-testid="profile-menu-item">
                      <User className="mr-2 h-4 w-4" />
                      <span>{user.name}</span>
                    </DropdownMenuItem>
                    {user.role === "creator" && (
                      <DropdownMenuItem 
                        onClick={() => navigate("/creator/settings")} 
                        className="text-gray-300 hover:text-white cursor-pointer"
                        data-testid="settings-menu-item"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Payout Settings</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => navigate("/my-tickets")} 
                      className="text-gray-300 hover:text-white cursor-pointer"
                      data-testid="tickets-menu-item"
                    >
                      <Ticket className="mr-2 h-4 w-4" />
                      <span>My Tickets</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={onLogout} 
                      className="text-gray-300 hover:text-white cursor-pointer"
                      data-testid="logout-button"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button 
                onClick={handleLogin} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
                data-testid="login-button"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;