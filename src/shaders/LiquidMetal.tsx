import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { LIQUID_METAL_SKSL } from "./liquid-metal.sksl";

const SHAPE_MAP = {
  none: 0,
  circle: 1,
  daisy: 2,
  diamond: 3,
  metaballs: 4,
} as const;

export type LiquidMetalShape = keyof typeof SHAPE_MAP;

export type LiquidMetalProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorTint?: string;
  repetition?: number;
  shiftRed?: number;
  shiftBlue?: number;
  contour?: number;
  softness?: number;
  distortion?: number;
  angle?: number;
  shape?: LiquidMetalShape;
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

export function LiquidMetal({
  speed = 1,
  frame = 0,
  colorBack = "#AAAAAC",
  colorTint = "#ffffff",
  repetition = 2.0,
  shiftRed = 0.3,
  shiftBlue = 0.3,
  contour = 0.4,
  softness = 0.1,
  distortion = 0.07,
  angle = 70,
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
}: LiquidMetalProps) {
  const effect = useMemo(() => makeShader(LIQUID_METAL_SKSL, "LiquidMetal"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cTint = useMemo(() => parseCssColor(colorTint), [colorTint]);

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
    u_colorTint: cTint,
    u_softness: softness,
    u_repetition: repetition,
    u_shiftRed: shiftRed,
    u_shiftBlue: shiftBlue,
    u_distortion: distortion,
    u_contour: contour,
    u_angle: angle,
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
