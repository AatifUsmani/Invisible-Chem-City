# Invisible City: Mapping Hidden Chemical Risk in Toronto

**Which parts of Toronto quietly carry the highest chemical risk—and which facilities behave abnormally compared to their peers?**

Invisible City is a high-fidelity geospatial platform that transforms raw environmental data into an interactive risk-assessment tool. It visualizes facility-level toxicity data using dynamic "plume" rendering and identifies statistical anomalies through Machine Learning.


## 🧠 Risk Methodology & The "Invisible" Algorithm

The platform’s risk scoring is modeled after the **EPA’s RSEI (Risk-Screening Environmental Indicators)** framework, shifting the focus from "total pounds released" to "actual human health impact."

### 1. Toxicity-Weighted Exposure (40% of Score)
Instead of treating all chemicals equally, each release is multiplied by a **Toxicity Weight** (0-100) derived from EPA IRIS and IARC classifications. 
- **High Weight (90+):** Neurotoxins and known carcinogens (e.g., Lead, Mercury, Hexavalent Chromium).
- **Moderate Weight (50-70):** Respiratory and systemic toxins (e.g., Nitrogen Oxides, Ammonia).

### 2. Multi-Pathway Modeling
We apply **Exposure Pathway Multipliers** to account for how chemicals interact with the environment:
- **Air (1.0x):** Highest risk due to direct inhalation in urban areas.
- **Water (0.95x):** High risk for bioaccumulation and groundwater contamination.
- **Land/Disposal (0.3x - 0.7x):** Lower immediate risk but long-term persistence.

### 3. Proximity & Sensitive Receptor Analysis
The score is dynamically boosted (up to 40%) based on the facility's proximity to **Sensitive Locations**. Using a Haversine-based decay formula, we prioritize risk for facilities within 1km–5km of:
- **Hospitals & Childcare:** (e.g., SickKids, Toronto General).
- **Educational Hubs:** (e.g., University of Toronto, York University).
- **High-Density Residential:** (e.g., Downtown Core).

### 4. Machine Learning Anomaly Detection
We use an **Ensemble Isolation Forest** model to detect "Abnormal Actors." The ML pipeline flags facilities that:
- Release significantly higher toxicity-weighted loads than their industry peers (NAICS normalization).
- Exhibit "Dangerous Combinations" (e.g., high carcinogen count + high proximity risk).


## 🚀 Key Features

- **Dynamic Risk Search:** Enter any address or postal code to calculate a localized risk score. The algorithm uses a distance-weighted Haversine formula to assess the impact of all facilities within a 5km radius.
- **Story-Driven Navigation:** Curated "Stories" (e.g., *The Necessary Poison*) that automatically pan and zoom the map to critical environmental zones, providing deep-dive context into Toronto's infrastructure.
- **Scroll-Linked Animations:** Map intensity and plume opacity react dynamically to the user's scroll position, emphasizing the "invisible" nature of chemical releases.
- **Assistant:** A built-in "ChemCity Assistant" (Intercom-style) that helps users interpret risk scores, find highest-risk facilities, and navigate map data using natural language.

## 🧠 The Tech Stack

- **Frontend:** React, Vite, Mapbox GL JS (Custom GeoJSON layers & clustering), Framer Motion (Animations).
- **Backend/ML Pipeline:** Python (Pandas, Scikit-learn).
- **ML Models:** - **Isolation Forest:** For unsupervised anomaly detection.
  - **Standard & Robust Scalers:** For industry-normalized risk scoring.
- **Data Source:** Toronto ChemTRAC Open Data.
