import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize } from "./_shared";
import { HALFTONE_DOTS_SKSL } from "./halftone-dots.sksl";

export const HALFTONE_DOTS_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type HalftoneDotsFit = keyof typeof HALFTONE_DOTS_FIT_MAP;

export const HALFTONE_DOTS_TYPE_MAP = {
  classic: 0,
  gooey: 1,
  holes: 2,
  soft: 3,
} as const;

export type HalftoneDotsType = keyof typeof HALFTONE_DOTS_TYPE_MAP;

export const HALFTONE_DOTS_GRID_MAP = {
  square: 0,
  hex: 1,
} as const;

export type HalftoneDotsGrid = keyof typeof HALFTONE_DOTS_GRID_MAP;

export type HalftoneDotsProps = {
  speed?: number;
  frame?: number;
  colorFront?: string;
  colorBack?: string;
  size?: number;
  radius?: number;
  contrast?: number;
  originalColors?: boolean;
  inverted?: boolean;
  grainMixer?: number;
  grainOverlay?: number;
  grainSize?: number;
  grid?: HalftoneDotsGrid;
  type?: HalftoneDotsType;
  fit?: HalftoneDotsFit;
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

export function HalftoneDots({
  speed = 0,
  frame = 0,
  colorFront = "#2b2b2b",
  colorBack = "#f2f1e8",
  size = 0.5,
  radius = 1.25,
  contrast = 0.4,
  originalColors = false,
  inverted = false,
  grainMixer = 0.2,
  grainOverlay = 0.2,
  grainSize = 0.5,
  grid = "hex",
  type = "gooey",
  fit = "cover",
  scale = 1,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  style,
}: HalftoneDotsProps) {
  // Static effect; frame/speed accepted only for API symmetry.
  void speed;
  void frame;
  const effect = useMemo(
    () => makeShader(HALFTONE_DOTS_SKSL, "HalftoneDots"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);

  const cFront = useMemo(() => parseCssColor(colorFront), [colorFront]);
  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);

  // Procedural stub image has aspect ratio 1.
  const imageAspect = 1;

  const uniforms = useDerivedValue(() => ({
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: HALFTONE_DOTS_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_colorFront: cFront,
    u_colorBack: cBack,
    u_radius: radius,
    u_contrast: contrast,
    u_imageAspectRatio: imageAspect,
    u_size: size,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_grainSize: grainSize,
    u_grid: HALFTONE_DOTS_GRID_MAP[grid],
    u_originalColors: originalColors ? 1 : 0,
    u_inverted: inverted ? 1 : 0,
    u_type: HALFTONE_DOTS_TYPE_MAP[type],
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
