# Parcel Pull

A bilingual browser puzzle with fifteen levels. Activate an edge magnet to pull parcels one cell toward it. A parcel leaves the board when its matching dock pulls it from the edge.

## Run locally

Use the Node.js version in `.nvmrc`, then run:

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Use a mouse, touch, or Tab and Enter/Space. In play, Z undoes a move, R restarts, and Escape pauses. Settings has the sound toggle and the English/Czech language selector.

`npm run build` produces a static site in `dist/`. Use `npm run preview` to serve that build locally.

## Verify

```sh
npx playwright install chromium
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright starts a dedicated Vite server on port 43273. Use `E2E_PORT` to select another port. In environments where Chromium must run in a single process, set `PARCEL_TEST_SINGLE_PROCESS=1` to isolate each test's browser while retaining parallel workers. To regenerate the reachability tables, run `node tools/solver/generate.ts`. To reproduce the three advanced board selections, run `node tools/solver/generate-hard.ts`.
