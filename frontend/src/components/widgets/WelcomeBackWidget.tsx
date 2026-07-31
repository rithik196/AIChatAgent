"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type WelcomeBackWidgetProps = {
  data?: {
    name?: string;
    auto_advance_ms?: number;
    next_message?: string;
    silent?: boolean;
  };
};

export function WelcomeBackWidget({ data }: WelcomeBackWidgetProps) {
  const customerName = data?.name?.trim() || "Narendra Kumar";
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = React.useState(true);
  const autoAdvanceMs = data?.auto_advance_ms ?? 4000;
  const nextMessage = data?.next_message ?? "welcome_back_complete";
  const silent = data?.silent ?? true;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const detail = silent ? `__SYS__${nextMessage}` : nextMessage;
      window.dispatchEvent(new CustomEvent("mock-send-message", { detail }));
      setIsVisible(false);
      timerRef.current = null;
    }, autoAdvanceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoAdvanceMs, nextMessage, silent]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.18)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="journey-surface w-full max-w-md mx-4 p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#ECF7E9] flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-[#4BAF50]">
            <path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h3 className="journey-heading text-[20px] mb-8">Welcome Back! {customerName}</h3>

        <div className="w-10 h-10 mx-auto relative">
          <div className="absolute inset-0 rounded-full border-[4px] border-[#D8E2F4]" />
          <div className="absolute inset-0 rounded-full border-[4px] border-transparent border-t-[#4C77C3] border-l-[#4C77C3] animate-spin" />
        </div>
      </motion.div>
    </motion.div>
  );
}