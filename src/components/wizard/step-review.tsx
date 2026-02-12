import type { AllowedCurrency } from "@/lib/intent-schema";

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 shadow-sm transition-colors placeholder:text-slate-500 hover:border-slate-500 focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30";

function shortenAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

interface StepReviewProps {
  currency: AllowedCurrency;
  amount: string;
  recipient: string;
  label: string;
  onLabelChange: (value: string) => void;
  memo: string;
  onMemoChange: (value: string) => void;
  errors: { label?: string; memo?: string };
}

export function StepReview({
  currency,
  amount,
  recipient,
  label,
  onLabelChange,
  memo,
  onMemoChange,
  errors,
}: StepReviewProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Review and create
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Add an optional label or memo, then create your link.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4">
        <p className="text-2xl font-semibold text-slate-100">
          {amount || "0"} {currency.symbol}
        </p>
        <p className="mt-1 text-sm text-slate-300">
          to <span className="font-mono">{shortenAddress(recipient)}</span>
          {" "}on {currency.chainName}
        </p>
      </div>

      <div>
        <label
          htmlFor="label"
          className="mb-1.5 block text-sm font-semibold text-slate-200"
        >
          Label
          <span className="ml-1 font-normal text-slate-500">optional</span>
        </label>
        <input
          id="label"
          name="label"
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Team dinner split"
          maxLength={100}
          autoComplete="off"
          aria-invalid={Boolean(errors.label)}
          aria-describedby={errors.label ? "label-error" : "label-help"}
          className={INPUT_CLASSES}
        />
        <p id="label-help" className="mt-1.5 text-xs text-slate-400">
          The payer sees this. ({label.length}/100)
        </p>
        {errors.label && (
          <p id="label-error" className="mt-1.5 text-sm text-red-300">
            {errors.label}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="memo"
          className="mb-1.5 block text-sm font-semibold text-slate-200"
        >
          Memo
          <span className="ml-1 font-normal text-slate-500">optional</span>
        </label>
        <input
          id="memo"
          name="memo"
          type="text"
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder="Note for the transaction"
          maxLength={256}
          autoComplete="off"
          aria-invalid={Boolean(errors.memo)}
          aria-describedby={errors.memo ? "memo-error" : "memo-help"}
          className={INPUT_CLASSES}
        />
        <p id="memo-help" className="mt-1.5 text-xs text-slate-400">
          Recorded on-chain with the transaction. ({memo.length}/256)
        </p>
        {errors.memo && (
          <p id="memo-error" className="mt-1.5 text-sm text-red-300">
            {errors.memo}
          </p>
        )}
      </div>
    </div>
  );
}
