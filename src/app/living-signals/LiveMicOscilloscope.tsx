"use client";

import { useEffect, useRef, useState } from "react";

type MicStatus =
  | "idle"
  | "requesting"
  | "live"
  | "stopped"
  | "denied"
  | "unsupported"
  | "error";

type WebkitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const statusCopy: Record<MicStatus, string> = {
  idle: "SIMULATED FALLBACK",
  requesting: "REQUESTING ACCESS",
  live: "MIC LIVE",
  stopped: "MIC STOPPED",
  denied: "PERMISSION DENIED",
  unsupported: "MIC UNSUPPORTED",
  error: "MIC ERROR",
};

export default function LiveMicOscilloscope() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const statusRef = useRef<MicStatus>("idle");
  const sensitivityRef = useRef(1.35);

  const [status, setStatus] = useState<MicStatus>("idle");
  const [sensitivity, setSensitivity] = useState(1.35);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState(
    "Tap Activate Microphone to replace the simulated trace with live sound.",
  );

  const setMicStatus = (next: MicStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const releaseMicrophone = async (nextStatus: MicStatus = "stopped") => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    try {
      sourceRef.current?.disconnect();
    } catch {
      // Source may already be disconnected.
    }
    sourceRef.current = null;
    analyserRef.current = null;
    dataRef.current = null;

    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      try {
        await context.close();
      } catch {
        // Some mobile browsers close the context automatically with the track.
      }
    }

    setLevel(0);
    setMicStatus(nextStatus);
    if (nextStatus === "stopped") {
      setMessage("Microphone released. The page has returned to its simulated fallback trace.");
    }
  };

  const activateMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicStatus("unsupported");
      setMessage("This browser does not expose microphone access to the page.");
      return;
    }

    setMicStatus("requesting");
    setMessage("Waiting for browser microphone permission…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });

      const AudioContextConstructor =
        window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;

      if (!AudioContextConstructor) {
        stream.getTracks().forEach((track) => track.stop());
        setMicStatus("unsupported");
        setMessage("This browser granted the microphone but does not support Web Audio.");
        return;
      }

      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.08;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = new Uint8Array(analyser.fftSize);

      setMicStatus("live");
      setMessage("Local microphone samples are driving the waveform. Nothing is being recorded or uploaded.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "UnknownError";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMicStatus("denied");
        setMessage("Microphone permission was denied. The simulated fallback remains active.");
      } else {
        setMicStatus("error");
        setMessage("The microphone could not start. The simulated fallback remains active.");
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastFrame = 0;
    let lastLevelUpdate = 0;
    let hidden = document.hidden;

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

    const drawGrid = () => {
      context.save();
      context.strokeStyle = "rgba(102,247,255,.035)";
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x <= width; x += 32) {
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += 32) {
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
      }
      context.stroke();

      context.strokeStyle = "rgba(102,247,255,.075)";
      context.beginPath();
      for (let x = 0; x <= width; x += 160) {
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += 160) {
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
      }
      context.stroke();
      context.restore();
    };

    const drawSweep = (time: number, intensity: number) => {
      const span = width + 340;
      const x = ((time * 0.085) % span) - 170;
      const gradient = context.createLinearGradient(x - 230, 0, x + 18, 0);
      gradient.addColorStop(0, "rgba(102,247,255,0)");
      gradient.addColorStop(0.88, `rgba(102,247,255,${0.035 + intensity * 0.09})`);
      gradient.addColorStop(1, `rgba(102,247,255,${0.18 + intensity * 0.32})`);
      context.fillStyle = gradient;
      context.fillRect(x - 230, 0, 248, height);
      context.strokeStyle = `rgba(194,252,255,${0.24 + intensity * 0.5})`;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    };

    const fallbackSample = (index: number, count: number, time: number) => {
      const phase = index / Math.max(1, count - 1);
      const slow = Math.sin(phase * Math.PI * 5 + time * 0.0017) * 0.18;
      const carrier = Math.sin(phase * Math.PI * 18 + time * 0.0034) * 0.045;
      const pulse = Math.exp(-Math.pow(((phase + (time * 0.00008) % 1) % 1 - 0.5) * 11, 2)) * 0.25;
      return slow + carrier + pulse;
    };

    const render = (time: number) => {
      const frameInterval = reducedMotion ? 1000 / 12 : 1000 / 30;
      if (time - lastFrame < frameInterval) {
        animationFrame = requestAnimationFrame(render);
        return;
      }
      lastFrame = time;

      if (hidden) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      context.clearRect(0, 0, width, height);
      drawGrid();

      const analyser = analyserRef.current;
      const data = dataRef.current;
      const live = statusRef.current === "live" && analyser && data;
      let rms = 0;

      if (live) {
        const samples = new Uint8Array(data.length);
        analyser.getByteTimeDomainData(samples);
        data.set(samples);
        let sumSquares = 0;
        for (let index = 0; index < data.length; index += 1) {
          const normalized = (data[index] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        rms = Math.min(1, Math.sqrt(sumSquares / data.length) * sensitivityRef.current * 4.2);
      } else {
        rms = 0.12;
      }

      drawSweep(time, rms);

      const centerY = height * 0.51;
      const amplitude = Math.min(height * 0.34, Math.max(58, height * 0.19));
      const sampleCount = live && data ? data.length : Math.max(420, Math.floor(width * 1.4));
      const sensitivityValue = sensitivityRef.current;

      const drawTrace = (lineWidth: number, alpha: number, blur: number) => {
        context.save();
        context.lineWidth = lineWidth;
        context.strokeStyle = `rgba(102,247,255,${alpha})`;
        context.shadowColor = "rgba(102,247,255,.9)";
        context.shadowBlur = blur;
        context.beginPath();

        for (let index = 0; index < sampleCount; index += 1) {
          const x = (index / Math.max(1, sampleCount - 1)) * width;
          const raw =
            live && data
              ? ((data[index] - 128) / 128) * sensitivityValue
              : fallbackSample(index, sampleCount, time);
          const y = centerY + Math.max(-1.3, Math.min(1.3, raw)) * amplitude;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.stroke();
        context.restore();
      };

      drawTrace(5.5, 0.055 + rms * 0.16, 22 + rms * 24);
      drawTrace(1.35, 0.72 + rms * 0.25, 8 + rms * 12);

      context.save();
      context.strokeStyle = "rgba(102,247,255,.12)";
      context.beginPath();
      context.moveTo(0, centerY);
      context.lineTo(width, centerY);
      context.stroke();
      context.restore();

      if (time - lastLevelUpdate > 120) {
        lastLevelUpdate = time;
        setLevel(rms);
      }

      animationFrame = requestAnimationFrame(render);
    };

    const handleVisibility = async () => {
      hidden = document.hidden;
      const audioContext = audioContextRef.current;
      if (!audioContext || statusRef.current !== "live") return;
      try {
        if (hidden && audioContext.state === "running") await audioContext.suspend();
        if (!hidden && audioContext.state === "suspended") await audioContext.resume();
      } catch {
        // Mobile browsers may require another user gesture after a background suspension.
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    animationFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sourceRef.current?.disconnect();
      void audioContextRef.current?.close();
    };
  }, []);

  const live = status === "live";
  const requesting = status === "requesting";

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          pointerEvents: "none",
          opacity: 0.98,
          mixBlendMode: "screen",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(to bottom, rgba(102,247,255,.018) 0, rgba(102,247,255,.018) 1px, transparent 1px, transparent 4px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 190px rgba(0,0,0,.94)",
          }}
        />
      </div>

      <aside className={`mic-panel ${live ? "is-live" : ""}`}>
        <div className="mic-status-row">
          <span className={`mic-dot ${live ? "is-live" : ""}`} />
          <b>{statusCopy[status]}</b>
          <span className="mic-level-number">{Math.round(level * 100)}%</span>
        </div>

        <div className="mic-meter" aria-label="Live microphone level">
          <span style={{ width: `${Math.max(2, Math.min(100, level * 100))}%` }} />
        </div>

        <p>{message}</p>

        <label className="sensitivity-control">
          <span>SENSITIVITY</span>
          <strong>{sensitivity.toFixed(2)}×</strong>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={sensitivity}
            onChange={(event) => setSensitivity(Number(event.target.value))}
          />
        </label>

        <div className="mic-actions">
          <button type="button" onClick={activateMicrophone} disabled={requesting || live}>
            {requesting ? "Requesting…" : live ? "Microphone Active" : "Activate Microphone"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => void releaseMicrophone()}
            disabled={!live && status !== "requesting"}
          >
            Stop Microphone
          </button>
        </div>

        <small>
          LOCAL-ONLY AUDIO ANALYSIS // NO RECORDING // NO TRANSCRIPTION // NO UPLOAD
        </small>
      </aside>
    </>
  );
}
