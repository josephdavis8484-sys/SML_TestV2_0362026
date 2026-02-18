import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, 
  CreditCard, 
  Check, 
  AlertCircle,
  DollarSign,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

const CreatorSettings = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    // Check for Stripe return params
    const stripeSuccess = searchParams.get("stripe_success");
    const stripeRefresh = searchParams.get("stripe_refresh");
    
    if (stripeSuccess === "true") {
      toast.success("Stripe account connected successfully!");
      // Clear the URL params
      navigate("/creator/settings", { replace: true });
    } else if (stripeRefresh === "true") {
      toast.info("Please complete your Stripe onboarding to enable payouts.");
      navigate("/creator/settings", { replace: true });
    }
    
    fetchData();
  }, [searchParams, navigate]);

  const fetchData = async () => {
    try {
      const [stripeRes, earningsRes, payoutsRes] = await Promise.all([
        axiosInstance.get("/stripe/connect/status"),
        axiosInstance.get("/creator/earnings"),
        axiosInstance.get("/creator/payouts")
      ]);
      
      setStripeStatus(stripeRes.data);
      setEarnings(earningsRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load payout settings");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      // First create/get the Stripe account
      await axiosInstance.post("/stripe/connect/create-account");
      
      // Then get the onboarding link
      const response = await axiosInstance.post("/stripe/connect/onboarding-link", null, {
        params: { origin_url: window.location.origin }
      });
      
      // Redirect to Stripe hosted onboarding
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error connecting Stripe:", error);
      toast.error(error.response?.data?.detail || "Failed to connect Stripe");
      setConnectingStripe(false);
    }
  };

  const handleManageStripe = async () => {
    setConnectingStripe(true);
    try {
      // Get onboarding link to continue setup or manage account
      const response = await axiosInstance.post("/stripe/connect/onboarding-link", null, {
        params: { origin_url: window.location.origin }
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error getting Stripe link:", error);
      toast.error(error.response?.data?.detail || "Failed to get Stripe dashboard link");
      setConnectingStripe(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount < 10) {
      toast.error("Minimum withdrawal is $10");
      return;
    }
    
    setWithdrawing(true);
    
    try {
      const response = await axiosInstance.post("/stripe/connect/payout", null, {
        params: { amount }
      });
      toast.success(`Withdrawal of $${response.data.net_amount.toFixed(2)} completed!`);
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  const availableBalance = earnings?.creator_earnings || 0;
  const pendingPayouts = payouts.filter(p => p.status === "pending" || p.status === "processing");
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const withdrawableBalance = availableBalance - pendingAmount;

  const isStripeFullyConnected = stripeStatus?.connected && stripeStatus?.payouts_enabled;
  const isStripePartiallyConnected = stripeStatus?.connected && !stripeStatus?.payouts_enabled;

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="creator-settings">
      <Navbar user={user} onLogout={onLogout} isCreator={true} />
      
      <div className="pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto pb-20">
        <h1 className="text-white text-4xl font-black mb-8">Payout Settings</h1>
        
        {/* Balance Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900/50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span className="text-gray-400 text-sm">Total Earnings</span>
            </div>
            <p className="text-white text-3xl font-bold">${availableBalance.toFixed(2)}</p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-400 text-sm">Pending Payouts</span>
            </div>
            <p className="text-white text-3xl font-bold">${pendingAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-blue-500" />
              <span className="text-gray-400 text-sm">Available to Withdraw</span>
            </div>
            <p className="text-white text-3xl font-bold">${withdrawableBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Stripe Connect Section */}
        <div className="bg-gray-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Account
          </h2>
          
          {isStripeFullyConnected ? (
            // Fully connected and payouts enabled
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">Stripe Connected</p>
                  <p className="text-gray-400 text-sm">
                    Payouts enabled • Account ID: •••• {stripeStatus.account_id?.slice(-4)}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleManageStripe}
                disabled={connectingStripe}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
                data-testid="manage-stripe-button"
              >
                {connectingStripe ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Manage Account
              </Button>
            </div>
          ) : isStripePartiallyConnected ? (
            // Connected but onboarding incomplete
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">Setup Incomplete</p>
                  <p className="text-gray-400 text-sm">
                    Complete your Stripe account setup to receive payouts
                  </p>
                  {stripeStatus.requirements?.length > 0 && (
                    <p className="text-yellow-500 text-xs mt-1">
                      {stripeStatus.requirements.length} item(s) pending
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleManageStripe}
                disabled={connectingStripe}
                className="bg-yellow-600 hover:bg-yellow-700 flex items-center gap-2"
                data-testid="complete-stripe-setup-button"
              >
                {connectingStripe ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Complete Setup
              </Button>
            </div>
          ) : (
            // Not connected at all
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">Connect Stripe to Get Paid</p>
                  <p className="text-gray-400 text-sm">
                    Set up your Stripe account to receive payouts from ticket sales
                  </p>
                </div>
              </div>
              <Button
                onClick={handleConnectStripe}
                disabled={connectingStripe}
                className="bg-[#635BFF] hover:bg-[#5349e8] flex items-center gap-2"
                data-testid="connect-stripe-button"
              >
                {connectingStripe ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Connect with Stripe
              </Button>
            </div>
          )}
          
          {/* Stripe branding */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
              Powered by Stripe • Secure, encrypted payments
            </p>
          </div>
        </div>

        {/* Withdraw Button */}
        {isStripeFullyConnected && withdrawableBalance >= 10 && (
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg mb-8"
            data-testid="withdraw-funds-button"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Withdraw Funds
          </Button>
        )}

        {/* Info message if can't withdraw */}
        {!isStripeFullyConnected && (
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-8">
            <p className="text-blue-300 text-sm">
              Connect your Stripe account above to start receiving payouts from your ticket sales.
            </p>
          </div>
        )}

        {isStripeFullyConnected && withdrawableBalance < 10 && withdrawableBalance > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-8">
            <p className="text-yellow-300 text-sm">
              Minimum withdrawal amount is $10. Current available balance: ${withdrawableBalance.toFixed(2)}
            </p>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-gray-900/50 rounded-lg p-6">
          <h2 className="text-white text-xl font-bold mb-4">Payout History</h2>
          
          {payouts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No payouts yet</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div 
                  key={payout.id}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg"
                  data-testid={`payout-${payout.id}`}
                >
                  <div>
                    <p className="text-white font-semibold">${payout.net_amount.toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(payout.initiated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    payout.status === "completed" 
                      ? "bg-green-600/20 text-green-400"
                      : payout.status === "failed"
                      ? "bg-red-600/20 text-red-400"
                      : "bg-yellow-600/20 text-yellow-400"
                  }`}>
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full" data-testid="withdraw-modal">
            <h3 className="text-white text-2xl font-bold mb-2">Withdraw Funds</h3>
            <p className="text-gray-400 mb-6">
              Available: ${withdrawableBalance.toFixed(2)}
            </p>
            
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="10"
                  max={withdrawableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  className="bg-gray-800 border-gray-700 text-white text-2xl py-6"
                  data-testid="withdraw-amount-input"
                />
              </div>
              
              {withdrawAmount && parseFloat(withdrawAmount) >= 10 && (
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Withdrawal amount</span>
                    <span>${parseFloat(withdrawAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Processing fee (2%)</span>
                    <span>-${(parseFloat(withdrawAmount) * 0.02).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold">
                    <span>You'll receive</span>
                    <span>${(parseFloat(withdrawAmount) * 0.98).toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                  data-testid="cancel-withdraw-button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={withdrawing || parseFloat(withdrawAmount) < 10}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="confirm-withdraw-button"
                >
                  {withdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Withdraw"
                  )}
                </Button>
              </div>
            </form>
            
            <p className="text-gray-500 text-xs mt-4 text-center">
              Funds are transferred directly to your connected Stripe account
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorSettings;
