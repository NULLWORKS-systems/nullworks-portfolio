"use client";

import { useRef, useState } from "react";

export type ListeningTrack = {
  n: number;
  title: string;
  id?: string;
  src?: string;
  dur?: string;
  note?: string;
  artSrc?: string;
};

export default function ListeningPage({
  title,
  eyebrow,
  description,
  accent,
  background,
  tracks,
  footer,
  coverSrc,
  coverKind,
}: {
  title: string;
  eyebrow: string;
  description: string;
  accent: string;
  background: string;
  tracks: ListeningTrack[];
  footer?: string;
  coverSrc?: string;
  coverKind?: "square" | "poster";
}) {
  const [active, setActive] = useState<number | null>(null);
  const [albumMode, setAlbumMode] = useState(false);
  const refs = useRef<Record<number, HTMLAudioElement | null>>({});
  const poster = coverKind === "poster";

  const play = (i: number) => {
    Object.entries(refs.current).forEach(([k, a]) => {
      if (Number(k) !== i && a) a.pause();
    });
    setActive(i);
  };

  const playAll = async () => {
    setAlbumMode(true);
    const a = refs.current[0];
    if (a) {
      a.currentTime = 0;
      await a.play();
      setActive(0);
    }
  };

  const ended = (i: number) => {
    if (albumMode && i < tracks.length - 1) {
      const a = refs.current[i + 1];
      if (a) {
        a.currentTime = 0;
        a.play();
        setActive(i + 1);
      }
    } else if (i === tracks.length - 1) {
      setAlbumMode(false);
      setActive(null);
    }
  };

  return (
    <section
      style={{
        minHeight: "100vh",
        background,
        color: "#f4f1e9",
        padding: "22px 14px 72px",
        fontFamily: "Arial,Helvetica,sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ padding: "26px 6px 24px", borderBottom: "1px solid #ffffff18" }}>
          {coverSrc && (
            <img
              src={coverSrc}
              alt={`${title} ${poster ? "poster" : "album cover"}`}
              style={{
                display: "block",
                width: poster ? "min(100%,520px)" : "min(100%,560px)",
                height: "auto",
                aspectRatio: poster ? undefined : "1",
                objectFit: poster ? "contain" : "cover",
                margin: "0 auto 28px",
                borderRadius: poster ? 8 : 22,
                border: "1px solid #ffffff22",
                boxShadow: "0 24px 60px #0008",
              }}
            />
          )}
          <div style={{ fontSize: 11, letterSpacing: 3, fontWeight: 900, color: accent }}>{eyebrow}</div>
          <h1 style={{ fontSize: "clamp(42px,11vw,78px)", lineHeight: 0.92, margin: "10px 0 12px", letterSpacing: -2 }}>
            {title}
          </h1>
          <p style={{ margin: 0, maxWidth: 650, color: "#c7c2b9", lineHeight: 1.6, fontSize: 16 }}>{description}</p>
          <button
            onClick={playAll}
            style={{
              marginTop: 20,
              width: "100%",
              maxWidth: 360,
              padding: "15px 20px",
              borderRadius: 14,
              border: `1px solid ${accent}`,
              background: accent,
              color: "#111",
              fontWeight: 950,
              fontSize: 14,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            ▶ {albumMode ? "PLAYING ALBUM IN ORDER" : "PLAY ALL IN ORDER"}
          </button>
        </header>
        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {tracks.map((t, i) => (
            <article
              key={t.src ?? t.id ?? t.title}
              style={{
                background: active === i ? "#ffffff10" : "#ffffff08",
                border: `1px solid ${active === i ? accent + "88" : "#ffffff14"}`,
                borderRadius: 18,
                padding: 12,
              }}
            >
              {t.artSrc && (
                <img
                  src={t.artSrc}
                  alt={`${t.title} art`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    borderRadius: 12,
                    marginBottom: 12,
                    border: "1px solid #ffffff18",
                    objectFit: "cover",
                    maxHeight: 280,
                  }}
                />
              )}
              <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 13 }}>
                <div
                  aria-hidden
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: `linear-gradient(145deg,${accent}33,#0008)`,
                    border: `1px solid ${accent}66`,
                    color: accent,
                    fontWeight: 950,
                    fontSize: 24,
                  }}
                >
                  {String(t.n).padStart(2, "0")}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.title}
                    </div>
                    <span style={{ fontSize: 11, color: "#8f8a83", flex: "0 0 auto" }}>{t.dur}</span>
                  </div>
                  {t.note && (
                    <div style={{ fontSize: 12, lineHeight: 1.4, color: "#aaa59c", marginTop: 5 }}>{t.note}</div>
                  )}
                  <audio
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    onPlay={() => play(i)}
                    onEnded={() => ended(i)}
                    controls
                    preload="metadata"
                    src={t.src ?? `/api/audio/${t.id}`}
                    style={{ width: "100%", height: 38, marginTop: 9 }}
                  />
                  {t.src && (
                    <a
                      href={t.src}
                      download
                      style={{
                        display: "inline-block",
                        marginTop: 8,
                        color: accent,
                        fontWeight: 800,
                        fontSize: 11,
                        letterSpacing: 1,
                        textDecoration: "none",
                      }}
                    >
                      DOWNLOAD MP3
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {footer && (
          <footer style={{ padding: "32px 6px 6px", fontSize: 11, letterSpacing: 1.6, color: "#77716a", lineHeight: 1.7 }}>
            {footer}
          </footer>
        )}
      </div>
    </section>
  );
}
