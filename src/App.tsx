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

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
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
