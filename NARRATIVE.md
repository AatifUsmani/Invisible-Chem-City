# Invisible City — Short Narrative for Judges & Recruiters

## What we did

We mapped **chemical risk** and **quiet anomalies** across Toronto using facility-level release data (NPRI-style). No ground-truth “risk” label exists; we defined risk from amount released, toxicity proxy, and frequency, then combined these into an interpretable score. We used **Isolation Forest** to flag facilities that behave unusually compared to peers in the same industry.

## Why it matters

- **Risk score**: Surfaces areas and facilities that concentrate higher emissions and more toxic substances. The formula is transparent (weighted sum of normalized features).
- **Anomalies**: Facilities that look very different from others in their sector (e.g. one metal shop releasing 10× more than similar facilities). This is a statistical flag, not a legal finding — it helps focus attention where behavior is unusual.

## What you see

1. **Map**: Toronto with each facility as a point; **color = risk score** (green → red), **black border = anomaly**.
2. **Chart**: Distribution of risk scores with the **top 5%** and **anomalies** highlighted.
3. **CSVs**: Clean facility table with `risk_score` and `anomaly` for further analysis.

## Tech in one sentence

Pandas for cleaning and feature engineering; sklearn for normalization, optional regression, and Isolation Forest; Folium for the map; matplotlib for the distribution plot.

## How to run

From project root: install deps (`pip install -r requirements.txt`), run notebooks in order (data_cleaning → risk_model → anomaly_detection), then `python scripts/build_map.py`. Open `output/map.html` in a browser.
