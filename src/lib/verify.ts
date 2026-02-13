import { StargateClient } from "@cosmjs/stargate";
import { decodeTxRaw } from "@cosmjs/proto-signing";
import { MsgSend } from "cosmjs-types/cosmos/bank/v1beta1/tx";
import { CHAIN_REGISTRY } from "./chains";

export interface VerificationResult {
  verified: boolean;
  reason?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify that a transaction on-chain matches the expected payment.
 * Connects to the chain's RPC endpoint, fetches the tx, decodes it,
 * and checks that a MsgSend exists with the right recipient, denom, and amount.
 */
export async function verifyPaymentOnChain(params: {
  caip2: string;
  txHash: string;
  expectedRecipient: string;
  expectedDenom: string;
  expectedAmount: string;
  reportedPayerAddress: string;
}): Promise<VerificationResult> {
  const chainEntry = CHAIN_REGISTRY[params.caip2];
  if (!chainEntry) {
    return { verified: false, reason: `Unknown chain: ${params.caip2}` };
  }

  const rpcUrl = chainEntry.chainInfo.rpc;

  let client: StargateClient;
  try {
    client = await StargateClient.connect(rpcUrl);
  } catch {
    return {
      verified: false,
      reason: "Unable to connect to chain RPC. Try again later.",
    };
  }

  // Fetch transaction with retries (it may not be indexed yet)
  let indexedTx = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      indexedTx = await client.getTx(params.txHash);
    } catch {
      // getTx can throw on malformed hash
      return { verified: false, reason: "Invalid transaction hash" };
    }
    if (indexedTx) break;
    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  if (!indexedTx) {
    return {
      verified: false,
      reason: `Transaction not found on ${chainEntry.chainInfo.chainName}. It may still be processing — try again in a moment.`,
    };
  }

  // Check that the tx succeeded on-chain
  if (indexedTx.code !== 0) {
    return {
      verified: false,
      reason: "Transaction failed on-chain",
    };
  }

  // Decode the transaction body to inspect messages
  let decoded;
  try {
    decoded = decodeTxRaw(indexedTx.tx);
  } catch {
    return { verified: false, reason: "Unable to decode transaction" };
  }

  // Look for a matching MsgSend
  for (const msg of decoded.body.messages) {
    if (msg.typeUrl !== "/cosmos.bank.v1beta1.MsgSend") continue;

    let send;
    try {
      send = MsgSend.decode(msg.value);
    } catch {
      continue;
    }

    const recipientMatch = send.toAddress === params.expectedRecipient;
    const senderMatch = send.fromAddress === params.reportedPayerAddress;
    const coinMatch = send.amount.some(
      (coin) =>
        coin.denom === params.expectedDenom &&
        BigInt(coin.amount) >= BigInt(params.expectedAmount),
    );

    if (recipientMatch && senderMatch && coinMatch) {
      return { verified: true };
    }
  }

  return {
    verified: false,
    reason:
      "Transaction does not contain a matching payment. Check the recipient, amount, and token.",
  };
}
