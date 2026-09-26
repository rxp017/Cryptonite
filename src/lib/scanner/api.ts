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

export const scanUploadedFiles = createServerFn({ method: "POST" })
  .validator((files: { path: string; content: string }[]) => files)
  .handler(async ({ data }): Promise<EstateSnapshot> => {
    const [{ scanFiles }, { prepareInputFiles }] = await Promise.all([
      import("./engine.ts"), import("./input-files.ts"),
    ]);
    const files = prepareInputFiles(data);
    return { scan: scanFiles(files), files: files.map(({ path, language, component }) => ({ path, language, component })) };
  });

export const scanUploadedZip = createServerFn({ method: "POST" })
  .validator((base64: string) => base64)
  .handler(async ({ data }): Promise<EstateSnapshot> => {
    const [{ scanFiles }, { unzipInput }] = await Promise.all([
      import("./engine.ts"), import("./input-files.ts"),
    ]);
    const files = unzipInput(data);
    return { scan: scanFiles(files), files: files.map(({ path, language, component }) => ({ path, language, component })) };
  });

export const scanGitHubRepository = createServerFn({ method: "POST" })
  .validator((url: string) => url)
  .handler(async ({ data }): Promise<EstateSnapshot> => {
    const [{ scanFiles }, { cloneInput }] = await Promise.all([
      import("./engine.ts"), import("./git-input.server.ts"),
    ]);
    const files = await cloneInput(data);
    return { scan: scanFiles(files), files: files.map(({ path, language, component }) => ({ path, language, component })) };
  });
