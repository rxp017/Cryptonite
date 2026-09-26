import { sampleFile } from "./engine.ts";

// Vite replaces this glob with the fixture's text at build time. Runtime scanning does not need fixture files on disk.
const sources = import.meta.glob<string>("../../../demo/seeded-estate/**/*", {
  query: "?raw", import: "default", eager: true,
});
const marker = "demo/seeded-estate/";

export const bundledEstateFiles = Object.entries(sources).map(([source, content]) => {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Unexpected bundled estate path: ${source}`);
  return sampleFile(source.slice(start), content);
}).sort((a, b) => a.path.localeCompare(b.path));
