import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import {
  WARP_MAX_COLORS,
  WARP_PATTERNS,
  WARP_SKSL,
  type WarpPattern,
} from "./warp.sksl";

function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < WARP_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export type WarpProps = {
  speed?: number;
  frame?: number;
  colors?: string[];
  proportion?: number;
  softness?: number;
  shape?: WarpPattern;
  shapeScale?: number;
  distortion?: number;
  swirl?: number;
  swirlIterations?: number;
  scale?: number;
  rotation?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
  fit?: DitheringFit;
  style?: StyleProp<ViewStyle>;
};

export function Warp({
  speed = 1,
  frame = 0,
  colors = ["#121212", "#9470ff", "#121212", "#8838ff"],
  proportion = 0.45,
  softness = 1,
  shape = "checks",
  shapeScale = 0.1,
  distortion = 0.25,
  swirl = 0.8,
  swirlIterations = 10,
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  style,
}: WarpProps) {
  const effect = useMemo(() => makeShader(WARP_SKSL, "Warp"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = colors.length;

  const uniforms = useDerivedValue(() => ({
    u_time: uTime.value,
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_proportion: proportion,
    u_softness: softness,
    u_shape: WARP_PATTERNS[shape],
    u_shapeScale: shapeScale,
    u_distortion: distortion,
    u_swirl: swirl,
    u_swirlIterations: swirlIterations,
  }));

  return (
    <View style={style}>
      <Canvas style={{ width, height }}>
        <Fill>
          <Shader source={effect} uniforms={uniforms as never} />
        </Fill>
      </Canvas>
    </View>
  );
}
