/* === Workout Definition === */
export interface Workout {
    id: string;
    name: string;
    created_at: string;
}

export interface Exercise {
    id: string;
    workout_id: string;
    name: string;
    sets: number;
    rep_range: string; // e.g. "8-12"
    order_index: number;
    is_optional: boolean;
}

/* === Workout Logs === */
export interface WorkoutLog {
    id: string;
    workout_id: string;
    date: string;
    created_at: string;
}

export interface ExerciseLog {
    id: string;
    workout_log_id: string;
    exercise_id: string;
    set_number: number;
    reps: number;
    weight: number;
    rir: number | null;
}

/* === Form helpers === */
export interface ExerciseFormData {
    name: string;
    sets: number;
    rep_range: string;
    is_optional: boolean;
}

export interface SetLogInput {
    set_number: number;
    reps: number | '';
    weight: number | '';
    rir: number | '';
}

export interface ExerciseLogInput {
    exercise_id: string;
    sets: SetLogInput[];
}

export interface ExerciseHistoryData {
    date: string;
    volume: number;
    estimated1RM: number;
    sets: { weight: number; reps: number; rir: number | null }[];
}
