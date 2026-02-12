# Invisible City — Project Narrative

## The Problem
Toronto is home to thousands of industrial facilities, many of which release chemicals as part of daily operations. While this data is public, it is buried in massive CSV files that the average citizen cannot interpret. I wanted to create a tool that doesn't just show "where" facilities are, but "how much they matter" to your health.

## What I Built
I developed an end-to-end data pipeline and visualization platform. 
1. **The Pipeline:** I built `run_pipeline.py` to handle the heavy lifting. It cleans the raw ChemTRAC data, applies toxicity weights based on chemical types (carcinogens, neurotoxins, etc.), and runs an **Isolation Forest** model to detect anomalies—facilities that are "behaving strangely" compared to their industry peers.
2. **The Interface:** Using Mapbox and React, I created a "Dark Mode" visualization where risk is shown as glowing plumes. I implemented a custom Haversine-based search engine that lets users find their personal risk score by address.
3. **The Assistant:** To make the data accessible, I built a React-based Assistant component. It acts as a bridge between complex data and the user, answering questions about the map in real-time.

## The ML Strategy
Since there is no "ground truth" for what a "dangerous" facility is, I used **unsupervised learning**. By industry-normalizing the data, my Isolation Forest model flags facilities that are statistical outliers. This helps focus attention on facilities that might need more oversight, not just the ones that are the largest.

## Conclusion
This project demonstrates my ability to handle full-stack development, geospatial data, and machine learning to turn raw data into a narrative that can influence public awareness.