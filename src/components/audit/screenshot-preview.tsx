"use client";

import { Badge } from "@/components/ui/badge";
import type { OverlayMarker } from "@/types/audit";

function markerColor(impact: OverlayMarker["impact"]) {
  if (impact === "HIGH") return "bg-rose-500";
  if (impact === "MEDIUM") return "bg-amber-400";
  return "bg-sky-400";
}

export function ScreenshotPreview({
  src,
  overlays = [],
}: {
  src: string;
  overlays?: OverlayMarker[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">Full-page preview</h3>
          <p className="text-xs text-muted-foreground">
            Captured during crawl · markers map to CRO issues
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="high">High</Badge>
          <Badge variant="mid">Medium</Badge>
          <Badge variant="low">Low</Badge>
        </div>
      </div>
      <div className="relative max-h-[720px] overflow-auto bg-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Full page crawl capture" className="w-full" />
        {overlays.map((marker) => (
          <div
            key={marker.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%` }}
            title={marker.label}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-zinc-950 shadow-lg ${markerColor(marker.impact)}`}
            >
              {marker.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
