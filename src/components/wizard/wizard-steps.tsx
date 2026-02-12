interface WizardStepsProps {
  steps: string[];
  currentStep: number;
}

export function WizardSteps({ steps, currentStep }: WizardStepsProps) {
  return (
    <ol className="flex items-center gap-1">
      {steps.map((label, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;

        let dotColor = "border-slate-700 bg-slate-900";
        let textColor = "text-slate-500";
        let barColor = "bg-slate-800";

        if (isComplete) {
          dotColor = "border-emerald-500/50 bg-emerald-400";
          textColor = "text-emerald-200";
          barColor = "bg-emerald-500";
        } else if (isActive) {
          dotColor = "border-sky-500/50 bg-sky-400";
          textColor = "text-sky-200";
          barColor = "bg-sky-500";
        }

        return (
          <li key={label} className="flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border ${dotColor} transition-colors`}
              />
              <p className={`text-xs font-semibold ${textColor} transition-colors`}>
                {label}
              </p>
            </div>
            <div className={`mt-1.5 h-1 rounded-full ${barColor} transition-colors`} />
          </li>
        );
      })}
    </ol>
  );
}
