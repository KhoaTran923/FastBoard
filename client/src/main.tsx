import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './stores/themeStore'; // applies the saved theme before first paint
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA: production builds only, so the service worker cache never fights Vite HMR
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app works without offline support
    });
  });
}
