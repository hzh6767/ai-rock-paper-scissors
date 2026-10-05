// Pure game logic, no DOM. Loaded as a classic script by index.html and
// required directly by the tests under Node.
(function (root) {
  "use strict";

  var moves = ["rock", "paper", "scissors"];
  var beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  var counters = { rock: "paper", paper: "scissors", scissors: "rock" };
  var labels = { rock: "ROCK", paper: "PAPER", scissors: "SCISSORS" };
  var taunts = [
    "The neural network has filed a strongly worded complaint.",
    "A statistically significant amount of nonsense occurred.",
    "The model claims this was intentional.",
    "Confidence: decorative. Accuracy: negotiable."
  ];
  var HISTORY_LIMIT = 3;
  var EMPTY_HISTORY = { rock: 0, paper: 0, scissors: 0 };

  function pick(list, random) {
    return list[Math.floor(random() * list.length)];
  }

  function countMoves(history) {
    return history.reduce(function (all, move) { all[move] += 1; return all; }, Object.assign({}, EMPTY_HISTORY));
  }

  // All moves tied for most-used in the history. Ties are kept, not resolved
  // here, so the caller can pick randomly between them.
  function mostUsedMoves(history) {
    var counts = countMoves(history);
    var top = moves.reduce(function (max, move) { return counts[move] > max ? counts[move] : max; }, 0);
    return moves.filter(function (move) { return counts[move] === top; });
  }

  function chooseAiMove(history, random) {
    var rng = random || Math.random;
    if (!history || history.length === 0) return pick(moves, rng);
    return counters[pick(mostUsedMoves(history), rng)];
  }

  function resolveRound(playerMove, aiMove) {
    if (playerMove === aiMove) return "draw";
    return beats[playerMove] === aiMove ? "win" : "lose";
  }

  function initialState() {
    return { player: 0, ai: 0, round: 1, streak: 0, history: [] };
  }

  // Pure state transition. Returns a new state plus the freshly rolled AI move
  // so the caller can render it.
  function nextState(state, playerMove, aiMove) {
    var result = resolveRound(playerMove, aiMove);
    var history = state.history.concat([playerMove]).slice(-HISTORY_LIMIT);
    return {
      state: {
        player: state.player + (result === "win" ? 1 : 0),
        ai: state.ai + (result === "lose" ? 1 : 0),
        round: state.round + 1,
        streak: result === "win" ? state.streak + 1 : 0,
        history: history
      },
      result: result,
      aiMove: aiMove
    };
  }

  function describeRound(aiMove, random) {
    var rng = random || Math.random;
    return pick(taunts, rng) + " It predicted " + labels[aiMove].toLowerCase() + ".";
  }

  var api = {
    moves: moves,
    beats: beats,
    counters: counters,
    labels: labels,
    taunts: taunts,
    HISTORY_LIMIT: HISTORY_LIMIT,
    countMoves: countMoves,
    mostUsedMoves: mostUsedMoves,
    chooseAiMove: chooseAiMove,
    resolveRound: resolveRound,
    initialState: initialState,
    nextState: nextState,
    describeRound: describeRound
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RPS = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
