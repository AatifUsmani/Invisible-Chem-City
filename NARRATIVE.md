# Invisible City — Project Narrative

## The Problem
Toronto is home to thousands of industrial facilities, many of which release chemicals as part of daily operations. While this data is public, it is buried in massive CSV files that the average citizen cannot interpret. I wanted to create a tool that doesn't just show "where" facilities are, but "how much they matter" to your health.

## What I Built
I developed an end-to-end data pipeline and geospatial platform that treats environmental data as a multi-dimensional risk problem.

1. **The Advanced Pipeline:** I built run_pipeline.py to move beyond simple data cleaning. The pipeline now implements a toxicity-weighting engine modeled after the EPA’s RSEI framework. It weights chemicals based on chronic health impacts (carcinogens, neurotoxins, and heavy metals) and applies exposure-pathway multipliers for air, water, and soil.

2. **Spatial Sensitivity Analysis:** I integrated a proximity-decay algorithm using Haversine distances to adjust risk scores based on "Sensitive Receptors". Facilities near hospitals, childcare centers, and high-density residential zones (like the Downtown Core) receive a higher weighted risk, reflecting the true cost to the community.

3. The Interface: Using Mapbox and React, I created a high-fidelity visualization where risk is rendered as dynamic "plumes." I implemented a localized search engine that calculates a 5km-radius exposure score for any address in the city.

4. **The Assistant:** To make the data accessible, I built a React-based Assistant component. It acts as a bridge between complex data and the user, answering questions about the map in real-time.

## The ML Strategy
Because "danger" is subjective in raw data, I combined heuristic weighting with unsupervised machine learning:

Weighted Scoring: I used a composite index: 40% Toxicity-weighted exposure, 25% Release volume, 20% Maximum chemical potency, and 15% Heavy metal concentration.

Ensemble Anomaly Detection: I used an Isolation Forest ensemble to identify "Statistical Outliers". By normalizing data against industry benchmarks (NAICS codes), the model flags facilities that are behaving abnormally compared to their peers, rather than just flagging the largest operations.

## Conclusion
This project demonstrates a full-stack approach to environmental justice. By combining established scientific weighting frameworks with modern machine learning, I’ve turned a static government dataset into a predictive narrative that empowers citizens to understand the invisible risks in their own backyards.
