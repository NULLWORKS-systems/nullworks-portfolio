import type { Metadata } from "next";
import InfinitePinwheel from "../InfinitePinwheel";
import { infinitePinwheelSignal as signal } from "../infinitePinwheelSignal";

export const metadata: Metadata = {
  title: `${signal.name} | NULLWORKS Living Signal Framework`,
  description: signal.summary,
};

export default function InfinitePinwheelPage() {
  return (
    <main className="pinwheel-page">
      <style>{`
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #030305; }
        .pinwheel-page {
          min-height: 100vh;
          position: relative;
          isolation: isolate;
          overflow-x: hidden;
          color: #fff;
          background: transparent;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .pinwheel-canvas {
          position: fixed;
          z-index: -3;
          inset: 0;
          width: 100vw;
          height: 100svh;
          display: block;
          image-rendering: auto;
        }
        .pinwheel-page::before {
          content: "";
          position: fixed;
          z-index: -2;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at center, transparent 0 8%, rgba(0,0,0,.03) 32%, rgba(0,0,0,.38) 100%),
            linear-gradient(rgba(2,2,5,.05), rgba(2,2,5,.19));
        }
        .pinwheel-page::after {
          content: "";
          position: fixed;
          z-index: -1;
          inset: 0;
          pointer-events: none;
          opacity: .18;
          background-image:
            linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: linear-gradient(to bottom, #000, transparent 78%);
        }
        .stage {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          display: grid;
          align-items: end;
          border-bottom: 1px solid rgba(255,255,255,.12);
        }
        .nav {
          position: absolute;
          z-index: 4;
          top: 0;
          left: 0;
          right: 0;
          padding: 18px clamp(16px, 3vw, 34px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          background: linear-gradient(to bottom, rgba(2,2,5,.54), transparent);
        }
        .brand, .back {
          color: rgba(255,255,255,.9);
          text-decoration: none;
          font: 900 11px ui-monospace, monospace;
          letter-spacing: .13em;
          text-transform: uppercase;
          text-shadow: 0 2px 16px #000;
        }
        .back {
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 999px;
          padding: 9px 12px;
          background: rgba(0,0,0,.25);
          backdrop-filter: blur(12px);
        }
        .caption {
          position: relative;
          z-index: 3;
          width: min(760px, calc(100% - 36px));
          margin: 0 0 clamp(22px, 5vw, 56px) clamp(18px, 4vw, 52px);
          padding-top: 120px;
          text-shadow: 0 3px 24px #000;
        }
        .eyebrow {
          font: 900 10px ui-monospace, monospace;
          letter-spacing: .16em;
          text-transform: uppercase;
          opacity: .8;
        }
        h1 {
          margin: 10px 0 0;
          font-size: clamp(44px, 8vw, 96px);
          line-height: .82;
          letter-spacing: -.065em;
        }
        h1 span {
          display: block;
          color: transparent;
          -webkit-text-stroke: 1px rgba(255,255,255,.75);
        }
        .caption p {
          max-width: 600px;
          margin: 17px 0 0;
          font-size: clamp(14px, 1.7vw, 18px);
          line-height: 1.55;
          color: rgba(255,255,255,.86);
        }
        .truth {
          margin-top: 12px;
          font: 800 9px/1.5 ui-monospace, monospace;
          letter-spacing: .08em;
          color: rgba(255,255,255,.68);
        }
        .details {
          position: relative;
          z-index: 2;
          padding: 88px 0 100px;
          border-bottom: 1px solid rgba(255,255,255,.12);
          background: linear-gradient(to bottom, rgba(3,3,7,.58), rgba(3,3,7,.36));
          backdrop-filter: blur(2px);
        }
        .shell { width: min(1100px, calc(100% - 32px)); margin: 0 auto; }
        .details h2 {
          margin: 0;
          max-width: 900px;
          font-size: clamp(38px, 6vw, 72px);
          line-height: .94;
          letter-spacing: -.055em;
          text-shadow: 0 3px 28px rgba(0,0,0,.9);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 34px;
        }
        .card {
          min-height: 210px;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 22px;
          padding: 20px;
          background: rgba(2,3,8,.58);
          backdrop-filter: blur(13px);
          box-shadow: 0 22px 70px rgba(0,0,0,.18);
        }
        .card b {
          font: 900 10px ui-monospace, monospace;
          letter-spacing: .13em;
          opacity: .7;
        }
        .card p {
          margin: 28px 0 0;
          color: rgba(255,255,255,.86);
          line-height: 1.6;
          text-shadow: 0 2px 14px rgba(0,0,0,.72);
        }
        @media (max-width: 680px) {
          .caption { margin-left: 18px; width: calc(100% - 36px); }
          .caption p { max-width: 430px; }
          .grid { grid-template-columns: 1fr; }
          .details { padding: 66px 0 78px; background: rgba(3,3,7,.42); }
          .card { background: rgba(2,3,8,.54); }
        }
        @media (prefers-reduced-motion: reduce) {
          .truth::after { content: " // REDUCED MOTION: STATIC FRAME"; }
        }
      `}</style>

      <InfinitePinwheel />

      <section className="stage">
        <nav className="nav">
          <a className="brand" href="/">NULLWORKS // LIVING SIGNALS</a>
          <a className="back" href="/living-signals">All samples</a>
        </nav>
        <div className="caption">
          <div className="eyebrow">{signal.eyebrow}</div>
          <h1>{signal.headline}<span>{signal.outlinedHeadline}</span></h1>
          <p>{signal.summary}</p>
          <div className="truth">GENERATIVE CANVAS // NO VIDEO // NO SENSOR INPUT</div>
        </div>
      </section>

      <section className="details">
        <div className="shell">
          <h2>One giant gesture. Slow enough to stare at. Deep enough to lose the center.</h2>
          <div className="grid">
            {signal.communicates.map((item, index) => (
              <article className="card" key={item}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
