import { UserProfile, AppSettings, ProjectData, ProposalDraft } from "../shared/types";
import { validateUserProfile, validateAppSettings, validateProjectData, validateProposalDraft } from "../shared/validation";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants";

export interface MigrationResult {
  profile: UserProfile;
  settings: AppSettings;
  lastProject?: ProjectData | null;
  lastProposal?: ProposalDraft | null;
  migrated: boolean;
}

/**
 * Migrates old or unversioned storage shapes into clean V1 contracts.
 */
export function migrateStorageData(allStorage: Record<string, unknown>): MigrationResult {
  let migrated = false;

  // 1. Profile migration
  let profile: UserProfile;
  if (allStorage[STORAGE_KEYS.PROFILE]) {
    profile = validateUserProfile(allStorage[STORAGE_KEYS.PROFILE]);
  } else if (allStorage[STORAGE_KEYS.LEGACY_PROFILE]) {
    migrated = true;
    const legacy = allStorage[STORAGE_KEYS.LEGACY_PROFILE] as Record<string, unknown>;
    const skills = typeof legacy.skills === "string"
      ? legacy.skills.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean)
      : [];
    const experienceFacts = typeof legacy.experience === "string" && legacy.experience.trim()
      ? [legacy.experience.trim()]
      : [];
    profile = validateUserProfile({
      ...DEFAULT_PROFILE,
      displayName: legacy.name ?? "",
      skills,
      experienceFacts,
      toneInstructions: legacy.tone || DEFAULT_PROFILE.toneInstructions,
    });
  } else {
    profile = { ...DEFAULT_PROFILE };
  }

  // 2. Settings migration
  let settings: AppSettings;
  if (allStorage[STORAGE_KEYS.SETTINGS]) {
    settings = validateAppSettings(allStorage[STORAGE_KEYS.SETTINGS]);
  } else {
    const legacyKey = typeof allStorage[STORAGE_KEYS.LEGACY_API_KEY] === "string"
      ? (allStorage[STORAGE_KEYS.LEGACY_API_KEY] as string)
      : undefined;
    if (legacyKey) {
      migrated = true;
    }
    settings = validateAppSettings({
      ...DEFAULT_SETTINGS,
      apiKey: legacyKey,
    });
  }

  // 3. Last project migration
  let lastProject: ProjectData | null = null;
  if (allStorage[STORAGE_KEYS.LAST_PROJECT]) {
    lastProject = validateProjectData(allStorage[STORAGE_KEYS.LAST_PROJECT]);
  } else if (allStorage[STORAGE_KEYS.LEGACY_LAST_PROJECT]) {
    migrated = true;
    const rawLegacy = allStorage[STORAGE_KEYS.LEGACY_LAST_PROJECT] as Record<string, unknown>;
    lastProject = validateProjectData({
      title: rawLegacy.title,
      description: rawLegacy.description,
      advertisedBudget: rawLegacy.budget,
      source: "manual",
      extractedAt: Date.now(),
    });
  }

  // 4. Last proposal migration
  let lastProposal: ProposalDraft | null = null;
  if (allStorage[STORAGE_KEYS.LAST_PROPOSAL]) {
    lastProposal = validateProposalDraft(allStorage[STORAGE_KEYS.LAST_PROPOSAL]);
  } else if (typeof allStorage[STORAGE_KEYS.LEGACY_LAST_PROPOSAL] === "string") {
    migrated = true;
    lastProposal = validateProposalDraft({
      text: allStorage[STORAGE_KEYS.LEGACY_LAST_PROPOSAL],
      model: settings.model,
      createdAt: Date.now(),
    });
  }

  return {
    profile,
    settings,
    lastProject,
    lastProposal,
    migrated,
  };
}
