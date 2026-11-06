# Browser tests

Playwright flows. Run from this folder with `node <file>`.

| File | What it tests | Needs |
| --- | --- | --- |
| `flow.cjs` | Agents ask to pre-book, an admin approves, sale, privacy between agents, team page | `npm run build && npx vite preview --port 4173` |
| `flow2.cjs` | Deal file, stage details, photo upload, calendar, privacy, phone width | the same preview server |
| `flow3.cjs` | Protected viewer (PDF and photo), download request and approval, screenshot key report, calendar day, week and month | the preview server, or `BASE=art` for the test page |
| `flow-art.cjs` | The claude.ai test page with a local stand-in for the shared database (`mock-claude.js`) | `npm run build:artifact && tests/build-art-test.sh`, then a static server on port 8766 in `dist-artifact/` |
