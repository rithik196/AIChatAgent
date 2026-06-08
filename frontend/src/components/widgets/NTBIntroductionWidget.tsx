"use client";

import React from 'react';
import { motion } from 'framer-motion';

export function NTBIntroductionWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-6 shadow-sm border border-slate-100"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)'
        }}
      >
        <h3 className="text-lg font-bold text-slate-900 mb-3">
          Journey Overview
        </h3>
        
        <p className="text-sm text-slate-700 mb-4">
          Excellent choice. To get your funds ready, we will move through a simple 5-step journey:
        </p>

        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-2 mb-5 ml-1 font-medium">
          <li>Identity Verification</li>
          <li>Personalized Offer</li>
          <li>Commodity Trade</li>
          <li>Digital Signature</li>
          <li>Account Selection and Disbursement</li>
        </ol>


      </div>
    </motion.div>
  );
}
