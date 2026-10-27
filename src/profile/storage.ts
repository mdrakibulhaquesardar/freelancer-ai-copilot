import { UserProfile, AppSettings, ProjectData, ProposalDraft, SavedProposal } from "../shared/types";
import { STORAGE_KEYS, LIMITS } from "../shared/constants";
import { migrateStorageData } from "./migrations";
import {
  validateUserProfile,
  validateAppSettings,
  validateProjectData,
  validateProposalDraft,
  validateSavedProposal,
  validateProposalLibrary,
} from "../shared/validation";

// In-memory fallback store for unit tests or non-extension environments
const memoryStore: Record<string, unknown> = {};

function getStorageApi() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  return null;
}

export async function readRawStorage(): Promise<Record<string, unknown>> {
  const api = getStorageApi();
  if (api) {
    return await api.get(null);
  }
  return { ...memoryStore };
}

export async function writeRawStorage(items: Record<string, unknown>): Promise<void> {
  const api = getStorageApi();
  if (api) {
    await api.set(items);
  } else {
    Object.assign(memoryStore, items);
  }
}

export async function removeStorageKeys(keys: string[]): Promise<void> {
  const api = getStorageApi();
  if (api) {
    await api.remove(keys);
  } else {
    for (const k of keys) {
      delete memoryStore[k];
    }
  }
}

/**
 * Loads the user profile, automatically migrating legacy data if necessary.
 */
export async function getProfile(): Promise<UserProfile> {
  const raw = await readRawStorage();
  const migration = migrateStorageData(raw);
  if (migration.migrated) {
    await saveProfile(migration.profile);
    await saveSettings(migration.settings);
  }
  return migration.profile;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const validated = validateUserProfile(profile);
  await writeRawStorage({ [STORAGE_KEYS.PROFILE]: validated });
  return validated;
}

export async function getSettings(): Promise<AppSettings> {
  const raw = await readRawStorage();
  const migration = migrateStorageData(raw);
  if (migration.migrated) {
    await saveSettings(migration.settings);
  }
  return migration.settings;
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const validated = validateAppSettings(settings);
  await writeRawStorage({ [STORAGE_KEYS.SETTINGS]: validated });
  return validated;
}

export async function getLastProject(): Promise<ProjectData | null> {
  const raw = await readRawStorage();
  const val = raw[STORAGE_KEYS.LAST_PROJECT];
  return val ? validateProjectData(val) : null;
}

export async function saveLastProject(project: ProjectData | null): Promise<void> {
  if (!project) {
    await removeStorageKeys([STORAGE_KEYS.LAST_PROJECT, STORAGE_KEYS.LEGACY_LAST_PROJECT]);
  } else {
    const validated = validateProjectData(project);
    if (validated) {
      await writeRawStorage({ [STORAGE_KEYS.LAST_PROJECT]: validated });
    }
  }
}

export async function getLastProposal(): Promise<ProposalDraft | null> {
  const raw = await readRawStorage();
  const val = raw[STORAGE_KEYS.LAST_PROPOSAL];
  return val ? validateProposalDraft(val) : null;
}

export async function saveLastProposal(proposal: ProposalDraft | null): Promise<void> {
  if (!proposal) {
    await removeStorageKeys([STORAGE_KEYS.LAST_PROPOSAL, STORAGE_KEYS.LEGACY_LAST_PROPOSAL]);
  } else {
    const validated = validateProposalDraft(proposal);
    if (validated) {
      await writeRawStorage({ [STORAGE_KEYS.LAST_PROPOSAL]: validated });
    }
  }
}

/**
 * Retrieves all saved proposals in the library.
 */
export async function getProposalLibrary(): Promise<SavedProposal[]> {
  const raw = await readRawStorage();
  const val = raw[STORAGE_KEYS.PROPOSAL_LIBRARY];
  return validateProposalLibrary(val);
}

/**
 * Saves or adds a proposal to the library. If already exists (same id), updates it.
 * If new, places it at the front of the list.
 */
export async function saveProposalToLibrary(
  proposal: Omit<SavedProposal, "id" | "createdAt"> & { id?: string; createdAt?: number }
): Promise<SavedProposal> {
  const library = await getProposalLibrary();
  const id = proposal.id || `prop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = proposal.createdAt || Date.now();

  const fullItem: SavedProposal = {
    ...proposal,
    id,
    createdAt,
  };

  const validated = validateSavedProposal(fullItem);
  if (!validated) {
    throw new Error("Invalid proposal format for library");
  }

  const existingIndex = library.findIndex(p => p.id === id);
  if (existingIndex >= 0) {
    library[existingIndex] = validated;
  } else {
    library.unshift(validated);
  }

  // Enforce max limit
  const trimmed = library.slice(0, LIMITS.MAX_LIBRARY_ITEMS);
  await writeRawStorage({ [STORAGE_KEYS.PROPOSAL_LIBRARY]: trimmed });
  return validated;
}

/**
 * Updates a proposal's status, starred state, or notes in the library.
 */
export async function updateProposalInLibrary(
  id: string,
  updates: Partial<Pick<SavedProposal, "starred" | "outcome" | "notes" | "proposalText">>
): Promise<SavedProposal | null> {
  const library = await getProposalLibrary();
  const index = library.findIndex(p => p.id === id);
  if (index === -1) return null;
  const current = library[index];
  if (!current) return null;

  const updatedItem: SavedProposal = {
    ...current,
    ...updates,
  };

  const validated = validateSavedProposal(updatedItem);
  if (!validated) return null;

  library[index] = validated;
  await writeRawStorage({ [STORAGE_KEYS.PROPOSAL_LIBRARY]: library });
  return validated;
}

/**
 * Deletes a proposal from the library by ID.
 */
export async function deleteProposalFromLibrary(id: string): Promise<void> {
  const library = await getProposalLibrary();
  const filtered = library.filter(p => p.id !== id);
  await writeRawStorage({ [STORAGE_KEYS.PROPOSAL_LIBRARY]: filtered });
}

/**
 * Retrieves winning proposals (marked "won", "replied", or starred) to train and guide the AI.
 */
export async function getWinningProposalExamples(): Promise<string[]> {
  const library = await getProposalLibrary();
  const winningProposals = library.filter(
    p => p.outcome === "won" || p.outcome === "replied" || p.starred
  );

  // Return proposal texts, most recent winning first, max 3 examples
  return winningProposals.slice(0, 3).map(p => p.proposalText);
}

/**
 * Clears all local extension data (profile, settings, drafts).
 */
export async function clearAllLocalData(): Promise<void> {
  const api = getStorageApi();
  if (api) {
    await api.clear();
  } else {
    for (const key of Object.keys(memoryStore)) {
      delete memoryStore[key];
    }
  }
}
