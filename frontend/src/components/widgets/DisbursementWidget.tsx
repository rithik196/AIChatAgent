"use client";

import React from "react";
import { motion } from "framer-motion";

interface DisbursementWidgetProps {
  data?: {
    customer_name?: string;
    reference?: string;
    date?: string;
    amount?: number;
    account?: string;
    tenure?: string;
    profit_rate?: string;
    first_installment?: string;
    monthly_installment?: number;
    total_payable?: number;
    bank?: string;
    beneficiary?: string;
  };
}

export function DisbursementWidget({ data }: DisbursementWidgetProps) {
  const customerName = data?.customer_name || "Customer";
  const reference = data?.reference || "PF-2025-XXXXXXXX";
  const date = data?.date || "03 April 2025";
  const amount = data?.amount || 0;
  const account = data?.account || "Current Account ****1234";
  const tenure = data?.tenure || "0 Months";
  const profitRate = data?.profit_rate || "";
  const firstInstallment = data?.first_installment || "03 July 2025";
  const monthlyInstallment = data?.monthly_installment || 0;
  const totalPayable = data?.total_payable || 0;
  const bank = data?.bank || "";
  const beneficiary = data?.beneficiary || "";
  const maskedAccount = (() => {
    if (!account) return "Current Account ****1234";
    if (account.includes("****")) return account;
    const compact = account.replace(/\s+/g, "");
    if (compact.length <= 4) return account;
    return `****${compact.slice(-4)}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mt-3 space-y-3"
    >
      <div className="rounded-3xl bg-slate-100 border border-slate-200 p-4 shadow-sm">
        <p className="text-base font-semibold text-slate-900 leading-snug">
          Congratulations, {customerName}!
        </p>
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          Your Personal Finance has been successfully disbursed. Here are your complete details for your records.
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">Cash Finance Details</h3>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Reference Number</p>
            <p className="text-sm font-semibold text-slate-900">{reference}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Disbursement Date</p>
            <p className="text-sm font-semibold text-slate-900">{date}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Finance Amount</p>
            <p className="text-sm font-semibold text-slate-900">SAR {amount.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Disbursed To</p>
            <p className="text-sm font-semibold text-slate-900">{maskedAccount}</p>
          </div>
          {bank && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Bank</p>
              <p className="text-sm font-semibold text-slate-900">{bank}</p>
            </div>
          )}
          {beneficiary && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Beneficiary</p>
              <p className="text-sm font-semibold text-slate-900">{beneficiary}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Repayment Period</p>
            <p className="text-sm font-semibold text-slate-900">{tenure}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Annual Profit Rate</p>
            <p className="text-sm font-semibold text-slate-900">{profitRate}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">First Instalment Due</p>
            <p className="text-sm font-semibold text-slate-900">{firstInstallment}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Monthly Installment</p>
            <p className="text-sm font-semibold text-slate-900">SAR {monthlyInstallment.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Amount Payable</p>
            <p className="text-sm font-semibold text-slate-900">SAR {totalPayable.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
        <p className="text-sm text-slate-800 leading-relaxed">
          A full welcome letter and repayment schedule have been sent to your registered email address and are also available within the app under My Finance &gt; Active Agreements.
        </p>
        <p className="mt-3 text-sm text-slate-800 leading-relaxed">
          Should you wish to make an early settlement, please contact us at least 30 days in advance.
        </p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          An early settlement charge equivalent to 3 months&apos; profit applies, as per SAMA regulations.
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
        <p className="text-sm text-slate-800 leading-relaxed">
          It has been a genuine pleasure assisting you today, {customerName}. We wish you every success with your plans, and we look forward to continuing our service.
        </p>
        <p className="mt-3 text-sm text-slate-800 leading-relaxed">
          Our team is available 24 hours a day, 7 days a week. If you need any assistance, simply call 022-1234-5678 or return to this assistant at any time.
        </p>
        <p className="mt-3 text-sm text-slate-800 leading-relaxed">
          Thank you sincerely for choosing {bank || "our bank"}.
        </p>
      </div>
    </motion.div>
  );
}
