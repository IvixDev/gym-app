import { useState, useEffect, useCallback } from 'react';
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
import type { Workout, Exercise } from '../types';

const EMPTY_EXERCISE = { name: '', sets: 3, rep_range: '8-12' };

// ─── Componente para cada fila de ejercicio en modo edición ───
function ExerciseEditRow({
    exercise,
    onSave,
    onDelete,
}: {
    exercise: Exercise;
    onSave: (id: string, fields: { name: string; sets: number; rep_range: string }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(exercise.name);
    const [sets, setSets] = useState(exercise.sets);
    const [repRange, setRepRange] = useState(exercise.rep_range);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);
        await onSave(exercise.id, { name: name.trim(), sets, rep_range: repRange });
        setSaving(false);
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
            <div className="input-group mb-sm">
                <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="input-row mb-sm">
                <div className="input-group">
                    <label style={{ fontSize: '10px' }}>Series</label>
                    <input type="number" className="input-field" value={sets} onChange={(e) => setSets(Number(e.target.value))} />
                </div>
                <div className="input-group">
                    <label style={{ fontSize: '10px' }}>Reps</label>
                    <input type="text" className="input-field" value={repRange} onChange={(e) => setRepRange(e.target.value)} />
                </div>
            </div>
            <div className="flex gap-sm">
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                    {saving ? '...' : '✓'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>✕</button>
            </div>
        </div>
    );
}

// ─── Página Principal de Gestión ───
export default function ManageWorkouts() {
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [selectedId, setSelectedId] = useState<string>('new');
    const [exercises, setExercises] = useState<Exercise[]>([]);

    // Form states
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [newExercises, setNewExercises] = useState<any[]>([]);
    const [currentEx, setCurrentEx] = useState({ ...EMPTY_EXERCISE });

    const [editName, setEditName] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [addingEx, setAddingEx] = useState(false);
    const [newEx, setNewEx] = useState({ ...EMPTY_EXERCISE });

    const [toast, setToast] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        const data = await getWorkouts();
        setWorkouts(data);
        return data;
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    useEffect(() => {
        if (selectedId !== 'new') {
            getExercisesByWorkout(selectedId).then(setExercises);
            const w = workouts.find(w => w.id === selectedId);
            if (w) setEditName(w.name);
        } else {
            setExercises([]);
        }
    }, [selectedId, workouts]);

    const msg = (t: string) => {
        setToast(t);
        setTimeout(() => setToast(null), 2000);
    };

    const handleCreate = async () => {
        if (!newWorkoutName.trim() || newExercises.length === 0) return;
        const w = await createWorkout(newWorkoutName);
        await Promise.all(newExercises.map((ex, i) => createExercise(w.id, ex.name, ex.sets, ex.rep_range, i)));
        msg('✅ Creado');
        setNewWorkoutName('');
        setNewExercises([]);
        await fetchAll();
        setSelectedId(w.id);
    };

    const handleUpdateName = async () => {
        await updateWorkout(selectedId, editName);
        await fetchAll();
        setEditingName(false);
        msg('✅ Nombre actualizado');
    };

    const handleAddExercise = async () => {
        await createExercise(selectedId, newEx.name, newEx.sets, newEx.rep_range, exercises.length);
        await getExercisesByWorkout(selectedId).then(setExercises);
        setNewEx({ ...EMPTY_EXERCISE });
        setAddingEx(false);
        msg('✅ Añadido');
    };

    const handleUpdateExercise = async (id: string, f: any) => {
        await updateExercise(id, f);
        await getExercisesByWorkout(selectedId).then(setExercises);
        msg('✅ Actualizado');
    };

    const handleDelEx = async (id: string) => {
        if (!confirm('¿Borrar ejercicio?')) return;
        await deleteExercise(id);
        await getExercisesByWorkout(selectedId).then(setExercises);
    };

    const handleDelWorkout = async () => {
        if (!confirm('¿Borrar rutina completa?')) return;
        await deleteWorkout(selectedId);
        const updated = await fetchAll();
        setSelectedId(updated.length > 0 ? updated[0].id : 'new');
        msg('🗑️ Borrado');
    };

    return (
        <div className="manage-workouts">
            <div className={`toast success ${toast ? 'show' : ''}`}>{toast}</div>

            <header className="page-header">
                <h1>Rutinas</h1>
                <p>Gestiona tus entrenamientos</p>
            </header>

            <div className="input-group mb-md">
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

            {selectedId === 'new' ? (
                <div className="create-section">
                    <div className="input-group mb-md">
                        <label>Nombre del workout</label>
                        <input className="input-field" type="text" value={newWorkoutName} onChange={e => setNewWorkoutName(e.target.value)} placeholder="Ej. Push Day" />
                    </div>

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
                        <div className="input-group mb-sm">
                            <input className="input-field" type="text" placeholder="Nombre" value={currentEx.name} onChange={e => setCurrentEx({ ...currentEx, name: e.target.value })} />
                        </div>
                        <div className="input-row mb-sm">
                            <input className="input-field" type="number" value={currentEx.sets} onChange={e => setCurrentEx({ ...currentEx, sets: Number(e.target.value) })} />
                            <input className="input-field" type="text" value={currentEx.rep_range} onChange={e => setCurrentEx({ ...currentEx, rep_range: e.target.value })} />
                        </div>
                        <button className="btn btn-secondary btn-full" onClick={() => { if (currentEx.name) { setNewExercises([...newExercises, currentEx]); setCurrentEx({ ...EMPTY_EXERCISE }); } }}>Añadir</button>
                    </div>

                    <button className="btn btn-primary btn-full btn-lg" onClick={handleCreate} disabled={!newWorkoutName || newExercises.length === 0}>Crear Workout</button>
                </div>
            ) : (
                <div className="edit-section">
                    <div className="card mb-md">
                        {!editingName ? (
                            <div className="flex justify-between items-center">
                                <span style={{ fontWeight: 700 }}>{workouts.find(w => w.id === selectedId)?.name}</span>
                                <button className="btn btn-secondary" onClick={() => setEditingName(true)}>✏️</button>
                            </div>
                        ) : (
                            <div className="flex gap-sm">
                                <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
                                <button className="btn btn-primary" onClick={handleUpdateName}>✓</button>
                                <button className="btn btn-secondary" onClick={() => setEditingName(false)}>✕</button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-sm mb-md">
                        {exercises.map(ex => (
                            <ExerciseEditRow key={ex.id} exercise={ex} onSave={handleUpdateExercise} onDelete={handleDelEx} />
                        ))}
                    </div>

                    {!addingEx ? (
                        <button className="btn btn-secondary btn-full mb-md" onClick={() => setAddingEx(true)}>➕ Añadir ejercicio</button>
                    ) : (
                        <div className="card mb-md">
                            <input className="input-field mb-sm" placeholder="Nombre" value={newEx.name} onChange={e => setNewEx({ ...newEx, name: e.target.value })} />
                            <div className="input-row mb-sm">
                                <input className="input-field" type="number" value={newEx.sets} onChange={e => setNewEx({ ...newEx, sets: Number(e.target.value) })} />
                                <input className="input-field" type="text" value={newEx.rep_range} onChange={e => setNewEx({ ...newEx, rep_range: e.target.value })} />
                            </div>
                            <div className="flex gap-sm">
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddExercise}>Añadir</button>
                                <button className="btn btn-secondary" onClick={() => setAddingEx(false)}>✕</button>
                            </div>
                        </div>
                    )}

                    <div className="divider" />
                    <button className="btn btn-danger btn-full" onClick={handleDelWorkout}>🗑️ Eliminar Workout</button>
                </div>
            )}
        </div>
    );
}
