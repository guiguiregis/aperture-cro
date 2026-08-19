"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ImageIssue, ImageIssueKind } from "@/types/audit";

const KIND_VARIANT: Record<ImageIssueKind, "high" | "mid" | "low" | "secondary"> = {
  alt: "high",
  weight: "mid",
  quality: "mid",
  lazyload: "low",
  dimensions: "secondary",
};

function formatKb(bytes: number | null) {
  if (bytes == null) return null;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function ImageThumb({ image }: { image: ImageIssue }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="relative h-20 bg-secondary">
        {failed ? (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
            Preview blocked
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={image.alt || "Image needing improvement"}
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate font-mono text-[10px] text-muted-foreground" title={image.src}>
          {image.src.replace(/^https?:\/\//, "")}
        </p>
        <div className="flex flex-wrap gap-0.5">
          {image.issues.slice(0, 2).map((issue) => (
            <Badge
              key={`${issue.kind}-${issue.label}`}
              variant={KIND_VARIANT[issue.kind]}
              className="px-1.5 py-0 text-[10px]"
            >
              {issue.label}
            </Badge>
          ))}
        </div>
        <p className="truncate text-[10px] text-muted-foreground">
          {image.width}×{image.height}
          {formatKb(image.transferBytes) ? ` · ${formatKb(image.transferBytes)}` : ""}
        </p>
      </div>
    </div>
  );
}

export function ImageIssuesGrid({
  images,
  hideHeader = false,
}: {
  images: ImageIssue[];
  hideHeader?: boolean;
}) {
  if (!images.length) return null;

  return (
    <div className="space-y-4">
      {hideHeader ? null : (
        <div>
          <h2 className="text-xl font-semibold">Images that need work</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Flagged for missing/weak alt text, oversized files, or loading attributes that slow the
            page.
          </p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {images.map((image, index) => (
          <ImageThumb key={`${image.src}-${index}`} image={image} />
        ))}
      </div>
    </div>
  );
}
