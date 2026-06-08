"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface NafathWidgetProps {
  data?: {
    nafath_code?: number;
  };
}

export function NafathWidget({ data }: NafathWidgetProps) {
  const code = data?.nafath_code ?? 42;
  const [done, setDone] = useState(false);

  // Auto-approve after 3 seconds — dispatched as internal silent message (no chat bubble)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true);
      const event = new CustomEvent('mock-send-message', { detail: '__SYS__Nafath Approved' });
      window.dispatchEvent(event);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

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

        {/* Auto-verification notice */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600"
          />
          Waiting for Nafath approval…
        </div>

        {/* Did not receive */}
        <button
          onClick={() => {
            const event = new CustomEvent('mock-send-message', { detail: 'Did not receive the request' });
            window.dispatchEvent(event);
          }}
          className="mt-4 w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
        >
          Did not receive the request
        </button>
      </div>
    </motion.div>
  );
}
