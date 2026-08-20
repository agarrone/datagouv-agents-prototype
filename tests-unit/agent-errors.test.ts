import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import { normalizeAgentError } from "~~/server/agents/errors";

describe("agent provider error normalization", () => {
  it("keeps retry and request information for a 429", () => {
    const error = new APICallError({
      message: "Too many requests",
      url: "https://albert.api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: {
        "retry-after": "18",
        "x-request-id": "req_429",
      },
      responseBody: JSON.stringify({ error: "tokens_per_minute exceeded" }),
    });
    const normalized = normalizeAgentError(error);

    expect(normalized.code).toBe("ai_rate_limit");
    expect(normalized.source).toBe("albert");
    expect(normalized.retryAfterSeconds).toBe(18);
    expect(normalized.requestId).toBe("req_429");
    expect(normalized.retryable).toBe(true);
  });

  it("recognizes an exhausted account quota", () => {
    const error = new APICallError({
      message: "insufficient_quota",
      url: "https://albert.api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 429,
      responseBody: JSON.stringify({ error: "monthly budget exceeded" }),
    });
    expect(normalizeAgentError(error).code).toBe("ai_account_quota");
  });

  it("attributes authentication and context errors correctly", () => {
    const auth = new APICallError({
      message: "Unauthorized",
      url: "https://albert.api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 401,
    });
    const context = new APICallError({
      message: "Maximum context length exceeded",
      url: "https://albert.api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 400,
    });
    expect(normalizeAgentError(auth).code).toBe("ai_authentication");
    expect(normalizeAgentError(context).code).toBe("ai_context_limit");
  });
});
