import { create } from "zustand";
import { getEstateSnapshot, resetEstateSnapshot, scanGitHubRepository, scanPastedSnippet, scanUploadedFiles, scanUploadedZip } from "./scanner/api";
import type { EstateSnapshot } from "./scanner/api";
import type { SampleFile, ScanResult } from "./scanner/types";

export type ViewId = "overview" | "findings" | "inventory" | "plan" | "sandbox" | "report" | "ci";
const emptyScan: ScanResult = {
  scannedAt: "", files: 0, findings: [], inventory: [], packages: [],
  stats: { critical: 0, high: 0, medium: 0, low: 0, info: 0, confirmed: 0, uncertain: 0, hidden: 0 },
};
type EstateFile = Pick<SampleFile, "path" | "language" | "component">;
type State = {
  files: EstateFile[]; scan: ScanResult; selectedFinding: string | null;
  sourceName: string;
  selectFinding: (id: string | null) => void;
  load: () => Promise<void>; paste: (content: string) => Promise<void>; reset: () => Promise<void>;
  uploadFiles: (files: { path: string; content: string }[], label: string) => Promise<void>;
  uploadZip: (base64: string, label: string) => Promise<void>;
  cloneGitHub: (url: string) => Promise<void>;
  filterSeverity: string; setFilterSeverity: (s: string) => void;
  filterConfidence: string; setFilterConfidence: (s: string) => void;
};
function snapshotState(snapshot: EstateSnapshot) {
  return { files: snapshot.files, scan: snapshot.scan,
    selectedFinding: snapshot.scan.findings[0]?.id ?? null };
}
export const useLattice = create<State>((set) => ({
  files: [], scan: emptyScan, selectedFinding: null, sourceName: "Seeded Crypto Estate",
  selectFinding: (selectedFinding) => set({ selectedFinding }),
  load: async () => set({ ...snapshotState(await getEstateSnapshot()), sourceName: "Seeded Crypto Estate" }),
  paste: async (content) => set({ ...snapshotState(await scanPastedSnippet({ data: content })), sourceName: "Seeded Crypto Estate + pasted-input" }),
  reset: async () => set({ ...snapshotState(await resetEstateSnapshot()), sourceName: "Seeded Crypto Estate" }),
  uploadFiles: async (files, label) => set({ ...snapshotState(await scanUploadedFiles({ data: files })), sourceName: label }),
  uploadZip: async (base64, label) => set({ ...snapshotState(await scanUploadedZip({ data: base64 })), sourceName: label }),
  cloneGitHub: async (url) => set({ ...snapshotState(await scanGitHubRepository({ data: url })), sourceName: url }),
  filterSeverity: "all", setFilterSeverity: (filterSeverity) => set({ filterSeverity }),
  filterConfidence: "all", setFilterConfidence: (filterConfidence) => set({ filterConfidence }),
}));
