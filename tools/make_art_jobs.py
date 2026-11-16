"""Writes tools/art_jobs.json: the job list for generate_art.py (brief 12 pose sets and brief 10 redraws)."""
import json
from pathlib import Path

B, C, E, F = ("03 ART INBOX — Milestone B", "03 ART INBOX — Milestone C", "03 ART INBOX — Milestone E", "03 ART INBOX — Milestone F")
D = "03 ART INBOX — Milestone D"
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
    "walk2": "Walking to the right, mid-step with the opposite leg forward compared with a first step: copy the leg positions exactly from the Snug image supplied, where the far leg swings forward and lifted with the sole showing and the near leg is back.",
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
        if False:
            pass
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

# Series 2 items: Kitchen and Tea Garden furniture, series keepsakes, icons, the Teatime Parcel and one trip card.
ITEM_RULES = (
    " Soft felt-and-stitch storybook style with visible stitching, exactly like the reference images: same materials, lighting, outline softness and level of detail."
    " One single object, centred, filling most of the image, on a plain pure-white background."
    " No ground shadow, no contact shadow, no floor, no wall, no characters, no text, no letters, no logo, no watermark. Nothing cropped; leave a small margin on every side."
)
KITCHEN = f"{E}/room_kitchen_background.png"
GARDEN = f"{E}/room_teagarden_background.png"
FLOOR_REFS = [f"{B}/furn_cozy_sofa.png", f"{C}/furn_tea_table.png", f"{D}/furn_mini_oven.png"]
WALL_REFS = [f"{B}/furn_round_window.png", f"{C}/furn_hanging_plant.png", f"{D}/furn_lantern_string_v2.png"]
RUG_REFS = [f"{B}/furn_star_rug.png", f"{D}/furn_button_rug.png"]
FLOOR = "A piece of dollhouse furniture seen from the front and slightly above (three-quarter view), like the first three reference images."
WALL = "A decoration that hangs flat on a wall, seen straight from the front, like the first three reference images."
RUG = "A flat rug lying on the floor, seen from above at the same slanted angle as the first two reference images (a wide, flattened shape)."
ROOM_K = " The last image is the room it will stand in: choose colours that sit well in it (warm cream, butter yellow, soft wood, a little sage green)."
ROOM_G = " The last image is the garden it will stand in: choose colours that sit well in it (pale stone, rose pink, sage green, cream)."
FURN = [
    ("little_oven", FLOOR, KITCHEN, "A small rounded cream-enamel oven with a glass door glowing warm orange, one tiny pie visible inside, brass knobs and a little stovepipe. About as tall as it is wide."),
    ("kitchen_counter", FLOOR, KITCHEN, "A kitchen counter twice as wide as it is tall: pale wood top, butter-yellow cupboard doors with heart cut-outs, a mixing bowl and a rolling pin on top."),
    ("tea_trolley", FLOOR, KITCHEN, "A small two-tier wooden tea trolley on wheels with a round teapot, two cups and a sugar bowl. About as tall as it is wide."),
    ("cake_stand", FLOOR, KITCHEN, "A three-tier cake stand on a little round side table, holding felt cupcakes and a slice of strawberry cake. Taller than it is wide."),
    ("jam_shelf", WALL, KITCHEN, "A wooden wall shelf twice as wide as it is tall, with a row of jam jars in red, orange and purple, each with a gingham cloth lid."),
    ("bamboo_steamer", FLOOR, KITCHEN, "A stack of two round woven bamboo steamer baskets with the lid slightly ajar and a wisp of felt steam, standing on a low wooden stool. No character inside."),
    ("spice_rack", WALL, KITCHEN, "A small square wooden spice rack with six little labelled-looking jars (no readable text) and a sprig of dried herbs hanging below."),
    ("gingham_curtains", WALL, KITCHEN, "A pair of short butter-yellow and white gingham cafe curtains on a wooden rod, tied back at each side with bows, open in the middle so a window could show through. Twice as wide as tall; the middle between the curtains is pure white (empty)."),
    ("flour_sacks", FLOOR, KITCHEN, "Two plump cloth flour sacks leaning together, one with a stitched wheat symbol, a wooden scoop resting on top and a small puff of spilled flour."),
    ("cookie_jar", FLOOR, KITCHEN, "A big round glass cookie jar full of star and heart cookies, with a pink felt lid and a ribbon, standing on a small stool."),
    ("checkered_rug", RUG, KITCHEN, "A square rug in a soft red-and-cream checkered pattern with a scalloped cream border and stitched edge."),
    ("breakfast_nook", FLOOR, KITCHEN, "A cosy breakfast bench twice as wide as it is tall: a curved wooden bench with sage-green cushions and a small round table in front holding a plate of toast."),
    ("hanging_pans", WALL, KITCHEN, "A wooden rail twice as wide as it is tall with three copper pans and a ladle hanging from hooks."),
    ("candy_bunting", WALL, KITCHEN, "A string of bunting twice as wide as it is tall: pastel triangle flags alternating with felt wrapped sweets and lollipops, hanging in a gentle curve."),
    ("berry_patch", FLOOR, GARDEN, "A low wooden garden bed twice as wide as it is tall, full of strawberry plants with ripe red berries, white blossoms and a tiny wooden sign with a strawberry drawn on it (no text)."),
    ("old_oven", FLOOR, KITCHEN, "An old cast-iron range oven in dark charcoal with brass trim, lovingly mended: a stitched patch on one side, a warm glow behind the door grille and a small kettle on top. About as tall as it is wide."),
    ("tea_party_table", FLOOR, GARDEN, "A round table twice as wide as it is tall, with a lace-edged cream tablecloth, laid for a tea party: a teapot, four cups, a tiered plate of cakes and a small vase of roses."),
    ("garden_parasol", FLOOR, GARDEN, "A garden parasol with a scalloped pink-and-cream striped canopy on a wooden pole with a round stone base. Taller than it is wide."),
    ("macaron_stool", FLOOR, GARDEN, "A small round stool shaped like a pastel pink macaron with a cream filling layer, on three short wooden legs."),
    ("teacup_planter", FLOOR, GARDEN, "A giant teacup on a saucer used as a planter, with pink and white flowers and trailing leaves growing out of it."),
    ("picnic_blanket", RUG, GARDEN, "A square picnic blanket in pink-and-white gingham with a stitched border, with a tiny basket and two felt sandwiches lying flat on one corner."),
    ("first_residents_trophy", FLOOR, None, "A small keepsake display: a glass dome on a wooden base with a golden four-point star and a tiny felt cottage inside. A treasured trophy."),
    ("teatime_trophy", FLOOR, None, "A small keepsake display: a glass dome on a wooden base with a golden teapot and a single red cherry inside. A treasured trophy."),
]
for fid, kind, room, what in FURN:
    refs = list(RUG_REFS if kind is RUG else WALL_REFS if kind is WALL else FLOOR_REFS)
    note = ""
    if room:
        refs.append(room)
        note = ROOM_K if room == KITCHEN else ROOM_G
    jobs.append({"stage": "items", "out": f"{F}/furn_{fid}.png", "size": "1024x1024", "refs": refs, "prompt": f"{kind} Draw this new piece in the same style: {what}{note}" + ITEM_RULES})
