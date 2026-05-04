"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface DisbursementWidgetProps {
  data?: {
    reference?: string;
    date?: string;
    amount?: number;
    account?: string;
    tenure?: string;
    profit_rate?: string;
    first_installment?: string;
    monthly_installment?: number;
    total_payable?: number;
  };
}

export function DisbursementWidget({ data }: DisbursementWidgetProps) {
  const reference = data?.reference || 'PF-2025-XXXXXXXX';
  const date = data?.date || '03 April 2025';
  const amount = data?.amount || 250000;
  const account = data?.account || 'Current Account ****1234';
  const tenure = data?.tenure || '36 Months';
  const profitRate = data?.profit_rate || '15%';
  const firstInstallment = data?.first_installment || '03 July 2025';
  const monthlyInstallment = data?.monthly_installment || 4638;
  const totalPayable = data?.total_payable || 277968;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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
          <h3 className="text-base font-bold text-slate-900">Cash Finance Details</h3>
        </div>

        {/* Details */}
        <div className="space-y-3.5">
          <div>
            <p className="text-xs text-slate-500">Reference Number</p>
            <p className="text-sm font-bold text-slate-900">{reference}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Disbursement Date</p>
            <p className="text-sm font-bold text-slate-900">{date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Finance Amount</p>
            <p className="text-sm font-bold text-slate-900">SAR {amount.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Disbursed To</p>
            <p className="text-sm font-bold text-slate-900">{account}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Repayment Period</p>
            <p className="text-sm font-bold text-slate-900">{tenure}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Annual Profit Rate</p>
            <p className="text-sm font-bold text-slate-900">{profitRate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">First Instalment Due</p>
            <p className="text-sm font-bold text-slate-900">{firstInstallment}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Monthly Installment</p>
            <p className="text-sm font-bold text-slate-900">SAR {monthlyInstallment.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Amount Payable</p>
            <p className="text-sm font-bold text-slate-900">SAR {totalPayable.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
