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


# Teatime Friends costumes: one each, five poses, drawn over the approved normal poses.
TEA_COSTUMES = [
    ('crumb', 'chef', 'Grand Chef Whites', "a tall puffy white chef's toque (replacing the small cap) and a white double-breasted chef's jacket with two rows of red buttons and a small red neckerchief"),
    ('whisk', 'bee', 'Honeybee Hoodie', 'a short hooded cape in soft yellow and chocolate-brown stripes with the hood up, two bobbly felt antennae on the hood and a pair of tiny round felt wings on the back'),
    ('mallow', 'pyjamas', 'Marshmallow Pyjamas', 'a floppy pastel-pink nightcap with a white pom-pom worn behind the whipped-cream swirl, a pink-and-white striped pyjama top, and fluffy pink slippers on the feet'),
    ('pekoe', 'robe', 'Garden Tea Robe', 'a sage-green wrap robe with a cream sash and embroidered tea leaves on the hem, and a small round woven straw sun hat replacing the teapot-lid hat'),
    ('jammy', 'picker', 'Berry Picker', 'a wide-brimmed straw sun hat with a red strawberry-print ribbon (replacing the bonnet) and a small wicker basket full of strawberries carried on the back with two straps'),
    ('dumple', 'snow', 'Snow Day Knits', 'a pale-blue knitted bobble hat pulled over the bun on the head with the bun shape still showing, matching pale-blue mittens, and a long cream-and-blue striped knitted scarf'),
    ('sprinkle', 'tutu', 'Sugar Plum Tutu', 'a fluffy lilac ballet tutu dotted with sugar-crystal sparkles, lilac ribbon ballet slippers, and a tiny silver tiara between the ears'),
    ('toffee', 'coat', 'Market Day Coat', "a long plum-purple trader's coat with gold buttons and a turned-up collar over the body, and a small glowing paper lantern on a short stick held in one paw instead of the cookie"),
    ('souffle', 'hat', 'Garden Party Hat', 'a wide-brimmed cream garden-party hat piled with pink felt roses and a trailing ribbon (replacing the headband), and a pink rose corsage on the chest instead of the neckerchief'),
    ('cherri', 'sundae', 'Sundae Best', 'a small whipped-cream swirl with coloured sprinkles sitting at the base of the stem like a hat, and a short cape shaped like a golden waffle wafer fan on the back'),
]
NAMES = {c[0]: c[1] for c in CHARS}
for cid, word, cname, art in TEA_COSTUMES:
    name = NAMES[cid]
    for pose in ("idle", "walk", "walk2", "sit", "sleep"):
        refs = [f"{F}/char_{cid}_{pose}.png", f"{F}/char_{cid}_master.png"]
        extra = ""
        if pose != "idle":
            refs.append(f"{F}/char_{cid}_costume_{word}_idle.png")
            extra = f" The third image shows {name} already wearing this costume while standing: draw the costume exactly the same way, same colours and details."
        jobs.append({
            "stage": "costumes", "out": f"{F}/char_{cid}_costume_{word}_{pose}.png", "size": "1024x1024", "refs": refs,
            "prompt": f"The first image is an approved pose of {name}, a plush character. Redraw this exact image with {name} wearing the '{cname}' costume: {art}. The costume must be clearly visible at small size. Change nothing else: same pose, framing, scale, body colours, face and proportions. The second image is {name}'s reference sheet, for the character's own details only.{extra}" + RULES,
        })


# Arcade extras: finished embroidery for the ten newer stitch patterns, and a red button for Button Catch.
STITCH_DONE = [
    ('05', 'button', 'a round four-hole sewing button in soft lilac, with a slightly raised rim'),
    ('06', 'gem', 'a faceted gemstone in turquoise and teal, pointed at the bottom, with lighter facets at the top'),
    ('07', 'leaf', 'a single pointed leaf in fresh green with a darker centre vein and side veins'),
    ('08', 'raindrop', 'a single raindrop in sky blue, pointed at the top and round at the bottom, with a small lighter highlight'),
    ('09', 'moon', 'a crescent moon in soft buttery yellow, open to the right'),
    ('10', 'crown', 'a simple three-point crown in golden yellow with one small pink gem at the base of each point'),
    ('11', 'mushroom', 'a mushroom with a round red cap with cream spots on a short cream stem'),
    ('12', 'fish', 'a plump little fish in coral orange facing left, with a forked tail on the right and one small dark eye'),
    ('13', 'cat', "a cat's head in warm grey facing forward, with two pointed ears with pink insides, closed happy eyes, a tiny pink nose and whiskers"),
    ('14', 'cloud', 'a fluffy white cloud with three puffs and a flat base, edged in pale blue stitching'),
]
for num, name, desc in STITCH_DONE:
    jobs.append({
        "stage": "arcade", "out": f"{F}/game_stitch_done_{num}.png", "size": "1024x1024",
        "refs": [f"{D}/game_stitch_done_02.png", f"{D}/game_stitch_done_03.png", f"{D}/game_stitch_done_04.png"],
        "prompt": f"The three reference images are finished embroidery hoops from a game: the same golden wooden hoop with its brass screw at the top, the same cream fabric, each with one embroidered motif filled with satin stitches and a stitched outline. Draw a new one that is identical in hoop, fabric, size, framing, lighting and stitch style, but with this motif instead: {desc}. The motif is the only thing on the fabric, centred, about as large as the motifs in the references. Plain pure-white background, no shadow under the hoop, no text, no letters, no watermark. Nothing cropped.",
    })
