import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Cache Components stays off: nearly every page depends on the signed-in user
// and their language, so static caching would add complexity without benefit.
const nextConfig: NextConfig = {
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
