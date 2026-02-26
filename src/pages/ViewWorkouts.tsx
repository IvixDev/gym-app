import { useState, useEffect } from 'react';
import { getWorkouts, getExercisesByWorkout } from '../lib/api';
import type { Workout, Exercise } from '../types';

export default function ViewWorkouts() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loadingWorkouts, setLoadingWorkouts] = useState(true);
    const [loadingExercises, setLoadingExercises] = useState(false);

    // Load workouts on mount
    useEffect(() => {
        getWorkouts()
            .then((data) => {
                setWorkouts(data);
                if (data.length > 0) setSelectedId(data[0].id);
            })
            .catch(console.error)
            .finally(() => setLoadingWorkouts(false));
    }, []);

    // Load exercises when selection changes
    useEffect(() => {
        if (!selectedId) { setExercises([]); return; }
        setLoadingExercises(true);
        getExercisesByWorkout(selectedId)
            .then(setExercises)
            .catch(console.error)
            .finally(() => setLoadingExercises(false));
    }, [selectedId]);

    const currentWorkout = workouts.find((w) => w.id === selectedId);

    return (
        <div>
            <header className="page-header">
                <h1>Mis Workouts</h1>
                <p>Consulta tus rutinas de entrenamiento</p>
            </header>

            {/* Loading state */}
            {loadingWorkouts && (
                <div className="flex flex-col gap-sm">
                    <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-sm)' }} />
                    <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)', marginTop: 'var(--space-md)' }} />
                    <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
                    <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
                </div>
            )}

            {/* No workouts */}
            {!loadingWorkouts && workouts.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <h3>Sin workouts</h3>
                    <p>Crea tu primer workout en la sección "Crear".</p>
                </div>
            )}

            {/* Workout selector */}
            {!loadingWorkouts && workouts.length > 0 && (
                <>
                    <div className="input-group mb-md">
                        <select
                            className="input-field select-field"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            id="workout-selector"
                        >
                            {workouts.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Exercise list */}
                    {currentWorkout && (
                        <div>
                            <div className="flex justify-between items-center mb-md">
                                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700 }}>
                                    {currentWorkout.name}
                                </h2>
                                <span className="badge">{exercises.length} ejercicios</span>
                            </div>

                            {loadingExercises ? (
                                <div className="flex flex-col gap-sm">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
                                    ))}
                                </div>
                            ) : exercises.length === 0 ? (
                                <div className="empty-state">
                                    <span className="empty-icon">📝</span>
                                    <h3>Sin ejercicios</h3>
                                    <p>Añade ejercicios a este workout desde la sección "Crear".</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {exercises.map((ex, i) => (
                                        <div key={ex.id} className="exercise-item" id={`exercise-${ex.id}`}>
                                            <div className="exercise-info">
                                                <h3>
                                                    <span className="text-muted" style={{ marginRight: 'var(--space-sm)' }}>
                                                        {i + 1}.
                                                    </span>
                                                    {ex.name}
                                                </h3>
                                                <p>
                                                    {ex.sets} series · {ex.rep_range} reps
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
