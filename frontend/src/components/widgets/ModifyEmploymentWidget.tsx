"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyEmploymentWidget({ data }: any) {
  const [employerType, setEmployerType] = useState(data?.employment?.type || "Private Sector");
  const [industry, setIndustry] = useState(data?.employment?.industry || "Banking & Finance");
  const [employer, setEmployer] = useState(data?.employment?.employer || "Newgen Software");
  const [experience, setExperience] = useState(data?.employment?.experience || "5");

  const handleSubmit = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `__SYS__UPDATE_EMPLOYMENT: {"type": "${employerType}", "industry": "${industry}", "employer": "${employer}", "experience": "${experience}"}`
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
              <option>Salaried</option>
              <option>Private Sector</option>
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
              <option>Software</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Employer Name</label>
            <input 
              type="text"
              value={employer} 
              onChange={(e) => setEmployer(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Experience (Years)</label>
            <input 
              type="number"
              value={experience} 
              onChange={(e) => setExperience(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
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
