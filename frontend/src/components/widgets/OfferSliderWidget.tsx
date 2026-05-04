"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.12) -6.53%, rgba(235, 244, 245, 0.12) 110.14%)'
        }}
      >
        {/* Amount Slider */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-900 mb-3">Amount (SAR)</p>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{minAmount.toLocaleString()}</span>
            <span>{maxAmount.toLocaleString('en-IN')}</span>
          </div>
          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #E8734A 0%, #E8734A ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, #E5E7EB ${((amount - minAmount) / (maxAmount - minAmount)) * 100}%, #E5E7EB 100%)`,
            }}
          />
          <div className="mt-3 inline-block border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-base font-bold text-slate-900">
              {amount.toLocaleString('en-IN')} SAR
            </span>
          </div>
        </div>

        {/* Tenure Selector */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-900 mb-3">Tenure (Months)</p>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>12</span>
            <span>60</span>
          </div>
          <input
            type="range"
            min={12}
            max={60}
            step={12}
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #E8734A 0%, #E8734A ${((tenure - 12) / (60 - 12)) * 100}%, #E5E7EB ${((tenure - 12) / (60 - 12)) * 100}%, #E5E7EB 100%)`,
            }}
          />
          <div className="mt-3 relative inline-block">
            <button
              onClick={() => setShowTenureDropdown(!showTenureDropdown)}
              className="border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-2"
            >
              <span className="text-base font-bold text-slate-900">{tenure} Months</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showTenureDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {TENURE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTenure(t); setShowTenureDropdown(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${t === tenure ? 'font-bold text-blue-600' : 'text-slate-700'}`}
                  >
                    {t} Months
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profit Rate + Monthly Installment Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500">Profit Rate</p>
              <p className="text-base font-bold text-slate-900">{profitRateStr}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Monthly Installment</p>
              <p className="text-base font-bold text-slate-900">{monthlyInstallment.toLocaleString('en-IN')} SAR</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', {
                detail: `Proceed to next step`
              });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Proceed to next step
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