jobs.append({
    "stage": "arcade", "out": f"{F}/game_button_catch_red.png", "size": "1024x1024",
    "refs": [f"{D}/game_button_catch_button.png", f"{D}/game_button_catch_gold.png"],
    "prompt": "The two reference images are sewing buttons from a game (a normal one and a golden one). Draw a third button in exactly the same style, size, angle and level of detail: a bright cherry-red felt button with four holes, a white stitched rim, and a small darker-red cross of thread through the holes, so it clearly reads as the 'wrong' button. Same soft felt-and-stitch look as the references. One single object, centred, on a plain pure-white background. No ground shadow, no text, no watermark. Nothing cropped.",
})

# Gymno Garden art test (owner decision 1): one gymno, 7 images, neutral colour so the game can tint them.
# Body first: the other images use its outline, so they line up when layered.
GYMNO_RULES = (
    " Soft felt-and-stitch storybook style, matching the concept board, with visible stitching along the ribs."
    " Plain pure-white background. One single object, centred, filling about 70 percent of the frame, same camera angle as the first image."
    " No ground shadow, no contact shadow, no pot, no text, no letters, no logo, no watermark. Nothing cropped."
)
GYMNO_BODY = f"{F}/gymno_test_body_mature.png"
GYMNO_TINT = " Keep the colour neutral: a light warm grey-cream felt with only soft shading, no colour, so the game can tint it in code."
GYMNO_TEST = [
    ("body_mature", [BOARD],
     "A round gymnocalycium cactus, a plump ball with eight soft vertical ribs, each rib marked by a stitched seam line, a small flat top with a tuft of short felt spines in the centre, and a row of tiny felt spines along each rib." + GYMNO_TINT),
    ("body_young", [GYMNO_BODY, BOARD],
     "The same cactus as the first image, but younger and smaller: about two-thirds of its width, five ribs instead of eight, a slightly flatter top and fewer, shorter spines. Same style and colour." + GYMNO_TINT),
    ("body_seedling", [GYMNO_BODY],
     "A tiny seedling of the same cactus: a small smooth ball about one third of the width of the first image, with three faint ribs and no spines, sitting in the lower middle of the frame. Same style and colour." + GYMNO_TINT),
    ("pattern_striped", [GYMNO_BODY],
     "Only a pattern, drawn over exactly the same cactus as the first image: thin straight stripes running from the top to the bottom of the body, following the ribs, in one single darker shade of the same colour. The rest of the body stays plain. Same size, position and outline as the first image. Everything else is pure white. Draw the stripes only, with no outline of the cactus."),
    ("pattern_banded", [GYMNO_BODY],
     "Only a pattern, drawn over exactly the same cactus as the first image: evenly spaced horizontal bands wrapping around the body, in one single darker shade of the same colour, each band a clean stitched edge. The rest of the body stays plain. Same size, position and outline as the first image. Everything else is pure white. Draw the bands only, with no outline of the cactus."),
    ("pattern_variegated", [GYMNO_BODY],
     "Only a pattern, drawn over exactly the same cactus as the first image: irregular soft-edged splashes and patches in one single darker shade of the same colour, spread across the body like a variegated gymno, leaving about half the body plain. Same size, position and outline as the first image. Everything else is pure white. Draw the splashes only, with no outline of the cactus."),
    ("flower", [GYMNO_BODY, BOARD],
     "A single flower on a short stem, from the top of a cactus: a bowl-shaped bloom with many narrow petals in a pale neutral cream, a smooth closed bud beside it with no spines, and a small golden-cream centre. Neutral pale colour so the game can tint the petals in code. Same felt-and-stitch style as the first image. Centred, on pure white."),
]
for name, refs, prompt in GYMNO_TEST:
    jobs.append({"stage": "gymno_test", "out": f"{F}/gymno_test_{name}.png", "size": "1024x1024", "refs": refs, "prompt": prompt + GYMNO_RULES})

