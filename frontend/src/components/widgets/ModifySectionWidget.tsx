"use client";

import React from "react";
import { motion } from "framer-motion";

export function ModifySectionWidget() {
  const sections = [
    { value: "personal", label: "Personal Details", desc: "Education, Marital Status, Dependents" },
    { value: "address", label: "Address Details", desc: "City, House Type, Address" },
    { value: "employment", label: "Employment Details", desc: "Employer Type, Industry" },
    { value: "income", label: "Income Details", desc: "Income Amount, Proof of Income" }
  ];

  const handleSelect = (section: string) => {
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: section }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Which section would you like to update?</h3>
        <p className="text-xs text-slate-500 mb-4">Select the section you want to modify:</p>
        
        <div className="flex flex-col gap-2">
          {sections.map((sec) => (
            <button
              key={sec.value}
              onClick={() => handleSelect(sec.value)}
              className="text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="text-sm font-semibold text-slate-800">{sec.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{sec.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
