// Minimal stand-in for react-native. The shader components only need View,
// StyleSheet.flatten and PixelRatio, so there is no react-native-web here.
import type { CSSProperties, ReactNode } from "react";

export type ViewStyle = Record<string, any>;
export type TextStyle = ViewStyle;
export type ImageStyle = ViewStyle;
export type StyleProp<T> =
  | T
  | false
  | null
  | undefined
  | ReadonlyArray<StyleProp<T>>;

function flatten<T>(style: StyleProp<T>): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<Record<string, any>>(
      (acc, item) => ({ ...acc, ...flatten(item as StyleProp<T>) }),
      {},
    );
  }
  return style as Record<string, any>;
}

export const StyleSheet = {
  flatten,
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  absoluteFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  hairlineWidth: 1,
};

export const PixelRatio = {
  get: () => (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1),
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size: number) => Math.round(size * PixelRatio.get()),
  roundToNearestPixel: (size: number) => size,
};

const UNITLESS = new Set([
  "opacity", "zIndex", "flex", "flexGrow", "flexShrink", "aspectRatio",
]);

/** RN style object -> CSS, close enough for a preview of the RN layout. */
export function styleToCss(style: Record<string, any>): CSSProperties {
  const css: Record<string, unknown> = {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  };
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "number" && !UNITLESS.has(key)) {
      css[key] = `${value}px`;
    } else {
      css[key] = value;
    }
  }
  if (style.borderWidth && !style.borderStyle) css.borderStyle = "solid";
  return css as CSSProperties;
}

export function View({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return <div style={styleToCss(flatten(style))}>{children}</div>;
}

export function Text({
  style,
  children,
}: {
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}) {
  return <span style={styleToCss(flatten(style))}>{children}</span>;
}

export const Platform = { OS: "web" as const, select: <T,>(spec: { web?: T; default?: T }) => spec.web ?? spec.default };
