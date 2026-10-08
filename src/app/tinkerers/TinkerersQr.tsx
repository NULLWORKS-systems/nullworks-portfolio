"use client";

import { QRCodeSVG } from "qrcode.react";

export default function TinkerersQr({
  url,
  label = "SCAN TO RUN",
  caption = "Same code as the card.",
}: {
  url: string;
  label?: string;
  caption?: string;
}) {
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
      <QRCodeSVG value={url} size={180} bgColor="#eef2ef" fgColor="#06110f" level="M" />
      <div style={{ fontSize: 12, letterSpacing: "0.12em", fontWeight: 800, textAlign: "center" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, textAlign: "center", maxWidth: 200 }}>{caption}</div>
    </div>
  );
}
