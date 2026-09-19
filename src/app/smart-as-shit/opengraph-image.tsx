import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Smart as Shit: Finding Data in Unexpected Places";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#071018",
          color: "#e8eef4",
          padding: "56px 64px",
          fontFamily: "Georgia, Times New Roman, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#8aa0b3",
            }}
          >
            NULLWORKS · WORKING PAPER · SEPTEMBER 2026
          </div>
          <div style={{ fontSize: 72, lineHeight: 0.95, marginTop: 28, letterSpacing: "-0.03em" }}>
            Smart as Shit
          </div>
          <div style={{ fontSize: 32, marginTop: 12, color: "#d7e6f2" }}>
            Finding Data in Unexpected Places
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, lineHeight: 1.3, maxWidth: 980 }}>
            In spring the sewer was not counting tourists. It was counting the thaw.
          </div>
          <div
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 20,
              color: "#8aa0b3",
            }}
          >
            Mason Perry · nullworks.systems/smart-as-shit
          </div>
        </div>
      </div>
    ),
    size,
  );
}
