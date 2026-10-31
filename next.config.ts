import type { NextConfig } from "next";

// Fully static site: `next build` writes plain HTML/JS to out/, no server needed.
const nextConfig: NextConfig = {
  output: "export",
  // Emit out/deck/index.html etc., so plain static hosts serve /deck/ on reload.
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
