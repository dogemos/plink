"use client";

import { useState } from "react";
import { QRCodeDisplay } from "../qr-code";

function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="5"
        y="5"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M11 3.5H4a1.5 1.5 0 0 0-1.5 1.5v7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QRIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="3" height="3" rx="0.5" fill="currentColor" />
    </svg>
  );
}

interface StepResultProps {
  url: string;
  copied: boolean;
  showBurst: boolean;
  shareSupported: boolean;
  onCopy: () => void;
  onShare: () => void;
  onReset: () => void;
}

export function StepResult({
  url,
  copied,
  showBurst,
  shareSupported,
  onCopy,
  onShare,
  onReset,
}: StepResultProps) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 delight-pop">
        {showBurst && (
          <div aria-hidden className="pointer-events-none absolute right-3 top-2">
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
        )}
        <p className="text-sm font-semibold text-emerald-200">
          Link created
        </p>
        <p className="mt-1 text-sm text-emerald-300">
          Anyone with this link can see the full payment details before
          paying.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Payment link
        </p>
        <p className="break-all font-mono text-xs text-slate-300">{url}</p>
      </div>

      {/* Primary: Copy link (full width) */}
      <button
        type="button"
        onClick={onCopy}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        style={{ touchAction: "manipulation" }}
      >
        {copied ? <CheckIcon /> : <ClipboardIcon />}
        {copied ? "Copied" : "Copy link"}
      </button>

      {/* Secondary row: QR toggle + Share */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setShowQR((prev) => !prev)}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          style={{ touchAction: "manipulation" }}
        >
          <QRIcon />
          {showQR ? "Hide QR" : "QR code"}
        </button>
        {shareSupported && (
          <button
            type="button"
            onClick={onShare}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            style={{ touchAction: "manipulation" }}
          >
            Share
          </button>
        )}
      </div>

      {/* QR code collapsible */}
      {showQR && (
        <div className="qr-slide-down rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-center">
          <QRCodeDisplay value={url} />
          <p className="mt-3 text-xs text-slate-400">
            Scan to open the payment link
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        style={{ touchAction: "manipulation" }}
      >
        Create another link
      </button>
    </div>
  );
}
