"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AuditMetrics } from "@/types/audit";

const items: { key: keyof Omit<AuditMetrics, "overlays">; label: string }[] = [
  { key: "typography", label: "Typography / Colors" },
  { key: "ctaPlacement", label: "CTA Placement" },
  { key: "visualHierarchy", label: "Visual Hierarchy" },
  { key: "conversionFlow", label: "CRO Conversion Flow" },
  { key: "accessibility", label: "Accessibility" },
  { key: "performance", label: "Performance" },
];

export function MetricsPanel({ metrics }: { metrics: AuditMetrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-3xl font-semibold tabular-nums">
                {metrics[item.key]}
              </p>
              <Progress value={metrics[item.key]} />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
