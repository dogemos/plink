import { IntentForm } from "@/components/intent-form";

export default function Home() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-16 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center">
        <h1
          className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          style={{ textWrap: "balance" }}
        >
          Pay with Link
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Create a shareable payment link for Cosmos ecosystem tokens.
        </p>
        <IntentForm />
      </main>
    </div>
  );
}
