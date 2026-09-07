import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    absolute: "PMARS Live — Maintenance Overview",
  },
  description:
    "PMARS fleet overview: in-service and out-of-service assets, hours, and last scan.",
  alternates: {
    canonical: "https://nullworks.systems/pmar/overview",
  },
  openGraph: {
    title: "PMARS Live — Maintenance Overview",
    description:
      "Shared fleet board for PMARS tags: status, hours, and last scan.",
    url: "https://nullworks.systems/pmar/overview",
    siteName: "PMARS",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PMARS Live — Maintenance Overview",
    description: "Shared fleet board for PMARS tags: status, hours, and last scan.",
  },
};

export default function PMARSOverviewLayout({ children }: { children: ReactNode }) {
  return children;
}
