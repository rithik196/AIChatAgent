"use client";

import React from "react";
import { motion } from "framer-motion";

type IndiaFacilityLetterWidgetProps = {
  data?: {
    title?: string;
    subtitle?: string;
    document?: {
      name?: string;
      type?: string;
      url?: string;
    };
  };
};

const APP_BASE_PATH = "/customer_agent";
const DEFAULT_DOCUMENT_URL = "/assets/Facility_Letter_PAO.pdf";

function withAppBasePath(path: string) {
  if (path.startsWith(APP_BASE_PATH)) return path;
  return `${APP_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}

function resolveDocumentUrl(url?: string) {
  const rawUrl = url || DEFAULT_DOCUMENT_URL;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  if (rawUrl.startsWith("/")) {
    return withAppBasePath(rawUrl);
  }
  return rawUrl;
}

export function IndiaFacilityLetterWidget({ data }: IndiaFacilityLetterWidgetProps) {
  const title = data?.title || "Facility Letter";
  const subtitle = data?.subtitle || "Ready for E-Sign";
  const document = data?.document || {
    name: "Facility Letter",
    type: "pdf",
    url: DEFAULT_DOCUMENT_URL,
  };

  const openDocument = () => {
    window.open(encodeURI(resolveDocumentUrl(document.url)), "_blank", "noopener,noreferrer");
  };

  const sendSignal = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: "E-Sign",
          systemText: "__SYS__proceed_esign",
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
            <p className="journey-body text-[#22313F] leading-6">
              To finalize your Personal Loan agreement, I need you to review and digitally sign one document: your <strong>{document.name}</strong>. I&apos;ve displayed it here on your screen.
            </p>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={openDocument}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDocument();
              }
            }}
            className="journey-panel p-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[16px] border border-[#D5DCE3] bg-white">
                <svg className="h-8 w-8 text-[#1B739E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="journey-heading">{title}</p>
                <p className="journey-label mt-1">{subtitle}</p>
                <p className="journey-body mt-3 font-semibold text-[#22313F]">{document.name}</p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openDocument();
                }}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#EBF4F5] text-[#1B739E] hover:bg-[#DDEDF2]"
                aria-label={`Open ${document.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v10m0 0l-4-4m4 4l4-4M5 19h14" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={sendSignal}
            className="w-full py-3.5 rounded-[14px] bg-[#1457D7] text-white text-[15px] font-semibold shadow-sm transition-all duration-300 hover:opacity-95 active:scale-[0.99]"
          >
            E-Sign
          </button>
        </div>
      </div>
    </motion.div>
  );
}