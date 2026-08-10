# AGENTS.md

Diffraction is a client-side tool that diffs two blocks of text or code — runs entirely in the browser, no server, no build step.

## Read first
- `CONTEXT.md` — domain glossary. Check before naming things Before/After/Left/Right/Source/Target; this project has opinions (Original, Changed, Diff).
- `docs/adr/` — architecture decisions. Check before changing the diff engine, deployment, or dependency strategy; each is a short paragraph, worth the read.

## Layout
- `src/diff-logic.js` — pure diff computation, the only unit-tested module (`test/`).
- `src/app.js` — DOM wiring and UI state, untested by design.
- `index.html`, `style.css` — the rest of the app.

## Conventions
- Vanilla ES modules served directly, per `docs/adr/0002-no-build-vanilla.md`. Don't add a bundler, TypeScript, or a runtime npm dependency without revisiting that decision.
- Tests use Node's built-in `node:test` + `node:assert/strict`, not Jest/Mocha. Run with `npm test`.

## Dependency gotchas
- Pico CSS is pinned in `index.html` with a Subresource Integrity hash served from cdnjs — bumping the version means regenerating the hash, not just the URL.
- `diff` (jsdiff) is pinned in two places: `package.json` (tests) and the `index.html` import map via esm.sh (what the browser actually runs). Keep them in lockstep.
- `.github/renovate.json` automates both safely — see `docs/adr/0003-renovate-dependency-automation.md` for why.
