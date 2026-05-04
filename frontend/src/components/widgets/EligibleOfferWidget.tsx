"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface EligibleOfferWidgetProps {
  data?: {
    title?: string;
    max_amount?: number;
    profit_rate?: string;
    max_tenure?: number;
  };
}

export function EligibleOfferWidget({ data }: EligibleOfferWidgetProps) {
  const title = data?.title || 'Eligible Finance Offer';
  const maxAmount = data?.max_amount || 350000;
  const profitRate = data?.profit_rate || '12%';
  const maxTenure = data?.max_tenure || 60;

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
            <span className="text-blue-600 font-bold text-lg">$</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>

        {/* Offer Details */}
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-xs text-slate-500">Amount</p>
            <p className="text-base font-bold text-slate-900">
              upto {maxAmount.toLocaleString('en-IN')} SAR
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Profit Rate</p>
            <p className="text-base font-bold text-slate-900">{profitRate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tenure</p>
            <p className="text-base font-bold text-slate-900">upto {maxTenure} months</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-5">
          Note: The amount shown is your maximum eligibility. You will be able to select a specific amount in the next step.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Accept eligible finance offer' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Accept eligible finance offer
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Request for a higher amount' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
          >
            Request for a higher amount
          </button>
        </div>
      </div>
    </motion.div>
  );
}
