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
