"""Write cutouts/index.json: the TEAM/Name of every cutout, for the Card Shape Lab's check view."""
import json, os
L = sorted(f"{d.split(os.sep, 1)[1]}/{f[:-5]}" for d, _, F in os.walk("cutouts") for f in F if f.endswith(".webp"))
json.dump(L, open("cutouts/index.json", "w"), separators=(",", ":"))
print(len(L), "cutouts listed")
