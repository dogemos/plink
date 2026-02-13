import type { Metadata } from "next";
import { JetBrains_Mono, Lexend, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const headingFont = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pay with Link",
  description:
    "Request crypto payments with a single link. ATOM, OSMO, TIA, USDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cosmos-rpc.quickapi.com" />
        <link rel="preconnect" href="https://rpc.osmosis.zone" />
        <link rel="preconnect" href="https://celestia-rpc.polkachu.com" />
        <link rel="preconnect" href="https://noble-rpc.polkachu.com" />
      </head>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
      >
        <nav className="px-4 pt-4 sm:px-6 sm:pt-5">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-slate-200"
          >
            Pay with Link
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
