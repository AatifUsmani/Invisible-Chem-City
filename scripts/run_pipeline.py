#!/usr/bin/env python3
"""
ChemTRAC 2024 staged pipeline

Stages:
- run_cleaning()           raw ChemTRAC CSV → clean row-level CSV
- run_risk_model()         facility risk scores
- run_anomaly_detection()  unusual facilities
- export_web_json()        FINAL web artifact

Run:
  python scripts/pipeline_chemtrac.py --csv data/raw/Chemtrac-Data-2024.csv
"""

import os
import json
import argparse
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.ensemble import IsolationForest

# -----------------------------
# Paths
# -----------------------------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(BASE, "data", "processed")
OUT_WEB = os.path.join(BASE, "web", "public", "data")
os.makedirs(PROC, exist_ok=True)
os.makedirs(OUT_WEB, exist_ok=True)

# -----------------------------
# Weights
# -----------------------------
EXPOSURE_WEIGHTS = {
    "air": 1.0,
    "water": 0.9,
    "land": 0.6,
    "disposal": 0.2,
    "recycling": 0.1,
}
USE_WEIGHTS = {
    "manufactured": 1.0,
    "processed": 0.7,
    "other": 0.4,
}

# =============================
# CLEANING / ROW NORMALIZATION
# =============================
def run_cleaning(csv_path):
    df = pd.read_csv(csv_path)

    df = df.rename(columns={
        "FACILITY_ID": "facility_id",
        "FACILITY_NAME": "facility_name",
        "NAICS_CODE_6_DESC_ENG": "industry",
        "EMPLOYEE_COUNT": "employee_count",
        "FA_LAT": "latitude",
        "FA_LON": "longitude",
        "CHEMICAL_ID": "chemical_id",
        "CHEMICAL_NAME": "chemical_name",
        "USE_MANUFACTURED": "use_manufactured",
        "USE_PROCESSED": "use_processed",
        "USE_OTHER_USE": "use_other_use",
        "REL_AIR": "rel_air",
        "REL_LAND": "rel_land",
        "REL_WATER": "rel_water",
        "REL_DISPOSAL": "rel_disposal",
        "REL_RECYCLING": "rel_recycling",
    })

    num_cols = [
        "latitude", "longitude", "employee_count",
        "rel_air", "rel_land", "rel_water",
        "rel_disposal", "rel_recycling",
    ]
    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    df["total_release_kg"] = (
        df["rel_air"]
        + df["rel_land"]
        + df["rel_water"]
        + df["rel_disposal"]
        + df["rel_recycling"]
    )

    out = os.path.join(PROC, "chemtrac_rows_clean.csv")
    df.to_csv(out, index=False)
    print(f"✔ Cleaning complete → {out}")


# =============================
# RISK MODEL (FACILITY LEVEL)
# =============================
def run_risk_model():
    df = pd.read_csv(os.path.join(PROC, "chemtrac_rows_clean.csv"))

    facilities = []

    for fid, g in df.groupby("facility_id"):
        exposure_score = 0.0

        for _, r in g.iterrows():
            paths = (
                (["air"] if r["rel_air"] > 0 else [])
                + (["water"] if r["rel_water"] > 0 else [])
                + (["land"] if r["rel_land"] > 0 else [])
                + (["disposal"] if r["rel_disposal"] > 0 else [])
                + (["recycling"] if r["rel_recycling"] > 0 else [])
            )
            uses = (
                (["manufactured"] if r["use_manufactured"] == 1 else [])
                + (["processed"] if r["use_processed"] == 1 else [])
                + (["other"] if r["use_other_use"] == 1 else [])
            )

            path_w = max([EXPOSURE_WEIGHTS[p] for p in paths], default=0)
            use_w = max([USE_WEIGHTS[u] for u in uses], default=0.3)

            exposure_score += r["total_release_kg"] * path_w * use_w

        facilities.append({
            "facility_id": fid,
            "facility_name": g["facility_name"].iloc[0],
            "industry": g["industry"].iloc[0],
            "latitude": g["latitude"].iloc[0],
            "longitude": g["longitude"].iloc[0],
            "total_release_kg": g["total_release_kg"].sum(),
            "n_chemicals": g["chemical_id"].nunique(),
            "exposure_score": exposure_score,
        })

    fac = pd.DataFrame(facilities)

    fac["log_release"] = np.log1p(fac["total_release_kg"])
    fac["log_exposure"] = np.log1p(fac["exposure_score"])
    fac["log_chems"] = np.log1p(fac["n_chemicals"])

    feats = ["log_release", "log_exposure", "log_chems"]
    fac[feats] = MinMaxScaler().fit_transform(fac[feats])

    fac["risk_score"] = (
        0.45 * fac["log_release"]
        + 0.40 * fac["log_exposure"]
        + 0.15 * fac["log_chems"]
    )

    fac["risk_score"] = (
        (fac["risk_score"] - fac["risk_score"].min())
        / (fac["risk_score"].max() - fac["risk_score"].min() + 1e-9)
        * 100
    ).round(2)

    out = os.path.join(PROC, "facilities_with_risk.csv")
    fac.to_csv(out, index=False)
    print(f"✔ Risk model complete → {out}")


# =============================
# ANOMALY DETECTION
# =============================
def run_anomaly_detection():
    df = pd.read_csv(os.path.join(PROC, "facilities_with_risk.csv"))

    le = LabelEncoder()
    df["industry_enc"] = le.fit_transform(df["industry"].astype(str))

    X = df[["risk_score", "log_exposure", "log_release", "industry_enc"]]

    iso = IsolationForest(contamination=0.08, random_state=42)
    df["anomaly"] = (iso.fit_predict(X) == -1)

    out = os.path.join(PROC, "facilities_with_risk_and_anomaly.csv")
    df.to_csv(out, index=False)
    print(f"✔ Anomaly detection complete → {out}")


# =============================
# FINAL WEB JSON (CANONICAL)
# =============================
def export_web_json():
    rows = pd.read_csv(os.path.join(PROC, "chemtrac_rows_clean.csv"))
    fac = pd.read_csv(os.path.join(PROC, "facilities_with_risk_and_anomaly.csv"))

    risk_map = fac.set_index("facility_id")[["risk_score", "anomaly"]].to_dict("index")

    facilities = []
    for fid, g in rows.groupby("facility_id"):
        meta = g.iloc[0]
        risk = risk_map.get(fid, {})

        chemicals = [
            {
                "name": r["chemical_name"],
                "amount_kg": round(r["total_release_kg"], 3),
            }
            for _, r in g.iterrows()
            if pd.notna(r["chemical_name"])
        ]

        facilities.append({
            "id": str(fid),
            "name": meta["facility_name"],
            "industry": meta["industry"],
            "latitude": float(meta["latitude"]),
            "longitude": float(meta["longitude"]),
            "total_release_kg": round(g["total_release_kg"].sum(), 3),
            "risk_score": risk.get("risk_score"),
            "anomaly": bool(risk.get("anomaly", False)),
            "chemicals": chemicals,
        })

    out = os.path.join(OUT_WEB, "facilities.json")
    with open(out, "w") as f:
        json.dump(facilities, f, indent=2)

    print(f"✔ Web JSON exported → {out}")


# =============================
# RUN ALL
# =============================
def run_all(csv_path):
    run_cleaning(csv_path)
    run_risk_model()
    run_anomaly_detection()
    export_web_json()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    args = parser.parse_args()
    run_all(args.csv)
