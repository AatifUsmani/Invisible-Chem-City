# Invisible City: Mapping Hidden Chemical Risk in Toronto

**Which parts of Toronto quietly carry the highest chemical risk—and which facilities behave abnormally compared to their peers?**

Invisible City is a high-fidelity geospatial platform that transforms raw environmental data into an interactive risk-assessment tool. It visualizes facility-level toxicity data using dynamic "plume" rendering and identifies statistical anomalies through Machine Learning.

## 🚀 Key Features

- **Dynamic Risk Search:** Enter any address or postal code to calculate a localized risk score. The algorithm uses a distance-weighted Haversine formula to assess the impact of all facilities within a 5km radius.
- **Story-Driven Navigation:** Curated "Stories" (e.g., *The Necessary Poison*) that automatically pan and zoom the map to critical environmental zones, providing deep-dive context into Toronto's infrastructure.
- **Live Anomaly Detection:** An integrated ML pipeline that flags facilities with unusual emission profiles compared to industry benchmarks.
- **Scroll-Linked Animations:** Map intensity and plume opacity react dynamically to the user's scroll position, emphasizing the "invisible" nature of chemical releases.
- **Assistant:** A built-in "ChemCity Assistant" (Intercom-style) that helps users interpret risk scores, find highest-risk facilities, and navigate map data using natural language.

## 🧠 The Tech Stack

- **Frontend:** React, Vite, Mapbox GL JS (Custom GeoJSON layers & clustering), Framer Motion (Animations).
- **Backend/ML Pipeline:** Python (Pandas, Scikit-learn).
- **ML Models:** - **Isolation Forest:** For unsupervised anomaly detection.
  - **Standard & Robust Scalers:** For industry-normalized risk scoring.
- **Data Source:** Toronto ChemTRAC Open Data.
