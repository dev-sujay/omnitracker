# @dev-sujay/omnitracker-react-admin

**React Admin Analytics SDK** is a React library that provides contexts, hooks, and components to build analytics admin dashboards. It includes prebuilt hooks for fetching sessions, loading replay chunk lists, rendering charts (devices, funnels), and listing active visitors.

---

## 📦 Installation

```bash
npm install @dev-sujay/omnitracker-react-admin
# or
yarn add @dev-sujay/omnitracker-react-admin
# or
bun add @dev-sujay/omnitracker-react-admin
```

---

## 🚀 Usage

### 1. Mount the Context Provider
Wrap your admin panel or dashboard pages in the `<OmniTrackerProvider>` to configure the API base path and authorize headers:

```tsx
import { OmniTrackerProvider } from '@dev-sujay/omnitracker-react-admin';

export default function AdminLayout({ children }) {
  return (
    <OmniTrackerProvider
      baseUrl="https://api.yourdomain.com/analytics"
      getAuthToken={() => localStorage.getItem('admin_token')}
    >
      {children}
    </OmniTrackerProvider>
  );
}
```

---

### 2. Fetch Sessions and Render Lists
You can import ready-made hooks to query sessions, fetch visitor chronologies, or download session replay recordings:

```tsx
import { useSessions, useLiveVisitors } from '@dev-sujay/omnitracker-react-admin';

export function SessionDashboard() {
  const { sessions, total, loading } = useSessions({ page: 1, limit: 10 });
  const { count: liveCount } = useLiveVisitors();

  if (loading) return <p>Loading sessions...</p>;

  return (
    <div>
      <h3>Live Users: {liveCount}</h3>
      <p>Total recorded sessions: {total}</p>
      <ul>
        {sessions.map((s) => (
          <li key={s.session_id}>
            {s.session_id} - {s.browser} ({s.country})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔌 Exported Hooks

- `useSessions(filters)`: Query user sessions list (paginated, with search and filter keys).
- `useSessionJourney(sessionId)`: Fetch the timeline of hits/pages visited during a session.
- `useSessionReplay(sessionId)`: Retrieve the keys of all recorded replay chunk files for a session.
- `useLiveVisitors(withinSeconds)`: Connects to the SSE `/live` endpoint to stream live visitor count.
- `useDashboardSummary()`, `useDeviceBreakdown()`, `useTopPages()`, `useFunnel()`, `useUtmBreakdown()`: Fetch specialized analytics breakdown reports.

---

## 📄 License

Distributed under the MIT License.
