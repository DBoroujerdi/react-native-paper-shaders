import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import {
  FIT_MAP,
  SHAPE_MAP,
  TYPE_MAP,
  type DitheringFit,
  type DitheringShape,
  type DitheringType,
} from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { DITHERING_SKSL } from "./dithering.sksl";

export type DitheringProps = {
  speed?: number;
  frame?: number;
  shape?: DitheringShape;
  type?: DitheringType;
  size?: number;
  scale?: number;
  rotation?: number;
  originX?: number;
  originY?: number;
  offsetX?: number;
  offsetY?: number;
  worldWidth?: number;
  worldHeight?: number;
  fit?: DitheringFit;
  colorBack?: string;
  colorFront?: string;
  style?: StyleProp<ViewStyle>;
};

export function Dithering({
  speed = 1,
  frame = 0,
  shape = "sphere",
  type = "4x4",
  size = 4,
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "none",
  colorBack = "#000000",
  colorFront = "#00b2ff",
  style,
}: DitheringProps) {
  const effect = useMemo(() => makeShader(DITHERING_SKSL, "Dithering"), []);
  const { width, height, dpr } = useShaderSize(style);
  const uTime = useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);

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
    u_pxSize: size,
    u_colorBack: cBack,
    u_colorFront: cFront,
    u_shape: SHAPE_MAP[shape],
    u_type: TYPE_MAP[type],
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
