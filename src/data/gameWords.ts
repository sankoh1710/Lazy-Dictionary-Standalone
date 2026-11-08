import { dictionary } from "./dictionary";
import type { GameWord } from "../lib/game";

// Hand-picked for recognisable spelling changes, without obvious homophone traps.
// Reuse the dictionary's spellings and meanings so the two experiences agree.
const selectedWords = [
  "phone", "elephant", "queen", "school", "knowledge",
  "photo", "quick", "back", "clock", "city", "center", "enough",
  "people", "ghost", "science", "psychology", "beautiful", "friend",
  "island", "wednesday", "physical", "pharmacy", "dolphin", "alphabet", "trophy",
];

export const gameWords: GameWord[] = selectedWords.map((original) => {
  const entry = dictionary.find((word) => word.word === original);
  if (!entry || entry.lazy === original) throw new Error(`Invalid game word: ${original}`);
  return {
    original, lazy: entry.lazy, hint: entry.definition,
    answers: original === "center" ? ["center", "centre"] : [original],
  };
});

// A stable introductory round also keeps pre-rendering and hydration identical.
export const firstRound = gameWords.slice(0, 5);
