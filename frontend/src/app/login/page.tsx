"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  ArrowLeft,
  LogIn,
  KeyRound,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  BookOpen,
  Video,
  Users,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { verifyTotpToken } from "@/lib/totp";
import { Smartphone, Shield } from "lucide-react";

function LoginFormContent() {
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // Sign In State
  const [identifier, setIdentifier] = useState("");
  const [is2faStep, setIs2faStep] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState<string | null>(null);
  const [is2faVerified, setIs2faVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Common UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot / Reset Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "success">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Check URL query parameters for reset link from email (?reset_token=...&email=...)
  useEffect(() => {
    const tokenFromUrl = searchParams.get("reset_token");
    const emailFromUrl = searchParams.get("email");
    if (tokenFromUrl) {
      setResetCode(tokenFromUrl);
      if (emailFromUrl) setResetEmail(emailFromUrl);
      setForgotStep("verify");
      setIsForgotModalOpen(true);
    }
  }, [searchParams]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your registered institutional email.");
      return;
    }

    const emailKey = identifier.trim().toLowerCase();
    const is2faActive = typeof window !== "undefined" && (
      localStorage.getItem(`smartedu_2fa_enabled_${emailKey}`) === "true"
    );
    
    if (is2faActive && !is2faVerified) {
      setIs2faStep(true);
      setTotpError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(identifier.trim(), password);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Authentication failed. Check your credentials.";
      setError(rawMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || totpCode.trim().length !== 6) {
      setTotpError("Please enter the 6-digit code from Microsoft Authenticator.");
      return;
    }

    const emailKey = identifier.trim().toLowerCase();
    const secret = typeof window !== "undefined"
      ? (localStorage.getItem(`smartedu_2fa_secret_${emailKey}`) || localStorage.getItem(`smartedu_2fa_secret`))
      : null;

    if (!secret) {
      setTotpError("Two-factor authentication secret not found for this account.");
      return;
    }

    if (!verifyTotpToken(secret, totpCode.trim())) {
      setTotpError("Invalid authentication code. Please check Microsoft Authenticator.");
      return;
    }

    setIs2faVerified(true);
    setIsLoading(true);
    setTotpError(null);
    try {
      await login(identifier.trim(), password);
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : "Authentication failed.";
      setError(rawMsg);
      setIs2faStep(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError("Please enter your registered institutional email address.");
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const apiUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/v1`
          : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || "Failed to send reset email.");
      }
      setForgotStep("verify");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setResetError("Please enter the 6-digit verification code or reset token from your email.");
      return;
    }
    if (newPassword.length < 12) {
      setResetError("Password must be at least 12 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("New passwords do not match.");
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const apiUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/v1`
          : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");
      const isOtp = /^\d{6}$/.test(resetCode.trim());
      const payload: Record<string, string> = {
        new_password: newPassword,
      };
      if (isOtp) {
        payload.otp = resetCode.trim();
        payload.email = resetEmail.trim();
      } else {
        payload.token = resetCode.trim();
        if (resetEmail.trim()) payload.email = resetEmail.trim();
      }

      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || "Invalid or expired reset code.");
      }

      setResetSuccessMsg(data.message || "Password has been successfully updated.");
      setForgotStep("success");
      setIdentifier(resetEmail.trim());
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  const closeResetModal = () => {
    setIsForgotModalOpen(false);
    setForgotStep("request");
    setResetError(null);
    setResetSuccessMsg(null);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Full-bleed Campus Sunset Backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000"
        style={{ backgroundImage: "url('/campus-hero-v2.png')" }}
      />
      {/* Cinematic Lighting Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/45 to-slate-900/60 backdrop-blur-[1.5px]" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Grid Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        
        {/* ─── LEFT HERO: UNIFIED CAMPUS BRANDING & 2x2 BENTO (7 Cols) ─── */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-7 py-2">
          {/* Logo & Brand Pill */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/90 backdrop-blur-md border border-white/60 p-2 shadow-lg flex items-center justify-center">
              <img src="/uniflow-logo.png" alt="UniFlow" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-white drop-shadow-sm">UniFlow</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/40 text-blue-200">
                  Campus Suite
                </span>
              </div>
              <p className="text-xs text-blue-200/80 font-medium">Next-Generation Higher Education Platform</p>
            </div>
          </div>

          {/* Headline & Description */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-md">
              Unified Campus <br />
              <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-200 bg-clip-text text-transparent">
                for a Smarter Tomorrow
              </span>
            </h1>
            <p className="text-sm sm:text-base text-slate-100/90 font-normal leading-relaxed max-w-xl drop-shadow">
              Experience a seamless academic journey with AI-driven insights, automated attendance, dynamic scheduling, and interactive learning — all in one unified platform.
            </p>
          </div>

          {/* 2x2 Bento Feature Grid */}
          <div className="grid grid-cols-2 gap-3.5 max-w-xl">
            <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-md hover:bg-white/20 transition-all">
              <div className="h-9 w-9 rounded-xl bg-blue-500/30 text-blue-100 border border-blue-300/40 flex items-center justify-center mb-2.5">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white">Learning &amp; Assessment</h3>
              <p className="mt-1 text-[11px] text-slate-200/80 leading-snug">Structured modules, continuous assessment &amp; syllabus progress.</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-md hover:bg-white/20 transition-all">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/30 text-indigo-100 border border-indigo-300/40 flex items-center justify-center mb-2.5">
                <Video className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white">Examination Management</h3>
              <p className="mt-1 text-[11px] text-slate-200/80 leading-snug">Published schedules, controlled assessments, and verified results.</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-md hover:bg-white/20 transition-all">
              <div className="h-9 w-9 rounded-xl bg-sky-500/30 text-sky-100 border border-sky-300/40 flex items-center justify-center mb-2.5">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white">Institutional Governance</h3>
              <p className="mt-1 text-[11px] text-slate-200/80 leading-snug">Role-based access control for Students, Faculty, HODs, &amp; Deans.</p>
            </div>

            <div className="bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shadow-md hover:bg-white/20 transition-all">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/30 text-emerald-100 border border-emerald-300/40 flex items-center justify-center mb-2.5">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-xs text-white">Academic Insights</h3>
              <p className="mt-1 text-[11px] text-slate-200/80 leading-snug">Real-time attendance analytics, grade projections &amp; analytics.</p>
            </div>
          </div>

          {/* Bottom Tagline */}
          <div className="flex items-center gap-3 text-[11px] font-bold tracking-widest text-blue-200/80 uppercase pt-1">
            <span className="h-px w-8 bg-blue-300/40" />
            <span>Empowering Education Through Technology</span>
            <span className="h-px w-8 bg-blue-300/40" />
          </div>
        </div>

        {/* ─── RIGHT CARD: FLOATING FROSTED GLASS SIGN-IN CARD (5 Cols) ─── */}
        <div className="w-full lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 p-7 sm:p-9 shadow-2xl shadow-black/30 space-y-6">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group"
                >
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Campus Home</span>
                </Link>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Online
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-600/10 border border-blue-600/20 p-2 flex items-center justify-center shrink-0">
                  <img src="/uniflow-logo.png" alt="UniFlow" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Welcome Back
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sign in to access your academic workspace
                  </p>
                </div>
              </div>
            </div>

            {/* Production Sign In Form */}
            {is2faStep ? (
              <form onSubmit={handle2faSubmit} className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/60 text-center space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Two-Factor Authentication</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Open <strong className="text-blue-700">Microsoft Authenticator</strong> on your phone and enter the 6-digit code for <span className="font-mono text-slate-800">{identifier}</span>.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>6-Digit Verification Code</span>
                    <span className="text-[10px] text-blue-600 font-semibold">TOTP RFC 6238</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setTotpCode(val);
                      if (val.length === 6) setTotpError(null);
                    }}
                    placeholder="000 000"
                    autoFocus
                    className="w-full h-12 text-center text-xl font-mono tracking-[0.35em] font-bold rounded-xl border border-blue-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  />
                </div>

                {totpError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{totpError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      <span>Verify &amp; Enter Workspace</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIs2faStep(false)}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer pt-1"
                >
                  ← Back to standard credentials
                </button>
              </form>
            ) : (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {/* Institutional Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Institutional Email or Registration No.</span>
                  <span className="text-[11px] text-slate-400 font-mono font-normal">e.g. 2411021060402</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="e.g. 2411021060402 or user@smartedu.edu"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Account Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(identifier.trim());
                      setResetError(null);
                      setForgotStep("request");
                      setIsForgotModalOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter account password"
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              
              {/* Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 font-medium"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In to UniFlow</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            </form>
            )}

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 text-center text-slate-400 text-[11px] space-y-1">
              <p className="font-medium text-slate-500">Authorized university account holders only.</p>
              <p className="text-[10px]">Secure institutional authentication and protected sessions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FORGOT & RESET PASSWORD MODAL (LIGHT THEME & GLASSMORPHISM) ─── */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/80 bg-white/95 backdrop-blur-xl p-6 sm:p-7 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      {forgotStep === "request" && "Password Recovery"}
                      {forgotStep === "verify" && "Verify & Set Password"}
                      {forgotStep === "success" && "Password Reset Complete"}
                    </h3>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      {forgotStep === "request" && "Enter your registered email to receive reset instructions"}
                      {forgotStep === "verify" && "Enter verification code and your new password"}
                      {forgotStep === "success" && "You can now sign in with your new password"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeResetModal}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                  aria-label="Close password recovery"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Error Box */}
              {resetError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <span>{resetError}</span>
                </div>
              )}

              {/* Step 1: Request Reset */}
              {forgotStep === "request" && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Institutional Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="your.email@university.edu"
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep("verify")}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Already have a code?
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {resetLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Send Code</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify Code and New Password */}
              {forgotStep === "verify" && (
                <form onSubmit={handleConfirmReset} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="your.email@university.edu"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="6-digit code or paste token"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 12 characters"
                        className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep("request")}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      &larr; Resend code
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {resetLoading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Success */}
              {forgotStep === "success" && (
                <div className="text-center py-4 space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900">
                      Password Successfully Reset
                    </h4>
                    <p className="text-xs text-slate-500">
                      {resetSuccessMsg || "Your account credentials have been updated."}
                    </p>
                  </div>
                  <button
                    onClick={closeResetModal}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading Portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
