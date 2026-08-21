"use client";

import React from "react";
import { motion } from "framer-motion";

interface IndiaDisbursementSuccessWidgetProps {
  data?: {
    customerName?: string;
    referenceNumber?: string;
    bankName?: string;
    earlySettlementMessage?: string;
    pleasureMessage?: string;
    supportMessage?: string;
  };
}

export function IndiaDisbursementSuccessWidget({
  data,
}: IndiaDisbursementSuccessWidgetProps) {
  const customerName = data?.customerName || "Narendar Singh";
  const referenceNumber =
    data?.referenceNumber || "PL-2026-XXXXXX1841";
  const bankName = data?.bankName || "ICICI Bank";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm mt-3 space-y-3"
    >
      {/* Success Header */}
      <div className="journey-panel p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F7EE] border border-[#8FD1A8]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M5 12.5L9.5 17L19 7.5"
                stroke="#159447"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-[15px] font-bold text-[#173E8D]">
              Congratulations, {customerName}!
            </p>

            <p className="mt-1 text-[13px] text-[#1F6C3D]">
              Your loan has been disbursed in your account.
            </p>
          </div>
        </div>
      </div>

      {/* Reference Number */}
      <div className="journey-panel p-4">
        <SummaryField
          label="Reference Number"
          value={referenceNumber}
        />
      </div>

      {/* Early Settlement */}
      <MessageRow
        icon="calendar"
        text={
          data?.earlySettlementMessage ||
          "Should you wish to make an early settlement, please contact us at least 30 days in advance."
        }
      />

      {/* Pleasure */}
      <MessageRow
        icon="smile"
        text={
          data?.pleasureMessage ||
          `It has been a genuine pleasure assisting you today, ${customerName}. We wish you every success with your plans, and we look forward to continuing to be of service.`
        }
      />

      {/* Support */}
      <MessageRow
        icon="support"
        text={
          data?.supportMessage ||
          "Our team is available 24 hours a day, 7 days a week should you need any assistance. Simply call 022-1234-5678 or return to this assistant at any time."
        }
      />

      {/* Thank You */}
      <MessageRow
        icon="bank"
        text={`Thank you for choosing ${bankName}.`}
      />
    </motion.div>
  );
}

function SummaryField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="journey-label text-[#2C62C8]">
        {label}
      </p>

      <p className="mt-1 text-[13px] font-semibold text-[#173E8D]">
        {value}
      </p>
    </div>
  );
}

function MessageRow({
  icon,
  text,
}: {
  icon: "calendar" | "smile" | "support" | "bank";
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 px-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D5DCE3] bg-[#F9FBFC] text-[#1B739E]">
        {icon === "calendar" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect
              x="4"
              y="5"
              width="16"
              height="15"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 3V7M16 3V7M4 10H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}

        {icon === "smile" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
            <path
              d="M8 14C9 16 11 17 12 17C13 17 15 16 16 14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}

        {icon === "support" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13V11C5 7.13 8.13 4 12 4C15.87 4 19 7.13 19 11V13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x="3"
              y="11"
              width="4"
              height="7"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="17"
              y="11"
              width="4"
              height="7"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}

        {icon === "bank" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 9L12 4L21 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M5 10V18M9 10V18M15 10V18M19 10V18"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M3 20H21"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <p className="journey-label flex-1 pt-1 leading-5 text-[#173E8D]">
        {text}
      </p>
    </div>
  );
}