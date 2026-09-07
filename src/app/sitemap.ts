import type { MetadataRoute } from "next";

const base = "https://nullworks.systems";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/architecture",
    "/products",
    "/proof",
    "/research",
    "/company",
    "/contact",
    "/japan",
    "/jetro",
    "/ai-audit",
    "/triage",
    "/assurance",
    "/pricing",
    "/continuity-calculus",
    "/ciris-proof",
    "/architecture-lineage",
    "/operational-relativity",
    "/outcome-first-operational-fuzzing",
    "/software-recency-bias",
    "/model-agnostic-transplant",
    "/control-coverage",
    "/assurance-index",
  ];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/architecture" || route === "/products" || route === "/proof" ? 0.85 : 0.7,
  }));
}
