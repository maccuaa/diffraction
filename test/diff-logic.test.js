import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDiff } from '../src/diff-logic.js';

test('identical texts produce only unchanged rows', () => {
  const rows = computeDiff('line1\nline2\n', 'line1\nline2\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'line1', changed: 'line1' },
    { type: 'unchanged', original: 'line2', changed: 'line2' },
  ]);
});

test('a same-count line replacement produces modified rows', () => {
  const rows = computeDiff('foo\nbar\n', 'foo\nbaz\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    {
      type: 'modified',
      original: 'bar',
      changed: 'baz',
      originalSegments: [
        { text: 'ba', changed: false },
        { text: 'r', changed: true },
      ],
      changedSegments: [
        { text: 'ba', changed: false },
        { text: 'z', changed: true },
      ],
    },
  ]);
});

test('a pure addition produces an added row with no original', () => {
  const rows = computeDiff('foo\n', 'foo\nbar\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    { type: 'added', original: null, changed: 'bar' },
  ]);
});

test('a pure removal produces a removed row with no changed', () => {
  const rows = computeDiff('foo\nbar\n', 'foo\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    { type: 'removed', original: 'bar', changed: null },
  ]);
});

test('replacing one line with more lines pairs what it can and adds the rest', () => {
  const rows = computeDiff('foo\nbar\n', 'foo\nbaz\nqux\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    {
      type: 'modified',
      original: 'bar',
      changed: 'baz',
      originalSegments: [
        { text: 'ba', changed: false },
        { text: 'r', changed: true },
      ],
      changedSegments: [
        { text: 'ba', changed: false },
        { text: 'z', changed: true },
      ],
    },
    { type: 'added', original: null, changed: 'qux' },
  ]);
});

test('ignoreWhitespace treats lines differing only by whitespace as unchanged, preserving each side\'s own text', () => {
  const rows = computeDiff('foo\n  bar  \n', 'foo\nbar\n', { ignoreWhitespace: true });
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    { type: 'unchanged', original: '  bar  ', changed: 'bar' },
  ]);
});

test('ignoreWhitespace also collapses runs of internal whitespace, not just leading/trailing', () => {
  const rows = computeDiff('foo   bar', 'foo bar', { ignoreWhitespace: true });
  assert.deepEqual(rows, [{ type: 'unchanged', original: 'foo   bar', changed: 'foo bar' }]);
});

test('ignoreCase treats lines differing only by case as unchanged, preserving each side\'s own text', () => {
  const rows = computeDiff('Hello\nWorld\n', 'HELLO\nWorld\n', { ignoreCase: true });
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'Hello', changed: 'HELLO' },
    { type: 'unchanged', original: 'World', changed: 'World' },
  ]);
});

test('modified rows carry per-character segments highlighting exactly what changed (e.g. a docker-compose image SHA)', () => {
  const rows = computeDiff(
    'image: app@sha256:abc123def456\n',
    'image: app@sha256:xyz999def456\n',
  );
  assert.deepEqual(rows, [
    {
      type: 'modified',
      original: 'image: app@sha256:abc123def456',
      changed: 'image: app@sha256:xyz999def456',
      originalSegments: [
        { text: 'image: app@sha256:', changed: false },
        { text: 'abc123', changed: true },
        { text: 'def456', changed: false },
      ],
      changedSegments: [
        { text: 'image: app@sha256:', changed: false },
        { text: 'xyz999', changed: true },
        { text: 'def456', changed: false },
      ],
    },
  ]);
});

test('character segments respect ignoreCase, treating case-only differences as unchanged', () => {
  const rows = computeDiff('Hello World', 'Hello WORLD!', { ignoreCase: true });
  assert.deepEqual(rows, [
    {
      type: 'modified',
      original: 'Hello World',
      changed: 'Hello WORLD!',
      originalSegments: [{ text: 'Hello World', changed: false }],
      changedSegments: [
        { text: 'Hello WORLD', changed: false },
        { text: '!', changed: true },
      ],
    },
  ]);
});

test('added and removed rows do not carry character segments (nothing to compare against)', () => {
  const rows = computeDiff('foo\n', 'foo\nbar\n');
  assert.equal('originalSegments' in rows[1], false);
  assert.equal('changedSegments' in rows[1], false);
});

test('two empty texts produce no rows', () => {
  const rows = computeDiff('', '');
  assert.deepEqual(rows, []);
});

test('CRLF and LF line endings are normalized, not treated as content differences', () => {
  const rows = computeDiff('foo\r\nbar\r\n', 'foo\nbar\n');
  assert.deepEqual(rows, [
    { type: 'unchanged', original: 'foo', changed: 'foo' },
    { type: 'unchanged', original: 'bar', changed: 'bar' },
  ]);
});

