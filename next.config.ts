import type { NextConfig } from "next";
import { readFileSync } from "fs";

// Versionsnumret hämtas från package.json och visas längst ned under "Mer".
// På Vercel läggs även en kort kod för senaste ändringen till, så att man
// kan se exakt vilken version som ligger ute.
const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };
const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const buildDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: version,
    APP_BUILD: commit ? `${buildDate} (${commit})` : buildDate,
  },
};

export default nextConfig;
