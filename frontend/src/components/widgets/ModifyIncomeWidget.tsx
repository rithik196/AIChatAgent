"use client";

import React from "react";
import { motion } from "framer-motion";

export function ModifyIncomeWidget({ data }: any) {
  const currentIncome = data?.income?.monthly || "Not available";

  const handleUpdateClick = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: "I would like to update my income."
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Current Income Details</h3>
        
        <div className="flex flex-col gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monthly Income</span>
            <span className="text-sm font-bold text-slate-800">{currentIncome}</span>
          </div>

          <div className="text-xs text-slate-600 text-center leading-relaxed">
            To update your income, please tell the assistant your new monthly income in the chat below.
          </div>

          <button
            onClick={handleUpdateClick}
            className="w-full mt-2 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
          >
            Update Income
          </button>
        </div>
      </div>
    </motion.div>
  );
}
