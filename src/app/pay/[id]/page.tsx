"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PaymentIntent } from "@/lib/intent-schema";
import { PaymentPreview } from "@/components/payment-preview";
import { getExplorerTxUrl } from "@/lib/chains";
import { getCurrencyByIntent } from "@/lib/intent-schema";
import { baseToDisplayAmount } from "@/lib/validation";
import Link from "next/link";

interface LinkData {
  id: string;
  chainId: string;
  denom: string;
  recipient: string;
  amount: string;
  memo: string | null;
  label: string | null;
  status: "pending" | "paid" | "expired";
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  txHash: string | null;
  txVerified: boolean;
  payerAddress: string | null;
}

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; link: LinkData; intent: PaymentIntent };

function linkToIntent(link: LinkData): PaymentIntent {
  return {
    v: "1" as const,
    c: link.chainId,
    d: link.denom,
    to: link.recipient,
    a: link.amount,
    ...(link.memo ? { m: link.memo } : {}),
    ...(link.label ? { label: link.label } : {}),
    ...(link.expiresAt
      ? { exp: String(Math.floor(new Date(link.expiresAt).getTime() / 1000)) }
      : {}),
  };
}

export default function PayPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/links/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setState({ status: "error", message: "Payment link not found." });
          } else {
            setState({ status: "error", message: "Failed to load payment link." });
          }
          return;
        }
        const link: LinkData = await res.json();
        setState({ status: "ready", link, intent: linkToIntent(link) });
      } catch {
        setState({
          status: "error",
          message: "Unable to reach the server. Try again later.",
        });
      }
    }
    load();
  }, [params.id]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-3xl space-y-5">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-800" />
          <div className="h-44 animate-pulse rounded-3xl bg-slate-800" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/35 bg-red-500/10 p-6 shadow-[0_18px_36px_-24px_rgba(127,29,29,0.5)]">
          <h1 className="mb-2 text-xl font-semibold text-red-200">
            Something went wrong
          </h1>
          <p className="text-sm text-red-300">{state.message}</p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-red-500/45 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/40"
          >
            Create a new link
          </Link>
        </div>
      </div>
    );
  }

  const { link, intent } = state;

  // If already paid, show a confirmation instead of the payment form
  if (link.status === "paid") {
    const currency = getCurrencyByIntent(link.chainId, link.denom);
    const displayAmount = currency
      ? baseToDisplayAmount(link.amount, currency.decimals)
      : link.amount;
    const symbol = currency?.symbol ?? link.denom;

    return (
      <div className="min-h-screen px-4 py-10 sm:py-14">
        <main className="mx-auto w-full max-w-xl">
          <header className="mb-10 text-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-200">
              Payment complete
            </p>
            <h1 className="text-balance text-3xl font-semibold text-slate-100 sm:text-4xl">
              Already paid
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              This payment link has already been fulfilled.
            </p>
          </header>

          <div className="rounded-3xl border border-emerald-500/35 bg-emerald-500/10 p-6">
            <p className="text-3xl font-semibold text-slate-100">
              {displayAmount} {symbol}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Paid {link.paidAt ? new Date(link.paidAt).toLocaleString() : ""}
            </p>
            {link.txHash ? (
              <div className="mt-4">
                <a
                  href={getExplorerTxUrl(link.chainId, link.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                >
                  View on explorer
                </a>
                <p className="mt-2 break-all font-mono text-xs text-emerald-300">
                  {link.txHash}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
            >
              Create a new link
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <main className="mx-auto w-full max-w-xl">
        <header className="mb-10 text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-200">
            Check, then pay
          </p>
          <h1 className="text-balance text-3xl font-semibold text-slate-100 sm:text-4xl">
            Review before you pay
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            You&apos;ll see the exact amount, recipient, and chain. Nothing
            moves until you confirm in your wallet.
          </p>
        </header>

        <PaymentPreview intent={intent} linkId={params.id} />
      </main>
    </div>
  );
}
