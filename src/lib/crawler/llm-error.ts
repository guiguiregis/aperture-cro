export type LlmProvider = "openai" | "anthropic";
export type LlmKeyStatus = "ok" | "no_credit" | "invalid" | "error";

export type ClassifiedLlmError = {
  kind: Exclude<LlmKeyStatus, "ok">;
  provider: LlmProvider;
  source: "user" | "env";
  message: string;
};

function blobFrom(error: unknown): { text: string; status?: number; code?: string } {
  const err = error as {
    status?: number;
    statusCode?: number;
    code?: string;
    type?: string;
    message?: string;
    error?: { type?: string; code?: string; message?: string };
  };

  const parts = [
    err?.message,
    err?.code,
    err?.type,
    err?.error?.type,
    err?.error?.code,
    err?.error?.message,
    error instanceof Error ? error.name : "",
  ];

  return {
    text: parts.filter(Boolean).join(" ").toLowerCase(),
    status: err?.status ?? err?.statusCode,
    code: err?.code ?? err?.error?.code,
  };
}

export function classifyLlmError(
  error: unknown,
  provider: LlmProvider,
  source: "user" | "env",
): ClassifiedLlmError {
  const { text, status, code } = blobFrom(error);
  const whose = source === "user" ? "Your" : "The server";
  const providerLabel = provider === "openai" ? "OpenAI" : "Anthropic";

  const noCredit =
    code === "insufficient_quota" ||
    text.includes("insufficient_quota") ||
    text.includes("insufficient_credit") ||
    text.includes("credit balance is too low") ||
    text.includes("exceeded your current quota") ||
    text.includes("quota exceeded") ||
    text.includes("billing_hard_limit") ||
    (text.includes("billing") && text.includes("limit"));

  if (noCredit) {
    return {
      kind: "no_credit",
      provider,
      source,
      message: `${whose} ${providerLabel} API key is out of credit. Add billing or replace the key in Settings.`,
    };
  }

  const invalid =
    status === 401 ||
    code === "invalid_api_key" ||
    text.includes("invalid_api_key") ||
    text.includes("incorrect api key") ||
    text.includes("invalid x-api-key") ||
    text.includes("authentication_error");

  if (invalid) {
    return {
      kind: "invalid",
      provider,
      source,
      message: `${whose} ${providerLabel} API key was rejected. Check the key in Settings.`,
    };
  }

  const rateLimit = status === 429 || text.includes("rate_limit") || text.includes("too many requests");
  if (rateLimit) {
    return {
      kind: "error",
      provider,
      source,
      message: `${providerLabel} rate-limited this request. Wait a moment and re-analyze.`,
    };
  }

  return {
    kind: "error",
    provider,
    source,
    message:
      error instanceof Error && error.message
        ? `${providerLabel} request failed: ${error.message}`
        : `${providerLabel} request failed.`,
  };
}
