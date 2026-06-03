# @dev-sujay/omnitracker

**OmniTracker Core** is the lightweight, zero-dependency client-side tracking and analytics engine. It manages session lifetimes, visitor identities, automatically queues tracking events locally during offline periods, and provides a pluggable middleware/extension model.

---

## 📦 Installation

```bash
npm install @dev-sujay/omnitracker
# or
yarn add @dev-sujay/omnitracker
# or
bun add @dev-sujay/omnitracker
```

---

## 🚀 Quick Start

Initialize the core tracker in your browser entry point (e.g. `index.ts` or a layout component):

```typescript
import { TrackerCore } from '@dev-sujay/omnitracker';

const tracker = new TrackerCore({
  apiUrl: 'https://api.yourdomain.com/analytics',
  getAuthToken: () => localStorage.getItem('user_token'), // Optional auth header mapping
  debug: process.env.NODE_ENV !== 'production',
});

// Initialize and track initial pageview
tracker.init();
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiUrl` | `string` | **Required** | The base URL of the analytics backend (where `/track-site-visit` is mounted). |
| `sessionExpirationTimeout` | `number` | `1800000` (30m) | The duration of inactivity before a session is expired and rotated. |
| `inactivityTimeout` | `number` | `300000` (5m) | The duration of user inactivity before screen recording pauses. |
| `getAuthToken` | `() => string \| null` | `() => null` | Returns the bearer token attached to the `Authorization` header. |
| `customHeaders` | `Record<string, string>`| `{}` | Custom HTTP headers to append to tracking payloads. |
| `debug` | `boolean` | `false` | Enables console debug logs during tracking events. |

---

## 🔌 Using Extensions

Extend the core engine with heavier tracking modules (e.g., scroll tracking, rage clicks, and session replays) only when required:

```typescript
import { ScrollTrackingExtension } from '@dev-sujay/omnitracker-extension-scroll';

tracker.use(new ScrollTrackingExtension());
tracker.init();
```

---

## 📖 API Methods

- `tracker.init()`: Initializes event listeners and registers initial pageviews.
- `tracker.track(eventType, eventLabel, metadata?)`: Triggers a custom tracking event.
- `tracker.trackPageView(title?)`: Triggers page view tracking manually (useful for SPA page transitions).
- `tracker.getSessionId()`: Returns the current active session UUID.
- `tracker.getVisitorId()`: Returns the unique visitor identifier stored locally.
- `tracker.destroy()`: Tears down all event listeners and de-registers registered plugins.

---

## 📄 License

Distributed under the MIT License.
