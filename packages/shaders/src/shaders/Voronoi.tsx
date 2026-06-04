import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { VORONOI_MAX_COLORS, VORONOI_SKSL } from "./voronoi.sksl";

function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < VORONOI_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export type VoronoiProps = {
  speed?: number;
  frame?: number;
  colors?: string[];
  stepsPerColor?: number;
  colorGap?: string;
  colorGlow?: string;
  distortion?: number;
  gap?: number;
  glow?: number;
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

export function Voronoi({
  speed = 0.5,
  frame = 0,
  colors = ["#ff8247", "#ffe53d"],
  stepsPerColor = 3,
  colorGlow = "#ffffff",
  colorGap = "#2e0000",
  distortion = 0.4,
  gap = 0.04,
  glow = 0,
  scale = 0.5,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  style,
}: VoronoiProps) {
  const effect = useMemo(() => makeShader(VORONOI_SKSL, "Voronoi"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = colors.length;
  const cGlow = useMemo(() => parseCssColor(colorGlow), [colorGlow]);
  const cGap = useMemo(() => parseCssColor(colorGap), [colorGap]);

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
    u_colorGlow: cGlow,
    u_colorGap: cGap,
    u_distortion: distortion,
    u_gap: gap,
    u_glow: glow,
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
