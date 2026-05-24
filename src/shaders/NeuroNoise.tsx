import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { NEURO_NOISE_SKSL } from "./neuro-noise.sksl";

export type NeuroNoiseProps = {
  speed?: number;
  frame?: number;
  colorFront?: string;
  colorMid?: string;
  colorBack?: string;
  brightness?: number;
  contrast?: number;
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

export function NeuroNoise({
  speed = 1,
  frame = 0,
  colorFront = "#ffffff",
  colorMid = "#47a6ff",
  colorBack = "#000000",
  brightness = 0.05,
  contrast = 0.3,
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  style,
}: NeuroNoiseProps) {
  const effect = useMemo(() => makeShader(NEURO_NOISE_SKSL, "NeuroNoise"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);
  const cMid = useMemo(() => parseCssColor(colorMid), [colorMid]);
  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);

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
    u_colorFront: cFront,
    u_colorMid: cMid,
    u_colorBack: cBack,
    u_brightness: brightness,
    u_contrast: contrast,
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
