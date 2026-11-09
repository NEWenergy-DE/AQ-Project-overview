# AQ Project Overview – Data Center Pipeline Germany

An overview of data center capacity in Germany: operating, under construction, in development and announced. It has two parts:

| Folder | What it is |
|---|---|
| [`data/`](data/) | **The data.** `projects.csv` is the master list (one row per project), `clusters.csv` positions the regional bubbles. Column definitions are in [`data/README.md`](data/README.md). |
| [`map/`](map/) | **The tool.** An interactive map with filters, project details and a PowerPoint export. It reads the files in `data/`. |

> The rows in `data/projects.csv` are anonymised **sample data** until real projects are added.

## Opening the map

- **From a web address (recommended).** Turn on GitHub Pages (Settings → Pages → Branch `main`, folder `/root`) and open `https://<organisation>.github.io/<repository>/map/`. The map loads the data automatically.
  Pages on a public repository is public: do this only while the data is sample data, or when the repository is private on a GitHub Enterprise plan.
- **From your computer.** Download the repository (Code → Download ZIP), unzip, and open `map/index.html` in Chrome or Edge. Browsers don't let a page read files next to it, so drag `data/projects.csv` onto the map (and `data/clusters.csv` for the bubble positions).

The map needs internet access to `cdnjs.cloudflare.com` (map and Excel reader) and to the CARTO background map. If those are blocked at work, the filters, project list and PowerPoint export still work.

## Updating data

1. Edit `data/projects.csv`, either in Excel (see [`data/README.md`](data/README.md) for German Excel settings) or by asking Claude Code.
2. Fill `Source_1` and `Last_Verified` for every change.
3. Commit with a message that says what changed, e.g. `Hanau: phase 2 under construction (+100 MW)`.

GitHub keeps the full history, so every change to a project can be traced and undone.
