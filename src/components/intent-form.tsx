"use client";

import { useCallback, useRef, useMemo, useState } from "react";
import {
  ALLOWED_CURRENCIES,
  type AllowedCurrency,
  type PaymentIntent,
} from "@/lib/intent-schema";
import { buildPaymentUrl } from "@/lib/intent-url";
import { displayToBaseAmount, validateAddress } from "@/lib/validation";
import { WizardShell } from "./wizard/wizard-shell";
import { StepCurrency } from "./wizard/step-currency";
import { StepAmountRecipient } from "./wizard/step-amount-recipient";
import { StepReview } from "./wizard/step-review";
import { StepResult } from "./wizard/step-result";
import { StepGenerating } from "./wizard/step-generating";

interface FormErrors {
  recipient?: string;
  amount?: string;
  memo?: string;
  label?: string;
}

export function IntentForm() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [selectedCurrency, setSelectedCurrency] =
    useState<AllowedCurrency>(ALLOWED_CURRENCIES[0]);
  const [recipient, setRecipient] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const generatingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const triggerLightHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const normalizedAmount = displayAmount.trim();
  const normalizedRecipient = recipient.trim();

  const amountInBase = useMemo(
    () => displayToBaseAmount(normalizedAmount, selectedCurrency.decimals),
    [normalizedAmount, selectedCurrency.decimals],
  );

  const recipientIsValid = useMemo(() => {
    if (!normalizedRecipient) return false;
    return validateAddress(normalizedRecipient, selectedCurrency.bech32Prefix);
  }, [normalizedRecipient, selectedCurrency.bech32Prefix]);

  const readyToGenerate = Boolean(amountInBase) && recipientIsValid;

  // Navigation
  const goNext = useCallback(() => {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 3));
  }, []);

  const goBack = useCallback(() => {
    setDirection("backward");
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setStep(0);
    setDirection("forward");
    setSelectedCurrency(ALLOWED_CURRENCIES[0]);
    setRecipient("");
    setDisplayAmount("");
    setMemo("");
    setLabel("");
    setErrors({});
    setGeneratedUrl(null);
    setCopied(false);
    setShowCopiedToast(false);
  }, []);

  // Currency selection
  const handleCurrencySelect = useCallback((currency: AllowedCurrency) => {
    setSelectedCurrency(currency);
    setRecipient("");
    setDisplayAmount("");
    setMemo("");
    setLabel("");
    setErrors({});
    setGeneratedUrl(null);
  }, []);

  // Amount / Recipient handlers
  const handleAmountChange = useCallback((value: string) => {
    setDisplayAmount(value);
    setErrors((prev) => ({ ...prev, amount: undefined }));
  }, []);

  const handleRecipientChange = useCallback((value: string) => {
    setRecipient(value);
    setErrors((prev) => ({ ...prev, recipient: undefined }));
  }, []);

  const handleRecipientBlur = useCallback(() => {
    const trimmed = recipient.trim();
    if (trimmed && !validateAddress(trimmed, selectedCurrency.bech32Prefix)) {
      setErrors((prev) => ({
        ...prev,
        recipient: `This doesn't look like a valid ${selectedCurrency.bech32Prefix} address.`,
      }));
    }
  }, [recipient, selectedCurrency.bech32Prefix]);

  // Label / Memo handlers
  const handleLabelChange = useCallback((value: string) => {
    setLabel(value);
    setErrors((prev) => ({ ...prev, label: undefined }));
  }, []);

  const handleMemoChange = useCallback((value: string) => {
    setMemo(value);
    setErrors((prev) => ({ ...prev, memo: undefined }));
  }, []);

  // Step 2 validation
  const step2Valid = readyToGenerate;

  // Step 3: generate the link with cooking animation
  const handleGenerate = useCallback(() => {
    const newErrors: FormErrors = {};

    if (memo.length > 256) {
      newErrors.memo = "Memo is too long. (max 256)";
    }
    if (label.length > 100) {
      newErrors.label = "Label is too long. (max 100)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!amountInBase) return;

    const normalizedMemo = memo.trim();
    const normalizedLabel = label.trim();

    const intent: PaymentIntent = {
      v: "1" as const,
      c: selectedCurrency.caip2,
      d: selectedCurrency.denom,
      to: normalizedRecipient,
      a: amountInBase,
      ...(normalizedMemo ? { m: normalizedMemo } : {}),
      ...(normalizedLabel ? { label: normalizedLabel } : {}),
    };

    // Build URL immediately but animate the reveal
    const url = buildPaymentUrl(intent, window.location.origin);

    // Start the cooking animation
    setDirection("forward");
    setStep(3);
    setIsGenerating(true);
    setGeneratingMessage("Encoding payment details...");

    // Clear any previous timers
    generatingTimers.current.forEach(clearTimeout);

    const messages = [
      { text: "Building secure URL...", delay: 600 },
      { text: "Generating QR code...", delay: 1200 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];

    for (const { text, delay } of messages) {
      timers.push(setTimeout(() => setGeneratingMessage(text), delay));
    }

    // Finish: reveal the result
    timers.push(
      setTimeout(() => {
        setGeneratedUrl(url);
        setCopied(false);
        setIsGenerating(false);
        setShowSuccessBurst(true);
        triggerLightHaptic();
        setTimeout(() => setShowSuccessBurst(false), 900);
      }, 1800),
    );

    generatingTimers.current = timers;
  }, [
    amountInBase,
    label,
    memo,
    normalizedRecipient,
    selectedCurrency.caip2,
    selectedCurrency.denom,
    triggerLightHaptic,
  ]);

  // Copy / Share
  const handleCopy = useCallback(async () => {
    if (!generatedUrl) return;

    const markCopied = () => {
      setCopied(true);
      setShowCopiedToast(true);
      triggerLightHaptic();
      setTimeout(() => {
        setCopied(false);
        setShowCopiedToast(false);
      }, 1800);
    };

    try {
      await navigator.clipboard.writeText(generatedUrl);
      markCopied();
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = generatedUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      markCopied();
    }
  }, [generatedUrl, triggerLightHaptic]);

  const handleShare = useCallback(async () => {
    if (!generatedUrl || !navigator.share) return;

    try {
      await navigator.share({
        title: "Payment Link",
        text: label ? `Payment request: ${label.trim()}` : "Payment request",
        url: generatedUrl,
      });
    } catch {
      // User cancelled sharing.
    }
  }, [generatedUrl, label]);

  const shareSupported =
    typeof navigator !== "undefined" && "share" in navigator;

  // Render the active step
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <StepCurrency
            selected={selectedCurrency}
            onSelect={handleCurrencySelect}
          />
        );
      case 1:
        return (
          <StepAmountRecipient
            currency={selectedCurrency}
            amount={displayAmount}
            onAmountChange={handleAmountChange}
            recipient={recipient}
            onRecipientChange={handleRecipientChange}
            onRecipientBlur={handleRecipientBlur}
            errors={errors}
          />
        );
      case 2:
        return (
          <StepReview
            currency={selectedCurrency}
            amount={normalizedAmount || "0"}
            recipient={normalizedRecipient}
            label={label}
            onLabelChange={handleLabelChange}
            memo={memo}
            onMemoChange={handleMemoChange}
            errors={errors}
          />
        );
      case 3:
        if (isGenerating) {
          return <StepGenerating message={generatingMessage} />;
        }
        return generatedUrl ? (
          <StepResult
            url={generatedUrl}
            copied={copied}
            showBurst={showSuccessBurst}
            shareSupported={shareSupported}
            onCopy={handleCopy}
            onShare={handleShare}
            onReset={handleReset}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Determine shell props per step
  const isResultStep = step === 3 && !isGenerating;
  const isGeneratingStep = step === 3 && isGenerating;
  const isReviewStep = step === 2;
  const hideNav = isResultStep || isGeneratingStep;

  return (
    <>
      <WizardShell
        currentStep={step}
        direction={direction}
        onBack={goBack}
        onNext={isReviewStep ? handleGenerate : goNext}
        nextDisabled={step === 1 && !step2Valid}
        nextLabel={isReviewStep ? "Create payment link" : "Continue"}
        showBack={!hideNav && step > 0}
        showNext={!hideNav}
      >
        {renderStep()}
      </WizardShell>

      {showCopiedToast && (
        <div
          role="status"
          aria-live="polite"
          className="delight-toast fixed bottom-5 left-1/2 z-50 rounded-xl border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-100 shadow-[0_20px_40px_-24px_rgba(2,6,23,0.7)]"
        >
          Link copied
        </div>
      )}
    </>
  );
}
