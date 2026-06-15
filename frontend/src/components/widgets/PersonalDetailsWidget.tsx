"use client";

import React from "react";
import { motion } from "framer-motion";
import { StepIndicator } from "./StepIndicator";

export interface PersonalDetailsWidgetProps {
  data: {
    name: string;
    phone: string;
    email: string;
    personal: {
      idNumber: string;
      idExpirationDate?: string;
      nationality?: string;
      levelOfEducation?: string;
      maritalStatus?: string;
      dependents?: string;
    };
    address: {
      line1?: string;
      line2?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      houseType?: string;
    };
    employment: {
      type?: string;
      industry?: string;
      employer?: string;
      experience?: string;
      workAddress?: {
        line1?: string;
        city?: string;
        postalCode?: string;
      };
    };
    income: {
      monthly?: string;
      obligations?: string;
      creditCardLimit?: string;
    };
  };
}

export function PersonalDetailsWidget({ data }: PersonalDetailsWidgetProps) {
  const handleModify = () => {
    // Trigger conversational flow by sending a message that triggers modify_requested
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: "I would like to modify my details" }));
  };

  const handleConfirm = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: "Details confirmed, proceed",
          systemText: "__SYS__Details confirmed, proceed",
        },
      })
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3 pb-6">
      <StepIndicator currentStep={1} />

      <Section title="Personal Details" source="(Fetched from Yakeen)">
        <Detail label="ID Number" value={data.personal.idNumber} />
        <Detail label="Name" value={data.name} />
        <Detail label="Contact Number" value={data.phone} />
        <Detail label="Email Id" value={data.email} wrap />
        <Detail label="Nationality" value={data.personal.nationality || ""} />
        <Detail label="ID expiration date" value={data.personal.idExpirationDate || ""} />
        <Detail label="Level of education" value={data.personal.levelOfEducation || ""} />
        <Detail label="Marital Status" value={data.personal.maritalStatus || ""} />
        <Detail label="No. of dependents" value={data.personal.dependents || ""} />
      </Section>

      <Section title="Address Details" source="(Fetched from Saudi Post)">
        <Detail label="Address Line 1" value={data.address?.line1 || "-"} wrap />
        <Detail label="Address Line 2" value={data.address?.line2 || "-"} wrap />
        <Detail label="Street" value={data.address?.street || "-"} />
        <Detail label="City" value={data.address?.city || "-"} />
        <Detail label="Postal Code" value={data.address?.postalCode || "-"} />
        <Detail label="House Type" value={data.address?.houseType || "-"} />
      </Section>

      <Section title="Employment Details" source="(Fetched from GOSI)">
        <Detail label="Employer type" value={data.employment.type || "-"} />
        <Detail label="Employer name" value={data.employment.employer || "-"} />
        <Detail label="Industry type" value={data.employment.industry || "-"} />
        <Detail label="Total Experience" value={data.employment.experience || "-"} />
        <Detail label="Work Address" value={data.employment.workAddress?.line1 || "-"} wrap />
        <Detail label="Work City" value={data.employment.workAddress?.city || "-"} />
        <Detail label="Work Post code" value={data.employment.workAddress?.postalCode || "-"} />
      </Section>

      <Section title="Income Details" source="(Fetched from GOSI)">
        <Detail label="Monthly Income" value={data.income.monthly || "-"} />
        <Detail label="Obligations" value={data.income.obligations || "-"} />
      </Section>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleModify}
          className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full hover:bg-slate-200 transition-all shadow-sm"
        >
          Modify Details
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
        >
          Confirm & Continue
        </button>
      </div>
    </motion.div>
  );
}

// --- Subcomponents ---

function Section({ title, source, children }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm">
      <div className="flex flex-col mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-500">
           <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
        </div>
        {source && <span className="text-[10px] text-slate-400 font-medium ml-7">{source}</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs">
         {children}
      </div>
    </div>
  );
}

function Detail({ label, value, wrap = false }: any) {
  return (
    <div className={`flex flex-col ${wrap ? 'col-span-2' : ''}`}>
      <span className="text-slate-500 font-medium text-[10px] uppercase">{label}</span>
      <span className={`text-slate-900 font-semibold mt-0.5 ${wrap ? 'whitespace-normal' : 'truncate'}`}>{value ?? ""}</span>
    </div>
  );
}
