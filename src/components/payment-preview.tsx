"use client";

import { useCallback, useState } from "react";
import type { PaymentIntent } from "@/lib/intent-schema";
import { getCurrencyByIntent } from "@/lib/intent-schema";
import { getChainInfo, getExplorerTxUrl } from "@/lib/chains";
import {
  buildFee,
  connectClient,
  getEstimatedFeeDisplay,
  sendPayment,
  type TxResult,
} from "@/lib/cosmos";
import { baseToDisplayAmount } from "@/lib/validation";
import { KeplrConnectButton } from "./keplr-connect-button";

interface PaymentPreviewProps {
  intent: PaymentIntent;
  linkId?: string;
}

type TxState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "success"; txHash: string }
  | { status: "error"; message: string }
  | { status: "uncertain"; message: string };

type StepStatus = "complete" | "active" | "idle";

function shortenAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

function getStepStyles(status: StepStatus): {
  dot: string;
  title: string;
  bar: string;
} {
  if (status === "complete") {
    return {
      dot: "border-emerald-500/50 bg-emerald-400",
      title: "text-emerald-200",
      bar: "bg-emerald-500",
    };
  }

  if (status === "active") {
    return {
      dot: "border-sky-500/50 bg-sky-400",
      title: "text-sky-200",
      bar: "bg-sky-500",
    };
  }

  return {
    dot: "border-slate-700 bg-slate-900",
    title: "text-slate-500",
    bar: "bg-slate-800",
  };
}

