/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches rendering crashes and shows a recovery UI.
 * Must be a class component (React requirement for error boundaries).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PromptVault] Uncaught render error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0D0D0D] text-[#E5E5E5] font-sans p-8">
        <div className="max-w-md text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full border-2 border-red-500/40 bg-red-500/10 flex items-center justify-center">
            <ShieldAlert size={36} className="text-red-400" />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight uppercase" style={{ fontFamily: '"Space Mono", monospace' }}>
              Vault Error
            </h1>
            <p className="text-sm text-[#888888] leading-relaxed">
              Something unexpected happened. Your data is safe in local storage — this is just a rendering issue.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-400/70 font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-3 mt-4 break-words text-left">
                {this.state.error.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center justify-center gap-2 px-6 py-3 border border-[#2A2A2A] text-[#888888] hover:text-[#f59e0b] hover:border-[#f59e0b] rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              style={{ fontFamily: '"Space Mono", monospace' }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#f59e0b] text-[#0D0D0D] hover:opacity-90 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
              style={{ fontFamily: '"Space Mono", monospace' }}
            >
              <RotateCcw size={14} />
              Reload Vault
            </button>
          </div>
        </div>
      </div>
    );
  }
}
