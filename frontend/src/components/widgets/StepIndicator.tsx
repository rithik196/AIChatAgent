"use client";

interface StepIndicatorProps {
  currentStep?: number;
  totalSteps?: number;
  show?: boolean;
  variant?: "number" | "check";
}

export function StepIndicator({ currentStep, totalSteps = 5, show = false, variant = "number" }: StepIndicatorProps) {
  if (!show || !currentStep) {
    return null;
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="journey-step-circle"
        style={
          variant === "check"
            ? { background: "#16A34A", color: "#FFFFFF", borderColor: "#16A34A" }
            : undefined
        }
      >
        {variant === "check" ? "✓" : currentStep}
      </span>
      <span className="journey-value">
        {`Step ${currentStep}/${totalSteps}`}
      </span>
    </div>
  );
}
