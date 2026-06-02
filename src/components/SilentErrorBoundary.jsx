import { Component } from 'react';

/**
 * A silent error boundary for optional/non-critical features.
 * Catches rendering errors from children and logs them without
 * showing any UI or propagating the crash to the parent tree.
 *
 * Use this to wrap notification, realtime, or analytics components
 * that must never crash the core dashboard.
 */
export default class SilentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SilentErrorBoundary] Non-critical component error suppressed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — the feature is optional, the app continues normally
      return null;
    }
    return this.props.children;
  }
}