test('list mode matches similar names and leaves unrelated items separate', () => {
  const original = `Aaa
Bramble
Copper
Dovetail (ABC) - Rivet
Elma
Elmaria
Fable
Moonlight
Riverside
Talvint
UVW/Pro Lantern
Willow
Zircon`;
  const changed = `Amber
Azure
Bramble
Copper
Dragon
DoveTail
Elmaria
Fern
Fable
Harbor
MoonLight
Riverside
Talivnt
UVW Pro
Willow SPRIG`;
  const rows = computeDiff(original, changed, { listMode: true });
  const pairs = rows.filter((row) => row.type === 'modified').map(({ original, changed }) => [original, changed]);
  assert.deepEqual(pairs, [
    ['Dovetail (ABC) - Rivet', 'DoveTail'],
    ['Moonlight', 'MoonLight'],
    ['Talvint', 'Talivnt'],
    ['UVW/Pro Lantern', 'UVW Pro'],
    ['Willow', 'Willow SPRIG'],
  ]);
  assert.ok(rows.some((row) => row.type === 'removed' && row.original === 'Aaa'));
  assert.ok(rows.some((row) => row.type === 'added' && row.changed === 'Azure'));
  assert.ok(rows.some((row) => row.type === 'removed' && row.original === 'Elma'));
  assert.ok(rows.some((row) => row.type === 'unchanged' && row.original === 'Elmaria'));
});

test('list mode ignores blank lines but preserves duplicate occurrences', () => {
  const rows = computeDiff('one\n \none\n', '\none\n', { listMode: true });
  assert.deepEqual(rows.map(({ type, original, changed }) => ({ type, original, changed })), [
    { type: 'unchanged', original: 'one', changed: 'one' },
    { type: 'removed', original: 'one', changed: null },
  ]);
});

test('list sorting is optional, case-insensitive, and does not change text diff behavior', () => {
  const original = 'beta\nAlpha';
  const changed = 'Alpha\nbeta';
  const unsorted = computeDiff(original, changed, { listMode: true });
  assert.deepEqual(unsorted.map((row) => row.type), ['removed', 'unchanged', 'added']);
  const sorted = computeDiff(original, changed, { listMode: true, sortLists: true });
  assert.deepEqual(sorted.map((row) => [row.type, row.original]), [
    ['unchanged', 'Alpha'],
    ['unchanged', 'beta'],
  ]);
  assert.deepEqual(computeDiff(original, changed, { sortLists: true }), computeDiff(original, changed));
});

test('list mode honors ignore-case and ignore-whitespace for equality', () => {
  const original = '  Moonlight  ';
  const changed = 'MoonLight';
  assert.equal(computeDiff(original, changed, { listMode: true })[0].type, 'modified');
  assert.deepEqual(computeDiff(original, changed, {
    listMode: true, ignoreCase: true, ignoreWhitespace: true,
  }), [{ type: 'unchanged', original, changed }]);
});

test('sorted list mode aligns items using the ignored-whitespace rules', () => {
  const rows = computeDiff(' zebra \nApple', 'Apple\nzebra', {
    listMode: true, sortLists: true, ignoreWhitespace: true,
  });
  assert.deepEqual(rows.map(({ type, original, changed }) => [type, original, changed]), [
    ['unchanged', 'Apple', 'Apple'],
    ['unchanged', ' zebra ', 'zebra'],
  ]);
});

test('sorting gives case variants a consistent order when case is significant', () => {
  const rows = computeDiff('a\nA', 'A\na', { listMode: true, sortLists: true });
  assert.deepEqual(rows.map((row) => row.type), ['unchanged', 'unchanged']);
});

test('list mode prefers the strongest ordered match and preserves exact anchors', () => {
  const rows = computeDiff('Talvint\nTalivnt\nWillow', 'Talivnt\nWillow SPRIG', { listMode: true });
  assert.deepEqual(rows.map(({ type, original, changed }) => [type, original, changed]), [
    ['removed', 'Talvint', null],
    ['unchanged', 'Talivnt', 'Talivnt'],
    ['modified', 'Willow', 'Willow SPRIG'],
  ]);
  const competing = computeDiff('Willow\nWillow SPRIG', 'Willow SPRIG Extra', { listMode: true });
  assert.deepEqual(competing.map((row) => row.type), ['removed', 'modified']);
  assert.equal(competing[1].original, 'Willow SPRIG');
});
