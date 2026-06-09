"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export function ModifyPersonalWidget() {
  const [education, setEducation] = useState("Bachelor's Degree");
  const [marital, setMarital] = useState("Single");
  const [dependents, setDependents] = useState("0");

  const handleSubmit = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: `I've updated: Education to ${education}, Marital Status to ${marital}, Dependents to ${dependents}`
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Personal Details</h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Level of Education</label>
            <select 
              value={education} 
              onChange={(e) => setEducation(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Primary Education</option>
              <option>Intermediate (Middle School)</option>
              <option>Secondary (High School)</option>
              <option>Diploma (Associate / Intermediate)</option>
              <option>Bachelor's Degree</option>
              <option>Master's Degree</option>
              <option>Doctorate (PhD)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Marital Status</label>
            <select 
              value={marital} 
              onChange={(e) => setMarital(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
              <option>Separated</option>
              <option>Polygamous</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Number of Dependents</label>
            <select 
              value={dependents} 
              onChange={(e) => setDependents(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            >
              <option>0</option>
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4</option>
              <option>5</option>
              <option>6+</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full mt-3 py-2.5 text-white font-semibold rounded-full hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </motion.div>
  );
}
