import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  FileSearch,
  GitBranch,
  Hexagon,
  LayoutList,
  Network,
  ScrollText,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { useLattice, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { id: ViewId; label: string; icon: typeof Hexagon }[] = [
  { id: "overview", label: "Overview", icon: Hexagon },
  { id: "findings", label: "Findings", icon: FileSearch },
  { id: "inventory", label: "Inventory", icon: LayoutList },
  { id: "plan", label: "Migration", icon: Workflow },
  { id: "sandbox", label: "Sandbox", icon: GitBranch },
  { id: "ci", label: "CLI / CI status", icon: Network },
  { id: "report", label: "Report", icon: ScrollText },
];

export function Shell({ children, tab }: { children: ReactNode; tab: ViewId }) {
  const findingCount = useLattice((s) => s.scan.findings.length);
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="pointer-events-none fixed inset-0 lattice-grid" aria-hidden />
      <header className="relative z-10 border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/"
            search={{ tab: "overview" }}
            className="flex min-h-11 items-center gap-3 text-left"
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-elevated shadow-[var(--shadow-border)]">
              <Hexagon className="size-4 text-accent" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block font-medium leading-tight tracking-tight">Lattice</span>
              <span className="block text-xs text-muted">Crypto-agility scanner</span>
            </span>
          </Link>
          <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
            <ShieldAlert className="size-3.5 text-risk" />
            <span>A scan does not prove quantum safety</span>
          </div>
        </div>
        <nav className="relative z-10 mx-auto max-w-7xl overflow-x-auto px-2 sm:px-4">
          <ul className="flex min-w-max gap-1 pb-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <li key={item.id}>
                  <Link
                    to="/"
                    search={{ tab: item.id }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      active
                        ? "bg-elevated text-fg shadow-[var(--shadow-border)]"
                        : "text-muted hover:bg-elevated/60 hover:text-fg",
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={1.75} />
                    {item.label}
                    {item.id === "findings" ? (
                      <span className="font-mono text-[11px] tabular-nums text-risk">
                        {findingCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
