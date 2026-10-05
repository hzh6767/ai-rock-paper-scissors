(() => {
  "use strict";

  const { labels, chooseAiMove, initialState, nextState, describeRound } = RPS;
  const state = initialState();
  const $ = (id) => document.getElementById(id);

  // The live region is #status only, so each move announces one sentence
  // instead of the whole arena.
  function announce(text, className) {
    const status = $("status");
    status.textContent = text;
    status.className = className || "";
  }

  function play(playerMove) {
    const aiMove = chooseAiMove(state.history);
    const turn = nextState(state, playerMove, aiMove);
    Object.assign(state, turn.state);

    $("player-choice").textContent = labels[playerMove];
    $("ai-choice").textContent = labels[aiMove];
    $("player-score").textContent = state.player;
    $("ai-score").textContent = state.ai;
    $("round-label").textContent = `ROUND ${state.round}`;
    $("streak").textContent = `Streak: ${state.streak}`;
    announce(
      turn.result === "win" ? `You win. AI played ${labels[aiMove]}.`
        : turn.result === "lose" ? `AI wins. AI played ${labels[aiMove]}.`
        : `Draw. You both played ${labels[aiMove]}.`,
      turn.result === "win" ? "win" : turn.result === "lose" ? "lose" : ""
    );
    $("analysis").textContent = describeRound(aiMove);
  }

  document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => play(button.dataset.move)));
  $("reset").addEventListener("click", () => {
    Object.assign(state, initialState());
    ["player-choice", "ai-choice"].forEach((id) => { $(id).textContent = "?"; });
    $("player-score").textContent = "0";
    $("ai-score").textContent = "0";
    $("round-label").textContent = "ROUND 1";
    $("streak").textContent = "Streak: 0";
    announce("Choose a move.");
    $("analysis").textContent = "The algorithm is waiting for a data point.";
  });
})();
