"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyAddressWidget({ data }: any) {
  const [city, setCity] = useState(data?.address?.city || "Riyadh");
  const [houseType, setHouseType] = useState(data?.address?.houseType || "Owned Villa");

  const handleSubmit = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `__SYS__UPDATE_ADDRESS: {"city": "${city}", "house_type": "${houseType}"}`
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Address Details</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">City</label>
            <select 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Riyadh</option>
              <option>Jeddah</option>
              <option>Dammam</option>
              <option>Mecca</option>
              <option>Medina</option>
              <option>Al Khobar</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">House Type</label>
            <select 
              value={houseType} 
              onChange={(e) => setHouseType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Owned Villa</option>
              <option>Owned Apartment</option>
              <option>Owned Traditional House</option>
              <option>Rented Apartment</option>
              <option>Rented Villa</option>
              <option>Company Provided Accommodation</option>
              <option>Shared Accommodation</option>
              <option>Family Owned (Not in applicant name)</option>
              <option>Government Housing</option>
            </select>
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
