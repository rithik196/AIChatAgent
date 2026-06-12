"use client";

import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  { id: 1, label: "Identity Verification" },
  { id: 2, label: "Personalized Offer" },
  { id: 3, label: "Commodity Trade" },
  { id: 4, label: "Digital Signature" },
  { id: 5, label: "Disbursement" }
];

export function NTBIntroductionWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
      className="w-full max-w-sm mt-3"
    >
      <div className="relative overflow-hidden rounded-3xl p-6 bg-slate-900 border border-slate-800 shadow-xl">
        {/* Abstract background elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 rounded-full blur-[50px] opacity-20 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500 rounded-full blur-[50px] opacity-20 pointer-events-none" />
        
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-white tracking-tight mb-2">
              Journey Overview
            </h3>
            <p className="text-[13px] text-slate-300 mb-6 leading-relaxed">
              We'll guide you through a simple 5-step process to get your funds ready.
            </p>
          </motion.div>

          <div className="space-y-3 mb-8">
            {steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-medium text-slate-300">
                  {step.id}
                </div>
                <span className="text-[13px] font-medium text-slate-200">
                  {step.label}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Continue' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3.5 bg-white text-slate-900 text-[14px] font-semibold rounded-full shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all duration-300 active:scale-95"
          >
            Let's Begin
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
