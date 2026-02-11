"""
Ingest Toronto ChemTRAC 2024 CSV (flattened facility × chemical rows)
and export web-ready facilities.json with derived health impact.
"""

import os
import json
import argparse
import pandas as pd

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(BASE, "data", "raw")
OUT = os.path.join(BASE, "web", "public", "data")


# -----------------------------
# Helpers
# -----------------------------
def exposure_pathways(row):
    paths = []
    if row["rel_air"] > 0:
        paths.append("air")
    if row["rel_water"] > 0:
        paths.append("water")
    if row["rel_land"] > 0:
        paths.append("land")
    if row["rel_disposal"] > 0:
        paths.append("disposal")
    if row["rel_recycling"] > 0:
        paths.append("recycling")
    return paths


def use_type(row):
    uses = []
    if row["use_manufactured"] == 1:
        uses.append("manufactured")
    if row["use_processed"] == 1:
        uses.append("processed")
    if row["use_other_use"] == 1:
        uses.append("other")
    return uses


def health_impact_text(paths, uses):
    if not paths:
        return "No reported environmental release"

    exposure = " and ".join(paths)
    if "manufactured" in uses:
        return f"{exposure.capitalize()} release of a manufactured substance"
    if "processed" in uses:
        return f"{exposure.capitalize()} release of a processed substance"
    return f"{exposure.capitalize()} release with limited public exposure"


# -----------------------------
# Main ingest
# -----------------------------
def run(csv_path):
    df = pd.read_csv(csv_path)

    # Normalize columns
    df = df.rename(columns={
        "_id": "row_id",
        "FACILITY_ID": "facility_id",
        "FACILITY_NAME": "facility_name",
        "NAICS_CODE_6_DESC_ENG": "industry",
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

    # Numeric safety
    for col in [
        "latitude", "longitude",
        "rel_air", "rel_land", "rel_water",
        "rel_disposal", "rel_recycling",
    ]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Total release per row
    df["total_release_kg"] = (
        df["rel_air"]
        + df["rel_land"]
        + df["rel_water"]
        + df["rel_disposal"]
        + df["rel_recycling"]
    )

    facilities = []

    for fid, g in df.groupby("facility_id"):
        chemicals = []

        for _, r in g.iterrows():
            paths = exposure_pathways(r)
            uses = use_type(r)

            chemicals.append({
                "id": str(r["chemical_id"]),
                "name": str(r["chemical_name"]).strip(),
                "amount_kg": round(float(r["total_release_kg"]), 3),
                "exposure_pathways": paths,
                "use_type": uses,
                "health_impact": health_impact_text(paths, uses),
            })

        facilities.append({
            "id": str(fid),
            "name": str(g["facility_name"].iloc[0]),
            "industry": str(g["industry"].iloc[0]),
            "latitude": float(g["latitude"].iloc[0]),
            "longitude": float(g["longitude"].iloc[0]),
            "employee_count": (
                int(g["EMPLOYEE_COUNT"].iloc[0])
                if "EMPLOYEE_COUNT" in g and pd.notna(g["EMPLOYEE_COUNT"].iloc[0])
                else None
            ),
            "total_release_kg": round(float(g["total_release_kg"].sum()), 3),
            "chemicals": chemicals,
            "risk_score": None,   # filled later
            "anomaly": False
        })

    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "facilities.json")

    with open(out_path, "w") as f:
        json.dump(facilities, f, indent=2)

    print(f"✔ Wrote {out_path} ({len(facilities)} facilities)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to ChemTRAC 2024 CSV")
    args = parser.parse_args()
    run(args.csv)
