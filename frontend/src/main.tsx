import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// =============================================================================
// STARTUP LOGGING
// =============================================================================

const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [MAIN]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

log('INFO', '========================================');
log('INFO', '  TapBlitz Frontend Starting...');
log('INFO', '========================================');
log('INFO', 'Environment', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL,
});

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log('ERROR', 'React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#8b5cf6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Reload Application
            </button>
            <details style={{ marginTop: '24px', textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
                Error Details (for developers)
              </summary>
              <pre style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                color: '#f87171',
              }}>
                {this.state.error?.stack}
              </pre>
              {this.state.errorInfo && (
                <pre style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  overflow: 'auto',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// GLOBAL ERROR HANDLERS
// =============================================================================

window.onerror = (message, source, lineno, colno, error) => {
  log('ERROR', 'Global error handler', { message, source, lineno, colno, error: error?.message });
  return false;
};

window.onunhandledrejection = (event) => {
  log('ERROR', 'Unhandled promise rejection', { reason: event.reason });
};

// =============================================================================
// RENDER APPLICATION
// =============================================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  log('ERROR', 'Root element not found! Cannot mount React app.');
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;">
      <div style="text-align:center;">
        <h1>Critical Error</h1>
        <p>Root element not found. Please check index.html.</p>
      </div>
    </div>
  `;
} else {
  log('INFO', 'Root element found, creating React root...');

  try {
    const root = ReactDOM.createRoot(rootElement);
    log('DEBUG', 'React root created, rendering app...');

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    log('INFO', 'React app render initiated');
  } catch (error: any) {
    log('ERROR', 'Failed to render React app', { error: error.message, stack: error.stack });
    rootElement.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:white;">
        <div style="text-align:center;">
          <h1>Render Error</h1>
          <p style="color:#ef4444;">${error.message}</p>
          <button onclick="window.location.reload()" style="margin-top:16px;padding:12px 24px;background:#8b5cf6;color:white;border:none;border-radius:8px;cursor:pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}
