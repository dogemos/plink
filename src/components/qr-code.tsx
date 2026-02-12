"use client";

import dynamic from "next/dynamic";

const QRCodeSVG = dynamic(
  () => import("qrcode.react").then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="h-48 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" /> },
);

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export function QRCodeDisplay({ value, size = 192 }: QRCodeDisplayProps) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-white">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        width={size}
        height={size}
      />
    </div>
  );
}
