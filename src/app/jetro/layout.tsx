import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JETRO MVP v0.6",
  description:
    "Functional software demonstration: authority, evidence, QC, correction, and continuity when an AI worker meets a real operating rule.",
  alternates: { canonical: "https://nullworks.systems/jetro" },
  robots: { index: true, follow: true },
};

export default function JetroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
