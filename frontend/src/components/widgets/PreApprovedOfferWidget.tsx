"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

export interface PreApprovedOfferWidgetProps {
  data?: {
    title?: string;
    max_amount?: number;
    profit_rate?: string;
    max_tenure?: number;
  };
}

export function PreApprovedOfferWidget({ data }: PreApprovedOfferWidgetProps) {
  const title = data?.title || 'Your Pre-Approved Offer';
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
      <StepIndicator currentStep={2} />
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

        {/* ETB Pre-Approved Badge */}
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 mb-4 rounded">
          <p className="text-xs font-semibold text-emerald-900">
            ✓ PRE-APPROVED
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Pre-approved for {maxAmount.toLocaleString('en-IN')} SAR at {profitRate} profit rate
          </p>
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
          You can go with this pre-approved offer right away, or if you need a higher amount, you can provide more details to check eligibility for a higher limit.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', {
                detail: {
                  visibleText: 'Go with offer',
                  systemText: '__SYS__accepted_pre_approved_offer',
                },
              });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Go with offer
          </button>
          
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Need higher amount' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 bg-white text-blue-600 font-semibold rounded-full border-2 border-blue-100 shadow-sm hover:bg-blue-50 transition-all"
          >
            Need higher amount
          </button>
        </div>
      </div>
    </motion.div>
  );
}
