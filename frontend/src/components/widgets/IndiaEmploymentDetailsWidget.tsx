"use client";

import React, { useMemo, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Pencil, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { VOICE_WIDGET_FIELD_UPDATE_EVENT, type VoiceWidgetFieldUpdate } from "@/lib/voiceWidgetFields";

type IndiaEmploymentDetailsWidgetData = {
  mode?: "view" | "edit";
  title?: string;
  employment_type?: string;
  industry_type?: string;
  total_experience?: string;
  employer_name?: string;
  uan?: string;
  employee_member_id?: string;
  employee_name?: string;
  uan_status?: string;
  work_address?: string;
  work_city?: string;
  work_postal_code?: string;
};

type RowKey =
  | "industry_type"
  | "total_experience"
  | "employer_name"
  | "employee_member_id";

type WidgetProps = {
  data?: IndiaEmploymentDetailsWidgetData;
  messageId?: string;
};

type EditableValues = {
  employmentType: string;
  industryType: string;
  totalExperience: string;
  employerName: string;
  uan: string;
  employeeMemberId: string;
  employeeName: string;
  uanStatus: string;
};

export function IndiaEmploymentDetailsWidget({ data, messageId }: WidgetProps) {
  const mode = data?.mode === "edit" ? "edit" : "view";
  const [activeField, setActiveField] = useState<RowKey | null>(null);
  const [values, setValues] = useState<EditableValues>(() => ({
    employmentType: data?.employment_type ?? "Salaried",
    industryType: data?.industry_type ?? "IT",
    totalExperience: data?.total_experience ?? "12 Years",
    employerName: data?.employer_name ?? "Newgen Software Technologies Limited",
    uan: data?.uan ?? "101234567890",
    employeeMemberId: data?.employee_member_id ?? "DSNHP00140020000021762",
    employeeName: data?.employee_name ?? "Narendar Singh",
    uanStatus: data?.uan_status ?? "Active",
  }));

  const payload = useMemo(
    () => ({
      type: values.employmentType,
      industry: values.industryType,
      experience: values.totalExperience,
      employer: values.employerName,
      uan: values.uan,
      employeeMemberId: values.employeeMemberId,
      employeeName: values.employeeName,
      uanStatus: values.uanStatus,
      workAddress: {
        line1: data?.work_address ?? "Manyata Tech Park",
        city: data?.work_city ?? "Bengaluru",
        postalCode: data?.work_postal_code ?? "560045",
      },
    }),
    [data?.work_address, data?.work_city, data?.work_postal_code, values]
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
    sendSignal("Save updated employment details", `__SYS__UPDATE_EMPLOYMENT: ${JSON.stringify(payload)}`);
  };

  React.useEffect(() => {
    const handleVoiceUpdate = (event: Event) => {
      const detail = (event as CustomEvent<VoiceWidgetFieldUpdate>).detail;
      if (!detail || detail.widget !== "IndiaEmploymentDetailsWidget" || detail.messageId !== messageId) return;

      setValues((current) => ({
        ...current,
        ...(typeof detail.updates.industryType === "string" ? { industryType: detail.updates.industryType } : {}),
        ...(typeof detail.updates.totalExperience === "string" ? { totalExperience: detail.updates.totalExperience } : {}),
        ...(typeof detail.updates.employerName === "string" ? { employerName: detail.updates.employerName } : {}),
        ...(typeof detail.updates.employeeMemberId === "string" ? { employeeMemberId: detail.updates.employeeMemberId } : {}),
      }));
    };

    window.addEventListener(VOICE_WIDGET_FIELD_UPDATE_EVENT, handleVoiceUpdate);
    return () => window.removeEventListener(VOICE_WIDGET_FIELD_UPDATE_EVENT, handleVoiceUpdate);
  }, [messageId]);

  const rows: Array<{
    key: RowKey | "employment_type" | "uan" | "employee_name" | "uan_status";
    label: string;
    viewValue: string;
    editable?: boolean;
    control?: React.ReactNode;
  }> = [
    {
      key: "employment_type",
      label: "Employment Type",
      viewValue: values.employmentType,
    },
    {
      key: "industry_type",
      label: "Industry Type",
      viewValue: values.industryType,
      editable: true,
      control: (
        <input
          type="text"
          value={values.industryType}
          onChange={(event) => setValues((current) => ({ ...current, industryType: event.target.value }))}
          className="w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
        />
      ),
    },
    {
      key: "total_experience",
      label: "Total Experience",
      viewValue: values.totalExperience,
      editable: true,
      control: (
        <input
          type="text"
          value={values.totalExperience}
          onChange={(event) => setValues((current) => ({ ...current, totalExperience: event.target.value }))}
          className="w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
        />
      ),
    },
    {
      key: "employer_name",
      label: "Employer Name",
      viewValue: values.employerName,
      editable: true,
      control: (
        <input
          type="text"
          value={values.employerName}
          onChange={(event) => setValues((current) => ({ ...current, employerName: event.target.value }))}
          className="w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
        />
      ),
    },
    {
      key: "uan",
      label: "UAN",
      viewValue: values.uan,
    },
    {
      key: "employee_member_id",
      label: "Employee Member ID",
      viewValue: values.employeeMemberId,
      editable: true,
      control: (
        <input
          type="text"
          value={values.employeeMemberId}
          onChange={(event) => setValues((current) => ({ ...current, employeeMemberId: event.target.value }))}
          className="w-full rounded-[12px] border border-[#D5DCE3] bg-white px-3 py-2 text-[13px] font-semibold text-[#11336B] focus:border-[#2C62C8] focus:outline-none"
        />
      ),
    },
    {
      key: "employee_name",
      label: "Employee Name",
      viewValue: values.employeeName,
    },
    {
      key: "uan_status",
      label: "UAN Status",
      viewValue: values.uanStatus,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <div className="rounded-[22px] border border-[#D9E4FF] bg-white shadow-[0_10px_30px_rgba(31,76,156,0.08)]">
          <div className="flex items-center gap-3 border-b border-[#E7EEFF] px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1D56D91A] text-[#1D56D9]">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[20px] font-semibold leading-6 text-[#143879]">{data?.title ?? "Employment Details"}</h3>
              {mode === "edit" ? (
                <p className="mt-1 text-[12px] leading-5 text-[#6A7C97]">Use the edit controls to update the values below.</p>
              ) : null}
            </div>
          </div>

          <div className="px-4 py-2">
            {rows.map((row) => {
              const active = activeField === row.key;
              return (
                <div key={row.key} className="grid grid-cols-1 gap-2 border-b border-[#EEF3FF] py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                  <span className="self-start text-[12px] font-medium leading-4 text-[#2557B7]">{row.label}</span>
                  <div className="min-w-0">
                    {mode === "edit" && row.editable ? row.control : <span className={`mt-1 block text-[13px] font-semibold leading-5 ${row.key === "employee_member_id" ? "break-all pr-1 text-[#143879]" : row.key === "uan_status" ? "text-[#1E9F5A]" : "text-[#143879]"}`}>{row.viewValue}</span>}
                  </div>
                  {mode === "edit" && row.editable ? (
                    <button
                      type="button"
                      onClick={() => setActiveField(row.key as RowKey)}
                      className={`self-start sm:self-center flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${active ? "border-[#1D56D9] bg-[#EDF4FF] text-[#1D56D9]" : "border-[#D9E4FF] bg-white text-[#3970DA]"}`}
                      aria-label={`Edit ${row.label}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : row.key === "uan_status" || row.key === "employer_name" || row.key === "employee_member_id" || row.key === "total_experience" ? (
                    <ShieldCheck className={`self-start sm:self-center h-4 w-4 ${row.key === "uan_status" ? "text-[#1E9F5A]" : "text-[#5DCA8A]"}`} />
                  ) : (
                    <div className="h-4 w-4 self-start sm:self-center" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 py-4">
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={() => sendSignal("Back to employment details", "__SYS__india_cancel_employment_edit")}
                  className="rounded-[14px] border border-[#2C62C8] bg-white px-3 py-3 text-[13px] font-semibold text-[#1457D7] transition-all duration-300 hover:bg-[#F5F9FF]"
                >
                  Back to Review
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-[14px] bg-[#1457D7] px-3 py-3 text-[13px] font-semibold text-white transition-all duration-300 hover:opacity-95"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => sendSignal("I confirm these details are accurate", "__SYS__india_employment_confirmed")}
                  className="flex items-center justify-center gap-2 rounded-[14px] border border-[#2C62C8] bg-white px-3 py-3 text-[13px] font-semibold text-[#1457D7] transition-all duration-300 hover:bg-[#F5F9FF]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I confirm these details are accurate</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendSignal("I wish to modify my Employment Details", "__SYS__india_modify_employment")}
                  className="flex items-center justify-center gap-2 rounded-[14px] border border-[#2C62C8] bg-white px-3 py-3 text-[13px] font-semibold text-[#1457D7] transition-all duration-300 hover:bg-[#F5F9FF]"
                >
                  <Pencil className="h-4 w-4" />
                  <span>I wish to modify my Employment Details</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}