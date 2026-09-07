import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "PMARS Live",
    template: "%s",
  },
  description:
    "PMARS Live — persistent maintenance and asset records. Scan a marker, see the asset, update status.",
  openGraph: {
    title: "PMARS Live",
    description:
      "Persistent maintenance and asset records for physical equipment.",
    url: "https://nullworks.systems/pmar",
    siteName: "PMARS",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PMARS Live",
    description: "Persistent maintenance and asset records for physical equipment.",
  },
};

export default function PMARSLayout({ children }: { children: ReactNode }) {
  return children;
}
