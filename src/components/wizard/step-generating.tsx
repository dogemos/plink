interface StepGeneratingProps {
  message: string;
}

export function StepGenerating({ message }: StepGeneratingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <span
        aria-hidden
        className="mb-5 h-8 w-8 animate-spin rounded-full border-[3px] border-sky-500/25 border-t-sky-400"
      />
      <p key={message} className="delight-pop text-sm font-semibold text-slate-200">
        {message}
      </p>
    </div>
  );
}
