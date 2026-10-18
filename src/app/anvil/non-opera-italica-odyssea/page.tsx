import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";
import AlbumSwitch from "../AlbumSwitch";
import { getArtistAlbums } from "../catalog";

const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-odyssea";
const cover = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica/cover";

const tracks = [
  { n: 1, title: "I. ITINERE RELINQVERE", src: `${base}/01-itinere.mp3`, dur: "—", artSrc: `${base}/01-itinere.png`, note: "OMNIA INCIPIVNT CVM DISCESSV." },
  { n: 2, title: "II. LOTOPHAGI OBLIVIO", src: `${base}/02-lotophagi.mp3`, dur: "—", artSrc: `${base}/02-lotophagi.png`, note: "DVLCIS OBLIVIO PERICVLVM EST." },
  { n: 3, title: "III. CYCLOPS HYBRIS", src: `${base}/03-cyclops.mp3`, dur: "—", artSrc: `${base}/03-cyclops.png`, note: "QVI NOS DESPICIT SVAM CLADEN PARAT." },
  { n: 4, title: "IV. CIRCE MVTATIO", src: `${base}/04-circe.mp3`, dur: "—", artSrc: `${base}/04-circe.png`, note: "NON OMNIA SVNT QVAE VIDENTVR." },
  { n: 5, title: "V. INFERI VERITAS", src: `${base}/05-inferi.mp3`, dur: "—", artSrc: `${base}/05-inferi.png`, note: "MORTVI DOCENT VIVENTES." },
  { n: 6, title: "VI. SIRENES SVAVITAS", src: `${base}/06-sirenes.mp3`, dur: "—", artSrc: `${base}/06-sirenes.png`, note: "PVLCHRITVDO TVNC VINCIT." },
  { n: 7, title: "VII. SCYLLA ET CHARYBDIS INTERITVM", src: `${base}/07-scylla.mp3`, dur: "—", artSrc: `${base}/07-scylla.png`, note: "INTER DVOS MALA ITER TAMEN." },
  { n: 8, title: "VIII. SOLIS PECORA RAPACITAS", src: `${base}/08-solis.mp3`, dur: "—", artSrc: `${base}/08-solis.png`, note: "SVPERBIA SVMMVM PRETIVM HABENT." },
  { n: 9, title: "IX. CALYPSO DETENTIO", src: `${base}/09-calypso.mp3`, dur: "—", artSrc: `${base}/09-calypso.png`, note: "TEMPORA FVGIVNT SED COR MANET." },
  { n: 10, title: "X. ITHACA APPROPINQVATIO", src: `${base}/10-ithaca.mp3`, dur: "—", artSrc: `${base}/10-ithaca.png`, note: "DOMVS VIDETVR SED NVNDVM TENETVR." },
  { n: 11, title: "XI. ARCVS IVSTITIA", src: `${base}/11-arcus.mp3`, dur: "—", artSrc: `${base}/11-arcus.png`, note: "SCIENTIA QVI SVM." },
  { n: 12, title: "XII. LECTVS RECONCILIATIO", src: `${base}/12-lectus.mp3`, dur: "—", artSrc: `${base}/12-lectus.png`, note: "RADICES MANENT OMNIA COMPLETVR." },
];

export const metadata: Metadata = {
  title: "CARNIFICINA ODYSSEA | NON OPERA ITALICA // ANVIL",
  description: "Unus motus. Duodecim scenae. Omnia manent. Latin doom opera on the Odyssey. CARNIFICINA. NULLWORKS // ANVIL.",
  alternates: { canonical: "/anvil/non-opera-italica-odyssea" },
  openGraph: {
    title: "CARNIFICINA ODYSSEA",
    description: "Opera Non-Italica. Twelve scenes. From the journey to the home.",
    url: "https://nullworks.systems/anvil/non-opera-italica-odyssea",
    siteName: "NULLWORKS // ANVIL",
    type: "music.album",
    images: [{ url: cover, width: 800, height: 1200, alt: "CARNIFICINA ODYSSEA poster" }]
  },
  twitter: { card: "summary_large_image", title: "CARNIFICINA ODYSSEA", description: "NON OPERA ITALICA. Unus motus. Duodecim scenae.", images: [cover] }
};

export default function Page() {
  return (
    <AnvilShell accent="#b11116">
      <AlbumSwitch albums={getArtistAlbums("non-opera-italica")} current="non-opera-italica-odyssea" />
      <ListeningPage
        title="ODYSSEA"
        eyebrow="CARNIFICINA // OPERA NON-ITALICA"
        description="Unus motus. Duodecim scenae. Omnia manent. One movement. Twelve scenes. Everything remains. From the departure to the bed. Mare, terra, homo, memoria — semper. NON FINIS SED ITER."
        accent="#b11116"
        background="linear-gradient(180deg,#1a0a0a,#0c0606 50%,#050303)"
        coverSrc={cover}
        coverKind="poster"
        tracks={tracks}
        footer="CARNIFICINA ODYSSEA. AB ITINERE AD DOMVM. NON FINIS SED ITER. // NULLWORKS // ANVIL // MMXXVI"
      />
    </AnvilShell>
  );
}
