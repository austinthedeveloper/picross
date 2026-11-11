#!/usr/bin/env python3
"""Cleans the approved art candidates in docs/art/incoming into apps/picross/public/art.

For each pick: thresholds the alpha, snaps every pixel to the colors its prompt
allows (which also removes texture, smudges and specks), trims it, and downscales
it to a square PNG. It does not snap to a pixel lattice: the generated art isn't on
a regular grid, and forcing it onto one damages the faces (see
docs/art/incoming/round4-review.md).

Swap a candidate by changing its entry below and running this again:

    pip install pillow numpy scipy
    python3 scripts/art-clean.py
"""

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/art/incoming"
OUTPUT = ROOT / "apps/picross/public/art"

# The palette, from apps/picross/src/styles/tokens.css (light theme).
GRAPHITE = "#23262f"
PAPER = "#f6f3ec"
CORAL = "#d9534f"
YELLOW = "#e0a800"
GREEN = "#2e8b57"
GRAY = "#7a7e8a"
ORANGE = "#f07c00"
INK = "#2c2350"
BROWN = "#a9825a"
PURPLE = "#7b5cff"
METAL = "#3d4450"

# Largest display size is about a third of these, so they stay sharp on 3x screens.
SIZE = {"cast": 420, "enemies": 128, "gadgets": 128, "icons": 96, "glyphs": 64}

# Specks smaller than this (in source pixels) are noise: cells are at least 100.
MIN_SPECK = 60

# Below this chroma a pixel is a neutral or a blend of neutrals, never an accent.
# Without it, the grey blend between graphite and paper lands on the accent color.
NEUTRAL_CHROMA = 30

CAST = {
    "rook": ("cast-rook-v1", [CORAL]),
    "dee": ("cast-dee-v1", [YELLOW]),
    "bo": ("cast-bo-v2", [GREEN]),
    "curator": ("cast-curator-v3", [CORAL]),
    "forger": ("cast-forger-v1", [CORAL]),
    "gremlin": ("cast-gremlin-v3", [YELLOW]),
    "tess": ("cast-tess-v3", [CORAL]),
    "hollis": ("cast-hollis-v2", [GREEN]),
    "bigsby": ("cast-bigsby-v2", [YELLOW]),
    "lund": ("cast-lund-v1", [ORANGE]),
    "bramble": ("cast-bramble-v2", [CORAL, YELLOW]),
    "ringmaster": ("cast-ringmaster-v2", [CORAL, YELLOW]),
    "yeti": ("cast-yeti-v2", [GRAY, YELLOW]),
    "pim": ("cast-pim-v1", [METAL]),
    "dennis": ("cast-dennis-v1", [PURPLE]),
    "priya": ("cast-priya-v2", [GREEN]),
    # Gray is a third accent on the Wyrm only: without its scale edges it's a black blob.
    "wyrm": ("cast-wyrm-v1", [CORAL, YELLOW, GRAY]),
    "ostrander": ("cast-ostrander-v1", [CORAL, YELLOW]),
}

