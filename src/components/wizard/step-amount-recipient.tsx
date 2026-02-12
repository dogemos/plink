import { useRef, useCallback, useState } from "react";
import type { AllowedCurrency } from "@/lib/intent-schema";

const INPUT_CLASSES =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 shadow-sm transition-colors placeholder:text-slate-500 hover:border-slate-500 focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30";

const QUICK_ADD_VALUES = [0.1, 1, 10, 100];

interface StepAmountRecipientProps {
  currency: AllowedCurrency;
  amount: string;
  onAmountChange: (value: string) => void;
  recipient: string;
  onRecipientChange: (value: string) => void;
  onRecipientBlur: () => void;
  errors: { amount?: string; recipient?: string };
}

export function StepAmountRecipient({
  currency,
  amount,
  onAmountChange,
  recipient,
  onRecipientChange,
  onRecipientBlur,
  errors,
}: StepAmountRecipientProps) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [canPaste] = useState(
    () =>
      typeof navigator !== "undefined" &&
      "clipboard" in navigator &&
      typeof navigator.clipboard.readText === "function",
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onRecipientChange(text.trim());
    } catch {
      // Clipboard permission denied — ignore.
    }
  }, [onRecipientChange]);

  const handleQuickAdd = useCallback(
    (value: number) => {
      const current = parseFloat(amount) || 0;
      const next = current + value;
      const display =
        next % 1 === 0
          ? String(next)
          : next.toFixed(currency.decimals).replace(/0+$/, "");
      onAmountChange(display);
      amountRef.current?.focus();
    },
    [amount, currency.decimals, onAmountChange],
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          How much and where?
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Set the amount and paste the recipient address.
        </p>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="mb-1.5 block text-sm font-semibold text-slate-200"
        >
          Amount ({currency.symbol})
        </label>
        <input
          ref={amountRef}
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          spellCheck={false}
          autoComplete="off"
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? "amount-error" : undefined}
          className={INPUT_CLASSES}
        />
        <div className="mt-2 flex gap-2">
          {QUICK_ADD_VALUES.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickAdd(val)}
              className="flex-1 cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
              style={{ touchAction: "manipulation" }}
            >
              +{val}
            </button>
          ))}
        </div>
        {errors.amount && (
          <p id="amount-error" className="mt-1.5 text-sm text-red-300">
            {errors.amount}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="recipient"
          className="mb-1.5 block text-sm font-semibold text-slate-200"
        >
          Recipient address
        </label>
        <div className="relative">
          <input
            id="recipient"
            name="recipient"
            type="text"
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            onBlur={onRecipientBlur}
            placeholder={`${currency.bech32Prefix}1...`}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(errors.recipient)}
            aria-describedby={
              errors.recipient ? "recipient-error" : "recipient-help"
            }
            className={`${INPUT_CLASSES} pr-20 font-mono text-sm`}
          />
          {canPaste && !recipient && (
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
              style={{ touchAction: "manipulation" }}
            >
              Paste
            </button>
          )}
        </div>
        <p id="recipient-help" className="mt-1.5 text-xs text-slate-400">
          Starts with {currency.bech32Prefix}1
        </p>
        {errors.recipient && (
          <p id="recipient-error" className="mt-1.5 text-sm text-red-300">
            {errors.recipient}
          </p>
        )}
      </div>
    </div>
  );
}
