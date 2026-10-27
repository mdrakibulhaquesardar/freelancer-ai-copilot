import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeText,
  normalizeStringArray,
  validateUserProfile,
  validateAppSettings,
  validateProjectData,
} from "../../src/shared/validation";
import { migrateStorageData } from "../../src/profile/migrations";
import {
  getProfile,
  saveProfile,
  getSettings,
  saveSettings,
  clearAllLocalData,
  writeRawStorage,
  saveProposalToLibrary,
  getProposalLibrary,
  updateProposalInLibrary,
  deleteProposalFromLibrary,
  getWinningProposalExamples,
} from "../../src/profile/storage";
import { STORAGE_KEYS } from "../../src/shared/constants";

describe("Validation and Normalization", () => {
  it("normalizes text and enforces length limits", () => {
    const raw = "   Hello   \n\n\n\n   World!   ";
    const normalized = normalizeText(raw, 20);
    expect(normalized).toBe("Hello \n\n World!");

    const truncated = normalizeText("12345678901234567890", 10);
    expect(truncated).toBe("1234567890");
  });

  it("normalizes string arrays and filters empty items", () => {
    const raw = ["React", "   ", 123, "TypeScript", "Node.js"];
    const result = normalizeStringArray(raw, 3, 20);
    expect(result).toEqual(["React", "TypeScript", "Node.js"]);
  });

  it("handles malformed profile and provides safe defaults", () => {
    const corrupt = { displayName: 12345, targetWordCount: -50 };
    const validated = validateUserProfile(corrupt);
    expect(validated.schemaVersion).toBe(1);
    expect(validated.displayName).toBe("");
    expect(validated.targetWordCount).toBeGreaterThanOrEqual(100);
  });
});

describe("Storage Migration", () => {
  it("migrates legacy profile and api key to version 1 contracts", () => {
    const legacyStorage = {
      profile: {
        name: "Jane Doe",
        skills: "Python, Django, PostgreSQL",
        experience: "5 years building backend APIs",
        tone: "Direct and technical",
      },
      apiKey: "sk-legacy-test-key-1234567890",
      lastProject: {
        title: "Build API",
        description: "Need Django backend",
        budget: "$500",
      },
    };

    const migration = migrateStorageData(legacyStorage);
    expect(migration.migrated).toBe(true);
    expect(migration.profile.displayName).toBe("Jane Doe");
    expect(migration.profile.skills).toEqual(["Python", "Django", "PostgreSQL"]);
    expect(migration.profile.experienceFacts).toEqual(["5 years building backend APIs"]);
    expect(migration.settings.apiKey).toBe("sk-legacy-test-key-1234567890");
    expect(migration.lastProject?.title).toBe("Build API");
  });
});

describe("Storage persistence and clear-data behavior", () => {
  beforeEach(async () => {
    await clearAllLocalData();
  });

  it("saves and retrieves user profile correctly", async () => {
    const profile = await getProfile();
    expect(profile.displayName).toBe("");

    profile.displayName = "Alex Rivers";
    profile.skills = ["Rust", "WebAssembly"];
    await saveProfile(profile);

    const reloaded = await getProfile();
    expect(reloaded.displayName).toBe("Alex Rivers");
    expect(reloaded.skills).toEqual(["Rust", "WebAssembly"]);
  });

  it("clears all local data on demand", async () => {
    await saveSettings({
      schemaVersion: 1,
      model: "gpt-4o",
      apiKey: "sk-test-key-1234567890",
      liveAdapterEnabled: false,
    });

    const settingsBefore = await getSettings();
    expect(settingsBefore.apiKey).toBe("sk-test-key-1234567890");

    await clearAllLocalData();

    const settingsAfter = await getSettings();
    expect(settingsAfter.apiKey).toBeUndefined();
  });

  it("manages proposal library, tracks won outcomes, and extracts winning examples for AI", async () => {
    // 1. Save proposal to library
    const prop1 = await saveProposalToLibrary({
      projectTitle: "Next.js E-Commerce Optimization",
      projectSnippet: "Slow SSR load times on product pages",
      proposalText: "For your Next.js SSR bottlenecks, the key is incremental static regeneration...",
      model: "llama-3.3-70b-versatile",
      starred: false,
      outcome: "pending",
    });

    const prop2 = await saveProposalToLibrary({
      projectTitle: "FastAPI Bug Fix",
      projectSnippet: "Database session leaks under concurrency",
      proposalText: "Those session leaks in FastAPI typically stem from unclosed async context managers...",
      model: "gpt-4o",
      starred: true, // Starred
      outcome: "won", // Won
    });

    const library = await getProposalLibrary();
    expect(library.length).toBe(2);
    expect(library[0]?.id).toBe(prop2.id); // prop2 was unshifted to front

    // 2. Mark prop1 as won
    const updated = await updateProposalInLibrary(prop1.id, { outcome: "won" });
    expect(updated?.outcome).toBe("won");

    // 3. Extract winning examples for AI
    const winningExamples = await getWinningProposalExamples();
    expect(winningExamples.length).toBe(2);
    expect(winningExamples[0]).toContain("FastAPI typically stem");

    // 4. Delete item
    await deleteProposalFromLibrary(prop1.id);
    const libraryAfterDelete = await getProposalLibrary();
    expect(libraryAfterDelete.length).toBe(1);
    expect(libraryAfterDelete[0]?.id).toBe(prop2.id);
  });
});

