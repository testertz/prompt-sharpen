import type { SharpenCategory } from "@/lib/sharpen.functions";
import { cn } from "@/lib/utils";

const options: { value: SharpenCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "code", label: "Code" },
  { value: "image", label: "Image" },
];

export function CategoryTabs({
  value,
  onChange,
  disabled,
}: {
  value: SharpenCategory;
  onChange: (value: SharpenCategory) => void;
  disabled?: boolean;
}) {
  return (
    <div role="tablist" aria-label="Prompt category" className="inline-flex gap-1 border-b border-border">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm transition-colors disabled:opacity-50",
              active
                ? "border-accent text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
