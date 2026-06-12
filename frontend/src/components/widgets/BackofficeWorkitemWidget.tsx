"use client";

import React from "react";
import { motion } from "framer-motion";

interface BackofficeWorkitemWidgetProps {
  data?: {
    workitem?: Record<string, unknown>;
  };
}

export function BackofficeWorkitemWidget({ data }: BackofficeWorkitemWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
      className="w-full max-w-sm mt-4"
    >
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        {/* Animated Background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-[50px] pointer-events-none mix-blend-screen" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner relative">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-500">
                <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white tracking-tight leading-tight">Review Initiated</h3>
              <p className="text-[11px] font-medium text-amber-500/80 uppercase tracking-wider mt-0.5">Reference Generated</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 mb-6 backdrop-blur-sm">
            <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
              Your request for a higher amount has been sent to our Relationship Manager for review. Our team will contact you shortly.
            </p>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent my-3" />
            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              You can wait, or continue immediately with your currently eligible maximum amount.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", { detail: "Continue with current eligible amount" })
              );
            }}
            className="w-full py-3.5 bg-white text-slate-900 text-[14px] font-semibold rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300"
          >
            Continue with Eligible Amount
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
