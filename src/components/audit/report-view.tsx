"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnalysisProgress } from "@/components/audit/analysis-progress";
import { CollapsibleSection } from "@/components/audit/collapsible-section";
import { DiscoveredPages } from "@/components/audit/discovered-pages";
import { ImageIssuesGrid } from "@/components/audit/image-issues-grid";
import { MetricsPanel } from "@/components/audit/metrics-panel";
import { ScoreGauge } from "@/components/audit/score-gauge";
import { ScreenshotPreview } from "@/components/audit/screenshot-preview";
import { SuggestionCard } from "@/components/audit/suggestion-card";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteReport, reanalyzeWebsite, type SiteReportData } from "@/lib/actions/sites";

const analyzing = new Set(["SCRAPING", "ANALYZING", "GENERATING"]);

export function ReportView({
  websiteId,
  initial,
}: {
  websiteId: string;
  initial: SiteReportData;
}) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["site-report", websiteId],
    queryFn: async () => {
      const report = await getSiteReport(websiteId);
      if (!report) throw new Error("Missing report");
      return report;
    },
    initialData: initial,
    refetchInterval: (query) =>
      query.state.data && analyzing.has(query.state.data.status) ? 1500 : false,
  });

  const inFlight = analyzing.has(data.status);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  function selectFinding(id: string) {
    setActiveFindingId(id);
    setSuggestionsOpen(true);
    window.setTimeout(() => {
      document.getElementById(`suggestion-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  }

  async function onReanalyze() {
    const result = await reanalyzeWebsite(websiteId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Re-analysis started.");
    router.refresh();
  }

  const summaryPoints =
    data.report?.summary
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean) ?? [];

  const reportSections = data.report ? (
    <>
      <CollapsibleSection title="Overview" description="Overall score and executive takeaways">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <Card className="flex items-center justify-center p-6">
            <div className="text-center">
              <ScoreGauge score={data.report.overallScore} />
              <ScoreBadge
                className="mt-2"
                score={data.report.overallScore}
                category={data.report.scoreCategory}
              />
            </div>
          </Card>
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">Executive summary</h2>
              <ol className="space-y-3">
                {summaryPoints.map((point, index) => (
                  <li key={`summary-${index}`} className="flex gap-3 text-sm leading-6">
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    {point}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Score breakdown">
        <MetricsPanel metrics={data.report.metrics} />
      </CollapsibleSection>

      {data.report.metrics.imageIssues?.length ? (
        <CollapsibleSection
          title="Images that need work"
          description="Missing alt text, oversized files, or slow loading attributes"
          count={data.report.metrics.imageIssues.length}
        >
          <ImageIssuesGrid images={data.report.metrics.imageIssues} hideHeader />
        </CollapsibleSection>
      ) : null}

      {data.report.metrics.siteMap ? (
        <CollapsibleSection
          title="Pages on this site"
          description={`Inferred from nav, JSON-LD, and sitemap · this crawl audited a ${data.report.metrics.siteMap.currentKind} page`}
          count={data.report.metrics.siteMap.pages.length}
        >
          <DiscoveredPages siteMap={data.report.metrics.siteMap} hideHeader />
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        title="Detailed suggestions"
        description="Numbered pins on the page preview map to these cards. Click a pin to jump here."
        count={data.report.suggestions.length}
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
      >
        <div className="space-y-4">
          {data.report.suggestions.map((suggestion, index) => {
            const marker = data.report?.metrics.overlays?.[index];
            return (
              <SuggestionCard
                key={`${suggestion.selector}-${suggestion.title}`}
                suggestion={suggestion}
                markerId={marker?.id}
                active={marker ? activeFindingId === marker.id : false}
                onSelect={marker ? () => selectFinding(marker.id) : undefined}
              />
            );
          })}
        </div>
      </CollapsibleSection>
    </>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-1 h-7 px-0">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{data.name}</h1>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 truncate hover:text-foreground"
            >
              <span className="truncate">{data.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <span className="hidden sm:inline">·</span>
            <span>
              {data.lastAnalyzedAt
                ? `Analyzed ${format(data.lastAnalyzedAt, "MMM d, yyyy 'at' h:mm a")}`
                : "Not analyzed yet"}
            </span>
          </div>
        </div>
        <Button onClick={onReanalyze} disabled={inFlight} size="sm" className="shrink-0">
          <RefreshCw className={inFlight ? "animate-spin" : ""} />
          Re-Analyze
        </Button>
      </div>

      {inFlight ? (
        <AnalysisProgress status={data.status} message={data.statusMessage} />
      ) : null}

      {data.status === "FAILED" ? (
        <p className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {data.statusMessage ?? "The crawl failed. Check the URL and try again."}
        </p>
      ) : null}

      {data.status === "COMPLETE" && data.statusMessage ? (
        <div className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{data.statusMessage}</p>
          <Link href="/dashboard/settings" className="mt-2 inline-block font-medium underline underline-offset-2">
            Update API keys in Settings
          </Link>
        </div>
      ) : null}

      {data.report ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
          {data.report.screenshotUrl ? (
            <ScreenshotPreview
              className="h-72 w-full min-h-0 shrink-0 lg:h-full lg:w-[42%] lg:max-w-[520px] lg:flex-none"
              src={data.report.screenshotUrl}
              overlays={data.report.metrics.overlays ?? []}
              activeId={activeFindingId}
              onSelect={selectFinding}
            />
          ) : (
            <div className="flex h-72 w-full shrink-0 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground lg:h-full lg:w-[42%] lg:max-w-[520px] lg:flex-none">
              Screenshot not captured
            </div>
          )}
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            {reportSections}
          </div>
        </div>
      ) : !inFlight ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No report yet. Launch a crawl to generate CRO recommendations.
        </div>
      ) : null}
    </div>
  );
}
