import { clampScore } from "@/lib/utils";
import type { LlmAuditResult, ScrapedPage, Suggestion } from "@/types/audit";

function relativeLuminance(rgb: string): number | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  const [r, g, b] = match.slice(1, 4).map((n) => {
    const c = Number(n) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  if (l1 === null || l2 === null) return null;
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

export function heuristicAudit(page: ScrapedPage): LlmAuditResult {
  const h1s = page.headings.filter((h) => h.tag === "h1");
  const missingAlt = page.images.filter((img) => !img.alt).length;
  const primaryCta = page.ctas[0];
  const avgCtaArea =
    page.ctas.reduce((sum, cta) => sum + cta.styles.width * cta.styles.height, 0) /
    Math.max(page.ctas.length, 1);

  let visualHierarchy = 62;
  if (h1s.length === 1) visualHierarchy += 14;
  else if (h1s.length === 0) visualHierarchy -= 22;
  else visualHierarchy -= 10;
  if (page.headings.length >= 3) visualHierarchy += 8;

  let typography = 70;
  if (page.fonts.length > 4) typography -= 16;
  else if (page.fonts.length <= 2) typography += 8;
  const h1Size = Number.parseInt(h1s[0]?.fontSize ?? "0", 10);
  if (h1Size && h1Size < 28) typography -= 12;

  let accessibility = 72;
  if (missingAlt > 0) {
    accessibility -= Math.min(24, missingAlt * 4);
  }
  if (!page.meta.viewport) accessibility -= 8;
  if (primaryCta) {
    const ratio = contrastRatio(
      primaryCta.styles.color,
      primaryCta.styles.backgroundColor,
    );
    if (ratio !== null && ratio < 4.5) accessibility -= 14;
  }

  let ctaPlacement = 58;
  if (page.ctas.length === 0) ctaPlacement = 28;
  else {
    if (avgCtaArea >= 8_000) ctaPlacement += 12;
    if (primaryCta && primaryCta.bbox.y < 900) ctaPlacement += 10;
    if (page.ctas.length > 18) ctaPlacement -= 12;
  }

  let conversionFlow = 60;
  if (page.meta.description) conversionFlow += 6;
  if (page.forms.length > 0) conversionFlow += 8;
  if (page.wordCount < 40) conversionFlow -= 16;
  if (h1s[0]?.text && /learn more|welcome|home/i.test(h1s[0].text)) {
    conversionFlow -= 10;
  }

  const { ttfbMs, lcpMs, loadMs, requestCount, transferBytes, imageBytes } =
    page.timing;

  let performance = 86;
  if (lcpMs != null) {
    if (lcpMs > 4000) performance -= 30;
    else if (lcpMs > 2500) performance -= 16;
    else if (lcpMs <= 1800) performance += 6;
  }
  if (ttfbMs != null) {
    if (ttfbMs > 1800) performance -= 16;
    else if (ttfbMs > 800) performance -= 8;
  }
  if (loadMs != null && loadMs > 5000) performance -= 10;
  if (requestCount > 90) performance -= 8;
  if (transferBytes > 3_000_000) performance -= 10;
  performance -= Math.min(8, Math.floor(page.images.length / 12) * 2);
  if (page.documentSize.height > 12_000) performance -= 4;
  performance = clampScore(performance);

  const titleLen = page.title.trim().length;
  const descLen = page.meta.description?.trim().length ?? 0;
  const robots = page.meta.robots?.toLowerCase() ?? "";
  const hasJsonLd = page.jsonLdRaw.length > 0;
  let seo = 58;
  if (titleLen >= 30 && titleLen <= 60) seo += 12;
  else if (titleLen === 0) seo -= 22;
  else seo -= 8;
  if (descLen >= 120 && descLen <= 165) seo += 12;
  else if (descLen === 0) seo -= 16;
  else if (descLen < 70 || descLen > 180) seo -= 8;
  if (h1s.length === 1) seo += 8;
  else seo -= 10;
  if (page.meta.canonical) seo += 6;
  else seo -= 8;
  if (robots.includes("noindex")) seo -= 24;
  if (page.meta.htmlLang) seo += 4;
  else seo -= 6;
  if (page.meta.ogTitle && page.meta.ogImage) seo += 6;
  else seo -= 6;
  if (hasJsonLd) seo += 8;
  else seo -= 8;
  if (missingAlt > 0) seo -= Math.min(10, missingAlt * 2);

  const metrics = {
    performance,
    visualHierarchy: clampScore(visualHierarchy),
    typography: clampScore(typography),
    accessibility: clampScore(accessibility),
    ctaPlacement: clampScore(ctaPlacement),
    conversionFlow: clampScore(conversionFlow),
    seo: clampScore(seo),
  };

  const overallScore = clampScore(
    metrics.visualHierarchy * 0.14 +
      metrics.ctaPlacement * 0.16 +
      metrics.conversionFlow * 0.16 +
      metrics.typography * 0.12 +
      metrics.accessibility * 0.12 +
      metrics.performance * 0.14 +
      metrics.seo * 0.16,
  );

  const suggestions: Suggestion[] = [];

  if (h1s.length !== 1) {
    suggestions.push({
      title: h1s.length === 0 ? "Add a single conversion-focused H1" : "Collapse multiple H1s",
      category: "Visual Hierarchy",
      impact: "HIGH",
      selector: "h1",
      reasoning:
        "Visitors scan for one dominant promise. Multiple or missing H1s dilute the value proposition and hurt both CRO and SEO.",
      currentCodeSnippet:
        h1s.length === 0
          ? "<header><!-- no h1 found --></header>"
          : h1s.map((h) => `<h1>${h.text}</h1>`).join("\n"),
      suggestedCodeSnippet: `<h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-950">
  Get [primary outcome] in [timeframe] — without [main objection]
</h1>`,
    });
  }

  if (!primaryCta || avgCtaArea < 6_000) {
    suggestions.push({
      title: "Increase primary CTA hit area",
      category: "CTA Placement",
      impact: "HIGH",
      selector: primaryCta?.selector ?? "a.cta, button",
      reasoning:
        "Fitts's Law: smaller, low-contrast buttons slow clicks. A prominent above-the-fold action is the fastest conversion lever.",
      currentCodeSnippet: primaryCta
        ? `<${primaryCta.tag} style="background:${primaryCta.styles.backgroundColor};color:${primaryCta.styles.color};font-size:${primaryCta.styles.fontSize}">${primaryCta.text}</${primaryCta.tag}>`
        : "<a>Learn more</a>",
      suggestedCodeSnippet: `<a href="#signup" className="inline-flex h-12 items-center rounded-full bg-emerald-500 px-6 text-base font-semibold text-zinc-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400">
  Start free audit
</a>`,
    });
  }

  if (missingAlt > 0) {
    suggestions.push({
      title: "Add descriptive alt text to product images",
      category: "Accessibility",
      impact: "MEDIUM",
      selector: "img:not([alt]), img[alt='']",
      reasoning: `${missingAlt} image(s) are missing alt text, which weakens accessibility, slows comprehension, and can suppress SEO-assisted acquisition.`,
      currentCodeSnippet: "<img src=\"/hero.jpg\" />",
      suggestedCodeSnippet: `<img
  src="/hero.jpg"
  alt="Dashboard showing a 78 CRO score with highlighted CTA fixes"
  className="w-full rounded-xl"
/>`,
    });
  }

  if (page.fonts.length > 3) {
    suggestions.push({
      title: "Reduce typeface variety",
      category: "Typography",
      impact: "MEDIUM",
      selector: "body",
      reasoning: `${page.fonts.length} font families compete for attention and make the brand feel inconsistent. Limit to one display and one body face.`,
      currentCodeSnippet: `font-family: ${page.fonts.join(", ")};`,
      suggestedCodeSnippet: `:root {
  --font-display: "Geist", ui-sans-serif, system-ui;
  --font-body: "Geist", ui-sans-serif, system-ui;
}
body { font-family: var(--font-body); }
h1, h2 { font-family: var(--font-display); }`,
    });
  }

  if (!page.meta.description) {
    suggestions.push({
      title: "Write a conversion-oriented meta description",
      category: "SEO Meta Description",
      impact: "HIGH",
      selector: 'head > meta[name="description"]',
      reasoning:
        "Search and social snippets are the first CTA. A missing meta description wastes qualified traffic before the page even loads.",
      currentCodeSnippet: "<head><!-- no meta description --></head>",
      suggestedCodeSnippet: `<meta
  name="description"
  content="Audit any landing page in 60 seconds. Get a CRO score, CTA fixes, and copy-paste UI improvements."
/>`,
    });
  } else if (descLen < 70 || descLen > 180) {
    suggestions.push({
      title: "Resize the meta description for SERP click-through",
      category: "SEO Meta Description",
      impact: "MEDIUM",
      selector: 'head > meta[name="description"]',
      reasoning: `Meta description is ${descLen} characters. Google typically displays ~140–160 characters; too short wastes snippet space and too long gets truncated.`,
      currentCodeSnippet: `<meta name="description" content="${page.meta.description}" />`,
      suggestedCodeSnippet: `<meta
  name="description"
  content="Get a 0–100 CRO score plus copy-paste UI, CTA, and SEO fixes in one crawl. Start free — no credit card."
/>`,
    });
  }

  if (titleLen === 0 || titleLen < 30 || titleLen > 65) {
    suggestions.push({
      title: "Rewrite the title tag for search and conversion",
      category: "SEO Title",
      impact: "HIGH",
      selector: "head > title",
      reasoning:
        titleLen === 0
          ? "The document has no title tag, so search results and browser tabs have nothing to rank or click."
          : `Title is ${titleLen} characters. Aim for 50–60 with the primary keyword near the front and a benefit in the second half.`,
      currentCodeSnippet: `<title>${page.title || ""}</title>`,
      suggestedCodeSnippet: `<title>AI CRO Audit | Score Any Landing Page in 60 Seconds</title>`,
    });
  }

  if (!page.meta.canonical) {
    suggestions.push({
      title: "Add a self-referencing canonical URL",
      category: "SEO Canonical",
      impact: "MEDIUM",
      selector: 'head > link[rel="canonical"]',
      reasoning:
        "Without a canonical, duplicate URLs (trailing slash, UTM, www) can split ranking signals and confuse which page should convert.",
      currentCodeSnippet: "<head><!-- no canonical --></head>",
      suggestedCodeSnippet: `<link rel="canonical" href="${page.finalUrl.split("?")[0]}" />`,
    });
  }

  if (robots.includes("noindex")) {
    suggestions.push({
      title: "Remove noindex unless this page should stay hidden",
      category: "SEO Indexability",
      impact: "HIGH",
      selector: 'head > meta[name="robots"]',
      reasoning:
        "robots contains noindex, so Google will not rank this URL. If this is a public landing or product page, that blocks organic acquisition entirely.",
      currentCodeSnippet: `<meta name="robots" content="${page.meta.robots}" />`,
      suggestedCodeSnippet: `<meta name="robots" content="index, follow" />`,
    });
  }

  if (!page.meta.htmlLang) {
    suggestions.push({
      title: "Set the document language",
      category: "SEO Language",
      impact: "LOW",
      selector: "html",
      reasoning:
        "A missing lang attribute hurts accessibility and can confuse search engines about the target market.",
      currentCodeSnippet: "<html>",
      suggestedCodeSnippet: `<html lang="en">`,
    });
  }

  if (!hasJsonLd) {
    suggestions.push({
      title: "Add JSON-LD structured data",
      category: "SEO Structured Data",
      impact: "MEDIUM",
      selector: 'script[type="application/ld+json"]',
      reasoning:
        "No JSON-LD was detected. Organization, Product, or SoftwareApplication schema helps rich results and clarifies the offer to search engines.",
      currentCodeSnippet: "<head><!-- no JSON-LD --></head>",
      suggestedCodeSnippet: `<script type="application/ld+json">
${JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: page.title || "Product",
    url: page.finalUrl,
    description: page.meta.description ?? page.headings[0]?.text ?? "",
  },
  null,
  2,
)}
</script>`,
    });
  }

  if (page.forms.length > 0) {
    suggestions.push({
      title: "Shorten the primary form and surface trust",
      category: "Conversion Flow",
      impact: "HIGH",
      selector: "form",
      reasoning:
        "Each extra field increases abandonment. Pair a short form with social proof immediately beside the submit button.",
      currentCodeSnippet: `<form method="${page.forms[0]?.method ?? "post"}">
  <!-- ${page.forms[0]?.fields ?? 0} fields detected -->
</form>`,
      suggestedCodeSnippet: `<form className="space-y-3">
  <input type="email" required placeholder="Work email" className="h-11 w-full rounded-lg border px-3" />
  <button className="h-11 w-full rounded-lg bg-zinc-950 font-semibold text-white">
    Get my CRO score
  </button>
  <p className="text-xs text-zinc-500">No credit card · Used by 2,400 growth teams</p>
</form>`,
    });
  }

  if (primaryCta) {
    const ratio = contrastRatio(
      primaryCta.styles.color,
      primaryCta.styles.backgroundColor,
    );
    if (ratio !== null && ratio < 4.5) {
      suggestions.push({
        title: "Raise CTA color contrast",
        category: "Font Contrast",
        impact: "HIGH",
        selector: primaryCta.selector,
        reasoning: `Primary CTA contrast is ~${ratio.toFixed(2)}:1, below WCAG AA 4.5:1. Low contrast hides the action users need to convert.`,
        currentCodeSnippet: `color: ${primaryCta.styles.color};
background-color: ${primaryCta.styles.backgroundColor};`,
        suggestedCodeSnippet: `.cta-primary {
  background-color: #10b981;
  color: #052e16;
  font-weight: 650;
}`,
      });
    }
  }

  if (lcpMs != null && lcpMs > 2500) {
    suggestions.push({
      title: "Improve Largest Contentful Paint",
      category: "Page Speed",
      impact: lcpMs > 4000 ? "HIGH" : "MEDIUM",
      selector: "img, video, [data-hero]",
      reasoning: `LCP was ${(lcpMs / 1000).toFixed(2)}s (good is under 2.5s). A slow hero delays the first meaningful paint, so visitors bounce before they see the CTA.`,
      currentCodeSnippet: `<img src="/hero.jpg" />`,
      suggestedCodeSnippet: `<img
  src="/hero.webp"
  alt="Product hero"
  width="1440"
  height="900"
  fetchPriority="high"
  decoding="async"
/>`,
    });
  }

  if (ttfbMs != null && ttfbMs > 800) {
    suggestions.push({
      title: "Reduce time to first byte",
      category: "Page Speed",
      impact: ttfbMs > 1800 ? "HIGH" : "MEDIUM",
      selector: "html",
      reasoning: `TTFB was ${ttfbMs}ms (good is under 800ms). Slow server/CDN response delays every conversion event that follows.`,
      currentCodeSnippet: "<!-- HTML served after a slow origin round-trip -->",
      suggestedCodeSnippet: `Cache-Control: public, max-age=60, stale-while-revalidate=600
# Prefer an edge CDN / SSR cache for the landing HTML
# Keep origin TTFB < 800ms`,
    });
  }

  if (transferBytes > 2_500_000 || requestCount > 80) {
    suggestions.push({
      title: "Cut page weight and request count",
      category: "Page Speed",
      impact: "MEDIUM",
      selector: "script[src], img, link[rel='stylesheet']",
      reasoning: `The crawl transferred ~${Math.round(transferBytes / 1024)}KB across ${requestCount} requests (${Math.round(imageBytes / 1024)}KB images). Extra weight slows LCP and mobile conversion.`,
      currentCodeSnippet: `<script src="/vendor.js"></script>
<img src="/hero.png" />`,
      suggestedCodeSnippet: `<script src="/vendor.js" defer></script>
<img src="/hero.webp" loading="lazy" width="800" height="500" alt="" />`,
    });
  }

  if (suggestions.length < 5) {
    suggestions.push({
      title: "Clarify the above-the-fold value proposition",
      category: "Layout Shift",
      impact: "HIGH",
      selector: "header, .hero, main > section:first-child",
      reasoning:
        "Users decide in seconds. Pair a specific outcome headline with a supporting subcopy and a single primary action.",
      currentCodeSnippet: `<h1>${h1s[0]?.text ?? page.title}</h1>`,
      suggestedCodeSnippet: `<section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center">
  <div>
    <p className="text-sm font-medium text-emerald-600">AI CRO audit</p>
    <h1 className="mt-2 text-5xl font-semibold">Find the exact UI changes that lift conversions</h1>
    <p className="mt-4 text-lg text-zinc-600">Crawl, score, and ship copy-paste fixes in one pass.</p>
  </div>
  <img src="/audit-preview.jpg" alt="CRO report preview" />
</section>`,
    });
  }

  if (suggestions.length < 5) {
    suggestions.push({
      title: "Add sticky secondary proof near the CTA",
      category: "Button Hierarchy",
      impact: "LOW",
      selector: "header, .hero",
      reasoning:
        "Trust badges and quantified outcomes next to the button reduce hesitation without competing with the primary action.",
      currentCodeSnippet: `<button>${primaryCta?.text ?? "Get started"}</button>`,
      suggestedCodeSnippet: `<div className="flex items-center gap-3">
  <button className="h-12 rounded-full bg-emerald-500 px-6 font-semibold">Start free</button>
  <p className="text-sm text-zinc-500">Avg. +18% demo requests after 2 sprints</p>
</div>`,
    });
  }

  const summaryPoints: [string, string, string] = [
    h1s.length === 1
      ? `The page has a primary heading (“${h1s[0].text.slice(0, 72)}”) but the surrounding hierarchy and CTA still leak attention.`
      : "Heading structure is unclear — visitors do not get a single, dominant value proposition above the fold.",
    page.ctas.length === 0
      ? "No obvious call-to-action was detected, which stalls the conversion path immediately."
      : `Interactive density is ${page.ctas.length} elements; tighten hierarchy so one action owns the fold.`
    ,
    missingAlt > 0 || !page.meta.description || titleLen < 30
      ? "SEO metadata is incomplete (title, description, or image alts), which quietly taxes both organic traffic and inbound conversion."
      : "Typography, contrast, and form friction are the highest-leverage remaining CRO wins.",
  ];

  return {
    overallScore,
    summaryPoints,
    metrics,
    suggestions: suggestions.slice(0, 10),
  };
}
