# @dev-sujay/omnitracker-extension-rage-click

**Rage Click Extension** is a pluggable user frustration detector for `@dev-sujay/omnitracker`. It tracks multiple clicks occurring in rapid succession within a small pixel radius, helping you identify confusing or broken UI components.

---

## 📦 Installation

This extension requires the core package `@dev-sujay/omnitracker` as a peer dependency.

```bash
npm install @dev-sujay/omnitracker-extension-rage-click
# or
yarn add @dev-sujay/omnitracker-extension-rage-click
# or
bun add @dev-sujay/omnitracker-extension-rage-click
```

---

## 🚀 Usage

Register the plugin when initializing your `TrackerCore` instance:

```typescript
import { TrackerCore } from '@dev-sujay/omnitracker';
import { RageClickExtension } from '@dev-sujay/omnitracker-extension-rage-click';

const tracker = new TrackerCore({
  apiUrl: 'https://api.yourdomain.com/analytics',
});

// Load the rage click detector
tracker.use(new RageClickExtension({
  clickCountThreshold: 3, // Trigger on 3 rapid clicks
  timeThresholdMs: 500,    // Within 500 milliseconds
  radiusPx: 40,            // Within a 40px bounding box
}));

tracker.init();
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `clickCountThreshold` | `number` | `3` | The minimum number of clicks required to trigger a rage click event. |
| `timeThresholdMs` | `number` | `500` | The time window (in milliseconds) within which clicks must occur. |
| `radiusPx` | `number` | `40` | The maximum bounding circle radius (in pixels) for the cluster of clicks. |

---

## 📊 Recorded Payload

When user frustration is detected:
- The tracker registers a `Rage Click` custom event.
- It attaches metadata containing coordinates (`x`, `y`), target selector path (e.g. `button#submit`), and inner text of the clicked element for easy debugging.

---

## 📄 License

Distributed under the MIT License.
