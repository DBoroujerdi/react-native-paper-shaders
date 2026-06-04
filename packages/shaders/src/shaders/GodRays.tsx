import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { GOD_RAYS_MAX_COLORS, GOD_RAYS_SKSL } from "./god-rays.sksl";

export type GodRaysProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorBloom?: string;
  colors?: string[];
  density?: number;
  spotty?: number;
  midSize?: number;
  midIntensity?: number;
  intensity?: number;
  bloom?: number;
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

function spreadColors(colors: string[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let k = 0; k < GOD_RAYS_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function GodRays({
  speed = 0.75,
  frame = 0,
  colorBack = "#000000",
  colorBloom = "#0000ff",
  colors = ["#a600ff6e", "#6200fff0", "#ffffff", "#33fff5"],
  density = 0.3,
  spotty = 0.3,
  midSize = 0.2,
  midIntensity = 0.4,
  intensity = 0.8,
  bloom = 0.4,
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = -0.55,
  worldWidth = 0,
  worldHeight = 0,
  fit = "contain",
  style,
}: GodRaysProps) {
  const effect = useMemo(() => makeShader(GOD_RAYS_SKSL, "GodRays"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cBloom = useMemo(() => parseCssColor(colorBloom), [colorBloom]);
  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = Math.min(colors.length, GOD_RAYS_MAX_COLORS);

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
    u_colorBloom: cBloom,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_density: density,
    u_spotty: spotty,
    u_midSize: midSize,
    u_midIntensity: midIntensity,
    u_intensity: intensity,
    u_bloom: bloom,
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
