import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = "#/today";
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#09090b]">
          <div className="max-w-md text-center space-y-5 p-8">
            <div className="text-4xl">💥</div>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              ProcWatch encountered an unexpected error. Your tracking data is safe — the
              background tracker runs independently of the UI.
            </p>
            {this.state.error && (
              <pre className="text-left text-[11px] text-[#71717a] bg-[#17171a] border border-[#27272a] rounded-xl p-4 overflow-x-auto max-h-32 font-mono">
                {String(this.state.error)}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#004fff] hover:bg-[#31afd4] shadow-[0_0_15px_rgba(0,79,255,0.35)] transition-all cursor-pointer border border-[#004fff]/50"
            >
              Reload ProcWatch
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
