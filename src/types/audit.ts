export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";
export type ScoreCategory = "POOR" | "MEDIUM" | "GOOD";
export type WebsiteStatus =
  | "IDLE"
  | "SCRAPING"
  | "ANALYZING"
  | "GENERATING"
  | "COMPLETE"
  | "FAILED";

export type OverlayMarker = {
  id: string;
  label: string;
  impact: ImpactLevel;
  xPercent: number;
  yPercent: number;
};

export type AuditMetrics = {
  performance: number;
  visualHierarchy: number;
  typography: number;
  accessibility: number;
  ctaPlacement: number;
  conversionFlow: number;
  seo: number;
  overlays: OverlayMarker[];
  siteMap?: SiteMap;
  loadTiming?: LoadTiming;
  imageIssues?: ImageIssue[];
};

export type ImageIssueKind = "alt" | "quality" | "weight" | "lazyload" | "dimensions";

export type ImageIssueFlag = {
  kind: ImageIssueKind;
  label: string;
};

export type ImageIssue = {
  src: string;
  alt: string | null;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  transferBytes: number | null;
  issues: ImageIssueFlag[];
};

export type ImageSnapshot = {
  src: string;
  alt: string | null;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  loading: string | null;
  fetchPriority: string | null;
  inViewport: boolean;
  transferBytes: number | null;
};

export type LoadTiming = {
  ttfbMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  dclMs: number | null;
  loadMs: number | null;
  requestCount: number;
  transferBytes: number;
  imageBytes: number;
  jsBytes: number;
  cssBytes: number;
};

export type PageKind =
  | "home"
  | "product"
  | "collection"
  | "pricing"
  | "checkout"
  | "signup"
  | "blog"
  | "docs"
  | "about"
  | "contact"
  | "other";

export type PageSource = "nav" | "cta" | "footer" | "body" | "sitemap" | "jsonld";

export type DiscoveredPage = {
  url: string;
  path: string;
  label: string;
  kind: PageKind;
  source: PageSource;
  productScore: number;
};

export type SiteMap = {
  origin: string;
  currentKind: PageKind;
  productPage: DiscoveredPage | null;
  productPages: DiscoveredPage[];
  pages: DiscoveredPage[];
};

export type InternalLink = {
  href: string;
  label: string;
  source: "nav" | "cta" | "footer" | "body";
};

export type Suggestion = {
  title: string;
  category: string;
  impact: ImpactLevel;
  selector: string;
  reasoning: string;
  currentCodeSnippet: string;
  suggestedCodeSnippet: string;
};

export type CtaSnapshot = {
  selector: string;
  text: string;
  tag: string;
  href?: string;
  styles: {
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontFamily: string;
    fontWeight: string;
    padding: string;
    borderRadius: string;
    width: number;
    height: number;
  };
  bbox: { x: number; y: number; width: number; height: number };
};

export type HeadingSnapshot = {
  tag: string;
  text: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  bbox: { x: number; y: number; width: number; height: number };
};

export type ScrapedPage = {
  url: string;
  finalUrl: string;
  title: string;
  meta: {
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    viewport: string | null;
    ogType: string | null;
    ogImage: string | null;
    canonical: string | null;
    robots: string | null;
    htmlLang: string | null;
    twitterCard: string | null;
    twitterTitle: string | null;
    hreflang: string[];
  };
  headings: HeadingSnapshot[];
  ctas: CtaSnapshot[];
  fonts: string[];
  colors: string[];
  images: ImageSnapshot[];
  forms: { action: string | null; method: string; fields: number }[];
  links: InternalLink[];
  jsonLdRaw: string[];
  wordCount: number;
  bodyTextPreview: string;
  documentSize: { width: number; height: number };
  timing: LoadTiming;
  screenshot: Buffer;
};

export type LlmAuditResult = {
  overallScore: number;
  summaryPoints: [string, string, string];
  metrics: Omit<AuditMetrics, "overlays" | "siteMap" | "loadTiming" | "imageIssues">;
  suggestions: Suggestion[];
};
