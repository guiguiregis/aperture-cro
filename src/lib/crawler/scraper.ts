import { existsSync } from "node:fs";
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer";
import type { CtaSnapshot, HeadingSnapshot, LoadTiming, ScrapedPage } from "@/types/audit";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ApertureCRO/1.0";

const LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

const LOCAL_CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function localChromePath() {
  return LOCAL_CHROME_CANDIDATES.find((path) => path && existsSync(path));
}

async function launchBrowser(): Promise<Browser> {
  const options: LaunchOptions = { headless: true, args: LAUNCH_ARGS };

  try {
    return await puppeteer.launch(options);
  } catch (bundledError) {
    const executablePath = localChromePath();
    if (executablePath) {
      return await puppeteer.launch({ ...options, executablePath });
    }
    try {
      return await puppeteer.launch({ ...options, channel: "chrome" });
    } catch {
      throw bundledError;
    }
  }
}

type BrowserExtract = Omit<ScrapedPage, "screenshot" | "url" | "finalUrl" | "timing">;

export async function scrapeWebsite(url: string): Promise<ScrapedPage> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setDefaultNavigationTimeout(45_000);

    await page.evaluateOnNewDocument(() => {
      const store = window as Window & { __apertureLcp?: number };
      store.__apertureLcp = undefined;
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) store.__apertureLcp = last.startTime;
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        // LCP observer is unavailable in some environments.
      }
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 45_000,
    });

    if (!response) {
      throw new Error("The target URL did not return a response.");
    }

    const status = response.status();
    if (status >= 400) {
      throw new Error(`The target URL responded with HTTP ${status}.`);
    }

    await page.waitForSelector("body", { timeout: 10_000 }).catch(() => undefined);

    const extracted = await page.evaluate((): BrowserExtract => {
      const css = (el: Element, prop: string) =>
        window.getComputedStyle(el).getPropertyValue(prop);

      const bbox = (el: Element) => {
        const rect = el.getBoundingClientRect();
        return {
          x: Math.round(rect.left + window.scrollX),
          y: Math.round(rect.top + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      const selectorFor = (el: Element): string => {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const classes = Array.from(el.classList)
          .slice(0, 3)
          .map((c) => `.${CSS.escape(c)}`)
          .join("");
        const nth = el.parentElement
          ? Array.from(el.parentElement.children).indexOf(el) + 1
          : 1;
        return `${el.tagName.toLowerCase()}${classes}:nth-child(${nth})`;
      };

      const metaContent = (name: string, attr: "name" | "property" = "name") =>
        document
          .querySelector(`meta[${attr}="${name}"]`)
          ?.getAttribute("content") ?? null;

      const headings = Array.from(
        document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      )
        .slice(0, 24)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 180),
          fontSize: css(el, "font-size"),
          fontWeight: css(el, "font-weight"),
          color: css(el, "color"),
          bbox: bbox(el),
        }));

      const ctaSelector =
        'a, button, input[type="submit"], input[type="button"], [role="button"]';
      const ctas = Array.from(document.querySelectorAll(ctaSelector))
        .filter((el) => {
          const text = (el.textContent ?? (el as HTMLInputElement).value ?? "")
            .trim();
          const rect = el.getBoundingClientRect();
          const visible = rect.width > 20 && rect.height > 12;
          return text.length > 0 && text.length < 80 && visible;
        })
        .slice(0, 30)
        .map((el) => {
          const styles = window.getComputedStyle(el);
          const box = bbox(el);
          return {
            selector: selectorFor(el),
            text: (
              el.textContent ??
              (el as HTMLInputElement).value ??
              ""
            )
              .trim()
              .slice(0, 80),
            tag: el.tagName.toLowerCase(),
            href: (el as HTMLAnchorElement).href || undefined,
            styles: {
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              fontSize: styles.fontSize,
              fontFamily: styles.fontFamily,
              fontWeight: styles.fontWeight,
              padding: styles.padding,
              borderRadius: styles.borderRadius,
              width: box.width,
              height: box.height,
            },
            bbox: box,
          };
        });

      const fontSet = new Set<string>();
      const colorSet = new Set<string>();
      const sampleEls = Array.from(
        document.querySelectorAll("body, h1, h2, h3, p, a, button, nav"),
      ).slice(0, 80);

      for (const el of sampleEls) {
        const family = css(el, "font-family").split(",")[0]?.replace(/['"]/g, "").trim();
        if (family) fontSet.add(family);
        const color = css(el, "color");
        const bg = css(el, "background-color");
        if (color) colorSet.add(color);
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          colorSet.add(bg);
        }
      }

      const images = Array.from(document.querySelectorAll("img"))
        .map((img) => {
          const rect = img.getBoundingClientRect();
          return {
            src: img.currentSrc || img.src,
            alt: img.alt || null,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            displayWidth: Math.round(rect.width),
            displayHeight: Math.round(rect.height),
            loading: img.getAttribute("loading"),
            fetchPriority:
              img.getAttribute("fetchpriority") ||
              img.getAttribute("fetchPriority"),
            inViewport:
              rect.bottom > 0 &&
              rect.top < window.innerHeight &&
              rect.width > 8 &&
              rect.height > 8,
            transferBytes: null as number | null,
          };
        })
        .filter((image) => Boolean(image.src) && !image.src.startsWith("data:"))
        .slice(0, 48);

      const forms = Array.from(document.querySelectorAll("form"))
        .slice(0, 12)
        .map((form) => ({
          action: form.getAttribute("action"),
          method: (form.getAttribute("method") ?? "get").toLowerCase(),
          fields: form.querySelectorAll("input, select, textarea").length,
        }));

      const origin = window.location.origin;
      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((anchor) => {
          const el = anchor as HTMLAnchorElement;
          let parsed: URL;
          try {
            parsed = new URL(el.href);
          } catch {
            return null;
          }
          if (parsed.origin !== origin) return null;
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
          }
          parsed.hash = "";
          const label = (
            el.innerText ||
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
          const inNav = Boolean(el.closest("nav, header, [role='navigation']"));
          const inFooter = Boolean(el.closest("footer"));
          return {
            href: parsed.toString(),
            label,
            source: inNav ? "nav" : inFooter ? "footer" : "body",
          };
        })
        .filter((item): item is { href: string; label: string; source: "nav" | "footer" | "body" } =>
          Boolean(item),
        )
        .slice(0, 200);

      const jsonLdRaw = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      )
        .map((node) => node.textContent ?? "")
        .filter((text) => text.trim().length > 2)
        .slice(0, 12);

      const bodyText = (document.body.innerText ?? "").replace(/\s+/g, " ").trim();

      return {
        title: document.title || "",
        meta: {
          description: metaContent("description"),
          ogTitle: metaContent("og:title", "property"),
          ogDescription: metaContent("og:description", "property"),
          viewport: metaContent("viewport"),
          ogType: metaContent("og:type", "property"),
          ogImage: metaContent("og:image", "property"),
          canonical:
            document.querySelector('link[rel="canonical"]')?.getAttribute("href") ??
            null,
          robots: metaContent("robots"),
          htmlLang: document.documentElement.lang || null,
          twitterCard: metaContent("twitter:card"),
          twitterTitle: metaContent("twitter:title"),
          hreflang: Array.from(
            document.querySelectorAll('link[rel="alternate"][hreflang]'),
          )
            .map((node) => {
              const lang = node.getAttribute("hreflang") ?? "";
              const href = node.getAttribute("href") ?? "";
              return [lang, href].filter(Boolean).join(" ");
            })
            .filter(Boolean)
            .slice(0, 12),
        },
        headings,
        ctas,
        fonts: Array.from(fontSet).slice(0, 12),
        colors: Array.from(colorSet).slice(0, 16),
        images,
        forms,
        links,
        jsonLdRaw,
        wordCount: bodyText.split(" ").filter(Boolean).length,
        bodyTextPreview: bodyText.slice(0, 1800),
        documentSize: {
          width: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ),
          height: Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
          ),
        },
      };
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 72,
    });

    const { resources, ...timing } = await page.evaluate((): LoadTiming & {
      resources: { url: string; bytes: number }[];
    } => {
      const round = (value: number) => Math.max(0, Math.round(value));
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      const paints = performance.getEntriesByType("paint");
      const fcp = paints.find((entry) => entry.name === "first-contentful-paint")?.startTime;
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      const observedLcp = (window as Window & { __apertureLcp?: number }).__apertureLcp;
      const lcp =
        observedLcp ??
        (lcpEntries.length ? lcpEntries[lcpEntries.length - 1]?.startTime : undefined);

      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      let transferBytes = 0;
      let imageBytes = 0;
      let jsBytes = 0;
      let cssBytes = 0;
      for (const resource of resources) {
        const size = resource.transferSize || resource.encodedBodySize || 0;
        transferBytes += size;
        const type = resource.initiatorType;
        if (type === "img" || /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(resource.name)) {
          imageBytes += size;
        } else if (type === "script" || resource.name.endsWith(".js")) {
          jsBytes += size;
        } else if (type === "css" || resource.name.endsWith(".css") || type === "link") {
          cssBytes += size;
        }
      }

      return {
        ttfbMs: nav ? round(nav.responseStart) : null,
        fcpMs: fcp != null ? round(fcp) : null,
        lcpMs: lcp != null ? round(lcp) : null,
        dclMs: nav ? round(nav.domContentLoadedEventEnd) : null,
        loadMs: nav ? round(nav.loadEventEnd) : null,
        requestCount: resources.length + 1,
        transferBytes,
        imageBytes,
        jsBytes,
        cssBytes,
        resources: resources.map((resource) => ({
          url: resource.name,
          bytes: resource.transferSize || resource.encodedBodySize || 0,
        })),
      };
    });

    const ctaHrefs = new Set(
      extracted.ctas
        .map((cta) => cta.href)
        .filter((href): href is string => Boolean(href)),
    );
    const links = extracted.links.map((link) =>
      ctaHrefs.has(link.href) && link.source === "body"
        ? { ...link, source: "cta" as const }
        : link,
    );

    const images = extracted.images.map((image) => ({
      ...image,
      transferBytes: matchResourceBytes(image.src, resources),
    }));

    return {
      url,
      finalUrl: page.url(),
      ...extracted,
      links,
      images,
      timing,
      screenshot: Buffer.from(screenshot),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function matchResourceBytes(
  src: string,
  resources: { url: string; bytes: number }[],
): number | null {
  const exact = resources.find((resource) => resource.url === src);
  if (exact) return exact.bytes || null;
  try {
    const { pathname } = new URL(src);
    const hit = resources.find((resource) => {
      try {
        return new URL(resource.url).pathname === pathname;
      } catch {
        return resource.url.includes(pathname);
      }
    });
    return hit?.bytes || null;
  } catch {
    return null;
  }
}

export function serializeScrapeForLlm(page: ScrapedPage): string {
  const headingTree = page.headings
    .map((h: HeadingSnapshot) => `${h.tag.toUpperCase()}: "${h.text}" (${h.fontSize}, ${h.color})`)
    .join("\n");

  const ctaSummary = page.ctas
    .slice(0, 18)
    .map((cta: CtaSnapshot) => {
      return `- [${cta.tag}] "${cta.text}" selector=${cta.selector} bg=${cta.styles.backgroundColor} color=${cta.styles.color} size=${cta.styles.width}x${cta.styles.height} font=${cta.styles.fontSize}/${cta.styles.fontWeight}`;
    })
    .join("\n");

  const missingAlt = page.images.filter((img) => !img.alt).length;
  const jsonLdTypes = page.jsonLdRaw
    .map((block) => {
      try {
        const parsed = JSON.parse(block) as { "@type"?: string | string[] };
        const type = parsed["@type"];
        return Array.isArray(type) ? type.join(", ") : type ?? "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return [
    `URL: ${page.finalUrl}`,
    `Title: ${page.title} (${page.title.length} chars)`,
    `Meta description: ${page.meta.description ? `${page.meta.description} (${page.meta.description.length} chars)` : "(missing)"}`,
    `Canonical: ${page.meta.canonical ?? "(missing)"}`,
    `Robots: ${page.meta.robots ?? "(not set)"}`,
    `HTML lang: ${page.meta.htmlLang ?? "(missing)"}`,
    `Hreflang: ${page.meta.hreflang.join(", ") || "(none)"}`,
    `OG title: ${page.meta.ogTitle ?? "(missing)"}`,
    `OG description: ${page.meta.ogDescription ?? "(missing)"}`,
    `OG type: ${page.meta.ogType ?? "(missing)"}`,
    `OG image: ${page.meta.ogImage ?? "(missing)"}`,
    `Twitter card: ${page.meta.twitterCard ?? "(missing)"}`,
    `JSON-LD types: ${jsonLdTypes.join(", ") || "(none)"}`,
    `Viewport meta: ${page.meta.viewport ?? "(missing)"}`,
    `Document size: ${page.documentSize.width}x${page.documentSize.height}`,
    `Word count: ${page.wordCount}`,
    `Fonts: ${page.fonts.join(", ") || "(unknown)"}`,
    `Colors: ${page.colors.join(" | ") || "(unknown)"}`,
    `Images: ${page.images.length} (${missingAlt} missing alt)`,
    `Forms: ${page.forms.length}`,
    "",
    "PAGE LOAD TIMING:",
    `TTFB: ${page.timing.ttfbMs ?? "n/a"} ms`,
    `FCP: ${page.timing.fcpMs ?? "n/a"} ms`,
    `LCP: ${page.timing.lcpMs ?? "n/a"} ms`,
    `DOMContentLoaded: ${page.timing.dclMs ?? "n/a"} ms`,
    `Load event: ${page.timing.loadMs ?? "n/a"} ms`,
    `Requests: ${page.timing.requestCount}`,
    `Transfer: ${Math.round(page.timing.transferBytes / 1024)} KB (images ${Math.round(page.timing.imageBytes / 1024)} KB, JS ${Math.round(page.timing.jsBytes / 1024)} KB, CSS ${Math.round(page.timing.cssBytes / 1024)} KB)`,
    "",
    "IMAGES:",
    page.images
      .slice(0, 16)
      .map((image) => {
        const kb =
          image.transferBytes != null
            ? `${Math.round(image.transferBytes / 1024)}KB`
            : "?KB";
        const alt = image.alt?.trim() ? `"${image.alt.trim().slice(0, 60)}"` : "MISSING ALT";
        return `- ${image.width}x${image.height} shown ${image.displayWidth}px ${kb} loading=${image.loading ?? "eager"} ${alt} ${image.src.slice(0, 90)}`;
      })
      .join("\n") || "(none found)",
    "",
    "HEADING HIERARCHY:",
    headingTree || "(none found)",
    "",
    "CTA / INTERACTIVE ELEMENTS:",
    ctaSummary || "(none found)",
    "",
    "SAME-SITE LINKS (sample):",
    page.links
      .slice(0, 25)
      .map((link) => `- [${link.source}] ${link.label || "(untitled)"} → ${link.href}`)
      .join("\n") || "(none found)",
    "",
    "VISIBLE COPY PREVIEW:",
    page.bodyTextPreview,
  ].join("\n");
}
