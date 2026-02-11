"""
Generate synthetic NPRI-style chemical release data for Toronto facilities.
Run from project root: python scripts/generate_sample_data.py
Output: data/raw/facilities_raw.csv, data/raw/releases_raw.csv
"""
import os
import random
import pandas as pd
import numpy as np

# Toronto bounding box (approx): lat 43.58–43.85, lon -79.64 to -79.11
TORONTO_LAT = (43.58, 43.85)
TORONTO_LON = (-79.64, -79.11)

INDUSTRIES = [
    "Metal fabrication",
    "Chemical manufacturing",
    "Food processing",
    "Printing",
    "Auto parts",
    "Waste treatment",
    "Pharmaceutical",
    "Electronics",
    "Plastics",
    "Oil and gas storage",
]

# Chemical name -> (typical unit, toxicity weight 1-10, typical range kg/year)
CHEMICALS = {
    "Ammonia": ("kg", 4, (100, 50000)),
    "Benzene": ("kg", 9, (10, 5000)),
    "Lead": ("kg", 10, (1, 2000)),
    "Sulphuric acid": ("kg", 6, (500, 100000)),
    "Toluene": ("kg", 5, (50, 20000)),
    "Xylene": ("kg", 5, (50, 15000)),
    "Zinc": ("kg", 4, (100, 10000)),
    "Particulate matter": ("kg", 6, (500, 80000)),
    "VOCs": ("kg", 5, (200, 40000)),
    "Nitrogen oxides": ("kg", 5, (100, 30000)),
}

def main():
    random.seed(42)
    np.random.seed(42)
    base = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    os.makedirs(base, exist_ok=True)

    n_facilities = 120
    facility_ids = [f"FAC_{i:04d}" for i in range(1, n_facilities + 1)]

    facilities = []
    for i, fid in enumerate(facility_ids):
        lat = random.uniform(*TORONTO_LAT)
        lon = random.uniform(*TORONTO_LON)
        industry = random.choice(INDUSTRIES)
        facilities.append({
            "facility_id": fid,
            "facility_name": f"Facility {i+1}",
            "industry": industry,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "address_city": "Toronto",
            "reporting_year": 2023,
        })

    facilities_df = pd.DataFrame(facilities)
    facilities_df.to_csv(os.path.join(base, "facilities_raw.csv"), index=False)
    print(f"Wrote {len(facilities_df)} facilities to data/raw/facilities_raw.csv")

    # Releases: each facility reports 1–5 chemicals per year, some with multiple reports (frequency)
    releases = []
    for fid in facility_ids:
        n_chems = random.randint(1, 5)
        chems = random.sample(list(CHEMICALS.keys()), n_chems)
        for chem in chems:
            unit, tox, (lo, hi) = CHEMICALS[chem]
            amount = random.uniform(lo, hi)
            # Some reports span multiple "incidents" (frequency proxy)
            num_reports = random.choices([1, 2, 3, 4, 5], weights=[60, 20, 12, 5, 3])[0]
            for _ in range(num_reports):
                releases.append({
                    "facility_id": fid,
                    "chemical_name": chem,
                    "amount_kg": round(amount / num_reports, 2),
                    "unit": unit,
                    "reporting_year": 2023,
                    "release_type": random.choice(["air", "water", "land", "air"]),
                })

    releases_df = pd.DataFrame(releases)
    # Inject missing values and minor inconsistencies (for cleaning notebook)
    mask_missing = releases_df.sample(frac=0.02, random_state=42).index
    releases_df.loc[mask_missing, "amount_kg"] = np.nan
    releases_df.loc[releases_df.sample(frac=0.01, random_state=43).index, "chemical_name"] = "  Toluene  "
    releases_df.to_csv(os.path.join(base, "releases_raw.csv"), index=False)
    print(f"Wrote {len(releases_df)} release records to data/raw/releases_raw.csv")

if __name__ == "__main__":
    main()
