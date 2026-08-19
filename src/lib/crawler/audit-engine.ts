import { Prisma } from "@prisma/client";
import { analyzeCRO } from "@/lib/crawler/llm";
import { flagImageIssues } from "@/lib/crawler/image-issues";
import { scrapeWebsite } from "@/lib/crawler/scraper";
import { buildSiteMap } from "@/lib/crawler/site-map";
import { prisma } from "@/lib/db";
import { saveScreenshot } from "@/lib/storage";
import { scoreCategory } from "@/lib/utils";
import type { AuditMetrics, OverlayMarker, Suggestion } from "@/types/audit";

async function setStatus(
  websiteId: string,
  status: "SCRAPING" | "ANALYZING" | "GENERATING" | "COMPLETE" | "FAILED",
  statusMessage: string | null,
  extra: Prisma.WebsiteUpdateInput = {},
) {
  await prisma.website.update({
    where: { id: websiteId },
    data: { status, statusMessage, ...extra },
  });
}

function buildOverlays(
  suggestions: Suggestion[],
  scrape: Awaited<ReturnType<typeof scrapeWebsite>>,
): OverlayMarker[] {
  return suggestions.slice(0, 8).map((suggestion, index) => {
    const match =
      scrape.ctas.find((cta) => suggestion.selector.includes(cta.selector.replace(/:nth-child\(\d+\)/, ""))) ??
      scrape.ctas[index] ??
      null;

    const heading = scrape.headings[index];
    const point = match?.bbox ?? heading?.bbox;

    const xPercent = point
      ? Math.min(92, Math.max(4, (point.x / Math.max(scrape.documentSize.width, 1)) * 100))
      : 12 + (index % 3) * 28;
    const yPercent = point
      ? Math.min(92, Math.max(6, (point.y / Math.max(scrape.documentSize.height, 1)) * 100))
      : 18 + index * 8;

    return {
      id: String(index + 1),
      label: suggestion.title,
      impact: suggestion.impact,
      xPercent,
      yPercent,
    };
  });
}

export async function runAuditEngine(websiteId: string): Promise<void> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { user: true },
  });

  if (!website) {
    throw new Error("Website not found.");
  }

  try {
    await setStatus(websiteId, "SCRAPING", "Scraping DOM...");
    const scrape = await scrapeWebsite(website.url);
    const screenshotUrl = await saveScreenshot(websiteId, scrape.screenshot);

    await setStatus(websiteId, "SCRAPING", "Mapping site pages...", {
      thumbnailUrl: screenshotUrl,
    });
    const siteMap = await buildSiteMap(scrape);

    await setStatus(websiteId, "ANALYZING", "Analyzing CRO & SEO heuristics...", {
      thumbnailUrl: screenshotUrl,
    });

    await setStatus(websiteId, "GENERATING", "Generating Report...");
    const { result } = await analyzeCRO(scrape, {
      openaiApiKey: website.user.openaiApiKey,
      anthropicApiKey: website.user.anthropicApiKey,
    });

    const overlays = buildOverlays(result.suggestions, scrape);
    const metrics: AuditMetrics = {
      ...result.metrics,
      overlays,
      siteMap,
      loadTiming: scrape.timing,
      imageIssues: flagImageIssues(scrape.images),
    };

    await prisma.auditReport.create({
      data: {
        websiteId,
        overallScore: result.overallScore,
        scoreCategory: scoreCategory(result.overallScore),
        summary: result.summaryPoints.join("\n"),
        screenshotUrl,
        metrics,
        suggestions: result.suggestions,
      },
    });

    await setStatus(websiteId, "COMPLETE", null, {
      lastAnalyzedAt: new Date(),
      thumbnailUrl: screenshotUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Audit failed unexpectedly.";
    await setStatus(websiteId, "FAILED", message);
    throw error;
  }
}
