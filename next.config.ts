import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tillåt code-servers proxy-domän i utvecklingsläge (t.ex. 3000.matiqsson.se).
  allowedDevOrigins: ["matiqsson.se", "*.matiqsson.se"],
};

export default nextConfig;
