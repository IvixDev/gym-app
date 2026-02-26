-- ============================================================
-- GymTracker — Seed: Rutinas personales
-- ============================================================
-- Ejecuta este SQL DESPUÉS del migration_auth.sql
-- Supabase SQL Editor → New Query → Pegar → Run
-- ============================================================

-- Insertar workouts y asignarlos al usuario específico
-- Nota: 'ivixdev@gmail.com' debe haberse registrado ya en la app

with target_user as (
  select id from auth.users where email = 'ivixdev@gmail.com' limit 1
),
workout_a as (
  insert into workouts (name, user_id)
  select 'Rutina A', id from target_user
  returning id
),
workout_b as (
  insert into workouts (name, user_id)
  select 'Rutina B', id from target_user
  returning id
),

-- ============================================================
-- Ejercicios Rutina A
-- ============================================================
exercises_a as (
  insert into exercises (workout_id, name, sets, rep_range, order_index)
  select id, name, sets, rep_range, order_index
  from workout_a, (values
    ('Prensa de Piernas',       4, '6-8',   0),
    ('Máquina Press Pecho',     3, '6-8',   1),
    ('Remo Polea Baja',         3, '8-10',  2),
    ('Haca Inversa',            3, '10-12', 3),
    ('Press Hombro Máquina',    3, '10-12', 4)
  ) as t(name, sets, rep_range, order_index)
  returning id
)

-- ============================================================
-- Ejercicios Rutina B
-- ============================================================
insert into exercises (workout_id, name, sets, rep_range, order_index)
select id, name, sets, rep_range, order_index
from workout_b, (values
  ('Sentadilla en Haca',         4, '8-10',  0),
  ('Press Inclinado Máquina',    3, '8-10',  1),
  ('Jalón al Pecho (Polea)',     3, '10-12', 2),
  ('Curl Isquios (Máquina)',     3, '12-15', 3),
  ('Elevaciones Lat. Polea',     3, '12-15', 4)
) as t(name, sets, rep_range, order_index);
