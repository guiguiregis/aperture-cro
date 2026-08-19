import { prisma } from "@/lib/db";

export type LlmKeyHealth = {
  openaiKeyStatus: string | null;
  anthropicKeyStatus: string | null;
  llmStatusMessage: string | null;
  llmStatusUpdatedAt: Date | null;
};

export async function getLlmKeyHealth(userId: string): Promise<LlmKeyHealth> {
  const rows = await prisma.$queryRaw<
    Array<{
      openaiKeyStatus: string | null;
      anthropicKeyStatus: string | null;
      llmStatusMessage: string | null;
      llmStatusUpdatedAt: Date | string | null;
    }>
  >`SELECT openaiKeyStatus, anthropicKeyStatus, llmStatusMessage, llmStatusUpdatedAt FROM User WHERE id = ${userId}`;

  const row = rows[0];
  if (!row) {
    return {
      openaiKeyStatus: null,
      anthropicKeyStatus: null,
      llmStatusMessage: null,
      llmStatusUpdatedAt: null,
    };
  }

  return {
    openaiKeyStatus: row.openaiKeyStatus,
    anthropicKeyStatus: row.anthropicKeyStatus,
    llmStatusMessage: row.llmStatusMessage,
    llmStatusUpdatedAt: row.llmStatusUpdatedAt ? new Date(row.llmStatusUpdatedAt) : null,
  };
}

export async function setLlmKeyHealth(userId: string, health: LlmKeyHealth): Promise<void> {
  await prisma.$executeRaw`
    UPDATE User
    SET
      openaiKeyStatus = ${health.openaiKeyStatus},
      anthropicKeyStatus = ${health.anthropicKeyStatus},
      llmStatusMessage = ${health.llmStatusMessage},
      llmStatusUpdatedAt = ${health.llmStatusUpdatedAt?.toISOString() ?? null}
    WHERE id = ${userId}
  `;
}
