import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { PERLIN_NOISE_SKSL } from "./perlin-noise.sksl";

export type PerlinNoiseProps = {
  speed?: number;
  frame?: number;
  colorFront?: string;
  colorBack?: string;
  proportion?: number;
  softness?: number;
  octaveCount?: number;
  persistence?: number;
  lacunarity?: number;
  // Sizing (Paper's defaultPatternSizing).
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

export function PerlinNoise({
  speed = 0.5,
  frame = 0,
  colorBack = "#632ad5",
  colorFront = "#fccff7",
  proportion = 0.35,
  softness = 0.1,
  octaveCount = 1,
  persistence = 1,
  lacunarity = 1.5,
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
}: PerlinNoiseProps) {
  const effect = useMemo(
    () => makeShader(PERLIN_NOISE_SKSL, "PerlinNoise"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);
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
    u_colorBack: cBack,
    u_proportion: proportion,
    u_softness: softness,
    u_octaveCount: octaveCount,
    u_persistence: persistence,
    u_lacunarity: lacunarity,
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
