import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorkouts, getExercisesByWorkout, getLastSessionData } from '../lib/api';
import { IconClipboardList, IconNotes } from '@tabler/icons-react';

export default function ViewWorkouts() {
    const [selectedId, setSelectedId] = useState<string>('');

    const { data: workouts = [], isLoading: loadingWorkouts } = useQuery({
        queryKey: ['workouts'],
        queryFn: getWorkouts
    });

    // Set initial selection
    useEffect(() => {
        if (workouts.length > 0 && !selectedId) {
            setSelectedId(workouts[0].id);
        }
    }, [workouts, selectedId]);

    const { data: exercises = [], isLoading: loadingExercises } = useQuery({
        queryKey: ['exercises', selectedId],
        queryFn: () => getExercisesByWorkout(selectedId),
        enabled: !!selectedId
    });

    const { data: lastSession = {}, isFetching: loadingSession } = useQuery({
        queryKey: ['last-session', selectedId, true],
        queryFn: () => getLastSessionData(selectedId, true),
        enabled: !!selectedId
    });

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
                </div>
            )}

            {/* No workouts */}
            {!loadingWorkouts && workouts.length === 0 && (
                <div className="empty-state">
                    <IconClipboardList size={48} stroke={1.5} className="empty-icon" style={{ opacity: 0.5 }} />
                    <h3>Sin workouts</h3>
                    <p>Crea tu primer workout en la sección "Crear".</p>
                </div>
            )}

            {/* Workout selector */}
            {!loadingWorkouts && workouts.length > 0 && (
                <>
                    <div className="input-group mb-md">
                        <div className="select-wrapper">
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
                                    <IconNotes size={48} stroke={1.5} className="empty-icon" style={{ opacity: 0.5 }} />
                                    <h3>Sin ejercicios</h3>
                                    <p>Añade ejercicios a este workout desde la sección "Crear".</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-sm">
                                    {exercises.map((ex, i) => (
                                        <div key={ex.id} className="exercise-item" id={`exercise-${ex.id}`}>
                                            <div style={{ flex: 1 }}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3>
                                                            <span className="text-muted" style={{ marginRight: 'var(--space-sm)' }}>
                                                                {i + 1}.
                                                            </span>
                                                            {ex.name}
                                                        </h3>
                                                        <p className="text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                                                            {ex.sets} series · {ex.rep_range} reps
                                                        </p>
                                                    </div>
                                                </div>

                                                {loadingSession && !lastSession[ex.id] ? (
                                                    <div style={{
                                                        marginTop: 'var(--space-sm)',
                                                        padding: 'var(--space-sm)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                    }}>
                                                        <span className="spinner" />
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cargando sesión…</span>
                                                    </div>
                                                ) : lastSession[ex.id] ? (
                                                    <div style={{
                                                        marginTop: 'var(--space-sm)',
                                                        padding: 'var(--space-sm)',
                                                        background: 'var(--bg-primary)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        borderLeft: '2px solid var(--accent-primary)'
                                                    }}>
                                                        <div className="label-xs" style={{ marginBottom: '4px' }}>Última sesión</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                            {lastSession[ex.id].sets.map((s, idx) => (
                                                                <span key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                                                                    S{idx + 1}: <strong>{s.weight}kg</strong> x {s.reps}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
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
