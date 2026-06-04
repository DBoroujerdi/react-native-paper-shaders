import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import {
  SIMPLEX_NOISE_MAX_COLORS,
  SIMPLEX_NOISE_SKSL,
} from "./simplex-noise.sksl";

// Flattens up to N colors into a (N * 4) length array. Excess slots are filled with
// transparent black so the shader's array uniform always has the right length.
function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < SIMPLEX_NOISE_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export type SimplexNoiseProps = {
  speed?: number;
  frame?: number;
  colors?: string[];
  stepsPerColor?: number;
  softness?: number;
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

export function SimplexNoise({
  speed = 0.5,
  frame = 0,
  colors = ["#4449CF", "#FFD1E0", "#F94446", "#FFD36B", "#FFFFFF"],
  stepsPerColor = 2,
  softness = 0,
  scale = 0.6,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  style,
}: SimplexNoiseProps) {
  const effect = useMemo(
    () => makeShader(SIMPLEX_NOISE_SKSL, "SimplexNoise"),
    [],
  );
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
    u_stepsPerColor: stepsPerColor,
    u_softness: softness,
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
