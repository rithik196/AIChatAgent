"use client";

import React from "react";
import { motion } from "framer-motion";

export interface PersonalDetailsWidgetProps {
  data: {
    sessionId?: string;
    name: string;
    phone: string;
    email: string;
    personal: {
      idNumber: string;
      age: number;
      gender: string;
      dobGR: string;
      dobHJ: string;
      address: string;
      maritalStatus: string;
      nationality: string;
      fatherName: string;
      grandfatherName: string;
      dependents: string;
      incomeType: string;
      levelOfEducation?: string;
    };
    employment: {
      type: string;
      industry: string;
      employer: string;
      experience: string;
      address: string;
    };
    income: {
      monthly: string;
      obligations?: string;
    };
  };
}

export function PersonalDetailsWidget({ data }: PersonalDetailsWidgetProps) {
  // We use events to signal the backend instead of internal component state, 
  // since the UX is fully conversational.
  
  const handleModify = () => {
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: "__SYS__Modify details" }));
  };

  const handleConfirm = () => {
    window.dispatchEvent(new CustomEvent("mock-send-message", { detail: "__SYS__Details confirmed, proceed" }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mt-3">
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
        <Detail label="Age" value={data.personal.age} />
        <Detail label="Nationality" value={data.personal.nationality} />
        <Detail label="Gender" value={data.personal.gender} />
        <Detail label="DOB (Gregorian)" value={data.personal.dobGR} />
        <Detail label="DOB (Hijri)" value={data.personal.dobHJ} />
        <Detail label="Marital Status" value={data.personal.maritalStatus} />
        <Detail label="Dependents" value={data.personal.dependents} />
        <Detail label="Father Name" value={data.personal.fatherName} />
        <Detail label="Grandfather Name" value={data.personal.grandfatherName} />
        <Detail label="Income Type" value={data.personal.incomeType} />
        <Detail label="Education" value={data.personal.levelOfEducation || "N/A"} />
      </Section>

      <Section title="Address Details" source="(Fetched from Saudi Post)">
        <Detail label="Residential Address" value={data.personal.address} wrap={true} />
      </Section>

      <Section title="Employment Details" source="(Fetched from GOSI)">
        <Detail label="Employer Type" value={data.employment.type} />
        <Detail label="Industry" value={data.employment.industry} />
        <Detail label="Employer Name" value={data.employment.employer} />
        <Detail label="Total Experience" value={data.employment.experience} />
      </Section>

      <Section title="Income Details" source="(Fetched from GOSI)">
        <Detail label="Monthly Income" value={data.income.monthly} />
        <Detail label="Obligations" value={data.income.obligations || "0"} />
      </Section>

      <div className="flex gap-2 mt-2">
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

function Section({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
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

function Detail({ label, value, wrap = false }: { label: string; value: React.ReactNode; wrap?: boolean }) {
  return (
    <div className={`flex flex-col ${wrap ? 'col-span-2' : ''}`}>
      <span className="text-slate-500 font-medium text-[10px] uppercase">{label}</span>
      <span className={`text-slate-900 font-semibold mt-0.5 ${wrap ? 'whitespace-normal' : 'truncate'}`}>{value}</span>
    </div>
  );
}
