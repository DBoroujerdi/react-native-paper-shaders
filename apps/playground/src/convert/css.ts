import { normalizeCssColor } from "./color";
import type { Warning } from "./types";

/**
 * Converts a Paper web `style` object (CSS-in-JS) to a React Native `ViewStyle`.
 *
 * The shader components read `width`/`height` off this style and throw unless
 * both are numbers, so lengths are the priority; everything else is mapped where
 * RN has an equivalent, rewritten where RN spells it differently (outline ->
 * border), and dropped with a warning where RN has nothing (transitions, etc).
 */

const LENGTH_KEYS = new Set([
  "width", "height",
  "minWidth", "minHeight", "maxWidth", "maxHeight",
  "top", "right", "bottom", "left", "start", "end",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginVertical", "marginHorizontal",
  "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingVertical", "paddingHorizontal",
  "borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderRadius", "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomLeftRadius", "borderBottomRightRadius",
  "gap", "rowGap", "columnGap", "flexBasis",
]);

const COLOR_KEYS = new Set([
  "backgroundColor", "color", "borderColor", "borderTopColor", "borderRightColor",
  "borderBottomColor", "borderLeftColor", "shadowColor", "tintColor",
]);

const PASS_THROUGH_KEYS = new Set([
  "opacity", "zIndex", "flex", "flexGrow", "flexShrink", "flexDirection", "flexWrap",
  "alignItems", "alignSelf", "alignContent", "justifyContent", "aspectRatio",
  "overflow", "borderStyle", "pointerEvents", "transform", "transformOrigin",
  "boxShadow", "filter", "mixBlendMode", "experimental_backgroundImage",
  "shadowOpacity", "shadowRadius", "shadowOffset", "elevation", "direction",
]);

// Web-only properties: no RN equivalent, dropping them is the honest answer.
const DROP_KEYS = new Set([
  "cursor", "transition", "transitionProperty", "transitionDuration",
  "transitionTimingFunction", "transitionDelay", "animation", "animationName",
  "animationDuration", "animationTimingFunction", "animationIterationCount",
  "animationDelay", "animationFillMode", "willChange", "userSelect",
  "WebkitUserSelect", "backdropFilter", "WebkitBackdropFilter", "clipPath",
  "mask", "maskImage", "isolation", "contain", "outlineOffset", "boxSizing",
  "float", "content", "appearance", "resize", "scrollBehavior", "touchAction",
  "WebkitFontSmoothing", "MozOsxFontSmoothing", "textRendering", "visibility",
]);

const BORDER_STYLES = new Set(["solid", "dotted", "dashed", "none", "hidden"]);

type Out = Record<string, unknown>;

/** Parses a single CSS length. Percentages stay strings (RN accepts them). */
function length(
  raw: unknown,
  key: string,
  warn: (w: Warning) => void,
): number | string | undefined {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") {
    warn({ level: "warn", message: `\`${key}\`: cannot convert ${typeof raw} value` });
    return undefined;
  }
  const value = raw.trim();
  if (/^-?[\d.]+px$/.test(value)) return Number.parseFloat(value);
  if (/^-?[\d.]+$/.test(value)) return Number.parseFloat(value);
  if (/^-?[\d.]+%$/.test(value)) return value;
  if (/^-?[\d.]+r?em$/.test(value)) {
    const px = Number.parseFloat(value) * 16;
    warn({
      level: "info",
      message: `\`${key}: '${value}'\` -> ${px} (RN has no em/rem; assumed 1rem = 16px)`,
    });
    return px;
  }
  if (value === "auto") return "auto";
  warn({
    level: "warn",
    message: `\`${key}: '${value}'\` uses a unit RN cannot resolve — dropped`,
  });
  return undefined;
}

function color(
  raw: unknown,
  key: string,
  warn: (w: Warning) => void,
): string | undefined {
  if (typeof raw !== "string") {
    warn({ level: "warn", message: `\`${key}\`: expected a color string` });
    return undefined;
  }
  const hex = normalizeCssColor(raw);
  if (!hex) {
    warn({
      level: "warn",
      message: `\`${key}: '${raw}'\` is not a plain color (gradients and keywords are not supported) — dropped`,
    });
    return undefined;
  }
  if (hex !== raw.trim()) {
    warn({ level: "info", message: `\`${key}\`: '${raw}' -> '${hex}'` });
  }
  return hex;
}

/** Splits a shorthand on spaces, keeping `rgb(...)`/`rgba(...)` groups intact. */
function tokens(value: string): string[] {
  return value.match(/(?:[^\s(]+\([^)]*\))|[^\s]+/g) ?? [];
}

function edgeShorthand(
  prefix: "margin" | "padding",
  raw: unknown,
  warn: (w: Warning) => void,
  out: Out,
): void {
  if (typeof raw === "number") {
    out[prefix] = raw;
    return;
  }
  if (typeof raw !== "string") return;
  const parts = tokens(raw.trim());
  if (parts.length <= 1) {
    const single = length(parts[0] ?? raw, prefix, warn);
    if (single !== undefined) out[prefix] = single;
    return;
  }
  const values = parts.map((part) => length(part, prefix, warn));
  const [top, right, bottom, left] =
    values.length === 2
      ? [values[0], values[1], values[0], values[1]]
      : values.length === 3
        ? [values[0], values[1], values[2], values[1]]
        : [values[0], values[1], values[2], values[3]];
  const sides = { Top: top, Right: right, Bottom: bottom, Left: left };
  for (const [side, value] of Object.entries(sides)) {
    if (value !== undefined) out[`${prefix}${side}`] = value;
  }
  warn({
    level: "info",
    message: `\`${prefix}: '${raw}'\` expanded to per-side values (RN has no multi-value shorthand)`,
  });
}

