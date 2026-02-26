import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWorkouts,
    getExercisesByWorkout,
    createWorkout,
    createExercise,
    updateWorkout,
    updateExercise,
    deleteExercise,
    deleteWorkout,
} from '../lib/api';
import type { Exercise } from '../types';

// ─── Reusable input that works with react-hook-form register ─────────────
function FormField({
    label,
    placeholder,
    error,
    inputMode,
    ...rest
}: {
    label?: string;
    placeholder?: string;
    error?: string;
    inputMode?: 'text' | 'numeric' | 'decimal';
} & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="input-group">
            {label && <label>{label}</label>}
            <input
                type="text"
                className={`input-field ${error ? 'error' : ''}`}
                placeholder={placeholder}
                inputMode={inputMode}
                {...rest}
            />
            {error && <div className="error-text">{error}</div>}
        </div>
    );
}

// ─── Exercise form types ─────────────────────────────────────────────────
type ExerciseFormValues = { name: string; sets: string; rep_range: string };

// ─── Inline edit row for existing exercises ──────────────────────────────
function ExerciseEditRow({
    exercise,
    onSave,
    onDelete,
}: {
    exercise: Exercise;
    onSave: (id: string, fields: any) => void;
    onDelete: (id: string) => void;
}) {
    const [editing, setEditing] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ExerciseFormValues>({
        defaultValues: {
            name: exercise.name,
            sets: String(exercise.sets),
            rep_range: exercise.rep_range,
        },
    });

    const onSubmit = (data: ExerciseFormValues) => {
        onSave(exercise.id, {
            name: data.name.trim(),
            sets: parseInt(data.sets),
            rep_range: data.rep_range,
        });
        setEditing(false);
    };

    if (!editing) {
        return (
            <div className="exercise-item">
                <div className="exercise-info">
                    <h3>{exercise.name}</h3>
                    <p>{exercise.sets} series · {exercise.rep_range} reps</p>
                </div>
                <div className="exercise-actions">
                    <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setEditing(true)}>✏️</button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px' }} onClick={() => onDelete(exercise.id)}>🗑️</button>
                </div>
            </div>
        );
    }

    return (
        <form className="exercise-edit-card" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-md">
                <FormField
                    label="Nombre"
                    placeholder="Ej: Press Banca"
                    error={errors.name?.message}
                    {...register('name', { required: 'Obligatorio' })}
                />
            </div>
            <div className="input-row mb-md">
                <FormField
                    label="Series"
                    placeholder="3"
                    inputMode="numeric"
                    error={errors.sets?.message}
                    {...register('sets', { required: 'Mínimo 1', pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' } })}
                />
                <FormField
                    label="Reps"
                    placeholder="8-12"
                    error={errors.rep_range?.message}
                    {...register('rep_range', { required: 'Ej: 8-12', pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' } })}
                />
            </div>
            <div className="flex gap-sm">
                <button className="btn btn-primary" style={{ flex: 1 }} type="submit">✓ Guardar</button>
                <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>✕</button>
            </div>
        </form>
    );
}

// ─── Inline form for adding a new exercise ───────────────────────────────
function AddExerciseForm({
    onAdd,
    onCancel,
}: {
    onAdd: (data: ExerciseFormValues) => void;
    onCancel: () => void;
}) {
    const { register, handleSubmit, formState: { errors } } = useForm<ExerciseFormValues>();

    return (
        <form className="card mb-md" onSubmit={handleSubmit(onAdd)}>
            <h3 className="card-title mb-sm">Nuevo ejercicio</h3>
            <div className="mb-md">
                <FormField
                    label="Nombre"
                    placeholder="Ej: Press Francés"
                    error={errors.name?.message}
                    {...register('name', { required: 'Obligatorio' })}
                />
            </div>
            <div className="input-row mb-md">
                <FormField
                    label="Series"
                    placeholder="3"
                    inputMode="numeric"
                    error={errors.sets?.message}
                    {...register('sets', { required: 'Mínimo 1', pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' } })}
                />
                <FormField
                    label="Reps"
                    placeholder="8-12"
                    error={errors.rep_range?.message}
                    {...register('rep_range', { required: 'Ej: 8-12', pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' } })}
                />
            </div>
            <div className="flex gap-sm">
                <button className="btn btn-primary" style={{ flex: 1 }} type="submit">✓ Guardar ejercicio</button>
                <button className="btn btn-secondary" type="button" onClick={onCancel}>✕</button>
            </div>
        </form>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function ManageWorkouts() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string>('new');
    const [newExercises, setNewExercises] = useState<ExerciseFormValues[]>([]);
    const [editingName, setEditingName] = useState(false);
    const [addingEx, setAddingEx] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [noExercisesError, setNoExercisesError] = useState(false);

    const msg = (t: string) => {
        setToast(t);
        setTimeout(() => setToast(null), 2000);
    };

    // ── Create workout form ──
    const createForm = useForm<{ workoutName: string }>({ defaultValues: { workoutName: '' } });
    // ── Add exercise to new workout form ──
    const addExForm = useForm<ExerciseFormValues>();
    // ── Edit workout name form ──
    const editNameForm = useForm<{ editName: string }>();

    const { data: workouts = [] } = useQuery({
        queryKey: ['workouts'],
        queryFn: getWorkouts,
    });

    const { data: exercises = [] } = useQuery({
        queryKey: ['exercises', selectedId],
        queryFn: () => getExercisesByWorkout(selectedId),
        enabled: selectedId !== 'new',
    });

    useEffect(() => {
        if (selectedId !== 'new') {
            const w = workouts.find((w) => w.id === selectedId);
            if (w) editNameForm.setValue('editName', w.name);
        }
    }, [selectedId, workouts]);

    // ── Mutations ──
    const createMutation = useMutation({
        mutationFn: async (workoutName: string) => {
            const w = await createWorkout(workoutName);
            await Promise.all(
                newExercises.map((ex, i) =>
                    createExercise(w.id, ex.name, parseInt(ex.sets), ex.rep_range, i)
                )
            );
            return w;
        },
        onSuccess: (w) => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            msg('✅ Workout creado');
            createForm.reset();
            setNewExercises([]);
            setNoExercisesError(false);
            setSelectedId(w.id);
        },
    });

    const updateNameMutation = useMutation({
        mutationFn: (name: string) => updateWorkout(selectedId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setEditingName(false);
            msg('✅ Nombre actualizado');
        },
    });

    const addExMutation = useMutation({
        mutationFn: (data: ExerciseFormValues) =>
            createExercise(selectedId, data.name, parseInt(data.sets), data.rep_range, exercises.length),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            setAddingEx(false);
            msg('✅ Ejercicio añadido');
        },
    });

    const updateExMutation = useMutation({
        mutationFn: ({ id, fields }: { id: string; fields: any }) => updateExercise(id, fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('✅ Actualizado');
        },
    });

    const deleteExMutation = useMutation({
        mutationFn: (id: string) => deleteExercise(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('🗑️ Borrado');
        },
    });

    const deleteWorkoutMutation = useMutation({
        mutationFn: () => deleteWorkout(selectedId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setSelectedId('new');
            msg('🗑️ Borrado');
        },
    });

    // ── Handlers ──
    const handleCreateWorkout = createForm.handleSubmit(({ workoutName }) => {
        if (newExercises.length === 0) {
            setNoExercisesError(true);
            msg('⚠️ Añade al menos un ejercicio');
            return;
        }
        createMutation.mutate(workoutName);
    });

    const handleAddExToNew = addExForm.handleSubmit((data) => {
        setNewExercises((prev) => [...prev, data]);
        addExForm.reset();
        setNoExercisesError(false);
    });

    const handleUpdateName = editNameForm.handleSubmit(({ editName }) => {
        updateNameMutation.mutate(editName);
    });

    return (
        <div className="manage-workouts">
            <div className={`toast success ${toast ? 'show' : ''}`}>{toast}</div>

            <header className="page-header">
                <h1>Rutinas</h1>
                <p>Gestiona tus entrenamientos</p>
            </header>

            <div className="input-group mb-md">
                <div className="select-wrapper">
                    <select
                        className="input-field select-field"
                        value={selectedId}
                        onChange={(e) => {
                            setSelectedId(e.target.value);
                            setEditingName(false);
                            setAddingEx(false);
                        }}
                    >
                        <option value="new">➕ Crear nuevo workout</option>
                        {workouts.length > 0 && (
                            <optgroup label="Editar existente">
                                {workouts.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            {selectedId === 'new' ? (
                <div className="create-section">
                    {/* Workout name */}
                    <div className="mb-md">
                        <FormField
                            label="Nombre del workout"
                            placeholder="Ej: Push Day"
                            error={createForm.formState.errors.workoutName?.message}
                            {...createForm.register('workoutName', { required: 'Obligatorio' })}
                        />
                    </div>

                    {/* No exercises error */}
                    {noExercisesError && newExercises.length === 0 && (
                        <div
                            className="error-text mb-sm"
                            style={{
                                textAlign: 'center',
                                background: 'rgba(248, 113, 113, 0.1)',
                                padding: 'var(--space-sm)',
                                borderRadius: 'var(--radius-sm)',
                            }}
                        >
                            ⚠️ Necesitas añadir al menos un ejercicio antes de guardar
                        </div>
                    )}

                    {/* Added exercises list */}
                    <div className="flex flex-col gap-sm mb-md">
                        {newExercises.map((ex, i) => (
                            <div key={i} className="exercise-item">
                                <div className="exercise-info">
                                    <h3>{ex.name}</h3>
                                    <p>
                                        {ex.sets}x{ex.rep_range}
                                    </p>
                                </div>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => setNewExercises((prev) => prev.filter((_, j) => j !== i))}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add exercise to new workout */}
                    <form className="card mb-md" onSubmit={handleAddExToNew}>
                        <h3 className="card-title mb-sm">Añadir ejercicio</h3>
                        <div className="mb-md">
                            <FormField
                                label="Nombre"
                                placeholder="Ej: Sentadilla"
                                error={addExForm.formState.errors.name?.message}
                                {...addExForm.register('name', { required: 'Obligatorio' })}
                            />
                        </div>
                        <div className="input-row mb-md">
                            <FormField
                                label="Series"
                                placeholder="3"
                                inputMode="numeric"
                                error={addExForm.formState.errors.sets?.message}
                                {...addExForm.register('sets', {
                                    required: 'Mínimo 1',
                                    pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' },
                                })}
                            />
                            <FormField
                                label="Reps"
                                placeholder="8-12"
                                error={addExForm.formState.errors.rep_range?.message}
                                {...addExForm.register('rep_range', {
                                    required: 'Ej: 8-12',
                                    pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' },
                                })}
                            />
                        </div>
                        <button className="btn btn-secondary btn-full" type="submit">
                            Guardar ejercicio
                        </button>
                    </form>

                    <button className="btn btn-primary btn-full btn-lg" onClick={handleCreateWorkout}>
                        💾 Guardar Workout
                    </button>
                </div>
            ) : (
                <div className="edit-section">
                    {/* Workout name */}
                    <div className="card mb-md">
                        {!editingName ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <label className="label-xs">Workout</label>
                                    <div style={{ fontWeight: 700, fontSize: '18px' }}>
                                        {workouts.find((w) => w.id === selectedId)?.name}
                                    </div>
                                </div>
                                <button className="btn btn-secondary" onClick={() => setEditingName(true)}>
                                    ✏️
                                </button>
                            </div>
                        ) : (
                            <form className="flex gap-sm items-end" onSubmit={handleUpdateName}>
                                <FormField
                                    label="Nuevo nombre"
                                    error={editNameForm.formState.errors.editName?.message}
                                    {...editNameForm.register('editName', { required: 'Obligatorio' })}
                                />
                                <button className="btn btn-primary" style={{ padding: '12px 16px' }} type="submit">
                                    ✓
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '12px 16px' }}
                                    type="button"
                                    onClick={() => setEditingName(false)}
                                >
                                    ✕
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Exercise list */}
                    <div className="flex flex-col gap-sm mb-md">
                        <label className="label-xs">Ejercicios</label>
                        {exercises.map((ex) => (
                            <ExerciseEditRow
                                key={ex.id}
                                exercise={ex}
                                onSave={(id, fields) => updateExMutation.mutate({ id, fields })}
                                onDelete={(id) => {
                                    if (confirm('¿Borrar ejercicio?')) deleteExMutation.mutate(id);
                                }}
                            />
                        ))}
                    </div>

                    {/* Add exercise to existing workout */}
                    {!addingEx ? (
                        <button className="btn btn-secondary btn-full mb-md" onClick={() => setAddingEx(true)}>
                            ➕ Añadir ejercicio
                        </button>
                    ) : (
                        <AddExerciseForm
                            onAdd={(data) => addExMutation.mutate(data)}
                            onCancel={() => setAddingEx(false)}
                        />
                    )}

                    <div className="divider" />
                    <button
                        className="btn btn-danger btn-full"
                        onClick={() => {
                            if (confirm('¿Borrar rutina completa?')) deleteWorkoutMutation.mutate();
                        }}
                    >
                        🗑️ Eliminar Workout
                    </button>
                </div>
            )}
        </div>
    );
}
