export function startPreciseInterval(callback: Function, intervalMs: number) {
  let expected = performance.now() + intervalMs;

  function step() {
    const now = performance.now();
    const drift = now - expected;
    callback(drift);
    expected += intervalMs;
    setTimeout(step, Math.max(0, intervalMs - drift));
  }

  setTimeout(step, intervalMs);
}
