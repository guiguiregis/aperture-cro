"use client";

import { useQuery } from "@tanstack/react-query";
import { WebsiteCard } from "@/components/dashboard/website-card";
import { getDashboardWebsites, type WebsiteCardData } from "@/lib/actions/sites";

const analyzing = new Set(["SCRAPING", "ANALYZING", "GENERATING"]);

export function WebsiteGrid({ initial }: { initial: WebsiteCardData[] }) {
  const { data } = useQuery({
    queryKey: ["dashboard-websites"],
    queryFn: getDashboardWebsites,
    initialData: initial,
    refetchInterval: (query) => {
      const sites = query.state.data ?? [];
      return sites.some((site) => analyzing.has(site.status)) ? 1500 : false;
    },
  });

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/50 p-12 text-center">
        <h3 className="text-lg font-semibold">No sites yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a URL above to crawl the DOM, score CRO heuristics, and generate a report.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {data.map((site) => (
        <WebsiteCard key={site.id} site={site} />
      ))}
    </div>
  );
}
