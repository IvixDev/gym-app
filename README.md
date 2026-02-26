# 🏋️ Personal Fitness Tracker

Aplicación web personal para gestionar y registrar entrenamientos de gimnasio.  
El foco del proyecto es la **simplicidad**, el **uso diario real** y una **arquitectura clara**, evitando complejidad innecesaria en una primera versión.

---

## 🎯 Objetivo del proyecto

- Crear y definir rutinas de entrenamiento (workouts)
- Registrar el progreso diario de cada ejercicio
- Consultar el último entrenamiento realizado
- Mantener un historial actualizado para futuras visualizaciones

La aplicación está pensada para **uso individual**, sin sistema de usuarios en esta primera fase.

---

## 🧱 Stack tecnológico

- **React + Vite** — SPA rápida y ligera
- **PWA (Progressive Web App)** — Instalable y usable desde el móvil
- **Recharts** — Visualización de progreso (futuro)
- **:contentReference[oaicite:0]{index=0}** — Base de datos PostgreSQL
- **:contentReference[oaicite:1]{index=1}** — Despliegue del frontend

---

## 🧭 Estructura de la aplicación

La aplicación consta de **3 páginas principales**, pensadas para un flujo natural de uso en el gimnasio.

---

## 📄 Página 1 — Crear Workouts

Pantalla dedicada a la **definición de rutinas**.

Permite:

- Crear un workout con:
  - Nombre del workout (ej. “Push Day”)
- Añadir ejercicios al workout:
  - Nombre del ejercicio
  - Número de series
  - Rango de repeticiones (ej. 8–12)

Esta información define la **estructura base del entrenamiento**, no los resultados diarios.

---

## 📄 Página 2 — Ver Workouts

Pantalla de consulta de rutinas creadas.

Características:

- Lista o pestañas para seleccionar un workout
- Solo se puede visualizar **un workout a la vez**
- Vista clara de:
  - Ejercicios
  - Series
  - Rangos de repeticiones definidos

Sirve como punto de entrada para iniciar un entrenamiento.

---

## 📄 Página 3 — Registrar Entrenamiento

Pantalla principal de uso durante el entrenamiento.

Para cada ejercicio del workout seleccionado se muestra:

- Datos del **último entrenamiento**:
  - Repeticiones realizadas
  - Peso utilizado
  - Fecha del último workout
- Campos editables para introducir:
  - Repeticiones actuales
  - Peso actual por serie

Al guardar:

- Se registra el nuevo entrenamiento
- Se actualiza la fecha del último workout
- Los datos anteriores pasan a ser el historial

Esta pantalla está diseñada para **uso rápido y repetitivo**, minimizando fricción.

---

## 🗄️ Modelo de datos (conceptual)

- **Workouts**
  - Nombre
- **Exercises**
  - Nombre
  - Series
  - Rango de repeticiones
  - Relación con workout
- **Workout Logs**
  - Fecha
- **Exercise Logs**
  - Repeticiones
  - Peso
  - Relación con ejercicio y workout log

Este modelo permite:
- Saber qué hiciste el último día
- Registrar el progreso sesión a sesión
- Facilitar futuras gráficas

---

## 📱 Experiencia móvil

- Diseño **mobile-first**
- Uso optimizado para el gimnasio
- PWA instalable en el móvil
- Interfaz clara, sin distracciones

---

## 📊 Visualización de progreso (fase futura)

- Evolución de peso por ejercicio
- Repeticiones a lo largo del tiempo
- Comparativa entre sesiones

Las gráficas se generan a partir de los registros históricos.

---

## 📴 Offline (básico)

- La app puede extenderse para:
  - Guardar entrenamientos localmente
  - Sincronizar cuando hay conexión

---

## 🚀 Despliegue

- Frontend desplegado en Vercel
- Backend gestionado con Supabase
- Variables de entorno protegidas
- Arquitectura simple y mantenible

---

## 💼 Enfoque profesional

Aunque es un proyecto personal, está planteado como:

- Un caso real de gestión de estado y datos
- Un ejemplo de arquitectura SPA limpia
- Una app pensada para resolver un problema concreto
- Base sólida para futuras mejoras (auth, multiusuario, estadísticas)

---

## 📝 Estado del proyecto

🟡 MVP en desarrollo  
🔧 Enfoque incremental y evolutivo