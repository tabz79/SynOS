import json

with open("scratch/db_template_Pathology_Detailed_2Column.json", "r", encoding="utf-8") as f:
    data = json.load(f)

header = next(s for s in data["sections"] if s["type"] == "Header")
config = header.get("config", {})

for k, v in config.items():
    if k != "backgroundPath":
        print(f"{k}: {v}")
    else:
        print(f"backgroundPath: <base64 string of length {len(v)}>")
