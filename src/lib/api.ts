import { supabase } from './supabase';
import type { Workout, Exercise, WorkoutLog, ExerciseLog } from '../types';

// ============================================================
// WORKOUTS
// ============================================================

export async function getWorkouts(): Promise<Workout[]> {
    const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function createWorkout(name: string): Promise<Workout> {
    const { data, error } = await supabase
        .from('workouts')
        .insert({ name })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWorkout(id: string): Promise<void> {
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) throw error;
}

// ============================================================
// EXERCISES
// ============================================================

export async function getExercisesByWorkout(workoutId: string): Promise<Exercise[]> {
    const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function createExercise(
    workoutId: string,
    name: string,
    sets: number,
    repRange: string,
    orderIndex: number
): Promise<Exercise> {
    const { data, error } = await supabase
        .from('exercises')
        .insert({
            workout_id: workoutId,
            name,
            sets,
            rep_range: repRange,
            order_index: orderIndex,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteExercise(id: string): Promise<void> {
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error) throw error;
}

export async function updateWorkout(id: string, name: string): Promise<void> {
    const { error } = await supabase.from('workouts').update({ name }).eq('id', id);
    if (error) throw error;
}

export async function updateExercise(
    id: string,
    fields: { name?: string; sets?: number; rep_range?: string }
): Promise<void> {
    const { error } = await supabase.from('exercises').update(fields).eq('id', id);
    if (error) throw error;
}


// ============================================================
// WORKOUT LOGS
// ============================================================

export async function getLastWorkoutLog(workoutId: string): Promise<WorkoutLog | null> {
    const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_id', workoutId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/** Returns today's workout log for a given workout, or null if none exists yet */
export async function getTodayWorkoutLog(workoutId: string): Promise<WorkoutLog | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_id', workoutId)
        .eq('date', today)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/** Gets or creates a workout log for today */
export async function getOrCreateTodayWorkoutLog(workoutId: string): Promise<WorkoutLog> {
    const existing = await getTodayWorkoutLog(workoutId);
    if (existing) return existing;
    const today = new Date().toISOString().split('T')[0];
    return createWorkoutLog(workoutId, today);
}

export async function createWorkoutLog(workoutId: string, date: string): Promise<WorkoutLog> {
    const { data, error } = await supabase
        .from('workout_logs')
        .insert({ workout_id: workoutId, date })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================
// EXERCISE LOGS
// ============================================================

export async function getExerciseLogsByWorkoutLog(
    workoutLogId: string
): Promise<ExerciseLog[]> {
    const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('workout_log_id', workoutLogId)
        .order('set_number', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

/**
 * Returns the IDs of exercises already logged in a given workout_log
 */
export async function getDoneExerciseIds(workoutLogId: string): Promise<Set<string>> {
    const { data, error } = await supabase
        .from('exercise_logs')
        .select('exercise_id')
        .eq('workout_log_id', workoutLogId);

    if (error) throw error;
    return new Set((data ?? []).map((r) => r.exercise_id));
}

/**
 * Returns the last logged sets for each exercise in a workout.
 * Result is a map: exerciseId → { date, sets[] }
 * If includeToday is true, it returns the absolute last session.
 * Otherwise, it skips today's log (useful for logging hints).
 */
export async function getLastSessionData(
    workoutId: string,
    includeToday: boolean = false
): Promise<Record<string, { date: string; sets: { reps: number; weight: number }[] }>> {
    const today = new Date().toISOString().split('T')[0];

    // Get the most recent workout log
    let query = supabase
        .from('workout_logs')
        .select('*')
        .eq('workout_id', workoutId);

    if (!includeToday) {
        query = query.lt('date', today);
    }

    const { data: logs, error: logsError } = await query
        .order('date', { ascending: false })
        .limit(1);

    if (logsError) throw logsError;
    const lastLog = logs?.[0] ?? null;
    if (!lastLog) return {};

    const exerciseLogs = await getExerciseLogsByWorkoutLog(lastLog.id);

    const result: Record<string, { date: string; sets: { reps: number; weight: number }[] }> = {};
    for (const log of exerciseLogs) {
        if (!result[log.exercise_id]) {
            result[log.exercise_id] = { date: lastLog.date, sets: [] };
        }
        result[log.exercise_id].sets.push({ reps: log.reps, weight: Number(log.weight) });
    }
    return result;
}

/**
 * Save a single exercise's sets for today.
 * Creates the workout_log for today if it doesn't exist yet.
 */
export async function saveExerciseSets(
    workoutId: string,
    exerciseId: string,
    sets: Array<{ set_number: number; reps: number; weight: number }>
): Promise<void> {
    const workoutLog = await getOrCreateTodayWorkoutLog(workoutId);

    const rows = sets.map((s) => ({
        workout_log_id: workoutLog.id,
        exercise_id: exerciseId,
        set_number: s.set_number,
        reps: s.reps,
        weight: s.weight,
    }));

    const { error } = await supabase.from('exercise_logs').insert(rows);
    if (error) throw error;
}
