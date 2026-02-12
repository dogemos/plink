"use client";

import { useCallback, useRef, useState } from "react";
import {
  ALLOWED_CURRENCIES,
  type AllowedCurrency,
  type PaymentIntent,
} from "@/lib/intent-schema";
import { buildPaymentUrl } from "@/lib/intent-url";
import { displayToBaseAmount, validateAddress } from "@/lib/validation";
import { QRCodeDisplay } from "./qr-code";

interface FormErrors {
  currency?: string;
  recipient?: string;
  amount?: string;
  memo?: string;
  label?: string;
}

export function IntentForm() {
  const [selectedCurrency, setSelectedCurrency] =
    useState<AllowedCurrency>(ALLOWED_CURRENCIES[0]);
  const [recipient, setRecipient] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const recipientRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!recipient) {
      newErrors.recipient = "Recipient address is required";
    } else if (
      !validateAddress(recipient, selectedCurrency.bech32Prefix)
    ) {
      newErrors.recipient = `Invalid ${selectedCurrency.bech32Prefix} address`;
    }

    if (!displayAmount) {
      newErrors.amount = "Amount is required";
    } else {
      const baseAmount = displayToBaseAmount(
        displayAmount,
        selectedCurrency.decimals,
      );
      if (baseAmount === null) {
        newErrors.amount = `Invalid amount (max ${selectedCurrency.decimals} decimal places)`;
      }
    }

    if (memo && memo.length > 256) {
      newErrors.memo = "Memo must be 256 characters or less";
    }

    if (label && label.length > 100) {
      newErrors.label = "Label must be 100 characters or less";
    }

    return newErrors;
  }, [recipient, displayAmount, memo, label, selectedCurrency]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const formErrors = validateForm();
      setErrors(formErrors);

      if (Object.keys(formErrors).length > 0) {
        const firstErrorField = formErrors.recipient
          ? recipientRef
          : amountRef;
        firstErrorField.current?.focus();
        return;
      }

      const baseAmount = displayToBaseAmount(
        displayAmount,
        selectedCurrency.decimals,
      );
      if (!baseAmount) return;

      const intent: PaymentIntent = {
        v: "1" as const,
        c: selectedCurrency.caip2,
        d: selectedCurrency.denom,
        to: recipient,
        a: baseAmount,
        ...(memo ? { m: memo } : {}),
        ...(label ? { label } : {}),
      };

      const url = buildPaymentUrl(intent, window.location.origin);
      setGeneratedUrl(url);
    },
    [validateForm, displayAmount, selectedCurrency, recipient, memo, label],
  );

  const handleCopy = useCallback(async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = generatedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generatedUrl]);

  const handleShare = useCallback(async () => {
    if (!generatedUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: "Payment Link",
        text: label
          ? `Payment request: ${label}`
          : "Payment request",
        url: generatedUrl,
      });
    } catch {
      // User cancelled share
    }
  }, [generatedUrl, label]);

  const handleCurrencyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const currency = ALLOWED_CURRENCIES.find(
        (c) => c.symbol === e.target.value,
      );
      if (currency) {
        setSelectedCurrency(currency);
        setRecipient("");
        setErrors({});
        setGeneratedUrl(null);
      }
    },
    [],
  );

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Currency selector */}
        <div>
          <label
            htmlFor="currency"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={selectedCurrency.symbol}
            onChange={handleCurrencyChange}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
          >
            {ALLOWED_CURRENCIES.map((c) => (
              <option key={c.symbol} value={c.symbol}>
                {c.symbol} ({c.chainName})
              </option>
            ))}
          </select>
        </div>

        {/* Recipient address */}
        <div>
          <label
            htmlFor="recipient"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Recipient Address
          </label>
          <input
            ref={recipientRef}
            id="recipient"
            name="recipient"
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setErrors((prev) => ({ ...prev, recipient: undefined }));
              setGeneratedUrl(null);
            }}
            onBlur={() => {
              if (recipient && !validateAddress(recipient, selectedCurrency.bech32Prefix)) {
                setErrors((prev) => ({
                  ...prev,
                  recipient: `Invalid ${selectedCurrency.bech32Prefix} address`,
                }));
              }
            }}
            placeholder={`${selectedCurrency.bech32Prefix}1\u2026`}
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-mono text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
          />
          {errors.recipient ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.recipient}
            </p>
          ) : null}
        </div>

        {/* Amount */}
        <div>
          <label
            htmlFor="amount"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Amount ({selectedCurrency.symbol})
          </label>
          <input
            ref={amountRef}
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            value={displayAmount}
            onChange={(e) => {
              setDisplayAmount(e.target.value);
              setErrors((prev) => ({ ...prev, amount: undefined }));
              setGeneratedUrl(null);
            }}
            placeholder="0.00\u2026"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm tabular-nums text-zinc-900 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
          />
          {errors.amount ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.amount}
            </p>
          ) : null}
        </div>

        {/* Memo (optional) */}
        <div>
          <label
            htmlFor="memo"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Memo{" "}
            <span className="text-zinc-400 dark:text-zinc-500">
              (optional)
            </span>
          </label>
          <input
            id="memo"
            name="memo"
            type="text"
            value={memo}
            onChange={(e) => {
              setMemo(e.target.value);
              setErrors((prev) => ({ ...prev, memo: undefined }));
              setGeneratedUrl(null);
            }}
            placeholder="Transaction memo\u2026"
            maxLength={256}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
          />
          {errors.memo ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.memo}
            </p>
          ) : null}
        </div>

        {/* Label (optional) */}
        <div>
          <label
            htmlFor="label"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Label{" "}
            <span className="text-zinc-400 dark:text-zinc-500">
              (optional)
            </span>
          </label>
          <input
            id="label"
            name="label"
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setErrors((prev) => ({ ...prev, label: undefined }));
              setGeneratedUrl(null);
            }}
            placeholder="What is this payment for\u2026"
            maxLength={100}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500"
          />
          {errors.label ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.label}
            </p>
          ) : null}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          style={{ touchAction: "manipulation" }}
        >
          Generate Payment Link
        </button>
      </form>

      {/* Generated URL display */}
      {generatedUrl ? (
        <div className="mt-8 space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Payment Link
            </p>
            <p className="break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">
              {generatedUrl}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                style={{ touchAction: "manipulation" }}
              >
                <span aria-live="polite">
                  {copied ? "Copied!" : "Copy Link"}
                </span>
              </button>
              {typeof navigator !== "undefined" && "share" in navigator ? (
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  style={{ touchAction: "manipulation" }}
                >
                  Share
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex justify-center">
            <QRCodeDisplay value={generatedUrl} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
