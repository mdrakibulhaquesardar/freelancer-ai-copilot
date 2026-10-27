import {
  UserProfile,
  ProjectData,
  AppSettings,
  ProposalDraft,
  PortfolioItem,
  SavedProposal,
  ProposalOutcome
} from "./types";
import { LIMITS, DEFAULT_PROFILE, DEFAULT_SETTINGS } from "./constants";

/**
 * Normalizes text by trimming and collapsing excessive whitespace.
 * Applies a strict maximum length cut.
 */
export function normalizeText(text: unknown, maxLength: number): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and normalizes an array of strings.
 */
export function normalizeStringArray(arr: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => (typeof item === "string" ? normalizeText(item, maxItemLength) : ""))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

/**
 * Validates and sanitizes a portfolio item.
 */
export function validatePortfolioItem(item: unknown): PortfolioItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const title = normalizeText(raw.title, 120);
  const description = normalizeText(raw.description, 1000);
  if (!title && !description) return null;

  const url = typeof raw.url === "string" && raw.url.startsWith("http") ? raw.url.slice(0, 500) : undefined;
  const skills = normalizeStringArray(raw.skills, 20, 50);

  return {
    title,
    description,
    url,
    skills,
  };
}

/**
 * Runtime validation for UserProfile. Falls back to sensible defaults for corrupt/missing values.
 */
export function validateUserProfile(raw: unknown): UserProfile {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PROFILE };
  }
  const obj = raw as Record<string, unknown>;

  const portfolioItems: PortfolioItem[] = [];
  if (Array.isArray(obj.portfolioItems)) {
    for (const item of obj.portfolioItems) {
      const valid = validatePortfolioItem(item);
      if (valid) portfolioItems.push(valid);
      if (portfolioItems.length >= LIMITS.PROFILE_MAX_PORTFOLIO_ITEMS) break;
    }
  }

  const targetWordCount = typeof obj.targetWordCount === "number" && obj.targetWordCount >= 30 && obj.targetWordCount <= 1000
    ? Math.round(obj.targetWordCount)
    : DEFAULT_PROFILE.targetWordCount;

  return {
    schemaVersion: 1,
    displayName: normalizeText(obj.displayName, LIMITS.PROFILE_DISPLAY_NAME_MAX),
    skills: normalizeStringArray(obj.skills, LIMITS.PROFILE_MAX_SKILLS, LIMITS.PROFILE_SKILL_MAX),
    experienceFacts: normalizeStringArray(obj.experienceFacts, LIMITS.PROFILE_MAX_EXPERIENCE_FACTS, 600),
    portfolioItems,
    toneInstructions: normalizeText(obj.toneInstructions, 1500) || DEFAULT_PROFILE.toneInstructions,
    proposalExamples: normalizeStringArray(obj.proposalExamples, LIMITS.PROFILE_MAX_EXAMPLES, 2000),
    preferredLanguage: normalizeText(obj.preferredLanguage, 50) || DEFAULT_PROFILE.preferredLanguage,
    targetWordCount,
    avoidPhrases: normalizeStringArray(obj.avoidPhrases, 50, 100),
  };
}

/**
 * Runtime validation for AppSettings.
 */
export function validateAppSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const apiKey = typeof obj.apiKey === "string" ? obj.apiKey.trim().slice(0, 200) : undefined;

  // Auto-detect or validate provider
  let provider: "groq" | "openai" = DEFAULT_SETTINGS.provider;
  if (obj.provider === "openai" || obj.provider === "groq") {
    provider = obj.provider;
  } else if (apiKey?.startsWith("gsk_")) {
    provider = "groq";
  } else if (apiKey?.startsWith("sk-")) {
    provider = "openai";
  }

  const model = normalizeText(obj.model, 80) || DEFAULT_SETTINGS.model;
  const liveAdapterEnabled = Boolean(obj.liveAdapterEnabled);
  const preferredBudget = typeof obj.preferredBudget === "string" ? normalizeText(obj.preferredBudget, 100) : undefined;

  return {
    schemaVersion: 1,
    provider,
    model,
    apiKey: apiKey || undefined,
    liveAdapterEnabled,
    preferredBudget,
  };
}

/**
 * Runtime validation for ProjectData.
 */
export function validateProjectData(raw: unknown): ProjectData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const title = normalizeText(obj.title, LIMITS.PROJECT_TITLE_MAX);
  const description = normalizeText(obj.description, LIMITS.PROJECT_DESCRIPTION_MAX);

  if (!title && !description) return null;

  const validSources = ["manual", "mock", "authorized-site"] as const;
  const source = validSources.includes(obj.source as (typeof validSources)[number])
    ? (obj.source as ProjectData["source"])
    : "manual";

  return {
    title,
    description,
    skills: normalizeStringArray(obj.skills, 30, 50),
    advertisedBudget: typeof obj.advertisedBudget === "string" ? normalizeText(obj.advertisedBudget, 100) : undefined,
    projectUrl: typeof obj.projectUrl === "string" && obj.projectUrl.startsWith("http") ? obj.projectUrl.slice(0, 500) : undefined,
    source,
    extractedAt: typeof obj.extractedAt === "number" ? obj.extractedAt : Date.now(),
  };
}

/**
 * Runtime validation for ProposalDraft.
 */
export function validateProposalDraft(raw: unknown): ProposalDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text.trim().slice(0, 20000) : "";
  if (!text) return null;

  return {
    text,
    model: typeof obj.model === "string" ? obj.model.slice(0, 80) : "unknown",
    createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
  };
}

/**
 * Runtime validation for SavedProposal.
 */
export function validateSavedProposal(raw: unknown): SavedProposal | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim().slice(0, 80) : `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const proposalText = typeof obj.proposalText === "string" ? obj.proposalText.trim().slice(0, 25000) : "";
  if (!proposalText) return null;

  const projectTitle = typeof obj.projectTitle === "string" ? normalizeText(obj.projectTitle, LIMITS.PROJECT_TITLE_MAX) : "Untitled Project";
  const projectSnippet = typeof obj.projectSnippet === "string" ? normalizeText(obj.projectSnippet, 500) : "";
  const model = typeof obj.model === "string" ? obj.model.slice(0, 80) : "unknown";
  const createdAt = typeof obj.createdAt === "number" ? obj.createdAt : Date.now();
  const starred = Boolean(obj.starred);

  const validOutcomes: ProposalOutcome[] = ["pending", "replied", "won", "declined"];
  const outcome: ProposalOutcome = validOutcomes.includes(obj.outcome as ProposalOutcome)
    ? (obj.outcome as ProposalOutcome)
    : "pending";

  const notes = typeof obj.notes === "string" ? normalizeText(obj.notes, 1000) : undefined;

  return {
    id,
    projectTitle,
    projectSnippet,
    proposalText,
    model,
    createdAt,
    starred,
    outcome,
    notes,
  };
}

/**
 * Runtime validation for an array of saved proposals.
 */
export function validateProposalLibrary(raw: unknown): SavedProposal[] {
  if (!Array.isArray(raw)) return [];
  const results: SavedProposal[] = [];
  for (const item of raw) {
    const valid = validateSavedProposal(item);
    if (valid) results.push(valid);
    if (results.length >= LIMITS.MAX_LIBRARY_ITEMS) break;
  }
  return results;
}

