import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Shield, 
  Check, 
  ChevronRight,
  Search,
  Lock,
  X
} from "lucide-react";

// Mock bank data
const MOCK_BANKS = [
  { id: "chase", name: "Chase", logo: "🏦", color: "#117ACA" },
  { id: "bofa", name: "Bank of America", logo: "🏛️", color: "#E31837" },
  { id: "wells", name: "Wells Fargo", logo: "🏦", color: "#D71E28" },
  { id: "citi", name: "Citibank", logo: "🏛️", color: "#003B70" },
  { id: "usbank", name: "US Bank", logo: "🏦", color: "#0C2074" },
  { id: "pnc", name: "PNC Bank", logo: "🏛️", color: "#F58025" },
  { id: "capital", name: "Capital One", logo: "🏦", color: "#D03027" },
  { id: "td", name: "TD Bank", logo: "🏛️", color: "#2D8B2D" },
];

const MOCK_ACCOUNTS = [
  { id: "checking", name: "Checking Account", mask: "4521", type: "checking", balance: "$5,432.10" },
  { id: "savings", name: "Savings Account", mask: "8834", type: "savings", balance: "$12,500.00" },
];

const MockPlaidLink = ({ onSuccess, onExit, isOpen }) => {
  const [step, setStep] = useState("banks"); // banks, login, accounts, success
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  if (!isOpen) return null;

  const filteredBanks = MOCK_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBankSelect = (bank) => {
    setSelectedBank(bank);
    setStep("login");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate login delay
    setTimeout(() => {
      setLoading(false);
      setStep("accounts");
    }, 1500);
  };

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
  };

  const handleContinue = () => {
    setLoading(true);
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        onSuccess({
          institution: selectedBank.name,
          account_name: selectedAccount.name,
          account_mask: selectedAccount.mask,
          account_type: selectedAccount.type
        });
      }, 1500);
    }, 1000);
  };

  const handleClose = () => {
    setStep("banks");
    setSelectedBank(null);
    setSelectedAccount(null);
    setSearchQuery("");
    setCredentials({ username: "", password: "" });
    onExit();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl" data-testid="mock-plaid-link">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-gray-900" />
            </div>
            <span className="text-white font-semibold">Plaid</span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bank Selection */}
        {step === "banks" && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select your bank</h2>
            <p className="text-gray-500 text-sm mb-4">
              Search for your financial institution
            </p>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your bank..."
                className="pl-10 bg-gray-50 border-gray-200"
                data-testid="bank-search"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => handleBankSelect(bank)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  data-testid={`bank-${bank.id}`}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${bank.color}20` }}
                  >
                    {bank.logo}
                  </div>
                  <span className="font-medium text-gray-900">{bank.name}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <Shield className="w-4 h-4" />
                <span>Your data is encrypted and secure</span>
              </div>
            </div>
          </div>
        )}

        {/* Login */}
        {step === "login" && selectedBank && (
          <div className="p-6">
            <button 
              onClick={() => setStep("banks")}
              className="text-blue-600 text-sm mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${selectedBank.color}20` }}
              >
                {selectedBank.logo}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedBank.name}</h2>
                <p className="text-gray-500 text-sm">Enter your credentials</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-gray-700 text-sm font-medium mb-1 block">Username</label>
                <Input
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  placeholder="Enter any username"
                  required
                  className="bg-gray-50 border-gray-200"
                  data-testid="bank-username"
                />
              </div>
              <div>
                <label className="text-gray-700 text-sm font-medium mb-1 block">Password</label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  placeholder="Enter any password"
                  required
                  className="bg-gray-50 border-gray-200"
                  data-testid="bank-password"
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800"
                data-testid="bank-login-submit"
              >
                {loading ? "Connecting..." : "Connect"}
              </Button>
            </form>

            <p className="text-gray-400 text-xs text-center mt-4">
              Demo mode: Enter any credentials to continue
            </p>
          </div>
        )}

        {/* Account Selection */}
        {step === "accounts" && selectedBank && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Connected!</h2>
                <p className="text-gray-500 text-sm">Select an account for payouts</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {MOCK_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleAccountSelect(account)}
                  className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAccount?.id === account.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  data-testid={`account-${account.id}`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-gray-500 text-sm">•••• {account.mask}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{account.balance}</p>
                    <p className="text-gray-400 text-xs">{account.type}</p>
                  </div>
                  {selectedAccount?.id === account.id && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedAccount || loading}
              className="w-full bg-gray-900 hover:bg-gray-800"
              data-testid="continue-button"
            >
              {loading ? "Linking account..." : "Continue"}
            </Button>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Account Linked!</h2>
            <p className="text-gray-500">
              Your {selectedBank?.name} account ending in {selectedAccount?.mask} is now connected for payouts.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-center gap-2 text-gray-400 text-xs">
          <Lock className="w-3 h-3" />
          <span>Secured by Plaid (Demo Mode)</span>
        </div>
      </div>
    </div>
  );
};

export default MockPlaidLink;
