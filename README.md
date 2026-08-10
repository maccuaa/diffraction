<h1 align="center">
  <img src="./docs/images/wordmark.png" alt="Diffraction" height="56">
</h1>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/maccuaa/diffraction" alt="License"></a>
  <a href="https://maccuaa.github.io/diffraction/"><img src="https://img.shields.io/badge/demo-live-brightgreen" alt="Live Demo"></a>
</p>

A fast, client-side tool for comparing two blocks of text or code and highlighting their differences. No server, no build step, no data ever leaves your browser.

**[Try it live](https://maccuaa.github.io/diffraction/)**

## Features

- ⚡ Live, side-by-side diffing as you type
- 🔍 Character-level highlighting within changed lines (e.g. spot exactly which part of a docker-compose image SHA changed)
- 🎛️ Ignore-whitespace and ignore-case toggles
- 🔁 Swap, Clear, and Copy-result actions
- 🔒 Works entirely client-side — nothing is uploaded anywhere
- ⚙️ Powered by [jsdiff](https://github.com/kpdecker/jsdiff) and [Pico CSS](https://picocss.com/)
- 🚀 Fast, simple architecture — plain HTML, CSS, and JS

## Running locally

This project has no build step. Serve the directory with any static file server and open it in a browser:

```bash
npx serve .
# or
python3 -m http.server
```

## Running tests

The core diff logic is unit tested with Node's built-in test runner:

```bash
npm install
npm test
```

## Project docs

- [`CONTEXT.md`](./CONTEXT.md) — domain glossary
- [`docs/adr/`](./docs/adr/) — architecture decision records

## License

[MIT](./LICENSE)
