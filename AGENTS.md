# Parcel Pull

Use the user's development rules. The repository contains a standalone TypeScript and Vite game. See docs/game/BRIEF.md for the rules and .handoff/TASK.md for the delivery scope.

Reference modules are src/game/logic/game.ts for deterministic rules, src/game/render/board.ts for accessible DOM rendering, and src/i18n/ for player-facing text. Keep state and persistence independent of presentation, and keep external SDK calls inside src/platform.

Run npm run lint, npm run typecheck, npm test, npm run build and npm run test:e2e before handoff.
