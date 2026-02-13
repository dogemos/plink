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

  return NextResponse.json(
    {
      status: link.status,
      txHash: link.tx_hash,
      txVerified: link.tx_verified === 1,
      paidAt: link.paid_at,
    },
    {
      headers: { "Cache-Control": "no-cache, no-store" },
    },
  );
}
