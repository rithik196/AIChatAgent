"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

type IndiaPostEsignSummaryWidgetProps = {
  data?: {
    customerName?: string;
    footerMessage?: {
      earlySettlement?: string;
      pleasureMessage?: string;
      successMessage?: string;
      supportMessage?: string;
      thankYouMessage?: string;
    };
    loanDetails?: {
      loanNumber?: string;
      date?: string;
      loanAmount?: number;
      disbursedTo?: string;
      repaymentPeriod?: string;
      interestRate?: string;
      firstInstallmentDue?: string;
      monthlyInstallment?: number;
      totalPayable?: number;
    };
    repaymentAccount?: {
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      bankValidationStatus?: string;
      bankName?: string;
      branch?: string;
    };
    submitClose?: {
      completed?: boolean;
      buttonLabel?: string;
      closingText?: string;
    };
  };
};

function formatAmount(value?: number) {
  return `INR ${(value || 0).toLocaleString("en-IN")}`;
}

export function IndiaPostEsignSummaryWidget({ data }: IndiaPostEsignSummaryWidgetProps) {
  const [useDifferentAccount, setUseDifferentAccount] = useState(false);
  const [accountNumber, setAccountNumber] = useState(data?.repaymentAccount?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(data?.repaymentAccount?.ifscCode || "");
  const [accountHolderName, setAccountHolderName] = useState(data?.repaymentAccount?.accountHolderName || data?.customerName || "");
  const [bankValidationStatus, setBankValidationStatus] = useState(data?.repaymentAccount?.bankValidationStatus || "Pending");
  const submitClose = data?.submitClose || {};
  const [isSubmitClosed, setIsSubmitClosed] = useState(Boolean(submitClose.completed));

  const validationSucceeded = bankValidationStatus.toLowerCase() === "validated successfully";
  const canValidate = useMemo(() => {
    return accountNumber.trim() !== "" && ifscCode.trim() !== "" && accountHolderName.trim() !== "";
  }, [accountNumber, ifscCode, accountHolderName]);

  const handleValidate = () => {
    if (!canValidate) return;
    setBankValidationStatus("Validated Successfully");
  };

  const loanDetails = data?.loanDetails || {};
  const repaymentAccount = data?.repaymentAccount || {};
  const footerMessage = data?.footerMessage || {};
  const submitCloseLabel = submitClose.buttonLabel || "Submit & Close";
  const submitCloseText =
    submitClose.closingText ||
    "Should you wish to make an early settlement, please contact us at least 30 days in advance. It has been a genuine pleasure assisting you today, Narendar Singh. We wish you every success with your plans and we look forward to continuing to be of service. Our team is available 24 hours a day, 7 days a week should you need any assistance, simply call 022-1234-5678 or return to this assistant at any time. Thank you for choosing ICICI Bank.";

  useEffect(() => {
    setIsSubmitClosed(Boolean(submitClose.completed));
  }, [submitClose.completed]);

  const handleSubmitClose = () => {
    if (isSubmitClosed) return;
    setIsSubmitClosed(true);
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: submitCloseLabel,
          systemText: "__SYS__india_submit_close",
        },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3 space-y-4"
    >
      <div className="rounded-[16px] px-5 py-4 shadow-sm" style={{ backgroundImage: "linear-gradient(90deg, #EBF4F5 0%, #B9DCF2 100%)" }}>
        <p className="text-[15px] font-bold text-[#0D141A]">Congratulations, {data?.customerName || "Customer"}!</p>
        <p className="mt-1 text-[14px] leading-6 text-[#22313F]">Your loan amount has been successfully sent to your account. All the details are displayed on the screen for your reference.</p>
      </div>

      <div className="journey-panel p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5DCE3] bg-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#1B739E]">
              <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="journey-heading">Personal Loan Details</h3>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <SummaryField label="Reference Number" value={loanDetails.loanNumber || "PL-2026-XXXX1841"} />
          <SummaryField label="Disbursement Date" value={loanDetails.date || "06 July 2026"} />
          <SummaryField label="Loan Amount" value={formatAmount(loanDetails.loanAmount)} />
          <SummaryField label="Disbursed To" value={loanDetails.disbursedTo || "Savings Account ******7223"} />
          <SummaryField label="Repayment Period" value={loanDetails.repaymentPeriod || "84 Months"} />
          <SummaryField label="Annual Interest Rate" value={loanDetails.interestRate || "11%"} />
          <SummaryField label="First Installment Due Date" value={loanDetails.firstInstallmentDue || "03 August 2026"} />
          <SummaryField label="Monthly EMI Amount" value={formatAmount(loanDetails.monthlyInstallment)} />
          <SummaryField label="Total Amount Payable" value={formatAmount(loanDetails.totalPayable)} />
        </div>
      </div>

      <div className="journey-panel p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D5DCE3] bg-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#1B739E]">
              <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h3 className="journey-heading">Repayment Account Details</h3>
            <p className="journey-label mt-0.5">Confirm different account for repayment</p>
          </div>
        </div>

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-[14px] border border-[#D5DCE3] bg-[#F9FBFC] px-4 py-3">
          <input
            type="checkbox"
            checked={useDifferentAccount}
            onChange={(event) => {
              setUseDifferentAccount(event.target.checked);
              if (!event.target.checked) {
                setBankValidationStatus(data?.repaymentAccount?.bankValidationStatus || "Pending");
              }
            }}
            className="mt-1 h-4 w-4 rounded border-[#D5DCE3] text-[#1457D7]"
          />
          <span className="text-[13px] leading-5 text-[#22313F]">Consider Different Account for Repayment</span>
        </label>

        {useDifferentAccount ? (
          <div className="space-y-3">
            <FieldRow label="Account Number" value={accountNumber} onChange={setAccountNumber} placeholder="Enter account number" />
            <FieldRow label="IFSC Code" value={ifscCode} onChange={setIfscCode} placeholder="Enter IFSC code" />
            <FieldRow label="Account Holder Name" value={accountHolderName} onChange={setAccountHolderName} placeholder="Enter account holder name" />
            <SummaryField label="Bank Validation Status" value={bankValidationStatus} />

            <button
              type="button"
              onClick={handleValidate}
              disabled={!canValidate}
              className="w-full rounded-[14px] bg-[#1457D7] py-3.5 text-[14px] font-semibold text-white shadow-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Validate Bank Account
            </button>

            {validationSucceeded ? (
              <div className="rounded-[14px] border border-[#8FD1A8] bg-[#F3FBF6] px-4 py-3 text-[13px] leading-5 text-[#1F6C3D]">
                <p className="font-semibold">Account validated successfully</p>
                <div className="mt-2 space-y-2">
                  <ValidationField label="Account Holder Name" value={accountHolderName} />
                  <ValidationField label="Bank Validation Status" value={bankValidationStatus} />
                  <ValidationField label="Bank Name" value={repaymentAccount.bankName || "ICICI Bank"} />
                  <ValidationField label="Branch" value={repaymentAccount.branch || "Greater Kailash, Delhi"} />
                </div>
              </div>
            ) : null}

            {validationSucceeded ? (
              <div className="rounded-[14px] border border-[#D5DCE3] bg-white px-4 py-4 text-[13px] leading-6 text-[#22313F]">
                <p className="font-semibold">{footerMessage.earlySettlement || "Should you wish to make an early settlement, please contact us at least 30 days in advance."}</p>
                <p className="mt-3 font-semibold">{footerMessage.pleasureMessage || `It has been a genuine pleasure assisting you today, ${data?.customerName || "Narendar Singh"}.`}</p>
                <p className="mt-3 font-semibold">{footerMessage.successMessage || "We wish you every success with your plans, and we look forward to continuing to be of service."}</p>
                <p className="mt-3 font-semibold">{footerMessage.supportMessage || "Our team is available 24 hours a day, 7 days a week should you need any assistance. Simply call 022-234-5678 or return to this assistant at any time."}</p>
                <p className="mt-3 font-semibold">{footerMessage.thankYouMessage || "Thank you for choosing ICICI Bank."}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handleSubmitClose}
            disabled={isSubmitClosed}
            className="w-full rounded-[14px] bg-[#1457D7] py-3.5 text-[14px] font-semibold text-white shadow-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitCloseLabel}
          </button>

          {isSubmitClosed ? (
            <div className="rounded-[14px] border border-[#D5DCE3] bg-white px-4 py-4 text-[13px] leading-6 text-[#22313F]">
              <p className="font-semibold">{submitCloseText}</p>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="journey-label text-[#2C62C8]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-[#173E8D]">{value}</p>
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <p className="journey-label text-[#2C62C8]">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#173E8D] outline-none transition-colors focus:border-[#1457D7]"
      />
    </div>
  );
}

function ValidationField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="journey-label text-[#2C62C8]">{label}</p>
      <p className="mt-1 text-[13px] font-semibold text-[#1F6C3D]">{value}</p>
    </div>
  );
}