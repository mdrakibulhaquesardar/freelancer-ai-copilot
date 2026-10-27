import { isElementVisible } from "../project/parser";

export type FormElement = HTMLTextAreaElement | HTMLInputElement | HTMLElement;

export interface FieldMatch {
  element: FormElement;
  confidence: number; // 0 to 1
  labelFound: string;
}

const PROPOSAL_KEYWORDS = [
  "proposal",
  "cover letter",
  "describe your proposal",
  "bid details",
  "message to client",
  "pitch",
  "project proposal",
  "why are you the best fit",
];

const BUDGET_KEYWORDS = [
  "bid amount",
  "your bid",
  "proposed budget",
  "my bid",
  "rate",
  "hourly rate",
  "fixed price",
  "milestone amount",
  "project budget",
];

// Patterns that indicate a submit or final action button - MUST NEVER BE TOUCHED
export const SUBMIT_PATTERNS = [
  /submit/i,
  /place\s*bid/i,
  /send\s*proposal/i,
  /apply\s*now/i,
  /confirm/i,
  /accept/i,
  /pay/i,
];

/**
 * Extracts searchable text associated with a form control.
 */
export function getElementSearchText(el: Element): string {
  const input = el as HTMLInputElement;
  const id = input.id;
  let labelText = "";
  if (id && el.ownerDocument) {
    try {
      const associatedLabel = el.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (associatedLabel) {
        labelText = associatedLabel.textContent || "";
      }
    } catch {
      // Ignore querySelector syntax errors in weird IDs
    }
  }

  // Check parent label
  const parentLabel = el.closest("label");
  const parentLabelText = parentLabel ? parentLabel.textContent || "" : "";

  const ariaLabel = input.getAttribute("aria-label") || "";
  const placeholder = input.placeholder || "";
  const name = input.name || "";
  const className = typeof input.className === "string" ? input.className : "";
  const testId = input.getAttribute("data-testid") || "";

  return [labelText, parentLabelText, ariaLabel, placeholder, name, className, testId]
    .join(" ")
    .toLowerCase();
}

/**
 * Checks if a form control is truly interactive (visible, enabled, not readonly).
 */
export function isEditableControl(el: Element): boolean {
  if (!isElementVisible(el)) return false;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.disabled || el.readOnly) return false;
    if (el instanceof HTMLInputElement) {
      const type = (el.type || "").toLowerCase();
      if (["hidden", "submit", "button", "checkbox", "radio", "file", "image"].includes(type)) {
        return false;
      }
    }
    return true;
  }

  if (el.getAttribute("contenteditable") === "true") {
    return true;
  }

  return false;
}

/**
 * Finds all candidate editable controls in a document.
 */
export function findEditableControls(doc: Document): FormElement[] {
  const elements = Array.from(
    doc.querySelectorAll("textarea, input:not([type]), input[type='text'], input[type='number'], [contenteditable='true'], [data-test-field]")
  );
  return elements.filter((el): el is FormElement => isEditableControl(el));
}

/**
 * Finds the proposal text field with confidence score.
 */
export function identifyProposalField(controls: FormElement[]): FieldMatch | null {
  let bestMatch: FieldMatch | null = null;
  let maxScore = 0;

  for (const control of controls) {
    const text = getElementSearchText(control);
    let score = 0;

    for (const kw of PROPOSAL_KEYWORDS) {
      if (text.includes(kw)) {
        score += 0.4;
      }
    }

    if (control.tagName === "TEXTAREA" || control.getAttribute("contenteditable") === "true") {
      score += 0.3;
    }

    // Explicit data attribute or id bonus
    if (control.id.toLowerCase().includes("proposal") || control.getAttribute("data-field") === "proposal") {
      score += 0.4;
    }

    // Penalize if it mentions budget
    if (text.includes("budget") || text.includes("price") || text.includes("rate")) {
      score -= 0.5;
    }

    if (score > maxScore && score >= 0.3) {
      maxScore = score;
      bestMatch = {
        element: control,
        confidence: Math.min(score, 1),
        labelFound: text.slice(0, 80),
      };
    }
  }

  return bestMatch;
}

/**
 * Finds the budget input field with confidence score.
 */
export function identifyBudgetField(controls: FormElement[], excludeElement?: FormElement): FieldMatch | null {
  let bestMatch: FieldMatch | null = null;
  let maxScore = 0;

  for (const control of controls) {
    if (control === excludeElement) continue;

    const text = getElementSearchText(control);
    let score = 0;

    for (const kw of BUDGET_KEYWORDS) {
      if (text.includes(kw)) {
        score += 0.4;
      }
    }

    if (control instanceof HTMLInputElement && (control.type === "number" || control.type === "text")) {
      score += 0.2;
    }

    if (control.id.toLowerCase().includes("budget") || control.id.toLowerCase().includes("bid") || control.getAttribute("data-field") === "budget") {
      score += 0.4;
    }

    // Penalize textareas for budget unless specifically designated
    if (control.tagName === "TEXTAREA") {
      score -= 0.4;
    }

    // Penalize if it's primarily a proposal field
    if (text.includes("cover letter") || text.includes("describe your")) {
      score -= 0.6;
    }

    if (score > maxScore && score >= 0.3) {
      maxScore = score;
      bestMatch = {
        element: control,
        confidence: Math.min(score, 1),
        labelFound: text.slice(0, 80),
      };
    }
  }

  return bestMatch;
}
