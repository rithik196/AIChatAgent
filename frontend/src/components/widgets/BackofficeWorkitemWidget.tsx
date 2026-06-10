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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: "#FFFFFF",
          backgroundImage:
            "linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)",
        }}
      >
        <h3 className="text-base font-bold text-slate-900 mb-2">Backoffice Review Initiated</h3>
        <p className="text-sm text-slate-700 mb-3">
          Your request for a higher amount has been raised to our Relationship Manager for review.
        </p>
        <p className="text-xs text-slate-500 mb-4">Reference has been created and our team will contact you.</p>

        <button
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("mock-send-message", { detail: "Continue with current eligible amount" })
            );
          }}
          className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
