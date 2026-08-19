import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { heuristicAudit } from "@/lib/crawler/heuristics";
import { classifyLlmError, type ClassifiedLlmError } from "@/lib/crawler/llm-error";
import { llmAuditSchema, SYSTEM_PROMPT } from "@/lib/crawler/schema";
import { serializeScrapeForLlm } from "@/lib/crawler/scraper";
import { clampScore } from "@/lib/utils";
import type { LlmAuditResult, ScrapedPage } from "@/types/audit";

type LlmKeys = {
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
};

function normalizeResult(raw: unknown, fallback: LlmAuditResult): LlmAuditResult {
  const parsed = llmAuditSchema.safeParse(raw);
  if (!parsed.success) {
    return fallback;
  }

  return {
    ...parsed.data,
    overallScore: clampScore(parsed.data.overallScore),
    metrics: {
      performance: clampScore(parsed.data.metrics.performance),
      visualHierarchy: clampScore(parsed.data.metrics.visualHierarchy),
      typography: clampScore(parsed.data.metrics.typography),
      accessibility: clampScore(parsed.data.metrics.accessibility),
      ctaPlacement: clampScore(parsed.data.metrics.ctaPlacement),
      conversionFlow: clampScore(parsed.data.metrics.conversionFlow),
      seo: clampScore(parsed.data.metrics.seo),
    },
  };
}

async function analyzeWithOpenAI(
  scrape: ScrapedPage,
  apiKey: string,
): Promise<unknown> {
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.parse({
    model,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Audit this crawled page for CRO, SEO, and page-speed opportunities.\n\n${serializeScrapeForLlm(scrape)}`,
      },
    ],
    response_format: zodResponseFormat(llmAuditSchema, "cro_audit"),
  });

  return completion.choices[0]?.message.parsed;
}

async function analyzeWithAnthropic(
  scrape: ScrapedPage,
  apiKey: string,
): Promise<unknown> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const message = await client.messages.create({
    model,
    max_tokens: 4000,
    temperature: 0.3,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Audit this crawled page for CRO, SEO, and page-speed opportunities. Return ONLY JSON matching the schema.\n\n${serializeScrapeForLlm(scrape)}\n\nJSON schema keys: overallScore, summaryPoints[3], metrics{performance,visualHierarchy,typography,accessibility,ctaPlacement,conversionFlow,seo}, suggestions[{title,category,impact,selector,reasoning,currentCodeSnippet,suggestedCodeSnippet}]`,
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Anthropic did not return JSON.");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function analyzeCRO(
  scrape: ScrapedPage,
  keys: LlmKeys,
): Promise<{
  result: LlmAuditResult;
  engine: "openai" | "anthropic" | "heuristic";
  issues: ClassifiedLlmError[];
  okProviders: Array<{ provider: "openai" | "anthropic"; source: "user" | "env" }>;
}> {
  const fallback = heuristicAudit(scrape);
  const issues: ClassifiedLlmError[] = [];
  const okProviders: Array<{ provider: "openai" | "anthropic"; source: "user" | "env" }> = [];

  const openaiSource: "user" | "env" | null = keys.openaiApiKey
    ? "user"
    : process.env.OPENAI_API_KEY
      ? "env"
      : null;
  const openaiKey = keys.openaiApiKey || process.env.OPENAI_API_KEY;
  const anthropicSource: "user" | "env" | null = keys.anthropicApiKey
    ? "user"
    : process.env.ANTHROPIC_API_KEY
      ? "env"
      : null;
  const anthropicKey = keys.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

  if (openaiKey && openaiSource) {
    try {
      const raw = await analyzeWithOpenAI(scrape, openaiKey);
      okProviders.push({ provider: "openai", source: openaiSource });
      return { result: normalizeResult(raw, fallback), engine: "openai", issues, okProviders };
    } catch (error) {
      console.error("OpenAI CRO analysis failed", error);
      issues.push(classifyLlmError(error, "openai", openaiSource));
    }
  }

  if (anthropicKey && anthropicSource) {
    try {
      const raw = await analyzeWithAnthropic(scrape, anthropicKey);
      okProviders.push({ provider: "anthropic", source: anthropicSource });
      return { result: normalizeResult(raw, fallback), engine: "anthropic", issues, okProviders };
    } catch (error) {
      console.error("Anthropic CRO analysis failed", error);
      issues.push(classifyLlmError(error, "anthropic", anthropicSource));
    }
  }

  return { result: fallback, engine: "heuristic", issues, okProviders };
}
