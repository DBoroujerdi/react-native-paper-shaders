import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize } from "./_shared";
import { WAVES_SKSL } from "./waves.sksl";

export type WavesProps = {
  colorFront?: string;
  colorBack?: string;
  shape?: number;
  frequency?: number;
  amplitude?: number;
  spacing?: number;
  proportion?: number;
  softness?: number;
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

export function Waves({
  colorFront = "#ffbb00",
  colorBack = "#000000",
  shape = 0,
  frequency = 0.5,
  amplitude = 0.5,
  spacing = 1.2,
  proportion = 0.1,
  softness = 0,
  scale = 0.6,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  style,
}: WavesProps) {
  const effect = useMemo(() => makeShader(WAVES_SKSL, "Waves"), []);
  const { width, height, dpr } = useShaderSize(style);

  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);
  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);

  const uniforms = useDerivedValue(() => ({
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
    u_colorBack: cBack,
    u_shape: shape,
    u_frequency: frequency,
    u_amplitude: amplitude,
    u_spacing: spacing,
    u_proportion: proportion,
    u_softness: softness,
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
