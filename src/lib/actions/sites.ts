"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runAuditEngine } from "@/lib/crawler/audit-engine";
import { prisma } from "@/lib/db";
import { domainName, normalizeUrl } from "@/lib/utils";
import type { AuditMetrics, Suggestion, WebsiteStatus } from "@/types/audit";

const urlSchema = z.string().min(4).max(500);

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }
  return session.user.id;
}

export type WebsiteCardData = {
  id: string;
  url: string;
  name: string;
  thumbnailUrl: string | null;
  lastAnalyzedAt: Date | null;
  status: WebsiteStatus;
  statusMessage: string | null;
  latest: {
    overallScore: number;
    scoreCategory: "POOR" | "MEDIUM" | "GOOD";
    summary: string;
    suggestions: Suggestion[];
  } | null;
};

export async function getDashboardWebsites(): Promise<WebsiteCardData[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  const userId = session.user.id;
  const websites = await prisma.website.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return websites.map((site) => ({
    id: site.id,
    url: site.url,
    name: site.name,
    thumbnailUrl: site.thumbnailUrl,
    lastAnalyzedAt: site.lastAnalyzedAt,
    status: site.status,
    statusMessage: site.statusMessage,
    latest: site.audits[0]
      ? {
          overallScore: site.audits[0].overallScore,
          scoreCategory: site.audits[0].scoreCategory,
          summary: site.audits[0].summary,
          suggestions: site.audits[0].suggestions as Suggestion[],
        }
      : null,
  }));
}

export async function createWebsiteAndAnalyze(rawUrl: string) {
  const userId = await requireUserId();
  const parsed = urlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { error: "Enter a valid website URL." };
  }

  let url: string;
  try {
    url = normalizeUrl(parsed.data);
  } catch {
    return { error: "Enter a valid HTTP or HTTPS URL." };
  }

  const existing = await prisma.website.findFirst({
    where: { userId, url },
  });

  if (existing) {
    await prisma.website.update({
      where: { id: existing.id },
      data: { status: "SCRAPING", statusMessage: "Scraping DOM..." },
    });
    after(async () => {
      try {
        await runAuditEngine(existing.id);
      } catch (error) {
        console.error("Audit engine failed", error);
      }
    });
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/sites/${existing.id}`);
    return { id: existing.id };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, _count: { select: { websites: true } } },
  });

  if (user?.plan === "FREE" && (user._count.websites ?? 0) >= 5) {
    return {
      error: "Free plans are limited to 5 sites. Upgrade in Settings to add more.",
    };
  }

  const website = await prisma.website.create({
    data: {
      userId,
      url,
      name: domainName(url),
      status: "SCRAPING",
      statusMessage: "Scraping DOM...",
    },
  });

  after(async () => {
    try {
      await runAuditEngine(website.id);
    } catch (error) {
      console.error("Audit engine failed", error);
    }
  });

  revalidatePath("/dashboard");
  return { id: website.id };
}

export async function reanalyzeWebsite(websiteId: string) {
  const userId = await requireUserId();
  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
  });

  if (!website) {
    return { error: "Website not found." };
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { status: "SCRAPING", statusMessage: "Scraping DOM..." },
  });

  after(async () => {
    try {
      await runAuditEngine(websiteId);
    } catch (error) {
      console.error("Re-audit failed", error);
    }
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/sites/${websiteId}`);
  return { ok: true };
}

export async function deleteWebsite(websiteId: string) {
  const userId = await requireUserId();
  await prisma.website.deleteMany({
    where: { id: websiteId, userId },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

export type SiteReportData = {
  id: string;
  url: string;
  name: string;
  thumbnailUrl: string | null;
  lastAnalyzedAt: Date | null;
  status: WebsiteStatus;
  statusMessage: string | null;
  report: {
    id: string;
    overallScore: number;
    scoreCategory: "POOR" | "MEDIUM" | "GOOD";
    summary: string;
    screenshotUrl: string | null;
    metrics: AuditMetrics;
    suggestions: Suggestion[];
    createdAt: Date;
  } | null;
};

export async function getSiteReport(websiteId: string): Promise<SiteReportData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;
  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
    include: {
      audits: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!website) return null;

  const latest = website.audits[0];

  return {
    id: website.id,
    url: website.url,
    name: website.name,
    thumbnailUrl: website.thumbnailUrl,
    lastAnalyzedAt: website.lastAnalyzedAt,
    status: website.status,
    statusMessage: website.statusMessage,
    report: latest
      ? {
          id: latest.id,
          overallScore: latest.overallScore,
          scoreCategory: latest.scoreCategory,
          summary: latest.summary,
          screenshotUrl: latest.screenshotUrl,
          metrics: latest.metrics as AuditMetrics,
          suggestions: latest.suggestions as Suggestion[],
          createdAt: latest.createdAt,
        }
      : null,
  };
}
