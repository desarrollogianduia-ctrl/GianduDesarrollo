import {StrictMode, useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error("Global React Error:", e.error);
      setHasError(true);
      setError(e.error);
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div style={{
        background: '#0a0a0a',
        color: '#ff4444',
        padding: '40px',
        fontFamily: 'monospace',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Error de Aplicación</h1>
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '20px', 
          borderRadius: '12px',
          maxWidth: '600px',
          textAlign: 'left',
          fontSize: '12px',
          overflow: 'auto'
        }}>
          <pre>{error?.message || "Error desconocido"}</pre>
          <pre style={{ opacity: 0.5, marginTop: '10px' }}>{error?.stack}</pre>
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#d4ff00',
            color: 'black',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Reiniciar
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

console.log("Main entry point executing...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Error: Root element not found!");
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </StrictMode>,
    );
    console.log("React render call completed.");
  } catch (err) {
    console.error("Failed to render React app:", err);
  }
}
