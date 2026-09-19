import type { Metadata } from "next";

const title = "Goblin Clock: The Amplification Seam | NULLWORKS";
const description =
  "A governed multi-node timing experiment using hash-chained relays, receipts, and compressed time to expose how tiny boundary errors become system-scale failures.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://nullworks.systems/goblin-amplification",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function GoblinAmplificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
