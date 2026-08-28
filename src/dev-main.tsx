import { globalSettings } from "@proofkit/webviewer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import "./index.css";
import { DevApp } from "./dev-app";

// Must match the Layout Object Name of the Web Viewer in FileMaker
// (set this on the Web Viewer object on the RehearsalKitDev layout).
globalSettings.setWebViewerName("web");

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "monospace", fontSize: 13, padding: 24 }}>
          <strong style={{ color: "red" }}>App Error</strong>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootElement = document.querySelector("#root");
if (!rootElement) {
  throw new Error("Root element with id 'root' not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DevApp />
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
