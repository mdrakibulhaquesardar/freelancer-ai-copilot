import { defineBackground } from "wxt/sandbox";

export default defineBackground(() => {
  // Service worker initialization
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      // First-time install: guide user to options or show initial notice
    }
  });

  // Handle messages from popup or content scripts
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "OPEN_OPTIONS_PAGE") {
      chrome.runtime.openOptionsPage();
      sendResponse({ success: true });
    }
  });
});
