/** The browser entry point: configures Zod for the CSP, then mounts the app. */
import './jitless.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
