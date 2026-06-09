"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export interface ExpensesWidgetProps {
  data: {
    prefilled?: boolean;       // true when Open Banking auto-populated values
    totalExpenses?: number;    // auto-populated total from Open Banking (SAR 7560)
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

// Auto-populate split from Open Banking total of SAR 7560
const OPEN_BANKING_VALUES: Record<string, string> = {
  housing: "3000",
  food: "1500",
  utilities: "760",
  healthcare: "500",
  transportation: "1000",
  education: "800",
};

export function ExpensesWidget({ data }: ExpensesWidgetProps) {
  const initialValues = data?.prefilled
    ? OPEN_BANKING_VALUES
    : Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, ""]));

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = Object.values(values)
    .map((v) => parseFloat(v) || 0)
    .reduce((a, b) => a + b, 0);

  const allFilled = EXPENSE_CATEGORIES.every((c) => values[c.key] && parseFloat(values[c.key]) > 0);

  const handleSubmit = () => {
    if (!allFilled) return;
    setIsSubmitting(true);
    const detail = `Monthly expenses confirmed: SAR ${total.toLocaleString()}`;
    const event = new CustomEvent("mock-send-message", { detail });
    window.dispatchEvent(event);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-sm mt-3"
    >
      <div
        className="rounded-3xl p-5 shadow-sm border border-slate-100"
        style={{
          backgroundColor: "#FFFFFF",
          backgroundImage:
            "linear-gradient(125.41deg, rgba(185, 220, 242, 0.15) -6.53%, rgba(235, 244, 245, 0.15) 110.14%)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">📊</span>
          <h3 className="text-base font-bold text-slate-900">Monthly Expenses</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-9">
          {data?.prefilled
            ? "Pre-filled via Open Banking. Please review and confirm."
            : "Please enter your average monthly spend for each category."}
        </p>

        <div className="flex flex-col gap-3">
          {EXPENSE_CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-center gap-3">
              <span className="text-xl w-7 text-center">{cat.icon}</span>
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-slate-600 mb-0.5">{cat.label}</div>
                <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-400">
                  <span className="text-xs text-slate-400 px-2 font-medium">SAR</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={values[cat.key]}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [cat.key]: e.target.value }))
                    }
                    placeholder={cat.placeholder}
                    className="flex-1 py-2 pr-3 text-sm bg-transparent border-none focus:outline-none text-slate-900"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">Total Monthly Expenses</span>
          <span className="text-base font-bold text-blue-700">SAR {total.toLocaleString()}</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allFilled || isSubmitting}
          className="w-full mt-4 py-3 text-white font-semibold rounded-full shadow-md hover:opacity-90 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(90deg, #1B6A8A 0%, #4BA3C7 100%)" }}
        >
          {isSubmitting ? "Confirming..." : "Confirm Expenses"}
        </button>
      </div>
    </motion.div>
  );
}
