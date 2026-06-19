"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, PencilLine } from "lucide-react";
import { motion } from "framer-motion";

export interface ExpensesWidgetProps {
  data?: {
    mode?: "review" | "edit";
    prefilled?: boolean;
    totalExpenses?: number;
    breakdown?: Partial<Record<string, string | number>>;
  };
}

const EXPENSE_CATEGORIES = [
  { key: "housing", label: "Housing / Rent", icon: "🏠", placeholder: "e.g. 1500" },
  { key: "food", label: "Food & Groceries", icon: "🛒", placeholder: "e.g. 800" },
  { key: "utilities", label: "Utility Bills", icon: "💡", placeholder: "e.g. 400" },
  { key: "healthcare", label: "Healthcare", icon: "🏥", placeholder: "e.g. 300" },
  { key: "transportation", label: "Transportation", icon: "🚗", placeholder: "e.g. 600" },
  { key: "education", label: "Education", icon: "🎓", placeholder: "e.g. 500" },
];

const OPEN_BANKING_VALUES: Record<string, string> = {
  housing: "3000",
  food: "1500",
  utilities: "760",
  healthcare: "500",
  transportation: "1000",
  education: "800",
};

export function ExpensesWidget({ data }: ExpensesWidgetProps) {
  const isEditMode = data?.mode === "edit";

  const initialValues = useMemo(() => {
    const source =
      data?.breakdown && Object.keys(data.breakdown).length > 0
        ? data.breakdown
        : data?.prefilled
          ? OPEN_BANKING_VALUES
          : {};

    return Object.fromEntries(
      EXPENSE_CATEGORIES.map((c) => [c.key, String(source[c.key] ?? "")])
    ) as Record<string, string>;
  }, [data?.breakdown, data?.prefilled]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setIsSubmitting(false);
  }, [initialValues, isEditMode]);

  const total = Object.values(values)
    .map((v) => parseFloat(v) || 0)
    .reduce((a, b) => a + b, 0);

  const allFilled = EXPENSE_CATEGORIES.every((c) => values[c.key] && parseFloat(values[c.key]) > 0);

  const handleModify = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: "Modify Expenses",
          systemText: "__SYS__EXPENSES_MODIFY",
        },
      })
    );
  };

  const handleConfirm = () => {
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: "Confirm Expenses",
          systemText: "__SYS__EXPENSES_CONFIRM",
        },
      })
    );
  };

  const handleSubmit = () => {
    if (!allFilled) return;
    setIsSubmitting(true);
    window.dispatchEvent(
      new CustomEvent("mock-send-message", {
        detail: {
          visibleText: "Save updated expenses",
          systemText: `__SYS__UPDATE_EXPENSES: ${JSON.stringify({
            breakdown: values,
            totalExpenses: total,
          })}`,
        },
      })
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div className="journey-surface p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h3 className="journey-heading">Monthly Expenses</h3>
        </div>
        <p className="journey-label mb-4 ml-9">
          {isEditMode
            ? "Edit the category amounts below, then save your changes."
            : "Review the category breakdown below and confirm to continue."}
        </p>

        <div className="flex flex-col gap-3">
          {EXPENSE_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center">{cat.icon}</span>
              <div className="flex-1">
                <div className="journey-label mb-0.5">{cat.label}</div>
                <div
                  className={`flex items-center border rounded-[16px] overflow-hidden ${
                    isEditMode
                      ? "bg-white border-[#D5DCE3] focus-within:ring-2 focus-within:ring-blue-400"
                      : "bg-slate-50 border-[#D5DCE3]"
                  }`}
                >
                  <span className="journey-label px-2">SAR</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={values[cat.key]}
                    onChange={(e) => setValues((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                    placeholder={cat.placeholder}
                    disabled={!isEditMode}
                    readOnly={!isEditMode}
                    className={`flex-1 py-2 pr-3 text-[14px] leading-[16px] bg-transparent border-none focus:outline-none ${
                      isEditMode ? "text-[#0D141A] font-semibold" : "text-[#0D141A] font-normal cursor-default"
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#D5DCE3] flex justify-between items-center">
          <span className="journey-value">Total Monthly Expenses</span>
          <span className="journey-value text-blue-700">SAR {total.toLocaleString()}</span>
        </div>

        {isEditMode ? (
          <button
            onClick={handleSubmit}
            disabled={!allFilled || isSubmitting}
            className="w-full mt-4 py-3 journey-widget-button shadow-md hover:opacity-90 transition-all disabled:opacity-40"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={handleModify}
              className="w-full py-3 journey-widget-button border border-transparent transition-all flex items-center justify-center gap-2"
            >
              <PencilLine size={16} />
              Modify
            </button>
            <button
              onClick={handleConfirm}
              className="w-full py-3 journey-widget-button shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Confirm
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
