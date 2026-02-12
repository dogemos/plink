import Image from "next/image";
import { ALLOWED_CURRENCIES, type AllowedCurrency } from "@/lib/intent-schema";

interface StepCurrencyProps {
  selected: AllowedCurrency;
  onSelect: (currency: AllowedCurrency) => void;
}

export function StepCurrency({ selected, onSelect }: StepCurrencyProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-100">
        Which token?
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Pick the one you want to receive.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {ALLOWED_CURRENCIES.map((currency) => {
          const isSelected = currency.symbol === selected.symbol;
          return (
            <button
              key={currency.symbol}
              type="button"
              onClick={() => onSelect(currency)}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isSelected
                  ? "border-sky-500/60 bg-sky-500/15 shadow-[0_0_20px_-6px_rgba(56,189,248,0.25)]"
                  : "border-slate-700 bg-slate-900/60 hover:border-slate-500"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              <Image
                src={currency.logoUrl}
                alt={currency.symbol}
                width={32}
                height={32}
                className="mt-0.5 shrink-0 rounded-full"
              />
              <div className="min-w-0">
                <span
                  className={`text-lg font-semibold ${
                    isSelected ? "text-sky-100" : "text-slate-100"
                  }`}
                >
                  {currency.symbol}
                </span>
                <span
                  className={`mt-0.5 block text-sm ${
                    isSelected ? "text-sky-300" : "text-slate-400"
                  }`}
                >
                  {currency.chainName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
