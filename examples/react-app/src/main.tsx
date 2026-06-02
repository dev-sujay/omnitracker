import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { TrackerCore, ITrackerCore } from '@dev-sujay/omnitracker';
import { ScrollTrackingExtension } from '@dev-sujay/omnitracker-extension-scroll';
import { RageClickExtension } from '@dev-sujay/omnitracker-extension-rage-click';
import { SessionReplayExtension } from '@dev-sujay/omnitracker-extension-replay';

// Declare global window expansion type-safely
declare global {
  interface Window {
    dsTracker?: ITrackerCore;
  }
}

// 1. Initialize core tracker
const tracker = new TrackerCore({
  apiUrl: 'http://localhost:5000/api',
  debug: true,
  inactivityTimeout: 30000, // 30 seconds inactivity for demonstration purposes
  sessionExpirationTimeout: 5 * 60 * 1000, // 5 minutes session expiration
});

// 2. Attach extensions/plugins
tracker.use(new ScrollTrackingExtension());
tracker.use(new RageClickExtension({ clickCountThreshold: 3, radiusPx: 40 }));
tracker.use(new SessionReplayExtension({
  uploadIntervalMs: 15000, // upload every 15s for visual demonstration
  maskAllInputs: false, // record typing input for reproduction
}));

// 3. Start tracking
tracker.init();
window.dsTracker = tracker;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
