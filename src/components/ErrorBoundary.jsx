import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Loc Party hit a render error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen" style={{ minHeight: '100svh' }}>
        <span className="eyebrow">Something went wrong</span>
        <h1>This screen couldn't load</h1>
        <p>Reload the app. If it keeps happening, head back to the start.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.assign('/')}>
          Back to the start
        </button>
      </div>
    );
  }
}
