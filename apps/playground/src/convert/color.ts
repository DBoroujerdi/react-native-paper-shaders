// The RN port's `parseCssColor` only understands hex (#RGB/#RGBA/#RRGGBB/#RRGGBBAA)
// and throws on anything else, so the converter normalises every color prop to hex.

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const hex2 = (n: number) => clamp255(n).toString(16).padStart(2, "0");

function toHex(r: number, g: number, b: number, a: number): string {
  const rgb = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return a >= 1 ? rgb : `${rgb}${hex2(a * 255)}`;
}

function parseNumberList(body: string): number[] | null {
  const parts = body
    .split(/[,/\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const nums: number[] = [];
  for (const part of parts) {
    const pct = part.endsWith("%");
    const n = Number.parseFloat(pct ? part.slice(0, -1) : part);
    if (Number.isNaN(n)) return null;
    nums.push(pct ? n / 100 : n);
  }
  return nums;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Last resort for named colors (`rebeccapurple`, `tomato`, ...) in the browser. */
function viaCanvas(input: string): string | null {
  if (typeof document === "undefined") return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000000";
  const fallback = ctx.fillStyle;
  ctx.fillStyle = input;
  const resolved = ctx.fillStyle;
  if (resolved === fallback && input.trim().toLowerCase() !== "black") {
    return null;
  }
  return typeof resolved === "string" ? normalizeCssColor(resolved) : null;
}

/**
 * Normalises any CSS color string to hex. Returns null when the value is not a
 * color the RN port can be given (gradients, `currentColor`, custom properties).
 */
export function normalizeCssColor(input: string): string | null {
  const original = input.trim();
  const value = original.toLowerCase();
  if (!value) return null;

  if (value === "transparent") return "#00000000";

  if (value.startsWith("#")) {
    // Already hex: keep the author's casing so the converted snippet does not
    // show a pointless diff on every color.
    const body = original.slice(1);
    if (/^[0-9a-fA-F]{3,4}$/.test(body)) {
      return `#${body
        .split("")
        .map((ch) => ch + ch)
        .join("")}`;
    }
    if (/^[0-9a-fA-F]{6}$/.test(body) || /^[0-9a-fA-F]{8}$/.test(body)) {
      return `#${body}`;
    }
    return null;
  }

  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(value);
  if (fn) {
    const nums = parseNumberList(fn[2]!);
    if (!nums) return null;
    const alpha = nums.length === 4 ? nums[3]! : 1;
    if (fn[1]!.startsWith("rgb")) {
      // rgb() percentages are 0..1 after parseNumberList; scale them back up.
      const scale = /%/.test(fn[2]!) ? 255 : 1;
      return toHex(nums[0]! * scale, nums[1]! * scale, nums[2]! * scale, alpha);
    }
    const [r, g, b] = hslToRgb(nums[0]!, nums[1]!, nums[2]!);
    return toHex(r, g, b, alpha);
  }

  return viaCanvas(value);
}

/** True for values that are colors in CSS but meaningless to the RN port. */
export function isColorLike(value: unknown): value is string {
  return typeof value === "string";
}
