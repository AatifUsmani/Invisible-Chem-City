# Invisible City: Mapping Hidden Chemical Risk in Toronto

**Which parts of the city quietly carry the highest chemical risk — and which facilities behave abnormally compared to their peers?**

---

## What this is

- **Showcase website** — A dark, interactive map of Toronto where facilities appear as toxicity-colored “clouds.” Scroll to see intensity change; hover for details; toggle scenarios (*What if removed?* / *What if 2× emissions?*); click a facility for zone exposure. Built with React, Vite, Mapbox, and Framer Motion.
- **Analysis** — Jupyter notebooks for data cleaning, risk scoring, and anomaly detection (Isolation Forest). Optional Python pipeline to regenerate data and a static map.

Data comes from [Toronto Chemtrac](https://open.toronto.ca/dataset/chemical-tracking-chemtrac/) Open Data.

---

## Quick start

**→ See [QUICKSTART.md](QUICKSTART.md)** for:

- What you need (Node, Python, Mapbox token)
- How to run the web app locally
- How to deploy (Vercel or Docker)
- How to use your own Chemtrac data
- Troubleshooting

In short: set `VITE_MAPBOX_TOKEN` in `web/.env`, then `cd web && npm install && npm run dev`.

---

## Repo at a glance

| Part | Purpose |
|------|--------|
| **web/** | The site you run and deploy. Needs `web/public/data/facilities.json` (included). |
| **notebooks/** | Analysis (cleaning, risk model, anomalies). |
| **data/raw**, **data/processed** | Input CSVs and pipeline output. |
| **scripts/** | Pipeline, export to JSON, Chemtrac ingestion, static map. |
| **run_all.py** | Run full pipeline + static map. Then run `scripts/export_web_data.py` to refresh the web app’s data. |
| **web/vercel.json** | SPA rewrite when deploying with Vercel (Root Directory = `web`). |

---

## Docs

- **[QUICKSTART.md](QUICKSTART.md)** — Run locally, deploy, APIs, data (detailed).
- **[NARRATIVE.md](NARRATIVE.md)** — Short narrative for judges/recruiters.

---

## License

Educational / portfolio use. Toronto/NPRI data subject to Open Government Licence terms.

## Data sources & citation

- City of Toronto — Chemtrac / Chemical Tracking dataset (2024 snapshot used for this project). Open Data portal: https://open.toronto.ca/dataset/chemical-tracking-chemtrac/ . Please cite the City of Toronto Open Data when publishing results derived from these data.
- Chemical-Tracking reference file used for chemical health notes: `data/raw/Chemical-Tracking.csv` (sourced from City of Toronto / provincial chemical tracking datasets). Check `data/README.md` for provenance and licensing details.

If you redistribute processed data or visualizations, include the appropriate attribution per the City of Toronto Open Data Licence.

## Deploying to Vercel (quick steps)

1. Push this repository to GitHub (or Git provider supported by Vercel).
2. Sign in to https://vercel.com and create a new Project → Import Git Repository.
3. In the **Framework Preset** choose `Other` or `Vite`. Set the Root Directory to `/web`.
4. Set Environment Variables in Vercel: add `VITE_MAPBOX_TOKEN` with your Mapbox token (kept secret).
5. Build & Output settings (if using `Other`):
	- Build Command: `npm run build`
	- Output Directory: `dist`
6. Click **Deploy** — Vercel will build and host the site. The live URL will be shown in the dashboard.

## Local run & test

From the repository root:

```bash
# install deps and run dev server for the web app
cd web
npm install
# create an .env file with VITE_MAPBOX_TOKEN=your_token
npm run dev

# then open http://localhost:5173 (or the port shown)
```

Notes:
- If you want to regenerate processed data from raw Chemtrac CSVs, see `notebooks/` and `scripts/run_pipeline.py`.
- For a containerized deployment, see `Dockerfile` in the repo root (build the whole project and serve the `web/dist` build).

Additional front-end dependency

This project includes an animated background using `react-tsparticles`. Install it in the `web/` folder:

```bash
cd web
npm install react-tsparticles tsparticles
```

After installing, run the dev server again with `npm run dev`.
