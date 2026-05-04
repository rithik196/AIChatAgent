"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Account {
  type: string;
  iban: string;
  bank: string;
}

interface AccountSelectorWidgetProps {
  data?: {
    accounts?: Account[];
  };
}

export function AccountSelectorWidget({ data }: AccountSelectorWidgetProps) {
  const accounts = data?.accounts || [
    { type: 'Current Account', iban: 'SA89 2980 0000 9090 5454 5001', bank: 'FIRST ABU DHABI BANK' },
    { type: 'Savings Account', iban: 'SA89 2980 0000 9090 5454 5002', bank: 'FIRST ABU DHABI BANK' },
  ];

  const [selected, setSelected] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      <div className="space-y-3">
        {/* Account Cards */}
        {accounts.map((account, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            onClick={() => setSelected(idx)}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
              selected === idx
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-100 bg-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{account.type}</p>
                <p className="text-sm text-slate-600 mt-1 font-mono">{account.iban}</p>
                <p className="text-xs text-slate-400 mt-0.5">{account.bank}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                selected === idx ? 'border-blue-500' : 'border-slate-300'
              }`}>
                {selected === idx && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                )}
              </div>
            </div>
          </motion.button>
        ))}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              if (selected !== null) {
                const event = new CustomEvent('mock-send-message', {
                  detail: `ACCOUNT_SELECTED::${accounts[selected].iban}`
                });
                window.dispatchEvent(event);
              }
            }}
            disabled={selected === null}
            className="w-full py-3 text-white font-semibold rounded-full shadow-md transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
            }}
          >
            Submit
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('mock-send-message', { detail: 'Add another account' });
              window.dispatchEvent(event);
            }}
            className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
          >
            Add another account
          </button>
        </div>
      </div>
    </motion.div>
  );
}
