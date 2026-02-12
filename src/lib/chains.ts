import { Bech32Address } from "@keplr-wallet/cosmos";
import type { ChainInfo } from "@keplr-wallet/types";

export interface ChainEntry {
  chainInfo: ChainInfo;
  caip2: string;
  explorerTxUrl: string;
}

export const CHAIN_REGISTRY: Record<string, ChainEntry> = {
  "cosmos:cosmoshub-4": {
    caip2: "cosmos:cosmoshub-4",
    explorerTxUrl: "https://www.mintscan.io/cosmos/tx/{hash}",
    chainInfo: {
      rpc: "https://cosmos-rpc.quickapi.com:443",
      rest: "https://cosmos-rest.quickapi.com:443",
      chainId: "cosmoshub-4",
      chainName: "Cosmos Hub",
      stakeCurrency: {
        coinDenom: "ATOM",
        coinMinimalDenom: "uatom",
        coinDecimals: 6,
        coinGeckoId: "cosmos",
      },
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("cosmos"),
      currencies: [
        {
          coinDenom: "ATOM",
          coinMinimalDenom: "uatom",
          coinDecimals: 6,
          coinGeckoId: "cosmos",
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "ATOM",
          coinMinimalDenom: "uatom",
          coinDecimals: 6,
          coinGeckoId: "cosmos",
          gasPriceStep: { low: 0.01, average: 0.025, high: 0.04 },
        },
      ],
    },
  },
  "cosmos:osmosis-1": {
    caip2: "cosmos:osmosis-1",
    explorerTxUrl: "https://www.mintscan.io/osmosis/tx/{hash}",
    chainInfo: {
      rpc: "https://rpc.osmosis.zone",
      rest: "https://lcd.osmosis.zone",
      chainId: "osmosis-1",
      chainName: "Osmosis",
      stakeCurrency: {
        coinDenom: "OSMO",
        coinMinimalDenom: "uosmo",
        coinDecimals: 6,
        coinGeckoId: "osmosis",
      },
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("osmo"),
      currencies: [
        {
          coinDenom: "OSMO",
          coinMinimalDenom: "uosmo",
          coinDecimals: 6,
          coinGeckoId: "osmosis",
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "OSMO",
          coinMinimalDenom: "uosmo",
          coinDecimals: 6,
          coinGeckoId: "osmosis",
          gasPriceStep: { low: 0.025, average: 0.04, high: 0.1 },
        },
      ],
    },
  },
  "cosmos:celestia": {
    caip2: "cosmos:celestia",
    explorerTxUrl: "https://www.mintscan.io/celestia/tx/{hash}",
    chainInfo: {
      rpc: "https://celestia-rpc.polkachu.com",
      rest: "https://celestia-api.polkachu.com",
      chainId: "celestia",
      chainName: "Celestia",
      stakeCurrency: {
        coinDenom: "TIA",
        coinMinimalDenom: "utia",
        coinDecimals: 6,
        coinGeckoId: "celestia",
      },
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("celestia"),
      currencies: [
        {
          coinDenom: "TIA",
          coinMinimalDenom: "utia",
          coinDecimals: 6,
          coinGeckoId: "celestia",
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "TIA",
          coinMinimalDenom: "utia",
          coinDecimals: 6,
          coinGeckoId: "celestia",
          gasPriceStep: { low: 0.01, average: 0.02, high: 0.1 },
        },
      ],
    },
  },
  "cosmos:noble-1": {
    caip2: "cosmos:noble-1",
    explorerTxUrl: "https://www.mintscan.io/noble/tx/{hash}",
    chainInfo: {
      rpc: "https://noble-rpc.polkachu.com",
      rest: "https://noble-api.polkachu.com",
      chainId: "noble-1",
      chainName: "Noble",
      stakeCurrency: {
        coinDenom: "USDC",
        coinMinimalDenom: "uusdc",
        coinDecimals: 6,
      },
      bip44: { coinType: 118 },
      bech32Config: Bech32Address.defaultBech32Config("noble"),
      currencies: [
        {
          coinDenom: "USDC",
          coinMinimalDenom: "uusdc",
          coinDecimals: 6,
        },
      ],
      feeCurrencies: [
        {
          coinDenom: "USDC",
          coinMinimalDenom: "uusdc",
          coinDecimals: 6,
          gasPriceStep: { low: 0.1, average: 0.1, high: 0.2 },
        },
      ],
    },
  },
};

export function getChainInfo(caip2Id: string): ChainEntry | undefined {
  return CHAIN_REGISTRY[caip2Id];
}

export function getExplorerTxUrl(caip2Id: string, txHash: string): string {
  const entry = CHAIN_REGISTRY[caip2Id];
  if (!entry) return "";
  return entry.explorerTxUrl.replace("{hash}", txHash);
}
