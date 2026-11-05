# 7-Simul Memo Trainer

A browser-based trainer for memorizing 7-simul scrambles. The app displays a virtual clock, generates or accepts scrambles, and lets you enter a memo and check it against the correct memo. Enable execution trainer mode to see the memo automatically for execution practice.

## Features

- Choose **BPaul**, **Tommy**, or **Custom** memo settings.
- Generate random scrambles or enter a scramble yourself.
- In Custom mode, configure the pin order, memo pairs, and left/right hand preferences for U/D moves where applicable.
- Customize the 12-character memo input mapping, choose **x2** or **y2** flips, hide hour indicators, and swap M3/M4 when available.
- Enter memo with your keyboard or optional on-screen buttons.
- Track total solves, success rate, and current streak across five sessions. Practice mode skips recording attempts. Export session history as CSV, delete individual attempts, or clear a session.
- Preferences and attempt history are saved in this browser.

## Quick start

Requires Node.js and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (by default, port **5174**; set `PORT` to override it).

## Usage and controls

1. Select a memo type and generate a scramble with **S** or the scramble button, or use **Enter Scramble** to provide one.
2. Memorize the scramble starting from the face shown, flipping the virtual clock as needed.
3. Enter your memo and check it. The app indicates whether it matches the correct memo.

| Action | Control |
| --- | --- |
| Flip the clock | **Space** or click the clock |
| Rotate the clock | **Arrow keys** or the rotation buttons (← z′, → z, ↑ x2, ↓ y2) |
| Generate a scramble | **S** or the scramble button |
| Check the memo | **Enter** or the check button |
| Delete an input character | **Backspace** or the delete button |
| Copy the scramble | Click the scramble text or copy button |

Space only turns the view. Before entering memo, arrows set the starting orientation. After you have begun to enter memo, they only turn the view.

Use **Settings** to adjust memo input and clock options. **Stats Settings** contains practice mode, session selection, CSV export, and history management.

## Project commands

```sh
npm run dev       # Start the Vite development server
npm run build     # Build the production app into dist/
npm run lint      # Run Oxlint
npm run preview   # Preview the production build locally
```

`npm run deploy` builds the app and publishes `dist/` with `gh-pages`. It requires the repository's GitHub Pages setup and permission to publish to it.

## Data and credits

Preferences and stats are stored in the browser's `localStorage`; they are not synced to an account or other browsers. Clearing browser storage can remove this data.

Clock design: [Kusano](https://sanya.sweetduet.info/cube/7simul_trainer/). Logic adapted from [JoshM2](https://joshm2.github.io/7-Simul/) and [Caleb Fox](https://github.com/cafox12503).
