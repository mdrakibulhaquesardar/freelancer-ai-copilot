/**
 * Core domain types for Freelancer AI Copilot.
 * Strictly adheres to PRD Section 10 data contracts.
 */

export interface PortfolioItem {
  title: string;
  description: string;
  url?: string;
  skills: string[];
}

export interface UserProfile {
  schemaVersion: 1;
  displayName: string;
  skills: string[];
  experienceFacts: string[];
  portfolioItems: PortfolioItem[];
  toneInstructions: string;
  proposalExamples: string[];
  preferredLanguage: string;
  targetWordCount: number;
  avoidPhrases: string[];
}

export interface ProjectData {
  title: string;
  description: string;
  skills: string[];
  advertisedBudget?: string;
  projectUrl?: string;
  source: "manual" | "mock" | "authorized-site";
  extractedAt: number;
}

export interface ProposalDraft {
  text: string;
  model: string;
  createdAt: number;
}

export type ProposalOutcome = "pending" | "replied" | "won" | "declined";

export interface SavedProposal {
  id: string;
  projectTitle: string;
  projectSnippet: string;
  proposalText: string;
  model: string;
  createdAt: number;
  starred: boolean;
  outcome: ProposalOutcome;
  notes?: string;
}

export type AIProvider = "groq" | "openai";

export interface AppSettings {
  schemaVersion: 1;
  provider?: AIProvider;
  model: string;
  apiKey?: string;
  liveAdapterEnabled: boolean;
  preferredBudget?: string;
}

export interface AutofillOptions {
  proposal: string;
  budget?: string;
  overwriteExisting?: boolean;
}

export interface AutofillResult {
  success: boolean;
  fieldsFilled: number;
  proposalFilled: boolean;
  budgetFilled: boolean;
  skippedFields: string[];
  message: string;
  requiresConfirmationForOverwrite?: boolean;
}

export interface GenerateProposalInput {
  profile: UserProfile;
  project: ProjectData;
  userBudget?: string;
  extraInstructions?: string;
  winningExamples?: string[];
}
