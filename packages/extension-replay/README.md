# @dev-sujay/omnitracker-extension-replay

**Session Replay Extension** is a pluggable screen and interaction recorder for `@dev-sujay/omnitracker` powered by `rrweb` and compressed via `pako` (Gzip). It records DOM mutations, scroll actions, clicks, hover paths, and inputs, slicing the output into small, compressed chunks to stream asynchronously to your storage adapter.

---

## 📦 Installation

This extension requires the core package `@dev-sujay/omnitracker` as a peer dependency.

```bash
npm install @dev-sujay/omnitracker-extension-replay
# or
yarn add @dev-sujay/omnitracker-extension-replay
# or
bun add @dev-sujay/omnitracker-extension-replay
```

---

## 🚀 Usage

Register the plugin when initializing your `TrackerCore` instance:

```typescript
import { TrackerCore } from '@dev-sujay/omnitracker';
import { SessionReplayExtension } from '@dev-sujay/omnitracker-extension-replay';

const tracker = new TrackerCore({
  apiUrl: 'https://api.yourdomain.com/analytics',
});

// Load the screen recording extension
tracker.use(new SessionReplayExtension({
  uploadIntervalMs: 60000, // Upload chunks every 60 seconds
  maskAllInputs: true,     // Secure mode: mask all sensitive input text
  ignoreClass: 'ignore-recording', // CSS class to hide specific components
}));

tracker.init();
```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `uploadIntervalMs` | `number` | `60000` (1m) | Frequency of flushing recorded DOM events to the server. |
| `maskAllInputs` | `boolean` | `true` | Masks all user text inputs with asterisks (`***`) for privacy and security. |
| `ignoreClass` | `string` | `'ds-ignore'` | Elements with this CSS class will not record visual mutations or content. |
| `blockClass` | `string` | `'ds-block'` | Elements with this CSS class will render as grey bounding placeholders. |

---

## 🔒 Privacy & Compliance

By default, the replay plugin implements security features to mask input values, preventing keylogging of passwords, email addresses, credit cards, or passwords. Ensure you apply the configured `ignoreClass` or `blockClass` to elements rendering sensitive customer PII.

---

## 📄 License

Distributed under the MIT License.
