"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TinkerersQr({ url }: { url: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 20,
        background: "#eef2ef",
        color: "#06110f",
      }}
    >
      <QRCodeSVG value={url} size={168} bgColor="#eef2ef" fgColor="#06110f" level="M" />
      <div style={{ fontSize: 12, letterSpacing: "0.14em", fontWeight: 800 }}>SCAN TO RUN</div>
    </div>
  );
}
