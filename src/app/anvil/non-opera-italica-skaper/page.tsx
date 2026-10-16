import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";
import AlbumSwitch from "../AlbumSwitch";
import { getArtistAlbums } from "../catalog";

const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-skaper";

const tracks = [
  { n: 1, title: "CONFLICT", src: `${base}/01-conflict.mp3`, dur: "—" },
  { n: 2, title: "DISCOVERY", src: `${base}/02-discovery.mp3`, dur: "—" },
  { n: 3, title: "CHALLENGE", src: `${base}/03-challenge.mp3`, dur: "—" },
  { n: 4, title: "ADAPTATION", src: `${base}/04-adaptation.mp3`, dur: "—" },
  { n: 5, title: "MUTUAL RESPECT", src: `${base}/05-mutual-respect.mp3`, dur: "—" },
  { n: 6, title: "FREEDOM", src: `${base}/06-freedom.mp3`, dur: "—" },
  { n: 7, title: "THE ORCHESTRA SPEAKS", src: `${base}/07-the-orchestra-speaks.mp3`, dur: "—" },
  { n: 8, title: "SKA-PERA VIII", src: `${base}/08-skaper-viii.mp3`, dur: "—" },
  { n: 9, title: "SKA-PERA IX", src: `${base}/09-skaper-ix.mp3`, dur: "—" },
  { n: 10, title: "SKA-PERA X", src: `${base}/10-skaper-x.mp3`, dur: "—" },
  { n: 11, title: "SKA-PERA XI", src: `${base}/11-skaper-xi.mp3`, dur: "—" },
  { n: 12, title: "SKA-PERA XII", src: `${base}/12-skaper-xii.mp3`, dur: "—" },
  { n: 13, title: "SKA-PERA XIII", src: `${base}/13-skaper-xiii.mp3`, dur: "—" },
  { n: 14, title: "SKA-PERA XIV", src: `${base}/14-skaper-xiv.mp3`, dur: "—" },
  { n: 15, title: "SKA-PERA XV", src: `${base}/15-skaper-xv.mp3`, dur: "—" },
];

export const metadata: Metadata = {
  title: "SKA-PERA | NON OPERA ITALICA // ANVIL",
  description: "One orchestra. Two worlds. Fifteen songs. Same orchestra, different paths, a shared destiny.",
  alternates: { canonical: "/anvil/non-opera-italica-skaper" },
  openGraph: {
    title: "SKA-PERA",
    description: "One orchestra. Two worlds. Fifteen songs. Chaos and depth under one roof.",
    url: "https://nullworks.systems/anvil/non-opera-italica-skaper",
    siteName: "NULLWORKS // ANVIL",
    type: "music.album",
    images: [{ url: `${base}/poster.png`, width: 800, height: 1200, alt: "SKA-PERA album poster" }]
  },
  twitter: { card: "summary_large_image", title: "SKA-PERA", description: "NON OPERA ITALICA. One orchestra. Two worlds. Fifteen songs.", images: [`${base}/poster.png`] }
};

export default function Page() {
  return (
    <AnvilShell accent="#c9a227">
      <AlbumSwitch albums={getArtistAlbums("non-opera-italica")} current="non-opera-italica-skaper" />
      <ListeningPage
        title="SKA-PERA"
        eyebrow="CARNIFICINA // NON OPERA ITALICA"
        description="One orchestra. Two worlds. Fifteen songs. Same orchestra, different paths, a shared destiny. Chaos, rhythm, joy, freedom on one side. Depth, gravity, beauty, choice on the other. Music belongs to none of us and carries us all."
        accent="#c9a227"
        background="linear-gradient(180deg,#0a0705,#080605 52%,#030303)"
        coverSrc={`${base}/poster.png`}
        coverKind="poster"
        tracks={tracks}
        footer="SKA-PERA. MUSIC BELONGS TO NONE OF US AND CARRIES US ALL. // NULLWORKS // ANVIL"
      />
    </AnvilShell>
  );
}
