"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AuditMetrics, LoadTiming } from "@/types/audit";

const items: {
  key: keyof Omit<AuditMetrics, "overlays" | "siteMap" | "loadTiming" | "imageIssues">;
  label: string;
}[] = [
  { key: "typography", label: "Typography / Colors" },
  { key: "ctaPlacement", label: "CTA Placement" },
  { key: "visualHierarchy", label: "Visual Hierarchy" },
  { key: "conversionFlow", label: "CRO Conversion Flow" },
  { key: "seo", label: "SEO / Search Snippets" },
  { key: "accessibility", label: "Accessibility" },
  { key: "performance", label: "Page load / CWV" },
];

function formatMs(ms: number | null | undefined) {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatKb(bytes: number | undefined) {
  if (!bytes) return "—";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function LoadFacts({ timing }: { timing: LoadTiming }) {
  const facts = [
    { label: "TTFB", value: formatMs(timing.ttfbMs) },
    { label: "FCP", value: formatMs(timing.fcpMs) },
    { label: "LCP", value: formatMs(timing.lcpMs) },
    { label: "Load", value: formatMs(timing.loadMs) },
    { label: "Requests", value: String(timing.requestCount) },
    { label: "Weight", value: formatKb(timing.transferBytes) },
  ];

  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-md bg-secondary/60 px-2 py-1.5">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="font-medium tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MetricsPanel({ metrics }: { metrics: AuditMetrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const value = typeof metrics[item.key] === "number" ? metrics[item.key] : 0;
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={item.key === "performance" ? "md:col-span-2 xl:col-span-1" : undefined}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-3xl font-semibold tabular-nums">
                  {typeof metrics[item.key] === "number" ? metrics[item.key] : "—"}
                </p>
                <Progress value={value} />
                {item.key === "performance" && metrics.loadTiming ? (
                  <LoadFacts timing={metrics.loadTiming} />
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
