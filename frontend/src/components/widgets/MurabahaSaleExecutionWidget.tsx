"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, ArrowRight, ShieldCheck } from "lucide-react";

interface MurabahaSaleExecutionWidgetProps {
  data?: {
    amount?: number;
    total_payable?: number;
    tenure?: number;
    monthly_installment?: number;
    commodity?: string;
  };
}

export function MurabahaSaleExecutionWidget({ data }: MurabahaSaleExecutionWidgetProps) {
  const [submitted, setSubmitted] = useState(false);
  const amount = data?.amount;
  const totalPayable = data?.total_payable;
  const tenure = data?.tenure;
  const emi = data?.monthly_installment;
  const validAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;
  const validTotal = validAmount && typeof totalPayable === "number" && Number.isFinite(totalPayable) && totalPayable >= amount;
  const validTenure = typeof tenure === "number" && Number.isInteger(tenure) && tenure > 0;
  const validEmi = typeof emi === "number" && Number.isFinite(emi) && emi > 0;
  // Agreed Profit Markup = (EMI * tenure) - Finance Amount
  const markup = validAmount && validTenure && validEmi ? Math.round((emi * tenure - amount) * 100) / 100 : null;

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
            <ArrowLeftRight size={20} className="text-[#1B739E]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="journey-heading">Murabaha Sale Execution</h3>
            <p className="journey-label mt-1">Ownership Transfer (Bank - Customer)</p>
          </div>
        </div>

        <div className="journey-panel p-4 mb-4">
          <dl>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D5DCE3] pb-3 mb-3">
              <dt className="journey-label">Murabaha Sale Offer:</dt>
              <dd className="journey-value">Cost + Known Markup</dd>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="min-w-0 rounded-lg bg-[#F7F9FA] p-3">
                <dt className="journey-label mb-1">Bank&apos;s Cost Price</dt>
                <dd className="journey-value break-words">{validAmount ? amount.toLocaleString("en-IN") : "--"} SAR</dd>
              </div>
              <div className="min-w-0 rounded-lg bg-[#F7F9FA] p-3">
                <dt className="journey-label mb-1">Agreed Profit Markup</dt>
                <dd className="journey-value break-words text-emerald-700">{markup !== null ? `+${markup.toLocaleString("en-IN")}` : "--"} SAR</dd>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-[#DCEFF7] bg-[#F0FAFF] p-3">
              <div className="min-w-0">
                <dt className="journey-label mb-1">Total Deferred Selling Price</dt>
                <dd className="journey-value break-words">{validTotal ? totalPayable.toLocaleString("en-IN") : "--"} SAR</dd>
              </div>
              <div className="text-right">
                <dt className="journey-label mb-1">Tenure</dt>
                <dd className="journey-value">{validTenure ? tenure : "--"} Months</dd>
              </div>
            </div>
          </dl>

          <div className="flex items-start gap-2 mt-4">
            <ShieldCheck size={16} className="shrink-0 text-[#1B739E] mt-0.5" aria-hidden="true" />
            <p className="text-[12px] leading-5 text-[#526675]">
              By accepting, you buy the {data?.commodity ?? "Crude Palm Oil"} and legal title is transferred into your ownership under Murabaha law.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={!validTotal || !validTenure || submitted}
          onClick={() => {
            if (!validTotal || !validTenure || submitted) return;
            setSubmitted(true);
            window.dispatchEvent(new CustomEvent("mock-send-message", {
              detail: {
                visibleText: "I accept the Murabaha sale and transfer of ownership.",
                systemText: "__SYS__accept_murabaha_sale",
              },
            }));
          }}
          className="flex w-full items-center justify-center gap-2 px-3 py-3.5 journey-widget-button text-[14px]"
        >
          <span>Accept Murabaha &amp; Transfer Title</span>
          <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}