export function PaymentPreview({ intent, linkId }: PaymentPreviewProps) {
  const [senderAddress, setSenderAddress] = useState<string | null>(null);
  const [txState, setTxState] = useState<TxState>({ status: "idle" });
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

  const currency = getCurrencyByIntent(intent.c, intent.d);
  const chainEntry = getChainInfo(intent.c);

  const [isExpired] = useState(() => {
    if (!intent.exp) return false;
    return Date.now() / 1000 > Number(intent.exp);
  });

  const chainInfo = chainEntry?.chainInfo;

  const displayAmount = currency
    ? baseToDisplayAmount(intent.a, currency.decimals)
    : intent.a;
  const feeEstimate = chainInfo ? getEstimatedFeeDisplay(chainInfo) : "";
  const isSelfSend = senderAddress === intent.to;

  const triggerLightHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }, []);

  const handleConnect = useCallback((address: string) => {
    setSenderAddress(address);
  }, []);

  const handleDisconnect = useCallback(() => {
    setSenderAddress(null);
    setTxState({ status: "idle" });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!senderAddress || !chainInfo) return;

    setTxState({ status: "signing" });

    try {
      const client = await connectClient(chainInfo.rpc, chainInfo.chainId);
      const fee = buildFee(chainInfo);

      const result: TxResult = await sendPayment(
        client,
        senderAddress,
        intent.to,
        intent.a,
        intent.d,
        fee,
        intent.m,
      );

      if (result.code === 0) {
        setTxState({ status: "success", txHash: result.txHash });
        setShowSuccessBurst(true);
        triggerLightHaptic();
        setTimeout(() => setShowSuccessBurst(false), 900);

        // Report payment to backend for verification (fire-and-forget)
        if (linkId) {
          fetch(`/api/links/${linkId}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txHash: result.txHash,
              payerAddress: senderAddress,
            }),
          }).catch(() => {
            // Best-effort: payment is already on-chain
          });
        }
      } else {
        setTxState({
          status: "error",
          message: result.rawLog || `Transaction failed (code ${result.code})`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("rejected") || message.includes("Request rejected")) {
        setTxState({ status: "error", message: "Transaction cancelled." });
      } else if (message.includes("timeout") || message.includes("disconnect")) {
        setTxState({
          status: "uncertain",
          message:
            "Couldn't confirm the transaction. Check the explorer to see if it went through.",
        });
      } else {
        setTxState({ status: "error", message });
      }
    }
  }, [chainInfo, intent, linkId, senderAddress, triggerLightHaptic]);

  if (!currency || !chainEntry || !chainInfo) {
    return (
      <div className="rounded-3xl border border-red-500/35 bg-red-500/10 p-6">
        <p className="text-sm text-red-300">
          This link uses a token or network we don&apos;t support.
        </p>
      </div>
    );
  }

  const stepStatuses: StepStatus[] = [
    "complete",
    isExpired ? "idle" : senderAddress ? "complete" : "active",
    isExpired
      ? "idle"
      : txState.status === "success"
        ? "complete"
        : senderAddress
          ? "active"
          : "idle",
  ];

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/85 p-4 shadow-[0_20px_36px_-26px_rgba(2,6,23,0.75)] sm:p-5">
        <ol className="grid gap-4 sm:grid-cols-3">
          {["Review", "Connect", "Pay"].map((label, index) => {
            const styles = getStepStyles(stepStatuses[index]);
            return (
              <li key={label}>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full border ${styles.dot} transition-colors`}
                  />
                  <p className={`text-sm font-semibold ${styles.title}`}>
                    {label}
                  </p>
                </div>
                <div className={`mt-2 h-1.5 rounded-full ${styles.bar}`} />
              </li>
            );
          })}
        </ol>
      </section>

      {/* Step 1: Review */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/85 p-6 shadow-[0_24px_40px_-28px_rgba(2,6,23,0.75)] sm:p-7">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-slate-100">
            Review the request
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Make sure these details are correct before connecting.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-500/35 bg-sky-500/10 p-4">
          <p className="text-3xl font-semibold text-slate-100">
            {displayAmount} {currency.symbol}
          </p>
          <p className="mt-1 text-sm text-slate-300">{chainInfo.chainName}</p>
        </div>

        {intent.label ? (
          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Label
            </p>
            <p className="mt-1 text-sm text-slate-200">{intent.label}</p>
          </div>
        ) : null}

        <dl className="mt-5 space-y-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              To
            </dt>
            <dd className="mt-1 break-all font-mono text-sm text-slate-200">
              {intent.to}
            </dd>
          </div>

          {intent.m ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Memo
              </dt>
              <dd className="mt-1 text-sm text-slate-300">{intent.m}</dd>
            </div>
          ) : null}

          {intent.exp ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expires
              </dt>
              <dd className="mt-1 text-sm text-slate-300">
                {new Date(Number(intent.exp) * 1000).toLocaleString()}
                {isExpired ? (
                  <span className="ml-2 font-semibold text-red-300">
                    Expired
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={() => setShowTechnical((prev) => !prev)}
          className="mt-4 cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300"
        >
          {showTechnical ? "Hide technical details" : "Show technical details"}
        </button>

        {showTechnical && (
          <dl className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount (raw)
              </dt>
              <dd className="mt-0.5 text-xs text-slate-400">
                {new Intl.NumberFormat().format(Number(intent.a))} {intent.d}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Network
              </dt>
              <dd className="mt-0.5 text-xs text-slate-400">{intent.c}</dd>
            </div>
          </dl>
        )}

        <div className="mt-5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-200">
            Your funds, your wallet
          </p>
          <p className="mt-1 text-sm text-emerald-300">
            This app prepares the transaction. You sign and send from your
            own wallet.
          </p>
        </div>
      </section>

      {/* Step 2: Connect */}
      <section className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5 shadow-[0_24px_40px_-28px_rgba(2,6,23,0.75)]">
        <h3 className="text-lg font-semibold text-slate-100">
          Connect your wallet
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Connect a {chainInfo.chainName} wallet to continue.
        </p>

        <div className="mt-4">
          <KeplrConnectButton
            chainInfo={chainInfo}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>

        {senderAddress ? (
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3 delight-pop">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Connected
            </p>
            <p className="mt-1 font-mono text-xs text-slate-300">
              {shortenAddress(senderAddress)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Est. fee: {feeEstimate}
            </p>
          </div>
        ) : null}

        {isSelfSend ? (
          <p className="mt-2 text-xs font-semibold text-amber-300">
            Heads up — you&apos;re sending to yourself.
          </p>
        ) : null}
      </section>

      {/* Step 3: Confirm */}
      <section
        className="rounded-3xl border border-slate-800 bg-slate-950/85 p-5 shadow-[0_24px_40px_-28px_rgba(2,6,23,0.75)]"
        aria-live="polite"
      >
        <h3 className="text-lg font-semibold text-slate-100">
          Pay
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Check the details, then confirm in your wallet.
        </p>

        {isExpired ? (
          <div className="mt-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-300">
              This request expired. Ask the sender for a new link.
            </p>
          </div>
        ) : null}

        {!isExpired && senderAddress ? (
          <div className="mt-4 space-y-3">
            {txState.status === "success" ? (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 delight-pop">
                {showSuccessBurst ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-2"
                  >
                    <span className="delight-burst absolute h-2 w-2 rounded-full bg-emerald-300" />
                    <span
                      className="delight-burst absolute h-2 w-2 rounded-full bg-sky-300"
                      style={{ animationDelay: "80ms" }}
                    />
                    <span
                      className="delight-burst absolute h-2 w-2 rounded-full bg-emerald-400"
                      style={{ animationDelay: "160ms" }}
                    />
                  </div>
                ) : null}
                <p className="text-sm font-semibold text-emerald-200">
                  Payment sent
                </p>
                <a
                  href={getExplorerTxUrl(intent.c, txState.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                >
                  View on explorer
                </a>
                <p className="mt-2 break-all font-mono text-xs text-emerald-300">
                  {txState.txHash}
                </p>
              </div>
            ) : null}

            {txState.status === "uncertain" ? (
              <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-300">{txState.message}</p>
              </div>
            ) : null}

            {txState.status === "error" ? (
              <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4">
                <p className="text-sm text-red-300">{txState.message}</p>
              </div>
            ) : null}

            {txState.status !== "success" &&
            txState.status !== "uncertain" ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={txState.status === "signing"}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-90"
                style={{ touchAction: "manipulation" }}
              >
                {txState.status === "signing" ? (
                  <>
                    <span
                      aria-hidden
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                    />
                    Confirm in your wallet...
                  </>
                ) : (
                  `Pay ${displayAmount} ${currency.symbol}`
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {!isExpired && !senderAddress ? (
          <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-400">
            Connect a wallet to continue.
          </p>
        ) : null}
      </section>
    </div>
  );
}
