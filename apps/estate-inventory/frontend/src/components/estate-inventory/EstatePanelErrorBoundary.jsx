import React from 'react';

/**
 * Isolates Estate Vault panel crashes so one throw does not blank the whole SPA.
 */
class EstatePanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || String(error || 'Unexpected error')
    };
  }

  componentDidCatch(error, info) {
    console.error('[Estate Vault]', this.props.label || 'panel', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="ei-error" role="alert" style={{ margin: '0.75rem 0' }}>
          <strong>{this.props.title || 'This section failed to load.'}</strong>
          <p className="ei-settings-hint" style={{ margin: '0.4rem 0' }}>
            {this.state.message}
          </p>
          <div className="ei-btn-row">
            <button type="button" className="ei-btn ei-btn-small" onClick={this.handleRetry}>
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default EstatePanelErrorBoundary;
