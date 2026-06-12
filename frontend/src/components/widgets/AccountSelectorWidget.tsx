"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepIndicator } from './StepIndicator';

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

  const defaultIndex = data?.pre_select_default 
    ? accounts.findIndex(a => a.is_default) 
    : -1;

  const [selected, setSelected] = useState<number | null>(defaultIndex >= 0 ? defaultIndex : null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [manualIBAN, setManualIBAN] = useState('');

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as [number, number, number, number], staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-sm mt-4 space-y-3"
    >      <StepIndicator currentStep={5} />      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">Disbursement Account</h3>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Where to send funds</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!useManualEntry ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 
                    {data?.is_etb ? "Your Registered Accounts" : "Existing Accounts"}
                  </p>
                  <div className="space-y-2">
                    {accounts.map((account, idx) => (
                      <motion.button
                        key={idx}
                        variants={itemVariants}
                        onClick={() => setSelected(idx)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                          selected === idx
                            ? 'border-emerald-500/50 bg-emerald-900/20'
                            : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        {selected === idx && (
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                        )}
                        <div className="flex items-start justify-between relative z-10">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-200">{account.type}</p>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-wide">{account.iban}</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{account.bank}</p>
                            {account.beneficiary && (
                              <p className="text-[10px] text-emerald-400/80 mt-1 font-medium">{account.beneficiary}</p>
                            )}
                            {account.is_default && (
                              <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider">Default</span>
                              </div>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-colors ${
                            selected === idx ? 'border-emerald-500' : 'border-slate-600'
                          }`}>
                            <motion.div
                              initial={false}
                              animate={{ scale: selected === idx ? 1 : 0 }}
                              className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                            />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <motion.button
                    whileHover={selected !== null ? { scale: 1.02 } : {}}
                    whileTap={selected !== null ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (selected !== null) {
                        window.dispatchEvent(new CustomEvent('mock-send-message', {
                          detail: `ACCOUNT_SELECTED::${accounts[selected].iban}`
                        }));
                      }
                    }}
                    disabled={selected === null}
                    className={`w-full py-4 text-[14px] font-semibold rounded-2xl shadow-lg transition-all duration-300 ${
                      selected !== null
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    }`}
                  >
                    Use Selected Account
                  </motion.button>
                  <button
                    onClick={() => setUseManualEntry(true)}
                    className="w-full py-3.5 text-xs text-slate-400 font-semibold rounded-2xl border border-slate-700 hover:bg-slate-800 hover:text-slate-300 transition-all"
                  >
                    Or enter IBAN manually
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 
                    Manual IBAN Entry
                  </p>
                  <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm">
                    <input
                      type="text"
                      value={manualIBAN}
                      onChange={(e) => setManualIBAN(e.target.value.toUpperCase())}
                      placeholder="e.g., SA89 2980 0000 9090 5454 5001"
                      className="w-full bg-transparent border-b-2 border-slate-600 focus:border-emerald-500 px-1 py-2 text-sm font-mono text-white placeholder-slate-500 outline-none transition-colors"
                    />
                    <p className="text-[10px] text-slate-500 mt-2 flex justify-between">
                      <span>Format: SA + 22 digits</span>
                      <span className={manualIBAN.replace(/\s/g, '').length === 24 ? "text-emerald-400" : "text-slate-500"}>
                        {manualIBAN.replace(/\s/g, '').length}/24 chars
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <motion.button
                    whileHover={manualIBAN.replace(/\s/g, '').length >= 20 ? { scale: 1.02 } : {}}
                    whileTap={manualIBAN.replace(/\s/g, '').length >= 20 ? { scale: 0.98 } : {}}
                    onClick={() => {
                      if (manualIBAN.replace(/\s/g, '').length >= 20) {
                        window.dispatchEvent(new CustomEvent('mock-send-message', {
                          detail: `IBAN_ENTERED::${manualIBAN}`,
                        }));
                      }
                    }}
                    disabled={manualIBAN.replace(/\s/g, '').length < 20}
                    className={`w-full py-4 text-[14px] font-semibold rounded-2xl shadow-lg transition-all duration-300 ${
                      manualIBAN.replace(/\s/g, '').length >= 20
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    }`}
                  >
                    Validate IBAN
                  </motion.button>
                  <button
                    onClick={() => {
                      setUseManualEntry(false);
                      setManualIBAN('');
                    }}
                    className="w-full py-3.5 text-xs text-slate-400 font-semibold rounded-2xl border border-slate-700 hover:bg-slate-800 hover:text-slate-300 transition-all"
                  >
                    Back to Existing Accounts
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
