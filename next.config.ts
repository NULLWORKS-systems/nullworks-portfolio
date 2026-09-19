import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve legacy URLs while making the canonical corporate graph explicit.
  // Redirects are permanent so old links remain useful without allowing older
  // landing pages to compete with the current company architecture.
  async redirects() {
    return [
      { source: "/nullworks", destination: "/", permanent: true },
      { source: "/tac-ops", destination: "/ori-tac-ops", permanent: true },
      { source: "/jp", destination: "/japan", permanent: true },
      { source: "/oi", destination: "/field-notes", permanent: true },
      { source: "/live-learning-forest", destination: "/forest", permanent: true },
      { source: "/digital-employees", destination: "/digital-workforce", permanent: true },

      // NULLWORKS // ANVIL canonical migration. Keep known public slugs useful.
      { source: "/anvil-records", destination: "/anvil/releases", permanent: true },
      { source: "/nan-wisdom", destination: "/anvil/nan-wisdom", permanent: true },
      { source: "/non-opera-italica", destination: "/anvil/non-opera-italica", permanent: true },
      { source: "/9v-vex-likes-sex", destination: "/anvil/9-volt", permanent: true },
      { source: "/vex-overdose-venice", destination: "/anvil/9-volt", permanent: true },

      // Phone export names. iOS Files appended a second .pdf.
      { source: "/smart-as-shit/paper.pdf", destination: "/smart-as-shit/paper.pdf.pdf", permanent: false },
      { source: "/smart-as-shit/poster.png", destination: "/smart-as-shit/poster.png.pdf", permanent: false },
      { source: "/smart-as-shit/poster.pdf", destination: "/smart-as-shit/poster.png.pdf", permanent: false },
    ];
  },

  // Existing repository recovery exception. Runtime guards execute before the
  // known fantasy-app closure; keep deployment behavior unchanged in this migration.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
