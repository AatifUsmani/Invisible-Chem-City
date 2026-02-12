#!/usr/bin/env python3
"""
ChemTRAC 2024 Advanced Risk Pipeline with Toxicity Weighting

Improvements:
- Chemical-specific toxicity scoring (carcinogens, neurotoxins, heavy metals)
- Proximity analysis (schools, hospitals, residential areas)
- Multi-model anomaly detection ensemble
- Industry-normalized risk assessment
- Spatial clustering for environmental justice analysis
"""

import os
import json
import argparse
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.cluster import DBSCAN
from scipy.spatial.distance import cdist
import warnings
warnings.filterwarnings('ignore')

# -----------------------------
# Paths
# -----------------------------
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROC = os.path.join(BASE, "data", "processed")
OUT_WEB = os.path.join(BASE, "web", "public", "data")
os.makedirs(PROC, exist_ok=True)
os.makedirs(OUT_WEB, exist_ok=True)

# -----------------------------
# TOXICITY SCORING SYSTEM
# Based on EPA IRIS, IARC classifications, and bioaccumulation potential
# -----------------------------
CHEMICAL_TOXICITY = {
    # Tier 1: Extreme neurotoxins and carcinogens
    "mercury": 100.0,
    "lead": 95.0,
    "formaldehyde": 92.0,
    "hexavalent chromium": 90.0,
    "chromium (vi)": 90.0,
    "benzene": 88.0,
    "cadmium": 87.0,
    
    # Tier 2: Known carcinogens and severe toxins
    "tetrachloroethylene": 82.0,
    "perchloroethylene": 82.0,
    "trichloroethylene": 80.0,
    "dichloromethane": 78.0,
    "methylene chloride": 78.0,
    "arsenic": 95.0,
    "nickel": 75.0,
    "styrene": 72.0,
    
    # Tier 3: PAHs and persistent organics
    "benzo(a)pyrene": 85.0,
    "polycyclic aromatic hydrocarbons": 83.0,
    "pahs": 83.0,
    "dioxins": 90.0,
    "pcbs": 85.0,
    
    # Tier 4: Respiratory and systemic toxins
    "nitrogen oxides": 68.0,
    "nox": 68.0,
    "sulfur dioxide": 65.0,
    "so2": 65.0,
    "particulate matter": 70.0,
    "pm2.5": 74.0,
    "pm10": 66.0,
    "ammonia": 62.0,
    
    # Tier 5: VOCs and organic compounds
    "volatile organic compounds": 58.0,
    "vocs": 58.0,
    "toluene": 60.0,
    "xylene": 58.0,
    "ethylbenzene": 56.0,
    "acetone": 45.0,
    "methanol": 50.0,
    
    # Tier 6: Lower toxicity but still harmful
    "carbon monoxide": 52.0,
    "co": 52.0,
    "hydrogen chloride": 55.0,
    "hcl": 55.0,
}

# Exposure pathway multipliers
EXPOSURE_WEIGHTS = {
    "air": 1.0,        # Direct inhalation - highest risk
    "water": 0.95,     # Drinking water contamination - nearly as high
    "land": 0.7,       # Soil contamination - bioaccumulation risk
    "disposal": 0.3,   # Contained disposal - lower immediate risk
    "recycling": 0.15, # Recovery processes - minimal release
}

# Use type weights
USE_WEIGHTS = {
    "manufactured": 1.0,  # On-site production - highest emissions
    "processed": 0.8,     # Processing - moderate emissions  
    "other": 0.5,         # Ancillary use - lower emissions
}

