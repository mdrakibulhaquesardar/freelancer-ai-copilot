import "./style.css";
import { getProfile, saveProfile, getSettings, saveSettings, clearAllLocalData } from "../../src/profile/storage";
import {
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENAI_MODEL,
  GROQ_MODELS,
  OPENAI_MODELS,
  GROQ_CHAT_ENDPOINT,
  OPENAI_RESPONSES_ENDPOINT,
} from "../../src/shared/constants";
import { AIProvider } from "../../src/shared/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Tabs & Panels
const tabs = document.querySelectorAll<HTMLButtonElement>(".settings-tab");
const panels = document.querySelectorAll<HTMLElement>(".settings-panel");

// Provider & Form Inputs
const providerSelect = $("providerSelect") as HTMLSelectElement;
const apiKeyInput = $("apiKey") as HTMLInputElement;
const apiKeyLabel = $("apiKeyLabel") as HTMLElement;
const apiKeyHint = $("apiKeyHint") as HTMLElement;
const apiKeyPortalLink = $("apiKeyPortalLink") as HTMLAnchorElement;
const endpointUrlDisplay = $("endpointUrlDisplay") as HTMLElement;
const presetsContainer = $("presetsContainer") as HTMLElement;
const modelInput = $("model") as HTMLInputElement;
const preferredBudgetInput = $("preferredBudget") as HTMLInputElement;

const displayNameInput = $("displayName") as HTMLInputElement;
const preferredLanguageInput = $("preferredLanguage") as HTMLInputElement;
const targetWordCountInput = $("targetWordCount") as HTMLInputElement;
const skillsInput = $("skills") as HTMLTextAreaElement;
const experienceFactsInput = $("experienceFacts") as HTMLTextAreaElement;
const toneInstructionsInput = $("toneInstructions") as HTMLTextAreaElement;
const proposalExamplesInput = $("proposalExamples") as HTMLTextAreaElement;
const avoidPhrasesInput = $("avoidPhrases") as HTMLTextAreaElement;
const liveAdapterEnabledCheckbox = $("liveAdapterEnabled") as HTMLInputElement;

// Actions
const clearDataBtn = $("clearDataBtn") as HTMLButtonElement;
const saveBtn = $("saveBtn") as HTMLButtonElement;
const saveStatus = $("saveStatus") as HTMLSpanElement;
const openInTabBtn = $("openInTabBtn") as HTMLButtonElement;
const toggleKeyVisibilityBtn = $("toggleKeyVisibilityBtn") as HTMLButtonElement;

// Tab switching
function switchSettingsTab(targetId: string) {
  panels.forEach(panel => {
    if (panel.id === targetId) {
      panel.hidden = false;
      panel.classList.add("active");
    } else {
      panel.hidden = true;
      panel.classList.remove("active");
    }
  });

  tabs.forEach(tab => {
    const isTarget = tab.dataset.tab === targetId;
    tab.classList.toggle("active", isTarget);
    tab.setAttribute("aria-selected", isTarget ? "true" : "false");
  });
}

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    if (target) switchSettingsTab(target);
  });
});

// Update Provider UI Elements
function updateProviderUI(provider: AIProvider, userChanged = false) {
  providerSelect.value = provider;

  if (provider === "groq") {
    apiKeyLabel.textContent = "Groq API Key";
    apiKeyInput.placeholder = "gsk_...";
    apiKeyPortalLink.href = "https://console.groq.com/keys";
    apiKeyPortalLink.textContent = "Get Free API Key at console.groq.com ↗";
    apiKeyHint.innerHTML = "Get your personal free key from <code>console.groq.com/keys</code>.";
    endpointUrlDisplay.textContent = GROQ_CHAT_ENDPOINT;

    if (userChanged || !modelInput.value || OPENAI_MODELS.includes(modelInput.value as (typeof OPENAI_MODELS)[number])) {
      modelInput.value = DEFAULT_GROQ_MODEL;
    }

    renderPresets(GROQ_MODELS);
  } else {
    apiKeyLabel.textContent = "OpenAI API Key";
    apiKeyInput.placeholder = "sk-proj-...";
    apiKeyPortalLink.href = "https://platform.openai.com/api-keys";
    apiKeyPortalLink.textContent = "OpenAI API Keys Portal ↗";
    apiKeyHint.innerHTML = "Personal API key starting with <code>sk-</code> with Responses/Chat API access.";
    endpointUrlDisplay.textContent = OPENAI_RESPONSES_ENDPOINT;

    if (userChanged || !modelInput.value || GROQ_MODELS.includes(modelInput.value as (typeof GROQ_MODELS)[number])) {
      modelInput.value = DEFAULT_OPENAI_MODEL;
    }

    renderPresets(OPENAI_MODELS);
  }
}

