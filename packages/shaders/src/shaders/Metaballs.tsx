import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { METABALLS_MAX_COLORS, METABALLS_SKSL } from "./metaballs.sksl";

export const METABALLS_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type MetaballsFit = keyof typeof METABALLS_FIT_MAP;

export type MetaballsProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  count?: number;
  size?: number;
  fit?: MetaballsFit;
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
  for (let k = 0; k < METABALLS_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function Metaballs({
  speed = 1,
  frame = 0,
  colorBack = "#000000",
  colors = ["#6e33cc", "#ff5500", "#ffc105", "#ffc800", "#f585ff"],
  count = 10,
  size = 0.83,
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
}: MetaballsProps) {
  const effect = useMemo(() => makeShader(METABALLS_SKSL, "Metaballs"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = Math.min(colors.length, METABALLS_MAX_COLORS);

  const uniforms = useDerivedValue(() => ({
    u_time: uTime.value,
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: METABALLS_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_colorBack: cBack,
    ...colorSlots,
    u_colorsCount: colorsCount,
    u_size: size,
    u_count: count,
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
