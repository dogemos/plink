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

function shortenAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 10)}...${address.slice(-8)}`;
}

export function KeplrConnectButton({
  chainInfo,
  onConnect,
  onDisconnect,
}: KeplrConnectButtonProps) {
  const [state, setState] = useState<KeplrState>({ status: "disconnected" });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.keplr) {
        setState({ status: "not-installed" });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeystoreChange = () => {
      if (state.status !== "connected") return;

      window.keplr
        ?.getKey(chainInfo.chainId)
        .then((key) => {
          setState({
            status: "connected",
            address: key.bech32Address,
            name: key.name,
          });
          onConnect(key.bech32Address);
        })
        .catch(() => {
          setState({ status: "disconnected" });
          onDisconnect();
        });
    };

    window.addEventListener("keplr_keystorechange", handleKeystoreChange);
    return () =>
      window.removeEventListener("keplr_keystorechange", handleKeystoreChange);
  }, [chainInfo.chainId, onConnect, onDisconnect, state.status]);

  const handleConnect = useCallback(async () => {
    if (!window.keplr) {
      setState({ status: "not-installed" });
      return;
    }

    setState({ status: "connecting" });

    try {
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
        className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
      >
        Get Keplr Wallet
      </a>
    );
  }

  if (state.status === "connected") {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
        <p className="text-sm font-semibold text-slate-100">{state.name}</p>
        <p className="mt-1 font-mono text-xs text-slate-400">
          {shortenAddress(state.address)}
        </p>
        <button
          type="button"
          onClick={handleDisconnect}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
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
      className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-90"
      style={{ touchAction: "manipulation" }}
    >
      {state.status === "connecting" ? "Connecting..." : "Connect wallet"}
    </button>
  );
}
