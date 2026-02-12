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
}

type TxState =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "success"; txHash: string }
  | { status: "error"; message: string }
  | { status: "uncertain"; message: string };

export function PaymentPreview({ intent }: PaymentPreviewProps) {
  const [senderAddress, setSenderAddress] = useState<string | null>(null);
  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const currency = getCurrencyByIntent(intent.c, intent.d);
  const chainEntry = getChainInfo(intent.c);

  // Advisory expiry check — computed once at mount via lazy initializer
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

  const handleConnect = useCallback((address: string) => {
    setSenderAddress(address);
  }, []);

  const handleDisconnect = useCallback(() => {
    setSenderAddress(null);
    setTxState({ status: "idle" });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!senderAddress || !chainInfo) return;

    setTxState((prev) => ({ ...prev, status: "signing" as const }));

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
        setTxState((prev) => ({
          ...prev,
          status: "success" as const,
          txHash: result.txHash,
        }));
      } else {
        setTxState((prev) => ({
          ...prev,
          status: "error" as const,
          message: result.rawLog || `Transaction failed (code ${result.code})`,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (
        message.includes("rejected") ||
        message.includes("Request rejected")
      ) {
        setTxState((prev) => ({
          ...prev,
          status: "error" as const,
          message: "Transaction cancelled",
        }));
      } else if (
        message.includes("timeout") ||
        message.includes("disconnect")
      ) {
        setTxState((prev) => ({
          ...prev,
          status: "uncertain" as const,
          message:
            "Transaction may have been submitted. Please check the block explorer.",
        }));
      } else {
        setTxState((prev) => ({
          ...prev,
          status: "error" as const,
          message,
        }));
      }
    }
  }, [senderAddress, chainInfo, intent]);

  // Unsupported chain/currency
  if (!currency || !chainEntry || !chainInfo) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-400">
          Unsupported chain or currency in this payment link.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Payment details card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2
          className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          style={{ textWrap: "balance" }}
        >
          Payment Request
        </h2>

        {intent.label ? (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {intent.label}
          </p>
        ) : null}

        <dl className="space-y-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Chain
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
              {chainInfo.chainName}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Amount
            </dt>
            <dd className="mt-0.5 tabular-nums">
              <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {displayAmount}
                {"\u00A0"}
                {currency.symbol}
              </span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                ({new Intl.NumberFormat().format(Number(intent.a))}
                {"\u00A0"}
                {intent.d})
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Recipient
            </dt>
            <dd className="mt-0.5 break-all font-mono text-sm text-zinc-900 dark:text-zinc-100">
              {intent.to}
            </dd>
          </div>

          {intent.m ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Memo
              </dt>
              <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                {intent.m}
              </dd>
            </div>
          ) : null}

          {intent.exp ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Expires
              </dt>
              <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">
                {new Date(Number(intent.exp) * 1000).toLocaleString()}
                {isExpired ? (
                  <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">
                    (Expired)
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* Expired state */}
      {isExpired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This payment link has expired. The recipient should generate a new
            link.
          </p>
        </div>
      ) : (
        <>
          {/* Wallet connection */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Connect Wallet
            </p>
            <KeplrConnectButton
              chainInfo={chainInfo}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />

            {isSelfSend ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Warning: You are sending to yourself.
              </p>
            ) : null}

            {senderAddress ? (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Estimated fee: {feeEstimate}
              </p>
            ) : null}
          </div>

          {/* Confirm & broadcast */}
          {senderAddress ? (
            <div aria-live="polite">
              {txState.status === "success" ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Payment sent successfully!
                  </p>
                  <a
                    href={getExplorerTxUrl(intent.c, txState.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-green-700 underline hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                  >
                    View on Explorer
                  </a>
                  <p className="mt-1 break-all font-mono text-xs text-green-600 dark:text-green-500">
                    {txState.txHash}
                  </p>
                </div>
              ) : txState.status === "uncertain" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {txState.message}
                  </p>
                </div>
              ) : (
                <>
                  {txState.status === "error" ? (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {txState.message}
                      </p>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={txState.status === "signing"}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    style={{ touchAction: "manipulation" }}
                  >
                    {txState.status === "signing"
                      ? "Signing\u2026"
                      : "Confirm Payment"}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
