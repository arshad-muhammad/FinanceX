"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginSite } from "../actions/auth";
import { Lock, ArrowRight, ShieldAlert, Eye, EyeOff } from "lucide-react";
      
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter the password.");
      return;
    }

    startTransition(async () => {
      const result = await loginSite(email, password);
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.error || "Access denied.");
      }
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden px-4">
      {/* Dynamic Glowing Orange/Amber Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-orange-600/20 blur-[100px] pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-amber-600/10 blur-[120px] pointer-events-none animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="w-full max-w-md z-10">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Treasurer Login
          </h1>
          <p className="text-sm text-zinc-400 mt-2">Sign in to your account</p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-xs"
                disabled={isPending}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-4 pr-12 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-xs"
                  disabled={isPending}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all duration-200 cursor-pointer font-bold text-xs flex items-center justify-center gap-2"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Error Message with Fade-in */}
            {error && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
                <ShieldAlert className="w-5 h-5 text-rose-450 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
