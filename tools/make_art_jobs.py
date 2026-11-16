"""Writes tools/art_jobs.json: the job list for generate_art.py (brief 12 pose sets and brief 10 redraws)."""
import json
from pathlib import Path

B, C, E, F = ("03 ART INBOX — Milestone B", "03 ART INBOX — Milestone C", "03 ART INBOX — Milestone E", "03 ART INBOX — Milestone F")
BOARD = f"{E}/series_2_teatime_friends_concept_board_v2.png"
SNUG = {
    "master": f"{B}/char_snug_master.png", "portrait": f"{B}/char_snug_portrait.png", "idle": f"{B}/char_snug_idle_v2.png",
    "walk": f"{B}/char_snug_walk.png", "walk2": f"{C}/char_snug_walk2.png", "sit": f"{B}/char_snug_sit.png",
    "sleep": f"{B}/char_snug_sleep.png", "happy": f"{B}/char_snug_happy.png",
}
RULES = (
    " Soft felt-and-stitch storybook plush style, matching the concept board. Plain pure-white background."
    " No ground shadow, no contact shadow, no floor, no text, no logo, no watermark. Nothing cropped; leave a small margin on every side."
    " The character is an original design: do not move it toward any existing brand character."
)
CHARS = [
    ("crumb", "Crumb", "top row, first from the left", "A mouse baker. Keep the baker's cap, the apron and the flour on the nose. Holds nothing while walking.",
     "a small rolling pin tucked in the apron and a gold star stitched on the cap"),
    ("mallow", "Mallow", "top row, second from the left", "A cream hamster with one toasted patch and the whipped-cream swirl on the head. Very round; the short legs must still be visible when walking.",
     "a cocoa-brown knitted scarf and a tiny mug charm"),
    ("pekoe", "Pekoe", "top row, third from the left", "An otter with the teapot-lid hat and the green leaf scarf. Holds the teacup only when standing still or sitting.",
     "the lid hat in a blue-and-white porcelain pattern, and a quilted tea-cosy vest"),
    ("jammy", "Jammy", "top row, fourth from the left", "A strawberry-red hedgehog with the gingham bonnet. The jam-lid shield hangs at the side while walking.",
     "lace trim on the bonnet and a little jam spoon"),
    ("whisk", "Whisk", "top row, fifth from the left", "A yellow duckling with the feather tuft, lavender bow and apron. No hat. Holds the whisk.",
     "a lavender neckerchief instead of the bow, and a small piping bag"),
    ("dumple", "Dumple", "bottom row, first from the left", "A panda cub with the steamed-bun top on the head. Stands and walks WITHOUT the bamboo steamer basket.",
     "a small red embroidered vest with cloud-shaped buttons"),
    ("sprinkle", "Sprinkle", "bottom row, second from the left", "A pastel kitten speckled with confetti dots. The bow stays on the chest, never on an ear. The mouth stays visible.",
     "a candy-bead necklace and a short sprinkle-dotted cape"),
    ("toffee", "Toffee", "bottom row, third from the left", "A caramel-striped raccoon with the flat cap. Holds the cookie only when standing still or sitting. Never an apron.",
     "a caramel-drizzle patterned scarf and a small cookie satchel"),
    ("souffle", "Soufflé", "bottom row, fourth from the left", "A cream swan with the headband and the neckerchief. No hat. Waddles on two feet when walking.",
     "a pearl-trimmed lavender shawl"),
    ("cherri", "Cherri", "bottom row, fifth from the left", "A small round cherry creature with the leaf stem. Not human-like: no hair, no wings. Add a soft warm glow around the body.",
     "a second leaf with a tiny white blossom, and a slightly brighter glow"),
]
POSES = {
    "portrait": "Head and shoulders only, facing slightly right, friendly expression.",
    "idle": "Standing still, three-quarter view facing right.",
    "walk": "Walking to the right, one foot forward.",
    "walk2": "Walking to the right with the OTHER foot forward. Everything except the legs must line up exactly with the walking image supplied.",
    "sit": "Sitting upright facing the viewer, feet forward.",
    "sleep": "Lying curled up asleep, head on the right, eyes closed.",
    "happy": "Standing, joyful, arms up.",
}
SPECIAL = {
    ("dumple", "sleep"): "Curled up asleep INSIDE the bamboo steamer basket from the board, head on the right, eyes closed.",
    ("cherri", "walk"): "A small hop to the right: body slightly squashed, just leaving the ground.",
    ("cherri", "walk2"): "The same hop at its top: body slightly stretched. Same position and size as the other hop image supplied.",
}

