"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface IBANValidationWidgetProps {
  data?: {
    iban?: string;
    bank?: string;
    beneficiary?: string;
    valid?: boolean;
    reason?: string;
  };
}

export function IBANValidationWidget({ data }: IBANValidationWidgetProps) {
  const [confirmed, setConfirmed] = useState(false);

  const isValid = data?.valid === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className={`rounded-3xl p-5 shadow-sm border ${
          isValid ? "border-emerald-100" : "border-red-100"
        }`}
        style={{
          backgroundColor: "#FFFFFF",
          backgroundImage: isValid
            ? "linear-gradient(125.41deg, rgba(185, 242, 220, 0.15) -6.53%, rgba(235, 245, 240, 0.15) 110.14%)"
            : "linear-gradient(125.41deg, rgba(242, 200, 200, 0.15) -6.53%, rgba(245, 235, 235, 0.15) 110.14%)",
        }}
      >
        <h3 className={`text-base font-bold mb-2 ${isValid ? "text-emerald-900" : "text-red-900"}`}>
          {isValid ? "✓ IBAN Verified" : "✗ IBAN Not Valid"}
        </h3>
        <p className="text-sm text-slate-700 mb-3">{data?.reason}</p>

        {isValid && data?.bank && (
          <div className="bg-white rounded-xl p-3 border border-emerald-100 mb-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">IBAN:</span>
                <span className="font-mono text-slate-900">{data.iban}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank:</span>
                <span className="font-semibold text-slate-900">{data.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-semibold text-slate-900">{data.beneficiary}</span>
              </div>
            </div>
          </div>
        )}

        {isValid && (
          <div className="flex items-start gap-2 mb-3">
            <input
              type="checkbox"
              id="iban-confirmed"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <label htmlFor="iban-confirmed" className="text-xs text-slate-600">
              Yes, this is the correct account for disbursement
            </label>
          </div>
        )}

        <button
          onClick={() => {
            if (!isValid) {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: "Let me enter a different IBAN",
                })
              );
            } else if (confirmed) {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: "Confirm and proceed",
                })
              );
            }
          }}
          disabled={isValid && !confirmed}
          className={`w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all disabled:opacity-50`}
          style={{
            background: isValid
              ? "linear-gradient(90deg, #10A860 0%, #29C974 100%)"
              : "linear-gradient(90deg, #D92D2D 0%, #E74C3C 100%)",
          }}
        >
          {isValid && confirmed ? "Proceed to Summary" : isValid ? "Confirm IBAN" : "Try Different IBAN"}
        </button>
      </div>
    </motion.div>
  );
}
