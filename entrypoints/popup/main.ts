import "./style.css";
import {
  getProfile,
  getSettings,
  getLastProject,
  saveLastProject,
  getLastProposal,
  saveLastProposal,
  getProposalLibrary,
  saveProposalToLibrary,
  updateProposalInLibrary,
  deleteProposalFromLibrary,
  getWinningProposalExamples,
} from "../../src/profile/storage";
import { generateProposal } from "../../src/ai/openai";
import { parseManualProject } from "../../src/project/parser";
import { AutofillOptions, AutofillResult, SavedProposal, ProposalOutcome } from "../../src/shared/types";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Titlebar & Header Elements
const apiStatusDot = $("statusDot") as HTMLSpanElement;
const apiStatusText = $("apiStatusText") as HTMLSpanElement;
const profileSummary = $("profileSummary") as HTMLSpanElement;
const openOptionsBtn = $("openOptionsBtn") as HTMLButtonElement;

// Tab Elements
const tabs = document.querySelectorAll<HTMLButtonElement>(".segment-tab");
const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel");

// View 1 (Draft) Elements
const proposalDraftArea = $("proposalDraft") as HTMLTextAreaElement;
const wordCountBadge = $("wordCountBadge") as HTMLSpanElement;
const generateBtn = $("generateBtn") as HTMLButtonElement;
const generateBtnText = $("generateBtnText") as HTMLSpanElement;
const overwriteCheckbox = $("overwriteCheckbox") as HTMLInputElement;
const copyBtn = $("copyBtn") as HTMLButtonElement;
const saveLibraryBtn = $("saveLibraryBtn") as HTMLButtonElement;
const autofillBtn = $("autofillBtn") as HTMLButtonElement;
const quickReadBtn = $("quickReadBtn") as HTMLButtonElement;

// View 2 (Project Details) Elements
const projectTitleInput = $("projectTitle") as HTMLInputElement;
const projectDescriptionInput = $("projectDescription") as HTMLTextAreaElement;
const budgetInput = $("budget") as HTMLInputElement;
const extraInstructionsInput = $("extraInstructions") as HTMLInputElement;
const readProjectBtn = $("readProjectBtn") as HTMLButtonElement;
const goToDraftBtn = $("goToDraftBtn") as HTMLButtonElement;

// View 3 (Library & Win Tracking) Elements
const libraryContainer = $("libraryContainer") as HTMLDivElement;
const libraryCountBadge = $("libraryCountBadge") as HTMLSpanElement;
const libraryFilterBtns = document.querySelectorAll<HTMLButtonElement>("#libraryFilters .chip-btn");

// View 3 (Profile Snapshot) Elements
const profileAvatar = $("profileAvatar") as HTMLDivElement;
const profileDisplayName = $("profileDisplayName") as HTMLElement;
const profileModelLabel = $("profileModelLabel") as HTMLSpanElement;
const skillsTagList = $("skillsTagList") as HTMLDivElement;
const profileToneSummary = $("profileToneSummary") as HTMLParagraphElement;
const settingsLinkBtn = $("settingsLinkBtn") as HTMLButtonElement;

// Native Toast Elements
const statusBox = $("statusBox") as HTMLDivElement;
const toastMessage = $("toastMessage") as HTMLSpanElement;

function showToast(text: string, type: "normal" | "success" | "error" = "normal") {
  toastMessage.textContent = text;
  statusBox.className = `native-toast ${type === "normal" ? "" : type}`;
}

function updateWordCount() {
  const text = proposalDraftArea.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  wordCountBadge.textContent = `${words} word${words === 1 ? "" : "s"}`;
}

proposalDraftArea.addEventListener("input", updateWordCount);

// Tab switching mechanism
function switchTab(targetId: string) {
  tabPanels.forEach(panel => {
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
    const targetId = tab.dataset.tab;
    if (targetId) switchTab(targetId);
  });
});

goToDraftBtn.addEventListener("click", () => switchTab("viewDraft"));

function openOptionsPage() {
  if (chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open("options.html");
  }
}

openOptionsBtn.addEventListener("click", openOptionsPage);
settingsLinkBtn.addEventListener("click", openOptionsPage);

