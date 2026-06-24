import React, { Component, ErrorInfo, ReactNode } from "react";
import { Shield } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text-1)',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            padding: '40px',
            borderRadius: '16px',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <Shield size={64} color="var(--red)" style={{ marginBottom: '16px' }} />
            <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Aw, Snap!</h1>
            <p style={{ color: 'var(--text-3)', marginBottom: '24px' }}>
              Something went wrong while displaying this page. The browser shell encountered an unexpected error.
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--text-2)',
              overflowX: 'auto',
              marginBottom: '24px'
            }}>
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reload Browser
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
