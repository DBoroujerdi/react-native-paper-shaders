import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor, type Rgba } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { PULSING_BORDER_SKSL } from "./pulsing-border.sksl";

const TRANSPARENT: Rgba = [0, 0, 0, 0];
const MAX_COLORS = 5;

const ASPECT_RATIO_MAP = { auto: 0, square: 1 } as const;
export type PulsingBorderAspectRatio = keyof typeof ASPECT_RATIO_MAP;

export type PulsingBorderProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colors?: string[];
  roundness?: number;
  thickness?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  aspectRatio?: PulsingBorderAspectRatio;
  softness?: number;
  intensity?: number;
  bloom?: number;
  spots?: number;
  spotSize?: number;
  pulse?: number;
  smoke?: number;
  smokeSize?: number;
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

export function PulsingBorder({
  speed = 1,
  frame = 0,
  colorBack = "#000000",
  colors = ["#0dc1fd", "#d915ef", "#ff3f2ecc"],
  roundness = 0.25,
  thickness = 0.1,
  marginLeft = 0,
  marginRight = 0,
  marginTop = 0,
  marginBottom = 0,
  aspectRatio = "auto",
  softness = 0.75,
  intensity = 0.2,
  bloom = 0.25,
  spots = 5,
  spotSize = 0.5,
  pulse = 0.25,
  smoke = 0.3,
  smokeSize = 0.6,
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
}: PulsingBorderProps) {
  const effect = useMemo(
    () => makeShader(PULSING_BORDER_SKSL, "PulsingBorder"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  // Pad colors to a fixed length so the uniform layout never changes.
  const colorSlots = useMemo<Rgba[]>(() => {
    const slots: Rgba[] = [];
    for (let i = 0; i < MAX_COLORS; i++) {
      const src = colors[i];
      slots.push(src ? parseCssColor(src) : TRANSPARENT);
    }
    return slots;
  }, [colors]);
  // The shader caps active spots at 4 (its MAX_SPOTS). Anything higher just
  // means it iterates the full 4 inner-loop slots.
  const clampedSpots = Math.min(Math.max(Math.floor(spots), 1), 4);

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
    u_color0: colorSlots[0],
    u_color1: colorSlots[1],
    u_color2: colorSlots[2],
    u_color3: colorSlots[3],
    u_color4: colorSlots[4],
    u_colorsCount: Math.min(colors.length, MAX_COLORS),
    u_roundness: roundness,
    u_thickness: thickness,
    u_marginLeft: marginLeft,
    u_marginRight: marginRight,
    u_marginTop: marginTop,
    u_marginBottom: marginBottom,
    u_aspectRatio: ASPECT_RATIO_MAP[aspectRatio],
    u_softness: softness,
    u_intensity: intensity,
    u_bloom: bloom,
    u_spotSize: spotSize,
    u_spots: clampedSpots,
    u_pulse: pulse,
    u_smoke: smoke,
    u_smokeSize: smokeSize,
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
