# Notes for Claude Code

## What this repository is
A pipeline of data center projects in Germany (data) plus a browser map that visualises it (tool).

- `data/projects.csv` – master list, one row per project. UTF-8 with BOM, comma-separated. Column definitions and allowed values: `data/README.md`.
- `data/clusters.csv` – bubble anchor per region.
- `map/` – static site: `index.html`, `app.js` (filters, map, list, detail panel, file loading), `deck.js` (PowerPoint export via PptxGenJS), `style.css`, `germany_outline.js`, `lib/pptxgen.bundle.js` (vendored, do not edit).

No build step. To preview: `python3 -m http.server 8000` in the repository root, then open `http://localhost:8000/map/`.

## Rules for data changes
- Never invent figures. Every new or changed row needs a real source URL in `Source_1` and today's date in `Last_Verified`.
- Use only the allowed values from `data/README.md` for list columns (Status, DC_Type, Bundesland, ...).
- `ID` is unique and never reused; new rows take the next free number.
- Keep the column order and header names exactly as they are; the map depends on them.
- When adding a column, add it to `data/README.md` and, if it should show on the map, to the detail fields in `map/app.js`.
- Rows with `Confidence = SAMPLE - replace` are placeholders; remove them once real data replaces them.

## Rules for code changes
- Keep the map working when opened from disk (no build tools, no modules, plain scripts).
- Libraries load from cdnjs with pinned versions; PptxGenJS is vendored in `map/lib/`.
- After changing the map, preview it and check the browser console for errors.
