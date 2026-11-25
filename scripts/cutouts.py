"""Make background-free copies of player portraits, so card effects can sit BEHIND the player.

Reads portraits from the public Supabase bucket `player-portraits/{TEAM}/{Name}.jpeg` and writes
`{OUT}/{TEAM}/{Name}.webp`: same framing as the original (so it lines up exactly on top of it),
600px wide, transparent background. Already-made cutouts are skipped unless FORCE=1.

Clean-up after the model (the portraits are pixel art, so edges should be crisp):
  · the model's mask is cut at 50% (no half-see-through hair or jersey)
  · only the main figure is kept (stray specks of background are dropped)
  · holes inside the figure are filled (no see-through teeth, eyes or jersey numbers)
  · the figure is grown by 1px so the dark outline of the art stays on the player

Env: MODEL (default birefnet-portrait), OUT (default cutouts), FORCE (1 = remake existing).
Usage:  python scripts/cutouts.py "OKC/Shai Gilgeous-Alexander" "DEN/Nikola Jokic" ...
        python scripts/cutouts.py ALL          (every portrait in the bucket)
"""
import io, json, os, sys, urllib.parse, urllib.request
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

BASE = "https://ipsngddnavymcmfbbcxu.supabase.co"
BUCKET = "player-portraits"
ANON = os.environ.get("SUPABASE_ANON", "")
OUT = os.environ.get("OUT") or "cutouts"
MODEL = os.environ.get("MODEL") or "birefnet-portrait"
FORCE = os.environ.get("FORCE") == "1"


def list_all():
    """Every TEAM/Name in the bucket (folders are teams)."""
    def ls(prefix):
        req = urllib.request.Request(f"{BASE}/storage/v1/object/list/{BUCKET}",
            data=json.dumps({"prefix": prefix, "limit": 1000, "offset": 0}).encode(),
            headers={"apikey": ANON, "Authorization": f"Bearer {ANON}", "Content-Type": "application/json"})
        return json.load(urllib.request.urlopen(req, timeout=30))
    out = []
    for team in ls(""):
        if team.get("id") is None and len(team["name"]) <= 4:          # folder
            for f in ls(team["name"] + "/"):
                if f["name"].lower().endswith((".jpeg", ".jpg", ".png")):
                    out.append(f"{team['name']}/{f['name'].rsplit('.', 1)[0]}")
    return out


def clean(mask):
    """mask: 0..255 array from the model -> tidy hard-edged 0/255 mask."""
    m = mask >= 128
    lab, n = ndimage.label(m)
    if n > 1:                                   # keep the biggest piece, plus any piece over 3% of it
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s >= max(sizes) * 0.03]
        m = np.isin(lab, keep)
    m = ndimage.binary_fill_holes(m)
    m = ndimage.binary_dilation(m, iterations=1)
    return (m * 255).astype(np.uint8)


def main(args):
    players = list_all() if args == ["ALL"] else [a for a in args if a.strip()]
    session = new_session(MODEL)
    made = 0
    for tp in players:
        team, name = tp.strip().split("/", 1)
        dest = os.path.join(OUT, team, name + ".webp")
        if os.path.exists(dest) and not FORCE:
            continue
        url = f"{BASE}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(team)}/{urllib.parse.quote(name)}.jpeg"
        try:
            src = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert("RGB")
        except Exception as e:
            print("skip", tp, e); continue
        mask = np.array(remove(src, session=session, only_mask=True).convert("L"))
        cut = src.convert("RGBA"); cut.putalpha(Image.fromarray(clean(mask)))
        w = 600; h = round(cut.height * w / cut.width)
        cut = cut.resize((w, h), Image.NEAREST if src.width == w else Image.LANCZOS)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        cut.save(dest, "WEBP", quality=88, method=6)
        made += 1
        print("made", tp, flush=True)
    print(f"done: {made} new cutouts with {MODEL}")


if __name__ == "__main__":
    main(sys.argv[1:])
