import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;

export function useCountUp(value: string): string {
  const match = value.match(/^(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[1].replace(/,/g, "")) : null;
  const suffix = match ? match[2] : "";
  const [display, setDisplay] = useState(target ?? 0);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (target == null) return;
    if (prefersReducedMotion.current) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    let raf: number;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target! - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (target == null) return value;
  return `${display.toLocaleString()}${suffix}`;
}
