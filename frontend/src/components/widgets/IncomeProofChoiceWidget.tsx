"use client";

import React from "react";
import { motion } from "framer-motion";
import { Landmark, Upload } from "lucide-react";

type IncomeProofChoiceWidgetProps = {
  data?: {
    title?: string;
    description?: string;
    primary_label?: string;
    primary_caption?: string;
    primary_signal?: string;
    primary_visible_text?: string;
    secondary_label?: string;
    secondary_caption?: string;
    secondary_signal?: string;
    secondary_visible_text?: string;
  };
};

export function IncomeProofChoiceWidget({ data }: IncomeProofChoiceWidgetProps) {
  const title = data?.title ?? "Verify Income";
  const description = data?.description ?? "Please choose how you would like to verify your updated income.";
  const primaryLabel = data?.primary_label ?? "Upload Bank Statement";
  const primaryCaption = data?.primary_caption ?? "Use the attachment icon in chat";
  const primarySignal = data?.primary_signal ?? "upload_statement";
  const primaryVisibleText = data?.primary_visible_text ?? primaryLabel;
  const secondaryLabel = data?.secondary_label ?? "Open Banking";
  const secondaryCaption = data?.secondary_caption ?? "We will send a link to your registered Email ID";
  const secondarySignal = data?.secondary_signal ?? "open_banking";
  const secondaryVisibleText = data?.secondary_visible_text ?? secondaryLabel;

  const choose = (value: string, visibleText: string) => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText,
          systemText: `__SYS__${value}`,
        },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <h3 className="journey-heading mb-2">{title}</h3>
        <p className="journey-body mb-4">{description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => choose(primarySignal, primaryVisibleText)}
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-[16px] bg-white border border-[#D5DCE3] transition-all text-left hover:bg-[#F8FAFC]"
          >
            <span className="w-10 h-10 rounded-[16px] bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <Upload size={18} />
            </span>
            <span className="min-w-0">
              <span className="block journey-value pb-1">{primaryLabel}</span>
              <span className="block journey-label leading-tight">{primaryCaption}</span>
            </span>
          </button>

          <button
            onClick={() => choose(secondarySignal, secondaryVisibleText)}
            className="w-full flex items-center justify-start gap-3 p-3.5 rounded-[16px] bg-white border border-[#D5DCE3] transition-all text-left hover:bg-[#F8FAFC]"
          >
            <span className="w-10 h-10 rounded-[16px] bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <Landmark size={18} />
            </span>
            <span className="min-w-0 ">
              <span className="block journey-value pb-1">{secondaryLabel}</span>
              <span className="block journey-label leading-tight">{secondaryCaption}</span>
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
