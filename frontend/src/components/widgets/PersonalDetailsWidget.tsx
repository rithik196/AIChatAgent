"use client";

import React from "react";
import { motion } from "framer-motion";
import { StepIndicator } from "./StepIndicator";

export interface PersonalDetailsWidgetProps {
  data: {
    sessionId?: string;
    name: string;
    phone: string;
    email: string;
    personal: any;
    address: any;
    employment: any;
    income: any;
  };
}

export function PersonalDetailsWidget({ data }: PersonalDetailsWidgetProps) {
  const handleModify = () => {
    // Trigger conversational flow by sending a message that triggers modify_requested
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: "I would like to modify my details" }));
  };

  const handleConfirm = () => {
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: "__SYS__Details confirmed, proceed" }));
  };

  const formatAddress = (addr: any) => {
    if (!addr) return "Not Available";
    const parts = [
      addr.buildingNumber,
      addr.street,
      addr.district,
      addr.city,
      addr.postalCode
    ].filter(Boolean);
    return parts.join(", ") + (addr.additionalNumber ? ` (Additional: ${addr.additionalNumber})` : "");
  };

  const residentialAddress = formatAddress(data.address);
  const workAddress = formatAddress(data.employment?.workAddress);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3 pb-6">
      <StepIndicator currentStep={1} />
      
      <div className="bg-white rounded-3xl p-4 mb-4 border border-slate-200 flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold">
          <span>{data.name?.[0]}</span>
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-base">{data.name}</div>
          <div className="text-xs text-slate-500">{data.phone}</div>
          <div className="text-xs text-slate-500">{data.email}</div>
        </div>
      </div>

      <Section title="Personal Details" source="(Fetched from Yakeen)">
        <Detail label="ID Number" value={data.personal.idNumber} />
        <Detail label="Age & Gender" value={`${data.personal.age} / ${data.personal.gender}`} />
        <Detail label="Nationality" value={data.personal.nationality} />
        <Detail label="Marital Status" value={data.personal.maritalStatus} />
        <Detail label="First Name" value={data.personal.firstName || "-"} />
        <Detail label="Father Name" value={data.personal.fatherName || "-"} />
        <Detail label="Grandfather Name" value={data.personal.grandfatherName || "-"} />
        <Detail label="Last Name" value={data.personal.lastName || "-"} />
        <Detail label="Dependents" value={data.personal.dependents} />
        <Detail label="Education" value={data.personal.education || "-"} />
      </Section>

      <Section title="Address Details" source="(Fetched from Saudi Post)">
        <Detail label="City" value={data.address?.city || "-"} />
        <Detail label="House Type" value={data.address?.houseType || "-"} />
        <Detail label="Residential Address" value={residentialAddress} wrap />
      </Section>

      <Section title="Employment Details" source="(Fetched from GOSI)">
        <Detail label="Employer Type" value={data.employment.type} />
        <Detail label="Industry" value={data.employment.industry} />
        <Detail label="Employer Name" value={data.employment.employer} />
        <Detail label="Total Experience" value={data.employment.experience} />
        <Detail label="Work Address" value={workAddress} wrap />
      </Section>

      <Section title="Income Details" source="(Fetched from GOSI)">
        <Detail label="Monthly Income" value={data.income.monthly} />
        <Detail label="Allowances" value={data.income.allowances || "0"} />
        <Detail label="Obligations" value={data.income.obligations || "0"} />
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
      <span className={`text-slate-900 font-semibold mt-0.5 ${wrap ? 'whitespace-normal' : 'truncate'}`}>{value}</span>
    </div>
  );
}
