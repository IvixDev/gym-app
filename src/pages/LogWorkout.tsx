import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkouts,
    getExercisesByWorkout,
    getLastSessionData,
    getTodayWorkoutLog,
    getDoneExerciseIds,
    saveExerciseSets,
} from '../lib/api';
import type { Exercise, SetLogInput } from '../types';

type LastSessionMap = Record<string, { date: string; sets: { reps: number; weight: number }[] }>;

function buildLogData(exercises: Exercise[]): Record<string, SetLogInput[]> {
    const data: Record<string, SetLogInput[]> = {};
    exercises.forEach((ex) => {
        data[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
            set_number: i + 1,
            reps: '',
            weight: '',
        }));
    });
    return data;
}

const POSITIVE_INT = /^[1-9]\d*$/;
const WEIGHT_PATTERN = /^\d+(\.\d+)?$/;

export default function LogWorkout() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string>('');
    const [logData, setLogData] = useState<Record<string, SetLogInput[]>>({});
    const [submittedExercises, setSubmittedExercises] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

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

    const { data: lastSession = {} } = useQuery({
        queryKey: ['last-session', selectedId, false],
        queryFn: () => getLastSessionData(selectedId, false),
        enabled: !!selectedId
    });

    const { data: todayLog, isFetching: isFetchingTodayLog } = useQuery({
        queryKey: ['today-log', selectedId],
        queryFn: () => getTodayWorkoutLog(selectedId),
        enabled: !!selectedId
    });

    const { data: doneToday = new Set<string>(), isFetching: isFetchingDone } = useQuery({
        queryKey: ['done-today', todayLog?.id],
        queryFn: () => getDoneExerciseIds(todayLog!.id),
        enabled: !!todayLog?.id
    });

    // Hide exercise cards while we're confirming today's completion status
    // to avoid the flicker of marking exercises as done then undone
    const isDoneStateLoading = isFetchingTodayLog || (!!todayLog?.id && isFetchingDone);

    // Initialize log data when exercises change
    useEffect(() => {
        if (exercises.length > 0) {
            setLogData(prev => {
                // Only build if not already present for this workout to avoid resets on re-renders
                const currentKeys = Object.keys(prev);
                const exerciseKeys = exercises.map(ex => ex.id);
                const hasAll = exerciseKeys.every(k => currentKeys.includes(k));
                if (hasAll) return prev;
                return { ...prev, ...buildLogData(exercises) };
            });
        }
    }, [exercises]);

    const saveMutation = useMutation({
        mutationFn: ({ exerciseId, sets }: { exerciseId: string, sets: any[] }) =>
            saveExerciseSets(selectedId, exerciseId, sets),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['today-log', selectedId] });
            queryClient.invalidateQueries({ queryKey: ['done-today'] });
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            // Invalidate both variants (with and without today) so ViewWorkouts also refreshes
            queryClient.invalidateQueries({ queryKey: ['last-session', selectedId, false] });
            queryClient.invalidateQueries({ queryKey: ['last-session', selectedId, true] });
            showToast('✅ Ejercicio guardado');
        },
        onError: () => {
            showToast('❌ Error al guardar', 'error');
        }
    });

    const updateSet = (
        exerciseId: string,
        setIndex: number,
        field: 'reps' | 'weight',
        value: string
    ) => {
        setLogData((prev) => {
            const updated = { ...prev };
            const sets = [...(updated[exerciseId] || [])];
            sets[setIndex] = {
                ...sets[setIndex],
                [field]: value,
            };
            updated[exerciseId] = sets;
            return updated;
        });
    };

    const handleSaveExercise = async (exerciseId: string) => {
        const rawSets = logData[exerciseId];
        if (!rawSets) {
            showToast('No hay datos para guardar.', 'error');
            return;
        }

        setSubmittedExercises(prev => new Set(prev).add(exerciseId));

        const isValid = rawSets.every(s =>
            WEIGHT_PATTERN.test(String(s.weight)) && POSITIVE_INT.test(String(s.reps))
        );
        if (!isValid) {
            showToast('Por favor, rellena todos los campos correctamente.', 'error');
            return;
        }

        const setsToSave = rawSets.map((s) => ({
            set_number: s.set_number,
            reps: Number(s.reps),
            weight: Number(s.weight),
        }));

        saveMutation.mutate({ exerciseId, sets: setsToSave });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
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
                <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }} />
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
                            <option value="" disabled>Selecciona un entrenamiento...</option>
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
            ) : selectedId && (
                <div className="flex flex-col gap-md">
                    {exercises.filter((ex) => !doneToday.has(ex.id)).length === 0 && totalExercises > 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">🎉</span>
                            <h3>¡Sesión completada!</h3>
                            <p>Has registrado todos los ejercicios de hoy.</p>
                        </div>
                    )}

                    {exercises.filter((ex) => !doneToday.has(ex.id)).map((ex) => {
                        const isSaving = saveMutation.isPending && saveMutation.variables?.exerciseId === ex.id;
                        const hasSubmitted = submittedExercises.has(ex.id);
                        const prev = (lastSession as LastSessionMap)[ex.id];

                        return (
                            <div key={ex.id} className="log-exercise-card">
                                <div className="log-exercise-header">
                                    <div>
                                        <div className="exercise-name">{ex.name}</div>
                                        <div className="exercise-target">
                                            {ex.sets} series · {ex.rep_range} reps
                                            {prev && (
                                                <span className="exercise-target-date">
                                                    · último {formatDate(prev.date)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>


                                {(logData[ex.id] || []).map((set, i) => {
                                    const prevSet = prev?.sets[i];
                                    return (
                                        <div key={i} className="set-group">
                                            <div className="set-row">
                                                <span className="set-label">S{set.set_number}</span>
                                                <div style={{ flex: 1 }} className="set-input-wrapper">
                                                    <label className="label-xs">kg</label>
                                                    {prevSet !== undefined && (
                                                        <div className="set-previous-hint">{prevSet.weight}kg</div>
                                                    )}
                                                    <input
                                                        type="text"
                                                        className={`input-field ${(hasSubmitted || set.weight) && !WEIGHT_PATTERN.test(String(set.weight)) ? 'error' : ''}`}
                                                        placeholder={prevSet ? `${prevSet.weight}` : 'kg'}
                                                        value={set.weight}
                                                        onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                                                        inputMode="decimal"
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }} className="set-input-wrapper">
                                                    <label className="label-xs">reps</label>
                                                    {prevSet !== undefined && (
                                                        <div className="set-previous-hint">{prevSet.reps} reps</div>
                                                    )}
                                                    <input
                                                        type="text"
                                                        className={`input-field ${(hasSubmitted || set.reps) && !POSITIVE_INT.test(String(set.reps)) ? 'error' : ''}`}
                                                        placeholder={prevSet ? `${prevSet.reps}` : 'reps'}
                                                        value={set.reps}
                                                        onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                                                        inputMode="numeric"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <button
                                    className="btn btn-primary btn-full"
                                    style={{ marginTop: 'var(--space-md)' }}
                                    onClick={() => handleSaveExercise(ex.id)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Guardando…' : '💾 Guardar ejercicio'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
