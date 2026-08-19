"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnalysisProgress } from "@/components/audit/analysis-progress";
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

  async function onReanalyze() {
    const result = await reanalyzeWebsite(websiteId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Re-analysis started.");
    router.refresh();
  }

  const summaryPoints = data.report?.summary.split("\n").filter(Boolean) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 px-0">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{data.name}</h1>
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {data.url}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.lastAnalyzedAt
              ? `Last analyzed ${format(data.lastAnalyzedAt, "MMM d, yyyy 'at' h:mm a")}`
              : "Not analyzed yet"}
          </p>
        </div>
        <Button onClick={onReanalyze} disabled={inFlight}>
          <RefreshCw className={inFlight ? "animate-spin" : ""} />
          Re-Analyze Site
        </Button>
      </div>

      {inFlight ? (
        <AnalysisProgress status={data.status} message={data.statusMessage} />
      ) : null}

      {data.status === "FAILED" ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {data.statusMessage ?? "The crawl failed. Check the URL and try again."}
        </p>
      ) : null}

      {data.report ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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
                    <li key={point} className="flex gap-3 text-sm leading-6">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      {point}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Score breakdown</h2>
            <MetricsPanel metrics={data.report.metrics} />
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Detailed suggestions</h2>
            <div className="space-y-4">
              {data.report.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={`${suggestion.selector}-${suggestion.title}`}
                  suggestion={suggestion}
                />
              ))}
            </div>
          </section>

          {data.report.screenshotUrl ? (
            <ScreenshotPreview
              src={data.report.screenshotUrl}
              overlays={data.report.metrics.overlays ?? []}
            />
          ) : null}
        </>
      ) : !inFlight ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No report yet. Launch a crawl to generate CRO recommendations.
        </div>
      ) : null}
    </div>
  );
}
