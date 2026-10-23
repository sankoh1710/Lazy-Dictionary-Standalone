/**
 * Shared by the React form and the server API.
 * Keep validation on the server even though the browser also validates.
 */
export interface SpellingSubmission {
  original_word: string;
  suggested_spelling: string;
}

export type ValidationResult =
  | { ok: true; value: SpellingSubmission }
  | { ok: false; error: string };

const spellingPattern = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;

export function validateSpellingSubmission(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Provide an English word and a suggested spelling." };
  }

  const values = input as Record<string, unknown>;
  if (
    typeof values.original_word !== "string" ||
    typeof values.suggested_spelling !== "string"
  ) {
    return { ok: false, error: "Both spelling fields are required." };
  }

  const original = values.original_word.trim().toLowerCase();
  const suggested = values.suggested_spelling.trim().toLowerCase();

  if (!original || !suggested) {
    return { ok: false, error: "Enter both the English word and your suggested spelling." };
  }

  if (original.length > 60 || suggested.length > 60) {
    return { ok: false, error: "Each word must be 60 characters or fewer." };
  }

  if (!spellingPattern.test(original) || !spellingPattern.test(suggested)) {
    return {
      ok: false,
      error: "Use English letters, with optional internal apostrophes or hyphens.",
    };
  }

  if (original === suggested) {
    return { ok: false, error: "Try a different spelling for the original word." };
  }

  return {
    ok: true,
    value: { original_word: original, suggested_spelling: suggested },
  };
}
