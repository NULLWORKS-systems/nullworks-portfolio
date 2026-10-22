"use client";

import { useEffect, useRef } from "react";

export default function InfinitePinwheel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start = performance.now();
    let cssW = 1;
    let cssH = 1;
    let image: ImageData;
    let data: Uint8ClampedArray;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, rect.width);
      cssH = Math.max(1, rect.height);
      const scale = Math.min(0.62, 720 / Math.max(cssW, cssH));
      canvas.width = Math.max(240, Math.round(cssW * scale));
      canvas.height = Math.max(240, Math.round(cssH * scale));
      image = ctx.createImageData(canvas.width, canvas.height);
      data = image.data;
    };

    const render = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.hypot(cx, cy);
      const t = reduced ? 3.7 : (now - start) * 0.001;
      const spin = t * 0.105;
      let p = 0;

      for (let y = 0; y < h; y++) {
        const ny = (y - cy) / maxR;
        for (let x = 0; x < w; x++) {
          const nx = (x - cx) / maxR;
          const r = Math.max(0.0025, Math.hypot(nx, ny));
          const a = Math.atan2(ny, nx);

          const horizontalWave = Math.sin(ny * 35 - t * 1.35 + Math.sin(nx * 8 + t * 0.38) * 1.7);
          const diagonalWave = Math.sin((nx + ny) * 25 + t * 0.72) * 0.28;
          const radialWave = Math.sin(1 / (r * 0.115) - t * 1.7) * Math.min(1, 0.24 / r);
          const warpedAngle = a + spin + horizontalWave * 0.13 + diagonalWave * 0.055 + radialWave * 0.085;

          const spiral = warpedAngle * 5.35 + Math.log(r + 0.012) * 11.4 - t * 0.32;
          const bands = Math.sin(spiral);
          const fine = Math.sin(spiral * 2.02 + horizontalWave * 1.15) * 0.23;
          const pulse = Math.sin((ny * 48) - t * 2.15 + r * 18) * 0.12;
          const v = bands + fine + pulse;

          const huePhase = spiral * 0.19 + t * 0.11 + horizontalWave * 0.7;
          const c1 = 0.5 + 0.5 * Math.sin(huePhase);
          const c2 = 0.5 + 0.5 * Math.sin(huePhase + 2.094);
          const c3 = 0.5 + 0.5 * Math.sin(huePhase + 4.188);
          const light = 0.34 + 0.66 * (0.5 + 0.5 * Math.tanh(v * 2.2));
          const centerBloom = Math.exp(-r * 15);
          const edge = Math.max(0.22, 1 - Math.pow(r, 1.7) * 0.38);

          data[p++] = Math.min(255, (42 + 218 * c1 * light + centerBloom * 36) * edge);
          data[p++] = Math.min(255, (32 + 224 * c2 * light + centerBloom * 32) * edge);
          data[p++] = Math.min(255, (48 + 220 * c3 * light + centerBloom * 46) * edge);
          data[p++] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      if (!reduced) raf = requestAnimationFrame(render);
    };

    resize();
    render(start);
    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) render(start);
    });
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className="pinwheel-canvas" aria-label="Slowly rotating psychedelic spiral with wave interference collapsing toward an infinite center" />;
}
