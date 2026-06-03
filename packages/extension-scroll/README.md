# @dev-sujay/omnitracker-extension-scroll

**Scroll Tracking Extension** is a pluggable extension for `@dev-sujay/omnitracker` that monitors user scroll depth milestones (25%, 50%, 75%, and 100%) on webpages using high-performance `IntersectionObserver` triggers.

---

## 📦 Installation

This extension requires the core package `@dev-sujay/omnitracker` as a peer dependency.

```bash
npm install @dev-sujay/omnitracker-extension-scroll
# or
yarn add @dev-sujay/omnitracker-extension-scroll
# or
bun add @dev-sujay/omnitracker-extension-scroll
```

---

## 🚀 Usage

Register the scroll tracking plugin when initializing your `TrackerCore` instance:

```typescript
import { TrackerCore } from '@dev-sujay/omnitracker';
import { ScrollTrackingExtension } from '@dev-sujay/omnitracker-extension-scroll';

const tracker = new TrackerCore({
  apiUrl: 'https://api.yourdomain.com/analytics',
});

// Load the scroll extension
tracker.use(new ScrollTrackingExtension());

tracker.init();
```

---

## ⚙️ How it Works

The extension automatically appends four invisible observer points at critical vertical scroll heights of the page layout. When a user crosses these trigger thresholds:
- It tracks a custom event of type `SCROLL`.
- It sets the event label representing the depth milestone (e.g. `Scroll Depth: 50%`).
- Payne-free tracking: it handles resizing, client height updates, and SPA navigation changes transparently.

---

## 📄 License

Distributed under the MIT License.
