import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const id = decodeURIComponent(tag || "TAG").toUpperCase();
  const title = `PMARS Live — ${id}`;
  return {
    title: { absolute: title },
    description: `PMARS scan record for marker ${id}.`,
    alternates: {
      canonical: `https://nullworks.systems/pmar/t/${encodeURIComponent(id)}`,
    },
    openGraph: {
      title,
      description: `Scan record and service status for PMARS marker ${id}.`,
      url: `https://nullworks.systems/pmar/t/${encodeURIComponent(id)}`,
      siteName: "PMARS",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: `Scan record and service status for PMARS marker ${id}.`,
    },
  };
}

export default function PMARSTagLayout({ children }: Props) {
  return children;
}
