import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E2DFD7] p-8">
            <div className="flex items-center gap-3 text-[#B91C1C] mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="text-lg font-semibold text-[#171A1D]">
                Application Error Encountered
              </h1>
            </div>
            <p className="text-sm text-[#4B5563] mb-4 leading-relaxed">
              TAFFIC-PRAHARI caught an error while loading or saving data. Please reload the page or sign in again.
            </p>
            <pre className="text-xs font-mono bg-[#F5F3EF] border border-[#E2DFD7] p-3 overflow-x-auto text-[#24282C] mb-6">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#171A1D] text-white text-sm font-medium hover:bg-[#24282C] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
