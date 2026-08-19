import { z } from "zod";

export const suggestionSchema = z.object({
  title: z.string().min(4).max(120),
  category: z.string().min(3).max(48),
  impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
  selector: z.string().min(1).max(240),
  reasoning: z.string().min(20).max(800),
  currentCodeSnippet: z.string().min(4).max(2000),
  suggestedCodeSnippet: z.string().min(4).max(2500),
});

export const llmAuditSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summaryPoints: z.tuple([z.string(), z.string(), z.string()]),
  metrics: z.object({
    performance: z.number().min(0).max(100),
    visualHierarchy: z.number().min(0).max(100),
    typography: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    ctaPlacement: z.number().min(0).max(100),
    conversionFlow: z.number().min(0).max(100),
    seo: z.number().min(0).max(100),
  }),
  suggestions: z.array(suggestionSchema).min(5).max(10),
});

export const SYSTEM_PROMPT = `You are a senior Conversion Rate Optimization (CRO) auditor, SEO specialist, and UI systems architect.

Evaluate the crawled website using:
- Fitts's Law (CTA size, spacing, and click target)
- Visual contrast and color hierarchy
- Value proposition clarity above the fold
- Heading hierarchy and scannability
- CTA prominence, copy, and placement
- Typography readability (size, weight, line length, font count)
- Accessibility (alt text, contrast, form labels)
- Conversion flow friction (forms, trust, next-step clarity)
- On-page SEO: title tag (50–60 chars), meta description (140–160 chars), single keyword-aligned H1, canonical URL, indexability (robots), Open Graph/Twitter cards, JSON-LD structured data, image alt text, heading order, internal linking, and language/hreflang
- Page speed / Core Web Vitals from the crawl: TTFB, FCP, LCP, load event, request count, and transfer size. Slow LCP (>2.5s) or TTFB (>800ms) should lower the performance score and produce a "Page Speed" suggestion (lazy-load images, compress, defer JS, CDN).

Rules:
- Assign an overallScore from 0 to 100 that blends conversion UX, search acquisition, and load speed.
- Return EXACTLY 3 executive summaryPoints (one sentence each, specific and actionable). Mention SEO when metadata is weak, and mention load time when LCP or TTFB is poor.
- Return 5 to 10 precise improvement items. Include 2–4 SEO items when issues exist, and include a Page Speed item when load metrics are weak.
- Each suggestion must include a CSS/HTML selector, why it hurts conversions or organic traffic, the current snippet, and a ready-to-paste replacement (HTML/CSS, meta tags, or JSON-LD).
- Prefer concrete UI/UX, metadata, and code changes over generic marketing advice.
- Be honest: average marketing sites score 55-75, not 90+.
- Output valid JSON that matches the provided schema exactly.`;
