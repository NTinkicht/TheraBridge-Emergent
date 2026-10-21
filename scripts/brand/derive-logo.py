#!/usr/bin/env python3
"""Derive web logo assets from the untouched original JPG by cropping + white-to-alpha (no redrawing).

Writes PNGs to apps/web/public/brand and full-resolution crops + a fidelity report to assets/brand/derived.
Requires Pillow and numpy.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
ORIGINAL = REPO / "assets/brand/original/TheraBridge-Logo-original.jpg"
DERIVED = REPO / "assets/brand/derived"
PUBLIC = REPO / "apps/web/public/brand"
PAD = 8
NOISE_FLOOR = 12  # JPEG background noise (pixels within 12/255 of white become fully transparent)


def ink_mask(rgb):
    return (255 - rgb.min(axis=2)) > 40


def bands(mask, axis_any, gap):
    idx = np.where(mask.any(axis=axis_any))[0]
    out, start, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i - prev > gap:
            out.append((start, prev))
            start = i
        prev = i
    out.append((start, prev))
    return out


def bbox(mask, y0, y1, bottom_limit=None):
    cols = np.where(mask[y0 : y1 + 1].any(axis=0))[0]
    bottom = y1 + PAD + 1 if bottom_limit is None else min(y1 + PAD + 1, bottom_limit)
    return (max(cols[0] - PAD, 0), max(y0 - PAD, 0), cols[-1] + PAD + 1, bottom)


def white_to_alpha(rgb):
    # Exact inverse of compositing over white: c = a*fg + (1-a)*255.
    rgbf = rgb.astype(np.float64)
    alpha = (255.0 - rgbf.min(axis=2)) / 255.0
    alpha[alpha * 255.0 < NOISE_FLOOR] = 0.0
    safe = np.where(alpha > 0, alpha, 1.0)[..., None]
    fg = 255.0 - (255.0 - rgbf) / safe
    fg = np.clip(np.where(alpha[..., None] > 0, fg, 0), 0, 255)
    return np.dstack([fg, alpha * 255.0]).round().astype(np.uint8)


def fidelity(rgb_crop, rgba):
    a = rgba[..., 3:4].astype(np.float64) / 255.0
    recomposed = rgba[..., :3].astype(np.float64) * a + 255.0 * (1 - a)
    diff = np.abs(recomposed - rgb_crop.astype(np.float64))
    return {"max_abs_diff": float(diff.max()), "mean_abs_diff": round(float(diff.mean()), 4)}


def resize(img, width):
    h = round(img.height * width / img.width)
    return img.resize((width, h), Image.LANCZOS)


def main():
    rgb = np.asarray(Image.open(ORIGINAL).convert("RGB"))
    mask = ink_mask(rgb)
    symbol_band, text_band = bands(mask, 1, 8)
    # The 'g' descender sits 1px above the tagline, so split on any fully empty row and never pad into the tagline.
    word_band, tagline_band = bands(mask[text_band[0] : text_band[1] + 1], 1, 1)
    word_band = (word_band[0] + text_band[0], word_band[1] + text_band[0])
    tagline_top = tagline_band[0] + text_band[0]

    boxes = {
        "lockup": bbox(mask, symbol_band[0], text_band[1]),
        "symbol": bbox(mask, *symbol_band),
        "wordmark": bbox(mask, *word_band, bottom_limit=tagline_top),
    }
    widths = {"lockup": 240, "symbol": 64, "wordmark": 160}
    DERIVED.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    report = {"source": str(ORIGINAL.relative_to(REPO)), "noise_floor": NOISE_FLOOR, "assets": {}}

    for name, (x0, y0, x1, y1) in boxes.items():
        crop = rgb[y0:y1, x0:x1]
        rgba = white_to_alpha(crop)
        full = Image.fromarray(rgba, "RGBA")
        full.save(DERIVED / f"therabridge-{name}-full.png", optimize=True)
        for scale in (1, 2):
            resize(full, widths[name] * scale).save(PUBLIC / f"therabridge-{name}@{scale}x.png", optimize=True)
        report["assets"][name] = {"crop_box_xyxy": [int(v) for v in (x0, y0, x1, y1)], "size": list(full.size), **fidelity(crop, rgba)}

    symbol = Image.open(DERIVED / "therabridge-symbol-full.png")
    square = Image.new("RGBA", (symbol.width, symbol.width), (0, 0, 0, 0))
    square.paste(symbol, (0, (symbol.width - symbol.height) // 2))
    resize(square, 32).save(PUBLIC / "favicon-32.png", optimize=True)
    square.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    touch = Image.new("RGBA", square.size, (255, 255, 255, 255))
    touch.alpha_composite(square)
    resize(touch.convert("RGB"), 180).save(PUBLIC / "apple-touch-icon.png", optimize=True)

    (DERIVED / "FIDELITY_REPORT.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
