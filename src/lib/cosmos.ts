import { SigningStargateClient } from "@cosmjs/stargate";
import type { StdFee } from "@cosmjs/stargate";
import type { OfflineSigner } from "@cosmjs/proto-signing";
import type { ChainInfo } from "@keplr-wallet/types";

declare global {
  interface Window {
    keplr?: {
      enable(chainId: string): Promise<void>;
      getKey(chainId: string): Promise<{
        bech32Address: string;
        name: string;
        pubKey: Uint8Array;
        algo: string;
        isNanoLedger: boolean;
      }>;
      getOfflineSigner(chainId: string): OfflineSigner;
      experimentalSuggestChain(chainInfo: ChainInfo): Promise<void>;
    };
  }
}

const GAS_LIMIT = 200_000;

export interface TxResult {
  txHash: string;
  code: number;
  rawLog: string;
}

export async function connectClient(
  rpcEndpoint: string,
  chainId: string,
): Promise<SigningStargateClient> {
  if (!window.keplr) {
    throw new Error("Keplr wallet not found");
  }

  await window.keplr.enable(chainId);
  const offlineSigner = window.keplr.getOfflineSigner(chainId);
  return SigningStargateClient.connectWithSigner(rpcEndpoint, offlineSigner);
}

export function buildFee(chainInfo: ChainInfo): StdFee {
  const feeCurrency = chainInfo.feeCurrencies[0];
  const gasPrice = feeCurrency.gasPriceStep?.average ?? 0.025;
  const feeAmount = Math.ceil(GAS_LIMIT * gasPrice);

  return {
    amount: [
      {
        denom: feeCurrency.coinMinimalDenom,
        amount: feeAmount.toString(),
      },
    ],
    gas: GAS_LIMIT.toString(),
  };
}

export async function sendPayment(
  client: SigningStargateClient,
  senderAddress: string,
  recipient: string,
  amount: string,
  denom: string,
  fee: StdFee,
  memo?: string,
): Promise<TxResult> {
  const result = await client.sendTokens(
    senderAddress,
    recipient,
    [{ denom, amount }],
    fee,
    memo ?? "",
  );

  return {
    txHash: result.transactionHash,
    code: result.code,
    rawLog: result.events?.toString() ?? "",
  };
}

export function getEstimatedFeeDisplay(chainInfo: ChainInfo): string {
  const feeCurrency = chainInfo.feeCurrencies[0];
  const gasPrice = feeCurrency.gasPriceStep?.average ?? 0.025;
  const feeAmount = Math.ceil(GAS_LIMIT * gasPrice);
  const displayFee = feeAmount / Math.pow(10, feeCurrency.coinDecimals);
  return `~${displayFee} ${feeCurrency.coinDenom}`;
}

export { GAS_LIMIT };
