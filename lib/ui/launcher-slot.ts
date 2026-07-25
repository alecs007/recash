/**
 * A tiny cross-component signal for "something already occupies the
 * bottom-right corner" (e.g. the per-listing chat pill on a post page).
 *
 * The global AI assistant launcher subscribes to this so it can step out of the
 * way — stacking above the other launcher instead of overlapping it — without
 * either component needing to know about the other.
 */
let count = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Claim the bottom-right slot; call the returned function to release it. */
export function occupyBottomRight(): () => void {
  count += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count -= 1;
    emit();
  };
}

export function subscribeBottomRight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBottomRightSnapshot(): number {
  return count;
}
