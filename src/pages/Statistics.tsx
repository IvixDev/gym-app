import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWorkouts, getExercisesByWorkout, getWorkoutHistory } from '../lib/api';
import ExerciseChart from '../components/ExerciseChart';
import { IconChartLine } from '@tabler/icons-react';

export default function Statistics() {
    const [selectedId, setSelectedId] = useState<string>('');

    const { data: workouts = [] } = useQuery({
        queryKey: ['workouts'],
        queryFn: getWorkouts,
    });

    useEffect(() => {
        if (workouts.length > 0 && !selectedId) {
            setSelectedId(workouts[0].id);
        }
    }, [workouts, selectedId]);

    const { data: exercises = [] } = useQuery({
        queryKey: ['exercises', selectedId],
        queryFn: () => getExercisesByWorkout(selectedId),
        enabled: !!selectedId,
    });

    const { data: history = {} } = useQuery({
        queryKey: ['workout-history', selectedId],
        queryFn: () => getWorkoutHistory(selectedId),
        enabled: !!selectedId,
    });

    return (
        <div className="container pb-lg">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Estadísticas</h1>
                    <p className="page-subtitle">Progreso por rutina y ejercicio</p>
                </div>
            </header>

            {/* Routine selector */}
            <div className="input-group mb-2xl">
                <label className="label-xs">Selecciona una rutina</label>
                <div className="select-wrapper">
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="input-field select-field"
                    >
                        <option value="" disabled>-- Elige una rutina --</option>
                        {workouts.map((w) => (
                            <option key={w.id} value={w.id}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedId && (
                <div className="empty-state" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <IconChartLine size={32} stroke={1.5} />
                    </div>
                    <p style={{ maxWidth: '200px', lineHeight: 1.4 }}>Selecciona una rutina para ver tu progreso histórico</p>
                </div>
            )}

            {selectedId && (
                <div className="flex flex-col gap-lg">
                    {exercises.map((ex) => {
                        const exHistory = history[ex.id] || [];
                        return (
                            <div key={ex.id} style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--space-md)',
                            }}>
                                <div className="flex justify-between items-center mb-md">
                                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700 }}>{ex.name}</h3>
                                    {ex.is_optional && <span className="optional-tag">opcional</span>}
                                </div>

                                <ExerciseChart data={exHistory} />
                            </div>
                        );
                    })}

                    {selectedId && exercises.length === 0 && (
                        <div className="text-center p-lg" style={{ color: 'var(--text-muted)' }}>
                            Esta rutina no tiene ejercicios configurados.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
