"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createWebsiteAndAnalyze } from "@/lib/actions/sites";
import type { DiscoveredPage, PageKind, SiteMap } from "@/types/audit";

const KIND_LABEL: Record<PageKind, string> = {
  home: "Home",
  product: "Product",
  collection: "Collection",
  pricing: "Pricing",
  checkout: "Checkout",
  signup: "Signup",
  blog: "Blog",
  docs: "Docs",
  about: "About",
  contact: "Contact",
  other: "Page",
};

function kindVariant(kind: PageKind) {
  if (kind === "product") return "good" as const;
  if (kind === "collection" || kind === "pricing") return "medium" as const;
  return "secondary" as const;
}

function PageRow({
  page,
  featured,
  pendingUrl,
  onAudit,
}: {
  page: DiscoveredPage;
  featured?: boolean;
  pendingUrl: string | null;
  onAudit: (url: string) => void;
}) {
  const busy = pendingUrl === page.url;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 ${
        featured ? "border-primary/40 bg-primary/5" : "bg-background"
      }`}
    >
      <Badge variant={kindVariant(page.kind)}>{KIND_LABEL[page.kind]}</Badge>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{page.label}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{page.path}</p>
      </div>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {page.source}
      </span>
      <Button asChild size="sm" variant="ghost">
        <a href={page.url} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => onAudit(page.url)}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
        Audit
      </Button>
    </div>
  );
}

export function DiscoveredPages({
  siteMap,
  hideHeader = false,
}: {
  siteMap: SiteMap;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  async function onAudit(url: string) {
    setPendingUrl(url);
    const result = await createWebsiteAndAnalyze(url);
    setPendingUrl(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Started a dedicated audit for that page.");
    if (result.id) {
      router.push(`/dashboard/sites/${result.id}`);
    }
    router.refresh();
  }

  const otherPages = siteMap.pages.filter(
    (page) => !siteMap.productPages.some((product) => product.url === page.url),
  );

  return (
    <div className="space-y-4">
      {hideHeader ? null : (
        <div>
          <h2 className="text-xl font-semibold">Pages on this site</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inferred from nav/CTAs, JSON-LD, and sitemap.xml. This crawl audited a{" "}
            <span className="font-medium text-foreground">
              {KIND_LABEL[siteMap.currentKind].toLowerCase()}
            </span>{" "}
            page.
          </p>
        </div>
      )}

      {siteMap.productPage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Likely product / catalog page</CardTitle>
          </CardHeader>
          <CardContent>
            <PageRow
              page={siteMap.productPage}
              featured
              pendingUrl={pendingUrl}
              onAudit={onAudit}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          No product or collection URL was obvious from this landing page. Browse the site map
          below or paste a PDP URL into the dashboard.
        </p>
      )}

      {siteMap.productPages.length > 1 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Other product candidates</h3>
          <div className="space-y-2">
            {siteMap.productPages.slice(1).map((page) => (
              <PageRow
                key={page.url}
                page={page}
                pendingUrl={pendingUrl}
                onAudit={onAudit}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Same-site pages ({siteMap.pages.length})
        </h3>
        <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
          {otherPages.map((page) => (
            <PageRow key={page.url} page={page} pendingUrl={pendingUrl} onAudit={onAudit} />
          ))}
          {otherPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No additional internal pages found.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
