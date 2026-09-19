import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1000, height: 1500 };

export async function GET() {
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
          padding: "64px 56px 48px",
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
          <div style={{ fontSize: 86, lineHeight: 0.92, marginTop: 28, letterSpacing: "-0.03em" }}>
            Smart as Shit
          </div>
          <div style={{ fontSize: 34, marginTop: 14, color: "#d7e6f2" }}>
            Finding Data in Unexpected Places
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 36,
            lineHeight: 1.25,
            maxWidth: 880,
          }}
        >
          In spring the sewer was not counting tourists. It was counting the thaw.
          <div style={{ marginTop: 16, fontSize: 28, color: "#c5d3de" }}>In July it was counting people.</div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              background: "#0c1822",
              border: "1px solid #243542",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "#8aa0b3" }}>
              THE CONTROL
            </div>
            <div style={{ marginTop: 8, fontSize: 22, lineHeight: 1.3 }}>July influent stays nearly flat: 1.73–1.96 MGD.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              background: "#0c1822",
              border: "1px solid #243542",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "#8aa0b3" }}>
              THE WEATHER YEAR
            </div>
            <div style={{ marginTop: 8, fontSize: 22, lineHeight: 1.3 }}>March tracks winter water, not visitor counts.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              background: "#0c1822",
              border: "1px solid #243542",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "#8aa0b3" }}>
              THE SIGNAL
            </div>
            <div style={{ marginTop: 8, fontSize: 22, lineHeight: 1.3 }}>Oct–Mar precip vs March influent: r = 0.94.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              background: "#0c1822",
              border: "1px solid #243542",
              borderRadius: 16,
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 14, letterSpacing: "0.12em", color: "#8aa0b3" }}>
              THE RULE
            </div>
            <div style={{ marginTop: 8, fontSize: 22, lineHeight: 1.3 }}>A proxy only works after hydrology is separated.</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 18,
            color: "#8aa0b3",
          }}
        >
          <div>Mason Perry · nullworks.systems/smart-as-shit</div>
          <div>TAP TO OPEN PDF</div>
        </div>
      </div>
    ),
    size,
  );
}
