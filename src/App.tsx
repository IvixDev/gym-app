import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ViewWorkouts from './pages/ViewWorkouts';
import CreateWorkout from './pages/CreateWorkout';
import LogWorkout from './pages/LogWorkout';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ViewWorkouts />} />
        <Route path="/create" element={<CreateWorkout />} />
        <Route path="/log" element={<LogWorkout />} />
      </Route>
    </Routes>
  );
}
