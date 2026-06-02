import { TrackerPlugin, ITrackerCore } from '@dev-sujay/omnitracker';
import { record } from 'rrweb';
import pako from 'pako';

export interface SessionReplayOptions {
  uploadIntervalMs?: number; // default: 60000 (1 minute)
  checkoutEveryNth?: number; // default: 200
  mousemoveSamplingInterval?: number; // default: 50ms
  maskAllInputs?: boolean; // default: false
}

interface RrwebEvent {
  type: number;
  data: object;
  timestamp: number;
  seq?: number;
}

export class SessionReplayExtension implements TrackerPlugin {
  public readonly name = 'session-replay';
  private tracker: ITrackerCore | null = null;
  private options: Required<SessionReplayOptions>;
  
  private stopRecording: (() => void) | undefined;
  private events: RrwebEvent[] = [];
  private uploadInterval: ReturnType<typeof setInterval> | null = null;
  private isUploading = false;
  private eventCounter = 0;
  private isUnmounted = false;

  private isActive = true;
  private lastActivityLogged = 0;
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private locationObserver: MutationObserver | null = null;

  constructor(options?: SessionReplayOptions) {
    this.options = {
      uploadIntervalMs: options?.uploadIntervalMs ?? 60000,
      checkoutEveryNth: options?.checkoutEveryNth ?? 200,
      mousemoveSamplingInterval: options?.mousemoveSamplingInterval ?? 50,
      maskAllInputs: options?.maskAllInputs ?? false,
    };
  }

  public onInit(tracker: ITrackerCore): void {
    this.tracker = tracker;
    this.isUnmounted = false;

    if (typeof window === 'undefined') return;

    // 1. Restore unsent events + counter from previous page's unmount backup
    this.restoreBackup();

    // 2. Start recording if page is currently visible
    if (document.visibilityState === 'visible') {
      this.initRecording();
      this.resetInactivityTimer();
    } else {
      this.isActive = false;
    }

    // 3. Set up listeners
    this.setupListeners();
  }

  public onDestroy(): void {
    this.isUnmounted = true;
    this.cleanup();
  }

  private initRecording(): void {
    if (this.isUnmounted || !this.isActive) return;

    if (this.stopRecording) {
      this.stopRecording();
    }

    try {
      this.stopRecording = record({
        emit: (event) => {
          const customEvent = event as RrwebEvent;
          customEvent.seq = this.eventCounter++;
          this.events.push(customEvent);
        },
        maskAllInputs: this.options.maskAllInputs,
        sampling: {
          mousemove: this.options.mousemoveSamplingInterval,
        },
        checkoutEveryNth: this.options.checkoutEveryNth,
      });

      // Start periodic uploads
      if (this.uploadInterval) clearInterval(this.uploadInterval);
      this.uploadInterval = setInterval(() => this.uploadReplay(false), this.options.uploadIntervalMs);

    } catch (err) {
      console.error('[Session Replay] Failed to start rrweb recording:', err);
    }
  }

  private async uploadReplay(useKeepalive = false): Promise<void> {
    if (this.events.length === 0 || this.isUploading || !this.tracker) return;
    
    const sessionId = this.tracker.getSessionId();
    if (!sessionId) return;

    this.isUploading = true;
    const eventsToUpload = [...this.events];
    const uploadSize = eventsToUpload.length;

    try {
      const jsonString = JSON.stringify(eventsToUpload);
      const compressed = pako.gzip(jsonString);

      // Keepalive payload limit is typically 64KB
      const shouldKeepalive = useKeepalive && compressed.length < 60000;

      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
      };
      
      const token = this.tracker.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      let response: Response | undefined;
      try {
        response = await fetch(
          `${this.tracker.config.apiUrl}/session-replay/${sessionId}`,
          {
            method: 'POST',
            headers,
            body: compressed,
            keepalive: shouldKeepalive,
          }
        );
      } catch (fetchErr) {
        if (shouldKeepalive) {
          // Fallback if keepalive fetch rejected
          response = await fetch(
            `${this.tracker.config.apiUrl}/session-replay/${sessionId}`,
            {
              method: 'POST',
              headers,
              body: compressed,
            }
          );
        } else {
          throw fetchErr;
        }
      }

      if (response && response.ok) {
        this.events.splice(0, uploadSize);
      }
    } catch (err) {
      console.error('[Session Replay] Upload error:', err);
    } finally {
      this.isUploading = false;
    }
  }

  private setupListeners(): void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.backupUnsent();
        this.goInactive();
      } else {
        sessionStorage.removeItem('ds_unsent_events');
        sessionStorage.removeItem('ds_event_seq_counter');
      }
    };

    const handleBeforeUnload = () => {
      this.backupUnsent();
      this.uploadReplay(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Watch for activity events
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - this.lastActivityLogged < 2000) return;
      this.lastActivityLogged = now;

      // Update session activity time
      localStorage.setItem('ds_tracker_last_activity', now.toString());

      if (!this.isActive) {
        this.isActive = true;
        this.resumeRecording();
      }

      this.resetInactivityTimer();
    };

    activityEvents.forEach((ev) => {
      document.addEventListener(ev, handleUserActivity, { passive: true });
    });

    // Take fresh snapshot on SPA navigation changes
    let lastUrl = window.location.href;
    this.locationObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(() => {
          if (this.stopRecording && record.takeFullSnapshot) {
            record.takeFullSnapshot();
          }
        }, 100);
      }
    });
    this.locationObserver.observe(document, { subtree: true, childList: true });

    // Store cleanup callbacks to execute during unmount
    this.cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      activityEvents.forEach((ev) => {
        document.removeEventListener(ev, handleUserActivity);
      });
      if (this.locationObserver) {
        this.locationObserver.disconnect();
      }
      if (this.uploadInterval) clearInterval(this.uploadInterval);
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      if (this.stopRecording) this.stopRecording();
    };
  }

  private cleanup(): void {}

  private pauseRecording(): void {
    if (this.stopRecording) {
      this.stopRecording();
      this.stopRecording = undefined;
    }
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    this.uploadReplay(true);
  }

  private resumeRecording(): void {
    if (!this.tracker) return;
    // Check if session has expired during the inactive state
    this.tracker.getSessionId();
    this.initRecording();
  }

  private goInactive(): void {
    this.isActive = false;
    this.pauseRecording();
  }

  private resetInactivityTimer(): void {
    if (!this.tracker) return;
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.goInactive();
    }, this.tracker.config.inactivityTimeout);
  }

  private backupUnsent(): void {
    if (this.events.length > 0) {
      try {
        sessionStorage.setItem('ds_unsent_events', JSON.stringify(this.events));
        sessionStorage.setItem('ds_event_seq_counter', this.eventCounter.toString());
      } catch {
        // storage full
      }
    }
  }

  private restoreBackup(): void {
    try {
      const restoredCounter = sessionStorage.getItem('ds_event_seq_counter');
      if (restoredCounter) {
        this.eventCounter = parseInt(restoredCounter, 10) || 0;
      }
      const restored = sessionStorage.getItem('ds_unsent_events');
      if (restored) {
        const parsed = JSON.parse(restored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.events = parsed as RrwebEvent[];
        }
      }
    } catch {
      // ignore
    } finally {
      sessionStorage.removeItem('ds_unsent_events');
      sessionStorage.removeItem('ds_event_seq_counter');
    }
  }
}
