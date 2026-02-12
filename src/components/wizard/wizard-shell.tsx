"use client";

import { WizardSteps } from "./wizard-steps";

const STEPS = ["Currency", "Details", "Review", "Share"];

interface WizardShellProps {
  currentStep: number;
  direction: "forward" | "backward";
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
}

export function WizardShell({
  currentStep,
  direction,
  children,
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = "Continue",
  showBack = true,
  showNext = true,
}: WizardShellProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_24px_40px_-28px_rgba(2,6,23,0.78)] backdrop-blur sm:p-7">
      <div className="mb-6">
        <WizardSteps steps={STEPS} currentStep={currentStep} />
      </div>

      <div
        key={currentStep}
        className={direction === "forward" ? "step-forward" : "step-backward"}
      >
        {children}
      </div>

      {(showBack || showNext) && (
        <div className="mt-6 flex gap-3">
          {showBack && currentStep > 0 && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              style={{ touchAction: "manipulation" }}
            >
              Back
            </button>
          ) : null}

          {showNext && onNext ? (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-base font-semibold text-slate-950 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-700 disabled:text-slate-400"
              style={{ touchAction: "manipulation" }}
            >
              {nextLabel}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
