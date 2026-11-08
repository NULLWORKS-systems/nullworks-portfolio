"use client";

import { useEffect, useRef, useState } from "react";

type RainColumn = { x: number; y: number; speed: number; length: number; seed: number };
type LogoCell = { targetX: number; targetY: number; paintAt: number; char: string };
type ForegroundDrop = { xRatio: number; startDelay: number; speed: number; radius: number };

const glyphs = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]<>/\\|:+-=アイウエオカキクケコサシスセソタチツテト";
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

const BLACKOUT_END = 800;
const GREEN_END = 6800;
const RED_SWEEP_END = 11800;
const FORMATION_END = 21800;
const DARK_LOCK_END = 25800;
const SEQUENCE_SETTLED = 27000;
const SOLIDIFY_DELAY = 1000;
const FIRST_DROP_START = RED_SWEEP_END + (FORMATION_END - RED_SWEEP_END) / 2;

export default function CorruptionSequenceMasked() {
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const foregroundRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef(false);
  const sequenceStartRef = useRef(0);
  const [runId, setRunId] = useState(0);
  const [settled, setSettled] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState("BLACKOUT");

  const replay = () => {
    skipRef.current = false;
    setSettled(false);
    setPhaseLabel("BLACKOUT");
    setRunId((value) => value + 1);
  };

  const skip = () => {
    skipRef.current = true;
    setSettled(true);
    setPhaseLabel("TWO-DROP BLEED");
  };

  useEffect(() => {
    const canvas = backgroundRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let fontSize = 15;
    let lastFrame = 0;
    let lastTime = performance.now();
    let rain: RainColumn[] = [];
    let logoCells: LogoCell[] = [];
    let logoY = 0;
    let logoLeft = 0;
    let logoWidth = 0;
    let logoTop = 0;
    let logoBottom = 0;
    let logoMask: HTMLCanvasElement | null = null;
    let solidLayer: HTMLCanvasElement | null = null;
    let solidContext: CanvasRenderingContext2D | null = null;
    let lastPhase = "";
    let completionSent = false;

    sequenceStartRef.current = performance.now();

    const setPhase = (next: string) => {
      if (next === lastPhase) return;
      lastPhase = next;
      setPhaseLabel(next);
    };

    const rebuildRain = () => {
      fontSize = width < 680 ? 14 : 16;
      const count = Math.max(20, Math.ceil(width / (fontSize * 1.12)) + 2);
      const columnWidth = width / Math.max(1, count - 1);
      rain = Array.from({ length: count }, (_, index) => ({
        x: index * columnWidth,
        y: -Math.random() * height * 1.3,
        speed: 54 + Math.random() * 82,
        length: 10 + Math.floor(Math.random() * 22),
        seed: Math.floor(Math.random() * glyphs.length),
      }));
    };

    const rebuildLogo = () => {
      const logoFontSize = Math.min(148, Math.max(48, width / 5.65));
      logoY = height * 0.46;

      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.floor(width));
      mask.height = Math.max(1, Math.floor(height));
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      maskContext.font = `950 ${logoFontSize}px Inter, Arial Black, sans-serif`;
      maskContext.textAlign = "center";
      maskContext.textBaseline = "middle";
      const measurement = maskContext.measureText("NULLWORKS");
      logoWidth = measurement.width;
      logoLeft = width / 2 - logoWidth / 2;
      logoTop = Math.max(0, logoY - logoFontSize * 0.62);
      logoBottom = Math.min(height, logoY + logoFontSize * 0.62);
      maskContext.fillStyle = "#fff";
      maskContext.fillText("NULLWORKS", width / 2, logoY);
      logoMask = mask;

      const layer = document.createElement("canvas");
      layer.width = mask.width;
      layer.height = mask.height;
      solidLayer = layer;
      solidContext = layer.getContext("2d");

      const image = maskContext.getImageData(0, 0, mask.width, mask.height);
      const step = fontSize;
      const points: Array<{ x: number; y: number }> = [];
      const left = Math.max(0, Math.floor(logoLeft - step));
      const right = Math.min(width, Math.ceil(logoLeft + logoWidth + step));

      for (let y = logoTop; y < logoBottom; y += step) {
        for (let x = left; x < right; x += step) {
          const alpha = image.data[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3];
          if (alpha > 88) points.push({ x, y });
        }
      }

      const landingWindow = FORMATION_END - RED_SWEEP_END - SOLIDIFY_DELAY;
      logoCells = points.map((point, index) => {
        const vertical = clamp((point.y - logoTop) / Math.max(1, logoBottom - logoTop));
        const horizontal = clamp((point.x - logoLeft) / Math.max(1, logoWidth));
        const columnStagger = ((Math.floor(horizontal * 17) + index) % 7) / 7;
        const paintProgress = clamp(vertical * 0.72 + columnStagger * 0.2 + Math.random() * 0.08);
        return {
          targetX: point.x,
          targetY: point.y,
          paintAt: RED_SWEEP_END + paintProgress * landingWindow,
          char: glyphs[(index * 11 + Math.floor(Math.random() * glyphs.length)) % glyphs.length],
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildRain();
      rebuildLogo();
    };

    const redSweepAt = (x: number, y: number, elapsed: number) => {
      if (elapsed <= GREEN_END) return 0;
      if (elapsed >= RED_SWEEP_END) return 1;
      const progress = clamp((elapsed - GREEN_END) / (RED_SWEEP_END - GREEN_END));
      const diagonalPosition = clamp((x / Math.max(1, width) + (1 - y / Math.max(1, height))) / 2);
      return clamp((progress * 1.35 - diagonalPosition) / 0.35);
    };

    const drawRain = (time: number, dt: number, elapsed: number) => {
      if (elapsed < BLACKOUT_END) return;
      const ignition = clamp((elapsed - BLACKOUT_END) / 1500);
      const idleDim = elapsed >= DARK_LOCK_END ? 0.54 : 1;

      context.save();
      context.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      rain.forEach((column) => {
        column.y += column.speed * dt;
        if (column.y - column.length * fontSize > height + 90) {
          column.y = -80 - Math.random() * height * 0.65;
          column.speed = 54 + Math.random() * 82;
          column.length = 10 + Math.floor(Math.random() * 22);
        }

        for (let index = 0; index < column.length; index += 1) {
          const y = column.y - index * fontSize * 1.05;
          if (y < -30 || y > height + 30) continue;
          const head = index === 0;
          const decay = 1 - index / column.length;
          const localRed = redSweepAt(column.x, y, elapsed);
          const red = Math.round(mix(48, 224, localRed));
          const green = Math.round(mix(255, 18, localRed));
          const blue = Math.round(mix(84, 42, localRed));
          const alpha = (head ? 0.88 : Math.max(0.035, decay * decay * 0.4)) * ignition * idleDim;
          const charIndex = (column.seed + index + Math.floor(time / 105)) % glyphs.length;
          context.fillStyle = head
            ? `rgba(${Math.min(255, red + 31)},${Math.min(255, green + 30)},${Math.min(255, blue + 25)},${alpha})`
            : `rgba(${red},${green},${blue},${alpha})`;
          context.shadowColor = `rgba(${red},${green},${blue},${head ? 0.75 : 0.18})`;
          context.shadowBlur = head ? 11 : 3;
          context.fillText(glyphs[charIndex], column.x, y);
        }
      });
      context.restore();
    };

    const drawLogoPaint = (elapsed: number) => {
      if (elapsed < RED_SWEEP_END) return;
      const darken = clamp((elapsed - FORMATION_END) / (DARK_LOCK_END - FORMATION_END));
      const red = Math.round(mix(255, 126, darken));
      const green = Math.round(mix(38, 0, darken));
      const blue = Math.round(mix(62, 20, darken));
      const cellSize = fontSize * 1.08;

      if (solidContext && solidLayer && logoMask) {
        solidContext.clearRect(0, 0, width, height);
        solidContext.globalCompositeOperation = "source-over";
        solidContext.fillStyle = `rgba(${red},${green},${blue},.98)`;
        logoCells.forEach((cell) => {
          if (elapsed < cell.paintAt + SOLIDIFY_DELAY) return;
          solidContext?.fillRect(
            cell.targetX - cellSize / 2,
            cell.targetY - cellSize / 2,
            cellSize,
            cellSize,
          );
        });
        solidContext.globalCompositeOperation = "destination-in";
        solidContext.drawImage(logoMask, 0, 0);
        solidContext.globalCompositeOperation = "source-over";
      }

      context.save();
      context.font = `800 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      logoCells.forEach((cell) => {
        const arrivalWindow = 720;
        if (elapsed < cell.paintAt - arrivalWindow || elapsed >= cell.paintAt + SOLIDIFY_DELAY) return;
        const arrival = clamp((elapsed - (cell.paintAt - arrivalWindow)) / arrivalWindow);
        const y = mix(cell.targetY - 130, cell.targetY, arrival);
        const landed = elapsed >= cell.paintAt;
        const alpha = landed ? 0.98 : 0.18 + arrival * 0.72;
        context.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
        context.shadowColor = `rgba(${Math.min(255, red + 45)},${green},${Math.min(255, blue + 25)},.82)`;
        context.shadowBlur = landed ? 7 : 4;
        context.fillText(cell.char, cell.targetX, y);
      });
      context.restore();

      if (solidLayer) {
        context.save();
        context.shadowColor = `rgba(${Math.min(255, red + 45)},${green},${Math.min(255, blue + 25)},.88)`;
        context.shadowBlur = 8 + darken * 4;
        context.drawImage(solidLayer, 0, 0);
        context.restore();
      }
    };

    const drawDarkLock = (elapsed: number) => {
      if (elapsed < FORMATION_END) return;
      const progress = clamp((elapsed - FORMATION_END) / (DARK_LOCK_END - FORMATION_END));
      const wash = context.createRadialGradient(width / 2, logoY, Math.max(20, logoWidth * 0.1), width / 2, logoY, Math.max(width, height) * 0.82);
      wash.addColorStop(0, `rgba(92,0,15,${progress * 0.17})`);
      wash.addColorStop(0.45, `rgba(54,0,10,${progress * 0.09})`);
      wash.addColorStop(1, "rgba(24,0,7,0)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);
    };

    const drawVignette = () => {
      const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.15, width / 2, height / 2, Math.max(width, height) * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,.79)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    const render = (time: number) => {
      const frameInterval = reducedMotion ? 1000 / 12 : 1000 / 30;
      if (time - lastFrame < frameInterval) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;
      lastFrame = time;
      const elapsed = reducedMotion || skipRef.current ? SEQUENCE_SETTLED : time - sequenceStartRef.current;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      if (elapsed < BLACKOUT_END) setPhase("BLACKOUT");
      else if (elapsed < GREEN_END) setPhase("GREEN MATRIX RAIN");
      else if (elapsed < RED_SWEEP_END) setPhase("DIAGONAL RED SWEEP");
      else if (elapsed < FORMATION_END) setPhase("NULLWORKS PAINT + MASK FILL");
      else if (elapsed < DARK_LOCK_END) setPhase("BLOOD RED LOCK");
      else setPhase("TWO-DROP BLEED");

      drawRain(time, dt, elapsed);
      drawLogoPaint(elapsed);
      drawDarkLock(elapsed);
      drawVignette();

      if (elapsed >= DARK_LOCK_END && !completionSent) {
        completionSent = true;
        setSettled(true);
      }
      animationFrame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [runId]);

  useEffect(() => {
    const canvas = foregroundRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drops: ForegroundDrop[] = [
      { xRatio: 0.28, startDelay: 0, speed: 48, radius: 8.5 },
      { xRatio: 0.72, startDelay: 1000, speed: 56, radius: 7.5 },
    ];
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastFrame = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawDrop = (x: number, y: number, radius: number) => {
      const gradient = context.createRadialGradient(x - radius * 0.28, y - radius * 0.32, 1, x, y, radius * 1.55);
      gradient.addColorStop(0, "rgba(255,112,124,.98)");
      gradient.addColorStop(0.3, "rgba(190,5,31,.98)");
      gradient.addColorStop(1, "rgba(63,0,11,.98)");
      context.save();
      context.fillStyle = gradient;
      context.shadowColor = "rgba(255,14,42,.88)";
      context.shadowBlur = 14;
      context.beginPath();
      context.moveTo(x, y - radius * 1.7);
      context.bezierCurveTo(x + radius * 0.92, y - radius * 0.44, x + radius, y + radius * 0.68, x, y + radius * 1.18);
      context.bezierCurveTo(x - radius, y + radius * 0.68, x - radius * 0.92, y - radius * 0.44, x, y - radius * 1.7);
      context.closePath();
      context.fill();
      context.strokeStyle = "rgba(255,209,214,.52)";
      context.lineWidth = 1;
      context.shadowBlur = 0;
      context.beginPath();
      context.moveTo(x - radius * 0.28, y - radius * 0.72);
      context.quadraticCurveTo(x - radius * 0.5, y - radius * 0.08, x - radius * 0.22, y + radius * 0.27);
      context.stroke();
      context.restore();
    };

    const render = (time: number) => {
      const frameInterval = reducedMotion ? 1000 / 12 : 1000 / 30;
      if (time - lastFrame < frameInterval) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      lastFrame = time;
      context.clearRect(0, 0, width, height);
      const elapsed = reducedMotion || skipRef.current ? SEQUENCE_SETTLED : time - sequenceStartRef.current;
      const dropElapsed = elapsed - FIRST_DROP_START;
      if (dropElapsed >= 0) {
        drops.forEach((drop) => {
          const localSeconds = (dropElapsed - drop.startDelay) / 1000;
          if (localSeconds < 0) return;
          const y = -30 + drop.speed * localSeconds;
          if (y <= height + 40) drawDrop(width * drop.xRatio, y, drop.radius);
        });
      }
      animationFrame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, [runId]);

  return (
    <main className={`corruption-page ${settled ? "is-settled" : "is-running"}`}>
      <canvas ref={backgroundRef} className="background-canvas" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <canvas ref={foregroundRef} className="foreground-canvas" aria-hidden="true" />

      <nav className="sequence-nav">
        <a href="/">NULLWORKS <span>CORRUPTION SEQUENCE</span></a>
        <div>
          <b>{phaseLabel}</b>
          {settled ? <button type="button" onClick={replay}>Replay sequence</button> : <button type="button" onClick={skip}>Skip intro</button>}
        </div>
      </nav>

      <section className="settled-content" aria-hidden={!settled}>
        <div className="content-card">
          <div className="eyebrow">LIVING SIGNAL 11 // CINEMATIC IDENTITY FORMATION</div>
          <h1>Rain paints the identity.<span>The identity darkens into blood.</span></h1>
          <p>Twenty-plus green streams establish the machine field. A diagonal red wave climbs from the bottom-left to the top-right, then same-size falling glyphs paint NULLWORKS. Each landed glyph becomes a solid red fragment clipped precisely to the actual letter contours while two slow foreground drops cross during formation.</p>
          <div className="actions">
            <button type="button" onClick={replay}>Replay from black</button>
            <a href="/living-signals">Open signal library</a>
          </div>
          <small>SIMULATED CINEMATIC ATMOSPHERE // NO LIVE DATA // MOBILE 30-FPS CAP</small>
        </div>
      </section>

      <style>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #000; }
        .corruption-page { min-height: 100svh; position: relative; overflow: hidden; color: #fff; background: #000; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .background-canvas { position: fixed; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; }
        .scanlines { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: .62; background: repeating-linear-gradient(to bottom, rgba(255,255,255,.018) 0, rgba(255,255,255,.018) 1px, transparent 1px, transparent 4px); box-shadow: inset 0 0 180px rgba(0,0,0,.84); }
        .foreground-canvas { position: fixed; inset: 0; width: 100%; height: 100%; display: block; z-index: 25; pointer-events: none; }
        .sequence-nav { position: fixed; z-index: 30; top: 0; left: 0; right: 0; min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px clamp(14px, 4vw, 42px); border-bottom: 1px solid rgba(255,255,255,.09); background: rgba(0,0,0,.28); backdrop-filter: blur(12px); }
        .sequence-nav > a { color: #fff; text-decoration: none; font-size: 12px; font-weight: 950; letter-spacing: .13em; }
        .sequence-nav > a span { color: #ff3048; }
        .sequence-nav > div { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
        .sequence-nav b { color: rgba(255,255,255,.62); font: 850 10px ui-monospace, monospace; letter-spacing: .1em; text-align: right; }
        .sequence-nav button, .actions button, .actions a { border: 1px solid rgba(255,48,72,.4); border-radius: 999px; padding: 9px 12px; color: #ff6c7f; background: rgba(0,0,0,.58); font: 850 11px inherit; text-decoration: none; cursor: pointer; }
        .settled-content { position: relative; z-index: 10; min-height: 100svh; display: flex; align-items: flex-end; justify-content: center; padding: 90px 16px 24px; opacity: 0; transform: translateY(18px); pointer-events: none; transition: opacity 1.1s ease, transform 1.1s ease; }
        .is-settled .settled-content { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .content-card { width: min(880px, 100%); border: 1px solid rgba(255,48,72,.28); border-radius: 28px; padding: clamp(22px, 4vw, 38px); background: linear-gradient(145deg, rgba(32,0,7,.74), rgba(0,0,0,.82)); box-shadow: 0 30px 110px rgba(0,0,0,.55); backdrop-filter: blur(14px); }
        .eyebrow { color: #ff4058; font: 900 11px ui-monospace, monospace; letter-spacing: .15em; }
        h1 { margin: 14px 0 0; max-width: 780px; font-size: clamp(38px, 7.5vw, 78px); line-height: .9; letter-spacing: -.058em; }
        h1 span { display: block; color: transparent; -webkit-text-stroke: 1px rgba(255,70,92,.68); }
        p { max-width: 760px; color: #cbbdc0; font-size: 17px; line-height: 1.62; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .actions button { border: 0; color: #080002; background: #ff3048; font-weight: 950; }
        .actions a { display: inline-flex; align-items: center; }
        small { display: block; margin-top: 20px; color: #806d72; font: 800 10px/1.5 ui-monospace, monospace; letter-spacing: .1em; }
        @media (max-width: 640px) { .sequence-nav { align-items: flex-start; } .sequence-nav > a { max-width: 145px; line-height: 1.35; } .sequence-nav > div { flex-direction: column; align-items: flex-end; gap: 6px; } .sequence-nav b { max-width: 132px; } .settled-content { padding-left: 12px; padding-right: 12px; } .content-card { border-radius: 23px; } }
        @media (prefers-reduced-motion: reduce) { .settled-content { transition: none; } }
      `}</style>
    </main>
  );
}
