'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#07040F', padding: '2rem', flexDirection: 'column', gap: '1.2rem', textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,179,71,.08)', fontSize: '2rem',
            boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 5px rgba(45,25,90,.2),0 0 0 1px rgba(255,179,71,.2)',
          }}>
            ⚠
          </div>
          <h2 style={{
            fontFamily: "'Cinzel Decorative',serif", fontWeight: 900, fontSize: '1.4rem',
            background: 'linear-gradient(135deg,#FFD700,#FFB347)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Something went wrong
          </h2>
          <p style={{
            fontFamily: "'Crimson Pro',serif", fontSize: '.95rem', color: 'rgba(255,245,232,.5)',
            maxWidth: 360, lineHeight: 1.6,
          }}>
            We hit an unexpected error. Please try again.
          </p>
          <button onClick={this.resetErrorBoundary} className="btn-p" style={{ marginTop: '.5rem' }}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
