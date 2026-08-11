"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CalendarDays, ShieldCheck, UserRound } from "lucide-react";

type IndiaBureauVerifiedWidgetProps = {
  data?: {
    title?: string;
    subtitle?: string;
    applicant?: string;
    date_of_birth?: string;
    bureau_status?: string;
    auto_advance_ms?: number;
    next_message?: string;
    silent?: boolean;
  };
};

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[#E4EBF2] bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[#2B5DA8]">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em]">{label}</span>
      </div>
      <p className="text-[14px] font-semibold leading-5 text-[#0D141A]">{value}</p>
    </div>
  );
}

export function IndiaBureauVerifiedWidget({ data }: IndiaBureauVerifiedWidgetProps) {
  const title = data?.title ?? "Bureau Details Verified Successfully!";
  const subtitle = data?.subtitle ?? "Your bureau details have been retrieved and verified. You can now continue with your loan application.";
  const applicant = data?.applicant ?? "Narendar Singh";
  const dateOfBirth = data?.date_of_birth ?? "15/01/1990";
  const bureauStatus = data?.bureau_status ?? "Verified";
  const autoAdvanceMs = data?.auto_advance_ms ?? 2200;
  const nextMessage = data?.next_message ?? "india_employment_fetching";
  const silent = data?.silent ?? true;

  useEffect(() => {
    if (!silent) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("mock-send-message", { detail: `__SYS__${nextMessage}` }));
    }, autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [autoAdvanceMs, nextMessage, silent]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-[#D7EBD9] bg-[#F3FBF4] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22A447] text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[18px] font-semibold leading-6 text-[#14833B]">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#425768]">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile icon={<UserRound className="h-4 w-4" />} label="Applicant" value={applicant} />
          <InfoTile icon={<CalendarDays className="h-4 w-4" />} label="Date Of Birth" value={dateOfBirth} />
          <InfoTile icon={<ShieldCheck className="h-4 w-4" />} label="Bureau Status" value={bureauStatus} />
        </div>
      </div>
    </motion.div>
  );
}