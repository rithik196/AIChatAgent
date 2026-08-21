"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Pencil, ShieldCheck, UserCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { VOICE_WIDGET_FIELD_UPDATE_EVENT, type VoiceWidgetFieldUpdate } from "@/lib/voiceWidgetFields";

type IndiaPersonalDetailsWidgetData = {
  mode?: "view" | "edit";
  name?: string;
  phone?: string;
  email?: string;
  aadhaar_number?: string;
  gender?: string;
  date_of_birth?: string;
  residential_address?: string;
  marital_status?: string;
  nationality?: string;
  father_name?: string;
  dependents?: string;
  income_type?: string;
};

type RowKey =
  | "date_of_birth"
  | "residential_address"
  | "marital_status"
  | "father_name"
  | "dependents";

type EditableValues = {
  name: string;
  phone: string;
  email: string;
  aadhaarNumber: string;
  gender: string;
  dateOfBirth: string;
  residentialAddress: string;
  maritalStatus: string;
  nationality: string;
  fatherName: string;
  dependents: string;
  incomeType: string;
};

type WidgetProps = {
  data?: IndiaPersonalDetailsWidgetData;
  messageId?: string;
};

export function IndiaPersonalDetailsWidget({ data, messageId }: WidgetProps) {
  const mode = data?.mode === "edit" ? "edit" : "view";
  const [activeField, setActiveField] = useState<RowKey | null>(null);
  const [values, setValues] = useState<EditableValues>(() => ({
    name: data?.name ?? "Narendar Singh",
    phone: data?.phone ?? "8811223344",
    email: data?.email ?? "narendar.singh@gmail.com",
    aadhaarNumber: data?.aadhaar_number ?? "XXXX XXXX 6832",
    gender: data?.gender ?? "Male",
    dateOfBirth: data?.date_of_birth ?? "15/01/1990",
    residentialAddress: data?.residential_address ?? "23, Jasari Khatima, Jhunkat, Udham Singh Nagar, Uttarakhand-262308, India",
    maritalStatus: data?.marital_status ?? "Single",
    nationality: data?.nationality ?? "Indian",
    fatherName: data?.father_name ?? "Ramesh Singh",
    dependents: data?.dependents ?? "04",
    incomeType: data?.income_type ?? "Salaried",
  }));

  const payload = useMemo(
    () => ({
      name: values.name,
      phone: values.phone,
      email: values.email,
      aadhaar_number: values.aadhaarNumber,
      gender: values.gender,
      date_of_birth: values.dateOfBirth,
      residential_address: values.residentialAddress,
      marital_status: values.maritalStatus,
      nationality: values.nationality,
      father_name: values.fatherName,
      dependents: values.dependents,
      income_type: values.incomeType,
    }),
    [values]
  );

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

  const handleSave = () => {
    sendSignal("Save updated personal details", `__SYS__UPDATE_INDIA_PERSONAL: ${JSON.stringify(payload)}`);
  };

  React.useEffect(() => {
    const handleVoiceUpdate = (event: Event) => {
      const detail = (event as CustomEvent<VoiceWidgetFieldUpdate>).detail;
      if (!detail || detail.widget !== "IndiaPersonalDetailsWidget" || detail.messageId !== messageId) return;

      setValues((current) => ({
        ...current,
        ...(typeof detail.updates.dateOfBirth === "string" ? { dateOfBirth: detail.updates.dateOfBirth } : {}),
        ...(typeof detail.updates.residentialAddress === "string" ? { residentialAddress: detail.updates.residentialAddress } : {}),
        ...(typeof detail.updates.maritalStatus === "string" ? { maritalStatus: detail.updates.maritalStatus } : {}),
        ...(typeof detail.updates.fatherName === "string" ? { fatherName: detail.updates.fatherName } : {}),
        ...(typeof detail.updates.dependents === "string" ? { dependents: detail.updates.dependents } : {}),
      }));
    };

    window.addEventListener(VOICE_WIDGET_FIELD_UPDATE_EVENT, handleVoiceUpdate);
    return () => window.removeEventListener(VOICE_WIDGET_FIELD_UPDATE_EVENT, handleVoiceUpdate);
  }, [messageId]);

  const rows: Array<{
    key: RowKey | "aadhaar_number" | "gender" | "nationality" | "income_type";
    label: string;
    value: string;
    wrap?: boolean;
    editable?: boolean;
    control?: React.ReactNode;
  }> = [
    {
      key: "aadhaar_number",
      label: "AADHAAR Number",
      value: values.aadhaarNumber,
    },
    {
      key: "gender",
      label: "Gender",
      value: values.gender,
    },
    {
      key: "date_of_birth",
      label: "Date of Birth",
      value: values.dateOfBirth,
      editable: true,
      control: <FieldInput value={values.dateOfBirth} onChange={(value) => setValues((current) => ({ ...current, dateOfBirth: value }))} />,
    },
    {
      key: "residential_address",
      label: "Residential Address",
      value: values.residentialAddress,
      wrap: true,
      editable: true,
      control: <FieldInput value={values.residentialAddress} onChange={(value) => setValues((current) => ({ ...current, residentialAddress: value }))} />,
    },
    {
      key: "marital_status",
      label: "Marital Status",
      value: values.maritalStatus,
      editable: true,
      control: (
        <FieldSelect value={values.maritalStatus} options={["Single", "Married", "Divorced", "Widowed"]} onChange={(value) => setValues((current) => ({ ...current, maritalStatus: value }))} />
      ),
    },
    {
      key: "nationality",
      label: "Nationality",
      value: values.nationality,
    },
    {
      key: "father_name",
      label: "Father's Name",
      value: values.fatherName,
      editable: true,
      control: <FieldInput value={values.fatherName} onChange={(value) => setValues((current) => ({ ...current, fatherName: value }))} />,
    },
    {
      key: "dependents",
      label: "No. of Dependents",
      value: values.dependents,
      editable: true,
      control: <FieldInput value={values.dependents} onChange={(value) => setValues((current) => ({ ...current, dependents: value }))} />,
    },
    {
      key: "income_type",
      label: "Income Type",
      value: values.incomeType,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="w-full max-w-sm mt-3">
      <div className="journey-surface p-5">
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#D9E4FF] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(31,76,156,0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173E8D] text-white">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="break-words text-[18px] font-semibold text-[#173E8D]">{values.name}</h3>
                <p className="mt-1 text-[13px] text-[#274B7A]">{values.phone}</p>
                <p className="mt-1 break-all text-[12px] text-[#5D7394]">{values.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#D9E4FF] bg-white shadow-[0_8px_24px_rgba(31,76,156,0.08)]">
            <div className="flex items-center gap-3 border-b border-[#E7EEFF] px-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173E8D] text-white">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <h4 className="text-[18px] font-semibold text-[#173E8D]">Personal Details</h4>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
              {rows.map((row) => {
                const active = activeField === row.key;
                const rowClassName = row.wrap ? "col-span-2" : "";
                return (
                  <div key={row.key} className={rowClassName}>
                    <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#2C62C8]">{row.label}</p>
                        {mode === "edit" && row.editable ? (
                          row.control
                        ) : (
                          <p className={`mt-1 text-[13px] font-semibold ${row.key === "residential_address" ? "leading-5 text-[#173E8D]" : "text-[#173E8D]"}`}>{row.value}</p>
                        )}
                      </div>
                      {mode === "edit" && row.editable ? (
                        <button
                          type="button"
                          onClick={() => setActiveField(row.key as RowKey)}
                          className={`mt-5 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${active ? "border-[#1D56D9] bg-[#EDF4FF] text-[#1D56D9]" : "border-[#D9E4FF] bg-white text-[#3970DA]"}`}
                          aria-label={`Edit ${row.label}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : ["date_of_birth", "residential_address", "marital_status", "father_name", "dependents"].includes(row.key) ? (
                        <ShieldCheck className="mt-5 h-4 w-4 text-[#1E9F5A]" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={() => sendSignal("Back to personal details", "__SYS__india_cancel_personal_edit")}
                  className="w-full rounded-[12px] border border-[#1457D7] bg-white px-4 py-3 text-[13px] font-semibold text-[#1457D7] hover:bg-[#F5F9FF]"
                >
                  Back to Review
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full rounded-[12px] bg-[#1457D7] px-4 py-3 text-[13px] font-semibold text-white hover:opacity-95"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => sendSignal("I confirm these details are accurate", "__SYS__india_personal_details_confirmed")}
                  className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1457D7] px-4 py-3 text-[13px] font-semibold text-white hover:opacity-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I confirm these details are accurate</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendSignal("I wish to modify my personal details", "__SYS__india_modify_personal_details")}
                  className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#1457D7] px-4 py-3 text-[13px] font-semibold text-white hover:opacity-95"
                >
                  <Pencil className="h-4 w-4" />
                  <span>I wish to modify my personal details</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FieldInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
    />
  );
}

function FieldSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}