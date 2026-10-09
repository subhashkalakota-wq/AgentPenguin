import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Keeps one broken tab from blanking the whole dashboard: shows what went wrong and a
 * reload button instead. App gives it key={tab}, so switching tabs clears the error.
 */
export default class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Agent Penguin] Tab crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pg-card pg-empty pg-tab-error" role="alert">
        <AlertTriangle size={22} />
        <strong>This page couldn't load</strong>
        <span>{String(this.state.error?.message || this.state.error)}</span>
        <button type="button" className="pg-btn pg-btn-primary" onClick={() => window.location.reload()}>
          <RotateCcw size={14} /> Reload page
        </button>
      </div>
    );
  }
}
