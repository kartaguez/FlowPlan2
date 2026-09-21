import type { ApplicationShell } from "../main/bootstrap";
import "./styles.css";

interface AppProps {
  readonly shell: ApplicationShell;
}

export function App({ shell }: AppProps) {
  return (
    <main className="application-shell">
      <header>
        <p className="eyebrow">FLOWPLAN</p>
        <h1>{shell.title}</h1>
      </header>
      <section
        aria-label={shell.workspaceLabel}
        className="workspace-placeholder"
      >
        <h2>{shell.workspaceLabel}</h2>
        <p>The clean-room application shell is ready for Phase 1.</p>
      </section>
    </main>
  );
}
