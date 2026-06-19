"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Stage = "phone" | "otp" | "product";

const productChoices = [
  { id: "cash_finance", label: "Cash Finance", desc: "Personal cash financing up to SAR 350K" },
  { id: "home_loan", label: "Home Loan", desc: "Home financing with competitive rates" },
  { id: "personal_loan", label: "Personal Loan", desc: "Flexible personal financing" },
];

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [postLoginState, setPostLoginState] = useState<"idle" | "success">("idle");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const postLoginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProductStage = stage === "product";

  useEffect(() => {
    if (stage === "otp") {
      otpRefs.current[0]?.focus();
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      if (postLoginTimerRef.current) {
        clearTimeout(postLoginTimerRef.current);
      }
      if (landingTimerRef.current) {
        clearTimeout(landingTimerRef.current);
      }
    };
  }, []);

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
    setPostLoginState("idle");
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

    if (postLoginTimerRef.current) {
      clearTimeout(postLoginTimerRef.current);
    }
    if (landingTimerRef.current) {
      clearTimeout(landingTimerRef.current);
    }
    postLoginTimerRef.current = setTimeout(() => {
      setLoading(false);
      setPostLoginState("success");
      landingTimerRef.current = setTimeout(() => {
        setStage("product");
      }, 900);
    }, 2000);
  };

  const selectProduct = (product: string) => {
    router.push(`/${product}`);
  };

  if (isProductStage) {
    return (
      <div className="min-h-screen bg-[#FFFFFF]">
        <div className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] overflow-hidden">
          <div className="w-full px-6 py-3.5 flex items-center gap-3">
            <div className="h-10 w-10 bg-white/85 flex items-center justify-center shrink-0">
              <Image
                src="/assets/newgen_logo.png"
                alt="Newgen"
                width={28}
                height={28}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <h3 className="text-[18px] leading-5 font-semibold text-slate-900">Finance Agent</h3>
          </div>
          <div className="h-[2px] w-full bg-[#FB8B23]" />
        </div>

        <div className="min-h-[calc(100vh-78px)] flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-7 px-2 py-3">
            <div className="text-center space-y-4">
              <h2 className="text-[24px] leading-none font-bold text-[#0D141A]">Welcome!</h2>
              <p className="text-[14px] leading-none font-normal text-[#0D141A] max-w-[95%] mx-auto text-center">
                I am your personal finance assistant. Let&apos;s start your digital finance application.
              </p>
              <p className="text-[14px] leading-none font-semibold text-[#0D141A] pt-2 text-center">Choose a category to begin</p>
            </div>

            <div className="space-y-3 pt-1">
              {productChoices.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p.id)}
                  className="w-full rounded-full px-6 py-3.5 text-center text-white text-[14px] leading-5 font-semibold shadow-[0_8px_18px_-10px_rgba(15,76,120,0.6)] transition-all hover:brightness-105 active:scale-[0.99]"
                  style={{ background: "linear-gradient(to left, #0F4C78, #3CC2E1)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[linear-gradient(180deg,#F8FBFD_0%,#EEF5F9_100%)] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#FB8B23]/10 blur-[90px]" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#1B739E]/12 blur-[110px]" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-[#C24231]/8 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] journey-widget-button border border-transparent shadow-lg">
            <span className="text-[22px] font-semibold">R</span>
          </div>
          <h1 className="mt-4 journey-heading">Raya</h1>
          <p className="journey-label mt-1">Your Agentic Finance Advisor</p>
        </div>

        <div className="journey-surface p-5 sm:p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.28)]">
          {stage === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div className="text-center space-y-2">
                <h2 className="journey-heading">Welcome</h2>
                <p className="journey-body text-[#425768]">Enter your mobile number to get started</p>
              </div>

              <div>
                <label className="journey-label mb-1.5 block">
                  Mobile Number
                </label>
                <div className="flex items-center rounded-[16px] border border-[#D5DCE3] bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-[#1B739E]/30 focus-within:border-[#1B739E] transition-all">
                  <span className="text-[#425768] text-[14px] mr-2 font-semibold">+966</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="flex-1 bg-transparent border-none focus:outline-none text-[14px] leading-[16px] font-semibold text-[#0D141A] placeholder:text-[#425768]"
                    placeholder="05X XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoFocus
                    maxLength={12}
                  />
                </div>
              </div>

              {error && <p className="text-[14px] leading-[16px] font-normal text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3 journey-widget-button transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0B385A]/30 border-t-[#0B385A] rounded-full animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {stage === "otp" && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              {postLoginState === "success" && (
                <div className="journey-panel px-4 py-3 text-center">
                  <p className="journey-heading">Login successful</p>
                  <p className="journey-label mt-1">Taking you to your landing page...</p>
                </div>
              )}
              <div className="text-center space-y-2">
                <h2 className="journey-heading">Verify OTP</h2>
                <p className="journey-body text-[#425768]">
                  A 4-digit code was sent to your Mobile Number{" "}
                  <span className="font-semibold text-[#0D141A]">+966 {phone}</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5 journey-panel px-4 py-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-[#1B739E]" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 2.136.564 4.14 1.545 5.875L0 24l6.335-1.524A11.949 11.949 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-4.962-1.345l-.357-.212-3.692.889.924-3.585-.233-.369A9.825 9.825 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z"/>
                </svg>
                <p className="journey-label">OTP sent via Mobile Number. Check your Phone.</p>
              </div>

              <div className="flex justify-center gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="w-14 h-14 text-center text-[14px] leading-[16px] font-semibold bg-white border border-[#D5DCE3] rounded-[16px] focus:ring-2 focus:ring-[#1B739E]/30 focus:border-[#1B739E] text-[#0D141A] transition-all"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              {error && <p className="text-[14px] leading-[16px] font-normal text-red-600 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.join("").length < 4}
                className="w-full py-3 journey-widget-button transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0B385A]/30 border-t-[#0B385A] rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage("phone");
                  setOtp(["", "", "", ""]);
                  setError("");
                }}
                className="w-full text-[14px] leading-[16px] font-semibold text-[#425768] hover:text-[#0D141A]"
              >
                Change number
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[12px] leading-[16px] font-normal text-[#425768] mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
