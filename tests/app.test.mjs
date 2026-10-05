import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// game.js is a classic script (no ES module syntax) so the page can load it
// straight from file://. createRequire lets Node pull the same file in.
const require = createRequire(import.meta.url);
const RPS = require("../game.js");
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const MOVES = ["rock", "paper", "scissors"];

test("beats and counters tables are mutually consistent", () => {
  for (const m of MOVES) {
    // beats is a three-cycle (rock > scissors > paper > rock), so applying it
    // three times returns the starting move.
    assert.equal(RPS.beats[RPS.beats[RPS.beats[m]]], m, `beats cycles back to ${m}`);
    assert.notEqual(RPS.beats[m], m, `${m} cannot beat itself`);
    // counters[m] is the move that beats m, so feeding it to beats yields m.
    assert.equal(RPS.beats[RPS.counters[m]], m, `counters.${m} beats ${m}`);
  }
});

test("resolveRound covers all nine matchups", () => {
  const expected = {
    "rock:rock": "draw", "rock:paper": "lose", "rock:scissors": "win",
    "paper:rock": "win", "paper:paper": "draw", "paper:scissors": "lose",
    "scissors:rock": "lose", "scissors:paper": "win", "scissors:scissors": "draw"
  };
  for (const p of MOVES) {
    for (const a of MOVES) {
      assert.equal(RPS.resolveRound(p, a), expected[`${p}:${a}`], `${p} vs ${a}`);
    }
  }
});

test("chooseAiMove falls back to a random legal move on an empty history", () => {
  const seen = new Set();
  for (let i = 0; i < 60; i += 1) seen.add(RPS.chooseAiMove([], Math.random));
  for (const m of seen) assert.ok(MOVES.includes(m), `${m} is a legal move`);
  assert.ok(seen.size > 1, "empty history does not always produce the same move");
});

test("countMoves tallies each move and does not leak state between calls", () => {
  assert.deepEqual(RPS.countMoves(["rock", "rock", "paper"]), { rock: 2, paper: 1, scissors: 0 });
  const counts = RPS.countMoves(["scissors"]);
  counts.rock = 99;
  assert.equal(RPS.countMoves([]).rock, 0, "later calls start from a clean tally");
});

test("mostUsedMoves returns every move tied for the top count", () => {
  assert.deepEqual(RPS.mostUsedMoves(["rock", "rock", "paper"]), ["rock"]);
  assert.deepEqual(RPS.mostUsedMoves(["rock", "paper"]), ["rock", "paper"]);
  assert.deepEqual(RPS.mostUsedMoves(["rock", "paper", "scissors"]), MOVES);
});

// Regression: the old seed-and-strict-> reducer resolved every tie to "rock",
// so a tied history always produced the same scripted answer.
test("a tied history is not resolved to a single fixed move", () => {
  const low = RPS.chooseAiMove(["rock", "paper"], () => 0);
  const high = RPS.chooseAiMove(["rock", "paper"], () => 0.999);
  assert.equal(low, "paper", "rng 0 picks the first tied move, countered");
  assert.equal(high, "scissors", "rng near 1 picks the other tied move, countered");
  assert.notEqual(low, high, "tie is randomised rather than always rock");
});

test("chooseAiMove counters the most common move", () => {
  assert.equal(RPS.chooseAiMove(["scissors", "scissors", "rock"], () => 0), RPS.counters.scissors);
  assert.equal(RPS.chooseAiMove(["paper", "paper", "rock"], () => 0), RPS.counters.paper);
});

test("nextState scores, streaks and caps history at three moves", () => {
  let state = RPS.initialState();
  assert.deepEqual(state, { player: 0, ai: 0, round: 1, streak: 0, history: [] });

  let turn = RPS.nextState(state, "rock", "scissors");
  state = turn.state;
  assert.equal(turn.result, "win");
  assert.equal(state.player, 1);
  assert.equal(state.ai, 0);
  assert.equal(state.streak, 1);
  assert.equal(state.round, 2);

  turn = RPS.nextState(state, "rock", "paper");
  state = turn.state;
  assert.equal(turn.result, "lose");
  assert.equal(state.ai, 1);
  assert.equal(state.streak, 0, "a loss resets the streak");

  turn = RPS.nextState(state, "rock", "rock");
  state = turn.state;
  assert.equal(turn.result, "draw");
  assert.equal(state.player, 1);
  assert.equal(state.ai, 1);
  assert.equal(state.streak, 0, "a draw resets the streak");

  for (const m of ["paper", "paper", "scissors", "paper"]) {
    state = RPS.nextState(state, m, "rock").state;
  }
  assert.equal(state.history.length, RPS.HISTORY_LIMIT);
  // Player moves so far: rock, rock, rock, paper, paper, scissors, paper.
  assert.deepEqual(state.history, ["paper", "scissors", "paper"], "only the last three moves are kept");
});

