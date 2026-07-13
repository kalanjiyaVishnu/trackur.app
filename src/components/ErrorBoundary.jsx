import { Component } from 'react';

// Deliberately avoids Catalyst/HeadlessUI imports — if the crash originated
// inside a shared component, the fallback must still render.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-zinc-200 dark:bg-zinc-950 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-zinc-900 p-6 text-center shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
            <h1 className="text-base font-semibold text-zinc-950 dark:text-white">Something went wrong</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              An unexpected error occurred. Reloading the page usually fixes it.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 active:bg-violet-800 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
