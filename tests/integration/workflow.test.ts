import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { MockSiteAdapter } from "../../src/adapters/mock-adapter";
import { DisabledFreelancerAdapter } from "../../src/adapters/freelancer-adapter.disabled";
import { generateProposal } from "../../src/ai/openai";
import { DEFAULT_PROFILE } from "../../src/shared/constants";
import { fillSupportedFields } from "../../src/autofill/fill";

describe("End-to-End Workflow with Mock Fixtures", () => {
  it("extracts from mock project fixture, generates proposal, and autofills mock bid form", async () => {
    // 1. Read mock project HTML fixture
    const fixtureDir = path.resolve(__dirname, "../fixtures");
    const projectHtml = fs.readFileSync(path.join(fixtureDir, "mock-project.html"), "utf-8");

    const projectDoc = document.implementation.createHTMLDocument("Mock Project");
    projectDoc.body.innerHTML = projectHtml;

    const adapter = new MockSiteAdapter();
    const extracted = adapter.extractProject(projectDoc);

    expect(extracted).not.toBeNull();
    expect(extracted?.title).toContain("Build a Manifest V3 Chrome Extension");
    expect(extracted?.skills).toContain("TypeScript");
    expect(extracted?.description).toContain("experienced TypeScript engineer");

    // 2. Generate Proposal using simulated OpenAI Responses API
    const mockFetch: typeof fetch = async () => {
      const respPayload = {
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "I specialize in TypeScript Manifest V3 extensions and can implement your clean WXT architecture smoothly.",
              },
            ],
          },
        ],
      };
      return new Response(JSON.stringify(respPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const draft = await generateProposal({
      apiKey: "sk-test-valid-mock-key-1234567890",
      model: "gpt-4o-mini",
      profile: {
        ...DEFAULT_PROFILE,
        displayName: "Alex",
        skills: ["TypeScript", "Chrome Extension"],
        experienceFacts: ["Built 5 published MV3 extensions"],
      },
      project: extracted!,
      userBudget: "400 USD",
      fetchFn: mockFetch,
    });

    expect(draft.text).toContain("Manifest V3 extensions");

    // 3. Read mock bid form fixture
    const formHtml = fs.readFileSync(path.join(fixtureDir, "mock-bid-form.html"), "utf-8");
    const formDoc = document.implementation.createHTMLDocument("Mock Bid Form");
    formDoc.body.innerHTML = formHtml;

    const form = formDoc.getElementById("bid-form") as HTMLFormElement;
    const submitBtn = formDoc.getElementById("place-bid-btn") as HTMLButtonElement;
    const submitSpy = vi.fn();
    const clickSpy = vi.fn();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitSpy();
    });
    submitBtn.addEventListener("click", clickSpy);

    // 4. Fill supported fields
    const fillResult = fillSupportedFields(formDoc, {
      proposal: draft.text,
      budget: "400",
    });

    expect(fillResult.success).toBe(true);
    expect(fillResult.fieldsFilled).toBe(2);

    const proposalInput = formDoc.getElementById("proposal-input") as HTMLTextAreaElement;
    const budgetInput = formDoc.getElementById("bid-amount") as HTMLInputElement;

    expect(proposalInput.value).toBe(draft.text);
    expect(budgetInput.value).toBe("400");

    // Invariant: Verify NO submit event or click was ever fired
    expect(submitSpy).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("enforces that live Freelancer adapter remains disabled by default", () => {
    const liveAdapter = new DisabledFreelancerAdapter(false);
    expect(liveAdapter.isEnabled).toBe(false);

    const dummyDoc = document.implementation.createHTMLDocument("Freelancer");
    expect(() => liveAdapter.extractProject(dummyDoc)).toThrow(/disabled by default/);

    const autofillRes = liveAdapter.autofill(dummyDoc, { proposal: "test" });
    expect(autofillRes.success).toBe(false);
    expect(autofillRes.message).toContain("disabled by default");
  });
});
