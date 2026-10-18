import type {Metadata} from "next";
import AnvilShell from "../AnvilShell";
import ListeningPage from "../ListeningPage";
import AlbumSwitch from "../AlbumSwitch";
import { getArtistAlbums } from "../catalog";

const base = "https://foveyfclihpsnwhfchib.supabase.co/storage/v1/object/public/anvil-media/non-opera-italica-odyssea";

const tracks = [
  { n: 1, title: "세 번 식은 커피", src: `${base}/coffee.mp3`, dur: "6:17", artSrc: `${base}/coffee.png`, note: "전자레인지 속에 남겨진, 세 번의 온기." },
];

export const metadata: Metadata = {
  title: "세 번 식은 커피 | NON OPERA ITALICA // ANVIL",
  description: "Korean gothic doom opera single. Three times the coffee went cold. CARNIFICINA. NULLWORKS // ANVIL.",
  alternates: { canonical: "/anvil/non-opera-italica-coffee" },
  openGraph: {
    title: "세 번 식은 커피",
    description: "전자레인지 속에 남겨진, 세 번의 온기, 그리고 끝없는 기다림.",
    url: "https://nullworks.systems/anvil/non-opera-italica-coffee",
    siteName: "NULLWORKS // ANVIL",
    type: "music.album",
    images: [{ url: `${base}/coffee.png`, width: 800, height: 1200, alt: "세 번 식은 커피 poster" }]
  },
  twitter: { card: "summary_large_image", title: "세 번 식은 커피", description: "Korean gothic doom opera single under NON OPERA ITALICA.", images: [`${base}/coffee.png`] }
};

export default function Page() {
  return (
    <AnvilShell accent="#8b0000">
      <AlbumSwitch albums={getArtistAlbums("non-opera-italica")} current="non-opera-italica-coffee" />
      <ListeningPage
        title="세 번 식은 커피"
        eyebrow="CARNIFICINA // 한국어 고딕 둘 오페라"
        description="전자레인지 속에 남겨진, 세 번의 온기, 그리고 끝없는 기다림. 한 잔의 커피가 이토록 큰 비극이 될 줄이야. Single composition for CARNIFICINA."
        accent="#8b0000"
        background="linear-gradient(180deg,#0a0707,#080505 52%,#030303)"
        coverSrc={`${base}/coffee.png`}
        coverKind="poster"
        tracks={tracks}
        footer="세 번 식은 커피. 한 잔의 커피가 이토록 큰 비극이 될 줄이야. // NULLWORKS // ANVIL"
      />
    </AnvilShell>
  );
}
