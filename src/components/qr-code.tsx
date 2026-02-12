"use client";

import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-44 animate-pulse rounded-2xl border border-slate-700 bg-slate-900" />
    ),
  },
);

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 192 }: QRCodeDisplayProps) {
  return (
    <div className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/90 p-3 shadow-[0_16px_28px_-20px_rgba(2,6,23,0.75)]">
      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          width={size}
          height={size}
          fgColor="#0b1220"
          bgColor="#ffffff"
          includeMargin
        />
      </div>
    </div>
  );
}
