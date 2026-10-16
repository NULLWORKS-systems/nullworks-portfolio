import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";
import AlbumSwitch from "../AlbumSwitch";
import { getArtistAlbums } from "../catalog";

const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-skaper";

const tracks = [
  { n: 1, title: "ПЛЯШИ, ПОКА ГОРИТ! (DANCE WHILE IT BURNS!)", src: `${base}/01-track01.mp3`, dur: "3:32" },
  { n: 2, title: "DIE STILLE HAT GEWICHT", src: `${base}/02-track02.mp3`, dur: "5:58" },
  { n: 3, title: "ЭЙ, ГОСПОЖА ТИШИНА!", src: `${base}/03-track03.mp3`, dur: "4:52" },
  { n: 4, title: "ICH BIN DIE TIEFE", src: `${base}/04-track04.mp3`, dur: "5:48" },
  { n: 5, title: "ДА КАК ВЫ СМЕЕТЕ?!", src: `${base}/05-track05.mp3`, dur: "4:19" },
  { n: 6, title: "DU HAST DIE STILLE GEHÖRT", src: `${base}/06-track06.mp3`, dur: "5:04" },
  { n: 7, title: "СУД НАД ТУБОЙ!", src: `${base}/07-track07.mp3`, dur: "4:01" },
  { n: 8, title: "DAS ORCHESTER GEHÖRT NIEMANDEM", src: `${base}/08-track08.mp3`, dur: "4:58" },
  { n: 9, title: "ТУБА ИДЁТ СО МНОЙ!", src: `${base}/09-track09.mp3`, dur: "4:42" },
  { n: 10, title: "AUCH STEIN KANN TANZEN!", src: `${base}/10-track10.mp3`, dur: "5:32" },
  { n: 11, title: "МАРШ ЧЁРНОГО ЖЕЛЕЗА!", src: `${base}/11-marsh-chyornogo-zheleza.mp3`, dur: "5:47" },
  { n: 12, title: "DER DOM ERHEBT SICH!", src: `${base}/12-der-dom-erhebt-sich.mp3`, dur: "5:18" },
  { n: 13, title: "Я ВЫБИРАЮ СКА!", src: `${base}/13-ya-vybirayu-ska.mp3`, dur: "4:39" },
  { n: 14, title: "DIE FREIHEIT ZU WÄHLEN", src: `${base}/14-die-freiheit-zu-wahlen.mp3`, dur: "4:53" },
  { n: 15, title: "EIN ORCHESTER, ZWEI WELTEN", src: `${base}/15-ein-orchester-zwei-welten.mp3`, dur: "3:03" },
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
