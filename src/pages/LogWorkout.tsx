import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkouts,
    getExercisesByWorkout,
    getLastSessionData,
    getTodayWorkoutLog,
    getDoneExerciseIds,
    saveExerciseSets,
} from '../lib/api';
import type { Exercise } from '../types';

type LastSessionMap = Record<string, { date: string; sets: { reps: number; weight: number }[] }>;

// ─── Dynamic form type: { weight_0: string, reps_0: string, weight_1: string, ... }
type SetFormValues = Record<string, string>;

// ─── Per-exercise form component ─────────────────────────────────────────
function ExerciseLogForm({
    exercise,
    lastSession,
    onSave,
    isSaving,
}: {
    exercise: Exercise;
    lastSession?: { date: string; sets: { reps: number; weight: number }[] };
    onSave: (exerciseId: string, sets: { set_number: number; reps: number; weight: number }[]) => void;
    isSaving: boolean;
}) {
    // Build default values for this exercise's sets
    const defaultValues: SetFormValues = {};
    for (let i = 0; i < exercise.sets; i++) {
        defaultValues[`weight_${i}`] = '';
        defaultValues[`reps_${i}`] = '';
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SetFormValues>({ defaultValues });

    const onSubmit = (data: SetFormValues) => {
        const sets = Array.from({ length: exercise.sets }, (_, i) => ({
            set_number: i + 1,
            reps: Number(data[`reps_${i}`]),
            weight: Number(data[`weight_${i}`]),
        }));
        onSave(exercise.id, sets);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <form className="log-exercise-card" onSubmit={handleSubmit(onSubmit)}>
            <div className="log-exercise-header">
                <div>
                    <div className="exercise-name">{exercise.name}</div>
                    <div className="exercise-target">
                        {exercise.sets} series · {exercise.rep_range} reps
                        {lastSession && (
                            <span className="exercise-target-date">
                                · último {formatDate(lastSession.date)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Column headers */}
            <div className="set-row" style={{ marginBottom: '4px' }}>
                <span className="set-label" />
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <span className="label-xs">KG</span>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <span className="label-xs">REPS</span>
                </div>
            </div>

            {Array.from({ length: exercise.sets }, (_, i) => {
                const prevSet = lastSession?.sets[i];
                return (
                    <div key={i} className="set-group">
                        <div className="set-row">
                            <span className="set-label">S{i + 1}</span>
                            <div style={{ flex: 1 }} className="set-input-wrapper">
                                {prevSet !== undefined && (
                                    <div className="set-previous-hint">{prevSet.weight}kg</div>
                                )}
                                <input
                                    type="text"
                                    className={`input-field ${errors[`weight_${i}`] ? 'error' : ''}`}
                                    placeholder={prevSet ? `${prevSet.weight}` : 'kg'}
                                    inputMode="decimal"
                                    {...register(`weight_${i}`, {
                                        required: true,
                                        pattern: /^\d+(\.\d+)?$/,
                                    })}
                                />
                            </div>
                            <div style={{ flex: 1 }} className="set-input-wrapper">
                                {prevSet !== undefined && (
                                    <div className="set-previous-hint">{prevSet.reps}</div>
                                )}
                                <input
                                    type="text"
                                    className={`input-field ${errors[`reps_${i}`] ? 'error' : ''}`}
                                    placeholder={prevSet ? `${prevSet.reps}` : 'reps'}
                                    inputMode="numeric"
                                    {...register(`reps_${i}`, {
                                        required: true,
                                        pattern: /^[1-9]\d*$/,
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}

            <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 'var(--space-md)' }}
                type="submit"
                disabled={isSaving}
            >
                {isSaving ? 'Guardando…' : '💾 Guardar ejercicio'}
            </button>
        </form>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function LogWorkout() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string>('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

    const { data: workouts = [], isLoading: loadingWorkouts } = useQuery({
        queryKey: ['workouts'],
        queryFn: getWorkouts,
    });

    useEffect(() => {
        if (workouts.length > 0 && !selectedId) {
            setSelectedId(workouts[0].id);
        }
    }, [workouts, selectedId]);

    const { data: exercises = [], isLoading: loadingExercises } = useQuery({
        queryKey: ['exercises', selectedId],
        queryFn: () => getExercisesByWorkout(selectedId),
        enabled: !!selectedId,
    });

    const { data: lastSession = {} } = useQuery({
        queryKey: ['last-session', selectedId, false],
        queryFn: () => getLastSessionData(selectedId, false),
        enabled: !!selectedId,
    });

    const { data: todayLog, isFetching: isFetchingTodayLog } = useQuery({
        queryKey: ['today-log', selectedId],
        queryFn: () => getTodayWorkoutLog(selectedId),
        enabled: !!selectedId,
    });

    const { data: doneToday = new Set<string>(), isFetching: isFetchingDone } = useQuery({
        queryKey: ['done-today', todayLog?.id],
        queryFn: () => getDoneExerciseIds(todayLog!.id),
        enabled: !!todayLog?.id,
        select: (data): Set<string> => (data instanceof Set ? data : new Set(Array.from(data as any))),
    });

    const isDoneStateLoading = isFetchingTodayLog || (!!todayLog?.id && isFetchingDone);

    const saveMutation = useMutation({
        mutationFn: ({ exerciseId, sets }: { exerciseId: string; sets: any[] }) =>
            saveExerciseSets(selectedId, exerciseId, sets),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['today-log', selectedId] });
            queryClient.invalidateQueries({ queryKey: ['done-today'] });
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            queryClient.invalidateQueries({ queryKey: ['last-session', selectedId, false] });
            queryClient.invalidateQueries({ queryKey: ['last-session', selectedId, true] });
            showToast('✅ Ejercicio guardado');
        },
        onError: () => {
            showToast('❌ Error al guardar', 'error');
        },
    });

    const handleSaveExercise = (exerciseId: string, sets: { set_number: number; reps: number; weight: number }[]) => {
        saveMutation.mutate({ exerciseId, sets });
    };

    const totalDone = doneToday.size;
    const totalExercises = exercises.length;

    return (
        <div className="log-workout-page">
            <div className={`toast ${toast?.type === 'error' ? '' : 'success'} ${toast ? 'show' : ''}`}>
                {toast?.msg}
            </div>

            <header className="page-header">
                <h1>Entrenar</h1>
                <p>Registra tu sesión de hoy</p>
            </header>

            {loadingWorkouts ? (
                <div
                    className="skeleton"
                    style={{ height: 48, borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}
                />
            ) : workouts.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">🏋️</span>
                    <h3>Sin workouts</h3>
                    <p>Primero crea un workout en la sección "Rutinas".</p>
                </div>
            ) : (
                <div className="input-group mb-md">
                    <div className="select-wrapper">
                        <select
                            id="log-workout-selector"
                            className="input-field select-field"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                        >
                            <option value="" disabled>
                                Selecciona un entrenamiento...
                            </option>
                            {workouts.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {!loadingExercises && totalExercises > 0 && (
                <div className="session-progress mb-md">
                    <div className="session-progress-header">
                        <span className="session-progress-label">Progreso de hoy</span>
                        <span className="session-progress-count">
                            {totalDone}/{totalExercises}
                        </span>
                    </div>
                    <div className="session-progress-bar">
                        <div
                            className="session-progress-fill"
                            style={{ width: `${(totalDone / totalExercises) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {loadingExercises || isDoneStateLoading ? (
                <div className="flex flex-col gap-md">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            ) : exercises.length === 0 && selectedId ? (
                <div className="empty-state">
                    <span className="empty-icon">📝</span>
                    <h3>Sin ejercicios</h3>
                    <p>Añade ejercicios a este workout desde la sección "Rutinas".</p>
                </div>
            ) : (
                selectedId && (
                    <div className="flex flex-col gap-md">
                        {exercises.filter((ex) => !doneToday.has(ex.id)).length === 0 && totalExercises > 0 && (
                            <div className="empty-state">
                                <span className="empty-icon">🎉</span>
                                <h3>¡Sesión completada!</h3>
                                <p>Has registrado todos los ejercicios de hoy.</p>
                            </div>
                        )}

                        {exercises
                            .filter((ex) => !doneToday.has(ex.id))
                            .map((ex) => (
                                <ExerciseLogForm
                                    key={ex.id}
                                    exercise={ex}
                                    lastSession={(lastSession as LastSessionMap)[ex.id]}
                                    onSave={handleSaveExercise}
                                    isSaving={saveMutation.isPending && saveMutation.variables?.exerciseId === ex.id}
                                />
                            ))}
                    </div>
                )
            )}
        </div>
    );
}
