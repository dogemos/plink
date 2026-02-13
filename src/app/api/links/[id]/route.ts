import { NextResponse } from "next/server";
import { getLinkById } from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await ensureDatabase();
  const { id } = await params;

  const link = await getLinkById(id);
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: link.id,
    chainId: link.chain_id,
    denom: link.denom,
    recipient: link.recipient,
    amount: link.amount,
    memo: link.memo,
    label: link.label,
    status: link.status,
    createdAt: link.created_at,
    expiresAt: link.expires_at,
    paidAt: link.paid_at,
    txHash: link.tx_hash,
    txVerified: link.tx_verified === 1,
    payerAddress: link.payer_address,
  });
}
