"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

interface EligibleOfferWidgetProps {
  data?: {
    title?: string;
    max_amount?: number;
    profit_rate?: string;
    max_tenure?: number;
    is_etb?: boolean;
    pre_approval_badge?: string;
  };
}

export function EligibleOfferWidget({ data }: EligibleOfferWidgetProps) {
  const title = data?.title || 'Eligible Finance Offer';
  const maxAmount = data?.max_amount || 350000;
  const profitRate = data?.profit_rate || '12%';
  const maxTenure = data?.max_tenure || 60;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={2} />
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-blue-900/5">
        
        {/* Decorative Top Gradient */}
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center border border-blue-100 shadow-inner">
              <span className="text-blue-600 font-bold text-xl">$</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Based on Eligibility</p>
            </div>
          </div>

          {/* Offer Details Grid */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-5 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4 relative z-10">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Maximum Eligible Amount</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {maxAmount.toLocaleString('en-IN')}
                  </p>
                  <span className="text-sm font-semibold text-slate-500">SAR</span>
                </div>
              </div>
              <div className="flex gap-6 pt-4 border-t border-slate-200/60">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Profit Rate</p>
                  <p className="text-sm font-bold text-slate-800">{profitRate}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Max Tenure</p>
                  <p className="text-sm font-bold text-slate-800">{maxTenure} Months</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-6 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
            <div className="mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 16v-4 M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              This is your maximum eligibility. In the next step, you can confirm this amount or choose a lower amount if preferred.
            </p>
          </div>

          {/* Action Buttons */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const event = new CustomEvent('mock-send-message', {
                detail: {
                  visibleText: 'Continue',
                  systemText: '__SYS__accepted_offer',
                },
              });
              window.dispatchEvent(event);
            }}
            className="w-full py-3.5 text-white text-[14px] font-semibold rounded-2xl shadow-lg shadow-blue-500/25 transition-all"
            style={{
              background: 'linear-gradient(135deg, #1B6A8A 0%, #3B8AA7 100%)',
            }}
          >
            Review Details & Proceed
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
