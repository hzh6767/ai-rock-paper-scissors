(() => {
  "use strict";

  const moves = ["rock", "paper", "scissors"];
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };
  const counters = { rock: "paper", paper: "scissors", scissors: "rock" };
  const labels = { rock: "ROCK", paper: "PAPER", scissors: "SCISSORS" };
  const taunts = [
    "The neural network has filed a strongly worded complaint.",
    "A statistically significant amount of nonsense occurred.",
    "The model claims this was intentional.",
    "Confidence: decorative. Accuracy: negotiable."
  ];
  const state = { player: 0, ai: 0, round: 1, streak: 0, history: [] };
  const $ = (id) => document.getElementById(id);

  function chooseAi() {
    if (state.history.length === 0) return moves[Math.floor(Math.random() * moves.length)];
    const counts = state.history.reduce((all, move) => { all[move] += 1; return all; }, { rock: 0, paper: 0, scissors: 0 });
    const mostUsed = moves.reduce((best, move) => counts[move] > counts[best] ? move : best, moves[0]);
    return counters[mostUsed];
  }

  function play(playerMove) {
    const aiMove = chooseAi();
    state.history.push(playerMove);
    state.history = state.history.slice(-3);
    let result;
    if (playerMove === aiMove) result = "draw";
    else if (beats[playerMove] === aiMove) { result = "win"; state.player += 1; state.streak += 1; }
    else { result = "lose"; state.ai += 1; state.streak = 0; }
    $("player-choice").textContent = labels[playerMove];
    $("ai-choice").textContent = labels[aiMove];
    $("player-score").textContent = state.player;
    $("ai-score").textContent = state.ai;
    $("round-label").textContent = `ROUND ${state.round}`;
    $("streak").textContent = `Streak: ${state.streak}`;
    $("status").textContent = result === "win" ? "You win." : result === "lose" ? "AI wins." : "Draw.";
    $("status").className = result === "win" ? "win" : result === "lose" ? "lose" : "";
    $("analysis").textContent = `${taunts[Math.floor(Math.random() * taunts.length)]} It predicted ${labels[aiMove].toLowerCase()}.`;
    state.round += 1;
  }

  document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => play(button.dataset.move)));
  $("reset").addEventListener("click", () => { state.player = 0; state.ai = 0; state.round = 1; state.streak = 0; state.history = []; ["player-choice", "ai-choice"].forEach((id) => $(id).textContent = "?"); $("player-score").textContent = "0"; $("ai-score").textContent = "0"; $("round-label").textContent = "ROUND 1"; $("status").textContent = "Choose a move."; $("status").className = ""; $("analysis").textContent = "The algorithm is waiting for a data point."; $("streak").textContent = "Streak: 0"; });
})();
