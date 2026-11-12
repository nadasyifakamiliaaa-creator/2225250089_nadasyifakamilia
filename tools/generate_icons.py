"""Membuat ikon PWA (PNG) tanpa pustaka tambahan.

Gambar: empat batang data dengan tinggi berbeda dan satu garis datar = rata-ratanya.
Jalankan: python tools/generate_icons.py
"""

import struct
import zlib
from pathlib import Path

ICON_DIR = Path(__file__).resolve().parents[1] / "frontend" / "icons"

BG = (0x2F, 0x6F, 0xB2)  # --primary
BAR = (0xFF, 0xFF, 0xFF)
MEAN_LINE = (0xFF, 0xD1, 0x66)

# Tinggi batang (proporsi). Rata-ratanya = 0.5 → garis rata-rata tepat di tengah.
BAR_HEIGHTS = (0.35, 0.65, 0.45, 0.55)
SAMPLES = 4  # anti-aliasing: 4x4 sampel per piksel


def _in_rounded_rect(x: float, y: float, size: float, radius: float) -> bool:
    cx = min(max(x, radius), size - radius)
    cy = min(max(y, radius), size - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius**2


def _shapes(size: int, safe: float) -> list[tuple[tuple[float, float, float, float], tuple]]:
    """Kembalikan daftar persegi (x0, y0, x1, y1) dan warnanya, dalam koordinat piksel."""
    inner = size * safe
    chart_height = inner * 0.9
    # Tengahkan grafik secara vertikal berdasarkan batang tertinggi.
    chart_bottom = (size + chart_height * max(BAR_HEIGHTS)) / 2
    bar_width = inner * 0.13
    gap = inner * 0.06
    total = len(BAR_HEIGHTS) * bar_width + (len(BAR_HEIGHTS) - 1) * gap
    left = (size - total) / 2

    shapes = []
    for i, h in enumerate(BAR_HEIGHTS):
        x0 = left + i * (bar_width + gap)
        shapes.append(((x0, chart_bottom - chart_height * h, x0 + bar_width, chart_bottom), BAR))

    mean = sum(BAR_HEIGHTS) / len(BAR_HEIGHTS)
    y = chart_bottom - chart_height * mean
    thickness = inner * 0.045
    pad = inner * 0.05
    shapes.append(
        ((left - pad, y - thickness / 2, left + total + pad, y + thickness / 2), MEAN_LINE)
    )
    return shapes


def render(size: int, maskable: bool) -> bytes:
    # Ikon maskable: latar penuh, isi di dalam "safe zone" 80 %. Ikon biasa: sudut membulat.
    safe = 0.62 if maskable else 0.78
    radius = 0 if maskable else size * 0.22
    shapes = _shapes(size, safe)
    step = 1 / SAMPLES

    rows = bytearray()
    for py in range(size):
        rows.append(0)  # filter PNG: none
        for px in range(size):
            r = g = b = a = 0.0
            for sy in range(SAMPLES):
                for sx in range(SAMPLES):
                    x = px + (sx + 0.5) * step
                    y = py + (sy + 0.5) * step
                    if radius and not _in_rounded_rect(x, y, size, radius):
                        continue
                    color = BG
                    for (x0, y0, x1, y1), c in shapes:
                        if x0 <= x <= x1 and y0 <= y <= y1:
                            color = c
                    r += color[0]
                    g += color[1]
                    b += color[2]
                    a += 255
            n = SAMPLES * SAMPLES
            if a:
                cover = a / 255
                rows += bytes((round(r / cover), round(g / cover), round(b / cover), round(a / n)))
            else:
                rows += b"\x00\x00\x00\x00"
    return _png(size, size, bytes(rows))


def _png(width: int, height: int, raw: bytes) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    targets = {
        "icon-192.png": (192, False),
        "icon-512.png": (512, False),
        "maskable-512.png": (512, True),
    }
    for name, (size, maskable) in targets.items():
        (ICON_DIR / name).write_bytes(render(size, maskable))
        print(f"dibuat: frontend/icons/{name}")


if __name__ == "__main__":
    main()
