import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ALLOWED_CURRENCIES } from "@/lib/intent-schema";
import { createLink } from "@/lib/db";
import { ensureDatabase } from "@/lib/init-db";

const CURRENCY_KEY = (caip2: string, denom: string) => `${caip2}:${denom}`;
const ALLOWED_SET = new Set(
  ALLOWED_CURRENCIES.map((c) => CURRENCY_KEY(c.caip2, c.denom)),
);

const CreateLinkSchema = z.object({
  c: z.string(),
  d: z.string(),
  to: z.string(),
  a: z.string().regex(/^\d+$/).min(1),
  m: z.string().max(256).optional(),
  label: z.string().max(100).optional(),
  expiresIn: z.number().positive().optional(),
});

export async function POST(request: Request) {
  await ensureDatabase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateLinkSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const data = parsed.data;

  // Validate chain/denom combo
  if (!ALLOWED_SET.has(CURRENCY_KEY(data.c, data.d))) {
    return NextResponse.json(
      { error: "Unsupported chain/denom combination" },
      { status: 400 },
    );
  }

  // Validate address prefix
  const currency = ALLOWED_CURRENCIES.find(
    (c) => c.caip2 === data.c && c.denom === data.d,
  );
  if (currency && !data.to.startsWith(currency.bech32Prefix + "1")) {
    return NextResponse.json(
      { error: "Address prefix does not match chain" },
      { status: 400 },
    );
  }

  // Validate amount is positive and not "0"
  if (data.a === "0" || (data.a.length > 1 && data.a.startsWith("0"))) {
    return NextResponse.json(
      { error: "Amount must be a positive integer without leading zeros" },
      { status: 400 },
    );
  }

  const id = nanoid(12);
  let expiresAt: string | undefined;
  if (data.expiresIn) {
    expiresAt = new Date(
      Date.now() + data.expiresIn * 1000,
    ).toISOString();
  }

  const link = await createLink({
    id,
    chainId: data.c,
    denom: data.d,
    recipient: data.to,
    amount: data.a,
    memo: data.m,
    label: data.label,
    expiresAt,
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/pay/${link.id}`;

  return NextResponse.json(
    {
      id: link.id,
      url,
      status: link.status,
      expiresAt: link.expires_at,
      createdAt: link.created_at,
    },
    { status: 201 },
  );
}
