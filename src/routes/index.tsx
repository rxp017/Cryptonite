import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { CiGate } from "@/components/lattice/ci";
import { Findings } from "@/components/lattice/findings";
import { Inventory } from "@/components/lattice/inventory";
import { Overview } from "@/components/lattice/overview";
import { Plan } from "@/components/lattice/plan";
import { Report } from "@/components/lattice/report";
import { Sandbox } from "@/components/lattice/sandbox";
import { Shell } from "@/components/lattice/shell";
import { useLattice, type ViewId } from "@/lib/store";

const TABS: ViewId[] = ["overview", "findings", "inventory", "plan", "sandbox", "report", "ci"];

function parseTab(s: Record<string, unknown>): { tab: ViewId } {
  const t = s.tab;
  if (typeof t === "string" && (TABS as string[]).includes(t)) return { tab: t as ViewId };
  return { tab: "overview" };
}

export const Route = createFileRoute("/")({
  validateSearch: parseTab,
  component: Home,
});

function Home() {
  const { tab } = Route.useSearch();
  const load = useLattice((state) => state.load);
  useEffect(() => { void load(); }, [load]);
  return (
    <Shell tab={tab}>
      {tab === "overview" ? <Overview /> : null}
      {tab === "findings" ? <Findings /> : null}
      {tab === "inventory" ? <Inventory /> : null}
      {tab === "plan" ? <Plan /> : null}
      {tab === "sandbox" ? <Sandbox /> : null}
      {tab === "ci" ? <CiGate /> : null}
      {tab === "report" ? <Report /> : null}
    </Shell>
  );
}
