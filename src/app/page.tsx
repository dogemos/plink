import { IntentForm } from "@/components/intent-form";

export default function Home() {
  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <main className="mx-auto w-full max-w-xl">
        <header className="mb-10 text-center sm:mb-12">
          <p className="mb-4 inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-200">
            Simple and verifiable
          </p>
          <h1
            className="text-balance text-3xl font-semibold text-slate-100 sm:text-5xl"
            style={{ textWrap: "balance" }}
          >
            One link. They verify, then pay.
          </h1>
        </header>

        <IntentForm />
      </main>
    </div>
  );
}
