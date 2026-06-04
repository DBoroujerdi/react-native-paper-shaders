import { useMemo } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Canvas, Fill, Shader } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";

import { parseCssColor } from "../color";
import { FIT_MAP, type DitheringFit } from "../enums";
import { makeShader, useShaderSize, useShaderTime } from "./_shared";
import { PAPER_TEXTURE_SKSL } from "./paper-texture.sksl";

export type PaperTextureProps = {
  speed?: number;
  frame?: number;
  colorFront?: string;
  colorBack?: string;
  contrast?: number;
  roughness?: number;
  fiber?: number;
  fiberSize?: number;
  crumples?: number;
  crumpleSize?: number;
  folds?: number;
  foldCount?: number;
  fade?: number;
  drops?: number;
  seed?: number;
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

export function PaperTexture({
  speed = 0,
  frame = 0,
  colorFront = "#9fadbc",
  colorBack = "#ffffff",
  contrast = 0.3,
  roughness = 0.4,
  fiber = 0.3,
  fiberSize = 0.2,
  crumples = 0.3,
  crumpleSize = 0.35,
  folds = 0.65,
  foldCount = 5,
  fade = 0,
  drops = 0.2,
  seed = 5.8,
  scale = 0.6,
  rotation = 0,
  originX = 0.5,
  originY = 0.5,
  offsetX = 0,
  offsetY = 0,
  worldWidth = 0,
  worldHeight = 0,
  fit = "cover",
  style,
}: PaperTextureProps) {
  const effect = useMemo(
    () => makeShader(PAPER_TEXTURE_SKSL, "PaperTexture"),
    [],
  );
  const { width, height, dpr } = useShaderSize(style);
  // Time is unused by the SkSL source but we keep the hook so the gallery
  // animates uniforms identically across shaders.
  useShaderTime(frame, speed);

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
    u_contrast: contrast,
    u_roughness: roughness,
    u_fiber: fiber,
    u_fiberSize: fiberSize,
    u_crumples: crumples,
    u_crumpleSize: crumpleSize,
    u_folds: folds,
    u_foldCount: foldCount,
    u_drops: drops,
    u_seed: seed,
    u_fade: fade,
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
