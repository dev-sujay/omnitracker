'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { TrackerCore, ITrackerCore } from '@dev-sujay/omnitracker';
import { ScrollTrackingExtension } from '@dev-sujay/omnitracker-extension-scroll';
import { RageClickExtension } from '@dev-sujay/omnitracker-extension-rage-click';
import { SessionReplayExtension } from '@dev-sujay/omnitracker-extension-replay';

declare global {
  interface Window {
    dsTracker?: ITrackerCore;
  }
}

export default function TrackerInitializer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackerRef = useRef<TrackerCore | null>(null);

  useEffect(() => {
    // 1. Initialize tracker only on the browser client
    const tracker = new TrackerCore({
      apiUrl: 'http://localhost:5000/api',
      debug: true,
      inactivityTimeout: 60000,
    });

    tracker.use(new ScrollTrackingExtension());
    tracker.use(new RageClickExtension());
    tracker.use(new SessionReplayExtension({
      uploadIntervalMs: 20000,
      maskAllInputs: false,
    }));

    tracker.init();
    window.dsTracker = tracker;
    trackerRef.current = tracker;

    return () => {
      if (trackerRef.current) {
        trackerRef.current.destroy();
      }
    };
  }, []);

  // 2. Track SPA page navigation changes via Next.js router events hook
  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.trackPageView();
    }
  }, [pathname, searchParams]);

  return null;
}
