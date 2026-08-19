"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisProgress } from "@/components/audit/analysis-progress";
import { ScoreBadge } from "@/components/dashboard/score-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { deleteWebsite, reanalyzeWebsite, type WebsiteCardData } from "@/lib/actions/sites";

const analyzing = new Set(["SCRAPING", "ANALYZING", "GENERATING"]);

export function WebsiteCard({ site }: { site: WebsiteCardData }) {
  const router = useRouter();
  const inFlight = analyzing.has(site.status);
  const topFixes = (site.latest?.suggestions ?? []).slice(0, 3);
  const summaryPoints =
    site.latest?.summary
      .split("\n")
      .map((point) => point.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];

  async function onReanalyze() {
    const result = await reanalyzeWebsite(site.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Re-analysis started.");
    router.refresh();
  }

  async function onDelete() {
    await deleteWebsite(site.id);
    toast.success("Site removed.");
    router.refresh();
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/9] bg-secondary">
        {site.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={site.thumbnailUrl}
            alt={`${site.name} screenshot`}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Screenshot pending
          </div>
        )}
      </div>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">{site.name}</h3>
            <a
              href={site.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {site.url.replace(/^https?:\/\//, "")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {site.latest ? (
            <ScoreBadge
              score={site.latest.overallScore}
              category={site.latest.scoreCategory}
            />
          ) : (
            <span className="text-xs text-muted-foreground">No score yet</span>
          )}
        </div>
        {site.lastAnalyzedAt ? (
          <p className="text-xs text-muted-foreground">
            Last analyzed {formatDistanceToNow(site.lastAnalyzedAt, { addSuffix: true })}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {inFlight ? (
          <AnalysisProgress status={site.status} message={site.statusMessage} />
        ) : site.status === "FAILED" ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {site.statusMessage ?? "Audit failed. Try re-analyzing."}
          </p>
        ) : (
          <div className="rounded-lg border bg-secondary/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Top 3 quick fixes
            </p>
            <ul className="space-y-2 text-sm">
              {(topFixes.length ? topFixes.map((item) => item.title) : summaryPoints).map(
                (item, index) => (
                  <li key={`fix-${index}`} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ),
              )}
              {!topFixes.length && !summaryPoints.length ? (
                <li className="text-muted-foreground">Run an analysis to generate suggestions.</li>
              ) : null}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/sites/${site.id}`}>View report</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onReanalyze} disabled={inFlight}>
            <RefreshCw className="h-4 w-4" />
            Re-analyze
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the site and every stored audit report.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete site</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
