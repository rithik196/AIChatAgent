"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyIncomeWidget({ data }: any) {
  const [monthlyIncome, setMonthlyIncome] = useState(data?.income?.monthly || "SAR 35650");
  const [obligations, setObligations] = useState(data?.income?.obligations || "8750");
  const creditCardLimit = data?.income?.creditCardLimit || "SAR 20000";

  const handleSubmit = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `__SYS__UPDATE_INCOME: ${JSON.stringify({
          monthly: monthlyIncome,
          obligations,
          creditCardLimit,
        })}`
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Income Details</h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Monthly Income</label>
            <input
              type="text"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Obligations</label>
            <input
              type="text"
              value={obligations}
              onChange={(e) => setObligations(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
}
