import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  parsed.hash = "";
  return parsed.toString();
}

export function domainName(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function scoreCategory(score: number): "POOR" | "MEDIUM" | "GOOD" {
  if (score >= 80) return "GOOD";
  if (score >= 50) return "MEDIUM";
  return "POOR";
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
