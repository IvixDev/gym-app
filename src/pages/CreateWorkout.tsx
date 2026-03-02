import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import {
    IconEdit,
    IconTrash,
    IconCheck,
    IconX,
    IconPlus,
    IconDeviceFloppy,
    IconAlertTriangle,
    IconCircleCheck,
    IconArrowLeft
} from '@tabler/icons-react';

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
type ExerciseFormValues = { name: string; sets: string; rep_range: string; is_optional: boolean };

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
            is_optional: exercise.is_optional,
        },
    });

    const onSubmit = (data: ExerciseFormValues) => {
        onSave(exercise.id, {
            name: data.name.trim(),
            sets: parseInt(data.sets),
            rep_range: data.rep_range,
            is_optional: data.is_optional,
        });
        setEditing(false);
    };

    if (!editing) {
        return (
            <div className={`exercise-list-item ${exercise.is_optional ? 'exercise-list-item--optional' : ''}`}>
                <div className="exercise-list-info">
                    <span className="exercise-section-name">
                        {exercise.name}{exercise.is_optional && <span className="optional-tag">opcional</span>}
                    </span>
                    <span className="text-secondary" style={{ fontSize: 'var(--font-sm)' }}>
                        {exercise.sets} × {exercise.rep_range}
                    </span>
                </div>
                <div className="exercise-list-actions">
                    <button type="button" className="btn btn-secondary icon-btn btn-sm" onClick={() => setEditing(true)}>
                        <IconEdit size={16} />
                    </button>
                    <button type="button" className="btn btn-danger icon-btn btn-sm" onClick={() => onDelete(exercise.id)}>
                        <IconTrash size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form className="exercise-form-inline" onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-xs">
                <FormField
                    placeholder="Nombre del ejercicio (ej. Press Banca)"
                    error={errors.name?.message}
                    {...register('name', { required: 'Obligatorio' })}
                />
            </div>
            <div className="input-row mb-xs">
                <FormField
                    placeholder="Series (ej. 3)"
                    inputMode="numeric"
                    error={errors.sets?.message}
                    {...register('sets', { required: 'Mínimo 1', pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' } })}
                />
                <FormField
                    placeholder="Reps (ej. 8-12)"
                    error={errors.rep_range?.message}
                    {...register('rep_range', { required: 'Ej: 8-12', pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' } })}
                />
            </div>
            <div className="flex items-center justify-between mt-sm">
                <label className="toggle-row mb-0">
                    <span className="toggle-label" style={{ fontSize: '0.75rem' }}>Opcional</span>
                    <input type="checkbox" className="toggle-input" {...register('is_optional')} />
                    <span className="toggle-switch" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }} />
                </label>
                <div className="flex gap-sm">
                    <button className="exercise-section-cancel m-0" type="button" onClick={() => setEditing(false)}>
                        <IconX size={16} />
                    </button>
                    <button className="exercise-section-save m-0" type="submit">
                        <IconCheck size={16} /> Guardar
                    </button>
                </div>
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
    const { register, handleSubmit, formState: { errors } } = useForm<ExerciseFormValues>({ defaultValues: { is_optional: false } });

    return (
        <form className="exercise-form-inline add-new" onSubmit={handleSubmit(onAdd)}>
            <div className="flex items-center gap-xs mb-md">
                <IconPlus size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Nuevo ejercicio</span>
            </div>
            <div className="mb-xs">
                <FormField
                    placeholder="Nombre del ejercicio (ej. Press Francés)"
                    error={errors.name?.message}
                    {...register('name', { required: 'Obligatorio' })}
                />
            </div>
            <div className="input-row mb-xs">
                <FormField
                    placeholder="Series (ej. 3)"
                    inputMode="numeric"
                    error={errors.sets?.message}
                    {...register('sets', { required: 'Mínimo 1', pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' } })}
                />
                <FormField
                    placeholder="Reps (ej. 8-12)"
                    error={errors.rep_range?.message}
                    {...register('rep_range', { required: 'Ej: 8-12', pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' } })}
                />
            </div>
            <div className="flex items-center justify-between mt-sm">
                <label className="toggle-row mb-0">
                    <span className="toggle-label" style={{ fontSize: '0.75rem' }}>Opcional</span>
                    <input type="checkbox" className="toggle-input" {...register('is_optional')} />
                    <span className="toggle-switch" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }} />
                </label>
                <div className="flex gap-sm">
                    <button className="exercise-section-cancel m-0" type="button" onClick={onCancel}>
                        <IconX size={16} />
                    </button>
                    <button className="exercise-section-save m-0" type="submit">
                        <IconPlus size={16} /> Añadir
                    </button>
                </div>
            </div>
        </form>
    );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function ManageWorkouts() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string>(editId || 'new');
    const [newExercises, setNewExercises] = useState<ExerciseFormValues[]>([]);
    const [editingName, setEditingName] = useState(false);
    const [addingEx, setAddingEx] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [noExercisesError, setNoExercisesError] = useState(false);

    const msg = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
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
                    createExercise(w.id, ex.name, parseInt(ex.sets), ex.rep_range, i, ex.is_optional)
                )
            );
            return w;
        },
        onSuccess: (w) => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            msg('Rutina creada');
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
            msg('Nombre actualizado');
        },
    });

    const addExMutation = useMutation({
        mutationFn: (data: ExerciseFormValues) =>
            createExercise(selectedId, data.name, parseInt(data.sets), data.rep_range, exercises.length, data.is_optional),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            setAddingEx(false);
            msg('Ejercicio añadido');
        },
    });

    const updateExMutation = useMutation({
        mutationFn: ({ id, fields }: { id: string; fields: any }) => updateExercise(id, fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('Actualizado');
        },
    });

    const deleteExMutation = useMutation({
        mutationFn: (id: string) => deleteExercise(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('Borrado');
        },
    });

    const deleteWorkoutMutation = useMutation({
        mutationFn: () => deleteWorkout(selectedId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setSelectedId('new');
            msg('Borrado');
        },
    });

    // ── Handlers ──
    const handleCreateWorkout = createForm.handleSubmit(({ workoutName }) => {
        if (newExercises.length === 0) {
            setNoExercisesError(true);
            msg('Añade al menos un ejercicio', 'error');
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
            <div className={`toast ${toast?.type === 'error' ? '' : 'success'} ${toast ? 'show' : ''}`}>
                {toast?.type === 'error' ? <IconAlertTriangle size={18} /> : (toast?.text.includes('Borrado') ? <IconTrash size={18} /> : <IconCircleCheck size={18} />)}
                {toast?.text}
            </div>

            <div className="flex items-center gap-sm mb-md">
                <button className="btn btn-secondary icon-btn" onClick={() => navigate('/')} title="Volver">
                    <IconArrowLeft size={20} />
                </button>
                <h1 style={{
                    fontSize: 'var(--font-xl)',
                    fontWeight: 800,
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    {selectedId === 'new' ? 'Nueva Rutina' : 'Editar Rutina'}
                </h1>
            </div>

            {selectedId === 'new' ? (
                <div className="create-section">
                    {/* Workout name */}
                    <div className="mb-md">
                        <FormField
                            label="Nombre de la rutina"
                            placeholder="Ej: Push Day"
                            error={createForm.formState.errors.workoutName?.message}
                            {...createForm.register('workoutName', { required: 'Obligatorio' })}
                        />
                    </div>

                    {/* No exercises error */}
                    {noExercisesError && newExercises.length === 0 && (
                        <div
                            className="error-text mb-sm flex items-center gap-sm justify-center"
                            style={{
                                background: 'rgba(248, 113, 113, 0.1)',
                                padding: 'var(--space-sm)',
                                borderRadius: 'var(--radius-sm)',
                            }}
                        >
                            <IconAlertTriangle size={18} />
                            Necesitas añadir al menos un ejercicio antes de guardar
                        </div>
                    )}

                    {/* Added exercises list */}
                    <div className="flex flex-col gap-sm mb-md">
                        {newExercises.map((ex, i) => (
                            <div key={i} className={`exercise-list-item ${ex.is_optional ? 'exercise-list-item--optional' : ''}`}>
                                <div className="exercise-list-info">
                                    <span className="exercise-section-name">
                                        {ex.name}{ex.is_optional && <span className="optional-tag">opcional</span>}
                                    </span>
                                    <span className="text-secondary" style={{ fontSize: 'var(--font-sm)' }}>
                                        {ex.sets} × {ex.rep_range}
                                    </span>
                                </div>
                                <div className="exercise-list-actions">
                                    <button
                                        type="button"
                                        className="btn btn-danger icon-btn btn-sm"
                                        onClick={() => setNewExercises((prev) => prev.filter((_, j) => j !== i))}
                                    >
                                        <IconTrash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add exercise to new workout */}
                    <form className="exercise-form-inline add-new" onSubmit={handleAddExToNew}>
                        <div className="flex items-center gap-xs mb-md">
                            <IconPlus size={16} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Nuevo ejercicio</span>
                        </div>
                        <div className="mb-xs">
                            <FormField
                                placeholder="Nombre (ej. Sentadilla)"
                                error={addExForm.formState.errors.name?.message}
                                {...addExForm.register('name', { required: 'Obligatorio' })}
                            />
                        </div>
                        <div className="input-row mb-xs">
                            <FormField
                                placeholder="Series (ej. 3)"
                                inputMode="numeric"
                                error={addExForm.formState.errors.sets?.message}
                                {...addExForm.register('sets', {
                                    required: 'Mínimo 1',
                                    pattern: { value: /^[1-9]\d*$/, message: 'Mínimo 1' },
                                })}
                            />
                            <FormField
                                placeholder="Reps (ej. 8-12)"
                                error={addExForm.formState.errors.rep_range?.message}
                                {...addExForm.register('rep_range', {
                                    required: 'Ej: 8-12',
                                    pattern: { value: /^\d+([-\s]?\d+)?$/, message: 'Ej: 8-12' },
                                })}
                            />
                        </div>
                        <div className="flex items-center justify-between mt-sm">
                            <label className="toggle-row mb-0">
                                <span className="toggle-label" style={{ fontSize: '0.75rem' }}>Opcional</span>
                                <input type="checkbox" className="toggle-input" {...addExForm.register('is_optional')} />
                                <span className="toggle-switch" style={{ transform: 'scale(0.8)', transformOrigin: 'left center' }} />
                            </label>
                            <button className="exercise-section-save m-0" type="submit">
                                <IconPlus size={16} /> Añadir
                            </button>
                        </div>
                    </form>

                    <button className="btn btn-primary btn-full btn-lg flex items-center justify-center gap-sm" onClick={handleCreateWorkout}>
                        <IconDeviceFloppy size={20} /> Guardar Rutina
                    </button>
                </div>
            ) : (
                <div className="edit-section">
                    {/* Routine name */}
                    <div className="mb-lg">
                        {!editingName ? (
                            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'var(--space-sm)' }}>
                                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {workouts.find((w) => w.id === selectedId)?.name}
                                </div>
                                <button type="button" className="btn btn-secondary icon-btn btn-sm" onClick={() => setEditingName(true)}>
                                    <IconEdit size={16} />
                                </button>
                            </div>
                        ) : (
                            <form className="flex gap-sm items-start" onSubmit={handleUpdateName}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <FormField
                                        placeholder="Nuevo nombre de la rutina"
                                        error={editNameForm.formState.errors.editName?.message}
                                        {...editNameForm.register('editName', { required: 'Obligatorio' })}
                                    />
                                </div>
                                <div className="flex gap-sm mt-xs">
                                    <button
                                        className="exercise-section-cancel m-0"
                                        type="button"
                                        style={{ height: '44px', width: '44px' }}
                                        onClick={() => setEditingName(false)}
                                    >
                                        <IconX size={18} />
                                    </button>
                                    <button
                                        className="exercise-section-save m-0"
                                        type="submit"
                                        style={{ height: '44px', borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                                    >
                                        <IconCheck size={18} />
                                    </button>
                                </div>
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
                        <button className="exercise-list-add-btn mb-lg" onClick={() => setAddingEx(true)}>
                            <IconPlus size={18} /> Añadir ejercicio
                        </button>
                    ) : (
                        <div className="mb-lg">
                            <AddExerciseForm
                                onAdd={(data) => addExMutation.mutate(data)}
                                onCancel={() => setAddingEx(false)}
                            />
                        </div>
                    )}

                    <div className="divider" />
                    <button
                        className="btn btn-danger btn-full flex items-center justify-center gap-sm"
                        onClick={() => {
                            if (confirm('¿Borrar rutina completa?')) deleteWorkoutMutation.mutate();
                        }}
                    >
                        <IconTrash size={18} /> Eliminar Rutina
                    </button>
                </div>
            )
            }
        </div >
    );
}
