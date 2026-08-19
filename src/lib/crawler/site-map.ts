import type {
  DiscoveredPage,
  InternalLink,
  PageKind,
  PageSource,
  ScrapedPage,
  SiteMap,
} from "@/types/audit";

const SKIP_EXT = /\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|mp3|css|js|xml|json)$/i;

const KIND_RULES: { kind: PageKind; pattern: RegExp }[] = [
  { kind: "checkout", pattern: /\/(cart|checkout|bag|basket|payment)(\/|$)/i },
  { kind: "signup", pattern: /\/(signup|sign-up|register|get-started|start|trial|demo|onboarding)(\/|$)/i },
  { kind: "pricing", pattern: /\/(pricing|plans?|price)(\/|$)/i },
  { kind: "product", pattern: /\/(products?|item|sku|dp|gp\/product|p)(\/|$)/i },
  { kind: "collection", pattern: /\/(collections?|categor(y|ies)|catalog|shop|store|all-products)(\/|$)/i },
  { kind: "blog", pattern: /\/(blog|news|articles?|posts?|resources|insights)(\/|$)/i },
  { kind: "docs", pattern: /\/(docs?|help|support|faq|guides?)(\/|$)/i },
  { kind: "about", pattern: /\/(about|company|team|careers?|jobs)(\/|$)/i },
  { kind: "contact", pattern: /\/(contact|contact-us|support\/contact)(\/|$)/i },
];

function canonicalize(raw: string, origin: string): URL | null {
  try {
    const url = new URL(raw, origin);
    if (url.origin !== new URL(origin).origin) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    if (SKIP_EXT.test(url.pathname)) return null;
    if (url.pathname.length > 180) return null;
    return url;
  } catch {
    return null;
  }
}

export function classifyPath(pathname: string): PageKind {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "") return "home";
  for (const rule of KIND_RULES) {
    if (rule.pattern.test(path)) return rule.kind;
  }
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 2 && !["legal", "privacy", "terms", "login", "account"].includes(segments[0] ?? "")) {
    return "other";
  }
  return "other";
}

function productScore(kind: PageKind, source: PageSource, label: string, path: string): number {
  let score = 0;
  if (kind === "product") score += 70;
  if (kind === "collection") score += 48;
  if (kind === "pricing") score += 36;
  if (kind === "signup") score += 28;
  if (source === "jsonld") score += 22;
  if (source === "sitemap" && kind === "product") score += 12;
  if (source === "nav") score += 8;
  if (source === "cta") score += 10;
  if (/buy|shop|product|pricing|get started|try|demo/i.test(label)) score += 10;
  const depth = path.split("/").filter(Boolean).length;
  if (kind === "product" && depth >= 2) score += 8;
  return Math.min(100, score);
}

function labelFor(path: string, fallback: string): string {
  const cleaned = fallback.replace(/\s+/g, " ").trim();
  if (cleaned.length >= 2 && cleaned.length <= 60) return cleaned;
  const slug = path.split("/").filter(Boolean).pop() ?? path;
  return decodeURIComponent(slug.replace(/[-_]/g, " ")) || path;
}

