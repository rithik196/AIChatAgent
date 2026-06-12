"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { StepIndicator } from "./StepIndicator";

export function CommodityTradeAuthorizationWidget() {
  const [authorized, setAuthorized] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={3} />
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-400">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">Commodity Trade</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Authorization Required</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm mb-6">
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To proceed with your Islamic Murabaha financing, we will execute a commodity trade on your behalf. Please authorize the transaction below.
            </p>
            <div className="flex items-start gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  id="trade-auth"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-500 rounded flex-shrink-0 checked:bg-amber-500 checked:border-amber-500 transition-colors cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <label htmlFor="trade-auth" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
                I hereby appoint the bank as my agent to purchase and sell commodities in the local market to complete this Murabaha transaction.
              </label>
            </div>
          </div>

          <motion.button
            whileHover={authorized ? { scale: 1.02 } : {}}
            whileTap={authorized ? { scale: 0.98 } : {}}
            onClick={() => {
              if (authorized) {
                window.dispatchEvent(
                  new CustomEvent("mock-send-message", { detail: "I authorize the commodity trade." })
                );
              }
            }}
            disabled={!authorized}
            className={`w-full py-4 text-[14px] font-semibold rounded-2xl shadow-lg transition-all duration-300 ${
              authorized
                ? "bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-amber-500/25 hover:shadow-amber-500/40"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
            }`}
          >
            Authorize Trade
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
