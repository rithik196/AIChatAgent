"use client";

import React from 'react';
import { motion } from 'framer-motion';

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
  const amount = data?.amount || 250000;
  const tenure = data?.tenure || 36;
  const profitRate = data?.profit_rate || '15%';
  const monthlyInstallment = data?.monthly_installment || 4638;
  const totalPayable = data?.total_payable || 277968;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.12) -6.53%, rgba(235, 244, 245, 0.12) 110.14%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">Cash Finance Summary</h3>
        </div>

        {/* Summary Details */}
        <div className="space-y-3.5 mb-5">
          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Finance Amount</span>
          </div>
          <p className="text-base font-bold text-slate-900 -mt-2">{amount.toLocaleString('en-IN')} SAR</p>

          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Repayment Period</span>
          </div>
          <p className="text-base font-bold text-slate-900 -mt-2">{tenure} Months</p>

          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Annual Profit Rate</span>
          </div>
          <p className="text-base font-bold text-slate-900 -mt-2">{profitRate}</p>

          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Monthly Installment</span>
          </div>
          <p className="text-base font-bold text-slate-900 -mt-2">{monthlyInstallment.toLocaleString('en-IN')} SAR</p>

          <div className="flex justify-between">
            <span className="text-xs text-slate-500">Total Amount Payable</span>
          </div>
          <p className="text-base font-bold text-slate-900 -mt-2">{totalPayable.toLocaleString('en-IN')} SAR</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Proceed to commodity trade' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Proceed to commodity trade
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'I wish to modify the amount/tenure' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
          >
            I wish to modify the amount/tenure
          </button>
        </div>
      </div>
    </motion.div>
  );
}
