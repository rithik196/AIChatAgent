"use client";

import React, { useId, useState } from "react";
import { motion } from "framer-motion";
import { CircleDollarSign } from "lucide-react";

interface WakalahConsentWidgetProps {
  data?: {
    amount?: number;
  };
}

export function WakalahConsentWidget({ data }: WakalahConsentWidgetProps) {
  const consentId = useId();
  const [deliveryChoice, setDeliveryChoice] = useState<"sell" | "delivery">("sell");
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
      <div className="journey-surface p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#D5DCE3] flex items-center justify-center shadow-sm shrink-0">
            <CircleDollarSign size={20} className="text-[#1B739E]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="journey-heading">Consent to Sell Commodity</h3>
            <p className="journey-label mt-1">Wakalah Agency &amp; Liquidation</p>
          </div>
        </div>

        <fieldset className="space-y-2 mb-4">
          <legend className="sr-only">Choose how to receive the commodity</legend>
          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${deliveryChoice === "sell" ? "border-[#45B7D7] bg-white ring-1 ring-[#45B7D7]" : "border-[#D5DCE3] bg-white"}`}>
            <input
              type="radio"
              name={`${consentId}-delivery-choice`}
              value="sell"
              checked={deliveryChoice === "sell"}
              disabled={submitted}
              onChange={() => setDeliveryChoice("sell")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1689B0]"
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline justify-between gap-1 journey-value">
                <span>Sell on my behalf for Cash Finance</span>
                <span className="text-emerald-700">{validAmount ? `${amount.toLocaleString("en-IN")} SAR` : "-- SAR"}</span>
              </span>
              <span className="block journey-label mt-1">Authorizes sale via an independent exchange broker to receive instant liquid cash into your bank account.</span>
            </span>
          </label>

          <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${deliveryChoice === "delivery" ? "border-[#45B7D7] bg-white ring-1 ring-[#45B7D7]" : "border-[#D5DCE3] bg-white"}`}>
            <input
              type="radio"
              name={`${consentId}-delivery-choice`}
              value="delivery"
              checked={deliveryChoice === "delivery"}
              disabled={submitted}
              onChange={() => setDeliveryChoice("delivery")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#1689B0]"
            />
            <span className="min-w-0">
              <span className="journey-value">Request Physical Commodity Delivery</span>
              <span className="block journey-label mt-1">Deliver Crude Palm Oil at your residential address​ here</span>
            </span>
          </label>
        </fieldset>

        <div className="journey-panel p-4 mb-4">
          <label htmlFor={consentId} className="flex items-start gap-3 journey-body cursor-pointer select-none">
            <input
              id={consentId}
              type="checkbox"
              checked={consented}
              disabled={submitted}
              onChange={(event) => setConsented(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#1689B0]"
            />
            <span>I hereby grant agency consent authorizing the bank/broker to sell the commodity lot to an independent third party for cash proceeds.</span>
          </label>
        </div>

        <button
          type="button"
          disabled={!validAmount || !consented || deliveryChoice !== "sell" || submitted}
          onClick={() => {
            if (!validAmount || !consented || deliveryChoice !== "sell" || submitted) return;
            setSubmitted(true);
            window.dispatchEvent(new CustomEvent("mock-send-message", {
              detail: {
                visibleText: "I authorize the sale of the commodity on my behalf.",
                systemText: "__SYS__authorize_commodity_sale",
              },
            }));
          }}
          className="w-full px-3 py-3.5 journey-widget-button text-[14px]"
        >
          Authorize &amp; Auto-Execute Commodity Sale
        </button>
      </div>
    </motion.div>
  );
}