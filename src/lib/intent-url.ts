import { type PaymentIntent, parseIntent } from "./intent-schema";

const ENCODED_FIELDS = new Set(["m", "label"]);

export function encodeIntent(intent: PaymentIntent): string {
  const params = new URLSearchParams();
  params.set("v", intent.v);
  params.set("c", intent.c);
  params.set("d", intent.d);
  params.set("to", intent.to);
  params.set("a", intent.a);

  if (intent.m) {
    params.set("m", intent.m);
  }
  if (intent.label) {
    params.set("label", intent.label);
  }
  if (intent.exp) {
    params.set("exp", intent.exp);
  }

  return params.toString();
}

export function decodeIntent(
  hash: string,
): PaymentIntent | { error: string } {
  try {
    const params = new URLSearchParams(hash);
    const raw: Record<string, string> = {};

    for (const [key, value] of params.entries()) {
      if (ENCODED_FIELDS.has(key)) {
        raw[key] = value;
      } else {
        raw[key] = value;
      }
    }

    return parseIntent(raw);
  } catch {
    return { error: "Malformed payment link" };
  }
}

export function buildPaymentUrl(
  intent: PaymentIntent,
  baseUrl = "",
): string {
  const hash = encodeIntent(intent);
  return `${baseUrl}/send#${hash}`;
}
