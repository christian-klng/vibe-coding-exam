import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Cache Components stays off: nearly every page depends on the signed-in user
// and their language, so static caching would add complexity without benefit.
const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone with only the files it needs (small Docker image).
  output: "standalone",
  // pg-boss loads its SQL plans at runtime and must not be bundled.
  serverExternalPackages: ["pg-boss"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