// Load state into UI
async function initUI() {
  try {
    const settings = await getSettings();
    const profile = await getProfile();

    const providerName = settings.provider === "groq" || settings.apiKey?.startsWith("gsk_") ? "Groq" : "OpenAI";

    if (settings.apiKey && settings.apiKey.length >= 15) {
      apiStatusDot.className = "pulse-dot active";
      apiStatusText.textContent = `Ready (${providerName} • ${settings.model})`;
    } else {
      apiStatusDot.className = "pulse-dot warning";
      apiStatusText.textContent = "API Key Missing";
    }

    const name = profile.displayName ? profile.displayName : "No Name Set";
    const skillCount = profile.skills.length;
    profileSummary.textContent = `${name} • ${skillCount} skills`;

    // Populate Snapshot View
    profileAvatar.textContent = name ? name[0]?.toUpperCase() || "U" : "U";
    profileDisplayName.textContent = name;
    profileModelLabel.textContent = `${providerName}: ${settings.model}`;
    profileToneSummary.textContent = profile.toneInstructions || "Direct, authentic, and professional.";

    if (profile.skills.length > 0) {
      skillsTagList.innerHTML = "";
      profile.skills.slice(0, 8).forEach(skill => {
        const span = document.createElement("span");
        span.className = "skill-tag";
        span.textContent = skill;
        skillsTagList.appendChild(span);
      });
      if (profile.skills.length > 8) {
        const extra = document.createElement("span");
        extra.className = "skill-tag";
        extra.textContent = `+${profile.skills.length - 8} more`;
        skillsTagList.appendChild(extra);
      }
    } else {
      skillsTagList.innerHTML = `<span class="skill-tag" style="opacity:0.6;">No skills added yet</span>`;
    }

    if (settings.preferredBudget && !budgetInput.value) {
      budgetInput.placeholder = `Default: ${settings.preferredBudget}`;
    }

    // Load last project
    const lastProj = await getLastProject();
    if (lastProj) {
      projectTitleInput.value = lastProj.title || "";
      projectDescriptionInput.value = lastProj.description || "";
      if (lastProj.advertisedBudget && !budgetInput.value) {
        budgetInput.value = lastProj.advertisedBudget;
      }
    }

    // Load last proposal
    const lastDraft = await getLastProposal();
    if (lastDraft) {
      proposalDraftArea.value = lastDraft.text;
      updateWordCount();
    }
  } catch (err) {
    showToast(`Error loading state: ${err instanceof Error ? err.message : "unknown"}`, "error");
  }
}

// Extraction handler from active tab
async function handleReadPage() {
  showToast("Scanning active tab for project details...", "normal");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showToast("No active browser tab detected.", "error");
      return;
    }

    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://")) {
      showToast("Cannot read browser internal pages. Navigate to a project page.", "error");
      return;
    }

    let response: { success: boolean; data?: { title: string; description: string; advertisedBudget?: string }; error?: string } | undefined;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PROJECT" });
    } catch {
      // Content script may need dynamic fallback
    }

    if (!response || !response.success) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const clean = (val: string) => val.replace(/\s+/g, " ").trim();
          const headings = Array.from(document.querySelectorAll("h1, h2, [data-project-title]"));
          const title = clean(headings[0]?.textContent || document.title || "");
          const mainContent = document.querySelector("main, article, [role='main'], .project-details, body");
          const description = clean(mainContent?.textContent || "").slice(0, 12000);
          return { title, description };
        },
      });

      const extracted = results[0]?.result;
      if (extracted && (extracted.title || extracted.description)) {
        projectTitleInput.value = extracted.title;
        projectDescriptionInput.value = extracted.description;
        showToast("Extracted visible details from page. Review before generating.", "success");
        return;
      }

      showToast(response?.error || "Could not detect project details. Please paste them in Project Details.", "error");
      return;
    }

    if (response.data) {
      projectTitleInput.value = response.data.title || "";
      projectDescriptionInput.value = response.data.description || "";
      if (response.data.advertisedBudget && !budgetInput.value) {
        budgetInput.placeholder = `Advertised: ${response.data.advertisedBudget}`;
      }
      showToast("Project details extracted. Review and edit before generating.", "success");
    }
  } catch (err) {
    showToast(`Scan failed: ${err instanceof Error ? err.message : "unknown error"}. Paste details manually.`, "error");
  }
}

