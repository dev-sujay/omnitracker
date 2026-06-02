const QUEUE_KEY = 'ds_tracker_event_queue';
const MAX_QUEUE_SIZE = 25;
const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface QueuedEvent {
  url: string;
  payload: Record<string, unknown>;
  timestamp: number;
  attempts: number;
}

function readQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedEvent[];
    return parsed.filter(
      (e) => Date.now() - e.timestamp < MAX_EVENT_AGE_MS
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full or unavailable
  }
}

export function enqueueFailedEvent(
  url: string,
  payload: Record<string, unknown>
): void {
  const queue = readQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift(); // Drop the oldest event to make room
  }
  queue.push({ url, payload, timestamp: Date.now(), attempts: 0 });
  writeQueue(queue);
}

export async function flushEventQueue(
  apiUrl: string,
  getHeaders: () => Record<string, string>
): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;

  const remaining: QueuedEvent[] = [];

  for (const event of queue) {
    if (event.attempts >= 3) continue; // Drop after 3 failures

    try {
      const res = await fetch(`${apiUrl}${event.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify(event.payload),
        keepalive: true,
      });

      if (!res.ok) {
        remaining.push({ ...event, attempts: event.attempts + 1 });
      }
    } catch {
      remaining.push({ ...event, attempts: event.attempts + 1 });
    }
  }

  writeQueue(remaining);
}
