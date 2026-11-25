# Contributing

Thanks for helping. The most useful contributions are, in order: a measured pH that bufferbench predicts badly (with the
recipe, the temperature and how the meter was calibrated), a certified or carefully measured reference buffer that could
join the benchmark, and a reagent or buffer that is missing.

## Setup

Development needs Node.js 24 or later, because tests and scripts run the TypeScript sources directly.
(The built package runs on Node.js 20 and later.)

```bash
npm ci
npm test                          # unit, data, model, recipe, CLI and benchmark tests
npm run typecheck
node scripts/benchmark.ts         # regenerate docs/VALIDATION.md, benchmark/results.json, src/accuracy.ts
node scripts/gen-docs.ts          # regenerate docs/BUFFERS.md and the generated parts of the READMEs
npm run build:web && npm run serve   # web app at http://localhost:4174
```

There are no runtime dependencies and there should not be any: the library has to run unchanged in a browser.

## Rules

- **Every constant needs a primary source**: paper, page, table and row. Write it in the pull request and, for a new
  system, in the `section`/`page` fields. See [docs/DATA.md](docs/DATA.md) for how the existing data were transcribed
  and checked.
- **The benchmark only compares.** A change made to improve agreement with `benchmark/certified.ts` will not be accepted
  unless it is independently justified (a better primary source, a physical effect with its own data).
- **Numbers in the READMEs and the web app come from generated files.** CI fails if `docs/VALIDATION.md`,
  `benchmark/results.json`, `src/accuracy.ts`, `docs/BUFFERS.md` or the README blocks differ from a fresh run.
- **Notes and errors are codes.** Every code needs English and Chinese text in `src/messages.ts`; a test checks this.
- **Say what you verified and how** in the pull request. Contributions are licensed under GPL-3.0, like the rest of the
  project.

## Releasing (maintainers)

1. Update `version` in `package.json` and `VERSION` in `src/version.ts` (a test checks they agree), and `CHANGELOG.md`.
2. `npm test && node scripts/benchmark.ts --check && node scripts/gen-docs.ts --check`.
3. Tag `vX.Y.Z` and push the tag; the release workflow publishes to npm.
