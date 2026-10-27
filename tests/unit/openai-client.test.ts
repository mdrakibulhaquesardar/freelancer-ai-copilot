import { describe, it, expect } from "vitest";
import {
  extractTextFromResponse,
  sendOpenAIResponseRequest,
} from "../../src/ai/openai";
import {
  MissingApiKeyError,
  InvalidApiKeyError,
  QuotaOrBillingError,
  RateLimitError,
  TimeoutError,
  EmptyResponseError,
} from "../../src/ai/errors";

describe("OpenAI Responses API text extraction", () => {
  it("extracts output_text cleanly from standard Responses API structure", () => {
    const apiPayload = {
      id: "resp_12345",
      object: "response",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Hi, I have reviewed your Chrome Extension requirements and can implement this cleanly.",
            },
          ],
        },
      ],
    };

    const text = extractTextFromResponse(apiPayload);
    expect(text).toBe("Hi, I have reviewed your Chrome Extension requirements and can implement this cleanly.");
  });

  it("extracts content cleanly from Groq / Chat Completions structure", () => {
    const groqPayload = {
      id: "chatcmpl-12345",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "I have 5 years experience in TypeScript and can build your project fast using Groq.",
          },
        },
      ],
    };

    const text = extractTextFromResponse(groqPayload);
    expect(text).toBe("I have 5 years experience in TypeScript and can build your project fast using Groq.");
  });

  it("throws EmptyResponseError when output array contains no text", () => {
    const emptyPayload = {
      output: [],
    };
    expect(() => extractTextFromResponse(emptyPayload)).toThrow(EmptyResponseError);
  });
});

describe("Groq API integration and auto-detection", () => {
  it("routes to Groq endpoint when gsk_ key is supplied", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};

    const mockFetch: typeof fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "Groq generated proposal text.",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const text = await sendOpenAIResponseRequest({
      apiKey: "gsk_test_groq_api_key_1234567890",
      model: "llama-3.3-70b-versatile",
      instructions: "Be concise",
      input: "Build website",
      fetchFn: mockFetch,
    });

    expect(capturedUrl).toContain("api.groq.com");
    expect(capturedBody.model).toBe("llama-3.3-70b-versatile");
    expect(text).toBe("Groq generated proposal text.");
  });
});

describe("OpenAI API error handling and timeouts", () => {
  it("throws MissingApiKeyError when key is empty", async () => {
    await expect(
      sendOpenAIResponseRequest({
        apiKey: "",
        model: "gpt-4o-mini",
        instructions: "test",
        input: "test",
      })
    ).rejects.toThrow(MissingApiKeyError);
  });

  it("handles 401 invalid api key without leaking keys", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(JSON.stringify({ error: { message: "Incorrect API key provided" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    };

    await expect(
      sendOpenAIResponseRequest({
        apiKey: "sk-invalid-test-key-12345",
        model: "gpt-4o-mini",
        instructions: "test",
        input: "test",
        fetchFn: mockFetch,
      })
    ).rejects.toThrow(InvalidApiKeyError);
  });

  it("handles 429 quota/billing error correctly", async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(
        JSON.stringify({ error: { message: "You exceeded your current quota, please check your plan and billing details." } }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    await expect(
      sendOpenAIResponseRequest({
        apiKey: "sk-test-valid-length-key-12345",
        model: "gpt-4o-mini",
        instructions: "test",
        input: "test",
        fetchFn: mockFetch,
      })
    ).rejects.toThrow(QuotaOrBillingError);
  });

  it("handles 429 rate limit with retry-after header", async () => {
    const mockFetch: typeof fetch = async () => {
      const headers = new Headers();
      headers.set("retry-after", "20");
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ error: { message: "Rate limit reached for requests" } }), {
        status: 429,
        headers,
      });
    };

    await expect(
      sendOpenAIResponseRequest({
        apiKey: "sk-test-valid-length-key-12345",
        model: "gpt-4o-mini",
        instructions: "test",
        input: "test",
        fetchFn: mockFetch,
      })
    ).rejects.toThrow(RateLimitError);
  });

  it("handles request timeout properly", async () => {
    const mockSlowFetch: typeof fetch = (_url, init) => {
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    };

    await expect(
      sendOpenAIResponseRequest({
        apiKey: "sk-test-valid-length-key-12345",
        model: "gpt-4o-mini",
        instructions: "test",
        input: "test",
        timeoutMs: 50,
        fetchFn: mockSlowFetch,
      })
    ).rejects.toThrow(TimeoutError);
  });
});
