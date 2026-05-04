"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Stage = "phone" | "otp" | "product";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first OTP input
  useEffect(() => {
    if (stage === "otp") {
      otpRefs.current[0]?.focus();
    }
  }, [stage]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = phone.replace(/\s/g, "");
    if (!/^(05|5)\d{8}$/.test(cleaned) && !/^\d{10,15}$/.test(cleaned)) {
      setError("Please enter a valid mobile number");
      return;
    }
    setLoading(true);
    // Generate a mock OTP and show it
    const mockOtp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(mockOtp);
    // Simulate SMS delay
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setStage("otp");
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const entered = otp.join("");
    if (entered.length < 4) {
      setError("Please enter the 4-digit OTP");
      return;
    }
    if (entered !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }
    setLoading(true);
    // Store session
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\s/g, "") }),
      });
      if (!res.ok) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
    setLoading(false);
    setStage("product");
  };

  const selectProduct = (product: string) => {
    router.push(`/${product}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Raya</h1>
          <p className="text-sm text-slate-500 mt-1">Your Agentic Finance Advisor</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {/* ── STAGE: PHONE ─────────────────────── */}
          {stage === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Welcome</h2>
                <p className="text-sm text-slate-500 mt-1">Enter your mobile number to get started</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <span className="text-slate-500 text-sm mr-2 font-medium">+966</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400 text-base"
                    placeholder="05X XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoFocus
                    maxLength={12}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* ── STAGE: OTP ───────────────────────── */}
          {stage === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">Verify OTP</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the 4-digit code sent to <span className="font-medium text-slate-700">+966 {phone}</span>
                </p>
              </div>
              {/* Mock OTP hint (for demo) */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-center">
                <p className="text-xs text-blue-600">Demo OTP: <span className="font-bold text-blue-800 tracking-widest">{generatedOtp}</span></p>
              </div>
              <div className="flex justify-center gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="w-14 h-14 text-center text-xl font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition-all"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.join("").length < 4}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStage("phone"); setOtp(["", "", "", ""]); setError(""); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Change number
              </button>
            </form>
          )}

          {/* ── STAGE: PRODUCT SELECT ────────────── */}
          {stage === "product" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Welcome!</h2>
                <p className="text-sm text-slate-500 mt-1">Select a product to begin your journey</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: "cash_finance", label: "Cash Finance", desc: "Personal cash financing up to SAR 350K", icon: "💰" },
                  { id: "home_loan", label: "Home Loan", desc: "Home financing with competitive rates", icon: "🏠" },
                  { id: "personal_loan", label: "Personal Loan", desc: "Flexible personal financing", icon: "💳" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p.id)}
                    className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all text-left group"
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 group-hover:text-blue-700">{p.label}</p>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
