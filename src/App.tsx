import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import ViewWorkouts from './pages/ViewWorkouts';
import CreateWorkout from './pages/CreateWorkout';
import LogWorkout from './pages/LogWorkout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LogWorkout />} />
          <Route path="/workouts" element={<ViewWorkouts />} />
          <Route path="/create" element={<CreateWorkout />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
