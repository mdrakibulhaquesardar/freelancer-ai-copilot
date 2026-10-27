/**
 * Shared constants, storage keys, default models, and bounded limits.
 */

export const STORAGE_KEYS = {
  PROFILE: "profile_v1",
  SETTINGS: "settings_v1",
  LAST_PROJECT: "last_project_v1",
  LAST_PROPOSAL: "last_proposal_v1",
  PROPOSAL_LIBRARY: "proposal_library_v1",
  // Legacy keys for migration support
  LEGACY_PROFILE: "profile",
  LEGACY_API_KEY: "apiKey",
  LEGACY_LAST_PROJECT: "lastProject",
  LEGACY_LAST_PROPOSAL: "lastProposal",
} as const;

export const GROQ_CHAT_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
export const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";
export const OPENAI_CHAT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_MODEL = DEFAULT_GROQ_MODEL;

export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
] as const;

export const OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.5-preview",
  "o3-mini",
] as const;

export const LIMITS = {
  PROJECT_TITLE_MAX: 300,
  PROJECT_DESCRIPTION_MAX: 12000,
  PROPOSAL_MAX_TOKENS: 2048,
  PROFILE_DISPLAY_NAME_MAX: 100,
  PROFILE_SKILL_MAX: 50,
  PROFILE_MAX_SKILLS: 50,
  PROFILE_MAX_EXPERIENCE_FACTS: 30,
  PROFILE_MAX_PORTFOLIO_ITEMS: 15,
  PROFILE_MAX_EXAMPLES: 5,
  MAX_LIBRARY_ITEMS: 60,
  REQUEST_TIMEOUT_MS: 45000,
} as const;

export const DEFAULT_SETTINGS = {
  schemaVersion: 1 as const,
  provider: "groq" as const,
  model: DEFAULT_GROQ_MODEL,
  liveAdapterEnabled: false,
};

export const DEFAULT_PROFILE = {
  schemaVersion: 1 as const,
  displayName: "",
  skills: [],
  experienceFacts: [],
  portfolioItems: [],
  toneInstructions: "Direct, professional, authentic, concise.",
  proposalExamples: [],
  preferredLanguage: "English",
  targetWordCount: 160,
  avoidPhrases: [
    "Dear Hiring Manager",
    "I am thrilled to apply",
    "rockstar developer",
    "ninja",
    "guaranteed satisfaction"
  ],
};