function renderPresets(models: readonly string[]) {
  presetsContainer.innerHTML = `<span class="preset-label">Presets:</span>`;
  models.forEach(m => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-pill";
    btn.textContent = m;
    btn.addEventListener("click", () => {
      modelInput.value = m;
    });
    presetsContainer.appendChild(btn);
  });
}

providerSelect.addEventListener("change", () => {
  const selected = providerSelect.value as AIProvider;
  updateProviderUI(selected, true);
});

// Auto-detect provider if user pastes gsk_ or sk-
apiKeyInput.addEventListener("input", () => {
  const val = apiKeyInput.value.trim();
  if (val.startsWith("gsk_") && providerSelect.value !== "groq") {
    updateProviderUI("groq", true);
  } else if (val.startsWith("sk-") && providerSelect.value !== "openai") {
    updateProviderUI("openai", true);
  }
});

// Popout to full tab
openInTabBtn.addEventListener("click", () => {
  const url = chrome.runtime.getURL("options.html");
  window.open(url, "_blank");
});

// Toggle password visibility
toggleKeyVisibilityBtn.addEventListener("click", () => {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    toggleKeyVisibilityBtn.textContent = "Hide";
  } else {
    apiKeyInput.type = "password";
    toggleKeyVisibilityBtn.textContent = "Show";
  }
});

function showStatus(text: string, isError = false) {
  saveStatus.textContent = text;
  saveStatus.className = `status-message ${isError ? "error" : "success"}`;
  setTimeout(() => {
    if (saveStatus.textContent === text) {
      saveStatus.textContent = "";
    }
  }, 4000);
}

async function loadData() {
  try {
    const settings = await getSettings();
    const profile = await getProfile();

    apiKeyInput.value = settings.apiKey || "";

    const activeProvider = settings.provider || (settings.apiKey?.startsWith("gsk_") ? "groq" : "groq");
    updateProviderUI(activeProvider, false);

    modelInput.value = settings.model || (activeProvider === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL);
    preferredBudgetInput.value = settings.preferredBudget || "";
    liveAdapterEnabledCheckbox.checked = settings.liveAdapterEnabled;

    displayNameInput.value = profile.displayName || "";
    preferredLanguageInput.value = profile.preferredLanguage || DEFAULT_PROFILE.preferredLanguage;
    targetWordCountInput.value = String(profile.targetWordCount || DEFAULT_PROFILE.targetWordCount);
    skillsInput.value = profile.skills.join(", ");
    experienceFactsInput.value = profile.experienceFacts.join("\n");
    toneInstructionsInput.value = profile.toneInstructions || DEFAULT_PROFILE.toneInstructions;
    proposalExamplesInput.value = profile.proposalExamples.join("\n---\n");
    avoidPhrasesInput.value = profile.avoidPhrases.join(", ");
  } catch (err) {
    showStatus(`Failed to load settings: ${err instanceof Error ? err.message : "unknown error"}`, true);
  }
}

async function handleSave() {
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    const skills = skillsInput.value
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const experienceFacts = experienceFactsInput.value
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);

    const proposalExamples = proposalExamplesInput.value
      .split(/\n---\n|\n\n+/)
      .map(s => s.trim())
      .filter(Boolean);

    const avoidPhrases = avoidPhrasesInput.value
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const targetWordCount = parseInt(targetWordCountInput.value, 10);
    const provider = providerSelect.value as AIProvider;

    await saveSettings({
      schemaVersion: 1,
      provider,
      apiKey: apiKeyInput.value.trim() || undefined,
      model: modelInput.value.trim() || (provider === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_OPENAI_MODEL),
      preferredBudget: preferredBudgetInput.value.trim() || undefined,
      liveAdapterEnabled: liveAdapterEnabledCheckbox.checked,
    });

    await saveProfile({
      schemaVersion: 1,
      displayName: displayNameInput.value.trim(),
      preferredLanguage: preferredLanguageInput.value.trim() || "English",
      targetWordCount: Number.isFinite(targetWordCount) ? targetWordCount : 160,
      skills,
      experienceFacts,
      portfolioItems: [],
      toneInstructions: toneInstructionsInput.value.trim(),
      proposalExamples,
      avoidPhrases,
    });

    showStatus("Settings and profile saved successfully.");
  } catch (err) {
    showStatus(`Failed to save: ${err instanceof Error ? err.message : "unknown error"}`, true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

clearDataBtn.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Are you sure you want to erase all local extension data? This will clear your saved profile, API key, and drafts."
  );
  if (!confirmed) return;

  try {
    await clearAllLocalData();
    await loadData();
    showStatus("All local extension data has been erased.");
  } catch (err) {
    showStatus(`Failed to clear data: ${err instanceof Error ? err.message : "unknown error"}`, true);
  }
});

saveBtn.addEventListener("click", handleSave);

void loadData();
