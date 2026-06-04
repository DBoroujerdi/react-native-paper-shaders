import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { GRAIN_GRADIENT_SKSL } from "./grain-gradient.sksl";

const ZERO_RGBA: [number, number, number, number] = [0, 0, 0, 0];
const MAX_COLORS = 7;

export const GRAIN_GRADIENT_SHAPES = {
  wave: 1,
  dots: 2,
  truchet: 3,
  corners: 4,
  ripple: 5,
  blob: 6,
  sphere: 7,
} as const;
export type GrainGradientShape = keyof typeof GRAIN_GRADIENT_SHAPES;

export type GrainGradientProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  softness?: number;
  intensity?: number;
  noise?: number;
  shape?: GrainGradientShape;
  fit?: DitheringFit;
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

export function GrainGradient({
  speed = 1,
  frame = 0,
  colorBack = "#000000",
  colors = ["#7300ff", "#eba8ff", "#00bfff", "#2a00ff"],
  softness = 0.5,
  intensity = 0.5,
  noise = 0.25,
  shape = "corners",
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
}: GrainGradientProps) {
  const effect = useMemo(
    () => makeShader(GRAIN_GRADIENT_SKSL, "GrainGradient"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const parsed = useMemo(() => {
    const slots: [number, number, number, number][] = [];
    for (let i = 0; i < MAX_COLORS; i++) {
      slots.push(i < colors.length ? parseCssColor(colors[i]!) : ZERO_RGBA);
    }
    return slots;
  }, [colors]);
  const colorsCount = Math.min(colors.length, MAX_COLORS);

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
    u_color0: parsed[0],
    u_color1: parsed[1],
    u_color2: parsed[2],
    u_color3: parsed[3],
    u_color4: parsed[4],
    u_color5: parsed[5],
    u_color6: parsed[6],
    u_colorsCount: colorsCount,
    u_softness: softness,
    u_intensity: intensity,
    u_noise: noise,
    u_shape: GRAIN_GRADIENT_SHAPES[shape],
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
