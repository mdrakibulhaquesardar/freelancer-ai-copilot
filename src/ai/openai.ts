import {
  OpenAICopilotError,
  MissingApiKeyError,
  InvalidApiKeyError,
  QuotaOrBillingError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  OpenAIServerError,
  EmptyResponseError,
  UnexpectedPayloadError,
} from "./errors";
import {
  OPENAI_RESPONSES_ENDPOINT,
  GROQ_CHAT_ENDPOINT,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENAI_MODEL,
  LIMITS,
} from "../shared/constants";
import { buildProposalPrompt } from "./prompts";
import { UserProfile, ProjectData, ProposalDraft, AIProvider } from "../shared/types";

export interface RequestAIOptions {
  apiKey: string;
  provider?: AIProvider;
  model: string;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  endpoint?: string;
}

// Retain backward-compatible alias
export type RequestOpenAIOptions = RequestAIOptions;

/**
 * Detects whether a model is an open-weight or reasoning model (e.g. gpt-oss-20b, deepseek-r1).
 */
export function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return (
    m.includes("gpt-oss") ||
    m.includes("deepseek-r1") ||
    m.includes("qwq") ||
    m.includes("reason") ||
    m.startsWith("o1") ||
    m.startsWith("o3")
  );
}

/**
 * Extracts proposal text safely from Responses API or Chat Completions API response structure.
 * Robust against reasoning models that output <think>...</think> tags or reasoning_content fields.
 */
export function extractTextFromResponse(data: unknown, providerName?: string): string {
  if (!data || typeof data !== "object") {
    throw new UnexpectedPayloadError("Response body is not an object");
  }
  const obj = data as Record<string, unknown>;

  // 1. Check Chat Completions format (Groq & OpenAI standard)
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const firstChoice = obj.choices[0] as Record<string, unknown>;
    const msg = firstChoice?.message as Record<string, unknown> | undefined;

    // A. Check main content
    if (typeof msg?.content === "string" && msg.content.trim()) {
      const cleaned = msg.content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (cleaned) return cleaned;
      return msg.content.trim();
    }

    // B. Check reasoning / reasoning_content fallback if main content is empty
    if (typeof msg?.reasoning === "string" && msg.reasoning.trim()) {
      return msg.reasoning.trim();
    }
    const anyMsg = msg as Record<string, unknown> | undefined;
    if (typeof anyMsg?.reasoning_content === "string" && anyMsg.reasoning_content.trim()) {
      return anyMsg.reasoning_content.trim();
    }

    // C. Check firstChoice.text
    if (typeof firstChoice?.text === "string" && firstChoice.text.trim()) {
      const cleaned = firstChoice.text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      if (cleaned) return cleaned;
    }
  }

  // 2. Check Responses API output schema
  if (Array.isArray(obj.output)) {
    const textParts: string[] = [];
    for (const item of obj.output) {
      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        if (itemObj.type === "message" && Array.isArray(itemObj.content)) {
          for (const part of itemObj.content) {
            if (part && typeof part === "object") {
              const partObj = part as Record<string, unknown>;
              if (partObj.type === "output_text" && typeof partObj.text === "string") {
                textParts.push(partObj.text);
              }
            }
          }
        }
      }
    }
    const combined = textParts.join("\n").trim();
    if (combined) return combined;
  }

  throw new EmptyResponseError(providerName);
}

/**
 * Sends a proposal generation request to Groq or OpenAI.
 */
