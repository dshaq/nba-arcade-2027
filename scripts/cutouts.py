"""Make background-free copies of player portraits, for cards where the player bursts out of the frame.

Reads portraits from the public Supabase bucket `player-portraits/{TEAM}/{Name}.jpeg` and writes
`cutouts/{TEAM}/{Name}.webp`: same framing as the original (so it lines up exactly on top of it),
600px wide, transparent background. Already-made cutouts are skipped.

Usage:  python scripts/cutouts.py "OKC/Shai Gilgeous-Alexander" "DEN/Nikola Jokic" ...
        python scripts/cutouts.py ALL          (every portrait in the bucket)
"""
import io, json, os, sys, urllib.parse, urllib.request
from PIL import Image
from rembg import new_session, remove

BASE = "https://ipsngddnavymcmfbbcxu.supabase.co"
BUCKET = "player-portraits"
ANON = os.environ.get("SUPABASE_ANON", "")
OUT = "cutouts"


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


def main(args):
    players = list_all() if args == ["ALL"] else args
    session = new_session("isnet-general-use")
    made = 0
    for tp in players:
        team, name = tp.split("/", 1)
        dest = os.path.join(OUT, team, name + ".webp")
        if os.path.exists(dest):
            continue
        url = f"{BASE}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(team)}/{urllib.parse.quote(name)}.jpeg"
        try:
            src = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=30).read())).convert("RGB")
        except Exception as e:
            print("skip", tp, e); continue
        cut = remove(src, session=session, alpha_matting=True, alpha_matting_foreground_threshold=235,
                     alpha_matting_background_threshold=20, alpha_matting_erode_size=8)
        w = 600; h = round(cut.height * w / cut.width)
        cut = cut.resize((w, h), Image.LANCZOS)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        cut.save(dest, "WEBP", quality=84, method=6)
        made += 1
        print("made", tp)
    print(f"done: {made} new cutouts")


if __name__ == "__main__":
    main(sys.argv[1:])
