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
      message: "No payment intent found. This link may be incomplete.",
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md space-y-4 px-4">
          <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-12 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  const state = resolveState(hash);

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h1 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">
            Invalid Payment Link
          </h1>
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.message}
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Create a new payment link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <PaymentPreview intent={state.intent} />
    </div>
  );
}
