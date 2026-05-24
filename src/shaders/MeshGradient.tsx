import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { MESH_GRADIENT_SKSL } from "./mesh-gradient.sksl";

const ZERO_RGBA: [number, number, number, number] = [0, 0, 0, 0];
const MAX_COLORS = 10;

export type MeshGradientProps = {
  speed?: number;
  frame?: number;
  colors?: string[];
  distortion?: number;
  swirl?: number;
  grainMixer?: number;
  grainOverlay?: number;
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

export function MeshGradient({
  speed = 1,
  frame = 0,
  colors = ["#e0eaff", "#241d9a", "#f75092", "#9f50d3"],
  distortion = 0.8,
  swirl = 0.1,
  grainMixer = 0,
  grainOverlay = 0,
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
}: MeshGradientProps) {
  const effect = useMemo(
    () => makeShader(MESH_GRADIENT_SKSL, "MeshGradient"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

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
    u_color7: parsed[7],
    u_color8: parsed[8],
    u_color9: parsed[9],
    u_colorsCount: colorsCount,
    u_distortion: distortion,
    u_swirl: swirl,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
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
