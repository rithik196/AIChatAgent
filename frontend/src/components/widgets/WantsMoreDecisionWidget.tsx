"use client";

import React from "react";
import { motion } from "framer-motion";

interface WantsMoreDecisionWidgetProps {
  data?: {
    maxAmount?: number;
  };
}

export function WantsMoreDecisionWidget({ data }: WantsMoreDecisionWidgetProps) {
  const maxAmount = data?.maxAmount ?? 0;

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
        <h3 className="text-base font-bold text-slate-900 mb-2">Amount Confirmation</h3>
        <p className="text-sm text-slate-700 mb-1">
          Your maximum eligible amount is {maxAmount.toLocaleString("en-IN")} SAR.
        </p>
        <p className="text-sm text-slate-700 mb-4">
          Is this amount okay for you, or do you want more?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: {
                    visibleText: "Amount is okay",
                    systemText: "__SYS__accepted_max_offer",
                  },
                })
              );
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
          >
            Amount is Okay
          </button>
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: {
                    visibleText: "I want more amount",
                    systemText: "__SYS__higher_amount_requested",
                  },
                })
              );
            }}
            className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
          >
            I Want More
          </button>
        </div>
      </div>
    </motion.div>
  );
}
