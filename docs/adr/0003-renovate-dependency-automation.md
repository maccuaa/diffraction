# Renovate for dependency updates, with CDN assets tracked via cdnjs

Diffraction now uses Renovate, extending the shared `github>maccuaa/renovate-config` preset, to keep dependencies current — including auto-merging passing updates. Since automerge previously had no CI to gate on, we added a minimal `npm test` GitHub Actions workflow and made it a required status check, so GitHub's platform automerge (which Renovate relies on) can't merge over a red or pending build.

The Pico CSS `<link>` moved from jsdelivr to cdnjs (verified byte-identical content) because Renovate's built-in `html` manager only supports the `cdnjs` datasource, and it's the only manager that can update a Subresource Integrity hash automatically alongside a version bump. Without this, adding SRI would have meant either freezing Pico's version indefinitely or risking automerge shipping a version/hash mismatch that breaks the stylesheet. jsdiff's version — embedded both in `package.json` and in the `index.html` import map (via esm.sh) — is tracked with a custom regex manager grouped into the same PR as the npm entry, so the two pins can't drift apart. cdnjs wasn't viable for jsdiff itself: its build there is a UMD bundle, not an ES module, so it can't back the import map.

## Consequences

Branch protection on `main` requires the test workflow's check to pass. Without this, GitHub's automerge ignores non-required checks entirely and can merge regardless of their outcome — the workflow alone is not a safety net.
