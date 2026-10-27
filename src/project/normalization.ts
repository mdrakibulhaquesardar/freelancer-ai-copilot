import { LIMITS } from "../shared/constants";
import { normalizeText, normalizeStringArray } from "../shared/validation";

/**
 * Normalizes project title, bounded to limit.
 */
export function normalizeProjectTitle(title: unknown): string {
  return normalizeText(title, LIMITS.PROJECT_TITLE_MAX);
}

/**
 * Normalizes project description, bounded to limit.
 */
export function normalizeProjectDescription(desc: unknown): string {
  return normalizeText(desc, LIMITS.PROJECT_DESCRIPTION_MAX);
}

/**
 * Normalizes a list of skills or tags extracted from a project.
 */
export function normalizeProjectSkills(skills: unknown): string[] {
  if (typeof skills === "string") {
    const list = skills.split(/[,|\n•]+/).map(s => s.trim()).filter(Boolean);
    return normalizeStringArray(list, 20, 50);
  }
  return normalizeStringArray(skills, 20, 50);
}
