export const SHAPE_MAP = {
  simplex: 1,
  warp: 2,
  dots: 3,
  wave: 4,
  ripple: 5,
  swirl: 6,
  sphere: 7,
} as const;

export type DitheringShape = keyof typeof SHAPE_MAP;

export const TYPE_MAP = {
  random: 1,
  "2x2": 2,
  "4x4": 3,
  "8x8": 4,
} as const;

export type DitheringType = keyof typeof TYPE_MAP;

export const FIT_MAP = {
  none: 0,
  contain: 1,
  cover: 2,
} as const;

export type DitheringFit = keyof typeof FIT_MAP;
