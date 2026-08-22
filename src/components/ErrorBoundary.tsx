import type { ReactNode } from "react";
import { Component } from "react";
import type { ErrorInfo } from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  readonly fallback?: ReactNode;
  readonly context?: string;
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const ctx = this.props.context ?? "unknown";
    logger.error(`ErrorBoundary caught error in [${ctx}]`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 text-[48px]">⚠️</div>
          <h2 className="mb-2 text-[16px] font-semibold text-text-header">Something went wrong</h2>
          <p className="mb-4 max-w-[360px] text-[12px] text-text-subtitle">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={(): void => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-accent px-4 py-2 text-[12px] font-medium text-white hover:brightness-110 transition-all cursor-pointer"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
