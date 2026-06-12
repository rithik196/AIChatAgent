"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { StepIndicator } from "./StepIndicator";

interface ApplicationSummaryWidgetProps {
  data?: {
    personalDetails?: {
      name: string;
      idNumber: string;
      phone: string;
    };
    financeSummary?: {
      amount: number;
      tenure: number;
      profit_rate: string;
      monthly_installment: number;
      total_payable: number;
    };
    account?: {
      bank: string;
      iban: string;
      beneficiary: string;
    };
    is_etb?: boolean;
  };
}

export function ApplicationSummaryWidget({ data }: ApplicationSummaryWidgetProps) {
  const [readConfirmed, setReadConfirmed] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number], staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={5} />
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">Application Summary</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Final Review</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {/* Personal Details */}
            {data?.personalDetails && (
              <motion.div variants={itemVariants} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Customer Details
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <span className="text-xs text-slate-400 font-medium">Name</span>
                    <span className="text-xs font-semibold text-slate-200">{data.personalDetails.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <span className="text-xs text-slate-400 font-medium">ID Number</span>
                    <span className="text-xs font-semibold text-slate-200">{data.personalDetails.idNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Phone</span>
                    <span className="text-xs font-semibold text-slate-200">{data.personalDetails.phone}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Finance Details */}
            {data?.financeSummary && (
              <motion.div variants={itemVariants} className="bg-blue-900/20 rounded-2xl p-4 border border-blue-500/20 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> Finance Terms
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-blue-500/10 pb-2">
                    <span className="text-xs text-blue-200/70 font-medium">Amount</span>
                    <span className="text-xs font-bold text-white">{data.financeSummary.amount?.toLocaleString("en-IN")} SAR</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-blue-500/10 pb-2">
                    <span className="text-xs text-blue-200/70 font-medium">Tenure</span>
                    <span className="text-xs font-bold text-white">{data.financeSummary.tenure} Months</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-blue-500/10 pb-2">
                    <span className="text-xs text-blue-200/70 font-medium">Profit Rate</span>
                    <span className="text-xs font-bold text-white">{data.financeSummary.profit_rate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-200/70 font-medium">Monthly Installment</span>
                    <span className="text-xs font-bold text-teal-400">{data.financeSummary.monthly_installment?.toLocaleString("en-IN")} SAR</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Account Details */}
            {data?.account && (
              <motion.div variants={itemVariants} className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Disbursement Account
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <span className="text-xs text-slate-400 font-medium">Bank</span>
                    <span className="text-xs font-semibold text-slate-200">{data.account.bank}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <span className="text-xs text-slate-400 font-medium">IBAN</span>
                    <span className="text-[10px] font-mono text-slate-300">{data.account.iban}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Beneficiary</span>
                    <span className="text-xs font-semibold text-slate-200">{data.account.beneficiary}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div variants={itemVariants} className="mb-6 flex items-start gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                id="read-confirmed"
                checked={readConfirmed}
                onChange={(e) => setReadConfirmed(e.target.checked)}
                className="peer appearance-none w-5 h-5 border-2 border-slate-500 rounded flex-shrink-0 checked:bg-blue-500 checked:border-blue-500 transition-colors cursor-pointer"
              />
              <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <label htmlFor="read-confirmed" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
              I have reviewed and confirmed all details are correct. I authorize the disbursement to proceed.
            </label>
          </motion.div>

          <motion.button
            variants={itemVariants}
            whileHover={readConfirmed ? { scale: 1.02 } : {}}
            whileTap={readConfirmed ? { scale: 0.98 } : {}}
            onClick={() => {
              if (readConfirmed) {
                window.dispatchEvent(
                  new CustomEvent("mock-send-message", { detail: "I confirm all details. Proceed to IVR verification." })
                );
              }
            }}
            disabled={!readConfirmed}
            className={`w-full py-4 text-[14px] font-semibold rounded-2xl shadow-lg transition-all duration-300 ${
              readConfirmed
                ? "bg-gradient-to-r from-blue-500 to-teal-400 text-white shadow-blue-500/25 hover:shadow-blue-500/40"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            Confirm & Proceed
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
