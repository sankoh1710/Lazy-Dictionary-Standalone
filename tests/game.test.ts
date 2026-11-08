import test from "node:test";
import assert from "node:assert/strict";
import { createGame, gameReducer, sampleRound, type GameWord } from "../src/lib/game.ts";

const words: GameWord[] = ["phone", "elephant", "queen", "school", "center"].map((original) => ({
  original, lazy: original + "-lazy", hint: "A meaning clue.",
  answers: original === "center" ? ["center", "centre"] : [original],
}));

test("accepts case and surrounding spaces, then locks a solved word", () => {
  const state = gameReducer(createGame(words), { type: "guess", value: "  PHONE  " });
  assert.equal(state.outcome, "correct");
  assert.equal(state.results.length, 1);
  assert.equal(state.results[0].attempts, 1);
  assert.deepEqual(gameReducer(state, { type: "guess", value: "wrong" }), state);
  assert.deepEqual(gameReducer(state, { type: "skip" }), state);
});

test("blank and duplicate guesses do not consume attempts", () => {
  let state = gameReducer(createGame(words), { type: "guess", value: "  " });
  assert.equal(state.guesses.length, 0);
  state = gameReducer(state, { type: "guess", value: "wrong" });
  state = gameReducer(state, { type: "guess", value: " WRONG " });
  assert.equal(state.guesses.length, 1);
  assert.equal(state.outcome, null);
});

test("reveals after exactly three wrong guesses, without advancing automatically", () => {
  let state = createGame(words);
  for (const value of ["one", "two", "three"]) state = gameReducer(state, { type: "guess", value });
  assert.equal(state.outcome, "missed");
  assert.equal(state.index, 0);
  assert.equal(state.results[0].attempts, 3);
  assert.equal(gameReducer(state, { type: "next" }).index, 1);
});

test("a correct final guess still counts as a solve", () => {
  let state = createGame(words);
  for (const value of ["one", "two", "phone"]) state = gameReducer(state, { type: "guess", value });
  assert.equal(state.outcome, "correct");
  assert.equal(state.results[0].attempts, 3);
});

test("records hints and resets them for the next word", () => {
  let state = gameReducer(createGame(words), { type: "hint" });
  state = gameReducer(state, { type: "guess", value: "phone" });
  assert.equal(state.results[0].hintUsed, true);
  state = gameReducer(state, { type: "next" });
  assert.equal(state.hintUsed, false);
  assert.equal(state.guesses.length, 0);
  assert.equal(state.outcome, null);
});

test("cannot advance an unanswered word; skipping reveals it once", () => {
  let state = createGame(words);
  assert.deepEqual(gameReducer(state, { type: "next" }), state);
  state = gameReducer(state, { type: "skip" });
  assert.equal(state.outcome, "skipped");
  assert.equal(state.results[0].attempts, 0);
  assert.equal(gameReducer(state, { type: "skip" }).results.length, 1);
});

test("finishes a mixed round, accepts a spelling variant, and restarts cleanly", () => {
  let state = createGame(words);
  for (let i = 0; i < words.length; i++) {
    state = gameReducer(state, i === 1 ? { type: "skip" } : { type: "guess", value: i === 4 ? "centre" : words[i].original });
    state = gameReducer(state, { type: "next" });
  }
  assert.equal(state.index, 5);
  assert.equal(state.results.filter((result) => result.outcome === "correct").length, 4);
  assert.deepEqual(gameReducer(state, { type: "guess", value: "anything" }), state);
  assert.deepEqual(gameReducer(state, { type: "restart", words }), createGame(words));
});

test("samples five distinct entries without mutating the pool", () => {
  const pool = [...words, { ...words[0], original: "extra" }];
  const original = [...pool];
  const round = sampleRound(pool, () => 0.25);
  assert.equal(round.length, 5);
  assert.equal(new Set(round.map((word) => word.original)).size, 5);
  assert.deepEqual(pool, original);
  assert.throws(() => createGame([]));
  assert.throws(() => sampleRound([]));
});
