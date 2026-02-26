import { useState, useEffect } from 'react';
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

const POSITIVE_INT = /^[1-9]\d*$/;
const REP_PATTERN = /^\d+([-\s]?\d+)?$/;

const EMPTY_EXERCISE = { name: '', sets: '', rep_range: '' };

function ValidatedInput({
    label,
    value,
    onChange,
    placeholder,
    pattern,
    errorMsg,
    showError,
    type = "text"
}: any) {
    const isInvalid = (pattern && value && !pattern.test(value)) || (showError && !value);

    return (
        <div className="input-group">
            {label && <label>{label}</label>}
            <input
                type={type}
                className={`input-field ${isInvalid ? 'error' : ''}`}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                placeholder={placeholder}
            />
            {isInvalid && errorMsg && <div className="error-text">{errorMsg}</div>}
        </div>
    );
}

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
    const [name, setName] = useState(exercise.name);
    const [sets, setSets] = useState(String(exercise.sets));
    const [repRange, setRepRange] = useState(exercise.rep_range);
    const [showErrors, setShowErrors] = useState(false);

    const handleSave = () => {
        if (!name.trim() || !POSITIVE_INT.test(sets) || !REP_PATTERN.test(repRange)) {
            setShowErrors(true);
            return;
        }
        onSave(exercise.id, {
            name: name.trim(),
            sets: parseInt(sets),
            rep_range: repRange
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
        <div className="exercise-edit-card">
            <div className="mb-md">
                <ValidatedInput
                    label="Nombre"
                    value={name}
                    onChange={setName}
                    placeholder="Ej: Press Banca"
                    showError={showErrors && !name.trim()}
                    errorMsg="Obligatorio"
                />
            </div>
            <div className="input-row mb-md">
                <ValidatedInput
                    label="Series"
                    value={sets}
                    onChange={setSets}
                    pattern={POSITIVE_INT}
                    errorMsg="Mínimo 1"
                    placeholder="3"
                    showError={showErrors}
                />
                <ValidatedInput
                    label="Reps"
                    value={repRange}
                    onChange={setRepRange}
                    pattern={REP_PATTERN}
                    errorMsg="Ej: 8-12"
                    placeholder="8-12"
                    showError={showErrors}
                />
            </div>
            <div className="flex gap-sm">
                <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleSave}
                >
                    ✓ Guardar
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>✕</button>
            </div>
        </div>
    );
}

