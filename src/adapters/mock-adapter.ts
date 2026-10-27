import { SiteAdapter } from "./adapter";
import { ProjectData, AutofillOptions, AutofillResult } from "../shared/types";
import { extractGenericProjectFromDOM } from "../project/parser";
import { fillSupportedFields } from "../autofill/fill";

export class MockSiteAdapter implements SiteAdapter {
  readonly name = "MockSiteAdapter";
  readonly isEnabled = true;

  canHandle(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes("localhost") ||
      lower.includes("127.0.0.1") ||
      lower.startsWith("file:") ||
      lower.includes("mock-") ||
      lower.includes("fixture")
    );
  }

  extractProject(doc: Document): ProjectData | null {
    // 1. Look for explicit mock fixture IDs or attributes first
    const titleEl = doc.querySelector("#mock-project-title, [data-mock-title], h1.project-title");
    const descEl = doc.querySelector("#mock-project-description, [data-mock-desc], .project-details");
    const skillsEl = doc.querySelectorAll(".mock-skill-tag, [data-mock-skill]");
    const budgetEl = doc.querySelector("#mock-advertised-budget, [data-mock-budget]");

    if (titleEl || descEl) {
      const skills = Array.from(skillsEl).map(s => s.textContent?.trim() || "").filter(Boolean);
      return {
        title: titleEl?.textContent?.trim() || "Mock Project",
        description: descEl?.textContent?.trim() || "",
        skills,
        advertisedBudget: budgetEl?.textContent?.trim() || undefined,
        projectUrl: doc.location?.href || "mock://project",
        source: "mock",
        extractedAt: Date.now(),
      };
    }

    // 2. Fall back to generic DOM extraction
    return extractGenericProjectFromDOM(doc, "mock");
  }

  autofill(doc: Document, options: AutofillOptions): AutofillResult {
    return fillSupportedFields(doc, options);
  }
}

export const mockAdapter = new MockSiteAdapter();
