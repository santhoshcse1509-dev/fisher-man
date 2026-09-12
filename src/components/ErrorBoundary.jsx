import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[WaveGuard ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen h-[100dvh] w-full bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-full mb-4 animate-pulse">
            <AlertTriangle size={48} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">WaveGuard Recovery</h1>
          <p className="text-slate-300 text-sm max-w-sm mb-6">
            An unexpected error occurred. Tap below to reload the application.
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
          >
            <RefreshCw size={20} />
            Reload App / செயலியை மீண்டும் தொடங்கு
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
