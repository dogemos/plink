"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChainInfo } from "@keplr-wallet/types";

interface KeplrConnectButtonProps {
  chainInfo: ChainInfo;
  onConnect: (address: string) => void;
  onDisconnect: () => void;
}

type KeplrState =
  | { status: "not-installed" }
  | { status: "disconnected" }
  | { status: "connecting" }
  | { status: "connected"; address: string; name: string };

export function KeplrConnectButton({
  chainInfo,
  onConnect,
  onDisconnect,
}: KeplrConnectButtonProps) {
  const [state, setState] = useState<KeplrState>({ status: "disconnected" });

  useEffect(() => {
    // Keplr injects asynchronously, check after short delay
    const timer = setTimeout(() => {
      if (!window.keplr) {
        setState({ status: "not-installed" });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeystoreChange = () => {
      if (state.status === "connected") {
        // Re-fetch account on keystore change
        window.keplr?.getKey(chainInfo.chainId).then((key) => {
          setState({
            status: "connected",
            address: key.bech32Address,
            name: key.name,
          });
          onConnect(key.bech32Address);
        }).catch(() => {
          setState({ status: "disconnected" });
          onDisconnect();
        });
      }
    };

    window.addEventListener("keplr_keystorechange", handleKeystoreChange);
    return () =>
      window.removeEventListener("keplr_keystorechange", handleKeystoreChange);
  }, [chainInfo.chainId, state.status, onConnect, onDisconnect]);

  const handleConnect = useCallback(async () => {
    if (!window.keplr) {
      setState({ status: "not-installed" });
      return;
    }

    setState({ status: "connecting" });

    try {
      // Suggest chain if not known to Keplr
      try {
        await window.keplr.enable(chainInfo.chainId);
      } catch {
        await window.keplr.experimentalSuggestChain(chainInfo);
        await window.keplr.enable(chainInfo.chainId);
      }

      const key = await window.keplr.getKey(chainInfo.chainId);
      setState({
        status: "connected",
        address: key.bech32Address,
        name: key.name,
      });
      onConnect(key.bech32Address);
    } catch {
      setState({ status: "disconnected" });
    }
  }, [chainInfo, onConnect]);

  const handleDisconnect = useCallback(() => {
    setState({ status: "disconnected" });
    onDisconnect();
  }, [onDisconnect]);

  if (state.status === "not-installed") {
    return (
      <a
        href="https://www.keplr.app/download"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Install Keplr Wallet
      </a>
    );
  }

  if (state.status === "connected") {
    return (
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {state.name}
          </p>
          <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {state.address}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          style={{ touchAction: "manipulation" }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={state.status === "connecting"}
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      style={{ touchAction: "manipulation" }}
    >
      {state.status === "connecting" ? "Connecting\u2026" : "Connect Keplr"}
    </button>
  );
}
