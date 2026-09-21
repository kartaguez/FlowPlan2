import "./styles.css";

export function App() {
  return (
    <main className="application-shell">
      <header>
        <p className="eyebrow">FLOWPLAN</p>
        <h1>FlowPlan</h1>
      </header>
      <section
        aria-label="Planning workspace"
        className="workspace-placeholder"
      >
        <h2>Planning workspace</h2>
        <p>The clean-room application shell is ready for Phase 1.</p>
      </section>
    </main>
  );
}
