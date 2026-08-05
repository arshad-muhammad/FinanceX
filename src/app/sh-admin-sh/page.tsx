'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ChevronRight, 
  LogOut, 
  ListOrdered, 
  Terminal, 
  Plus, 
  Trash2,
  AlertCircle,
  TrendingUp,
  Image,
  FileSpreadsheet,
  Users,
  CheckCircle,
  Landmark,
  User,
  Shield,
  Wallet,
  Clock,
  Coins,
  Receipt,
  Download,
  Printer,
  Edit2,
  Ban,
  Activity,
  Eye,
  EyeOff,
  Key,
  X,
  Info
} from 'lucide-react';
import { loginAdmin, logoutAdmin, logoutSite, touchSession, changeUserPassword } from '../actions/auth';
import ExpenseForm from '@/components/ExpenseForm';
import ExpenseTable from '@/components/ExpenseTable';
import SummaryCards from '@/components/SummaryCards';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category?: string;
  paidBy: string;
  date: Date | string;
  notes: string | null;
  createdBy?: string;
  updatedBy?: string | null;
  billImageUrl?: string | null;
  paymentSource?: string;
}

interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  username: string;
  details: string;
  timestamp: string;
}

interface SponsorItem {
  name: string;
  budget: number;
  used: number;
  remaining: number;
  txCount: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Treasurer';
  lastLogin: string;
  status: 'Active' | 'Disabled';
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Dashboard Data States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Settings Budget States (for configuring sponsors)
  const [sponsorNameInput, setSponsorNameInput] = useState('');
  const [sponsorBudgetInput, setSponsorBudgetInput] = useState('');
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // New Sponsor Top-up form states
  const [topUpSponsorName, setTopUpSponsorName] = useState('');
  const [topUpAmountInput, setTopUpAmountInput] = useState('');
  const [isTopUpPending, setIsTopUpPending] = useState(false);
  const [isNewSponsor, setIsNewSponsor] = useState(false);

  // General SH Top-up form states
  const [shTopUpAmount, setShTopUpAmount] = useState('');
  const [isShTopUpPending, setIsShTopUpPending] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'ledger' | 'sponsors' | 'receipts' | 'reports' | 'users' | 'logs'>('ledger');

  // Modals / Forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeletingPending, setIsDeletingPending] = useState(false);

