import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import {
  FIT_MAP,
  TYPE_MAP,
  type DitheringFit,
  type DitheringType,
} from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { IMAGE_DITHERING_SKSL } from "./image-dithering.sksl";

export type ImageDitheringProps = {
  speed?: number;
  frame?: number;
  colorFront?: string;
  colorBack?: string;
  colorHighlight?: string;
  type?: DitheringType;
  size?: number;
  colorSteps?: number;
  originalColors?: boolean;
  inverted?: boolean;
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

export function ImageDithering({
  speed = 0,
  frame = 0,
  colorFront = "#94ffaf",
  colorBack = "#000c38",
  colorHighlight = "#eaff94",
  type = "8x8",
  size = 2,
  colorSteps = 2,
  originalColors = false,
  inverted = false,
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "cover",
  style,
}: ImageDitheringProps) {
  const effect = useMemo(
    () => makeShader(IMAGE_DITHERING_SKSL, "ImageDithering"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  useShaderTime(frame, speed);

  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);
  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cHl = useMemo(() => parseCssColor(colorHighlight), [colorHighlight]);

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
    u_colorHighlight: cHl,
    u_type: TYPE_MAP[type],
    u_pxSize: size,
    u_originalColors: originalColors ? 1 : 0,
    u_inverted: inverted ? 1 : 0,
    u_colorSteps: colorSteps,
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
