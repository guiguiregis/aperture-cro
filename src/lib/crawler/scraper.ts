import puppeteer, { type Browser } from "puppeteer";
import type { CtaSnapshot, HeadingSnapshot, ScrapedPage } from "@/types/audit";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ApertureCRO/1.0";

type BrowserExtract = Omit<ScrapedPage, "screenshot" | "url" | "finalUrl">;

export async function scrapeWebsite(url: string): Promise<ScrapedPage> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setDefaultNavigationTimeout(45_000);

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
        .slice(0, 40)
        .map((img) => ({
          src: img.currentSrc || img.src,
          alt: img.alt || null,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        }));

      const forms = Array.from(document.querySelectorAll("form"))
        .slice(0, 12)
        .map((form) => ({
          action: form.getAttribute("action"),
          method: (form.getAttribute("method") ?? "get").toLowerCase(),
          fields: form.querySelectorAll("input, select, textarea").length,
        }));

      const bodyText = (document.body.innerText ?? "").replace(/\s+/g, " ").trim();

      return {
        title: document.title || "",
        meta: {
          description: metaContent("description"),
          ogTitle: metaContent("og:title", "property"),
          ogDescription: metaContent("og:description", "property"),
          viewport: metaContent("viewport"),
        },
        headings,
        ctas,
        fonts: Array.from(fontSet).slice(0, 12),
        colors: Array.from(colorSet).slice(0, 16),
        images,
        forms,
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

    return {
      url,
      finalUrl: page.url(),
      ...extracted,
      screenshot: Buffer.from(screenshot),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
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

  return [
    `URL: ${page.finalUrl}`,
    `Title: ${page.title}`,
    `Meta description: ${page.meta.description ?? "(missing)"}`,
    `OG title: ${page.meta.ogTitle ?? "(missing)"}`,
    `Viewport meta: ${page.meta.viewport ?? "(missing)"}`,
    `Document size: ${page.documentSize.width}x${page.documentSize.height}`,
    `Word count: ${page.wordCount}`,
    `Fonts: ${page.fonts.join(", ") || "(unknown)"}`,
    `Colors: ${page.colors.join(" | ") || "(unknown)"}`,
    `Images: ${page.images.length} (${missingAlt} missing alt)`,
    `Forms: ${page.forms.length}`,
    "",
    "HEADING HIERARCHY:",
    headingTree || "(none found)",
    "",
    "CTA / INTERACTIVE ELEMENTS:",
    ctaSummary || "(none found)",
    "",
    "VISIBLE COPY PREVIEW:",
    page.bodyTextPreview,
  ].join("\n");
}
