"use client";

import { useSyncExternalStore } from "react";
import { type PaymentIntent } from "@/lib/intent-schema";
import { decodeIntent } from "@/lib/intent-url";
import { PaymentPreview } from "@/components/payment-preview";
import Link from "next/link";

type ResolvedState =
  | { status: "error"; message: string }
  | { status: "ready"; intent: PaymentIntent };

function getHashSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash.slice(1) : "";
}

function getServerSnapshot(): string {
  return "";
}

function subscribeToHash(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function resolveState(hash: string): ResolvedState {
  if (!hash) {
    return {
      status: "error",
      message: "No payment details found. The link might be incomplete or expired.",
    };
  }

  const result = decodeIntent(hash);

  if ("error" in result) {
    return { status: "error", message: result.error };
  }

  return { status: "ready", intent: result };
}

export default function SendPage() {
  const hash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerSnapshot,
  );

  // During SSR, hash is "" (server snapshot), so state is "error".
  // On client hydration, hash is read from window.location.hash.
  // This means SSR and client may mismatch — use suppressHydrationWarning
  // on the root element, or accept that the /send page renders loading on server.
  // Since getServerSnapshot returns "" and getHashSnapshot reads the real hash,
  // React handles the transition correctly after hydration.

  // If server snapshot is empty string, show loading during SSR
  const isSSR = hash === "" && typeof window === "undefined";

  if (isSSR) {
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

  const state = resolveState(hash);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-500/35 bg-red-500/10 p-6 shadow-[0_18px_36px_-24px_rgba(127,29,29,0.5)]">
          <h1 className="mb-2 text-xl font-semibold text-red-200">
            This link isn&apos;t valid
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

        <PaymentPreview intent={state.intent} />
      </main>
    </div>
  );
}
