import { computeDiff } from './diff-logic.js';

const originalInput = document.getElementById('original-input');
const changedInput = document.getElementById('changed-input');
const ignoreWhitespaceCheckbox = document.getElementById('ignore-whitespace');
const ignoreCaseCheckbox = document.getElementById('ignore-case');
const diffOutput = document.getElementById('diff-output');
const swapBtn = document.getElementById('swap-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');

const DEBOUNCE_MS = 150;
let debounceTimer = null;
let lastRows = [];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderDiff(rows) {
  lastRows = rows;

  if (rows.length === 0) {
    diffOutput.innerHTML = '<p class="empty-state">Start typing above to see the differences.</p>';
    return;
  }

  const rowsHtml = rows
    .map((row) => {
      const originalCell =
        row.original === null
          ? '<div class="diff-cell diff-cell--blank" aria-hidden="true"></div>'
          : `<div class="diff-cell diff-cell--${row.type}">${escapeHtml(row.original)}</div>`;
      const changedCell =
        row.changed === null
          ? '<div class="diff-cell diff-cell--blank" aria-hidden="true"></div>'
          : `<div class="diff-cell diff-cell--${row.type}">${escapeHtml(row.changed)}</div>`;
      return `<div class="diff-row">${originalCell}${changedCell}</div>`;
    })
    .join('');

  diffOutput.innerHTML = `<div class="diff-grid">${rowsHtml}</div>`;
}

function runDiff() {
  const options = {
    ignoreWhitespace: ignoreWhitespaceCheckbox.checked,
    ignoreCase: ignoreCaseCheckbox.checked,
  };
  const rows = computeDiff(originalInput.value, changedInput.value, options);
  renderDiff(rows);
}

function scheduleDiff() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runDiff, DEBOUNCE_MS);
}

function buildPlainTextDiff(rows) {
  const lines = [];
  for (const row of rows) {
    if (row.type === 'unchanged') {
      lines.push('  ' + row.original);
    } else if (row.type === 'modified') {
      lines.push('- ' + row.original);
      lines.push('+ ' + row.changed);
    } else if (row.type === 'removed') {
      lines.push('- ' + row.original);
    } else if (row.type === 'added') {
      lines.push('+ ' + row.changed);
    }
  }
  return lines.join('\n');
}

originalInput.addEventListener('input', scheduleDiff);
changedInput.addEventListener('input', scheduleDiff);
ignoreWhitespaceCheckbox.addEventListener('change', runDiff);
ignoreCaseCheckbox.addEventListener('change', runDiff);

swapBtn.addEventListener('click', () => {
  const temp = originalInput.value;
  originalInput.value = changedInput.value;
  changedInput.value = temp;
  runDiff();
});

clearBtn.addEventListener('click', () => {
  originalInput.value = '';
  changedInput.value = '';
  originalInput.focus();
  runDiff();
});

copyBtn.addEventListener('click', async () => {
  const text = buildPlainTextDiff(lastRows);
  try {
    await navigator.clipboard.writeText(text);
    const original = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1500);
  } catch {
    // Clipboard API unavailable or denied — nothing sensible to do silently,
    // so surface it directly to the user.
    alert('Could not copy to clipboard.');
  }
});

runDiff();
