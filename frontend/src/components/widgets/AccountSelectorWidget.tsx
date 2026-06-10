"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface Account {
  type: string;
  iban: string;
  bank: string;
  is_default?: boolean;
  beneficiary?: string;
}

interface AccountSelectorWidgetProps {
  data?: {
    accounts?: Account[];
    is_etb?: boolean;
    pre_select_default?: boolean;
    show_manual_entry?: boolean;
  };
}

export function AccountSelectorWidget({ data }: AccountSelectorWidgetProps) {
  const accounts = data?.accounts || [
    { type: 'Current Account', iban: 'SA89 2980 0000 9090 5454 5001', bank: 'FIRST ABU DHABI BANK' },
    { type: 'Savings Account', iban: 'SA89 2980 0000 9090 5454 5002', bank: 'FIRST ABU DHABI BANK' },
  ];

  // A3: Pre-select default account for ETB
  const defaultIndex = data?.pre_select_default 
    ? accounts.findIndex(a => a.is_default) 
    : -1;

  const [selected, setSelected] = useState<number | null>(defaultIndex >= 0 ? defaultIndex : null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [manualIBAN, setManualIBAN] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3 space-y-3"
    >
      {/* Existing Account Cards */}
      {!useManualEntry && (
        <>
          <div>
            {data?.is_etb ? (
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Your Registered Accounts</p>
            ) : (
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">Existing Accounts</p>
            )}
            <div className="space-y-2">
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
                      {account.beneficiary && (
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">{account.beneficiary}</p>
                      )}
                      {account.is_default && (
                        <p className="text-xs text-emerald-600 mt-0.5 font-medium">★ Default Account</p>
                      )}
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
            </div>
          </div>

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
              onClick={() => setUseManualEntry(true)}
              className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
            >
              Enter IBAN manually
            </button>
          </div>
        </>
      )}

      {/* Manual IBAN Entry */}
      {useManualEntry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Enter IBAN</label>
            <input
              type="text"
              value={manualIBAN}
              onChange={(e) => setManualIBAN(e.target.value.toUpperCase())}
              placeholder="e.g., SA89 2980 0000 9090 5454 5001"
              className="w-full px-4 py-3 rounded-full border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Format: SA + 22 digits (24 chars total)</p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                if (manualIBAN.replace(/\s/g, '').length >= 20) {
                  window.dispatchEvent(
                    new CustomEvent('mock-send-message', {
                      detail: `IBAN_ENTERED::${manualIBAN}`,
                    })
                  );
                }
              }}
              disabled={manualIBAN.replace(/\s/g, '').length < 20}
              className="w-full py-3 text-white font-semibold rounded-full shadow-md transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)',
              }}
            >
              Validate IBAN
            </button>
            <button
              onClick={() => {
                setUseManualEntry(false);
                setManualIBAN('');
              }}
              className="w-full py-3 text-slate-600 font-semibold rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-all"
            >
              Back to Existing Accounts
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
