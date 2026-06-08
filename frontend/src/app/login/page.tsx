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
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, purpose: "login" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError("Failed to send OTP. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
      return;
    }
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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\s/g, ""), otp: entered, purpose: "login" }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "Invalid OTP. Please try again.");
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
                  A 4-digit code was sent to your Mobile Number{" "}
                  <span className="font-medium text-slate-700">+966 {phone}</span>
                </p>
              </div>
              {/* WhatsApp delivery notice */}
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-green-600" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 2.136.564 4.14 1.545 5.875L0 24l6.335-1.524A11.949 11.949 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.962-1.345l-.357-.212-3.692.889.924-3.585-.233-.369A9.825 9.825 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z"/>
                </svg>
                <p className="text-xs text-green-700">OTP sent via Mobile Number. Check your Phone.</p>
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
