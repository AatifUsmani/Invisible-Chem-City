import os
import json
import folium

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DATA = os.path.join(BASE, "web", "public", "data")
OUT = os.path.join(BASE, "output")
os.makedirs(OUT, exist_ok=True)

def risk_color(score):
    if score is None:
        return "gray"
    if score >= 80:
        return "darkred"
    if score >= 60:
        return "red"
    if score >= 40:
        return "orange"
    if score >= 20:
        return "lightgreen"
    return "green"

def build_map():
    path = os.path.join(WEB_DATA, "facilities.json")
    if not os.path.exists(path):
        raise FileNotFoundError("facilities.json not found — run pipeline first")

    with open(path) as f:
        facilities = json.load(f)

    m = folium.Map(
        location=[43.65, -79.38],
        zoom_start=11,
        tiles="CartoDB positron",
    )

    for fac in facilities:
        lat = fac.get("latitude")
        lon = fac.get("longitude")
        if lat is None or lon is None:
            continue

        score = fac.get("risk_score")
        is_anom = fac.get("anomaly", False)

        popup = f"""
        <b>{fac['name']}</b><br>
        Industry: {fac['industry']}<br>
        Risk score: {score}<br>
        Total release (kg): {fac['total_release_kg']:,.0f}
        """ + ("<br><b>⚠ Anomaly</b>" if is_anom else "")

        folium.CircleMarker(
            location=[lat, lon],
            radius=6 + (score or 0) / 15,
            color="black" if is_anom else risk_color(score),
            weight=2 if is_anom else 1,
            fill=True,
            fill_color=risk_color(score),
            fill_opacity=0.7,
            popup=popup,
        ).add_to(m)

    out_path = os.path.join(OUT, "map.html")
    m.save(out_path)
    print(f"✔ Map saved to {out_path}")

if __name__ == "__main__":
    main()
