import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Calendar,
  BarChart3,
  PieChart,
  ArrowLeft,
  ArrowUp,
  ArrowDown
} from "lucide-react";

const CreatorAnalytics = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axiosInstance.get("/creator/analytics");
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

  const { summary, revenue_trend, category_breakdown, top_events } = analytics || {};

  // Calculate trend percentage
  const getTrendPercentage = () => {
    if (!revenue_trend || revenue_trend.length < 2) return 0;
    const current = revenue_trend[revenue_trend.length - 1]?.revenue || 0;
    const previous = revenue_trend[revenue_trend.length - 2]?.revenue || 1;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const trendPercentage = getTrendPercentage();
  const isPositiveTrend = parseFloat(trendPercentage) >= 0;

  // Get max revenue for chart scaling
  const maxRevenue = Math.max(...(revenue_trend?.map(r => r.revenue) || [1]));
  const maxTickets = Math.max(...(revenue_trend?.map(r => r.tickets) || [1]));

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="creator-analytics">
      <Navbar user={user} onLogout={onLogout} isCreator={true} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/creator/dashboard")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-white text-4xl font-black">Analytics</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-6 border border-green-600/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <div className={`flex items-center gap-1 text-sm ${isPositiveTrend ? 'text-green-400' : 'text-red-400'}`}>
                {isPositiveTrend ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(trendPercentage)}%
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
            <p className="text-white text-3xl font-bold">${summary?.total_revenue?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-6 border border-blue-600/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Your Earnings (80%)</p>
            <p className="text-white text-3xl font-bold">${summary?.creator_share?.toFixed(2) || "0.00"}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-6 border border-purple-600/20">
            <div className="flex items-center justify-between mb-2">
              <Ticket className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Tickets Sold</p>
            <p className="text-white text-3xl font-bold">{summary?.total_tickets_sold || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-xl p-6 border border-orange-600/20">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-gray-400 text-sm mb-1">Avg Ticket Price</p>
            <p className="text-white text-3xl font-bold">${summary?.avg_ticket_price?.toFixed(2) || "0.00"}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-white text-xl font-bold">Revenue Trend</h2>
            </div>
            
            {revenue_trend && revenue_trend.length > 0 ? (
              <div className="h-64 flex items-end justify-between gap-2">
                {revenue_trend.map((item, index) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center">
                    {/* Revenue bar */}
                    <div className="w-full flex flex-col items-center gap-1 mb-2">
                      <span className="text-green-400 text-xs font-medium">
                        ${item.revenue.toFixed(0)}
                      </span>
                      <div 
                        className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all duration-500"
                        style={{ 
                          height: `${Math.max((item.revenue / maxRevenue) * 180, 4)}px`,
                          opacity: 0.9
                        }}
                      />
                    </div>
                    {/* Month label */}
                    <span className="text-gray-500 text-xs mt-2">
                      {new Date(item.month + "-01").toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    {/* Tickets count */}
                    <span className="text-gray-600 text-xs">
                      {item.tickets} tickets
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">No revenue data yet</p>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-purple-400" />
              <h2 className="text-white text-xl font-bold">By Category</h2>
            </div>
            
            {category_breakdown && category_breakdown.length > 0 ? (
              <div className="space-y-4">
                {category_breakdown.map((cat, index) => {
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];
                  const totalCatRevenue = category_breakdown.reduce((sum, c) => sum + c.revenue, 0);
                  const percentage = totalCatRevenue > 0 ? (cat.revenue / totalCatRevenue * 100).toFixed(0) : 0;
                  
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{cat.category}</span>
                        <span className="text-gray-400 text-sm">${cat.revenue.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div 
                          className={`${colors[index % colors.length]} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500 text-xs">{cat.tickets} tickets</span>
                        <span className="text-gray-500 text-xs">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-gray-500">No category data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Events Table */}
        <div className="mt-6 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h2 className="text-white text-xl font-bold">Top Performing Events</h2>
          </div>
          
          {top_events && top_events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Tickets</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {top_events.map((event, index) => (
                    <tr 
                      key={event.event_id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <span className="text-white font-medium">{event.title}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-400">{event.date}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'live' 
                            ? 'bg-red-600/20 text-red-400'
                            : event.status === 'completed'
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="py-4 text-gray-300 text-right">{event.tickets_sold}</td>
                      <td className="py-4 text-green-400 font-bold text-right">${event.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">No events yet. Create your first event to see analytics!</p>
              <Button
                onClick={() => navigate("/creator/create-event")}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                Create Event
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorAnalytics;