quickReadBtn.addEventListener("click", handleReadPage);
readProjectBtn.addEventListener("click", handleReadPage);

// Proposal Generation Logic
async function handleGenerate() {
  const title = projectTitleInput.value.trim();
  const description = projectDescriptionInput.value.trim();
  const userBudget = budgetInput.value.trim();
  const extraInstructions = extraInstructionsInput.value.trim();

  if (!description) {
    showToast("Project description is empty. Switch to 'Project Details' or click 'Scan Page'.", "error");
    switchTab("viewProject");
    projectDescriptionInput.focus();
    return;
  }

  const settings = await getSettings();
  if (!settings.apiKey) {
    showToast("API key missing. Click the gear icon to configure your Groq or OpenAI key.", "error");
    return;
  }

  const profile = await getProfile();

  generateBtn.disabled = true;
  generateBtnText.textContent = "Writing tailored draft...";
  showToast("Analyzing project and crafting personalized proposal...", "normal");

  const projectData = parseManualProject({
    title,
    description,
    advertisedBudget: userBudget || undefined,
  });

  try {
    await saveLastProject(projectData);

    const winningExamples = await getWinningProposalExamples();

    const draft = await generateProposal({
      apiKey: settings.apiKey,
      provider: settings.provider,
      model: settings.model,
      profile,
      project: projectData,
      userBudget: userBudget || undefined,
      extraInstructions: extraInstructions || undefined,
      winningExamples,
    });

    proposalDraftArea.value = draft.text;
    updateWordCount();
    await saveLastProposal(draft);

    // Auto-save to library so no proposal is lost
    await saveProposalToLibrary({
      projectTitle: title || "Freelance Bid",
      projectSnippet: description.slice(0, 200),
      proposalText: draft.text,
      model: settings.model,
      starred: false,
      outcome: "pending",
    });
    void renderLibrary();

    showToast("Proposal generated & saved to library. Review claims before submitting.", "success");
    switchTab("viewDraft");
  } catch (err) {
    showToast(`Generation failed: ${err instanceof Error ? err.message : "unknown error"}`, "error");
  } finally {
    generateBtn.disabled = false;
    generateBtnText.textContent = "Generate Tailored Proposal";
  }
}

generateBtn.addEventListener("click", handleGenerate);

// Keyboard Shortcut: Ctrl+Enter / Cmd+Enter to generate
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    void handleGenerate();
  }
});