# (frame fill, {name: (source, accents)}). Forms of one enemy share a scale, so a phase
# change reads as the same creature. Bosses are a touch bigger, per the prompt pack.
ENEMY_SETS = [
    (0.92, {"goblin": ("enemy-goblin-v1", [GREEN])}),
    (0.92, {"fog-bat": ("enemy-fog-bat-v1", [GRAY])}),
    (
        1.0,
        {
            "gremlin": ("enemy-gremlin-v1", [YELLOW]),
            "overcharged-gremlin": ("enemy-overcharged-gremlin-v1", [ORANGE]),
            "blackout-gremlin": ("enemy-blackout-gremlin-v1", [INK]),
        },
    ),
    (
        0.92,
        {
            "mimic": ("enemy-mimic-v1", [BROWN]),
            "hungry-mimic": ("enemy-hungry-mimic-v1", [BROWN, PURPLE]),
        },
    ),
    (0.92, {"clockwork-owl": ("enemy-clockwork-owl-v1", [METAL, YELLOW])}),
    (
        0.92,
        {
            "forger": ("enemy-forger-v2", [CORAL]),
            "master-forger": ("enemy-master-forger-v2", [CORAL, PURPLE]),
        },
    ),
    (0.92, {"armored-beetle": ("enemy-armored-beetle-v2", [METAL, CORAL])}),
    (
        1.0,
        {
            "curator": ("enemy-curator-v2", [CORAL]),
            "clockwork-curator": ("enemy-clockwork-curator-v2", [YELLOW]),
            "overwound-curator": ("enemy-overwound-curator-v2", [ORANGE]),
        },
    ),
    (0.92, {"electric-eel": ("enemy-electric-eel-v1", [YELLOW])}),
    (0.92, {"anglerfish": ("enemy-anglerfish-v1", [INK, YELLOW])}),
    (0.92, {"cuttlefish": ("enemy-cuttlefish-v1", [PURPLE, INK])}),
    (
        1.0,
        {
            "old-tess": ("enemy-old-tess-v2", [CORAL]),
            "furious-tess": ("enemy-furious-tess-v2", [CORAL, INK]),
        },
    ),
    (0.92, {"unknown": ("enemy-unknown-v1", [GRAY])}),
    (
        1.0,
        {
            "museum-rex": ("enemy-museum-rex-v1", [BROWN]),
            "wound-up-rex": ("enemy-wound-up-rex-v1", [BROWN, YELLOW]),
        },
    ),
    (0.92, {"snapjaw": ("enemy-snapjaw-v1", [GREEN, CORAL])}),
    (0.92, {"spore-puff": ("enemy-spore-puff-v2", [CORAL, GRAY])}),
    (0.92, {"ironbark": ("enemy-ironbark-v2", [BROWN, CORAL])}),
    (
        1.0,
        {
            "mother-bramble": ("enemy-mother-bramble-v2", [CORAL, YELLOW]),
            "mother-bramble-in-bloom": ("enemy-mother-bramble-in-bloom-v2", [CORAL, YELLOW]),
        },
    ),
    (0.92, {"funhouse-mirror": ("enemy-funhouse-mirror-v2", [PURPLE, YELLOW])}),
    (0.92, {"madame-vesper": ("enemy-madame-vesper-v2", [INK, PURPLE])}),
    (0.92, {"great-bruno": ("enemy-great-bruno-v2", [METAL, CORAL])}),
    (
        1.0,
        {
            "ringmaster": ("enemy-ringmaster-v2", [CORAL, YELLOW]),
            "showstopper": ("enemy-showstopper-v2", [CORAL, YELLOW]),
        },
    ),
    (0.92, {"whiteout": ("enemy-whiteout-v1", [GRAY])}),
    (0.92, {"falling-star": ("enemy-falling-star-v1", [YELLOW, ORANGE])}),
    (0.92, {"ice-mammoth": ("enemy-ice-mammoth-v2", [BROWN, CORAL])}),
    (
        1.0,
        {
            "yeti": ("enemy-yeti-v2", [GRAY, YELLOW]),
            "avalanche-yeti": ("enemy-avalanche-yeti-v2", [GRAY, YELLOW]),
        },
    ),
    (0.92, {"tin-soldier": ("enemy-tin-soldier-v2", [CORAL, YELLOW])}),
    (0.92, {"signal-box": ("enemy-signal-box-v2", [CORAL, GRAY])}),
    (0.92, {"ticket-inspector": ("enemy-ticket-inspector-v1", [GRAY, PURPLE])}),
    (0.92, {"coal-heap": ("enemy-coal-heap-v1", [CORAL, GRAY])}),
    (
        1.0,
        {
            "the-1159": ("enemy-the-1159-v1", [GRAY, YELLOW]),
            "express-not-stopping": ("enemy-express-not-stopping-v1", [GRAY, YELLOW]),
        },
    ),
    (0.92, {"rusted-sentry": ("enemy-rusted-sentry-v2", [BROWN, CORAL])}),
    (0.92, {"cellar-ooze": ("enemy-cellar-ooze-v1", [GREEN])}),
    (0.92, {"rat-king": ("enemy-rat-king-v1", [GRAY, YELLOW])}),
    # Gray is a third accent here, as on the Wyrm's portrait (see round6-review.md).
    (
        1.0,
        {
            "old-wyrm": ("enemy-old-wyrm-v4", [CORAL, YELLOW, GRAY]),
            "wrathful-wyrm": ("enemy-wrathful-wyrm-v1", [CORAL, YELLOW, GRAY]),
        },
    ),
    (0.92, {"spark-hound": ("enemy-spark-hound-v2", [YELLOW])}),
    (0.92, {"failed-clone": ("enemy-failed-clone-v1", [PURPLE, GRAY])}),
    (0.92, {"reviewer-two": ("enemy-reviewer-two-v2", [CORAL])}),
    (
        1.0,
        {
            "ostrander": ("enemy-ostrander-v1", [CORAL, YELLOW]),
            "reviewer-one": ("enemy-reviewer-one-v1", [CORAL, YELLOW]),
        },
    ),
]

# (first source row, color, replacement). Coral means "hit here" on armored enemies, and
# Bruno's generated trunks were striped in it. His cracks end above this row.
RECOLOR = {"enemy-great-bruno-v2": (960, CORAL, GRAPHITE)}

GADGETS = {
    "bomb": ("gadget-bomb-v1", [ORANGE]),
    "patch-kit": ("gadget-patch-kit-v2", [CORAL]),
    "sponge": ("gadget-sponge-v4", [YELLOW, INK]),
}

ICONS = {
    "fight": ("icon-fight-v2", [CORAL]),
    "dig": ("icon-dig-v1", [BROWN]),
    "rest": ("icon-rest-v2", [CORAL]),
    "boss": ("icon-boss-v2", [CORAL]),
}

