"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

interface FinanceSummaryWidgetProps {
  data?: {
    amount?: number;
    tenure?: number;
    profit_rate?: string;
    monthly_installment?: number;
    total_payable?: number;
  };
}

export function FinanceSummaryWidget({ data }: FinanceSummaryWidgetProps) {
  const amount = data?.amount ?? 0;
  const tenure = data?.tenure ?? 0;
  const profitRate = data?.profit_rate ?? '';
  const monthlyInstallment = data?.monthly_installment ?? 0;
  const totalPayable = data?.total_payable ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={2} />
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        {/* Abstract Background Highlights */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[50px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-400">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Finance Summary</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Please review your plan</p>
            </div>
          </div>

          {/* Main Amount Card */}
          <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 mb-4 backdrop-blur-sm">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Finance Amount</p>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-black text-white">{amount.toLocaleString('en-IN')}</p>
              <span className="text-sm font-semibold text-slate-500">SAR</span>
            </div>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Repayment</p>
              <p className="text-sm font-bold text-slate-200">{tenure} Months</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Profit Rate</p>
              <p className="text-sm font-bold text-slate-200">{profitRate}</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">EMI</p>
              <p className="text-sm font-bold text-slate-200">{monthlyInstallment.toLocaleString('en-IN')} <span className="text-[10px] text-slate-500">SAR</span></p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Total Payable</p>
              <p className="text-sm font-bold text-slate-200">{totalPayable.toLocaleString('en-IN')} <span className="text-[10px] text-slate-500">SAR</span></p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mock-send-message', { detail: 'Proceed to commodity trade' }));
              }}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white text-[14px] font-semibold rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300"
            >
              Proceed to commodity trade
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mock-send-message', { detail: 'I wish to modify the amount/tenure' }));
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[13px] font-semibold rounded-2xl border border-slate-700 transition-all duration-300"
            >
              Modify Amount or Tenure
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
