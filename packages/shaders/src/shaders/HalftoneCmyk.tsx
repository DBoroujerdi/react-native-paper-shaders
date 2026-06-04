import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { makeShader, useShaderSize } from "./_shared";
import { HALFTONE_CMYK_SKSL } from "./halftone-cmyk.sksl";

export const HALFTONE_CMYK_FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type HalftoneCmykFit = keyof typeof HALFTONE_CMYK_FIT_MAP;

export const HALFTONE_CMYK_TYPE_MAP = {
  dots: 0,
  ink: 1,
  sharp: 2,
} as const;

export type HalftoneCmykType = keyof typeof HALFTONE_CMYK_TYPE_MAP;

export type HalftoneCmykProps = {
  speed?: number;
  frame?: number;
  colorBack?: string;
  colorC?: string;
  colorM?: string;
  colorY?: string;
  colorK?: string;
  size?: number;
  contrast?: number;
  softness?: number;
  grainSize?: number;
  grainMixer?: number;
  grainOverlay?: number;
  gridNoise?: number;
  floodC?: number;
  floodM?: number;
  floodY?: number;
  floodK?: number;
  gainC?: number;
  gainM?: number;
  gainY?: number;
  gainK?: number;
  type?: HalftoneCmykType;
  fit?: HalftoneCmykFit;
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

export function HalftoneCmyk({
  speed = 0,
  frame = 0,
  colorBack = "#fbfaf5",
  colorC = "#00b4ff",
  colorM = "#fc519f",
  colorY = "#ffd800",
  colorK = "#231f20",
  size = 0.2,
  contrast = 1,
  softness = 1,
  grainSize = 0.5,
  grainMixer = 0,
  grainOverlay = 0,
  gridNoise = 0.2,
  floodC = 0.15,
  floodM = 0,
  floodY = 0,
  floodK = 0,
  gainC = 0.3,
  gainM = 0,
  gainY = 0.2,
  gainK = 0,
  type = "ink",
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
}: HalftoneCmykProps) {
  // Static effect; frame/speed accepted only for API symmetry.
  void speed;
  void frame;
  const effect = useMemo(
    () => makeShader(HALFTONE_CMYK_SKSL, "HalftoneCmyk"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);

  const cBack = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const cC = useMemo(() => parseCssColor(colorC), [colorC]);
  const cM = useMemo(() => parseCssColor(colorM), [colorM]);
  const cY = useMemo(() => parseCssColor(colorY), [colorY]);
  const cK = useMemo(() => parseCssColor(colorK), [colorK]);
  const imageAspect = 1;

  const uniforms = useDerivedValue(() => ({
    u_resolution: [width * dpr, height * dpr],
    u_pixelRatio: dpr,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
    u_fit: HALFTONE_CMYK_FIT_MAP[fit],
    u_scale: scale,
    u_rotation: rotation,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_imageAspectRatio: imageAspect,
    u_colorBack: cBack,
    u_colorC: cC,
    u_colorM: cM,
    u_colorY: cY,
    u_colorK: cK,
    u_size: size,
    u_contrast: contrast,
    u_softness: softness,
    u_grainSize: grainSize,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_gridNoise: gridNoise,
    u_floodC: floodC,
    u_floodM: floodM,
    u_floodY: floodY,
    u_floodK: floodK,
    u_gainC: gainC,
    u_gainM: gainM,
    u_gainY: gainY,
    u_gainK: gainK,
    u_type: HALFTONE_CMYK_TYPE_MAP[type],
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
