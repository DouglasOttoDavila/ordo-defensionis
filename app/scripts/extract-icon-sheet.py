from __future__ import annotations

import argparse
from pathlib import Path
from collections import deque

from PIL import Image


ICON_TARGETS = [
    ("branches", "air"),
    ("branches", "land"),
    ("branches", "naval"),
    ("branches", "joint"),
    ("categories", "air-defence-systems"),
    ("categories", "aircraft"),
    ("categories", "armoured-vehicles"),
    ("categories", "artillery"),
    ("categories", "engines"),
    ("categories", "missiles"),
    ("categories", "naval-weapons"),
    ("categories", "other"),
    ("categories", "sensors"),
    ("categories", "ships"),
]


def kmeans_1d(values: list[int], groups: int, iterations: int = 24) -> list[float]:
    minimum = min(values)
    maximum = max(values)
    centers = [minimum + (maximum - minimum) * index / max(groups - 1, 1) for index in range(groups)]

    for _ in range(iterations):
        buckets: list[list[int]] = [[] for _ in range(groups)]
        for value in values:
            index = min(range(groups), key=lambda item: abs(value - centers[item]))
            buckets[index].append(value)

        next_centers = [sum(bucket) / len(bucket) if bucket else centers[index] for index, bucket in enumerate(buckets)]
        if all(abs(current - updated) < 0.5 for current, updated in zip(centers, next_centers)):
            return next_centers
        centers = next_centers

    return centers


def detect_icon_boxes(image: Image.Image, threshold: int = 200) -> list[tuple[int, int, int, int]]:
    grayscale = image.convert("L")
    bright_points = [
        (x, y)
        for y in range(grayscale.height)
        for x in range(grayscale.width)
        if grayscale.getpixel((x, y)) >= threshold
    ]

    if not bright_points:
        raise ValueError("Could not detect bright icon strokes in source sheet.")

    x_centers = kmeans_1d([x for x, _ in bright_points], groups=7)
    y_centers = kmeans_1d([y for _, y in bright_points], groups=2)

    boxes: dict[tuple[int, int], list[int]] = {
        (row, column): [10**9, 10**9, -1, -1]
        for row in range(2)
        for column in range(7)
    }

    for x, y in bright_points:
        column = min(range(7), key=lambda index: abs(x - x_centers[index]))
        row = min(range(2), key=lambda index: abs(y - y_centers[index]))
        box = boxes[(row, column)]
        box[0] = min(box[0], x)
        box[1] = min(box[1], y)
        box[2] = max(box[2], x)
        box[3] = max(box[3], y)

    ordered_boxes: list[tuple[int, int, int, int]] = []
    for row in range(2):
        for column in range(7):
            left, top, right, bottom = boxes[(row, column)]
            if right < left or bottom < top:
                raise ValueError(f"Missing icon detection for grid cell {(row, column)}.")
            ordered_boxes.append((left, top, right + 1, bottom + 1))

    return ordered_boxes


def whiten_icon(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    pixels = []
    for r, g, b, a in rgba.getdata():
        luminance = int(0.2126 * r + 0.7152 * g + 0.0722 * b)
        alpha = 0 if luminance < 122 else max(0, min(255, int((luminance - 122) * 4.2)))
        pixels.append((248, 250, 252, alpha if a else 0))

    whitened = Image.new("RGBA", rgba.size)
    whitened.putdata(pixels)
    return whitened


def trim_icon(image: Image.Image, threshold: int = 72, padding: int = 16) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value >= threshold else 0).getbbox()
    if bbox is None:
        return image

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def remove_small_components(image: Image.Image, threshold: int = 72, minimum_pixels: int = 18) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    visited = [[False] * width for _ in range(height)]
    retained = set()

    for y in range(height):
        for x in range(width):
            if visited[y][x]:
                continue
            visited[y][x] = True
            if alpha.getpixel((x, y)) < threshold:
                continue

            queue = deque([(x, y)])
            component = [(x, y)]
            while queue:
                current_x, current_y = queue.popleft()
                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if 0 <= next_x < width and 0 <= next_y < height and not visited[next_y][next_x]:
                        visited[next_y][next_x] = True
                        if alpha.getpixel((next_x, next_y)) >= threshold:
                            component.append((next_x, next_y))
                            queue.append((next_x, next_y))

            if len(component) >= minimum_pixels:
                retained.update(component)

    cleaned = image.copy()
    pixels = cleaned.load()
    for y in range(height):
        for x in range(width):
            if (x, y) not in retained:
                red, green, blue, _ = pixels[x, y]
                pixels[x, y] = (red, green, blue, 0)

    return cleaned


def place_on_square(image: Image.Image, size: int = 256, max_content: int = 180) -> Image.Image:
    square = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    width, height = image.size
    scale = min(max_content / max(width, 1), max_content / max(height, 1), 1)
    resized = image.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.LANCZOS)
    offset_x = (size - resized.width) // 2
    offset_y = (size - resized.height) // 2
    square.alpha_composite(resized, (offset_x, offset_y))
    return square


def save_icon(source: Image.Image, output_path: Path) -> None:
    icon = whiten_icon(source)
    icon = remove_small_components(icon)
    icon = trim_icon(icon)
    icon = place_on_square(icon)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    icon.save(output_path)


def extract_sheet(sheet_path: Path, app_root: Path) -> list[Path]:
    image = Image.open(sheet_path)
    boxes = detect_icon_boxes(image)

    written_paths: list[Path] = []
    for (folder, name), (left, top, right, bottom) in zip(ICON_TARGETS, boxes, strict=True):
        padding = 20
        padded = image.crop(
            (
                max(0, left - padding),
                max(0, top - padding),
                min(image.width, right + padding),
                min(image.height, bottom + padding),
            )
        )
        output_path = app_root / "public" / "assets" / "icons" / folder / f"{name}.png"
        save_icon(padded, output_path)
        written_paths.append(output_path)

    return written_paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract branch/category icon PNGs from a 2x7 icon sheet.")
    parser.add_argument(
        "sheet",
        nargs="?",
        default="ChatGPT Image Mar 18, 2026, 01_41_43 AM.png",
        help="Path to the icon sheet image.",
    )
    parser.add_argument(
        "--app-root",
        default=Path(__file__).resolve().parents[1],
        type=Path,
        help="Path to the app root.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    app_root = args.app_root.resolve()
    sheet_path = Path(args.sheet)
    if not sheet_path.is_absolute():
        sheet_path = (app_root / sheet_path).resolve()

    written_paths = extract_sheet(sheet_path, app_root)
    print(f"Extracted {len(written_paths)} icons from {sheet_path}.")
    for path in written_paths:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
