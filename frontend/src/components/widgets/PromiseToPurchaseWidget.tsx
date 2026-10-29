"use client";

import React, { useId, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface PromiseToPurchaseWidgetProps {
  data?: {
    amount?: number;
  };
}

export function PromiseToPurchaseWidget({ data }: PromiseToPurchaseWidgetProps) {
  const consentId = useId();
  const [consented, setConsented] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const amount = data?.amount;
  const validAmount = typeof amount === "number" && Number.isFinite(amount) && amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm mt-4"
    >
      <div className="journey-surface p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#D5DCE3] flex items-center justify-center shadow-sm shrink-0">
            <Zap size={20} className="text-[#1B739E]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="journey-heading">Promise to Purchase (Wa&apos;ad)</h3>
            <p className="journey-label mt-1">Customer Consent &amp; Commitment</p>
          </div>
        </div>

        <div className="journey-panel p-4 mb-5">
          <label htmlFor={consentId} className="flex items-start gap-3 journey-body cursor-pointer">
            <input
              id={consentId}
              type="checkbox"
              checked={consented}
              disabled={submitted || !validAmount}
              onChange={(event) => setConsented(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#1B739E]"
            />
            <span>
              I hereby issue my unilateral binding promise (<strong>Wa&apos;ad</strong>) to purchase the commodity from the bank at cost{" "}
              <strong>({validAmount ? amount.toLocaleString("en-IN") : "--"} SAR)</strong> plus agreed markup once the bank acquires it onto its own balance sheet.
            </span>
          </label>
        </div>

        <motion.button
          whileHover={consented && !submitted ? { scale: 1.01 } : {}}
          whileTap={consented && !submitted ? { scale: 0.98 } : {}}
          disabled={!consented || !validAmount || submitted}
          onClick={() => {
            if (!consented || !validAmount || submitted) return;
            setSubmitted(true);
            window.dispatchEvent(
              new CustomEvent("mock-send-message", {
                detail: {
                  visibleText: "I submit my binding Promise to Purchase (Wa'ad).",
                  systemText: "__SYS__promise_to_purchase_submitted",
                },
              })
            );
          }}
          className="w-full py-3.5 px-3 journey-widget-button text-[14px] shadow-md transition-all duration-300"
        >
          {submitted ? "Promise to Purchase Submitted" : "Submit Promise to Purchase (Wa'ad)"}
        </motion.button>
      </div>
    </motion.div>
  );
}