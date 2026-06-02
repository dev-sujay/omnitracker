import { TrackerPlugin, ITrackerCore } from '@dev-sujay/omnitracker';

export class ScrollTrackingExtension implements TrackerPlugin {
  public readonly name = 'scroll-depth';
  private tracker: ITrackerCore | null = null;
  private firedDepths: Set<number> = new Set();
  private observers: IntersectionObserver[] = [];
  private sentinels: HTMLElement[] = [];
  private locationObserver: MutationObserver | null = null;
  private milestones: number[];

  constructor(options?: { milestones?: number[] }) {
    this.milestones = options?.milestones ?? [25, 50, 75, 100];
  }

  public onInit(tracker: ITrackerCore): void {
    this.tracker = tracker;
    this.setupSentinels();

    // Re-setup sentinels when the pathname or URL changes (for SPAs)
    if (typeof window !== 'undefined') {
      let lastUrl = window.location.href;
      this.locationObserver = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          this.firedDepths.clear();
          this.cleanupSentinels();
          // Wait briefly for the SPA content to render before setting up sentinels
          setTimeout(() => this.setupSentinels(), 200);
        }
      });
      this.locationObserver.observe(document, { subtree: true, childList: true });
    }
  }

  public onDestroy(): void {
    this.cleanupSentinels();
    if (this.locationObserver) {
      this.locationObserver.disconnect();
      this.locationObserver = null;
    }
  }

  private setupSentinels(): void {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined' || !this.tracker) return;

    this.milestones.forEach((pct) => {
      const sentinel = document.createElement('div');
      sentinel.style.cssText =
        'position:absolute;left:0;width:1px;height:1px;pointer-events:none;z-index:-9999;visibility:hidden;';
      sentinel.style.top = `${pct}%`;
      sentinel.setAttribute('data-scroll-sentinel', pct.toString());

      document.body.appendChild(sentinel);
      this.sentinels.push(sentinel);

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !this.firedDepths.has(pct) && this.tracker) {
            this.firedDepths.add(pct);
            this.tracker.track('SCROLL', `${pct}%`, { scrollDepth: pct });
          }
        },
        { threshold: 0 }
      );

      observer.observe(sentinel);
      this.observers.push(observer);
    });
  }

  private cleanupSentinels(): void {
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
    this.sentinels.forEach((s) => {
      try {
        if (s.parentNode) {
          s.parentNode.removeChild(s);
        }
      } catch {
        // Ignore removal errors
      }
    });
    this.sentinels = [];
  }
}
