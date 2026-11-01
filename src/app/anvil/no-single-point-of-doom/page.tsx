import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";

const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-odyssea";

const tracks = [
  { n: 1, title: "NO SINGLE POINT OF DOOM", src: `${base}/nspd.mp3`, dur: "3:38", artSrc: `${base}/nspd.png`, note: "Evidence before claims. No single point of failure." },
];

export const metadata: Metadata = {
  title: "NO SINGLE POINT OF DOOM | NULLWORKS // ANVIL",
  description: "Goofy wrap. Evidence before claims. No single point of doom. NULLWORKS // ANVIL.",
  alternates: { canonical: "/anvil/no-single-point-of-doom" },
  openGraph: {
    title: "NO SINGLE POINT OF DOOM",
    description: "Evidence before claims. No single point of failure.",
    url: "https://nullworks.systems/anvil/no-single-point-of-doom",
    siteName: "NULLWORKS // ANVIL",
    type: "music.song",
    images: [{ url: `${base}/nspd.png`, width: 800, height: 800, alt: "No Single Point Of Doom artwork" }]
  },
  twitter: { card: "summary_large_image", title: "NO SINGLE POINT OF DOOM", description: "Goofy wrap. Evidence before claims.", images: [`${base}/nspd.png`] }
};

export default function Page() {
  return (
    <AnvilShell accent="#f6b73c">
      <ListeningPage
        title="NO SINGLE POINT OF DOOM"
        eyebrow="NULLWORKS // GOOFY WRAP"
        description="Evidence before claims. No single point of doom. Everybody get up, make a little room. Test that box, check that claim. If it ain't reproducible, what's your name?"
        accent="#f6b73c"
        background="linear-gradient(180deg,#1a1208,#0c0804 50%,#050303)"
        coverSrc={`${base}/nspd.png`}
        coverKind="square"
        tracks={tracks}
        footer="NO SINGLE POINT OF DOOM. EVIDENCE BEFORE CLAIMS. // NULLWORKS // ANVIL"
      />
    </AnvilShell>
  );
}
