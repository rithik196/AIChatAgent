"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface NafathWidgetProps {
  data?: {
    nafath_code?: number;
  };
}

export function NafathWidget({ data }: NafathWidgetProps) {
  const code = data?.nafath_code || Math.floor(10 + Math.random() * 89);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-6 shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)'
        }}
      >
        <p className="text-sm text-slate-700 mb-1">
          I&apos;ve sent a request to your Nafath app to securely verify your identity.
        </p>
        <p className="text-sm text-slate-700 font-semibold mb-4">
          Please open Nafath app and select the number displayed below to continue.
        </p>

        {/* Nafath Code */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="text-5xl font-bold text-slate-900 mb-5"
        >
          {code}
        </motion.div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Open Nafath App' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Open Nafath App
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Did not receive the request' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
          >
            Did not receive the request
          </button>
        </div>
      </div>
    </motion.div>
  );
}