// Copy button
copyBtn.addEventListener("click", async () => {
  const text = proposalDraftArea.value.trim();
  if (!text) {
    showToast("No proposal text to copy.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  } catch {
    showToast("Failed to copy automatically. Please copy manually.", "error");
  }
});

// Save to Library (bookmark/star current draft)
saveLibraryBtn.addEventListener("click", async () => {
  const proposalText = proposalDraftArea.value.trim();
  if (!proposalText) {
    showToast("No proposal text to save.", "error");
    return;
  }

  const title = projectTitleInput.value.trim() || "Freelance Bid";
  const snippet = projectDescriptionInput.value.trim().slice(0, 200);
  const settings = await getSettings();

  try {
    await saveProposalToLibrary({
      projectTitle: title,
      projectSnippet: snippet,
      proposalText,
      model: settings.model,
      starred: true, // Bookmarked as favorite
      outcome: "pending",
    });

    showToast("Saved with ⭐ Star! AI will prioritize this style.", "success");
    await renderLibrary();
  } catch (err) {
    showToast(`Failed to save: ${err instanceof Error ? err.message : "unknown error"}`, "error");
  }
});

// Autofill execution
autofillBtn.addEventListener("click", async () => {
  const proposal = proposalDraftArea.value.trim();
  const budget = budgetInput.value.trim();
  const overwriteExisting = overwriteCheckbox.checked;

  if (!proposal && !budget) {
    showToast("Generate or write a proposal first.", "error");
    return;
  }

  showToast("Filling supported form fields...", "normal");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showToast("No active browser tab found.", "error");
      return;
    }

    const autofillOptions: AutofillOptions = {
      proposal,
      budget: budget || undefined,
      overwriteExisting,
    };

    let response: { success: boolean; result?: AutofillResult; error?: string } | undefined;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "AUTOFILL_FIELDS",
        options: autofillOptions,
      });
    } catch {
      // Fallback to scripting
    }

    if (response && response.result) {
      const res = response.result;
      showToast(res.message, res.success ? "success" : "error");
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (opts: AutofillOptions) => {
        const visible = (el: Element) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const controls = Array.from(
          document.querySelectorAll("textarea, input:not([type]), input[type='text'], input[type='number']")
        )
          .filter((el): el is HTMLElement => visible(el))
          .filter(el => !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly);

        const getLabel = (el: Element) => {
          const input = el as HTMLInputElement;
          const id = input.id;
          const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : "";
          return `${label || ""} ${input.getAttribute("aria-label") || ""} ${input.placeholder || ""} ${input.name || ""}`.toLowerCase();
        };

        const proposalField = controls.find(el => /proposal|cover letter|describe your|bid details|pitch/.test(getLabel(el))) ||
          controls.find(el => el.tagName === "TEXTAREA");

        let filled = 0;
        let requiresConfirmation = false;

        const setValue = (el: HTMLElement, val: string) => {
          const isInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
          if (isInput) {
            const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, "value");
            if (desc && desc.set) {
              desc.set.call(el, val);
            } else {
              (el as HTMLInputElement).value = val;
            }
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        };

        if (proposalField && opts.proposal) {
          const existing = (proposalField as HTMLInputElement).value?.trim() || "";
          if (existing && !opts.overwriteExisting) {
            requiresConfirmation = true;
          } else {
            setValue(proposalField, opts.proposal);
            proposalField.focus();
            filled++;
          }
        }

        if (opts.budget) {
          const budgetField = controls.find(el => /budget|bid amount|your bid|fixed price|rate/.test(getLabel(el)));
          if (budgetField && budgetField !== proposalField) {
            const existing = (budgetField as HTMLInputElement).value?.trim() || "";
            if (existing && !opts.overwriteExisting) {
              requiresConfirmation = true;
            } else {
              setValue(budgetField, opts.budget);
              filled++;
            }
          }
        }

        if (filled > 0) {
          return { success: true, message: `Filled ${filled} supported field(s). Review carefully; nothing was submitted.` };
        }
        if (requiresConfirmation) {
          return { success: false, message: "Target field contains existing text. Check 'Allow overwriting' to replace." };
        }
        return { success: false, message: "No supported proposal/budget fields found. Copy and paste manually." };
      },
      args: [autofillOptions],
    });

    const outcome = results[0]?.result;
    if (outcome) {
      showToast(outcome.message, outcome.success ? "success" : "error");
    } else {
      showToast("No supported fields detected. Please copy and paste manually.", "error");
    }
  } catch (err) {
    showToast(`Autofill failed: ${err instanceof Error ? err.message : "unknown error"}. Copy manually.`, "error");
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Proposal Library & Win Tracking UI Logic
let activeLibraryFilter: "all" | "starred" | "won" | "replied" = "all";

libraryFilterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    libraryFilterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeLibraryFilter = (btn.dataset.filter || "all") as typeof activeLibraryFilter;
    void renderLibrary();
  });
});

