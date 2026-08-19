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
  overlays: OverlayMarker[];
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
  };
  headings: HeadingSnapshot[];
  ctas: CtaSnapshot[];
  fonts: string[];
  colors: string[];
  images: { src: string; alt: string | null; width: number; height: number }[];
  forms: { action: string | null; method: string; fields: number }[];
  wordCount: number;
  bodyTextPreview: string;
  documentSize: { width: number; height: number };
  screenshot: Buffer;
};

export type LlmAuditResult = {
  overallScore: number;
  summaryPoints: [string, string, string];
  metrics: Omit<AuditMetrics, "overlays">;
  suggestions: Suggestion[];
};
