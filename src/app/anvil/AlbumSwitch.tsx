"use client";

import Link from "next/link";
import type { AnvilAlbum } from "./catalog";

export default function AlbumSwitch({ albums, current }: { albums: AnvilAlbum[]; current: string }) {
  if (albums.length < 2) return null;
  return (
    <nav
      aria-label="Albums"
      style={{
        width: "min(760px, calc(100% - 28px))",
        margin: "18px auto 0",
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 8,
      }}
    >
      {albums.map((album) => {
        const active = album.slug === current;
        return (
          <Link
            key={album.slug}
            href={`/anvil/${album.slug}`}
            style={{
              display: "block",
              padding: "12px 14px",
              borderRadius: 14,
              textDecoration: "none",
              border: `1px solid ${active ? "#c4b48a" : "#302e29"}`,
              background: active ? "#c4b48a14" : "#0a0a09",
              color: active ? "#eee9df" : "#9f9a91",
            }}
          >
            <b style={{ display: "block", font: "900 10px ui-monospace,monospace", letterSpacing: ".12em", color: active ? "#c4b48a" : "#77736b" }}>
              {active ? "NOW PLAYING" : "ALBUM"}
            </b>
            <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>{album.title}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 12, lineHeight: 1.4 }}>{album.note}</span>
          </Link>
        );
      })}
    </nav>
  );
}