export default function ManageWorkouts() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string>('new');
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [newExercises, setNewExercises] = useState<any[]>([]);
    const [currentEx, setCurrentEx] = useState({ ...EMPTY_EXERCISE });
    const [showCreateErrors, setShowCreateErrors] = useState(false);
    const [showAddErrors, setShowAddErrors] = useState(false);
    const [showEditAddErrors, setShowEditAddErrors] = useState(false);
    const [editName, setEditName] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [addingEx, setAddingEx] = useState(false);
    const [newEx, setNewEx] = useState({ ...EMPTY_EXERCISE });
    const [toast, setToast] = useState<string | null>(null);

    const msg = (t: string) => {
        setToast(t);
        setTimeout(() => setToast(null), 2000);
    };

    const { data: workouts = [] } = useQuery({
        queryKey: ['workouts'],
        queryFn: getWorkouts
    });

    const { data: exercises = [] } = useQuery({
        queryKey: ['exercises', selectedId],
        queryFn: () => getExercisesByWorkout(selectedId),
        enabled: selectedId !== 'new'
    });

    useEffect(() => {
        if (selectedId !== 'new') {
            const w = workouts.find(w => w.id === selectedId);
            if (w) setEditName(w.name);
        }
    }, [selectedId, workouts]);

    const createMutation = useMutation({
        mutationFn: async () => {
            const w = await createWorkout(newWorkoutName);
            await Promise.all(newExercises.map((ex, i) =>
                createExercise(w.id, ex.name, parseInt(ex.sets), ex.rep_range, i)
            ));
            return w;
        },
        onSuccess: (w) => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            msg('✅ Workout creado');
            setNewWorkoutName('');
            setNewExercises([]);
            setSelectedId(w.id);
        }
    });

    const updateNameMutation = useMutation({
        mutationFn: () => updateWorkout(selectedId, editName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setEditingName(false);
            msg('✅ Nombre actualizado');
        }
    });

    const addExMutation = useMutation({
        mutationFn: () => createExercise(selectedId, newEx.name, parseInt(newEx.sets), newEx.rep_range, exercises.length),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            setNewEx({ ...EMPTY_EXERCISE });
            setAddingEx(false);
            msg('✅ Ejercicio añadido');
        }
    });

    const updateExMutation = useMutation({
        mutationFn: ({ id, fields }: { id: string, fields: any }) => updateExercise(id, fields),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('✅ Actualizado');
        }
    });

    const deleteExMutation = useMutation({
        mutationFn: (id: string) => deleteExercise(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exercises', selectedId] });
            msg('🗑️ Borrado');
        }
    });

    const deleteWorkoutMutation = useMutation({
        mutationFn: () => deleteWorkout(selectedId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
            setSelectedId('new');
            msg('🗑️ Borrado');
        }
    });

    const isCurrentExValid = currentEx.name.trim() && POSITIVE_INT.test(currentEx.sets) && REP_PATTERN.test(currentEx.rep_range);

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
                        onChange={(e) => { setSelectedId(e.target.value); setEditingName(false); setAddingEx(false); }}
                    >
                        <option value="new">➕ Crear nuevo workout</option>
                        {workouts.length > 0 && (
                            <optgroup label="Editar existente">
                                {workouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </optgroup>
                        )}
                    </select>
                </div>
            </div>

            {selectedId === 'new' ? (
                <div className="create-section">
                    <div className="mb-md">
                        <ValidatedInput
                            label="Nombre del workout"
                            value={newWorkoutName}
                            onChange={setNewWorkoutName}
                            placeholder="Ej: Push Day"
                            showError={showCreateErrors && !newWorkoutName.trim()}
                            errorMsg="Obligatorio"
                        />
                    </div>

                    {showCreateErrors && newExercises.length === 0 && (
                        <div className="error-text mb-sm" style={{ textAlign: 'center', background: 'rgba(248, 113, 113, 0.1)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)' }}>
                            ⚠️ Necesitas añadir al menos un ejercicio antes de guardar
                        </div>
                    )}

                    <div className="flex flex-col gap-sm mb-md">
                        {newExercises.map((ex, i) => (
                            <div key={i} className="exercise-item">
                                <div className="exercise-info"><h3>{ex.name}</h3><p>{ex.sets}x{ex.rep_range}</p></div>
                                <button className="btn btn-danger" onClick={() => setNewExercises(prev => prev.filter((_, j) => j !== i))}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div className="card mb-md">
                        <h3 className="card-title mb-sm">Añadir ejercicio</h3>
                        <div className="mb-md">
                            <ValidatedInput
                                label="Nombre"
                                value={currentEx.name}
                                onChange={(val: any) => setCurrentEx({ ...currentEx, name: val })}
                                placeholder="Ej: Sentadilla"
                                showError={showAddErrors && !currentEx.name.trim()}
                                errorMsg="Obligatorio"
                            />
                        </div>
                        <div className="input-row mb-md">
                            <ValidatedInput
                                label="Series"
                                value={currentEx.sets}
                                onChange={(val: any) => setCurrentEx({ ...currentEx, sets: val })}
                                pattern={POSITIVE_INT}
                                errorMsg="Mínimo 1"
                                placeholder="3"
                                showError={showAddErrors}
                            />
                            <ValidatedInput
                                label="Reps"
                                value={currentEx.rep_range}
                                onChange={(val: any) => setCurrentEx({ ...currentEx, rep_range: val })}
                                pattern={REP_PATTERN}
                                errorMsg="Ej: 8-12"
                                placeholder="8-12"
                                showError={showAddErrors}
                            />
                        </div>
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={() => {
                                if (isCurrentExValid) {
                                    setNewExercises([...newExercises, currentEx]);
                                    setCurrentEx({ ...EMPTY_EXERCISE });
                                    setShowAddErrors(false);
                                } else {
                                    setShowAddErrors(true);
                                }
                            }}
                        >
                            Guardar ejercicio
                        </button>
                    </div>

                    <button className="btn btn-primary btn-full btn-lg" onClick={() => {
                        if (!newWorkoutName.trim() || newExercises.length === 0) {
                            setShowCreateErrors(true);
                            if (newExercises.length === 0) msg('⚠️ Añade al menos un ejercicio');
                            return;
                        }
                        createMutation.mutate();
                    }}>💾 Guardar Workout</button>
                </div>
            ) : (
                <div className="edit-section">
                    <div className="card mb-md">
                        {!editingName ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <label className="label-xs">Workout</label>
                                    <div style={{ fontWeight: 700, fontSize: '18px' }}>{workouts.find(w => w.id === selectedId)?.name}</div>
                                </div>
                                <button className="btn btn-secondary" onClick={() => setEditingName(true)}>✏️</button>
                            </div>
                        ) : (
                            <div className="flex gap-sm items-end">
                                <ValidatedInput
                                    label="Nuevo nombre"
                                    value={editName}
                                    onChange={setEditName}
                                />
                                <button className="btn btn-primary" style={{ padding: '12px 16px' }} onClick={() => updateNameMutation.mutate()}>✓</button>
                                <button className="btn btn-secondary" style={{ padding: '12px 16px' }} onClick={() => setEditingName(false)}>✕</button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-sm mb-md">
                        <label className="label-xs">Ejercicios</label>
                        {exercises.map(ex => (
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

                    {!addingEx ? (
                        <button className="btn btn-secondary btn-full mb-md" onClick={() => setAddingEx(true)}>➕ Añadir ejercicio</button>
                    ) : (
                        <div className="card mb-md">
                            <h3 className="card-title mb-sm">Nuevo ejercicio</h3>
                            <div className="mb-md">
                                <ValidatedInput
                                    label="Nombre"
                                    value={newEx.name}
                                    onChange={(val: any) => setNewEx({ ...newEx, name: val })}
                                    placeholder="Ej: Press Francés"
                                    showError={showEditAddErrors && !newEx.name.trim()}
                                    errorMsg="Obligatorio"
                                />
                            </div>
                            <div className="input-row mb-md">
                                <ValidatedInput
                                    label="Series"
                                    value={newEx.sets}
                                    onChange={(val: any) => setNewEx({ ...newEx, sets: val })}
                                    pattern={POSITIVE_INT}
                                    placeholder="3"
                                    showError={showEditAddErrors}
                                    errorMsg="Mínimo 1"
                                />
                                <ValidatedInput
                                    label="Reps"
                                    value={newEx.rep_range}
                                    onChange={(val: any) => setNewEx({ ...newEx, rep_range: val })}
                                    pattern={REP_PATTERN}
                                    placeholder="8-12"
                                    showError={showEditAddErrors}
                                    errorMsg="Ej: 8-12"
                                />
                            </div>
                            <div className="flex gap-sm">
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                                    if (!newEx.name.trim() || !POSITIVE_INT.test(newEx.sets) || !REP_PATTERN.test(newEx.rep_range)) {
                                        setShowEditAddErrors(true);
                                        return;
                                    }
                                    addExMutation.mutate();
                                }}>✓ Guardar ejercicio</button>
                                <button className="btn btn-secondary" onClick={() => { setAddingEx(false); setShowEditAddErrors(false); }}>✕</button>
                            </div>
                        </div>
                    )}

                    <div className="divider" />
                    <button className="btn btn-danger btn-full" onClick={() => {
                        if (confirm('¿Borrar rutina completa?')) deleteWorkoutMutation.mutate();
                    }}>🗑️ Eliminar Workout</button>
                </div>
            )}
        </div>
    );
}
