import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  failed: boolean;
}

export class StartupErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Sushruth could not render", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ maxWidth: 480, margin: "12vh auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#164e48" }}>
          <h1>Sushruth could not open</h1>
          <p>Please reload this page. If it still does not open, try opening the link in Chrome or another up-to-date browser.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: "#0f766e", color: "white", border: 0, borderRadius: 8, padding: "12px 20px", cursor: "pointer" }}
          >
            Reload page
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}