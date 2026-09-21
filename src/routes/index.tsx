import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { DraftPanel } from "@/components/DraftPanel";
import { OutputPanel } from "@/components/OutputPanel";
import {
  sharpenPrompt,
  type SharpenCategory,
  type SharpenResult,
} from "@/lib/sharpen.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sharpen — turn rough drafts into clear prompts" },
      {
        name: "description",
        content:
          "Sharpen rewrites a rough draft prompt into a clear, well-structured prompt for chat, code, or image models.",
      },
      { property: "og:title", content: "Sharpen — turn rough drafts into clear prompts" },
      {
        property: "og:description",
        content:
          "Paste a rough idea and get back a sharper prompt, plus a short note on what changed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const sharpen = useServerFn(sharpenPrompt);
  const [draft, setDraft] = useState("");
  const [category, setCategory] = useState<SharpenCategory>("general");
  const [result, setResult] = useState<SharpenResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = draft.trim().length > 0 && !loading;

  const run = useCallback(async () => {
    if (draft.trim().length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await sharpen({ data: { draft: draft.trim(), category } });
      if (response.ok) {
        setResult(response.data);
      } else {
        setError(response.message);
      }
    } catch {
      setError("Couldn't reach the service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [category, draft, loading, sharpen]);

  return (
    <main className="min-h-screen bg-background px-6 py-14 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-xl">
          <h1 className="font-serif text-5xl font-normal tracking-tight text-foreground">
            Sharpen
          </h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-muted-foreground">
            A rough draft in, a clear prompt out. Nothing is stored.
          </p>
        </header>

        <div className="mt-10">
          <CategoryTabs value={category} onChange={setCategory} disabled={loading} />
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <DraftPanel value={draft} onChange={setDraft} onSubmit={run} disabled={loading} />
          <OutputPanel result={result} loading={loading} error={error} />
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-border pt-8">
          <button
            type="button"
            onClick={run}
            disabled={!canSubmit}
            className="rounded-sm bg-primary px-6 py-2.5 font-sans text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Sharpening…" : "Sharpen it"}
          </button>
          <span className="font-mono text-xs text-muted-foreground">⌘ / Ctrl + Enter</span>
        </div>
      </div>
    </main>
  );
}
