import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { axiosInstance } from "@/App";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, 
  Building2, 
  CreditCard, 
  Check, 
  AlertCircle,
  ArrowRight,
  DollarSign,
  Clock,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const CreatorSettings = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bankStatus, setBankStatus] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [linkingBank, setLinkingBank] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Bank linking form
  const [bankForm, setBankForm] = useState({
    account_mask: "",
    account_name: "",
    institution_name: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bankRes, earningsRes, payoutsRes] = await Promise.all([
        axiosInstance.get("/creator/bank-status"),
        axiosInstance.get("/creator/earnings"),
        axiosInstance.get("/creator/payouts")
      ]);
      
      setBankStatus(bankRes.data);
      setEarnings(earningsRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkBank = async (e) => {
    e.preventDefault();
    setLinkingBank(true);
    
    try {
      await axiosInstance.post("/creator/link-bank", bankForm);
      toast.success("Bank account linked successfully!");
      setShowLinkModal(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to link bank account");
    } finally {
      setLinkingBank(false);
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
      const response = await axiosInstance.post("/creator/withdraw", { amount });
      toast.success(`Withdrawal of $${response.data.net_amount.toFixed(2)} initiated!`);
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
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const availableBalance = earnings?.creator_earnings || 0;
  const pendingPayouts = payouts.filter(p => p.status === "pending" || p.status === "processing");
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const withdrawableBalance = availableBalance - pendingAmount;

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

        {/* Bank Account Section */}
        <div className="bg-gray-900/50 rounded-lg p-6 mb-8">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Bank Account
          </h2>
          
          {bankStatus?.bank_linked ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">{bankStatus.bank_account.institution}</p>
                  <p className="text-gray-400 text-sm">
                    {bankStatus.bank_account.name} •••• {bankStatus.bank_account.mask}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowLinkModal(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-white font-semibold">No bank account linked</p>
                  <p className="text-gray-400 text-sm">Link a bank account to receive payouts</p>
                </div>
              </div>
              <Button
                onClick={() => setShowLinkModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Link Bank Account
              </Button>
            </div>
          )}
        </div>

        {/* Withdraw Button */}
        {bankStatus?.bank_linked && withdrawableBalance >= 10 && (
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg mb-8"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Withdraw Funds
          </Button>
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

      {/* Link Bank Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-white text-2xl font-bold mb-6">Link Bank Account</h3>
            
            <form onSubmit={handleLinkBank} className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Bank Name</label>
                <Input
                  value={bankForm.institution_name}
                  onChange={(e) => setBankForm({...bankForm, institution_name: e.target.value})}
                  placeholder="e.g., Chase Bank"
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Account Name</label>
                <Input
                  value={bankForm.account_name}
                  onChange={(e) => setBankForm({...bankForm, account_name: e.target.value})}
                  placeholder="e.g., Checking Account"
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Last 4 Digits</label>
                <Input
                  value={bankForm.account_mask}
                  onChange={(e) => setBankForm({...bankForm, account_mask: e.target.value.slice(0, 4)})}
                  placeholder="1234"
                  maxLength={4}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={linkingBank}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {linkingBank ? "Linking..." : "Link Account"}
                </Button>
              </div>
            </form>
            
            <p className="text-gray-500 text-xs mt-4 text-center">
              Note: Full Plaid integration requires API keys. This is a demo implementation.
            </p>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={withdrawing || parseFloat(withdrawAmount) < 10}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {withdrawing ? "Processing..." : "Withdraw"}
                </Button>
              </div>
            </form>
            
            <p className="text-gray-500 text-xs mt-4 text-center">
              Funds typically arrive in 2-3 business days
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorSettings;