export function discoverFromLinks(
  origin: string,
  links: InternalLink[],
  extra: { url: string; label: string; source: PageSource }[] = [],
): Map<string, DiscoveredPage> {
  const pages = new Map<string, DiscoveredPage>();

  const ingest = (href: string, label: string, source: PageSource) => {
    const parsed = canonicalize(href, origin);
    if (!parsed) return;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const url = `${parsed.origin}${path === "/" ? "/" : path}`;
    const kind = classifyPath(path);
    const next: DiscoveredPage = {
      url,
      path,
      label: labelFor(path, label),
      kind,
      source,
      productScore: productScore(kind, source, label, path),
    };
    const existing = pages.get(url);
    if (!existing || next.productScore > existing.productScore) {
      pages.set(url, next);
    }
  };

  for (const link of links) {
    ingest(link.href, link.label, link.source);
  }
  for (const item of extra) {
    ingest(item.url, item.label, item.source);
  }

  return pages;
}

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)).map((match) =>
    match[1].trim(),
  );
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "user-agent": "ApertureCRO/1.0" },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const robots = await fetchText(`${origin}/robots.txt`);
  const sitemapRefs = robots
    ? Array.from(robots.matchAll(/^sitemap:\s*(\S+)/gim)).map((match) => match[1])
    : [];
  const seeds = [...sitemapRefs, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const seed of seeds.slice(0, 4)) {
    const xml = await fetchText(seed);
    if (!xml || !xml.includes("<")) continue;
    const locs = extractLocs(xml);
    const nested = locs.filter((loc) => /sitemap/i.test(loc) && loc.endsWith(".xml"));
    const pages = locs.filter((loc) => !nested.includes(loc));
    for (const loc of pages) {
      if (seen.has(loc) || urls.length >= 200) continue;
      seen.add(loc);
      urls.push(loc);
    }
    for (const child of nested.slice(0, 3)) {
      const childXml = await fetchText(child);
      if (!childXml) continue;
      for (const loc of extractLocs(childXml)) {
        if (seen.has(loc) || urls.length >= 200) continue;
        seen.add(loc);
        urls.push(loc);
      }
    }
    if (urls.length > 0) break;
  }

  return urls;
}

function jsonLdUrls(rawBlocks: string[]): { url: string; label: string }[] {
  const found: { url: string; label: string }[] = [];

  const walk = (node: unknown) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const type = String(record["@type"] ?? "");
    if (/product|offer|itemlist/i.test(type)) {
      const url = String(record.url ?? record["@id"] ?? "");
      const name = String(record.name ?? record.headline ?? "Product");
      if (url) found.push({ url, label: name });
    }
    if (Array.isArray(record.itemListElement)) {
      for (const item of record.itemListElement) {
        walk(item);
        if (item && typeof item === "object") {
          const listed = item as Record<string, unknown>;
          const url = String(listed.url ?? listed.item ?? "");
          if (url.startsWith("http")) {
            found.push({ url, label: String(listed.name ?? "Product") });
          }
        }
      }
    }
    Object.values(record).forEach(walk);
  };

  for (const block of rawBlocks) {
    try {
      walk(JSON.parse(block));
    } catch {
      // ignore invalid JSON-LD
    }
  }

  return found;
}

export async function buildSiteMap(scrape: ScrapedPage): Promise<SiteMap> {
  const origin = new URL(scrape.finalUrl).origin;
  let currentKind = classifyPath(new URL(scrape.finalUrl).pathname);
  if (/product/i.test(scrape.meta.ogType ?? "")) {
    currentKind = "product";
  }

  const jsonLd = jsonLdUrls(scrape.jsonLdRaw);
  const pages = discoverFromLinks(
    origin,
    scrape.links,
    jsonLd.map((item) => ({ ...item, source: "jsonld" as const })),
  );

  const sitemapUrls = await fetchSitemapUrls(origin);
  for (const url of sitemapUrls) {
    const parsed = canonicalize(url, origin);
    if (!parsed) continue;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const key = `${parsed.origin}${path === "/" ? "/" : path}`;
    if (pages.has(key)) continue;
    const kind = classifyPath(path);
    pages.set(key, {
      url: key,
      path,
      label: labelFor(path, ""),
      kind,
      source: "sitemap",
      productScore: productScore(kind, "sitemap", "", path),
    });
  }

  const ranked = Array.from(pages.values()).sort(
    (a, b) => b.productScore - a.productScore || a.path.localeCompare(b.path),
  );
  const productPages = ranked
    .filter((page) => page.kind === "product" || page.kind === "collection")
    .slice(0, 12);

  return {
    origin,
    currentKind,
    productPage: productPages[0] ?? null,
    productPages,
    pages: ranked.slice(0, 80),
  };
}
