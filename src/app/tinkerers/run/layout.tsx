import TinkerersQr from "../TinkerersQr";

const CARD_URL = "https://nullworks.systems/tinkerers/run";

export default function TinkerersRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        .nw-public-quicknav { display: none !important; }
        body { padding-bottom: 0 !important; }
      `}</style>
      <div
        style={{
          background: "#06110f",
          display: "flex",
          justifyContent: "center",
          padding: "18px 16px 0",
        }}
      >
        <TinkerersQr
          url={CARD_URL}
          label="SAME CODE AS THE CARD"
          caption="Neighbor scans this phone. Opens the run."
        />
      </div>
      {children}
    </>
  );
}
