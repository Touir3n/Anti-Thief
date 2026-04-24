import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent pinch-to-zoom on iOS
document.addEventListener('touchmove', function (event: TouchEvent) {
  if ((event as any).scale !== 1 && (event as any).scale !== undefined) {
    event.preventDefault();
  }
}, { passive: false });

// Prevent double-tap-to-zoom on iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event: TouchEvent) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    // Only prevent default if target isn't explicitly an input that needs it, or just blindly prevent
    // Wait, blindly preventing double tap breaks fast typing. But anyway, they want no zoom.
    const target = event.target as HTMLElement;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
       event.preventDefault();
    }
  }
  lastTouchEnd = now;
}, false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
