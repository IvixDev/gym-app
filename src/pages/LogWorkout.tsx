import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
    IconDeviceFloppy,
    IconNotes,
    IconConfetti,
    IconCircleCheck,
    IconAlertCircle,
    IconPlus,
    IconEdit,
} from '@tabler/icons-react';

type LastSessionMap = Record<string, { date: string; sets: { reps: number; weight: number; rir: number | null }[] }>;

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
    lastSession?: { date: string; sets: { reps: number; weight: number; rir: number | null }[] };
    onSave: (exerciseId: string, sets: { set_number: number; reps: number; weight: number; rir: number | null }[]) => void;
    isSaving: boolean;
}) {
    const defaultValues: SetFormValues = {};
    for (let i = 0; i < exercise.sets; i++) {
        defaultValues[`weight_${i}`] = '';
        defaultValues[`reps_${i}`] = '';
        defaultValues[`rir_${i}`] = '';
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
            rir: data[`rir_${i}`] === '' ? null : Number(data[`rir_${i}`]),
        }));
        onSave(exercise.id, sets);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <form className={`exercise-section ${exercise.is_optional ? 'exercise-section--optional' : ''}`} onSubmit={handleSubmit(onSubmit)}>
            {/* Exercise title strip */}
            <div className="exercise-section-header">
                <div className="exercise-section-title">
                    <span className="exercise-section-name">
                        {exercise.name}
                        {exercise.is_optional && <span className="optional-tag">opcional</span>}
                    </span>
                    {lastSession && (
                        <span className="exercise-section-date">
                            {formatDate(lastSession.date)}
                        </span>
                    )}
                </div>

            </div>

            {/* Sets table */}
            <div className="sets-table">
                {/* Table header */}
                <div className="sets-table-head">
                    <span className="sets-col-set">SET</span>
                    <span className="sets-col-prev">ANTERIOR</span>
                    <span className="sets-col-input">KG</span>
                    <span className="sets-col-input">
                        REPS <span style={{ textTransform: 'lowercase', color: 'var(--text-muted)', fontWeight: 'normal' }}>({exercise.rep_range})</span>
                    </span>
                    <span className="sets-col-input">RIR</span>
                </div>

                {/* Table rows */}
                {Array.from({ length: exercise.sets }, (_, i) => {
                    const prevSet = lastSession?.sets[i];
                    return (
                        <div key={i} className="sets-table-row">
                            <span className="sets-col-set sets-row-num">{i + 1}</span>
                            <span className="sets-col-prev sets-row-prev">
                                {prevSet ? `${prevSet.weight}kg × ${prevSet.reps}` : '—'}
                            </span>
                            <div className="sets-col-input">
                                <input
                                    type="text"
                                    className={`sets-input ${errors[`weight_${i}`] ? 'sets-input-error' : ''}`}
                                    placeholder={prevSet ? `${prevSet.weight}` : '0'}
                                    inputMode="decimal"
                                    {...register(`weight_${i}`, {
                                        required: true,
                                        pattern: /^\d+(\.\d+)?$/,
                                    })}
                                />
                            </div>
                            <div className="sets-col-input">
                                <input
                                    type="text"
                                    className={`sets-input ${errors[`reps_${i}`] ? 'sets-input-error' : ''}`}
                                    placeholder={prevSet ? `${prevSet.reps}` : '0'}
                                    inputMode="numeric"
                                    {...register(`reps_${i}`, {
                                        required: true,
                                        pattern: /^[1-9]\d*$/,
                                    })}
                                />
                            </div>
                            <div className="sets-col-input">
                                <input
                                    type="text"
                                    className={`sets-input ${errors[`rir_${i}`] ? 'sets-input-error' : ''}`}
                                    placeholder={prevSet?.rir !== undefined && prevSet?.rir !== null ? `${prevSet.rir}` : '—'}
                                    inputMode="numeric"
                                    {...register(`rir_${i}`, {
                                        required: false,
                                        pattern: /^[0-9]\d*$/,
                                    })}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Save button */}
            <button
                className="exercise-section-save"
                type="submit"
                disabled={isSaving}
            >
                {isSaving ? (
                    <><span className="spinner" /> Guardando…</>
                ) : (
                    <><IconDeviceFloppy size={16} /> Guardar</>
                )}
            </button>
        </form>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function LogWorkout() {
    const navigate = useNavigate();
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
            showToast('Ejercicio guardado');
        },
        onError: () => {
            showToast('Error al guardar', 'error');
        },
    });

    const handleSaveExercise = (exerciseId: string, sets: { set_number: number; reps: number; weight: number }[]) => {
        saveMutation.mutate({ exerciseId, sets });
    };

    const requiredExercises = exercises.filter((ex) => !ex.is_optional);
    const totalDone = requiredExercises.filter((ex) => doneToday.has(ex.id)).length;
    const totalRequired = requiredExercises.length;

    return (
        <div className="log-workout-page">
            <div className={`toast ${toast?.type === 'error' ? '' : 'success'} ${toast ? 'show' : ''}`}>
                {toast?.type === 'error' ? <IconAlertCircle size={18} /> : <IconCircleCheck size={18} />}
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
                    <IconPlus size={48} stroke={1.5} className="empty-icon" style={{ opacity: 0.5 }} />
                    <h3>Sin rutinas</h3>
                    <p className="mb-md">Crea tu primera rutina para empezar.</p>
                    <button className="btn btn-primary" onClick={() => navigate('/create')}>
                        Crear rutina
                    </button>
                </div>
            ) : (
                <div className="flex gap-sm items-center mb-md">
                    <div className="input-group" style={{ flex: 1 }}>
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
                    {selectedId && (
                        <button
                            className="btn btn-secondary icon-btn"
                            title="Editar rutina"
                            onClick={() => navigate(`/create?edit=${selectedId}`)}
                        >
                            <IconEdit size={20} />
                        </button>
                    )}
                </div>
            )}

            {!loadingExercises && totalRequired > 0 && (
                <div className="session-progress mb-md">
                    <div className="session-progress-header">
                        <span className="session-progress-label">Progreso de hoy</span>
                        <span className="session-progress-count">
                            {totalDone}/{totalRequired}
                        </span>
                    </div>
                    <div className="session-progress-bar">
                        <div
                            className="session-progress-fill"
                            style={{ width: `${totalRequired > 0 ? (totalDone / totalRequired) * 100 : 0}%` }}
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
                    <IconNotes size={48} stroke={1.5} className="empty-icon" style={{ opacity: 0.5 }} />
                    <h3>Sin ejercicios</h3>
                    <p>Añade ejercicios desde el botón de editar.</p>
                </div>
            ) : (
                selectedId && (
                    <div className="flex flex-col gap-md">
                        {requiredExercises.filter((ex) => !doneToday.has(ex.id)).length === 0 && requiredExercises.length > 0 && (
                            <div className="empty-state">
                                <IconConfetti size={48} stroke={1.5} className="empty-icon" style={{ opacity: 0.5 }} />
                                <h3>¡Sesión completada!</h3>
                                <p>Has completado tu objetivo de hoy.</p>
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

            {/* Floating Action Button */}
            <button
                className="fab"
                title="Crear nuevo workout"
                onClick={() => navigate('/create')}
                id="fab-create-workout"
            >
                <IconPlus size={28} stroke={2.5} />
            </button>
        </div>
    );
}