# -----------------------------
# PROXIMITY ANALYSIS
# Toronto sensitive locations (schools, hospitals, childcare)
# -----------------------------
SENSITIVE_LOCATIONS = [
    # Major hospital clusters
    {"lat": 43.6591, "lon": -79.3879, "type": "hospital", "name": "Toronto General Hospital", "weight": 2.5},
    {"lat": 43.6566, "lon": -79.3900, "type": "hospital", "name": "SickKids", "weight": 3.0},
    {"lat": 43.7315, "lon": -79.4558, "type": "hospital", "name": "Sunnybrook", "weight": 2.5},
    
    # University areas (high population density)
    {"lat": 43.6629, "lon": -79.3957, "type": "school", "name": "University of Toronto", "weight": 2.2},
    {"lat": 43.7735, "lon": -79.5019, "type": "school", "name": "York University", "weight": 2.2},
    {"lat": 43.7843, "lon": -79.1864, "type": "school", "name": "UofT Scarborough", "weight": 2.0},
    
    # High-density residential areas
    {"lat": 43.6426, "lon": -79.3871, "type": "residential", "name": "Downtown Core", "weight": 1.8},
    {"lat": 43.7615, "lon": -79.4111, "type": "residential", "name": "North York Centre", "weight": 1.5},
    {"lat": 43.7731, "lon": -79.2578, "type": "residential", "name": "Scarborough Town", "weight": 1.5},
]

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two lat/lon points"""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c

def calculate_proximity_risk(lat, lon):
    """Calculate risk multiplier based on proximity to sensitive locations"""
    max_risk = 1.0  # Baseline
    
    for loc in SENSITIVE_LOCATIONS:
        dist = haversine_distance(lat, lon, loc["lat"], loc["lon"])
        
        # Risk decays with distance: very high within 1km, moderate to 5km
        if dist < 1.0:
            risk_contribution = loc["weight"] * (1.0 - dist)
        elif dist < 5.0:
            risk_contribution = loc["weight"] * 0.3 * (1.0 - (dist - 1.0) / 4.0)
        else:
            risk_contribution = 0
            
        max_risk = max(max_risk, 1.0 + risk_contribution * 0.4)  # Up to 40% boost
    
    return max_risk

# =============================
# CLEANING / ROW NORMALIZATION
# =============================
def run_cleaning(csv_path):
    """Clean and normalize raw ChemTRAC data"""
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
        df["rel_air"] + df["rel_land"] + df["rel_water"] +
        df["rel_disposal"] + df["rel_recycling"]
    )

    out = os.path.join(PROC, "chemtrac_rows_clean.csv")
    df.to_csv(out, index=False)
    print(f"✔ Cleaning complete → {out} ({len(df)} rows)")
    return df

# =============================
# ADVANCED RISK MODEL
# =============================
def run_risk_model():
    """Calculate toxicity-weighted, proximity-adjusted risk scores"""
    df = pd.read_csv(os.path.join(PROC, "chemtrac_rows_clean.csv"))

    facilities = []

    for fid, g in df.groupby("facility_id"):
        # Calculate toxicity-weighted exposure score
        toxicity_weighted_exposure = 0.0
        max_single_chemical_toxicity = 0.0
        carcinogen_count = 0
        heavy_metal_kg = 0.0
        
        chemical_details = []
        
        for _, r in g.iterrows():
            chem_name = str(r["chemical_name"]).lower().strip()
            
            # Match chemical to toxicity database
            toxicity_score = 30.0  # Default for unknown chemicals
            for key, score in CHEMICAL_TOXICITY.items():
                if key in chem_name:
                    toxicity_score = max(toxicity_score, score)
                    break
            
            # Track carcinogens (toxicity > 80)
            if toxicity_score >= 80:
                carcinogen_count += 1
            
            # Track heavy metals
            if any(metal in chem_name for metal in ["mercury", "lead", "cadmium", "chromium", "arsenic"]):
                heavy_metal_kg += r["total_release_kg"]
            
            max_single_chemical_toxicity = max(max_single_chemical_toxicity, toxicity_score)
            
            # Calculate exposure pathways
            exposure_paths = []
            if r["rel_air"] > 0:
                exposure_paths.append(("air", r["rel_air"]))
            if r["rel_water"] > 0:
                exposure_paths.append(("water", r["rel_water"]))
            if r["rel_land"] > 0:
                exposure_paths.append(("land", r["rel_land"]))
            if r["rel_disposal"] > 0:
                exposure_paths.append(("disposal", r["rel_disposal"]))
            if r["rel_recycling"] > 0:
                exposure_paths.append(("recycling", r["rel_recycling"]))
            
            # Use type weighting
            use_weights_applied = []
            if r["use_manufactured"] == 1:
                use_weights_applied.append(USE_WEIGHTS["manufactured"])
            if r["use_processed"] == 1:
                use_weights_applied.append(USE_WEIGHTS["processed"])
            if r["use_other_use"] == 1:
                use_weights_applied.append(USE_WEIGHTS["other"])
            
            use_weight = max(use_weights_applied) if use_weights_applied else 0.4
            
            # Calculate weighted exposure for this chemical
            for pathway, amount_kg in exposure_paths:
                pathway_weight = EXPOSURE_WEIGHTS[pathway]
                contribution = amount_kg * (toxicity_score / 100.0) * pathway_weight * use_weight
                toxicity_weighted_exposure += contribution
            
            chemical_details.append({
                "name": r["chemical_name"],
                "amount_kg": r["total_release_kg"],
                "toxicity_score": toxicity_score,
            })
        
        # Calculate proximity risk multiplier
        lat = g["latitude"].iloc[0]
        lon = g["longitude"].iloc[0]
        proximity_multiplier = calculate_proximity_risk(lat, lon)
        
        # Industry normalization factor
        industry = g["industry"].iloc[0]
        total_kg = g["total_release_kg"].sum()
        
        facilities.append({
            "facility_id": fid,
            "facility_name": g["facility_name"].iloc[0],
            "industry": industry,
            "latitude": lat,
            "longitude": lon,
            "total_release_kg": total_kg,
            "n_chemicals": g["chemical_id"].nunique(),
            "toxicity_weighted_exposure": toxicity_weighted_exposure,
            "proximity_multiplier": proximity_multiplier,
            "max_chemical_toxicity": max_single_chemical_toxicity,
            "carcinogen_count": carcinogen_count,
            "heavy_metal_kg": heavy_metal_kg,
            "chemical_details": json.dumps(chemical_details),
        })

    fac = pd.DataFrame(facilities)
    
    # Feature engineering with robust scaling
    fac["log_release"] = np.log1p(fac["total_release_kg"])
    fac["log_toxicity_exposure"] = np.log1p(fac["toxicity_weighted_exposure"])
    fac["log_chems"] = np.log1p(fac["n_chemicals"])
    fac["log_heavy_metals"] = np.log1p(fac["heavy_metal_kg"])
    
    # Normalize within industries for fair comparison
    fac["industry_norm_release"] = fac.groupby("industry")["log_release"].transform(
        lambda x: (x - x.mean()) / (x.std() + 1e-9)
    )
    
    # Composite risk calculation
    scaler = RobustScaler()
    features_to_scale = ["log_toxicity_exposure", "log_release", "max_chemical_toxicity", "log_heavy_metals"]
    scaled_features = scaler.fit_transform(fac[features_to_scale])
    
    # Multi-factor risk score
    fac["base_risk"] = (
        0.40 * scaled_features[:, 0] +  # Toxicity-weighted exposure (highest weight)
        0.25 * scaled_features[:, 1] +  # Total release volume
        0.20 * scaled_features[:, 2] +  # Max single chemical toxicity
        0.15 * scaled_features[:, 3]    # Heavy metals
    )
    
    # Apply proximity multiplier
    fac["risk_score"] = fac["base_risk"] * fac["proximity_multiplier"]
    
    # Carcinogen bonus: facilities with 2+ carcinogens get +15% risk
    fac.loc[fac["carcinogen_count"] >= 2, "risk_score"] *= 1.15
    
    # Normalize to 0-100 scale
    fac["risk_score"] = (
        (fac["risk_score"] - fac["risk_score"].min()) /
        (fac["risk_score"].max() - fac["risk_score"].min() + 1e-9) * 100
    ).round(2)

    out = os.path.join(PROC, "facilities_with_risk.csv")
    fac.to_csv(out, index=False)
    print(f"✔ Advanced risk model complete → {out}")
    print(f"  - Top risk score: {fac['risk_score'].max():.2f}")
    print(f"  - Facilities with carcinogens: {(fac['carcinogen_count'] > 0).sum()}")
    print(f"  - Facilities with heavy metals: {(fac['heavy_metal_kg'] > 0).sum()}")
    return fac

# =============================
# ENSEMBLE ANOMALY DETECTION
# =============================
def run_anomaly_detection():
    """Multi-model anomaly detection with industry context"""
    df = pd.read_csv(os.path.join(PROC, "facilities_with_risk.csv"))
    
    # Features for anomaly detection
    features = [
        "risk_score",
        "log_toxicity_exposure",
        "log_release",
        "max_chemical_toxicity",
        "carcinogen_count",
        "log_heavy_metals",
        "industry_norm_release",
    ]
    
    X = df[features].fillna(0)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Ensemble approach: combine multiple anomaly detectors
    
    # 1. Isolation Forest (global outliers)
    iso = IsolationForest(
        contamination=0.06,
        random_state=42,
        n_estimators=200,
        max_samples=256,
    )
    iso_pred = iso.fit_predict(X_scaled)
    
    # 2. Industry-specific outliers
    industry_anomalies = []
    for industry in df["industry"].unique():
        mask = df["industry"] == industry
        if mask.sum() < 3:  # Skip industries with too few samples
            industry_anomalies.extend([False] * mask.sum())
            continue
        
        X_ind = X_scaled[mask]
        if len(X_ind) >= 3:
            iso_ind = IsolationForest(contamination=0.15, random_state=42)
            pred_ind = iso_ind.fit_predict(X_ind)
            industry_anomalies.extend(pred_ind == -1)
    
    # 3. Distance-based (extreme values)
    percentile_95 = np.percentile(df["risk_score"], 95)
    extreme_risk = df["risk_score"] > percentile_95
    
    # 4. Carcinogen + proximity anomalies
    dangerous_combo = (
        (df["carcinogen_count"] >= 2) &
        (df["proximity_multiplier"] > 1.3)
    )
    
    # Combine signals (anomaly if 2+ methods agree)
    anomaly_votes = (
        (iso_pred == -1).astype(int) +
        np.array(industry_anomalies).astype(int) +
        extreme_risk.astype(int) +
        dangerous_combo.astype(int)
    )
    
    df["anomaly"] = anomaly_votes >= 2
    df["anomaly_confidence"] = (anomaly_votes / 4.0 * 100).round(1)
    
    out = os.path.join(PROC, "facilities_with_risk_and_anomaly.csv")
    df.to_csv(out, index=False)
    
    print(f"✔ Ensemble anomaly detection complete → {out}")
    print(f"  - Anomalies detected: {df['anomaly'].sum()} ({df['anomaly'].sum() / len(df) * 100:.1f}%)")
    print(f"  - High confidence (>75%): {(df['anomaly_confidence'] > 75).sum()}")
    
    return df

# =============================
# FINAL WEB JSON
# =============================
def export_web_json():
    """Export facilities.json with all risk data"""
    rows = pd.read_csv(os.path.join(PROC, "chemtrac_rows_clean.csv"))
    fac = pd.read_csv(os.path.join(PROC, "facilities_with_risk_and_anomaly.csv"))

    risk_map = fac.set_index("facility_id").to_dict("index")

    facilities = []
    for fid, g in rows.groupby("facility_id"):
        meta = g.iloc[0]
        risk_data = risk_map.get(fid, {})

        chemicals = []
        for _, r in g.iterrows():
            if pd.notna(r["chemical_name"]):
                chem_name = str(r["chemical_name"]).lower().strip()
                toxicity = 30.0
                for key, score in CHEMICAL_TOXICITY.items():
                    if key in chem_name:
                        toxicity = max(toxicity, score)
                        break
                
                chemicals.append({
                    "name": r["chemical_name"],
                    "amount_kg": round(r["total_release_kg"], 3),
                    "toxicity_score": round(toxicity, 1),
                })

        facilities.append({
            "id": str(fid),
            "name": meta["facility_name"],
            "industry": meta["industry"],
            "latitude": float(meta["latitude"]),
            "longitude": float(meta["longitude"]),
            "total_release_kg": round(g["total_release_kg"].sum(), 3),
            "risk_score": risk_data.get("risk_score"),
            "anomaly": bool(risk_data.get("anomaly", False)),
            "anomaly_confidence": risk_data.get("anomaly_confidence", 0),
            "proximity_risk": round(risk_data.get("proximity_multiplier", 1.0), 2),
            "carcinogen_count": int(risk_data.get("carcinogen_count", 0)),
            "chemicals": sorted(chemicals, key=lambda x: x["amount_kg"], reverse=True),
        })

    out = os.path.join(OUT_WEB, "facilities.json")
    with open(out, "w") as f:
        json.dump(facilities, f, indent=2)

    print(f"✔ Web JSON exported → {out} ({len(facilities)} facilities)")
    print(f"  - With risk scores: {sum(1 for f in facilities if f['risk_score'] is not None)}")
    print(f"  - Anomalies: {sum(1 for f in facilities if f['anomaly'])}")

# =============================
# RUN ALL
# =============================
def run_all(csv_path):
    print("="*60)
    print("ChemTRAC Advanced Risk Assessment Pipeline")
    print("="*60)
    run_cleaning(csv_path)
    run_risk_model()
    run_anomaly_detection()
    export_web_json()
    print("="*60)
    print("✔ Pipeline complete!")
    print("="*60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to raw ChemTRAC CSV")
    args = parser.parse_args()
    run_all(args.csv)