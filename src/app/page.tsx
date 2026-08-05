'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logoutSite, touchSession } from './actions/auth';
import { 
  LogOut, 
  X,
  CheckCircle,
  AlertCircle,
  Info,
  RotateCcw
} from 'lucide-react';

import SummaryCards from '@/components/SummaryCards';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseTable from '@/components/ExpenseTable';

interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  billImageUrl?: string | null;
  paymentSource?: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sponsorBudget, setSponsorBudget] = useState(0);
  const [sponsorName, setSponsorName] = useState('Sponsor');
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('User');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const router = useRouter();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  // Helper to read cookie on client
  const getUsernameFromCookie = () => {
    if (typeof window === 'undefined') return 'User';
    const match = document.cookie.match(/(?:^|; )site_auth=([^;]*)/);
    if (!match) return 'User';
    const cookieVal = decodeURIComponent(match[1]).toLowerCase();
    if (cookieVal === 'numa@kvgce.ac.in' || cookieVal === 'numa') return 'Numa';
    if (cookieVal === 'ziyana@kvgce.ac.in' || cookieVal === 'ziyana') return 'Ziyana';
    return cookieVal;
  };

  // Logout handler
  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutSite();
      window.location.href = '/login';
    });
  };

  // Load expenses & detect page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navs = window.performance.getEntriesByType('navigation');
      if (navs.length > 0 && (navs[0] as PerformanceNavigationTiming).type === 'reload') {
        // If the page was refreshed/reloaded, instantly logout the user
        handleLogout();
        return;
      }
    }

    fetchExpenses();
    fetchSettings();
    setUsername(getUsernameFromCookie());
  }, []);

  // Heartbeat session touch keep-alive
  useEffect(() => {
    touchSession();
    const interval = setInterval(() => {
      touchSession();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.sponsor_budget !== undefined) {
          setSponsorBudget(parseFloat(data.sponsor_budget) || 0);
        }
        if (data.sponsor_name !== undefined) {
          setSponsorName(data.sponsor_name || 'Sponsor');
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      } else {
        showToast('Failed to fetch expenses from database', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to expense API', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Log new expense submit handler
  const handleFormSubmit = async (expenseData: any) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(expenseData),
    });

    if (res.ok) {
      const savedExpense = await res.json();
      setExpenses((prev) => [savedExpense, ...prev]);
      showToast('Expense logged successfully!', 'success');
      // Refetch settings to update dynamic sponsor cards
      fetchSettings();
    } else {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create expense');
    }
  };

  // Redirect standard users to /admin if they try to edit or delete
  const handleEditRedirect = () => {
    showToast('Admin key required. Redirecting to Admin Panel...', 'info');
    setTimeout(() => {
      router.push('/sh-admin-sh');
    }, 1200);
  };

  const handleDeleteRedirect = () => {
    showToast('Admin key required. Redirecting to Admin Panel...', 'info');
    setTimeout(() => {
      router.push('/sh-admin-sh');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans relative overflow-hidden">
      {/* Header */}
      <header className="border-b border-border-subtle bg-background-secondary/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Sphere Hive Logo" 
              className="w-10 h-10 object-contain invert rounded-[12px]"
            />
            <div className="text-left">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                Sphere Hive Expense Tracker
              </h1>
              {username && username !== 'User' && (
                <p className="text-[10px] text-primary-accent font-semibold mt-0.5">
                  Welcome, {username}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card-bg hover:bg-card-hover text-text-secondary hover:text-white rounded-[12px] text-xs font-semibold border border-border-subtle transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form Panel (displayed below ledger on mobile) */}
          <div id="form-container" className="order-2 lg:order-1 lg:col-span-4 scroll-mt-24">
            <ExpenseForm onSubmit={handleFormSubmit} />
          </div>

          {/* Right Column: Summaries + Ledger Table (displayed first on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-8 space-y-6">
            {/* 5 Stats Cards */}
            <section>
              <SummaryCards expenses={expenses} />
            </section>

            {/* Transaction List */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Transactions Control</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Browse the shared expense ledger. Admin permissions are required to edit or delete transactions.
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchExpenses();
                    fetchSettings();
                  }}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-card-bg hover:bg-card-hover text-xs font-semibold text-text-secondary hover:text-white rounded-[12px] border border-border-subtle transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refresh Ledger
                </button>
              </div>

              <ExpenseTable 
                expenses={expenses}
                onEdit={handleEditRedirect}
                onDelete={handleDeleteRedirect}
                isLoading={isLoading}
                isAdminMode={false}
              />
            </section>
          </div>
        </div>
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';
          return (
            <div
              key={toast.id}
              className={`p-4 rounded-[14px] border flex items-start gap-3 shadow-xl pointer-events-auto animate-in slide-in-from-bottom-5 duration-300 ${
                isError 
                  ? 'bg-card-bg border-danger-red/30 text-danger-red' 
                  : isInfo 
                  ? 'bg-card-bg border-info-blue/30 text-info-blue' 
                  : 'bg-card-bg border-success-green/30 text-success-green'
              }`}
            >
              {isError && <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />}
              {isInfo && <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />}
              {!isError && !isInfo && <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />}

              <div className="flex-1 text-xs font-semibold pr-4 text-left leading-normal">{toast.message}</div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-text-secondary hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
