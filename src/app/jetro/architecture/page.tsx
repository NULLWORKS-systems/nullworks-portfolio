import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NULLWORKS architecture — full size",
  description: "NULLWORKS architecture: a layer above AI. Plug in any AI. Execute in the real world.",
  alternates: { canonical: "https://nullworks.systems/jetro/architecture" },
};

const IMG = "https://nullworks-jetro.vercel.app/nullworks-architecture.jpg";

export default function JetroArchitecturePage() {
  return (
    <main
      style={{
        margin: 0,
        minHeight: "100dvh",
        background: "#05070a",
        color: "#edf4f6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "max(10px, env(safe-area-inset-top)) 14px 10px",
          background: "rgba(5,7,10,.94)",
          borderBottom: "1px solid #293236",
        }}
      >
        <Link href="/jetro" style={{ color: "#eaf6ff", textDecoration: "none", fontWeight: 800, fontSize: 13 }}>
          ← Back to JETRO MVP
        </Link>
        <span style={{ color: "#9aa8ae", fontSize: 11, letterSpacing: ".04em" }}>Pinch, pan, or scroll to read</span>
      </div>
      <div
        style={{
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x pan-y pinch-zoom",
          height: "calc(100dvh - 52px)",
          padding: "10px 10px 28px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG}
          alt="NULLWORKS architecture: a layer above AI. Plug in any AI. Execute in the real world."
          style={{ display: "block", width: 1200, maxWidth: "100%", height: "auto", margin: "0 auto" }}
        />
      </div>
    </main>
  );
}
