import { AutofillOptions, AutofillResult } from "../shared/types";
import { findEditableControls, identifyProposalField, identifyBudgetField, FormElement } from "./field-mapper";

/**
 * Reads existing value of a form element.
 */
export function getElementValue(el: FormElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return el.value || "";
  }
  return el.textContent || "";
}

/**
 * Safely sets value on input, textarea, or contenteditable element,
 * triggering necessary events for reactive frameworks (React, Vue, Angular).
 */
export function setElementValue(el: FormElement, value: string): void {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    el.textContent = value;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

/**
 * Fills supported proposal and budget fields in a document.
 * Invariant: NEVER clicks any submit or action buttons.
 */
export function fillSupportedFields(doc: Document, options: AutofillOptions): AutofillResult {
  const proposalText = options.proposal ? options.proposal.trim() : "";
  const budgetText = options.budget ? options.budget.trim() : "";

  if (!proposalText && !budgetText) {
    return {
      success: false,
      fieldsFilled: 0,
      proposalFilled: false,
      budgetFilled: false,
      skippedFields: [],
      message: "No proposal or budget text was provided to fill.",
    };
  }

  const controls = findEditableControls(doc);
  if (controls.length === 0) {
    return {
      success: false,
      fieldsFilled: 0,
      proposalFilled: false,
      budgetFilled: false,
      skippedFields: [],
      message: "No visible editable fields detected on this page. Copy and paste manually.",
    };
  }

  const proposalMatch = identifyProposalField(controls);
  const budgetMatch = identifyBudgetField(controls, proposalMatch?.element);

  let fieldsFilled = 0;
  let proposalFilled = false;
  let budgetFilled = false;
  const skippedFields: string[] = [];
  let requiresConfirmation = false;

  // 1. Process Proposal Field
  if (proposalMatch && proposalText) {
    const existingVal = getElementValue(proposalMatch.element).trim();
    if (existingVal && !options.overwriteExisting) {
      skippedFields.push("Proposal (already contains text)");
      requiresConfirmation = true;
    } else {
      setElementValue(proposalMatch.element, proposalText);
      proposalMatch.element.focus();
      proposalFilled = true;
      fieldsFilled++;
    }
  } else if (proposalText) {
    skippedFields.push("Proposal field not found confidently");
  }

  // 2. Process Budget Field
  // Strictly fills ONLY if explicit user budget was provided
  if (budgetText) {
    if (budgetMatch) {
      const existingVal = getElementValue(budgetMatch.element).trim();
      if (existingVal && !options.overwriteExisting) {
        skippedFields.push("Budget (already contains text)");
        requiresConfirmation = true;
      } else {
        setElementValue(budgetMatch.element, budgetText);
        budgetFilled = true;
        fieldsFilled++;
      }
    } else {
      skippedFields.push("Budget field not found confidently");
    }
  }

  let message = "";
  if (fieldsFilled > 0) {
    message = `Filled ${fieldsFilled} field(s) (${[proposalFilled ? "proposal" : "", budgetFilled ? "budget" : ""].filter(Boolean).join(", ")}). Review carefully; nothing was submitted.`;
  } else if (requiresConfirmation) {
    message = "Target fields already contain text. Enable 'Overwrite existing' to replace them.";
  } else {
    message = "Could not confidently identify supported proposal or budget fields. Please copy and paste manually.";
  }

  return {
    success: fieldsFilled > 0,
    fieldsFilled,
    proposalFilled,
    budgetFilled,
    skippedFields,
    message,
    requiresConfirmationForOverwrite: requiresConfirmation,
  };
}
