# Rock Paper Algorithm

A deliberately unserious offline AI rock-paper-scissors game. The tiny pretend model watches the last three player moves, predicts the player's most common move, and then confidently chooses the counter. When two moves are equally common, it picks between them at random, so a predictable pattern of play does not produce a predictable opponent. It is a playful demo of a simple adaptive policy, not machine learning.

## Run

Open `index.html` in a browser. No build step, server, account, network request, or API key is needed. The game works from `file://`.

## Check

```powershell
npm run check
```

That syntax-checks both scripts. For the behavioural tests:

```powershell
npm test
```

The tests live in `tests/app.test.mjs` and run on Node's built-in test runner with no dependencies to install. They cover the win/lose/draw matrix, the counter table, the tie-breaking rule, the three-move history cap, score and streak updates, the rendering of a round, and the live-region markup.

## Layout

- `index.html` — markup and the two script tags.
- `game.js` — the pure game logic, with no DOM access. The page loads it as a classic script and the tests require it directly.
- `app.js` — the DOM layer: reads clicks, renders state, and updates the live region.
- `style.css` — styling.

## Browser support

Any current browser. The scripts use `const`/`let`, arrow functions, destructuring, `Object.assign` and template literals, so they are not written for Internet Explorer.

The project is MIT licensed.
