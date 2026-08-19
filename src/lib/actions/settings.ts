"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
  return prisma.user.findUnique({
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
    data: { openaiApiKey, anthropicApiKey },
  });
  revalidatePath("/dashboard/settings");
  return { ok: true };
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
