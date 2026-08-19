import type { ImageIssue, ImageIssueFlag, ImageSnapshot } from "@/types/audit";

const GENERIC_ALT = /^(image|img|photo|picture|untitled|logo|icon|graphic)$/i;

function looksLikeFilename(alt: string) {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(alt.trim());
}

export function flagImageIssues(images: ImageSnapshot[]): ImageIssue[] {
  return images
    .filter((image) => image.src && !image.src.startsWith("data:"))
    .map((image) => {
      const issues: ImageIssueFlag[] = [];
      const alt = image.alt?.trim() ?? "";

      if (!alt) {
        issues.push({ kind: "alt", label: "Missing alt text" });
      } else if (GENERIC_ALT.test(alt) || looksLikeFilename(alt)) {
        issues.push({ kind: "alt", label: "Weak alt text" });
      }

      if (image.transferBytes != null && image.transferBytes > 200_000) {
        issues.push({
          kind: "weight",
          label: `${Math.round(image.transferBytes / 1024)} KB file`,
        });
      }

      const oversized =
        image.displayWidth > 0 &&
        image.width >= Math.max(700, image.displayWidth * 2);
      if (oversized) {
        issues.push({
          kind: "quality",
          label: `${image.width}×${image.height} served at ${image.displayWidth}×${image.displayHeight}`,
        });
      }

      if (/\.(bmp|tiff?|png)$/i.test(image.src) && (image.transferBytes ?? 0) > 120_000) {
        issues.push({ kind: "quality", label: "Use WebP/AVIF instead of heavy raster" });
      }

      if (!image.inViewport && image.loading !== "lazy" && image.displayHeight >= 40) {
        issues.push({ kind: "lazyload", label: "Not lazy-loaded below the fold" });
      }

      if (image.inViewport && image.fetchPriority !== "high" && image.displayWidth >= 600) {
        issues.push({ kind: "lazyload", label: "Hero should use fetchpriority=high" });
      }

      if (!image.width || !image.height) {
        issues.push({ kind: "dimensions", label: "Missing intrinsic size" });
      }

      return {
        src: image.src,
        alt: image.alt,
        width: image.width,
        height: image.height,
        displayWidth: image.displayWidth,
        displayHeight: image.displayHeight,
        transferBytes: image.transferBytes,
        issues,
      };
    })
    .filter((image) => image.issues.length > 0)
    .slice(0, 24);
}
