"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyIncomeWidget() {
  const [income, setIncome] = useState("");
  const [method, setMethod] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleOpenBanking = () => {
    if (!income.trim()) {
      alert("Please enter your updated monthly income");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `I'd like to update my income to SAR ${income} and verify it via Open Banking`
      })
    );
  };

  const handleUploadStatement = () => {
    if (!income.trim()) {
      alert("Please enter your updated monthly income");
      return;
    }
    if (!fileName) {
      alert("Please upload a bank statement");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `I'd like to update my income to SAR ${income} with statement: ${fileName}`
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Income Details</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Updated Monthly Income (SAR)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm text-slate-500">SAR</span>
              <input 
                type="number" 
                value={income} 
                onChange={(e) => setIncome(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-12 p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold text-slate-600 mb-3">Provide proof of income update:</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={handleOpenBanking}
                className="w-full p-3 border-2 border-blue-400 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-all"
              >
                🏦 Link Bank Account (Open Banking)
              </button>
              
              <div className="relative">
                <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="pointer-events-none">
                    <div className="text-2xl mb-1">📊</div>
                    <p className="text-xs text-slate-600 mb-1">{fileName || "Upload Bank Statement"}</p>
                    <p className="text-[10px] text-slate-400">PDF or Image (Max 5MB)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleOpenBanking}
              className="flex-1 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
            >
              Proceed with Open Banking
            </button>
            <button
              onClick={handleUploadStatement}
              className="flex-1 py-2.5 text-slate-700 font-semibold bg-slate-100 rounded-full hover:bg-slate-200 transition-all"
            >
              Upload Statement
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
