import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getLinkById,
  claimLinkForPayment,
  markLinkAsPaid,
  resetLinkPayment,
} from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";
import { verifyPaymentOnChain } from "@/lib/verify";

const PaySchema = z.object({
  txHash: z.string().min(1),
  payerAddress: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDatabase();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "txHash and payerAddress are required" },
      { status: 400 },
    );
  }

  const { txHash, payerAddress } = parsed.data;

  // Load the link
  const link = await getLinkById(id);
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Check if already paid or expired
  if (link.status === "paid") {
    return NextResponse.json(
      { status: "paid", message: "This link has already been paid" },
      { status: 409 },
    );
  }
  if (link.status === "expired") {
    return NextResponse.json(
      { status: "expired", message: "This link has expired" },
      { status: 409 },
    );
  }

  // Atomically claim the link for this payment
  const claimed = await claimLinkForPayment(id, txHash, payerAddress);
  if (!claimed) {
    return NextResponse.json(
      {
        status: "conflict",
        message:
          "Another payment is already being verified for this link",
      },
      { status: 409 },
    );
  }

  // Verify the payment on-chain
  const result = await verifyPaymentOnChain({
    caip2: link.chain_id,
    txHash,
    expectedRecipient: link.recipient,
    expectedDenom: link.denom,
    expectedAmount: link.amount,
    reportedPayerAddress: payerAddress,
  });

  if (result.verified) {
    await markLinkAsPaid(id);
    return NextResponse.json({ status: "paid", message: "Payment verified" });
  }

  // Verification failed — reset so another attempt can be made
  await resetLinkPayment(id);
  return NextResponse.json(
    { status: "failed", message: result.reason ?? "Verification failed" },
    { status: 422 },
  );
}
