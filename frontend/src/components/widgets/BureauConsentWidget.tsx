"use client";

import React from "react";
import { motion } from "framer-motion";
import { ImportantText } from "../shared/ImportantText";

export function BureauConsentWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <h3 className="journey-heading mb-2">Bureau Consent</h3>
        <p className="journey-body mb-4">
          <ImportantText text="We want to take your consent for fetching bureau records. Do you want to proceed?" />
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: {
                    visibleText: "Yes, I consent to fetch bureau records",
                    systemText: "__SYS__bureau_consent_granted",
                  },
                })
              );
            }}
            className="w-full py-3 journey-widget-button hover:opacity-90 transition-all"
          >
            Yes, I Consent
          </button>
          <button
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("mock-send-message", {
                  detail: {
                    visibleText: "No, I do not consent",
                    systemText: "__SYS__bureau_consent_denied",
                  },
                })
              );
            }}
            className="w-full py-3 journey-widget-button border-2 border-transparent hover:opacity-90 transition-all"
          >
            No
          </button>
        </div>
      </div>
    </motion.div>
  );
}
