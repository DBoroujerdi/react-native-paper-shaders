import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { DOT_ORBIT_MAX_COLORS, DOT_ORBIT_SKSL } from "./dot-orbit.sksl";

export const DOT_ORBIT_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type DotOrbitFit = keyof typeof DOT_ORBIT_FIT_MAP;

export type DotOrbitProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  size?: number;
  sizeRange?: number;
  spreading?: number;
  stepsPerColor?: number;
  fit?: DotOrbitFit;
  scale?: number;
  rotation?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
  style?: StyleProp<ViewStyle>;
};

// Pads `colors` out to DOT_ORBIT_MAX_COLORS vec4 slots and flattens to a
// single number[] (Skia RuntimeEffect wants flat arrays for uniform arrays).
function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < DOT_ORBIT_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function DotOrbit({
  speed = 1.5,
  frame = 0,
  colorBack = "#000000",
  colors = ["#ffc96b", "#ff6200", "#ff2f00", "#421100", "#1a0000"],
  size = 1,
  sizeRange = 0,
  spreading = 1,
  stepsPerColor = 4,
  fit = "none",
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: DotOrbitProps) {
  const effect = useMemo(() => makeShader(DOT_ORBIT_SKSL, "DotOrbit"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
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
    u_fit: DOT_ORBIT_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_colorBack: cBack,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_stepsPerColor: stepsPerColor,
    u_size: size,
    u_sizeRange: sizeRange,
    u_spreading: spreading,
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
