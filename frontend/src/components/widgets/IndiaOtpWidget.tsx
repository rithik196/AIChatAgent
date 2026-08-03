"use client";

import React from "react";
import { motion } from "framer-motion";

type IndiaOtpWidgetProps = {
  data?: {
    phone?: string;
  };
};

export function IndiaOtpWidget({ data }: IndiaOtpWidgetProps) {
  const maskedPhone = data?.phone ? `xxxxxx${data.phone.slice(-4)}` : "your registered mobile number";

  const handleResend = () => {
    window.alert("OTP resent to your registered mobile number.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-6">
        <div className="journey-panel p-4 mb-5">
          <p className="journey-body text-[#22313F] leading-6 font-medium mb-4">
            I&apos;ve sent a six-digit One-Time Password (OTP) to your mobile number.
          </p>
          <p className="journey-body text-[#425768] leading-6">
            Once you receive the text, please tell me the numbers so I can securely fetch your profile details. I&apos;m ready whenever you are.
          </p>
          <p className="journey-label mt-3">Sent to {maskedPhone}</p>
        </div>

        <button
          type="button"
          onClick={handleResend}
          className="w-full py-3.5 journey-widget-button transition-all duration-300 hover:scale-[1.02] active:scale-95"
        >
          Did not receive the One-Time Password
        </button>
      </div>
    </motion.div>
  );
}