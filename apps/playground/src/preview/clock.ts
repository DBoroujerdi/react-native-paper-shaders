/**
 * One requestAnimationFrame loop for the whole preview: `tick` subscribers
 * stand in for Reanimated's `useFrameCallback` (they advance shader time),
 * `draw` subscribers repaint the CanvasKit surfaces afterwards.
 */
type Subscriber = (deltaMs: number) => void;

const tickers = new Set<Subscriber>();
const drawers = new Set<Subscriber>();

let frame: number | null = null;
let previous = 0;

function loop(now: number) {
  const delta = previous === 0 ? 0 : now - previous;
  previous = now;
  for (const tick of tickers) tick(delta);
  for (const draw of drawers) draw(delta);
  frame = tickers.size + drawers.size > 0 ? requestAnimationFrame(loop) : null;
}

function ensureRunning() {
  if (frame === null) {
    previous = 0;
    frame = requestAnimationFrame(loop);
  }
}

function subscribe(set: Set<Subscriber>, fn: Subscriber): () => void {
  set.add(fn);
  ensureRunning();
  return () => {
    set.delete(fn);
    if (tickers.size + drawers.size === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

export const onTick = (fn: Subscriber) => subscribe(tickers, fn);
export const onDraw = (fn: Subscriber) => subscribe(drawers, fn);
