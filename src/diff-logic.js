import { diffArrays, diffChars } from 'diff';

/**
 * Splits text into an array of lines, dropping the trailing empty
 * element left by a final newline (or by an entirely empty string).
 * CRLF line endings are normalized to LF first, so two texts that only
 * differ in line-ending style aren't reported as changed on every line.
 */
function splitLines(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Builds a comparator that decides whether an original line and a changed
 * line should be treated as equal, honoring the ignoreWhitespace/ignoreCase
 * options.
 */
function buildComparator({ ignoreWhitespace, ignoreCase }) {
  return (a, b) => {
    let x = a;
    let y = b;
    if (ignoreWhitespace) {
      x = x.trim().replace(/\s+/g, ' ');
      y = y.trim().replace(/\s+/g, ' ');
    }
    if (ignoreCase) {
      x = x.toLowerCase();
      y = y.toLowerCase();
    }
    return x === y;
  };
}

/**
 * Splits a line into an array of its Unicode code points, so segment
 * lengths reported by jsdiff (counted in code points) can be sliced out
 * correctly even for text containing astral characters (e.g. emoji).
 */
function splitCodePoints(line) {
  return Array.from(line);
}

/**
 * Computes a per-character breakdown of a single modified line pair, for
 * highlighting exactly which characters differ (e.g. the one part of a
 * docker-compose image SHA that actually changed).
 *
 * As with the line-level diff, jsdiff only reports one side's text for
 * characters it treats as equal-but-non-identical (relevant when
 * ignoreCase is on), so we use jsdiff only for alignment/counts and pull
 * each side's actual characters from our own arrays.
 *
 * @param {string} originalLine
 * @param {string} changedLine
 * @param {{ignoreCase?: boolean}} [options]
 * @returns {{originalSegments: Array<{text: string, changed: boolean}>, changedSegments: Array<{text: string, changed: boolean}>}}
 */
function computeCharSegments(originalLine, changedLine, { ignoreCase = false } = {}) {
  const originalChars = splitCodePoints(originalLine);
  const changedChars = splitCodePoints(changedLine);
  const parts = diffChars(originalLine, changedLine, { ignoreCase });

  const originalSegments = [];
  const changedSegments = [];
  let oldIndex = 0;
  let newIndex = 0;

  for (const part of parts) {
    if (part.added) {
      changedSegments.push({
        text: changedChars.slice(newIndex, newIndex + part.count).join(''),
        changed: true,
      });
      newIndex += part.count;
    } else if (part.removed) {
      originalSegments.push({
        text: originalChars.slice(oldIndex, oldIndex + part.count).join(''),
        changed: true,
      });
      oldIndex += part.count;
    } else {
      originalSegments.push({
        text: originalChars.slice(oldIndex, oldIndex + part.count).join(''),
        changed: false,
      });
      changedSegments.push({
        text: changedChars.slice(newIndex, newIndex + part.count).join(''),
        changed: false,
      });
      oldIndex += part.count;
      newIndex += part.count;
    }
  }

  return { originalSegments, changedSegments };
}

/**
 * Computes a side-by-side comparison between two texts.
 *
 * jsdiff only reports one side's text for lines it treats as equal-but-
 * non-identical (e.g. matched via ignoreCase/ignoreWhitespace), so rather
 * than reading line content back out of its change objects, we use it only
 * to determine alignment (which lines are unchanged/added/removed and how
 * many), and pull the actual text for both sides from our own pre-split
 * line arrays. This preserves each side's real text even when the two
 * lines aren't identical but were matched under ignoreWhitespace/ignoreCase.
 *
 * @param {string} original - The baseline text or code.
 * @param {string} changed - The modified text or code.
 * @param {{ignoreWhitespace?: boolean, ignoreCase?: boolean}} [options]
 * @returns {Array<{type: 'unchanged'|'modified'|'added'|'removed', original: string|null, changed: string|null, originalSegments?: Array<{text: string, changed: boolean}>, changedSegments?: Array<{text: string, changed: boolean}>}>}
 *   One row per rendered line, aligned for side-by-side display. `modified`
 *   rows additionally carry `originalSegments`/`changedSegments` breaking
 *   each side down into unchanged/changed character runs, so callers can
 *   highlight exactly what changed within the line.
 */
export function computeDiff(original, changed, options = {}) {
  const { ignoreWhitespace = false, ignoreCase = false } = options;
  const originalLines = splitLines(original);
  const changedLines = splitLines(changed);
  const comparator = buildComparator({ ignoreWhitespace, ignoreCase });
  const parts = diffArrays(originalLines, changedLines, { comparator });

  const rows = [];
  let oldIndex = 0;
  let newIndex = 0;
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (!part.added && !part.removed) {
      for (let k = 0; k < part.count; k++) {
        rows.push({
          type: 'unchanged',
          original: originalLines[oldIndex + k],
          changed: changedLines[newIndex + k],
        });
      }
      oldIndex += part.count;
      newIndex += part.count;
      i++;
      continue;
    }

    let removedCount = 0;
    let addedCount = 0;
    if (part.removed) {
      removedCount = part.count;
      i++;
      if (i < parts.length && parts[i].added) {
        addedCount = parts[i].count;
        i++;
      }
    } else {
      addedCount = part.count;
      i++;
    }

    const rowCount = Math.max(removedCount, addedCount);
    for (let j = 0; j < rowCount; j++) {
      const o = j < removedCount ? originalLines[oldIndex + j] : undefined;
      const c = j < addedCount ? changedLines[newIndex + j] : undefined;
      if (o !== undefined && c !== undefined) {
        const { originalSegments, changedSegments } = computeCharSegments(o, c, { ignoreCase });
        rows.push({ type: 'modified', original: o, changed: c, originalSegments, changedSegments });
      } else if (o !== undefined) {
        rows.push({ type: 'removed', original: o, changed: null });
      } else {
        rows.push({ type: 'added', original: null, changed: c });
      }
    }
    oldIndex += removedCount;
    newIndex += addedCount;
  }

  return rows;
}
