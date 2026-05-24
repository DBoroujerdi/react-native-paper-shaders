import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { SMOKE_RING_MAX_COLORS, SMOKE_RING_SKSL } from "./smoke-ring.sksl";

export type SmokeRingProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  noiseScale?: number;
  noiseIterations?: number;
  radius?: number;
  thickness?: number;
  innerShape?: number;
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

// Builds u_color0..u_color9 uniform map, padding with zero-vectors past colors.length.
function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let i = 0; i < SMOKE_RING_MAX_COLORS; i++) {
    out[`u_color${i}`] =
      i < colors.length ? (parseCssColor(colors[i]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function SmokeRing({
  speed = 0.5,
  frame = 0,
  colorBack = "#000000",
  colors = ["#ffffff"],
  noiseScale = 3,
  noiseIterations = 8,
  radius = 0.25,
  thickness = 0.65,
  innerShape = 0.7,
  scale = 0.8,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "contain",
  style,
}: SmokeRingProps) {
  const effect = useMemo(() => makeShader(SMOKE_RING_SKSL, "SmokeRing"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = Math.max(1, Math.min(colors.length, SMOKE_RING_MAX_COLORS));

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
    u_colorBack: cBack,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_thickness: thickness,
    u_radius: radius,
    u_innerShape: innerShape,
    u_noiseScale: noiseScale,
    u_noiseIterations: noiseIterations,
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
