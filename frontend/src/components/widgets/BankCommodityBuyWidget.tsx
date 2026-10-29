"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, ShoppingCart } from "lucide-react";

interface BankCommodityBuyWidgetProps {
  data?: {
    amount?: number;
    commodity?: string;
  };
}

export function BankCommodityBuyWidget({ data }: BankCommodityBuyWidgetProps) {
  const [submitted, setSubmitted] = useState(false);
  const amount = data?.amount;
  const validAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mt-4"
    >
      <div className="journey-surface p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#D5DCE3] flex items-center justify-center shadow-sm shrink-0">
            <ShoppingCart size={20} className="text-[#1B739E]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="journey-heading">Bank Commodity Buy</h3>
              <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] leading-3 font-semibold text-emerald-700">
                Auto Executed
              </span>
            </div>
            <p className="journey-label mt-1">Bank Acquired Asset</p>
          </div>
        </div>

        <div className="journey-panel p-4 mb-4">
          <dl className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="journey-label">Commodity Traded:</dt>
              <dd className="journey-value break-words">{data?.commodity ?? "Crude Palm Oil"}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="journey-label">Purchase Cost</dt>
              <dd className="journey-value break-words">
                {validAmount ? amount.toLocaleString("en-IN") : "--"} SAR
              </dd>
            </div>
          </dl>

          <div className="flex items-start gap-2 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <ShieldCheck size={18} className="shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] leading-5 text-emerald-800">
              Bank has taken legal &amp; constructive possession. The bank now legally owns the asset and can offer it for Murabaha sale.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!validAmount || submitted}
          onClick={() => {
            if (!validAmount || submitted) return;
            setSubmitted(true);
            window.dispatchEvent(
              new CustomEvent("mock-send-message", {
                detail: {
                  visibleText: "Proceed to Murabaha Transaction execution",
                  systemText: "__SYS__execute_murabaha_ownership_transfer",
                },
              })
            );
          }}
          className="flex w-full items-center justify-center gap-2 px-3 py-3.5 journey-widget-button text-[14px]"
        >
          <span>Execute Murabaha Ownership Transfer</span>
          <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}