# Gymno Garden art test, round 2: the first set looked like plush pompoms on a pumpkin. These prompts describe the real plant:
# a ribbed ball with short stiff spines in neat rows, a woolly crown, and a smooth bud. Body and bloom only; patterns come later.
GYMNO2_RULES = (
    " Felt craft with fine visible stitching in the valleys between the ribs, lit softly from the upper left."
    " Plain pure-white background. One single object, centred, filling about 70 percent of the frame."
    " No ground, no pot, no shadow on the floor, no text, no letters, no logo, no watermark. Nothing cropped."
)
GYMNO2_COLOUR = " Colour: a pale neutral sage-grey felt with very little colour, so the game can tint it in code."
GYMNO2_SHAPE = (
    " Shape reference: a globular cactus, a ball with clearly separated, sharp-edged vertical ribs."
    " Each rib carries small areoles, each with a short, stiff, straight spine radiating outward. The spines are short and neat, never long, never curly or fluffy."
)
GYMNO2_BODY = f"{F}/gymno2_body_mature.png"
GYMNO2 = [
    ("body_mature", [],
     "A mature gymnocalycium cactus seen from the side: a round ball about as tall as it is wide, with ten sharp ribs, a woolly crown of pale felt at the top and a row of short spines on every areole." + GYMNO2_SHAPE + GYMNO2_COLOUR + GYMNO2_RULES),
    ("body_young", [GYMNO2_BODY],
     "The same cactus as the first image, but younger: about two-thirds of its width, seven ribs, the same short spines, and a smaller woolly crown. Same style, same colour and same camera angle as the first image." + GYMNO2_SHAPE + GYMNO2_COLOUR + GYMNO2_RULES),
    ("body_seedling", [GYMNO2_BODY],
     "A seedling of the same cactus: a small smooth ball about one third of the width of the first image, four faint ribs, a few tiny spine dots, no crown, sitting in the lower middle of the frame. Same style, same colour and same camera angle as the first image." + GYMNO2_COLOUR + GYMNO2_RULES),
    ("flower", [],
     "A single flower bloom alone, with no cactus under it: a bowl-shaped flower with many narrow, pointed petals in a pale neutral cream, a golden-cream centre with a ring of short stamens, and a small pale green bud beside it, all in felt with fine stitching. Centred, on pure white." + GYMNO2_COLOUR + GYMNO2_RULES),
]
for name, refs, prompt in GYMNO2:
    jobs.append({"stage": "gymno_test2", "out": f"{F}/gymno2_{name}.png", "size": "1024x1024", "refs": refs, "prompt": prompt})

# Succulent Garden art test (owner's choice, 16 Nov late): three genera, rosette and cluster forms, one spike.
# Same felt craft and neutral colour as round 2 of the gymno test, with no spines and no fluff. Patterns are drawn in code later.
SUC_RULES = (
    " Felt craft with fine visible stitching along the leaf edges and veins, lit softly from the upper left."
    " Plain pure-white background. One single object, centred, filling about 70 percent of the frame."
    " No pot, no ground, no shadow on the floor, no text, no letters, no logo, no watermark. Nothing cropped."
    " Colour: a pale neutral sage-grey felt with very little colour, so the game can tint it in code."
)
SUC_ECHEVERIA = f"{F}/succ_echeveria_mature.png"
SUC = [
    ("echeveria_mature", [],
     "A mature Echeveria rosette seen from slightly above: about twelve plump, pointed, spoon-shaped leaves in tight overlapping rings, each ring sitting neatly inside the next, with smooth fleshy leaves and a soft powdery bloom. Looks like a real Echeveria. Smooth leaves only: no spines, no hair." + SUC_RULES),
    ("echeveria_young", [SUC_ECHEVERIA],
     "The same Echeveria as the first image, but younger: a smaller, tighter rosette of about seven leaves, with one small offset pup beside it at the base. Same style, colour and camera angle as the first image." + SUC_RULES),
    ("haworthia_mature", [],
     "A mature Haworthia rosette seen from above: a tight spiral of short, thick, triangular leaves with a slightly translucent, window-like tip, and evenly spaced fine pale stitched lines running along each leaf. Compact and low, looks like a real zebra haworthia." + SUC_RULES),
    ("kalanchoe_mature", [],
     "A mature Kalanchoe plant seen from the side: a compact cluster of thick, fleshy, scalloped oval leaves on short stems, each leaf rounded and slightly cupped, forming a loose rosette-like clump. Looks like a real Kalanchoe. Smooth leaves only." + SUC_RULES),
    ("flower_spike", [],
     "A single flower spike alone, with no plant under it: a tall, thin stem with a cluster of small bell-shaped blooms along the top, each bloom with four pale petals in neutral cream felt, and a few closed buds at the tip. Small and delicate, not large or showy. Centred, on pure white." + SUC_RULES),
]
for name, refs, prompt in SUC:
    jobs.append({"stage": "succulent_test", "out": f"{F}/succ_{name}.png", "size": "1024x1024", "refs": refs, "prompt": prompt})

# Succulent Garden, round 2: Crassula ovata (the fifth species). Sempervivum dropped by the owner. Same neutral felt craft.
SUC2 = [
    ("crassula_mature", "A young jade plant (Crassula ovata) seen from the side: a short, branching woody stem with pairs of thick, fleshy, oval, smooth leaves arranged in neat opposite pairs along each branch. Compact, shrub-like, not a tree. Smooth leaves only."),
]
for name, prompt in SUC2:
    jobs.append({"stage": "succulent_test2", "out": f"{F}/succ2_{name}.png", "size": "1024x1024", "refs": [], "prompt": prompt + SUC_RULES})

Path(__file__).with_name("art_jobs.json").write_text(json.dumps(jobs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
print(len(jobs), "jobs:", {s: sum(j["stage"] == s for j in jobs) for s in ("masters", "poses", "redraws", "items", "costumes", "arcade")})