jobs.append({
    "stage": "items", "out": f"{F}/icon_treats.png", "size": "1024x1024", "refs": [f"{B}/icon_buttons.png", f"{C}/icon_ribbon.png"],
    "prompt": "The two reference images are currency icons from a game. Draw a new icon in exactly the same style and size: Treats, shown as one round felt cookie with pink icing and three sprinkles, with a small bite-sized star cookie tucked beside it. Bold simple shape that reads clearly at very small size." + ITEM_RULES,
})
jobs.append({
    "stage": "items", "out": f"{F}/parcel_teatime_closed.png", "size": "1024x1024", "refs": [f"{B}/parcel_closed.png"],
    "prompt": "The reference image is a mystery parcel from a game. Draw a new parcel in exactly the same style, size and angle: the Teatime Parcel, a closed round cake box in pink-and-cream gingham, tied with a cream ribbon and a bow, with a small felt cherry on top." + ITEM_RULES,
})
jobs.append({
    "stage": "items", "out": f"{F}/parcel_teatime_open.png", "size": "1024x1024", "refs": [f"{B}/parcel_open.png", f"{F}/parcel_teatime_closed.png"],
    "prompt": "The first image is an opened mystery parcel from a game; the second is the closed Teatime Parcel. Draw the Teatime Parcel opened, in the same style, size and angle as the first image: the same pink-and-cream gingham cake box with its lid lifted off and leaning against it, ribbon untied, warm golden light and a few sparkles rising from inside. Nothing else inside." + ITEM_RULES,
})
jobs.append({
    "stage": "items", "out": f"{F}/exp_moonlit_market.png", "size": "1024x1024", "refs": [f"{C}/exp_old_mill.png", f"{C}/exp_meadow.png"],
    "prompt": "The two reference images are square scene cards for trips in a game. Draw a new card in exactly the same style, framing and corner shape: the Moonlit Market, a tiny night market under a big cream moon, with three felt stalls with striped awnings selling sweets, strings of glowing paper lanterns, and a cobbled path leading in. Deep blue and plum night colours with warm lantern light. No characters, no text, no logo, no watermark.",
})

Path(__file__).with_name("art_jobs.json").write_text(json.dumps(jobs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(len(jobs), "jobs:", {s: sum(j["stage"] == s for j in jobs) for s in ("masters", "poses", "redraws", "items")})
