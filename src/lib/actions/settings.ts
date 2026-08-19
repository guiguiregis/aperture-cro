"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { auth, signOut } from "@/lib/auth";
import { classifyLlmError } from "@/lib/crawler/llm-error";
import { prisma } from "@/lib/db";
import { getLlmKeyHealth, setLlmKeyHealth } from "@/lib/llm-key-health";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }
  return session.user.id;
}

export async function getSettingsProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      openaiApiKey: true,
      anthropicApiKey: true,
      createdAt: true,
      _count: { select: { websites: true } },
    },
  });
  if (!user) return null;
  const health = await getLlmKeyHealth(user.id);
  return { ...user, ...health };
}

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  const name = z.string().min(2).max(80).safeParse(formData.get("name"));
  if (!name.success) {
    return { error: "Name must be at least 2 characters." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: name.data },
  });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function saveApiKeys(formData: FormData) {
  const userId = await requireUserId();
  const openaiApiKey = String(formData.get("openaiApiKey") ?? "").trim() || null;
  const anthropicApiKey =
    String(formData.get("anthropicApiKey") ?? "").trim() || null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      openaiApiKey,
      anthropicApiKey,
    },
  });
  await setLlmKeyHealth(userId, {
    openaiKeyStatus: null,
    anthropicKeyStatus: null,
    llmStatusMessage: null,
    llmStatusUpdatedAt: null,
  });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function checkLlmKeys() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { openaiApiKey: true, anthropicApiKey: true },
  });
  if (!user) return { error: "Account not found." };
  if (!user.openaiApiKey && !user.anthropicApiKey) {
    return { error: "Save an API key first." };
  }

  let openaiKeyStatus: string | null = user.openaiApiKey ? "ok" : null;
  let anthropicKeyStatus: string | null = user.anthropicApiKey ? "ok" : null;
  const messages: string[] = [];

  if (user.openaiApiKey) {
    try {
      const client = new OpenAI({ apiKey: user.openaiApiKey });
      await client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });
    } catch (error) {
      const classified = classifyLlmError(error, "openai", "user");
      openaiKeyStatus = classified.kind;
      messages.push(classified.message);
    }
  }

  if (user.anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: user.anthropicApiKey });
      await client.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
    } catch (error) {
      const classified = classifyLlmError(error, "anthropic", "user");
      anthropicKeyStatus = classified.kind;
      messages.push(classified.message);
    }
  }

  const llmStatusMessage = messages[0] ?? null;
  await setLlmKeyHealth(userId, {
    openaiKeyStatus,
    anthropicKeyStatus,
    llmStatusMessage,
    llmStatusUpdatedAt: new Date(),
  });
  revalidatePath("/dashboard/settings");
  return {
    ok: true as const,
    openaiKeyStatus,
    anthropicKeyStatus,
    message: llmStatusMessage,
  };
}

export async function deleteAllSites() {
  const userId = await requireUserId();
  await prisma.website.deleteMany({ where: { userId } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteAccount() {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/" });
}
