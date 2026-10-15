import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";
import AlbumSwitch from "../AlbumSwitch";
import { getArtistAlbums } from "../catalog";

// Korean gothic doom opera single — 어댑터의 부재 under NON OPERA ITALICA
const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-adapter";

const tracks = [
  { n: 1, title: "어댑터의 부재", src: `${base}/01-adapter-absence.mp3`, dur: "6:22" },
];

export const metadata: Metadata = {
  title: "어댑터의 부재 | NON OPERA ITALICA // ANVIL",
  description: "Korean gothic doom opera. Single composition for CARNIFICINA. The tragic absence of the iPhone charger adapter.",
  alternates: { canonical: "/anvil/non-opera-italica-adapter" },
  openGraph: {
    title: "어댑터의 부재",
    description: "비극적 고딕 둘 오페라. 아이폰 충전기 어댑터의 실종에 관한 장엄한 음악 비극.",
    url: "https://nullworks.systems/anvil/non-opera-italica-adapter",
    siteName: "NULLWORKS // ANVIL",
    type: "music.album",
    images: [{ url: `${base}/poster.png`, width: 800, height: 1200, alt: "어댑터의 부재 teatro poster" }]
  },
  twitter: { card: "summary_large_image", title: "어댑터의 부재", description: "Korean gothic doom opera single under NON OPERA ITALICA.", images: [`${base}/poster.png`] }
};

export default function Page() {
  return (
    <AnvilShell accent="#8b0000">
      <AlbumSwitch albums={getArtistAlbums("non-opera-italica")} current="non-opera-italica-adapter" />
      <ListeningPage
        title="어댑터의 부재"
        eyebrow="CARNIFICINA // 한국어 고딕 둘 오페라"
        description="비극적 고딕 둘 오페라. 아이폰 충전기 어댑터의 실종에 관한 장엄한 음악 비극. 선은 있으나 전원은 오지 않는다. Single composition for CARNIFICINA."
        accent="#8b0000"
        background="linear-gradient(180deg,#0a0707,#080505 52%,#030303)"
        coverSrc={`${base}/poster.png`}
        coverKind="poster"
        tracks={tracks}
        footer="어댑터의 부재. 선은 있으나 전원은 오지 않는다. // NULLWORKS // ANVIL"
      />
    </AnvilShell>
  );
}
