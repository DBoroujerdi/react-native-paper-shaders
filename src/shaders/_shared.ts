import { useEffect, useMemo } from "react";
import { PixelRatio, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Skia, type SkRuntimeEffect } from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

// Module-level cache of compiled effects, keyed by their SkSL source string.
// Skia.RuntimeEffect compilation is expensive; reusing across mounts is the right default.
const effectCache = new Map<string, SkRuntimeEffect>();

export function makeShader(sksl: string, name: string): SkRuntimeEffect {
  const cached = effectCache.get(sksl);
  if (cached) return cached;
  const effect = Skia.RuntimeEffect.Make(sksl);
  if (!effect) {
    throw new Error(
      `${name}: SkSL failed to compile. Check Metro console for the Skia error output.`,
    );
  }
  effectCache.set(sksl, effect);
  return effect;
}

// Returns u_time as a SharedValue<number> in seconds, seeded with `frame` (ms) and
// advanced by `delta * speed` each frame on the UI thread.
export function useShaderTime(
  frame: number,
  speed: number,
): SharedValue<number> {
  const elapsedMs = useSharedValue(frame);
  const speedSV = useSharedValue(speed);
  useEffect(() => {
    speedSV.value = speed;
  }, [speed, speedSV]);

  useFrameCallback((info) => {
    "worklet";
    const dt = info.timeSincePreviousFrame;
    if (dt == null) return;
    elapsedMs.value = elapsedMs.value + dt * speedSV.value;
  });

  return useDerivedValue(() => elapsedMs.value * 0.001);
}

// Reads width/height (numbers, in points) from a flat style. Throws if missing
// or non-numeric — callers must pass a sized View style.
export function useShaderSize(style: StyleProp<ViewStyle> | undefined): {
  width: number;
  height: number;
  dpr: number;
} {
  return useMemo(() => {
    const flat = StyleSheet.flatten(style) ?? {};
    const width = typeof flat.width === "number" ? flat.width : 0;
    const height = typeof flat.height === "number" ? flat.height : 0;
    if (width <= 0 || height <= 0) {
      throw new Error(
        "Shader: style must include numeric width and height (e.g. { width: 320, height: 320 }).",
      );
    }
    return { width, height, dpr: PixelRatio.get() };
  }, [style]);
}
