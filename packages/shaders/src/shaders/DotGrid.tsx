import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize } from "./_shared";
import { DOT_GRID_SKSL } from "./dot-grid.sksl";

export const DOT_GRID_SHAPE_MAP = {
  circle: 0,
  diamond: 1,
  square: 2,
  triangle: 3,
} as const;

export type DotGridShape = keyof typeof DOT_GRID_SHAPE_MAP;

export const DOT_GRID_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type DotGridFit = keyof typeof DOT_GRID_FIT_MAP;

export type DotGridProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorFill?: string;
  colorStroke?: string;
  size?: number;
  gapX?: number;
  gapY?: number;
  strokeWidth?: number;
  sizeRange?: number;
  opacityRange?: number;
  shape?: DotGridShape;
  fit?: DotGridFit;
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

export function DotGrid({
  speed = 1,
  frame = 0,
  colorBack = "#000000",
  colorFill = "#ffffff",
  colorStroke = "#ffaa00",
  size = 2,
  gapX = 32,
  gapY = 32,
  strokeWidth = 0,
  sizeRange = 0,
  opacityRange = 0,
  shape = "circle",
  fit = "none",
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: DotGridProps) {
  // DotGrid is a static pattern; frame/speed are accepted for API symmetry
  // with the other shaders but the SkSL has no u_time uniform.
  void speed;
  void frame;
  const effect = useMemo(() => makeShader(DOT_GRID_SKSL, "DotGrid"), []);
  const { width, height, dpr } = useShaderSize(style);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cFill = useMemo(() => parseCssColor(colorFill), [colorFill]);
  const cStroke = useMemo(() => parseCssColor(colorStroke), [colorStroke]);

  const uniforms = useDerivedValue(() => ({
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: DOT_GRID_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_colorBack: cBack,
    u_colorFill: cFill,
    u_colorStroke: cStroke,
    u_dotSize: size,
    u_gapX: gapX,
    u_gapY: gapY,
    u_strokeWidth: strokeWidth,
    u_sizeRange: sizeRange,
    u_opacityRange: opacityRange,
    u_shape: DOT_GRID_SHAPE_MAP[shape],
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
