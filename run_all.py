#!/usr/bin/env python3
"""
One-command pipeline:
cleaning → risk model → anomaly detection → map
"""

import os

BASE = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE)

from scripts.run_pipeline import run_cleaning,run_risk_model, run_anomaly_detection
from scripts.build_map import build_map

def main():
    csv_path = "data/raw/Chemtrac-Data-2024.csv"

    run_cleaning(csv_path)
    run_risk_model()
    run_anomaly_detection()
    build_map()
    print("Done. Open output/map.html")

if __name__ == "__main__":
    main()
