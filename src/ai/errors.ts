/**
 * Specialized error classes for OpenAI API interactions.
 * Security rule: Never include full API keys, tokens, or raw authorization headers in error messages.
 */

export class OpenAICopilotError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode?: number) {
    super(message);
    this.name = "OpenAICopilotError";
  }
}

export class MissingApiKeyError extends OpenAICopilotError {
  constructor() {
    super("OpenAI API key is missing. Please configure your key in Options or the popup.", "MISSING_API_KEY");
  }
}

export class InvalidApiKeyError extends OpenAICopilotError {
  constructor(details?: string) {
    super(
      `Invalid OpenAI API key. Check that your key is active and formatted correctly. ${details ? `(${details})` : ""}`.trim(),
      "INVALID_API_KEY",
      401
    );
  }
}

export class QuotaOrBillingError extends OpenAICopilotError {
  constructor(details?: string) {
    super(
      `OpenAI billing limit reached or insufficient credits. Please check your OpenAI account billing status. ${details ? `(${details})` : ""}`.trim(),
      "QUOTA_OR_BILLING_ERROR",
      429
    );
  }
}

export class RateLimitError extends OpenAICopilotError {
  constructor(retryAfterSeconds?: number) {
    const hint = retryAfterSeconds ? ` Retry after ${retryAfterSeconds} seconds.` : " Please wait a moment before trying again.";
    super(`OpenAI rate limit exceeded.${hint}`, "RATE_LIMIT_ERROR", 429);
  }
}

export class TimeoutError extends OpenAICopilotError {
  constructor(ms: number) {
    super(`Request to OpenAI timed out after ${Math.round(ms / 1000)}s. Please try again.`, "TIMEOUT_ERROR");
  }
}

export class NetworkError extends OpenAICopilotError {
  constructor(details?: string) {
    super(
      `Network connection failed when reaching OpenAI. Check your internet connection. ${details ? `(${details})` : ""}`.trim(),
      "NETWORK_ERROR"
    );
  }
}

export class OpenAIServerError extends OpenAICopilotError {
  constructor(statusCode: number, details?: string) {
    super(
      `OpenAI server returned error (${statusCode}). OpenAI may be experiencing downtime. ${details ? `(${details})` : ""}`.trim(),
      "SERVER_ERROR",
      statusCode
    );
  }
}

export class EmptyResponseError extends OpenAICopilotError {
  constructor(providerName = "The AI provider") {
    super(
      `${providerName} returned an empty response. Please retry, or try switching to llama-3.3-70b-versatile in settings.`,
      "EMPTY_RESPONSE"
    );
  }
}

export class UnexpectedPayloadError extends OpenAICopilotError {
  constructor(message: string) {
    super(`Unexpected response from OpenAI: ${message}`, "UNEXPECTED_PAYLOAD");
  }
}
