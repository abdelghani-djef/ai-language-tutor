import type { NextConfig } from "next";

// Pages are still prerendered as static HTML; the one server route is POST /api/ai/
// (src/app/api/ai/route.ts), which calls Groq with a key that must stay on the server.
// That route is why this is no longer a static export: it needs a Node host such as Vercel.
const nextConfig: NextConfig = {
  // URLs end in a slash (/deck/, /api/ai/), as they did on the static site, so saved links still work.
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
