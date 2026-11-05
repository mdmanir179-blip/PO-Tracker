import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Ensure window.fetch has both getter and setter so injected extensions and scripts can safely patch it
if (typeof window !== 'undefined') {
  try {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get: () => currentFetch,
      set: (fn) => {
        currentFetch = fn;
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    // ignore
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
