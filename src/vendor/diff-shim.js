// Bridges the UMD `Diff` global — loaded via a SRI-pinned <script> tag from
// cdnjs in index.html — into the named ES module exports that
// src/diff-logic.js imports. This keeps diff-logic.js's `import { ... }
// from 'diff'` resolving identically under Node (via the npm devDependency)
// and in the browser (via the import map pointing "diff" at this file),
// so diff-logic.js needs no environment-detection of its own.
export const { diffArrays, diffChars } = window.Diff;
