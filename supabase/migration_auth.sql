-- ============================================================
-- GYMTRACKER — AUTHENTICATION MIGRATION
-- ============================================================
-- IMPORTANT: This script will delete existing test workouts 
-- because they do not have a user_id assigned.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Add user_id to workouts
alter table workouts add column user_id uuid references auth.users(id) default auth.uid();

-- Delete old orphaned test data (or it violates not null)
delete from workouts where user_id is null;

-- Make it required
alter table workouts alter column user_id set not null;

-- 2. Enable Row Level Security
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table workout_logs enable row level security;
alter table exercise_logs enable row level security;

-- 3. Create Security Policies

-- Workouts: direct ownership Check
create policy "Users can manage own workouts" on workouts
    for all using (auth.uid() = user_id);

-- Exercises: belong to a workout owned by user
create policy "Users can manage exercises" on exercises
    for all using (workout_id in (select id from workouts where user_id = auth.uid()));

-- Workout Logs: belong to a workout owned by user
create policy "Users can manage workout logs" on workout_logs
    for all using (workout_id in (select id from workouts where user_id = auth.uid()));

-- Exercise Logs: belong to a workout log, which belongs to a workout owned by user
create policy "Users can manage exercise logs" on exercise_logs
    for all using (
        workout_log_id in (
            select id from workout_logs where workout_id in (
                select id from workouts where user_id = auth.uid()
            )
        )
    );
