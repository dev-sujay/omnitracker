# Client Core SDK

The client SDK consists of `@dev-sujay/omnitracker` and its companion extensions.

---

## `TrackerCore` Config Options

Pass these options to the `TrackerCore` constructor:

```typescript
const tracker = new TrackerCore(config);
```

| Config Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`apiUrl`** | `string` | *Required* | Path prefix of the tracker backend. |
| **`sessionExpirationTimeout`** | `number` | `1800000` (30m) | Inactivity time after which the session ID expires. |
| **`inactivityTimeout`** | `number` | `300000` (5m) | Idle duration after which extensions pause recording. |
| **`getAuthToken`** | `() => string \| null` | `() => null` | Returns a JWT bearer token to include in the Authorization header. |
| **`customHeaders`** | `Record<string, string>` | `{}` | Key-value pairs of extra request headers. |
| **`debug`** | `boolean` | `false` | Enables browser developer console log tracing. |

---

## Extension Options

### 1. `SessionReplayExtension`
Records browser canvas/DOM mutations and compresses uploads.

```typescript
new SessionReplayExtension({
  uploadIntervalMs: 60000,          // Time interval to upload chunks (default 1 min)
  checkoutEveryNth: 200,            // Create full DOM snapshot every N mutations (default 200)
  mousemoveSamplingInterval: 50,    // Mouse coordinates recording interval in ms (default 50)
  maskAllInputs: false              // Mask user inputs with asterisks for privacy (default false)
})
```

### 2. `RageClickExtension`
Tracks clicks that happen in close proximity and fast sequence.

```typescript
new RageClickExtension({
  clickCountThreshold: 3,  // Number of clicks to trigger a rage click (default 3)
  timeWindowMs: 500,       // Time window in ms (default 500)
  radiusPx: 40,            // Click grouping radius in pixels (default 40)
  ignoredTags: ['CANVAS']  // Array of DOM tags to ignore
})
```

### 3. `ScrollTrackingExtension`
Tracks page scroll milestones using intersection sentinels.

```typescript
new ScrollTrackingExtension({
  milestones: [25, 50, 75, 100] // Percentage triggers (default: 25%, 50%, 75%, 100%)
})
```
