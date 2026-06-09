"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyEmploymentWidget() {
  const [employerType, setEmployerType] = useState("Private Sector");
  const [industry, setIndustry] = useState("Banking & Finance");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = () => {
    if (!fileName) {
      alert("Please upload an employment verification document");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `I've updated my employment. Employer Type: ${employerType}, Industry: ${industry}, Document: ${fileName}`
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Employment Details</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Employer Type</label>
            <select 
              value={employerType} 
              onChange={(e) => setEmployerType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Government (Ministry / Semi-Government)</option>
              <option>Military / Defence</option>
              <option>Public Sector (PSU / State-Owned Enterprise)</option>
              <option>Private – Large Corporate</option>
              <option>Private – SME</option>
              <option>Bank / Financial Institution</option>
              <option>Listed Company</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Industry Type</label>
            <select 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Oil & Gas / Energy</option>
              <option>Banking & Financial Services</option>
              <option>Government Administration</option>
              <option>Construction & Real Estate</option>
              <option>Retail & Trading</option>
              <option>Healthcare & Pharmaceuticals</option>
              <option>Education</option>
              <option>Telecommunications & IT</option>
              <option>Manufacturing / Industrial</option>
              <option>Transportation & Logistics</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Upload Employment Verification Document</label>
            <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none">
                <div className="text-2xl mb-1">📄</div>
                <p className="text-xs text-slate-600 mb-1">{fileName || "Drag file or click to upload"}</p>
                <p className="text-[10px] text-slate-400">PDF or Image (Max 5MB)</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-2 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
}
