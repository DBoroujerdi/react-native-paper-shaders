import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { SWIRL_MAX_COLORS, SWIRL_SKSL } from "./swirl.sksl";

export const SWIRL_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type SwirlFit = keyof typeof SWIRL_FIT_MAP;

export type SwirlProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  bandCount?: number;
  twist?: number;
  center?: number;
  proportion?: number;
  softness?: number;
  noiseFrequency?: number;
  noise?: number;
  fit?: SwirlFit;
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

function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < SWIRL_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function Swirl({
  speed = 0.32,
  frame = 0,
  colorBack = "#330000",
  colors = ["#ffd1d1", "#ff8a8a", "#660000"],
  bandCount = 4,
  twist = 0.1,
  center = 0.2,
  proportion = 0.5,
  softness = 0,
  noiseFrequency = 0.4,
  noise = 0.2,
  fit = "contain",
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: SwirlProps) {
  const effect = useMemo(() => makeShader(SWIRL_SKSL, "Swirl"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = Math.min(colors.length, SWIRL_MAX_COLORS);

  const uniforms = useDerivedValue(() => ({
    u_time: uTime.value,
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: SWIRL_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_colorBack: cBack,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_bandCount: bandCount,
    u_twist: twist,
    u_center: center,
    u_proportion: proportion,
    u_softness: softness,
    u_noise: noise,
    u_noiseFrequency: noiseFrequency,
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
