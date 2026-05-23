export type Rgba = [number, number, number, number];

// Parses CSS hex colors (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) into straight (non-premultiplied) RGBA in 0..1.
// The Dithering shader composites colors itself, so callers must pass straight alpha.
export function parseCssColor(input: string): Rgba {
  let s = input.trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);

  if (s.length === 3 || s.length === 4) {
    s = s
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }

  if (s.length !== 6 && s.length !== 8) {
    throw new Error(`parseCssColor: unsupported color "${input}"`);
  }

  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return [r, g, b, a];
}
