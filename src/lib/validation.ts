import { Bech32Address } from "@keplr-wallet/cosmos";
import { Int } from "@keplr-wallet/unit";

const AMOUNT_REGEX = /^\d+$/;
const DISPLAY_AMOUNT_REGEX = /^\d+(\.\d+)?$/;
const MAX_AMOUNT_DIGITS = 30;

export function validateAddress(
  address: string,
  expectedPrefix: string,
): boolean {
  try {
    Bech32Address.validate(address, expectedPrefix);
    return true;
  } catch {
    return false;
  }
}

export function validateAmount(amount: string): boolean {
  if (!AMOUNT_REGEX.test(amount)) return false;
  if (amount.length > MAX_AMOUNT_DIGITS) return false;
  if (amount === "0") return false;
  if (amount.length > 1 && amount.startsWith("0")) return false;
  return true;
}

export function displayToBaseAmount(
  displayAmount: string,
  decimals: number,
): string | null {
  if (!DISPLAY_AMOUNT_REGEX.test(displayAmount)) return null;
  if (displayAmount.startsWith("-")) return null;

  const parts = displayAmount.split(".");
  const wholePart = parts[0];
  const fracPart = parts[1] ?? "";

  if (fracPart.length > decimals) return null;

  const paddedFrac = fracPart.padEnd(decimals, "0");
  const combined = wholePart + paddedFrac;

  // Remove leading zeros but keep at least one digit
  const trimmed = combined.replace(/^0+/, "") || "0";

  if (trimmed === "0") return null;

  try {
    const result = new Int(trimmed);
    if (result.isNegative()) return null;
    return result.toString();
  } catch {
    return null;
  }
}

export function baseToDisplayAmount(
  baseAmount: string,
  decimals: number,
): string {
  if (decimals === 0) return baseAmount;

  const padded = baseAmount.padStart(decimals + 1, "0");
  const wholePart = padded.slice(0, padded.length - decimals);
  const fracPart = padded.slice(padded.length - decimals);

  // Trim trailing zeros from fractional part
  const trimmedFrac = fracPart.replace(/0+$/, "");

  if (trimmedFrac.length === 0) return wholePart;
  return `${wholePart}.${trimmedFrac}`;
}