test("nextState does not mutate the state it is given", () => {
  const state = RPS.initialState();
  const snapshot = JSON.stringify(state);
  RPS.nextState(state, "rock", "scissors");
  assert.equal(JSON.stringify(state), snapshot);
});

test("describeRound names the AI move it predicted", () => {
  const text = RPS.describeRound("scissors", () => 0);
  assert.ok(RPS.taunts.includes(text.replace(" It predicted scissors.", "")), "reuses a taunt verbatim");
  assert.ok(text.endsWith("It predicted scissors."), "states the AI move");
});

// The page loads game.js then app.js as classic scripts. Run the same wiring
// against a stub DOM to catch a mistyped element id or a broken click handler.
test("app.js wires every element the page defines", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const moves = [...html.matchAll(/data-move="([^"]+)"/g)].map((m) => m[1]);
  const handlers = new Map();
  const nodes = new Map();
  const makeNode = (id) => {
    const node = {
      id,
      textContent: "",
      className: "",
      dataset: { move: moves.includes(id) ? id : undefined },
      addEventListener: (type, fn) => handlers.set(`${id}:${type}`, fn)
    };
    nodes.set(id, node);
    return node;
  };
  for (const id of ids) makeNode(id);
  for (const m of moves) makeNode(m);

  const document = {
    getElementById: (id) => nodes.get(id) || makeNode(id),
    querySelectorAll: (sel) => (sel === "[data-move]" ? moves.map((m) => nodes.get(m)) : [])
  };

  const ctx = vm.createContext({ document, RPS, console });
  vm.runInContext(readFileSync(join(root, "game.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(root, "app.js"), "utf8"), ctx);

  for (const m of moves) {
    assert.ok(handlers.has(`${m}:click`), `${m} has a click handler`);
    handlers.get(`${m}:click`)();
  }
  assert.ok(handlers.has("reset:click"), "reset has a click handler");
  assert.ok(handlers.has("status:click") === false, "status is output only");
  handlers.get("reset:click")();

  const status = nodes.get("status");
  assert.equal(status.textContent, "Choose a move.", "reset restores the prompt");
  assert.equal(nodes.get("player-score").textContent, "0");
  assert.equal(nodes.get("ai-score").textContent, "0");
  assert.equal(nodes.get("round-label").textContent, "ROUND 1");
  assert.equal(nodes.get("streak").textContent, "Streak: 0");
  assert.equal(nodes.get("player-choice").textContent, "?");
  assert.equal(nodes.get("ai-choice").textContent, "?");

  handlers.get("rock:click")();
  assert.match(String(nodes.get("round-label").textContent), /^ROUND 2$/, "round advances after a move");
  assert.ok(MOVES.map((m) => RPS.labels[m]).includes(nodes.get("player-choice").textContent));
  assert.ok(MOVES.map((m) => RPS.labels[m]).includes(nodes.get("ai-choice").textContent));
  assert.ok(["win", "lose", ""].includes(status.className));
});

test("index.html scopes the live region to the status node only", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const arenaTag = html.match(/<section class="arena"[^>]*>/)[0];
  assert.ok(!/aria-live/.test(arenaTag), "the whole arena is no longer a live region");
  const statusTag = html.match(/<span id="status"[^>]*>/)[0];
  assert.ok(/aria-live="polite"/.test(statusTag), "status is the live region");
  assert.ok(/role="status"/.test(statusTag));
  assert.equal((html.match(/aria-live/g) || []).length, 1, "exactly one live region remains");
});

test("decorative subtitles stay out of the move button names", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  for (const joke of ["solid logic", "bureaucratic shield", "sharp optimism"]) {
    const re = new RegExp(`<small aria-hidden="true">${joke}</small>`);
    assert.ok(re.test(html), `"${joke}" is aria-hidden`);
  }
  assert.equal((html.match(/<small(?! aria-hidden)/g) || []).length, 0, "no un-hidden subtitles remain");
});