async function renderLibrary() {
  if (!libraryContainer) return;
  const library = await getProposalLibrary();
  if (libraryCountBadge) {
    libraryCountBadge.textContent = `${library.length} saved`;
  }

  const filtered = library.filter(p => {
    if (activeLibraryFilter === "starred") return p.starred;
    if (activeLibraryFilter === "won") return p.outcome === "won";
    if (activeLibraryFilter === "replied") return p.outcome === "replied";
    return true;
  });

  if (filtered.length === 0) {
    libraryContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <p class="empty-title">No proposals found</p>
        <p class="empty-sub">${
          activeLibraryFilter === "all"
            ? 'Generate a proposal and click "Save to Library" to track replies and teach the AI your winning style.'
            : `No saved proposals with filter "${activeLibraryFilter}".`
        }</p>
      </div>
    `;
    return;
  }

  libraryContainer.innerHTML = "";
  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "proposal-card";
    card.dataset.id = item.id;

    const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    card.innerHTML = `
      <div class="card-top-row">
        <span class="card-title" title="${escapeHtml(item.projectTitle)}">${escapeHtml(item.projectTitle)}</span>
        <div class="card-top-actions">
          <select class="outcome-select ${item.outcome}" data-id="${item.id}" title="Update proposal outcome">
            <option value="pending" ${item.outcome === "pending" ? "selected" : ""}>⏳ Pending</option>
            <option value="replied" ${item.outcome === "replied" ? "selected" : ""}>💬 Replied</option>
            <option value="won" ${item.outcome === "won" ? "selected" : ""}>🏆 Won</option>
            <option value="declined" ${item.outcome === "declined" ? "selected" : ""}>❌ Declined</option>
          </select>
          <button class="star-toggle-btn ${item.starred ? "starred" : ""}" data-id="${item.id}" title="${item.starred ? "Starred as Winning Style" : "Star to feed into AI"}">
            ⭐
          </button>
        </div>
      </div>

      <div class="card-preview">${escapeHtml(item.proposalText)}</div>

      <div class="card-footer">
        <span class="card-meta">${dateStr} · ${escapeHtml(item.model)}</span>
        <div class="card-btn-group">
          <button class="micro-btn load-btn" data-id="${item.id}" title="Load back into editor">
            Load
          </button>
          <button class="micro-btn copy-item-btn" data-id="${item.id}" title="Copy to clipboard">
            Copy
          </button>
          <button class="micro-btn danger delete-btn" data-id="${item.id}" title="Delete from library">
            Delete
          </button>
        </div>
      </div>
    `;

    libraryContainer.appendChild(card);
  });

  // Attach event delegation for library cards
  libraryContainer.querySelectorAll<HTMLSelectElement>(".outcome-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const target = e.target as HTMLSelectElement;
      const id = target.dataset.id;
      const newOutcome = target.value as ProposalOutcome;
      if (id) {
        await updateProposalInLibrary(id, { outcome: newOutcome });
        target.className = `outcome-select ${newOutcome}`;
        if (newOutcome === "won" || newOutcome === "replied") {
          showToast(`Marked as ${newOutcome === "won" ? "🏆 Won" : "💬 Replied"}! AI will learn from this proposal.`, "success");
        } else {
          showToast(`Status updated to ${newOutcome}.`, "normal");
        }
      }
    });
  });

  libraryContainer.querySelectorAll<HTMLButtonElement>(".star-toggle-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const isCurrentlyStarred = btn.classList.contains("starred");
      if (id) {
        await updateProposalInLibrary(id, { starred: !isCurrentlyStarred });
        btn.classList.toggle("starred", !isCurrentlyStarred);
        showToast(!isCurrentlyStarred ? "⭐ Starred! Added to AI winning examples." : "Unstarred.", "normal");
        if (activeLibraryFilter === "starred") {
          void renderLibrary();
        }
      }
    });
  });

  libraryContainer.querySelectorAll<HTMLButtonElement>(".load-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const item = library.find(p => p.id === id);
      if (item) {
        proposalDraftArea.value = item.proposalText;
        updateWordCount();
        if (item.projectTitle && item.projectTitle !== "Untitled Project" && item.projectTitle !== "Freelance Bid") {
          projectTitleInput.value = item.projectTitle;
        }
        switchTab("viewDraft");
        showToast("Loaded proposal into editor.", "success");
      }
    });
  });

  libraryContainer.querySelectorAll<HTMLButtonElement>(".copy-item-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = library.find(p => p.id === id);
      if (item) {
        await navigator.clipboard.writeText(item.proposalText);
        showToast("Proposal copied to clipboard!", "success");
      }
    });
  });

  libraryContainer.querySelectorAll<HTMLButtonElement>(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (id) {
        await deleteProposalFromLibrary(id);
        showToast("Deleted from library.", "normal");
        void renderLibrary();
      }
    });
  });
}

// Modify initUI to load library
async function runInit() {
  await initUI();
  await renderLibrary();
}

void runInit();