"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface ApplicationSummaryWidgetProps {
  data?: {
    personalDetails?: {
      name: string;
      idNumber: string;
      phone: string;
    };
    employmentDetails?: {
      employer: string;
      type: string;
    };
    incomeDetails?: {
      monthly: string;
      obligations: string;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4"
        style={{
          backgroundColor: "#FFFFFF",
          backgroundImage:
            "linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)",
        }}
      >
        <h3 className="text-base font-bold text-slate-900">Application Summary</h3>
        <p className="text-xs text-slate-500">Please review all details before final approval</p>

        {/* Personal Details */}
        {data?.personalDetails && (
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Customer Details</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-900">{data.personalDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ID Number:</span>
                <span className="font-semibold text-slate-900">{data.personalDetails.idNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900">{data.personalDetails.phone}</span>
              </div>
            </div>
          </div>
        )}

        {/* Finance Details */}
        {data?.financeSummary && (
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Finance Terms</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-semibold text-slate-900">
                  {data.financeSummary.amount?.toLocaleString("en-IN")} SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenure:</span>
                <span className="font-semibold text-slate-900">{data.financeSummary.tenure} Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profit Rate:</span>
                <span className="font-semibold text-slate-900">{data.financeSummary.profit_rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Installment:</span>
                <span className="font-semibold text-slate-900">
                  {data.financeSummary.monthly_installment?.toLocaleString("en-IN")} SAR
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Income & Obligations - A4b: Only for NTB, hidden for ETB */}
        {!data?.is_etb && data?.incomeDetails && (
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Income & Obligations</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Income:</span>
                <span className="font-semibold text-slate-900">{data.incomeDetails.monthly}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Obligations:</span>
                <span className="font-semibold text-slate-900">{data.incomeDetails.obligations}</span>
              </div>
            </div>
          </div>
        )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Account Details */}
        {data?.account && (
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Disbursement Account</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-slate-900">{data.account.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IBAN:</span>
                <span className="font-mono text-slate-900 text-[11px]">{data.account.iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-semibold text-slate-900">{data.account.beneficiary}</span>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="read-confirmed"
            checked={readConfirmed}
            onChange={(e) => setReadConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4"
          />
          <label htmlFor="read-confirmed" className="text-xs text-slate-600">
            I have reviewed and confirmed all details are correct. I authorize the disbursement to proceed.
          </label>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => {
            if (readConfirmed) {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", { detail: "I confirm all details. Proceed to IVR verification." })
              );
            }
          }}
          disabled={!readConfirmed}
          className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
        >
          Confirm & Proceed
        </button>
      </div>
    </motion.div>
  );
}
