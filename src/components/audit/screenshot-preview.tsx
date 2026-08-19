"use client";

import { cn } from "@/lib/utils";
import { FindingMarker, findingMarkerClass } from "@/components/audit/finding-marker";
import { Badge } from "@/components/ui/badge";
import type { OverlayMarker } from "@/types/audit";

export function ScreenshotPreview({
  src,
  overlays = [],
  className,
  activeId,
  onSelect,
}: {
  src: string;
  overlays?: OverlayMarker[];
  className?: string;
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card", className)}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Full-page preview</h3>
          <p className="text-xs text-muted-foreground">
            Numbered pins match <span className="font-medium text-foreground">Detailed suggestions</span>{" "}
            on the right. Click a pin or a row to jump there.
          </p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Badge variant="high">High</Badge>
          <Badge variant="mid">Medium</Badge>
          <Badge variant="low">Low</Badge>
        </div>
      </div>

      {overlays.length ? (
        <ol className="max-h-28 shrink-0 space-y-0.5 overflow-y-auto border-b px-2 py-2 lg:max-h-40">
          {overlays.map((marker) => {
            const selected = activeId === marker.id;
            return (
              <li key={marker.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(marker.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                    selected ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <FindingMarker id={marker.id} impact={marker.impact} size="sm" className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium leading-4">{marker.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Suggestion {marker.id} · {marker.impact.toLowerCase()} impact
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-secondary">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Full page crawl capture" className="w-full" />
          {overlays.map((marker) => {
            const selected = activeId === marker.id;
            return (
              <button
                key={marker.id}
                type="button"
                onClick={() => onSelect?.(marker.id)}
                aria-label={`Open suggestion ${marker.id}: ${marker.label}`}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%` }}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shadow-lg ring-2 ring-white/80 transition",
                    findingMarkerClass(marker.impact),
                    selected && "scale-125 ring-4 ring-white",
                  )}
                >
                  {marker.id}
                </span>
                <span className="pointer-events-none absolute left-8 top-1/2 z-20 hidden w-max max-w-56 -translate-y-1/2 rounded-md bg-zinc-950 px-2 py-1 text-left text-[11px] font-medium leading-4 text-white shadow-lg group-hover:block group-focus-visible:block">
                  Suggestion {marker.id}: {marker.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
