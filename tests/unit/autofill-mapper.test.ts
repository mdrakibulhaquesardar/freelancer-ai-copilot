import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  findEditableControls,
  identifyProposalField,
  identifyBudgetField,
} from "../../src/autofill/field-mapper";
import { fillSupportedFields } from "../../src/autofill/fill";

describe("Field Mapping and Autofill Safeties", () => {
  let doc: Document;

  beforeEach(() => {
    doc = document.implementation.createHTMLDocument("Test Page");
    doc.body.innerHTML = `
      <form id="bid-form">
        <input type="hidden" name="token" value="abc1234">
        <input type="text" name="readOnlyNotice" value="Fixed rule" readonly>
        <input type="text" name="disabledField" value="Cannot edit" disabled>

        <label for="budget-input">Your Bid Amount ($ USD)</label>
        <input type="number" id="budget-input" name="bid" placeholder="300">

        <label for="proposal-input">Describe your proposal</label>
        <textarea id="proposal-input" name="proposal" placeholder="Write here..."></textarea>

        <button type="submit" id="place-bid-btn">Place Bid</button>
      </form>
    `;
  });

  it("skips hidden, disabled, and readonly controls", () => {
    const controls = findEditableControls(doc);
    const names = controls.map(c => (c as HTMLInputElement).name);

    expect(names).not.toContain("token");
    expect(names).not.toContain("readOnlyNotice");
    expect(names).not.toContain("disabledField");
    expect(names).toContain("bid");
    expect(names).toContain("proposal");
  });

  it("confidently identifies proposal and budget fields", () => {
    const controls = findEditableControls(doc);
    const proposalMatch = identifyProposalField(controls);
    const budgetMatch = identifyBudgetField(controls, proposalMatch?.element);

    expect(proposalMatch).not.toBeNull();
    expect((proposalMatch?.element as HTMLTextAreaElement).id).toBe("proposal-input");

    expect(budgetMatch).not.toBeNull();
    expect((budgetMatch?.element as HTMLInputElement).id).toBe("budget-input");
  });

  it("fills proposal and budget only when user provides explicit values", () => {
    const result = fillSupportedFields(doc, {
      proposal: "Custom proposal text for the client.",
      budget: "450",
    });

    expect(result.success).toBe(true);
    expect(result.fieldsFilled).toBe(2);
    expect(result.proposalFilled).toBe(true);
    expect(result.budgetFilled).toBe(true);

    const proposalEl = doc.getElementById("proposal-input") as HTMLTextAreaElement;
    const budgetEl = doc.getElementById("budget-input") as HTMLInputElement;

    expect(proposalEl.value).toBe("Custom proposal text for the client.");
    expect(budgetEl.value).toBe("450");
  });

  it("never fills budget when user did not enter a budget", () => {
    const result = fillSupportedFields(doc, {
      proposal: "Proposal without budget.",
      // budget omitted
    });

    expect(result.success).toBe(true);
    expect(result.fieldsFilled).toBe(1);
    expect(result.proposalFilled).toBe(true);
    expect(result.budgetFilled).toBe(false);

    const budgetEl = doc.getElementById("budget-input") as HTMLInputElement;
    expect(budgetEl.value).toBe("");
  });

  it("does not overwrite non-empty fields without explicit confirmation flag", () => {
    const proposalEl = doc.getElementById("proposal-input") as HTMLTextAreaElement;
    proposalEl.value = "Original user drafted content";

    const result = fillSupportedFields(doc, {
      proposal: "New AI text",
      overwriteExisting: false,
    });

    expect(result.fieldsFilled).toBe(0);
    expect(result.requiresConfirmationForOverwrite).toBe(true);
    expect(proposalEl.value).toBe("Original user drafted content");

    // When overwrite is explicitly true
    const overwriteResult = fillSupportedFields(doc, {
      proposal: "New AI text",
      overwriteExisting: true,
    });
    expect(overwriteResult.fieldsFilled).toBe(1);
    expect(proposalEl.value).toBe("New AI text");
  });

  it("CRITICAL INVARIANT: NEVER triggers form submission or clicks submit buttons", () => {
    const form = doc.getElementById("bid-form") as HTMLFormElement;
    const submitBtn = doc.getElementById("place-bid-btn") as HTMLButtonElement;

    const submitSpy = vi.fn();
    const clickSpy = vi.fn();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitSpy();
    });
    submitBtn.addEventListener("click", clickSpy);

    fillSupportedFields(doc, {
      proposal: "Test proposal",
      budget: "500",
      overwriteExisting: true,
    });

    expect(submitSpy).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("gracefully reports failure and offers manual paste on unsupported forms", () => {
    const emptyDoc = document.implementation.createHTMLDocument("Empty Page");
    emptyDoc.body.innerHTML = `<div>Just some text, no inputs.</div>`;

    const result = fillSupportedFields(emptyDoc, {
      proposal: "Some proposal",
    });

    expect(result.success).toBe(false);
    expect(result.fieldsFilled).toBe(0);
    expect(result.message).toContain("Copy and paste manually");
  });
});
