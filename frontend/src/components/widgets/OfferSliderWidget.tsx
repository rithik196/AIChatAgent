"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

interface OfferSliderWidgetProps {
  data?: {
    max_amount?: number;
    min_amount?: number;
    profit_rate?: string;
    default_tenure?: number;
  };
}

const TENURE_OPTIONS = [12, 24, 36, 48, 60];

export function OfferSliderWidget({ data }: OfferSliderWidgetProps) {
  const maxAmount = data?.max_amount || 250000;
  const minAmount = data?.min_amount || 5000;
  const profitRateStr = data?.profit_rate || '12%';
  const profitRate = parseFloat(profitRateStr) / 100;
  const defaultTenure = data?.default_tenure || 36;

  const [amount, setAmount] = useState(Math.round(maxAmount * 0.6));
  const [tenure, setTenure] = useState(defaultTenure);
  const [showTenureDropdown, setShowTenureDropdown] = useState(false);

  const monthlyInstallment = useMemo(() => {
    const monthlyRate = profitRate / 12;
    if (monthlyRate === 0) return amount / tenure;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi);
  }, [amount, tenure, profitRate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] }}
      className="w-full max-w-sm mt-4"
    >
      <StepIndicator currentStep={3} />
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-blue-900/5">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1B6A8A] via-[#4BA3C7] to-[#1B6A8A]" />
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Customize Finance</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Adjust your plan</p>
            </div>
          </div>

          {/* Amount Slider */}
          <div className="mb-7 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-end mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</p>
              <div className="text-right">
                <span className="text-2xl font-black text-[#1B6A8A]">{amount.toLocaleString('en-IN')}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">SAR</span>
              </div>
            </div>
            <input
              type="range"
              min={minAmount}
              max={maxAmount}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #4BA3C7 0%, #4BA3C7 ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, #E2E8F0 ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, #E2E8F0 100%)`,
              }}
            />
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
              <span>{minAmount.toLocaleString()}</span>
              <span>{maxAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Tenure Slider */}
          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
            <div className="flex justify-between items-end mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tenure</p>
              
              <div className="relative">
                <button
                  onClick={() => setShowTenureDropdown(!showTenureDropdown)}
                  className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <span className="text-sm font-bold text-[#1B6A8A]">{tenure} Mo</span>
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTenureDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden w-32 py-1">
                    {TENURE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => { setTenure(t); setShowTenureDropdown(false); }}
                        className={`block w-full text-left px-4 py-2 text-xs transition-colors hover:bg-slate-50 ${t === tenure ? 'font-bold text-[#1B6A8A] bg-blue-50/50' : 'text-slate-600 font-medium'}`}
                      >
                        {t} Months
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <input
              type="range"
              min={12}
              max={60}
              step={12}
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none"
              style={{
                background: `linear-gradient(to right, #4BA3C7 0%, #4BA3C7 ${((tenure - 12) / (60 - 12)) * 100}%, #E2E8F0 ${((tenure - 12) / (60 - 12)) * 100}%, #E2E8F0 100%)`,
              }}
            />
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2">
              <span>12</span>
              <span>60</span>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex justify-between items-center bg-[#1B6A8A] rounded-2xl p-4 mb-5 text-white shadow-lg shadow-[#1B6A8A]/30">
            <div>
              <p className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold mb-1">Profit Rate</p>
              <p className="text-sm font-bold">{profitRateStr}</p>
            </div>
            <div className="w-px h-8 bg-blue-400/30" />
            <div className="text-right">
              <p className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold mb-1">EMI</p>
              <div className="flex items-baseline gap-1">
                <p className="text-xl font-black">{monthlyInstallment.toLocaleString('en-IN')}</p>
                <span className="text-xs font-semibold text-blue-200">SAR/mo</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mock-send-message', {
                  detail: {
                    visibleText: 'I confirm this finance plan',
                    systemText: `__SYS__CONFIRM_FINANCE_PLAN: ${JSON.stringify({
                      amount,
                      tenure,
                      profitRate: profitRateStr,
                      monthlyInstallment,
                    })}`,
                  },
                }));
              }}
              className="w-full py-3.5 bg-slate-900 text-white text-[14px] font-semibold rounded-2xl shadow-md hover:bg-slate-800 transition-all duration-300"
            >
              Confirm Finance Plan
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mock-send-message', { detail: 'Request for a higher amount' }));
              }}
              className="w-full py-3 bg-white text-slate-500 border border-slate-200 text-[13px] font-semibold rounded-2xl hover:bg-slate-50 hover:text-slate-700 transition-all duration-300"
            >
              Request higher amount
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
