"use client";

import React from "react";
import { motion } from "framer-motion";

export interface PersonalDetailsWidgetProps {
  data: {
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
    };
  };
}

export function PersonalDetailsWidget({ data }: PersonalDetailsWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm mt-3"
    >
      {/* Header */}
      <div className="bg-white rounded-3xl p-4 mb-4 border border-slate-200 flex items-center gap-3 shadow-sm">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold">
          <span>{data?.name[0]}</span>
        </div>
        <div>
          <div className="font-semibold text-slate-900 text-base">{data?.name}</div>
          <div className="text-xs text-slate-500">{data?.phone}</div>
          <div className="text-xs text-slate-500">{data?.email}</div>
        </div>
      </div>

      {/* Personal Details */}
      <Section title="Personal Details">
        <Detail label="ID Number" value={data?.personal?.idNumber} />
        <Detail label="Age" value={data?.personal?.age} />
        <Detail label="Gender" value={data?.personal?.gender} />
        <Detail label="Date of Birth (GR)" value={data?.personal?.dobGR} />
        <Detail label="Date of Birth (HJ)" value={data?.personal?.dobHJ} />
        <Detail label="Residential Address" value={data?.personal?.address} />
        <Detail label="Marital Status" value={data?.personal?.maritalStatus} />
        <Detail label="Nationality" value={data?.personal?.nationality} />
        <Detail label="Father Name" value={data?.personal?.fatherName} />
        <Detail label="Grandfather Name" value={data?.personal?.grandfatherName} />
        <Detail label="No. of Dependents" value={data?.personal?.dependents} />
        <Detail label="Income Type" value={data?.personal?.incomeType} />
      </Section>

      {/* Employment Details */}
      <Section title="Employment Details">
        <Detail label="Employment Type" value={data?.employment?.type} />
        <Detail label="Industry Type" value={data?.employment?.industry} />
        <Detail label="Employer Name" value={data?.employment?.employer} />
        <Detail label="Total Experience (years)" value={data?.employment?.experience} />
        <Detail label="Employment Address" value={data?.employment?.address} />
      </Section>

      {/* Income Details */}
      <Section title="Income Details">
        <Detail label="Monthly Income" value={data?.income?.monthly} />
      </Section>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 mb-3 border border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-blue-500">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        {children}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col mb-1">
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="text-slate-900 font-semibold truncate">{value}</span>
    </div>
  );
}
