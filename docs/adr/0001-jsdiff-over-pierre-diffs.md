# Use jsdiff instead of @pierre/diffs for the diff engine

@pierre/diffs offers a batteries-included diff renderer (split/stacked layouts, Shiki-powered syntax highlighting, themes) built on top of jsdiff, but it's ESM-only and pulls in Shiki's full grammar/theme system, adding meaningful weight and effectively requiring a bundler. Since Diffraction is meant to stay maximally lightweight and dependency-free with a no-build deployment, we use jsdiff directly and hand-roll the (minimal) rendering ourselves. Revisit if richer code-diff UX (e.g. syntax highlighting) becomes a priority.
