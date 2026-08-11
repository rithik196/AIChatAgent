"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

type IndiaEmploymentFetchingWidgetProps = {
  data?: {
    title?: string;
    subtitle?: string;
    auto_advance_ms?: number;
    next_message?: string;
    silent?: boolean;
  };
};

export function IndiaEmploymentFetchingWidget({ data }: IndiaEmploymentFetchingWidgetProps) {
  const title = data?.title ?? "Fetching Employment Details...";
  const subtitle = data?.subtitle ?? "Retrieving and verifying your employment information...";
  const autoAdvanceMs = data?.auto_advance_ms ?? 0;
  const nextMessage = data?.next_message ?? "";
  const silent = data?.silent ?? false;
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!silent || !nextMessage || autoAdvanceMs <= 0) return;
    const timer = window.setTimeout(() => {
      setCompleted(true);
      window.dispatchEvent(new CustomEvent("mock-send-message", { detail: `__SYS__${nextMessage}` }));
    }, autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [autoAdvanceMs, nextMessage, silent]);

  if (completed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <div className="rounded-[16px] border border-[#D7E7FF] bg-[#F4F8FF] p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="relative h-6 w-6 shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="absolute inset-0 rounded-full border-[3px] border-[#BED2F8] border-t-[#2D69D7]"
              />
            </div>
            <h3 className="text-[17px] font-semibold leading-6 text-[#2458B8]">{title}</h3>
          </div>
          <p className="text-[13px] leading-5 text-[#5A6C82]">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}