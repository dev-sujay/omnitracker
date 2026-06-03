import { TrackerStorage, SiteVisitPayload } from './types.js';

export class EventTracker {
  private storage: TrackerStorage;

  constructor(storage: TrackerStorage) {
    this.storage = storage;
  }

  public async trackEvent(payload: {
    sessionId: string;
    eventType: string;
    eventLabel: string;
    pageUrl: string;
    metadata?: string | Record<string, string | number | boolean | null | undefined>;
    customerId?: string | null;
  }): Promise<void> {
    const metaStr = payload.metadata
      ? typeof payload.metadata === 'string'
        ? payload.metadata
        : JSON.stringify(payload.metadata)
      : null;

    await this.storage.saveSiteVisit({
      sessionId: payload.sessionId,
      eventType: payload.eventType as SiteVisitPayload['eventType'],
      eventLabel: payload.eventLabel,
      pageUrl: payload.pageUrl,
      metadata: metaStr,
      customerId: payload.customerId,
    });
  }

  public async trackPurchase(payload: {
    sessionId: string;
    orderId: number;
    customerId?: string | null;
  }): Promise<void> {
    await this.trackEvent({
      sessionId: payload.sessionId,
      eventType: 'CUSTOM',
      eventLabel: `Purchase: Order #${payload.orderId}`,
      pageUrl: '/checkout',
      metadata: {
        order_id: payload.orderId,
        event: 'PURCHASE',
      },
      customerId: payload.customerId,
    });
  }
}
