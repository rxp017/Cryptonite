import { createServerFn } from "@tanstack/react-start";
import type { SampleFile, ScanResult } from "./types";

export type EstateSnapshot = { scan: ScanResult; files: Pick<SampleFile, "path" | "language" | "component">[] };

export const getEstateSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstateSnapshot> => {
    const [{ scanFiles }, { bundledEstateFiles }] = await Promise.all([
      import("./engine.ts"), import("./bundled-estate.server.ts"),
    ]);
    return { scan: scanFiles(bundledEstateFiles), files: bundledEstateFiles.map(({ path, language, component }) =>
      ({ path, language, component })) };
  },
);
export const scanPastedSnippet = createServerFn({ method: "POST" })
  .validator((content: string) => content)
  .handler(async ({ data }): Promise<EstateSnapshot> => {
    const [{ scanPasted }, { bundledEstateFiles }] = await Promise.all([
      import("./engine.ts"), import("./bundled-estate.server.ts"),
    ]);
    return { scan: scanPasted(data, bundledEstateFiles), files: [...bundledEstateFiles.map(({ path, language, component }) =>
      ({ path, language, component })),
      { path: "pasted-input", language: "text", component: "pasted" }] };
  });
export const resetEstateSnapshot = createServerFn({ method: "POST" }).handler(
  async (): Promise<EstateSnapshot> => {
    const [{ clearPasted }, { bundledEstateFiles }] = await Promise.all([
      import("./engine.ts"), import("./bundled-estate.server.ts"),
    ]);
    return { scan: clearPasted(bundledEstateFiles), files: bundledEstateFiles.map(({ path, language, component }) =>
      ({ path, language, component })) };
  },
);
