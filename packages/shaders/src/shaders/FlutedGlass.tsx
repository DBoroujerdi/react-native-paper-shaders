import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { FLUTED_GLASS_SKSL } from "./fluted-glass.sksl";

export const GLASS_GRID_SHAPES = {
  lines: 1,
  linesIrregular: 2,
  wave: 3,
  zigzag: 4,
  pattern: 5,
} as const;
export type GlassGridShape = keyof typeof GLASS_GRID_SHAPES;

export const GLASS_DISTORTION_SHAPES = {
  prism: 1,
  lens: 2,
  contour: 3,
  cascade: 4,
  flat: 5,
} as const;
export type GlassDistortionShape = keyof typeof GLASS_DISTORTION_SHAPES;

export type FlutedGlassProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorShadow?: string;
  colorHighlight?: string;
  shadows?: number;
  size?: number;
  angle?: number;
  distortion?: number;
  distortionShape?: GlassDistortionShape;
  highlights?: number;
  shape?: GlassGridShape;
  shift?: number;
  blur?: number;
  edges?: number;
  stretch?: number;
  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  grainMixer?: number;
  grainOverlay?: number;
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

export function FlutedGlass({
  speed = 0,
  frame = 0,
  colorBack = "#00000000",
  colorShadow = "#000000",
  colorHighlight = "#ffffff",
  shadows = 0.25,
  size = 0.5,
  angle = 0,
  distortion = 0.5,
  distortionShape = "prism",
  highlights = 0.1,
  shape = "lines",
  shift = 0,
  blur = 0,
  edges = 0.25,
  stretch = 0,
  marginLeft = 0,
  marginRight = 0,
  marginTop = 0,
  marginBottom = 0,
  grainMixer = 0,
  grainOverlay = 0,
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
}: FlutedGlassProps) {
  const effect = useMemo(
    () => makeShader(FLUTED_GLASS_SKSL, "FlutedGlass"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  useShaderTime(frame, speed);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cShadow = useMemo(() => parseCssColor(colorShadow), [colorShadow]);
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
    u_colorBack: cBack,
    u_colorShadow: cShadow,
    u_colorHighlight: cHl,
    u_size: size,
    u_shadows: shadows,
    u_angle: angle,
    u_stretch: stretch,
    u_shape: GLASS_GRID_SHAPES[shape],
    u_distortion: distortion,
    u_highlights: highlights,
    u_distortionShape: GLASS_DISTORTION_SHAPES[distortionShape],
    u_shift: shift,
    u_blur: blur,
    u_edges: edges,
    u_marginLeft: marginLeft,
    u_marginRight: marginRight,
    u_marginTop: marginTop,
    u_marginBottom: marginBottom,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
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
