// Minimal stand-in for react-native-reanimated: the library only uses these
// three hooks, and on the web a plain object + the shared rAF loop is enough.
import { useEffect, useMemo, useRef } from "react";

import { onTick } from "../clock";

export type SharedValue<T> = { value: T };

export function useSharedValue<T>(initial: T): SharedValue<T> {
  const ref = useRef<SharedValue<T> | null>(null);
  if (ref.current === null) ref.current = { value: initial };
  return ref.current;
}

export type FrameInfo = {
  timestamp: number;
  timeSincePreviousFrame: number | null;
  timeSinceFirstFrame: number;
};

export function useFrameCallback(callback: (info: FrameInfo) => void) {
  const latest = useRef(callback);
  latest.current = callback;
  const first = useRef<number | null>(null);

  useEffect(
    () =>
      onTick((delta) => {
        const timestamp = performance.now();
        if (first.current === null) first.current = timestamp;
        latest.current({
          timestamp,
          timeSincePreviousFrame: delta,
          timeSinceFirstFrame: timestamp - first.current,
        });
      }),
    [],
  );

  return { setActive: () => {}, isActive: true };
}

/**
 * Reanimated recomputes derived values on the UI thread; here the value is
 * recomputed on read, which is once per frame from the CanvasKit draw loop.
 */
export function useDerivedValue<T>(factory: () => T, _deps?: unknown[]): SharedValue<T> {
  const latest = useRef(factory);
  latest.current = factory;
  return useMemo(
    () => ({
      get value() {
        return latest.current();
      },
      set value(_next: T) {
        throw new Error("derived values are read-only");
      },
    }),
    [],
  );
}

export const runOnUI = <T extends (...args: never[]) => unknown>(fn: T) => fn;
export const runOnJS = <T extends (...args: never[]) => unknown>(fn: T) => fn;
