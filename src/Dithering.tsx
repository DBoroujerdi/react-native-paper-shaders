import { useEffect, useMemo } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  type SkRuntimeEffect,
} from "@shopify/react-native-skia";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

import { parseCssColor } from "./color";
import { DITHERING_SKSL } from "./dithering.sksl";
import {
  FIT_MAP,
  SHAPE_MAP,
  TYPE_MAP,
  type DitheringFit,
  type DitheringShape,
  type DitheringType,
} from "./enums";

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

let cachedEffect: SkRuntimeEffect | null = null;
function getDitheringEffect(): SkRuntimeEffect {
  if (cachedEffect) return cachedEffect;
  const effect = Skia.RuntimeEffect.Make(DITHERING_SKSL);
  if (!effect) {
    throw new Error(
      "Dithering: SkSL failed to compile. Check console for Skia error output.",
    );
  }
  cachedEffect = effect;
  return effect;
}

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
  const effect = useMemo(() => getDitheringEffect(), []);

  const flat = StyleSheet.flatten(style) ?? {};
  const width = typeof flat.width === "number" ? flat.width : 0;
  const height = typeof flat.height === "number" ? flat.height : 0;
  if (width <= 0 || height <= 0) {
    throw new Error(
      "Dithering: style must include numeric width and height (e.g. { width: 511, height: 319 }).",
    );
  }
  const dpr = PixelRatio.get();

  // Time driver: shared values mutated on the UI thread each frame.
  const elapsedMs = useSharedValue(frame);
  const speedSV = useSharedValue(speed);
  useEffect(() => {
    speedSV.value = speed;
  }, [speed, speedSV]);

  useFrameCallback((info) => {
    "worklet";
    const dt = info.timeSincePreviousFrame;
    if (dt == null) return;
    elapsedMs.value = elapsedMs.value + dt * speedSV.value;
  });

  const colorBackRgba = useMemo(() => parseCssColor(colorBack), [colorBack]);
  const colorFrontRgba = useMemo(() => parseCssColor(colorFront), [colorFront]);

  const shapeId = SHAPE_MAP[shape];
  const typeId = TYPE_MAP[type];
  const fitId = FIT_MAP[fit];

  const uniforms = useDerivedValue(() => {
    return {
      u_time: elapsedMs.value * 0.001,
      u_resolution: [width * dpr, height * dpr],
      u_pixelRatio: dpr,
      u_originX: originX,
      u_originY: originY,
      u_worldWidth: worldWidth,
      u_worldHeight: worldHeight,
      u_fit: fitId,
      u_scale: scale,
      u_rotation: rotation,
      u_offsetX: offsetX,
      u_offsetY: offsetY,
      u_pxSize: size,
      u_colorBack: colorBackRgba,
      u_colorFront: colorFrontRgba,
      u_shape: shapeId,
      u_type: typeId,
    };
  });

  return (
    <View style={style}>
      <Canvas style={{ width, height }}>
        <Fill>
          {/* uniforms accepts a SharedValue at runtime; the public type does not yet reflect that. */}
          <Shader source={effect} uniforms={uniforms as never} />
        </Fill>
      </Canvas>
    </View>
  );
}
