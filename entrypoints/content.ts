import { defineContentScript } from "wxt/sandbox";
import { MockSiteAdapter } from "../src/adapters/mock-adapter";
import { DisabledFreelancerAdapter } from "../src/adapters/freelancer-adapter.disabled";
import { getSettings } from "../src/profile/storage";
import { extractGenericProjectFromDOM } from "../src/project/parser";
import { fillSupportedFields } from "../src/autofill/fill";

export default defineContentScript({
  matches: ["*://*/*"],
  main() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "EXTRACT_PROJECT") {
        void (async () => {
          try {
            const settings = await getSettings();
            const currentUrl = window.location.href;

            const mockAdapter = new MockSiteAdapter();
            if (mockAdapter.canHandle(currentUrl)) {
              const data = mockAdapter.extractProject(document);
              sendResponse({ success: Boolean(data), data });
              return;
            }

            const liveAdapter = new DisabledFreelancerAdapter(settings.liveAdapterEnabled);
            if (liveAdapter.canHandle(currentUrl)) {
              const data = liveAdapter.extractProject(document);
              sendResponse({ success: Boolean(data), data });
              return;
            }

            // Fallback generic extraction for authorized testing pages
            const genericData = extractGenericProjectFromDOM(document, "mock");
            sendResponse({ success: Boolean(genericData), data: genericData });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Page extraction failed",
            });
          }
        })();
        return true; // Keep message channel open for async response
      }

      if (message?.type === "AUTOFILL_FIELDS") {
        void (async () => {
          try {
            const settings = await getSettings();
            const currentUrl = window.location.href;
            const liveAdapter = new DisabledFreelancerAdapter(settings.liveAdapterEnabled);

            if (liveAdapter.canHandle(currentUrl) && !settings.liveAdapterEnabled) {
              const result = liveAdapter.autofill(document, message.options);
              sendResponse({ success: false, result });
              return;
            }

            const result = fillSupportedFields(document, message.options);
            sendResponse({ success: result.success, result });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Autofill failed",
            });
          }
        })();
        return true;
      }
    });
  },
});
