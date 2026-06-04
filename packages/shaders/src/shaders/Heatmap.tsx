import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { HEATMAP_SKSL } from "./heatmap.sksl";

// NOTE: This component is a STUB. Paper's Heatmap is image-driven (it samples a
// pre-blurred PNG inside the fragment shader). Until we wire a Skia image binding
// through the runtime effect, the shader only paints colorBack. All props are kept
// on the API so the gallery wiring matches the rest of the shaders.

export type HeatmapProps = {
  speed?: number;
  frame?: number;
  image?: string;
  contour?: number;
  angle?: number;
  noise?: number;
  innerGlow?: number;
  outerGlow?: number;
  colorBack?: string;
  colors?: string[];
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

export function Heatmap({
  speed = 1,
  frame = 0,
  contour = 0.5,
  angle = 0,
  noise = 0,
  innerGlow = 0.5,
  outerGlow = 0.5,
  colorBack = "#000000",
  colors = [
    "#11206a",
    "#1f3ba2",
    "#2f63e7",
    "#6bd7ff",
    "#ffe679",
    "#ff991e",
    "#ff4c00",
  ],
  fit = "contain",
  scale = 0.75,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: HeatmapProps) {
  const effect = useMemo(() => makeShader(HEATMAP_SKSL, "Heatmap"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const color0 = useMemo(
    () => (colors.length > 0 ? parseCssColor(colors[0]!) : [0, 0, 0, 0]),
    [colors],
  );

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
    u_color0: color0,
    u_colorsCount: colors.length,
    u_angle: angle,
    u_noise: noise,
    u_innerGlow: innerGlow,
    u_outerGlow: outerGlow,
    u_contour: contour,
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