function borderShorthand(
  raw: unknown,
  key: string,
  warn: (w: Warning) => void,
  out: Out,
  suffix = "",
): void {
  if (typeof raw !== "string") {
    warn({ level: "warn", message: `\`${key}\`: expected a shorthand string` });
    return;
  }
  if (raw.trim() === "none") return;
  let width: number | string | undefined;
  let style: string | undefined;
  let colorToken: string | undefined;
  for (const token of tokens(raw.trim())) {
    if (BORDER_STYLES.has(token)) {
      style = token;
    } else if (/^-?[\d.]+(px|r?em)?$/.test(token) || token === "thin" || token === "medium" || token === "thick") {
      width = token === "thin" ? 1 : token === "medium" ? 3 : token === "thick" ? 5 : length(token, key, warn);
    } else {
      colorToken = token;
    }
  }
  if (width !== undefined) out[`border${suffix}Width`] = width;
  if (colorToken !== undefined) {
    const hex = color(colorToken, key, warn);
    if (hex) out[`border${suffix}Color`] = hex;
  }
  if (style && style !== "solid" && style !== "none" && style !== "hidden") {
    out.borderStyle = style;
  }
}

export function convertStyle(input: Record<string, unknown>): {
  style: Out;
  warnings: Warning[];
} {
  const out: Out = {};
  const warnings: Warning[] = [];
  const warn = (w: Warning) => warnings.push(w);
  let convertedOutline = false;

  for (const [key, raw] of Object.entries(input)) {
    if (raw === undefined || raw === null) continue;

    if (LENGTH_KEYS.has(key)) {
      if (key === "margin" || key === "padding") {
        edgeShorthand(key, raw, warn, out);
        continue;
      }
      const value = length(raw, key, warn);
      if (value !== undefined) out[key] = value;
      continue;
    }

    if (COLOR_KEYS.has(key)) {
      const value = color(raw, key, warn);
      if (value !== undefined) out[key] = value;
      continue;
    }

    if (PASS_THROUGH_KEYS.has(key)) {
      out[key] = raw;
      continue;
    }

    if (DROP_KEYS.has(key)) {
      warn({
        level: "warn",
        message: `\`${key}\` has no React Native equivalent — dropped`,
      });
      continue;
    }

    switch (key) {
      case "outline":
        borderShorthand(raw, key, warn, out);
        convertedOutline = true;
        continue;
      case "outlineWidth": {
        const value = length(raw, key, warn);
        if (value !== undefined) out.borderWidth = value;
        convertedOutline = true;
        continue;
      }
      case "outlineColor": {
        const value = color(raw, key, warn);
        if (value !== undefined) out.borderColor = value;
        convertedOutline = true;
        continue;
      }
      case "outlineStyle":
        if (typeof raw === "string" && BORDER_STYLES.has(raw) && raw !== "solid") {
          out.borderStyle = raw;
        }
        convertedOutline = true;
        continue;
      case "border":
        borderShorthand(raw, key, warn, out);
        continue;
      case "borderTop":
        borderShorthand(raw, key, warn, out, "Top");
        continue;
      case "borderRight":
        borderShorthand(raw, key, warn, out, "Right");
        continue;
      case "borderBottom":
        borderShorthand(raw, key, warn, out, "Bottom");
        continue;
      case "borderLeft":
        borderShorthand(raw, key, warn, out, "Left");
        continue;
      case "background": {
        const value = typeof raw === "string" ? normalizeCssColor(raw) : null;
        if (value) {
          out.backgroundColor = value;
          warn({ level: "info", message: "`background` -> `backgroundColor`" });
        } else {
          warn({
            level: "warn",
            message: "`background` is not a plain color (gradient or image) — dropped",
          });
        }
        continue;
      }
      case "inset": {
        const value = length(raw, key, warn);
        if (value !== undefined) {
          out.top = value;
          out.right = value;
          out.bottom = value;
          out.left = value;
          warn({ level: "info", message: "`inset` expanded to top/right/bottom/left" });
        }
        continue;
      }
      case "display":
        if (raw === "flex" || raw === "none") {
          out.display = raw;
        } else {
          warn({
            level: "warn",
            message: `\`display: '${String(raw)}'\` — RN only has 'flex' and 'none'; dropped`,
          });
        }
        continue;
      case "position":
        if (raw === "fixed") {
          out.position = "absolute";
          warn({
            level: "warn",
            message: "`position: 'fixed'` -> 'absolute' (RN has no fixed positioning)",
          });
        } else if (raw === "static") {
          warn({ level: "info", message: "`position: 'static'` dropped (RN defaults to relative)" });
        } else {
          out.position = raw;
        }
        continue;
      case "overflowX":
      case "overflowY":
        out.overflow = raw;
        warn({ level: "info", message: `\`${key}\` -> \`overflow\`` });
        continue;
      default:
        out[key] = raw;
        warn({
          level: "info",
          message: `\`${key}\` passed through unchanged — check that RN supports it`,
        });
    }
  }

  if (convertedOutline) {
    warnings.push({
      level: "info",
      message:
        "CSS `outline` became `borderWidth`/`borderColor`. RN borders are drawn inside the box, so the shader canvas sits under the border rather than beside it.",
    });
  }

  for (const key of ["width", "height"] as const) {
    if (typeof out[key] !== "number") {
      warnings.push({
        level: "error",
        message:
          out[key] === undefined
            ? `\`style.${key}\` is missing — the shader components throw without a numeric ${key}.`
            : `\`style.${key}\` is \`${JSON.stringify(out[key])}\` — the shader components need a number. Measure the parent with \`onLayout\` and pass the result.`,
      });
    }
  }

  return { style: out, warnings };
}
