import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pay with Link",
  description:
    "Create and share payment links for Cosmos ecosystem tokens. Send ATOM, OSMO, TIA, and USDC with a simple URL.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
