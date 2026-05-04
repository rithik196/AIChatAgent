"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface OtpVerificationWidgetProps {
  data?: Record<string, unknown>;
}

export function OtpVerificationWidget({ data }: OtpVerificationWidgetProps) {
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
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)'
        }}
      >
        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'OTP Verification' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3.5 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            OTP Verification
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'IVR Verification' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3.5 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            IVR Verification
          </button>
        </div>
      </div>
    </motion.div>
  );
}
