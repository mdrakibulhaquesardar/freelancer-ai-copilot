import { SiteAdapter } from "./adapter";
import { ProjectData, AutofillOptions, AutofillResult } from "../shared/types";
import { fillSupportedFields } from "../autofill/fill";
import { extractGenericProjectFromDOM } from "../project/parser";

/**
 * Live Freelancer.com site adapter.
 *
 * COMPLIANCE GATE NOTICE:
 * Automated reading or form filling on Freelancer.com may violate Freelancer's Terms of Service.
 * This adapter is intentionally kept DISABLED by default.
 * Users must independently verify terms of service, obtain required permissions,
 * and explicitly toggle `liveAdapterEnabled` in the extension options before enabling.
 *
 * DO NOT ATTEMPT TO BYPASS THIS GATE OR INTRODUCE EVASION TECHNIQUES.
 */
export class DisabledFreelancerAdapter implements SiteAdapter {
  readonly name = "FreelancerLiveAdapter";
  
  constructor(public isEnabled: boolean = false) {}

  canHandle(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes("freelancer.com") || lower.includes("freelancer.co.");
  }

  extractProject(doc: Document): ProjectData | null {
    if (!this.isEnabled) {
      throw new Error(
        "Live Freelancer.com integration is disabled by default for platform compliance. " +
        "Please paste the project title and description manually, or test on mock pages. " +
        "To enable, verify platform terms and toggle 'Live Site Adapter' in extension Options."
      );
    }

    return extractGenericProjectFromDOM(doc, "authorized-site");
  }

  autofill(doc: Document, options: AutofillOptions): AutofillResult {
    if (!this.isEnabled) {
      return {
        success: false,
        fieldsFilled: 0,
        proposalFilled: false,
        budgetFilled: false,
        skippedFields: [],
        message:
          "Live site autofill is disabled by default for platform compliance. " +
          "Copy the proposal and paste it manually into the proposal box.",
      };
    }

    return fillSupportedFields(doc, options);
  }
}

export const freelancerLiveAdapter = new DisabledFreelancerAdapter(false);
