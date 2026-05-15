import {StrictMode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import App from './App.tsx';
import './index.css';

hydrateRoot(document.getElementById('root')!,
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
