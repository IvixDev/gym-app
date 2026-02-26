import { useState, useEffect, useCallback } from 'react';
import {
    getWorkouts,
    getExercisesByWorkout,
    getLastSessionData,
    getTodayWorkoutLog,
    getDoneExerciseIds,
    saveExerciseSets,
} from '../lib/api';
import type { Workout, Exercise, SetLogInput } from '../types';

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

export default function LogWorkout() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [lastSession, setLastSession] = useState<LastSessionMap>({});
    const [logData, setLogData] = useState<Record<string, SetLogInput[]>>({});
    // Which exercises are already saved today (locked)
    const [doneToday, setDoneToday] = useState<Set<string>>(new Set());
    // Per-exercise saving state
    const [savingExercise, setSavingExercise] = useState<Record<string, boolean>>({});
    const [loadingWorkouts, setLoadingWorkouts] = useState(true);
    const [loadingExercises, setLoadingExercises] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

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

    // Load exercises + last session + today's done exercises when selection changes
    const loadWorkoutData = useCallback(async (workoutId: string) => {
        if (!workoutId) return;
        setLoadingExercises(true);
        try {
            const [exs, session, todayLog] = await Promise.all([
                getExercisesByWorkout(workoutId),
                getLastSessionData(workoutId),
                getTodayWorkoutLog(workoutId),
            ]);
            setExercises(exs);
            setLastSession(session);
            setLogData(buildLogData(exs));

            // Check which exercises are already done today
            if (todayLog) {
                const done = await getDoneExerciseIds(todayLog.id);
                setDoneToday(done);
            } else {
                setDoneToday(new Set());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExercises(false);
        }
    }, []);

    useEffect(() => {
        loadWorkoutData(selectedId);
    }, [selectedId, loadWorkoutData]);

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
                [field]: value === '' ? '' : parseFloat(value),
            };
            updated[exerciseId] = sets;
            return updated;
        });
    };

    const handleSaveExercise = async (exerciseId: string) => {
        const sets = (logData[exerciseId] || []).map((s) => ({
            set_number: s.set_number,
            reps: Number(s.reps) || 0,
            weight: Number(s.weight) || 0,
        }));

        setSavingExercise((prev) => ({ ...prev, [exerciseId]: true }));
        try {
            await saveExerciseSets(selectedId, exerciseId, sets);
            setDoneToday((prev) => new Set([...prev, exerciseId]));
            showToast('✅ Ejercicio guardado');
        } catch (err) {
            console.error(err);
            showToast('❌ Error al guardar', 'error');
        } finally {
            setSavingExercise((prev) => ({ ...prev, [exerciseId]: false }));
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const totalDone = doneToday.size;
    const totalExercises = exercises.length;

    return (
        <div>
            {/* Toast */}
            <div className={`toast ${toast?.type === 'error' ? '' : 'success'} ${toast ? 'show' : ''}`}>
                {toast?.msg}
            </div>

            <header className="page-header">
                <h1>Entrenar</h1>
                <p>Registra tu sesión de hoy</p>
            </header>

            {/* Workout selector */}
            {loadingWorkouts ? (
                <div className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }} />
            ) : workouts.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">🏋️</span>
                    <h3>Sin workouts</h3>
                    <p>Primero crea un workout en la sección "Crear".</p>
                </div>
            ) : (
                <>
                    <div className="input-group mb-md">
                        <select
                            className="input-field select-field"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            id="log-workout-selector"
                        >
                            {workouts.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Progress bar */}
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

                    {/* Exercise log forms */}
                    {loadingExercises ? (
                        <div className="flex flex-col gap-md">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
                            ))}
                        </div>
                    ) : exercises.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📝</span>
                            <h3>Sin ejercicios</h3>
                            <p>Añade ejercicios a este workout desde la sección "Crear".</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-md">
                            {exercises.filter((ex) => !doneToday.has(ex.id)).length === 0 && (
                                <div className="empty-state">
                                    <span className="empty-icon">🎉</span>
                                    <h3>¡Sesión completada!</h3>
                                    <p>Has registrado todos los ejercicios de hoy.</p>
                                </div>
                            )}
                            {exercises.filter((ex) => !doneToday.has(ex.id)).map((ex) => {
                                const isSaving = savingExercise[ex.id] ?? false;
                                const prev = lastSession[ex.id];

                                return (
                                    <div
                                        key={ex.id}
                                        className="log-exercise-card"
                                        id={`log-exercise-${ex.id}`}
                                    >
                                        {/* Card header */}
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

                                        {/* Column headers */}
                                        <div className="set-row" style={{ marginBottom: 0 }}>
                                            <div className="set-label" />
                                            <div style={{ flex: 1, textAlign: 'center', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                                Peso (kg)
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'center', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                                Reps
                                            </div>
                                        </div>

                                        {/* Set rows */}
                                        {(logData[ex.id] || []).map((set, i) => {
                                            const prevSet = prev?.sets[i];
                                            return (
                                                <div key={i} className="set-group">
                                                    <div className="set-row">
                                                        <span className="set-label">S{set.set_number}</span>
                                                        <div style={{ flex: 1 }} className="set-input-wrapper">
                                                            {prevSet !== undefined && (
                                                                <div className="set-previous-hint">{prevSet.weight}kg</div>
                                                            )}
                                                            <input
                                                                type="number"
                                                                className="input-field"
                                                                placeholder={prevSet ? `${prevSet.weight}` : 'kg'}
                                                                value={set.weight}
                                                                onChange={(e) => updateSet(ex.id, i, 'weight', e.target.value)}
                                                                inputMode="decimal"
                                                                id={`input-weight-${ex.id}-${i}`}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1 }} className="set-input-wrapper">
                                                            {prevSet !== undefined && (
                                                                <div className="set-previous-hint">{prevSet.reps} reps</div>
                                                            )}
                                                            <input
                                                                type="number"
                                                                className="input-field"
                                                                placeholder={prevSet ? `${prevSet.reps}` : 'reps'}
                                                                value={set.reps}
                                                                onChange={(e) => updateSet(ex.id, i, 'reps', e.target.value)}
                                                                inputMode="numeric"
                                                                id={`input-reps-${ex.id}-${i}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Per-exercise save button */}
                                        <button
                                            className="btn btn-primary btn-full"
                                            style={{ marginTop: 'var(--space-md)' }}
                                            onClick={() => handleSaveExercise(ex.id)}
                                            disabled={isSaving}
                                            id={`save-exercise-${ex.id}`}
                                        >
                                            {isSaving ? 'Guardando…' : '💾 Guardar ejercicio'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
