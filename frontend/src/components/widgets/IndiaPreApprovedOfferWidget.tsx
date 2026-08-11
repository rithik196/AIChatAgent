"use client";

import React from "react";
import { motion } from "framer-motion";
import { CalendarDays, CirclePercent, IndianRupee, Info } from "lucide-react";

type IndiaPreApprovedOfferWidgetProps = {
  data?: {
    max_amount?: number;
    profit_rate?: string;
    max_tenure?: number;
    currency?: string;
    offer_style?: "preapproved" | "counter_loan";
    heading?: string;
    intro_text?: string;
    details_text?: string;
    prompt_text?: string;
    note_text?: string;
    card_title?: string;
    accept_label?: string;
    accept_signal?: string;
    show_secondary_action?: boolean;
    secondary_label?: string;
    secondary_signal?: string;
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
  const offerStyle = data?.offer_style ?? "preapproved";
  const isCounterLoan = offerStyle === "counter_loan";
  const heading = data?.heading ?? "Congratulations, Narendar Singh!";
  const introText = data?.intro_text ?? "I'm pleased to present you with a pre-approved Personal Loan offer of";
  const detailsText = data?.details_text ?? "Details of the offer are displayed on the screen for your reference.";
  const promptText = data?.prompt_text ?? "Would you like to accept this pre-approved offer, or would you like to request a higher amount?";
  const noteText = data?.note_text ?? "Note : This offer has been calculated based on your verified income and existing financial obligations, in full accordance with RBI's responsible lending guidelines";
  const cardTitle = data?.card_title ?? "Pre-Approved Offer";
  const acceptLabel = data?.accept_label ?? "Accept Pre-Approved Offer";
  const acceptSignal = data?.accept_signal ?? "__SYS__accepted_pre_approved_offer";
  const showSecondaryAction = data?.show_secondary_action ?? true;
  const secondaryLabel = data?.secondary_label ?? "Need Higher Amount";
  const secondarySignal = data?.secondary_signal ?? "__SYS__higher_amount_requested";

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

  const formattedAmount = `${currency} ${amount.toLocaleString("en-IN")}`;

  if (isCounterLoan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm mt-3"
      >
        <div className="journey-panel p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E9F1FF] text-[#1748B8] shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 4C8.4 4 5.3 6 3.8 9h2.7c1.2-1.6 3.2-2.6 5.5-2.6 2.7 0 5.1 1.5 6.2 3.8H15v2.1h3.8c0 .2 0 .4 0 .7s0 .5 0 .7H15V16h3.2c-1.1 2.3-3.5 3.8-6.2 3.8-2.3 0-4.3-1-5.5-2.6H3.8C5.3 20 8.4 22 12 22c5.2 0 9.5-4.3 9.5-9.5S17.2 4 12 4Z" fill="currentColor" />
              </svg>
            </div>
            <h3 className="journey-heading text-[18px] leading-6">{cardTitle}</h3>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#E4EAF2] bg-white">
            <CounterLoanDetailRow
              icon={<IndianRupee size={24} strokeWidth={2.2} />}
              label="Loan Amount"
              value={formattedAmount}
            />
            <CounterLoanDetailRow
              icon={<CirclePercent size={24} strokeWidth={2.2} />}
              label="Interest Rate"
              value={rate}
            />
            <CounterLoanDetailRow
              icon={<CalendarDays size={24} strokeWidth={2.2} />}
              label="Tenure"
              value={`${tenure} Months`}
              bordered={false}
            />
          </div>

          <div className="mt-4 rounded-[16px] border border-[#E3EFE6] bg-[#FBFEFC] px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E5F6EA] text-[#239647]">
                <Info size={14} strokeWidth={2.5} />
              </div>
              <p className="text-[13px] leading-6 text-[#334155]">{noteText}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => sendSignal(acceptLabel, acceptSignal)}
              className="w-full rounded-[12px] bg-[#1457D7] py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all duration-300 hover:opacity-95 active:scale-[0.99]"
            >
              {acceptLabel}
            </button>

            {showSecondaryAction ? (
              <button
                type="button"
                onClick={() => sendSignal(secondaryLabel, secondarySignal)}
                className="w-full rounded-[12px] border border-[#2C62C8] bg-white py-3.5 text-[15px] font-semibold text-[#1457D7] transition-all duration-300 hover:bg-[#F5F9FF] active:scale-[0.99]"
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    );
  }

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
            <h3 className="journey-heading mb-2">{heading}</h3>
            <p className="journey-body text-[#22313F] leading-6">
              {introText} <strong>{formattedAmount}.</strong>
            </p>
          </div>

          <p className="journey-body text-[#22313F] leading-6">
            {detailsText}
          </p>

          <p className="journey-body text-[#22313F] leading-6 font-semibold">
            {promptText}
          </p>

          <p className="text-[12px] leading-5 text-[#2C62C8]">
            {noteText}
          </p>

          <div className="rounded-[18px] border border-[#D5DCE3] bg-white p-4 shadow-sm">
            <h4 className="journey-heading mb-3 text-[18px]">{cardTitle}</h4>

            <div className="space-y-3">
              <div>
                <p className="journey-label text-[#2C62C8]">Amount</p>
                <p className="journey-value mt-1">{formattedAmount}</p>
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
              onClick={() => sendSignal(acceptLabel, acceptSignal)}
              className="w-full py-3.5 rounded-[14px] bg-[#1457D7] text-white text-[15px] font-semibold shadow-sm transition-all duration-300 hover:opacity-95 active:scale-[0.99]"
            >
              {acceptLabel}
            </button>

            {showSecondaryAction ? (
              <button
                type="button"
                onClick={() => sendSignal(secondaryLabel, secondarySignal)}
                className="w-full py-3.5 rounded-[14px] border border-[#2C62C8] bg-white text-[#1457D7] text-[15px] font-semibold transition-all duration-300 hover:bg-[#F5F9FF] active:scale-[0.99]"
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CounterLoanDetailRow({
  icon,
  label,
  value,
  bordered = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 px-4 py-4 ${bordered ? "border-b border-[#E8EDF5]" : ""}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#F3F7FD] text-[#1748B8]">
        {icon}
      </div>
      <div>
        <p className="text-[12px] font-medium text-[#3860B8]">{label}</p>
        <p className="mt-1 text-[15px] font-semibold text-[#173E8D]">{value}</p>
      </div>
    </div>
  );
}