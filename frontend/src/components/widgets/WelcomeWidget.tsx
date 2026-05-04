"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface WelcomeWidgetProps {
  data?: {
    categories?: string[];
  };
}

export function WelcomeWidget({ data }: WelcomeWidgetProps) {
  const categories = data?.categories || ['Cash Finance', 'Finance Type 2', 'Finance Type 3'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-sm mt-2"
    >
      <div
        className="rounded-3xl p-8 text-center"
        style={{
          background: 'linear-gradient(180deg, #EBF4F5 0%, #B9DCF2 100%)',
        }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-slate-900 mb-3"
        >
          Welcome!
        </motion.h2>
        <p className="text-sm text-slate-600 mb-1">
          I am your personal finance assistant.
        </p>
        <p className="text-sm text-slate-600 mb-6">
          Let&apos;s start your digital finance application.
        </p>
        <p className="text-xs text-slate-500 font-medium mb-4">
          Choose a category to begin
        </p>
        <div className="flex flex-col gap-3">
          {categories.map((cat, idx) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              onClick={() => {
                const event = new CustomEvent('mock-send-message', { detail: cat });
                window.dispatchEvent(event);
              }}
              className="w-full py-3.5 px-6 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95"
              style={{
                background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
              }}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
