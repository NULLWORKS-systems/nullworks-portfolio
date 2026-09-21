import { nullworksMetadata } from "../lib/siteMetadata";

export const metadata = nullworksMetadata({
  title: "AI Tinkerers Prototype Lab",
  description:
    "Audience-run live experiment. Your AI. Same frozen contract. Deterministic evidence. Human authority remains final.",
  path: "/tinkerers",
  kicker: "NULLWORKS // AI TINKERERS",
  accent: "#78e6d2",
});

export default function TinkerersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