jobs = []
for cid, name, where, notes, deco in CHARS:
    who = f"the character called {name}: the one in the {where} of the concept board (first image). {notes}"
    master = f"{F}/char_{cid}_master.png"
    jobs.append({
        "stage": "masters", "out": master, "size": "2048x1024", "refs": [BOARD, SNUG["master"]],
        "prompt": f"Draw a reference sheet of {who} Show a front view and a side view side by side, full body, same size. Match the board exactly: same colours, proportions, face and accessories. The second image is a reference sheet of a different character and shows only the layout to follow." + RULES,
    })
    for pose, what in POSES.items():
        what = SPECIAL.get((cid, pose), what)
        out = f"{F}/char_{cid}_{pose}.png"
        refs = [BOARD, master, SNUG[pose]]
        extra = "The third image shows a different character (Snug) in this pose: copy only the pose, framing, scale and camera angle from it, never the design."
        if pose == "walk2":
            refs.append(f"{F}/char_{cid}_walk.png")
            extra += f" The fourth image is {name}'s first walking image: match it exactly apart from the legs."
        elif pose != "idle" and pose != "portrait":
            refs.append(f"{F}/char_{cid}_idle.png")
            extra += f" The fourth image is {name} standing: keep the same head size, body size and details."
        jobs.append({
            "stage": "poses", "out": out, "size": "1024x1024", "refs": refs,
            "prompt": f"Draw {who} Pose: {what} The second image is {name}'s approved reference sheet: match it exactly. {extra} Full body unless the pose says otherwise, feet near the bottom of the image." + RULES,
        })
    for pose in ("idle", "walk", "walk2", "sit", "sleep"):
        normal = f"{F}/char_{cid}_{pose}.png"
        refs = [normal, master]
        extra = ""
        if pose != "idle":
            refs.append(f"{F}/char_{cid}_decorated_idle.png")
            extra = f" The third image shows {name} already wearing this Decorated look while standing: draw the additions exactly the same way."
        jobs.append({
            "stage": "poses", "out": f"{F}/char_{cid}_decorated_{pose}.png", "size": "1024x1024", "refs": refs,
            "prompt": f"The first image is an approved pose of {name}, a plush character. Redraw this exact image with {name}'s Decorated look added: {deco}. Change nothing else: same pose, framing, scale, colours and details. The second image is {name}'s reference sheet.{extra}" + RULES,
        })

# Brief 10 redraws
jobs.append({
    "stage": "redraws", "out": f"{E}/char_tinker_costume_apron_idle_v2.png", "size": "1024x1024",
    "refs": [f"{B}/char_tinker_idle.png", f"{E}/char_tinker_costume_apron_walk.png"],
    "prompt": "The first image is the approved standing pose of Tinker. The second shows Tinker correctly wearing the Workshop Apron costume while walking. Redraw the standing pose with the same apron: tan felt apron with two pockets, a tiny felt spanner and a pencil. Tinker must look exactly as in the first image: same round face, same brown aviator helmet with goggles, same olive jacket, same proportions. Do not change the face, do not add fleece, a snout or a scarf. Same pose, framing and scale as the first image." + RULES,
})
jobs.append({
    "stage": "redraws", "out": f"{E}/char_hush_costume_cloak_idle_v2.png", "size": "1024x1024",
    "refs": [f"{C}/char_hush_idle_v2.png", f"{E}/char_hush_costume_cloak_walk.png"],
    "prompt": "The first image is the approved standing pose of Hush. The second shows Hush correctly wearing the Stargazer Cloak costume while walking: a midnight-blue hooded cloak with gold stitched constellations, including the hood, and a tiny telescope. Redraw the standing pose wearing that same cloak. The hood must be midnight blue with constellations, not purple. Everything else about Hush stays as in the first image: face, ears, crescent moon, pose, framing and scale." + RULES,
})
LUMA = {"idle": f"{C}/char_luma_idle.png", "walk": f"{C}/char_luma_walk.png", "walk2": f"{C}/char_luma_walk2.png", "sit": f"{C}/char_luma_sit.png", "sleep": f"{C}/char_luma_sleep_v2.png"}
for pose, src in LUMA.items():
    refs = [src]
    extra = ""
    if pose != "idle":
        refs.append(f"{E}/char_luma_costume_crown_idle_v2.png")
        extra = " The second image shows Luma already wearing this crown while standing: draw the crown exactly the same way."
    jobs.append({
        "stage": "redraws", "out": f"{E}/char_luma_costume_crown_{pose}_v2.png", "size": "1024x1024", "refs": refs,
        "prompt": "The first image is an approved pose of Luma. Redraw this exact image with Luma wearing the Wish Crown costume, clearly visible at small size: a crown of five large folded-paper stars in warm gold, sitting around the head like a wreath just below Luma's existing star topper, each paper star about a quarter of the width of Luma's face, with a soft golden glow around the crown. Keep Luma exactly as approved in every other way: same face, hair, dress, star topper, pose, framing and scale." + extra + RULES,
    })

Path(__file__).with_name("art_jobs.json").write_text(json.dumps(jobs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(len(jobs), "jobs:", {s: sum(j["stage"] == s for j in jobs) for s in ("masters", "poses", "redraws")})