GLYPHS = {
    "fog": "glyph-fog-v1",
    "scramble": "glyph-scramble-v1",
    "weak-point": "glyph-weak-point-v1",
    "forged": "glyph-forged-v1",
    "charge": "glyph-charge-v1",
    "ink": "glyph-ink-v1",
    "swap": "glyph-swap-v2",
    "call-out": "glyph-call-out-v1",
    "shield": "glyph-shield-v1",
}


def rgb(color):
    return [int(color[i : i + 2], 16) for i in (1, 3, 5)]


def nearest(pixels, colors):
    distance = ((pixels[..., None, :] - colors) ** 2).sum(-1)
    return distance.argmin(-1)


def snap(source, accents):
    """Returns a palette index per pixel (-1 is transparent) and the palette."""
    data = np.array(Image.open(SOURCE / f"{source}.png").convert("RGBA")).astype(float)
    pixels, opaque = data[..., :3], data[..., 3] > 128
    # A set that drops graphite for its accent (the blackout gremlin) still gets it here,
    # but nothing in that art is close enough to land on it after the speck pass.
    palette = np.array([rgb(c) for c in [GRAPHITE, PAPER, *accents]], float)
    index = nearest(pixels, palette)
    chroma = palette.max(1) - palette.min(1)
    neutrals = np.where(chroma < NEUTRAL_CHROMA)[0]
    low = (pixels.max(-1) - pixels.min(-1)) < NEUTRAL_CHROMA
    index[low] = neutrals[nearest(pixels[low], palette[neutrals])]
    index[~opaque] = -1
    if source in RECOLOR:
        row, old, new = RECOLOR[source]
        below = index[row:]
        below[below == [GRAPHITE, PAPER, *accents].index(old)] = [GRAPHITE, PAPER, *accents].index(new)
    return remove_specks(index), palette


def remove_specks(index):
    """Repaints tiny islands of a color with whatever surrounds them."""
    for value in np.unique(index):
        labels, count = ndimage.label(index == value)
        if not count:
            continue
        sizes = ndimage.sum_labels(index == value, labels, np.arange(1, count + 1))
        for label in np.where(sizes < MIN_SPECK)[0] + 1:
            speck = labels == label
            around = ndimage.binary_dilation(speck, iterations=2) & ~speck
            values, counts = np.unique(index[around], return_counts=True)
            if len(values):
                index[speck] = values[counts.argmax()]
    return index


def bbox(mask):
    ys, xs = np.where(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def render(index, palette):
    out = np.zeros((*index.shape, 4), np.uint8)
    solid = index >= 0
    out[solid, :3] = palette[index[solid]].astype(np.uint8)
    out[solid, 3] = 255
    return Image.fromarray(out)


def fit(image, box, longest, size, fill):
    """Crops to `box`, scales so `longest` source pixels span `fill` of a square, centers it."""
    crop = image.crop(box)
    scale = size * fill / longest
    width, height = max(1, round(crop.width * scale)), max(1, round(crop.height * scale))
    # Pillow premultiplies RGBA when resizing, so edges don't pick up transparent black.
    small = crop.resize((width, height), Image.BOX)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(small, ((size - width) // 2, (size - height) // 2))
    return canvas


def save(image, group, name):
    path = OUTPUT / group / f"{name}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def export_set(group, size, fill, members):
    """Cleans a set of images that share one scale."""
    cleaned = {name: snap(*spec) for name, spec in members.items()}
    boxes = {name: bbox(index >= 0) for name, (index, _) in cleaned.items()}
    longest = max(max(b[2] - b[0], b[3] - b[1]) for b in boxes.values())
    for name, (index, palette) in cleaned.items():
        save(fit(render(index, palette), boxes[name], longest, size, fill), group, name)


def export_glyph(name, source):
    """Glyphs are CSS masks: only the alpha matters, so they stay black with no palette."""
    alpha = np.array(Image.open(SOURCE / f"{source}.png").convert("RGBA"))[..., 3] > 128
    image = Image.fromarray(
        np.dstack([np.zeros((*alpha.shape, 3), np.uint8), alpha.astype(np.uint8) * 255])
    )
    box = bbox(alpha)
    save(fit(image, box, max(box[2] - box[0], box[3] - box[1]), SIZE["glyphs"], 0.9),
         "icons", f"glyph-{name}")


def main():
    for name, spec in CAST.items():
        export_set("cast", SIZE["cast"], 1.0, {name: spec})
    for fill, members in ENEMY_SETS:
        export_set("enemies", SIZE["enemies"], fill, members)
    for name, spec in GADGETS.items():
        export_set("gadgets", SIZE["gadgets"], 1.0, {name: spec})
    for name, spec in ICONS.items():
        export_set("icons", SIZE["icons"], 1.0, {name: spec})
    for name, source in GLYPHS.items():
        export_glyph(name, source)


if __name__ == "__main__":
    main()