  // Receipt Management tab state
  const [receiptTabFilter, setReceiptTabFilter] = useState<'all' | 'missing'>('all');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // User Management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: 'Arshad', email: 'arshad@kvgce.ac.in', role: 'Admin', lastLogin: 'Aug 3, 2026 00:15', status: 'Active' },
    { id: '2', name: 'Numa', email: 'numa@kvgce.ac.in', role: 'Treasurer', lastLogin: 'Aug 2, 2026 18:42', status: 'Active' },
    { id: '3', name: 'Ziyana', email: 'ziyana@kvgce.ac.in', role: 'Treasurer', lastLogin: 'Aug 2, 2026 15:30', status: 'Active' }
  ]);

  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [changingPasswordUser, setChangingPasswordUser] = useState<TeamMember | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isChangingPasswordPending, setIsChangingPasswordPending] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const getStoredAdminKey = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminKey') || '';
    }
    return '';
  };

  const handleAdminLogout = async () => {
    try {
      await logoutAdmin();
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('adminKey');
      }
      setIsAdmin(false);
      setExpenses([]);
      setLogs([]);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  // Check admin status on load & detect page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navs = window.performance.getEntriesByType('navigation');
      if (navs.length > 0 && (navs[0] as PerformanceNavigationTiming).type === 'reload') {
        handleAdminLogout();
        logoutSite().then(() => {
          window.location.href = '/login';
        });
        return;
      }
    }

    const hasAdminCookie = document.cookie.split('; ').some(row => row.startsWith('admin_auth='));
    const hasAdminKey = typeof window !== 'undefined' && !!sessionStorage.getItem('adminKey');
    setIsAdmin(hasAdminCookie && hasAdminKey);
  }, []);

  // Fetch admin console data
  const fetchConsoleData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    try {
      // Fetch expenses
      const expRes = await fetch('/api/expenses');
      if (!expRes.ok) throw new Error('Failed to load expenses');
      const expData = await expRes.json();
      setExpenses(expData);

      // Fetch logs - guarded by x-admin-key header
      const logRes = await fetch('/api/logs', {
        headers: {
          'x-admin-key': getStoredAdminKey()
        }
      });
      if (!logRes.ok) throw new Error('Failed to load activity logs');
      const logData = await logRes.json();
      setLogs(logData);
    } catch (err: any) {
      setDataError(err.message || 'Error syncing admin data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) {
      fetchConsoleData();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsPending(true);

    try {
      const res = await loginAdmin(adminEmail, adminKey);
      if (res.success) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('adminKey', adminKey);
        }
        setIsAdmin(true);
        setAdminKey('');
      } else {
        setLoginError(res.error || 'Invalid Admin Credentials');
      }
    } catch (err) {
      setLoginError('Authentication failed');
    } finally {
      setIsPending(false);
    }
  };

  // Session keepalive heartbeat
  useEffect(() => {
    if (!isAdmin) return;
    touchSession();
    const interval = setInterval(() => {
      touchSession();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Update budget and name settings
  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorNameInput.trim()) {
      alert('Sponsor name is required');
      return;
    }
    setIsUpdatingBudget(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(),
        },
        body: JSON.stringify({ 
          sponsor_budget: sponsorBudgetInput || '0.00',
          sponsor_name: sponsorNameInput,
          increment: false
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update settings');
      }

      showToast('Sponsor configuration updated!', 'success');
      setSponsorNameInput('');
      setSponsorBudgetInput('');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  // Top-up budget increment settings
  const handleAddToBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpSponsorName.trim()) {
      alert('Sponsor name is required');
      return;
    }
    const parsedAmount = parseFloat(topUpAmountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Amount must be positive');
      return;
    }
    setIsTopUpPending(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(),
        },
        body: JSON.stringify({ 
          sponsor_budget: topUpAmountInput,
          sponsor_name: topUpSponsorName,
          increment: true
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to top up settings');
      }

      showToast('Sponsor pool topped up!', 'success');
      setTopUpSponsorName('');
      setTopUpAmountInput('');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Failed to top up settings');
    } finally {
      setIsTopUpPending(false);
    }
  };

  // General SH Top-up fund allocation
  const handleAddShFund = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(shTopUpAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Amount must be positive');
      return;
    }
    setIsShTopUpPending(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(),
        },
        body: JSON.stringify({ 
          sponsor_budget: shTopUpAmount,
          sponsor_name: 'SH', // Default general SH pool name
          increment: true
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to top up SH fund');
      }

      showToast('SH general fund topped up!', 'success');
      setShTopUpAmount('');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Failed to top up SH fund');
    } finally {
      setIsShTopUpPending(false);
    }
  };

  // Form Submit (Standard CRUD)
  const handleFormSubmit = async (expenseData: any) => {
    try {
      const isEditing = !!expenseData.id;
      const url = isEditing ? `/api/expenses/${expenseData.id}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getStoredAdminKey(),
        },
        body: JSON.stringify(expenseData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save expense');
      }

      setIsFormOpen(false);
      setEditingExpense(null);
      showToast(isEditing ? 'Expense updated successfully!' : 'Expense created successfully!', 'success');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
      throw err;
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    setIsDeletingPending(true);

    try {
      const res = await fetch(`/api/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': getStoredAdminKey(),
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete expense');
      }

      setDeletingExpense(null);
      showToast('Ledger entry deleted!', 'success');
      await fetchConsoleData();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setIsDeletingPending(false);
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  // Dynamic calculations for 6 Dashboard Cards & Charts
  const metrics = useMemo(() => {
    // Top-ups represent budget definitions
    const topUpExpenses = expenses.filter(e => e.category === 'Top-up');
    const standardExpenses = expenses.filter(e => e.category !== 'Top-up');

    // 1. Amount Used from SH (Total Sponsor Expense)
    const spentFromSponsor = standardExpenses
      .filter(e => e.paymentSource && e.paymentSource !== 'Other')
      .reduce((sum, item) => sum + item.amount, 0);

    // 2. Total Sponsor Fund
    const totalSponsorBudget = topUpExpenses.reduce((sum, item) => sum + item.amount, 0);

    // 3. Remaining SH Fund
    const remainingSponsorFund = totalSponsorBudget - spentFromSponsor;

    // 4. Personal Amount Used
    const spentFromOther = standardExpenses
      .filter(e => !e.paymentSource || e.paymentSource === 'Other')
      .reduce((sum, item) => sum + item.amount, 0);

    // 5. Total Amount Used
    const totalSpent = spentFromSponsor + spentFromOther;

    // Derived Statistics
    const totalTx = standardExpenses.length;
    const avgTx = totalTx > 0 ? totalSpent / totalTx : 0;
    const highestExpense = standardExpenses.reduce((max, item) => item.amount > max ? item.amount : max, 0);

    const txWithReceipt = standardExpenses.filter(e => !!e.billImageUrl).length;
    const receiptPercentage = totalTx > 0 ? (txWithReceipt / totalTx) * 100 : 0;

    // Time ranges
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayExpense = standardExpenses
      .filter(e => new Date(e.date).toISOString().split('T')[0] === todayStr)
      .reduce((sum, item) => sum + item.amount, 0);

    const weeklyExpense = standardExpenses
      .filter(e => new Date(e.date) >= startOfWeek)
      .reduce((sum, item) => sum + item.amount, 0);

    const monthlyExpense = standardExpenses
      .filter(e => new Date(e.date) >= startOfMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    // Sponsor breakdown list
    const sponsorMap: Record<string, { budget: number; used: number }> = {};
    
    // Populate budgets
    topUpExpenses.forEach(e => {
      const name = e.paidBy || 'Sponsor';
      if (!sponsorMap[name]) sponsorMap[name] = { budget: 0, used: 0 };
      sponsorMap[name].budget += e.amount;
    });

    // Populate spent
    standardExpenses.forEach(e => {
      const name = e.paymentSource;
      if (name && name !== 'Other') {
        if (!sponsorMap[name]) sponsorMap[name] = { budget: 0, used: 0 };
        sponsorMap[name].used += e.amount;
      }
    });

    const sponsorsBreakdownList: SponsorItem[] = Object.entries(sponsorMap).map(([name, data]) => {
      const txCount = standardExpenses.filter(e => e.paymentSource === name).length;
      return {
        name,
        budget: data.budget,
        used: data.used,
        remaining: data.budget - data.used,
        txCount
      };
    });

    // User wise spent list
    const userMap: Record<string, number> = {};
    standardExpenses.forEach(e => {
      const name = e.paidBy || 'Other';
      userMap[name] = (userMap[name] || 0) + e.amount;
    });
    const userSpentList = Object.entries(userMap).map(([name, amount]) => ({ name, amount }));

    return {
      spentFromSponsor,
      totalSponsorBudget,
      remainingSponsorFund,
      spentFromOther,
      totalSpent,
      totalTx,
      avgTx,
      highestExpense,
      receiptPercentage,
      todayExpense,
      weeklyExpense,
      monthlyExpense,
      sponsorsBreakdownList,
      userSpentList
    };
  }, [expenses]);

  // Reports Excel / CSV Exports
  const handleExportCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Source', 'Paid By', 'Logged By', 'Amount', 'Notes'];
    const rows = expenses
      .filter(e => e.category !== 'Top-up')
      .map(e => [
        new Date(e.date).toISOString().split('T')[0],
        e.title,
        e.category || 'General',
        e.paymentSource || 'Other',
        e.paidBy,
        e.createdBy || 'System',
        e.amount.toFixed(2),
        e.notes || ''
      ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sphere_hive_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV export generated successfully!', 'success');
  };

  const handlePrintLedger = () => {
    window.print();
  };

  // User list actions
  const handleToggleUserStatus = (id: string) => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, status: m.status === 'Active' ? 'Disabled' : 'Active' } : m));
    showToast('User account status updated!', 'success');
  };

  const handleDeleteUser = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    showToast('User account removed!', 'success');
  };

  const formatDate = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-accent/20 border-t-primary-accent rounded-full animate-spin" />
      </div>
    );
  }

  // --- 1. RENDER LOGIN SCREEN ---
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="w-full max-w-md relative z-10">
          <div className="bg-card-bg border border-border-subtle rounded-[20px] p-8 shadow-xl text-left">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-11 h-11 rounded-xl bg-primary-accent/5 border border-primary-accent/15 flex items-center justify-center text-primary-accent mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Admin Console Lock</h1>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Email Id
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter Email"
                  className="w-full px-4.5 py-3 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4.5 py-3 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-center tracking-widest text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-3.5 text-text-secondary hover:text-white transition-colors cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="flex items-center gap-2 bg-danger-red/10 border border-danger-red/20 text-danger-red text-xs px-4 py-3 rounded-[12px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4.5 py-3 bg-primary-accent hover:bg-accent-hover text-white rounded-[12px] text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 cursor-pointer shadow-md"
              >
                {isPending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Unlock Administrator Panel
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. RENDER ADMIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-background text-white flex flex-col relative overflow-hidden font-sans print:bg-white print:text-black">
      
      {/* Header */}
      <header className="border-b border-border-subtle bg-background-secondary/90 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpg" 
              alt="Sphere Hive Logo" 
              className="w-10 h-10 object-contain invert rounded-[12px]"
            />
            <div className="text-left">
              <h1 className="text-base font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
                Sphere Hive Console
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-primary-accent/10 border border-primary-accent/15 text-primary-accent font-black tracking-wider">
                  Admin
                </span>
              </h1>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Welcome back, <strong className="text-primary-accent capitalize">Arshad</strong> • Complete Financial Controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 bg-card-bg hover:bg-card-hover border border-border-subtle px-3 py-2 text-xs font-semibold text-text-secondary hover:text-white rounded-[12px] transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 z-10 space-y-6 print:p-0">
        
        {/* SECTION 1: Summary Cards */}
        <section className="print:hidden">
          <SummaryCards expenses={expenses} />
        </section>

        {/* SECTION 2: Quick Financial Stats */}
        <section className="bg-card-bg border border-border-subtle rounded-[20px] p-5 text-left print:hidden">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Financial Stats</h3>
            <p className="text-[10px] text-text-secondary mt-0.5">Real-time stats breakdowns</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs">
            {[
              { label: "Today's Expense", value: formatCurrency(metrics.todayExpense) },
              { label: 'Weekly Expense', value: formatCurrency(metrics.weeklyExpense) },
              { label: 'Monthly Expense', value: formatCurrency(metrics.monthlyExpense) },
              { label: 'Average Transaction', value: formatCurrency(metrics.avgTx) },
              { label: 'Highest Expense', value: formatCurrency(metrics.highestExpense) },
              { label: 'Receipt Upload %', value: metrics.receiptPercentage.toFixed(0) + '%', isAccent: true }
            ].map(stat => (
              <div key={stat.label} className="bg-background border border-border-subtle/50 rounded-[14px] p-3 text-left">
                <span className="text-[9px] font-bold text-text-secondary uppercase block">{stat.label}</span>
                <span className={`text-sm font-black mt-1 block ${stat.isAccent ? 'text-primary-accent' : 'text-white'}`}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: Tab Selector Options */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-background-secondary border border-border-subtle p-2 rounded-[20px] print:hidden">
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'ledger', label: 'Ledger Audit', icon: ListOrdered },
              { id: 'sponsors', label: 'Sponsor Pools', icon: Landmark },
              { id: 'receipts', label: 'Receipt Files', icon: Image },
              { id: 'reports', label: 'Export Reports', icon: FileSpreadsheet },
              { id: 'users', label: 'Team Accounts', icon: Users },
              { id: 'logs', label: 'Developer Logs', icon: Terminal }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-card-bg text-white border border-border-subtle shadow-sm'
                      : 'text-text-secondary hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'ledger' && (
            <div className="flex gap-2">
              <button
                onClick={fetchConsoleData}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-card-bg hover:bg-card-hover text-text-secondary hover:text-white text-xs font-semibold rounded-[12px] border border-border-subtle transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M21 3v5h-5" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary-accent hover:bg-accent-hover text-white text-xs font-bold rounded-[12px] shadow shadow-primary-accent/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Expense
              </button>
            </div>
          )}
        </div>

        {/* Sync Data Error Banner */}
        {dataError && (
          <div className="flex items-center gap-2 bg-danger-red/10 border border-danger-red/20 text-danger-red text-xs px-4 py-3 rounded-[12px] print:hidden">
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
            <p className="font-semibold">{dataError}</p>
            <button onClick={fetchConsoleData} className="ml-auto underline hover:text-white transition-colors">Retry Sync</button>
          </div>
        )}

        {/* Tab view components container */}
        <div className="print:block">
          {isLoadingData ? (
            <div className="flex items-center justify-center py-20 print:hidden">
              <div className="w-6 h-6 border-2 border-primary-accent/20 border-t-primary-accent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'ledger' ? (
            <div className="space-y-4 print:block">
              <ExpenseTable 
                expenses={expenses} 
                isAdminMode={true} 
                onEdit={handleEditClick} 
                onDelete={handleDeleteClick} 
                isLoading={isLoadingData}
              />
            </div>
          ) : activeTab === 'sponsors' ? (
            /* SPONSOR TAB */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left items-start print:hidden">
              {/* Form Card 1: Add Sponsor Fund */}
              <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Sponsor Fund</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Top-up dedicated sponsor allocations</p>
                </div>

                <form onSubmit={handleAddToBudget} className="space-y-4">
                  {/* Toggle New vs Existing */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isNewSponsorCheck"
                      checked={isNewSponsor}
                      onChange={(e) => {
                        setIsNewSponsor(e.target.checked);
                        setTopUpSponsorName('');
                      }}
                      className="rounded border-zinc-700 bg-background text-primary-accent focus:ring-primary-accent"
                    />
                    <label htmlFor="isNewSponsorCheck" className="text-[10px] font-bold text-text-secondary uppercase select-none">
                      Create New Sponsor
                    </label>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Sponsor Name</label>
                    {isNewSponsor || metrics.sponsorsBreakdownList.length === 0 ? (
                      <input
                        type="text"
                        required
                        value={topUpSponsorName}
                        onChange={(e) => setTopUpSponsorName(e.target.value)}
                        placeholder="e.g. Sphere Hive Co."
                        className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs"
                      />
                    ) : (
                      <select
                        value={topUpSponsorName}
                        required
                        onChange={(e) => setTopUpSponsorName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs font-semibold"
                      >
                        <option value="">Select Sponsor</option>
                        {metrics.sponsorsBreakdownList.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Amount to Add (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={topUpAmountInput}
                      onChange={(e) => setTopUpAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isTopUpPending}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-accent hover:bg-accent-hover text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isTopUpPending ? 'Topping up...' : 'Add Sponsor Fund'}
                  </button>
                </form>

                {metrics.sponsorsBreakdownList.length > 0 && !isNewSponsor && (
                  <div className="pt-4 border-t border-border-subtle/50 flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-text-secondary uppercase">Quick Select:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {metrics.sponsorsBreakdownList.map(s => (
                        <button
                          key={s.name}
                          onClick={() => {
                            setTopUpSponsorName(s.name);
                          }}
                          className="px-2.5 py-1.5 bg-background hover:bg-zinc-800 text-[10px] text-zinc-300 font-semibold border border-border-subtle rounded-lg cursor-pointer transition-colors"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form Card 2: Add SH Fund */}
              <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add SH Fund</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Add amount directly to the main SH fund</p>
                </div>

                <form onSubmit={handleAddShFund} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Top-up Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={shTopUpAmount}
                      onChange={(e) => setShTopUpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4.5 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-accent focus:border-transparent transition-all text-xs font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isShTopUpPending}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-accent hover:bg-accent-hover text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isShTopUpPending ? 'Topping up...' : 'Add SH Fund'}
                  </button>
                </form>
              </div>

              {/* Table Card: Sponsor Ledger Allocations */}
              <div className="lg:col-span-2 bg-card-bg border border-border-subtle rounded-[20px] p-6 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Sponsor Ledger Allocations</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Summary table of active sponsor funds</p>
                </div>

                <div className="overflow-x-auto border border-border-subtle/50 rounded-[14px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-subtle bg-background-secondary text-[10px] font-bold text-text-secondary uppercase">
                        <th className="py-2.5 px-4">Sponsor Name</th>
                        <th className="py-2.5 px-4 text-right">Initial Fund</th>
                        <th className="py-2.5 px-4 text-right">Used</th>
                        <th className="py-2.5 px-4 text-right">Remaining</th>
                        <th className="py-2.5 px-4 text-right">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/40 text-xs">
                      {metrics.sponsorsBreakdownList.map((s) => (
                        <tr key={s.name} className="hover:bg-card-hover/40 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-white">{s.name}</td>
                          <td className="py-2.5 px-4 text-right text-zinc-300">₹{s.budget.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-danger-red">₹{s.used.toFixed(2)}</td>
                          <td className={`py-2.5 px-4 text-right font-bold ${s.remaining < 0 ? 'text-danger-red' : 'text-success-green'}`}>
                            ₹{s.remaining.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-text-secondary">{s.txCount} txs</td>
                        </tr>
                      ))}
                      {metrics.sponsorsBreakdownList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-text-secondary font-medium">
                            No sponsor allocations configured.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'receipts' ? (
            /* RECEIPTS TAB */
            <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 text-left space-y-4 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle/50 pb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Receipt Management</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Verify and download billed transaction receipts</p>
                </div>

                <div className="flex gap-1.5 bg-background border border-border-subtle p-1 rounded-[14px]">
                  <button
                    onClick={() => setReceiptTabFilter('all')}
                    className={`px-3 py-1.5 rounded-[12px] text-[10px] font-bold transition-all cursor-pointer ${
                      receiptTabFilter === 'all'
                        ? 'bg-card-bg border border-border-subtle text-white'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    All Expenses
                  </button>
                  <button
                    onClick={() => setReceiptTabFilter('missing')}
                    className={`px-3 py-1.5 rounded-[12px] text-[10px] font-bold transition-all cursor-pointer ${
                      receiptTabFilter === 'missing'
                        ? 'bg-card-bg border border-border-subtle text-white'
                        : 'text-text-secondary hover:text-white'
                    }`}
                  >
                    Missing Receipts
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {expenses
                  .filter(e => e.category !== 'Top-up')
                  .filter(e => receiptTabFilter === 'all' || !e.billImageUrl)
                  .map((e) => {
                    const hasReceipt = !!e.billImageUrl;
                    return (
                      <div 
                        key={e.id}
                        className="bg-background border border-border-subtle rounded-[14px] p-4 flex flex-col justify-between min-h-[140px] hover:border-zinc-700/80 transition-colors"
                      >
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-start gap-3">
                            <span className="text-[9px] font-mono text-text-secondary bg-zinc-900 border border-border-subtle px-1.5 py-0.5 rounded">
                              {formatDate(e.date)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              hasReceipt 
                                ? 'bg-success-green/10 text-success-green border border-success-green/10' 
                                : 'bg-danger-red/10 text-danger-red border border-danger-red/10'
                            }`}>
                              {hasReceipt ? 'Billed' : 'Missing'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{e.title}</h4>
                          <p className="text-[10px] text-text-secondary">Payee: <strong className="text-zinc-300">{e.paidBy}</strong></p>
                        </div>

                        <div className="flex justify-between items-end border-t border-border-subtle/30 pt-3 mt-3">
                          <span className="text-xs font-extrabold text-white">₹{e.amount.toFixed(2)}</span>
                          
                          {hasReceipt ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => setPreviewReceiptUrl(e.billImageUrl || null)}
                                className="p-1 bg-zinc-800 hover:bg-zinc-750 text-text-secondary hover:text-white rounded border border-border-subtle cursor-pointer"
                                title="Preview Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={e.billImageUrl!}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 bg-zinc-800 hover:bg-zinc-750 text-text-secondary hover:text-white rounded border border-border-subtle"
                                title="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-[9px] text-danger-red font-semibold">No Receipt Attached</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : activeTab === 'reports' ? (
            /* REPORTS TAB */
            <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 text-left space-y-5 print:hidden">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Reports & Export Options</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Export logs or print styled ledger accounts</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Export CSV', desc: 'Download standard comma-separated transaction logs', icon: FileSpreadsheet, action: handleExportCSV },
                  { title: 'Export Excel', desc: 'Compile spreadsheet ledger data sheet', icon: FileSpreadsheet, action: handleExportCSV },
                  { title: 'Export PDF Report', desc: 'Generate printable styled PDF audit report', icon: Printer, action: handlePrintLedger },
                  { title: 'Print Ledger', desc: 'Send ledger table directly to browser printing stream', icon: Printer, action: handlePrintLedger }
                ].map((rpt, idx) => {
                  const Icon = rpt.icon;
                  return (
                    <button
                      key={idx}
                      onClick={rpt.action}
                      className="bg-background border border-border-subtle hover:border-zinc-700/80 rounded-[14px] p-5 text-left transition-colors flex flex-col justify-between min-h-[135px] cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-border-subtle flex items-center justify-center text-text-secondary group-hover:text-primary-accent transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="mt-3">
                        <h4 className="text-xs font-bold text-white">{rpt.title}</h4>
                        <p className="text-[10px] text-text-secondary mt-0.5 leading-normal">{rpt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeTab === 'users' ? (
            /* USER MANAGEMENT TAB */
            <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 text-left space-y-4 print:hidden">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">User Account Management</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">Manage team access privileges and statuses</p>
              </div>

              <div className="overflow-x-auto border border-border-subtle/50 rounded-[14px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-background-secondary text-[10px] font-bold text-text-secondary uppercase">
                      <th className="py-2.5 px-4">User Name</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Access Role</th>
                      <th className="py-2.5 px-4">Last Activity</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40 text-xs">
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-card-hover/40 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-white">{member.name}</td>
                        <td className="py-2.5 px-4 text-text-secondary font-mono">{member.email}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            member.role === 'Admin' 
                              ? 'bg-primary-accent/10 border border-primary-accent/15 text-primary-accent' 
                              : 'bg-zinc-800 border border-border-subtle text-zinc-300'
                          }`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-text-secondary font-mono">{member.lastLogin}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            member.status === 'Active' 
                              ? 'bg-success-green/10 text-success-green border border-success-green/15' 
                              : 'bg-zinc-800 text-zinc-500 border border-border-subtle'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5 justify-end">
                            <button
                              onClick={() => setChangingPasswordUser(member)}
                              className="p-1 bg-zinc-800 border border-border-subtle text-text-secondary hover:text-white rounded cursor-pointer transition-colors"
                              title="Change Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(member.id)}
                              className={`p-1 text-xs rounded border cursor-pointer transition-colors ${
                                member.status === 'Active'
                                  ? 'bg-zinc-800 border-border-subtle text-text-secondary hover:text-white'
                                  : 'bg-success-green/15 border-success-green/20 text-success-green hover:bg-success-green/30'
                              }`}
                              title={member.status === 'Active' ? 'Disable Account' : 'Activate Account'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(member.id)}
                              className="p-1 bg-danger-red/10 hover:bg-danger-red border border-danger-red/20 hover:border-transparent text-danger-red hover:text-white rounded cursor-pointer transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHANGE PASSWORD MODAL */}
              {changingPasswordUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="bg-card-bg border border-border-subtle rounded-[20px] max-w-sm w-full p-6 text-left space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Change Account Password</h3>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        Set a new password for <span className="text-white font-semibold font-mono">{changingPasswordUser.email}</span>
                      </p>
                    </div>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newPasswordValue.trim()) return;
                      setIsChangingPasswordPending(true);
                      try {
                        const res = await changeUserPassword(changingPasswordUser.email, newPasswordValue);
                        if (res.success) {
                          showToast(`Password successfully updated for ${changingPasswordUser.name}!`, 'success');
                          setChangingPasswordUser(null);
                          setNewPasswordValue('');
                        } else {
                          alert(res.error || 'Failed to update password');
                        }
                      } catch (err: any) {
                        alert(err.message || 'Error updating password');
                      } finally {
                        setIsChangingPasswordPending(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                          New Password
                        </label>
                        <input
                          type="text"
                          required
                          value={newPasswordValue}
                          onChange={(e) => setNewPasswordValue(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-4 py-2.5 bg-background border border-border-subtle rounded-[14px] text-white focus:outline-none focus:ring-1 focus:ring-primary-accent text-xs font-semibold"
                        />
                      </div>
                      
                      <div className="flex gap-3 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setChangingPasswordUser(null);
                            setNewPasswordValue('');
                          }}
                          className="px-4 py-2 bg-zinc-800 border border-border-subtle hover:text-white text-text-secondary rounded-[12px] text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isChangingPasswordPending}
                          className="px-4 py-2 bg-primary-accent hover:bg-accent-hover text-white rounded-[12px] text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md"
                        >
                          {isChangingPasswordPending ? 'Updating...' : 'Save Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* DEVELOPER LOGS TAB */
            <div className="bg-card-bg border border-border-subtle rounded-[20px] p-6 text-left space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b border-border-subtle/50 pb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Database Audit Log</h3>
                  <p className="text-[10px] text-text-secondary mt-0.5">Chronological system action audits</p>
                </div>
                <button
                  onClick={fetchConsoleData}
                  className="text-[10px] text-text-secondary hover:text-white bg-background border border-border-subtle px-3 py-1.5 rounded-[12px] transition-colors cursor-pointer"
                >
                  Refresh logs
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-secondary space-y-2">
                  <Terminal className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-medium">No activity logs recorded.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-border-subtle space-y-5">
                  {logs.map((log) => {
                    let badgeColor = 'bg-zinc-800 border-zinc-700 text-zinc-400';
                    if (log.action === 'CREATE') badgeColor = 'bg-success-green/10 border-success-green/20 text-success-green';
                    if (log.action === 'UPDATE') badgeColor = 'bg-info-blue/10 border-info-blue/20 text-info-blue';
                    if (log.action === 'DELETE') badgeColor = 'bg-danger-red/10 border-danger-red/20 text-danger-red';
                    if (log.action === 'LOGIN') badgeColor = 'bg-primary-accent/10 border-primary-accent/20 text-primary-accent';

                    return (
                      <div key={log.id} className="relative group text-left">
                        {/* Timeline dot */}
                        <span className="absolute -left-[29.5px] top-1.5 w-2 h-2 rounded-full bg-background border border-border-subtle group-hover:bg-primary-accent transition-colors" />

                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border ${badgeColor}`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] font-bold text-white">
                            {log.username}
                          </span>
                          <span className="text-[9px] font-mono text-text-secondary ml-auto">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary font-mono bg-background/50 p-2.5 rounded-[12px] border border-border-subtle leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- FORM MODAL (Add/Edit) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[20px] shadow-2xl">
            <button
              onClick={() => {
                setIsFormOpen(false);
                setEditingExpense(null);
              }}
              className="absolute top-4 right-4 z-10 p-2 text-text-secondary hover:text-white bg-background hover:bg-zinc-800 rounded-full border border-border-subtle transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <ExpenseForm 
              initialExpense={editingExpense} 
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingExpense(null);
              }}
              isAdminMode={true}
            />
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-md bg-card-bg border border-border-subtle rounded-[20px] p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-danger-red mb-4">
              <div className="w-9 h-9 rounded-xl bg-danger-red/10 border border-danger-red/20 flex items-center justify-center">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delete Ledger Record?</h3>
                <p className="text-[10px] text-text-secondary mt-0.5">This action is permanent and updates budget pools</p>
              </div>
            </div>

            <div className="bg-background p-3 rounded-[14px] border border-border-subtle mb-6 space-y-1">
              <p className="text-xs font-semibold text-white truncate">
                {deletingExpense.title}
              </p>
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span className="font-bold text-white">₹{deletingExpense.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                disabled={isDeletingPending}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700/80 text-white text-xs font-semibold rounded-[12px] transition-colors border border-border-subtle cursor-pointer disabled:opacity-50"
              >
                Keep Entry
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeletingPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-danger-red hover:bg-danger-red/90 text-white text-xs font-bold rounded-[12px] transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Confirm Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RECEIPT FILE PREVIEW MODAL --- */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-2xl bg-card-bg border border-border-subtle rounded-[20px] overflow-hidden shadow-2xl text-left">
            <div className="flex justify-between items-center border-b border-border-subtle p-4">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Receipt Attachment Image</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-text-secondary hover:text-white bg-background border border-border-subtle rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-background flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewReceiptUrl}
                alt="Billed receipt"
                className="max-h-[65vh] object-contain rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none print:hidden">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isInfo = toast.type === 'info';
          return (
            <div
              key={toast.id}
              className={`p-4 rounded-[14px] border flex items-start gap-3 shadow-xl pointer-events-auto animate-in slide-in-from-bottom-5 duration-350 ${
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