export async function sendAIRequest(options: RequestAIOptions): Promise<string> {
  const {
    apiKey,
    provider,
    model,
    instructions,
    input,
    maxOutputTokens = LIMITS.PROPOSAL_MAX_TOKENS,
    timeoutMs = LIMITS.REQUEST_TIMEOUT_MS,
    fetchFn = fetch,
  } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new MissingApiKeyError();
  }

  const trimmedKey = apiKey.trim();
  if (trimmedKey.length < 15) {
    throw new InvalidApiKeyError("Key length is suspiciously short");
  }

  // Determine provider: explicitly set or auto-detected by key prefix
  const isGroq = provider === "groq" || trimmedKey.startsWith("gsk_");
  const endpoint = options.endpoint || (isGroq ? GROQ_CHAT_ENDPOINT : OPENAI_RESPONSES_ENDPOINT);
  const selectedModel = model || (isGroq ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL);
  const isReasoning = isReasoningModel(selectedModel);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let requestBody: Record<string, unknown>;

  if (isGroq || endpoint.includes("/chat/completions")) {
    const tokenLimit = isReasoning ? Math.max(maxOutputTokens, 2500) : maxOutputTokens;

    // Standard OpenAI/Groq Chat Completions payload
    requestBody = {
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: instructions,
        },
        {
          role: "user",
          content: input,
        },
      ],
      temperature: 0.6,
      max_tokens: tokenLimit,
      max_completion_tokens: tokenLimit,
    };

    // For reasoning models on Groq, control internal chain-of-thought so content isn't empty
    if (isGroq && isReasoning) {
      requestBody.reasoning_effort = "low";
      requestBody.reasoning_format = "hidden";
    }
  } else {
    // OpenAI Responses API payload
    requestBody = {
      model: selectedModel,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      store: false,
    };
  }

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${trimmedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new TimeoutError(timeoutMs);
    }
    throw new NetworkError(err instanceof Error ? err.message : "Unknown connection failure");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let errBody: { error?: { message?: string; type?: string; code?: string } } = {};
    try {
      errBody = (await response.json()) as typeof errBody;
    } catch {
      // response body was not valid JSON
    }

    const message = errBody.error?.message || "";
    const errType = errBody.error?.type || "";
    const errCode = errBody.error?.code || "";

    if (response.status === 401) {
      throw new InvalidApiKeyError(message || `Invalid ${isGroq ? "Groq" : "OpenAI"} API Key`);
    }

    if (response.status === 429) {
      if (
        message.toLowerCase().includes("quota") ||
        message.toLowerCase().includes("billing") ||
        errType === "insufficient_quota" ||
        errCode === "insufficient_quota"
      ) {
        throw new QuotaOrBillingError(message);
      }
      const retryHeader = response.headers?.get("retry-after");
      const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : undefined;
      throw new RateLimitError(Number.isFinite(retrySeconds) ? retrySeconds : undefined);
    }

    if (response.status >= 500) {
      throw new OpenAIServerError(response.status, message);
    }

    throw new OpenAICopilotError(
      message || `${isGroq ? "Groq" : "OpenAI"} request failed with HTTP ${response.status}`,
      "HTTP_ERROR",
      response.status
    );
  }

  let jsonResult: unknown;
  try {
    jsonResult = await response.json();
  } catch {
    throw new UnexpectedPayloadError(`Failed to parse response JSON from ${isGroq ? "Groq" : "OpenAI"}`);
  }

  const extracted = extractTextFromResponse(jsonResult, isGroq ? "Groq" : "OpenAI");
  if (!extracted) {
    throw new EmptyResponseError(isGroq ? "Groq" : "OpenAI");
  }

  return extracted;
}

// Backward-compatible alias
export const sendOpenAIResponseRequest = sendAIRequest;

/**
 * End-to-end proposal generation using user profile, project details, and configured model.
 */
export async function generateProposal(params: {
  apiKey: string;
  provider?: AIProvider;
  model: string;
  profile: UserProfile;
  project: ProjectData;
  userBudget?: string;
  extraInstructions?: string;
  winningExamples?: string[];
  fetchFn?: typeof fetch;
}): Promise<ProposalDraft> {
  const promptPayload = buildProposalPrompt({
    profile: params.profile,
    project: params.project,
    userBudget: params.userBudget,
    extraInstructions: params.extraInstructions,
    winningExamples: params.winningExamples,
  });

  const text = await sendAIRequest({
    apiKey: params.apiKey,
    provider: params.provider,
    model: params.model,
    instructions: promptPayload.instructions,
    input: promptPayload.input,
    fetchFn: params.fetchFn,
  });

  return {
    text,
    model: params.model,
    createdAt: Date.now(),
  };
}
