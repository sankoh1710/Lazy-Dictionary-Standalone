export interface GameWord {
  original: string;
  lazy: string;
  hint: string;
  answers: string[];
}

export const ROUND_SIZE = 5;
export const MAX_GUESSES = 3;

export type Outcome = "correct" | "missed" | "skipped";
export interface WordResult {
  word: GameWord;
  outcome: Outcome;
  attempts: number;
  hintUsed: boolean;
}

export interface GameState {
  words: GameWord[];
  index: number;
  guesses: string[];
  hintUsed: boolean;
  outcome: Outcome | null;
  results: WordResult[];
  feedback: string;
}

export type GameAction =
  | { type: "guess"; value: string }
  | { type: "hint" }
  | { type: "skip" }
  | { type: "next" }
  | { type: "restart"; words: GameWord[] };

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function createGame(words: GameWord[]): GameState {
  if (words.length !== ROUND_SIZE) throw new Error("A round needs five words.");
  return { words, index: 0, guesses: [], hintUsed: false, outcome: null, results: [], feedback: "" };
}

function finishWord(state: GameState, outcome: Outcome): GameState {
  return {
    ...state,
    outcome,
    feedback: "",
    results: [...state.results, {
      word: state.words[state.index], outcome,
      attempts: state.guesses.length, hintUsed: state.hintUsed,
    }],
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "restart") return createGame(action.words);
  if (state.index >= state.words.length) return state;
  if (action.type === "next") {
    return state.outcome ? {
      ...state, index: state.index + 1, guesses: [], hintUsed: false,
      outcome: null, feedback: "",
    } : state;
  }
  if (state.outcome) return state;
  if (action.type === "hint") return { ...state, hintUsed: true };
  if (action.type === "skip") return finishWord(state, "skipped");

  const answer = normalizeAnswer(action.value);
  if (!answer) return { ...state, feedback: "Type a word first. No guess used." };
  if (state.guesses.includes(answer)) {
    return { ...state, feedback: "You tried that one already. No guess used." };
  }
  const guessed = { ...state, guesses: [...state.guesses, answer] };
  if (state.words[state.index].answers.some((word) => normalizeAnswer(word) === answer)) {
    return finishWord(guessed, "correct");
  }
  if (guessed.guesses.length === MAX_GUESSES) return finishWord(guessed, "missed");
  const remaining = MAX_GUESSES - guessed.guesses.length;
  return { ...guessed, feedback: `Not quite. ${remaining} ${remaining === 1 ? "guess" : "guesses"} left.` };
}

/** Fisher–Yates sampling; randomness is only used when a player starts another round. */
export function sampleRound(pool: GameWord[], random = Math.random): GameWord[] {
  if (pool.length < ROUND_SIZE) throw new Error("The word pool is too small.");
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, ROUND_SIZE);
}
