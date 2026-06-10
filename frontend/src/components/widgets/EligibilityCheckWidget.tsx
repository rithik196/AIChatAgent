"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function EligibilityCheckWidget() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDone(true);
      window.dispatchEvent(
        new CustomEvent("mock-send-message", { detail: "__SYS__eligibility_check_complete" })
      );
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: "#FFFFFF",
          backgroundImage:
            "linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)",
        }}
      >
        <h3 className="text-base font-bold text-slate-900 mb-2">Eligibility Check</h3>
        <p className="text-sm text-slate-700 mb-3">
          We are running your eligibility and due diligence checks now.
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
            className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-700"
          />
          Verifying bureau records and eligibility rules...
        </div>
      </div>
    </motion.div>
  );
}
