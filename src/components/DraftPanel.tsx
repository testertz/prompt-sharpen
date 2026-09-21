export function DraftPanel({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="font-sans text-sm tracking-wide text-muted-foreground">Your draft</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        disabled={disabled}
        spellCheck={false}
        placeholder="Write the rough idea here. It doesn't need to be tidy."
        className="mt-3 min-h-[18rem] w-full resize-y border-l-2 border-border bg-transparent py-1 pl-4 font-mono text-[0.9rem] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-accent disabled:opacity-60"
      />
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {value.length} characters
      </p>
    </section>
  );
}
