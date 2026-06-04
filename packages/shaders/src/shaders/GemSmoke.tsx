import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { GEM_SMOKE_MAX_COLORS, GEM_SMOKE_SKSL } from "./gem-smoke.sksl";

const SHAPE_MAP = {
  none: 0,
  circle: 1,
  daisy: 2,
  diamond: 3,
  metaballs: 4,
} as const;

export type GemSmokeShape = keyof typeof SHAPE_MAP;

export type GemSmokeProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorInner?: string;
  colors?: string[];
  innerDistortion?: number;
  outerDistortion?: number;
  outerGlow?: number;
  innerGlow?: number;
  offset?: number;
  angle?: number;
  size?: number;
  shape?: GemSmokeShape;
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
  for (let k = 0; k < GEM_SMOKE_MAX_COLORS; k++) {
    out[`u_color${k}`] =
      k < colors.length ? (parseCssColor(colors[k]) as unknown as number[]) : [0, 0, 0, 0];
  }
  return out;
}

export function GemSmoke({
  speed = 1,
  frame = 0,
  colorBack = "#f0efea",
  colorInner = "#fafaf5",
  colors = ["#333333", "#e7e6df"],
  innerDistortion = 0.8,
  outerDistortion = 0.6,
  outerGlow = 0.55,
  innerGlow = 1,
  offset = 0,
  angle = 0,
  size = 0.8,
  shape = "diamond",
  scale = 0.6,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "contain",
  style,
}: GemSmokeProps) {
  const effect = useMemo(() => makeShader(GEM_SMOKE_SKSL, "GemSmoke"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cInner = useMemo(() => parseCssColor(colorInner), [colorInner]);
  const colorSlots = useMemo(() => spreadColors(colors), [colors]);
  const colorsCount = Math.max(1, Math.min(colors.length, GEM_SMOKE_MAX_COLORS));

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
    u_colorBack: cBack,
    u_colorInner: cInner,
    u_innerDistortion: innerDistortion,
    u_outerDistortion: outerDistortion,
    u_outerGlow: outerGlow,
    u_innerGlow: innerGlow,
    u_offset: offset,
    u_angle: angle,
    u_size: size,
    u_shape: SHAPE_MAP[shape],
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
