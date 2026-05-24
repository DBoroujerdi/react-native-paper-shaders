import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { COLOR_PANELS_SKSL } from "./color-panels.sksl";

const ZERO_RGBA: [number, number, number, number] = [0, 0, 0, 0];
const MAX_COLORS = 7;

export type ColorPanelsProps = {
  speed?: number;
  frame?: number;
  colors?: string[];
  colorBack?: string;
  angle1?: number;
  angle2?: number;
  length?: number;
  edges?: boolean;
  blur?: number;
  fadeIn?: number;
  fadeOut?: number;
  density?: number;
  gradient?: number;
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

export function ColorPanels({
  speed = 0.5,
  frame = 0,
  colors = [
    "#ff9d00",
    "#fd4f30",
    "#809bff",
    "#6d2eff",
    "#333aff",
    "#f15cff",
    "#ffd557",
  ],
  colorBack = "#000000",
  angle1 = 0,
  angle2 = 0,
  length = 1.1,
  edges = false,
  blur = 0,
  fadeIn = 1,
  fadeOut = 0.3,
  density = 3,
  gradient = 0,
  fit = "contain",
  scale = 0.8,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: ColorPanelsProps) {
  const effect = useMemo(
    () => makeShader(COLOR_PANELS_SKSL, "ColorPanels"),
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
    u_color0: parsed[0],
    u_color1: parsed[1],
    u_color2: parsed[2],
    u_color3: parsed[3],
    u_color4: parsed[4],
    u_color5: parsed[5],
    u_color6: parsed[6],
    u_colorsCount: colorsCount,
    u_colorBack: cBack,
    u_density: density,
    u_angle1: angle1,
    u_angle2: angle2,
    u_length: length,
    u_edges: edges ? 1 : 0,
    u_blur: blur,
    u_fadeIn: fadeIn,
    u_fadeOut: fadeOut,
    u_gradient: gradient,
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
