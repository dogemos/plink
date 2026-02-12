import { z } from "zod";

export interface AllowedCurrency {
  caip2: string;
  denom: string;
  decimals: number;
  bech32Prefix: string;
  symbol: string;
  chainName: string;
  logoUrl: string;
}

export const ALLOWED_CURRENCIES: readonly AllowedCurrency[] = [
  {
    caip2: "cosmos:noble-1",
    denom: "uusdc",
    decimals: 6,
    bech32Prefix: "noble",
    symbol: "USDC",
    chainName: "Noble",
    logoUrl:
      "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/noble/uusdc.png",
  },
  {
    caip2: "cosmos:cosmoshub-4",
    denom: "uatom",
    decimals: 6,
    bech32Prefix: "cosmos",
    symbol: "ATOM",
    chainName: "Cosmos Hub",
    logoUrl:
      "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/cosmoshub/uatom.png",
  },
  {
    caip2: "cosmos:osmosis-1",
    denom: "uosmo",
    decimals: 6,
    bech32Prefix: "osmo",
    symbol: "OSMO",
    chainName: "Osmosis",
    logoUrl:
      "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/osmosis/uosmo.png",
  },
  {
    caip2: "cosmos:celestia",
    denom: "utia",
    decimals: 6,
    bech32Prefix: "celestia",
    symbol: "TIA",
    chainName: "Celestia",
    logoUrl:
      "https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/celestia/utia.png",
  },
] as const;

const CURRENCY_KEY = (caip2: string, denom: string) => `${caip2}:${denom}`;

const ALLOWED_CURRENCY_SET = new Set(
  ALLOWED_CURRENCIES.map((c) => CURRENCY_KEY(c.caip2, c.denom)),
);

const AMOUNT_REGEX = /^\d+$/;
const MAX_AMOUNT_DIGITS = 30;

export const PaymentIntentSchema = z
  .object({
    v: z.literal("1"),
    c: z.string(),
    d: z.string(),
    to: z.string(),
    a: z.string(),
    m: z.string().max(256).optional(),
    label: z.string().max(100).optional(),
    exp: z.string().optional(),
  })
  .refine((data) => ALLOWED_CURRENCY_SET.has(CURRENCY_KEY(data.c, data.d)), {
    message: "Unsupported chain/denom combination",
  })
  .refine(
    (data) => {
      const currency = ALLOWED_CURRENCIES.find(
        (c) => c.caip2 === data.c && c.denom === data.d,
      );
      if (!currency) return false;
      return data.to.startsWith(currency.bech32Prefix + "1");
    },
    { message: "Address prefix does not match chain" },
  )
  .refine(
    (data) =>
      AMOUNT_REGEX.test(data.a) &&
      data.a.length <= MAX_AMOUNT_DIGITS &&
      data.a !== "0" &&
      (data.a.length === 1 || !data.a.startsWith("0")),
    { message: "Amount must be a positive integer without leading zeros" },
  );

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export function getCurrencyByIntent(
  caip2: string,
  denom: string,
): AllowedCurrency | undefined {
  return ALLOWED_CURRENCIES.find(
    (c) => c.caip2 === caip2 && c.denom === denom,
  );
}

export function parseIntent(
  data: unknown,
): PaymentIntent | { error: string } {
  const result = PaymentIntentSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const firstIssue = result.error.issues[0];
  return { error: firstIssue?.message ?? "Invalid payment intent" };
}
