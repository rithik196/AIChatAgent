"use client";

import React from "react";
import { motion } from "framer-motion";

type IndiaPreApprovedOfferWidgetProps = {
  data?: {
    max_amount?: number;
    profit_rate?: string;
    max_tenure?: number;
    currency?: string;
    show_step_tracker?: boolean;
    tracker_step?: number;
    tracker_total?: number;
  };
};

export function IndiaPreApprovedOfferWidget({ data }: IndiaPreApprovedOfferWidgetProps) {
  const amount = data?.max_amount ?? 1500000;
  const rate = data?.profit_rate ?? "11%";
  const tenure = data?.max_tenure ?? 84;
  const currency = data?.currency ?? "INR";

  const sendSignal = (visibleText: string, systemText: string) => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText,
          systemText,
        },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <div className="space-y-4">
          <div>
            <h3 className="journey-heading mb-2">Congratulations, Narendar!</h3>
            <p className="journey-body text-[#22313F] leading-6">
              I&apos;m pleased to present you with a pre-approved <strong>Personal Loan offer of {currency} {amount.toLocaleString("en-IN")}.</strong>
            </p>
          </div>

          <p className="journey-body text-[#22313F] leading-6">
            Details of the offer are displayed on the screen for your reference.
          </p>

          <p className="journey-body text-[#22313F] leading-6 font-semibold">
            Would you like to accept this pre-approved offer, or would you like to request a higher amount?
          </p>

          <p className="text-[12px] leading-5 text-[#2C62C8]">
            Note : This offer has been calculated based on your verified income and existing financial obligations, in full accordance with RBI&apos;s responsible lending guidelines
          </p>

          <div className="rounded-[18px] border border-[#D5DCE3] bg-white p-4 shadow-sm">
            <h4 className="journey-heading mb-3 text-[18px]">Pre-Approved Offer</h4>

            <div className="space-y-3">
              <div>
                <p className="journey-label text-[#2C62C8]">Amount</p>
                <p className="journey-value mt-1">{currency} {amount.toLocaleString("en-IN")}</p>
              </div>

              <div>
                <p className="journey-label text-[#2C62C8]">Interest Rate</p>
                <p className="journey-value mt-1">{rate}</p>
              </div>

              <div>
                <p className="journey-label text-[#2C62C8]">Tenure</p>
                <p className="journey-value mt-1">{tenure} months</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => sendSignal("Accept Pre-Approved Offer", "__SYS__accepted_pre_approved_offer")}
              className="w-full py-3.5 rounded-[14px] bg-[#1457D7] text-white text-[15px] font-semibold shadow-sm transition-all duration-300 hover:opacity-95 active:scale-[0.99]"
            >
              Accept Pre-Approved Offer
            </button>

            <button
              type="button"
              onClick={() => sendSignal("Need Higher Amount", "__SYS__higher_amount_requested")}
              className="w-full py-3.5 rounded-[14px] border border-[#2C62C8] bg-white text-[#1457D7] text-[15px] font-semibold transition-all duration-300 hover:bg-[#F5F9FF] active:scale-[0.99]"
            >
              Need Higher Amount
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}