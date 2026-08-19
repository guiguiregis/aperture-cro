"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  description,
  count,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = openProp ?? uncontrolled;

  function setOpen(next: boolean) {
    if (openProp === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            {typeof count === "number" ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="border-t px-4 py-4">{children}</div> : null}
    </section>
  );
}
