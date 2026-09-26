import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROVIDERS, runProvider, type RunLog, type SuiteId } from "@/lib/crypto/providers";
import { cn } from "@/lib/utils";

export function Sandbox() {
  const [suite, setSuite] = useState<SuiteId>("classical");
  const [message, setMessage] = useState("payout:42:demo");
  const [log, setLog] = useState<RunLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = PROVIDERS.find((item) => item.id === suite)!;

  async function run() {
    setBusy(true);
    setError(null);
    setLog(null);
    try {
      setLog(await runProvider(suite, message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Provider run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lattice-page">
      <div>
        <h1 className="lattice-title">Crypto-agility sandbox</h1>
        <p className="lattice-lede">
          Run real key establishment, AES-GCM encryption, signing, and verification. Each mode uses
          the named algorithms.
        </p>
        <p className="mt-2 text-xs text-subtle">
          A successful run does not prove a system is quantum-safe.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PROVIDERS.map((provider) => (
          <button
            type="button"
            key={provider.id}
            aria-pressed={suite === provider.id}
            onClick={() => {
              setSuite(provider.id);
              setLog(null);
              setError(null);
            }}
            className={cn(
              "min-h-11 rounded-xl bg-surface p-4 text-left shadow-[var(--shadow-border)] transition-colors duration-150 hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              suite === provider.id ? "ring-1 ring-accent/50" : "",
            )}
          >
            <p className="text-sm font-medium">{provider.label}</p>
            <p className="mt-2 font-mono text-[11px] text-muted">{provider.establishment}</p>
            <p className="font-mono text-[11px] text-muted">{provider.signature}</p>
          </button>
        ))}
      </div>

      <section className="lattice-card">
        <Badge>{info.implementation}</Badge>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="lattice-eyebrow">Establishment</dt>
            <dd className="mt-1">{info.establishment}</dd>
          </div>
          <div>
            <dt className="lattice-eyebrow">Signature</dt>
            <dd className="mt-1">{info.signature}</dd>
          </div>
          <div>
            <dt className="lattice-eyebrow">Cipher</dt>
            <dd className="mt-1">{info.cipher}</dd>
          </div>
        </dl>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
          {info.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="lattice-card">
        <label className="lattice-eyebrow">
          Message
          <input
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setLog(null);
              setError(null);
            }}
            className="mt-2 block h-11 w-full rounded-md bg-elevated px-3 text-sm shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
        </label>
        <Button className="mt-4" onClick={run} disabled={busy || !message.trim()}>
          {busy ? "Running provider…" : "Run provider"}
        </Button>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-risk">
            {error}
          </p>
        ) : null}
        {log ? (
          <div className="mt-5 space-y-4" aria-live="polite">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge>{log.establishment}</Badge>
              <Badge>{log.signature}</Badge>
              <Badge>{log.cipher}</Badge>
              <Badge tone={log.decapsulationMatched ? "ok" : "risk"}>
                {suite === "classical" ? "ECDH agreement" : "Decapsulation"}:{" "}
                {log.decapsulationMatched ? "pass" : "fail"}
              </Badge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {log.sizes.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-3 rounded-md bg-elevated px-3 py-2 text-xs"
                >
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="font-mono tabular-nums">{item.bytes} bytes</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </section>
    </div>
  );
}
