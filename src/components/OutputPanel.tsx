import { useEffect, useState } from "react";
import type { SharpenResult } from "@/lib/sharpen.functions";

export function OutputPanel({
  result,
  loading,
  error,
}: {
  result: SharpenResult | null;
  loading: boolean;
  error: string | null;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <section className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans text-sm tracking-wide text-muted-foreground">Sharpened version</h2>
        {result ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.enhanced_prompt);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="font-sans text-xs text-accent underline-offset-4 hover:underline"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        ) : null}
      </div>

      <div className="mt-3 min-h-[18rem] border-l-2 border-border py-1 pl-4">
        {loading ? (
          <p className="flex items-center gap-2 font-mono text-[0.9rem] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" />
            Sharpening…
          </p>
        ) : error ? (
          <p className="font-sans text-sm text-destructive">{error}</p>
        ) : result ? (
          <p className="whitespace-pre-wrap font-mono text-[0.9rem] leading-relaxed text-foreground">
            {result.enhanced_prompt}
          </p>
        ) : (
          <p className="font-mono text-[0.9rem] text-muted-foreground/70">
            The rewritten prompt will appear here.
          </p>
        )}
      </div>

      {result && result.why.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-serif text-lg text-foreground">What changed</h3>
          <ul className="mt-3 space-y-2">
            {result.why.map((item, index) => (
              <li key={index} className="flex gap-3 font-sans text-sm text-muted-foreground">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
