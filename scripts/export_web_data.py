"""
Export processed facility + release data to JSON for the web app.
Run from project root after pipeline. Output: web/public/data/facilities.json
Also supports Toronto Chemtrac CSVs if you pass --chemtrac-dir.
"""
import os
import json
import argparse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(BASE, "data", "processed")
OUT = os.path.join(BASE, "web", "public", "data")

# Simple health impact by chemical (for tooltips)
HEALTH_IMPACT = {
    "Ammonia": "Respiratory irritant",
    "Benzene": "Carcinogen; blood and immune effects",
    "Lead": "Neurotoxic; developmental",
    "Sulphuric Acid": "Corrosive; respiratory",
    "Toluene": "Neurological; respiratory",
    "Xylene": "Neurological; irritant",
    "Zinc": "Metal fume fever at high exposure",
    "Particulate Matter": "Respiratory; cardiovascular",
    "Vocs": "Varies by compound; respiratory",
    "Nitrogen Oxides": "Respiratory irritant",
    "Plastics": "Varies by polymer/additives",
}


def run(chemtrac_dir=None):
    os.makedirs(OUT, exist_ok=True)
    facilities_path = os.path.join(PROC, "facilities_with_risk_and_anomaly.csv")
    releases_path = os.path.join(PROC, "releases_clean.csv")

    if not os.path.exists(facilities_path) or not os.path.exists(releases_path):
        print("Run the pipeline first (run_all.py or notebooks).")
        return

    import pandas as pd
    facilities = pd.read_csv(facilities_path)
    releases = pd.read_csv(releases_path)

    # Merge chemicals per facility with amount and health impact
    chemicals_by_fac = releases.groupby("facility_id").apply(
        lambda g: [
            {
                "name": row["chemical_name"],
                "amount_kg": round(float(row["amount_kg"]), 1),
                "health_impact": HEALTH_IMPACT.get(row["chemical_name"], "See substance details"),
            }
            for _, row in g.iterrows()
        ]
    ).to_dict()

    out_list = []
    for _, row in facilities.iterrows():
        fid = row["facility_id"]
        out_list.append({
            "id": fid,
            "name": str(row["facility_name"]),
            "industry": str(row["industry"]),
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
            "risk_score": round(float(row["risk_score"]), 1),
            "total_release_kg": float(row["total_release_kg"]),
            "anomaly": int(row.get("anomaly", 0)) == 1,
            "chemicals": chemicals_by_fac.get(fid, []),
            "max_toxicity": float(row.get("max_toxicity", 5)),
        })

    path = os.path.join(OUT, "facilities.json")
    with open(path, "w") as f:
        json.dump(out_list, f, indent=2)
    print(f"Wrote {path} ({len(out_list)} facilities)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--chemtrac-dir", help="Dir with Chemtrac 2024 + chemical tracking CSVs (optional)")
    args = parser.parse_args()
    run(chemtrac_dir=args.chemtrac_dir)
