import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Freelancer AI Copilot",
    description: "Generate a tailored freelance proposal and fill supported fields after user review.",
    permissions: ["storage", "activeTab", "scripting"],
    host_permissions: [
      "https://api.groq.com/*",
      "https://api.openai.com/*",
    ],
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    action: {
      default_title: "Freelancer AI Copilot",
      default_icon: {
        16: "icon-16.png",
        32: "icon-32.png",
        48: "icon-48.png",
        128: "icon-128.png",
      },
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
  },
});
