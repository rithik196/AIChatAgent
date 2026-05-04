"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface VerificationSuccessWidgetProps {
  data?: {
    title?: string;
    subtitle?: string;
    auto_advance_ms?: number;
  };
}

export function VerificationSuccessWidget({ data }: VerificationSuccessWidgetProps) {
  const title = data?.title || 'Verification Successful';
  const subtitle = data?.subtitle || 'Your details have been fetched successfully.';
  const autoAdvanceMs = data?.auto_advance_ms || 3000;
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!advanced) {
        setAdvanced(true);
        const event = new CustomEvent('mock-send-message', { detail: 'continue' });
        window.dispatchEvent(event);
      }
    }, autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [autoAdvanceMs, advanced]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-10 text-center shadow-sm"
        style={{
          background: 'linear-gradient(180deg, #EBF4F5 0%, #D4E8EF 100%)',
        }}
      >
        {/* Green Checkmark Circle */}
        <div className="w-20 h-20 mx-auto mb-5 relative">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{
              border: '4px solid #0D9488',
            }}
          >
            <motion.svg
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0D9488"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              />
            </motion.svg>
          </motion.div>
        </div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg font-bold text-slate-900 mb-2"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-sm text-slate-500"
        >
          {subtitle}
        </motion.p>
      </div>
    </motion.div>
  );
}
