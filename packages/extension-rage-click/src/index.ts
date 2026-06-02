import { TrackerPlugin, ITrackerCore } from '@dev-sujay/omnitracker';

export interface RageClickOptions {
  clickCountThreshold?: number; // default: 3
  timeWindowMs?: number; // default: 500ms
  radiusPx?: number; // default: 40px
  ignoredTags?: string[]; // default: [] (e.g. ['CANVAS', 'VIDEO'])
}

export class RageClickExtension implements TrackerPlugin {
  public readonly name = 'rage-click';
  private tracker: ITrackerCore | null = null;
  private recentClicks: { x: number; y: number; time: number }[] = [];
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private options: Required<RageClickOptions>;

  constructor(options?: RageClickOptions) {
    this.options = {
      clickCountThreshold: options?.clickCountThreshold ?? 3,
      timeWindowMs: options?.timeWindowMs ?? 500,
      radiusPx: options?.radiusPx ?? 40,
      ignoredTags: (options?.ignoredTags ?? []).map((t) => t.toUpperCase()),
    };
  }

  public onInit(tracker: ITrackerCore): void {
    this.tracker = tracker;

    if (typeof window === 'undefined') return;

    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toUpperCase();

      // Check if tag is ignored
      if (
        this.options.ignoredTags.includes(tagName) ||
        target.closest(this.options.ignoredTags.map((t) => t.toLowerCase()).join(','))
      ) {
        return;
      }

      const { clientX, clientY } = e;
      const now = Date.now();

      // Keep only clicks within the time window
      this.recentClicks = this.recentClicks.filter(
        (c) => now - c.time < this.options.timeWindowMs
      );

      this.recentClicks.push({ x: clientX, y: clientY, time: now });

      const count = this.options.clickCountThreshold;
      if (this.recentClicks.length >= count) {
        const last = this.recentClicks[this.recentClicks.length - 1];
        // Filter clicks that are within the allowed radius
        const clustered = this.recentClicks.filter(
          (c) => Math.hypot(c.x - last.x, c.y - last.y) <= this.options.radiusPx
        );

        if (clustered.length >= count && this.tracker) {
          this.recentClicks = []; // Reset clicks queue after detection
          
          const clickable = target.closest('a, button') || target;
          const label =
            clickable.textContent?.trim() ||
            clickable.getAttribute('aria-label') ||
            clickable.getAttribute('title') ||
            clickable.tagName;

          this.tracker.track('RAGE_CLICK', label || 'Element', {
            x: Math.round(clientX),
            y: Math.round(clientY),
            tagName: clickable.tagName,
            href: (clickable as HTMLAnchorElement).href || undefined,
            clickCount: clustered.length,
          });
        }
      }
    };

    document.addEventListener('click', this.clickHandler, { capture: true });
  }

  public onDestroy(): void {
    if (typeof window !== 'undefined' && this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }
}
