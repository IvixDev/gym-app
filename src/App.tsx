import { Routes, Route } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Layout from './components/Layout';
import ViewWorkouts from './pages/ViewWorkouts';
import CreateWorkout from './pages/CreateWorkout';
import LogWorkout from './pages/LogWorkout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// Queries that should NOT be persisted to localStorage:
// - 'today-log': changes daily, and its absence triggers a new session
// - 'done-today': returns a Set which doesn't serialize to JSON correctly
const EPHEMERAL_KEYS = ['today-log', 'done-today'];

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0] as string;
            return !EPHEMERAL_KEYS.includes(key);
          },
        },
      }}
    >
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LogWorkout />} />
          <Route path="/workouts" element={<ViewWorkouts />} />
          <Route path="/create" element={<CreateWorkout />} />
        </Route>
      </Routes>
    </PersistQueryClientProvider>
  );
}
