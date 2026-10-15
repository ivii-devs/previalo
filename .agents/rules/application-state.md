---
description: Gestión de estado reactivo con Zustand, persistencia y crash recovery
globs: ["src/application/**/*.ts"]
scope: "application | state | zustand"
---

# Gestión de Estado de Aplicación (`src/application/`)

## 1. Repositorio de Stores
- `useGameSessionStore.ts`: Sesión activa (mazo, índice actual, modificadores en curso, posiciones de tablero, turno y pila de descarte/undo).
- `usePlayerStore.ts`: Jugadores activos, avatares, métricas individuales e historial persistente para Quick Add.
- `useSettingsStore.ts`: Preferencias globales (tema activo, modo de contraste, volumen sonido FX, interruptor de háptica).

## 2. Inmutabilidad y Reactividad Zustand
- SIEMPRE actualizar estado mediante copias inmutables dentro de `set((state) => ({ ... }))`.
- NUNCA mutar arrays u objetos directamente en memoria (`state.array.push()` o `state.obj.prop = val` PROHIBIDOS).
- PREFERIR selectores atómicos en componentes (`usePlayerStore((s) => s.players)`) para evitar renders innecesarios.

## 3. Delegación a Motores de Dominio
- Los stores orquestan acciones del usuario delegando cálculos a `src/domain/engines/`.
- NUNCA codificar lógica algorítmica de barajado, reemplazo de variables o fórmulas de casillas en las acciones del store.
- Ejemplo: La acción `nextCard()` consume `CardEngine` y `VariableReplacer`, limitándose a actualizar el puntero y el historial.

## 4. Pila de Reversibilidad (Undo Stack)
- `historyStack`: Registrar snapshot reversible del estado previo (puntero activo, métricas alteradas y modificadores) antes de mutar el índice.
- `undo()`: Revertir la transición de estado y sus entidades dependientes de forma atómica.
- Manejo de borde: Bloquear `undo()` si `currentIndex === 0` o la pila está vacía.

## 5. Resiliencia y Recuperación ante Caídas (Crash Recovery)
- SIEMPRE serializar estado crítico en almacenamiento local para tolerar recargas involuntarias o suspensión por memoria en iOS.
- Hidratación defensiva: Validar integridad del JSON recuperado. Si el estado es corrupto, aplicar fallback a valores limpios iniciales sin romper la app.
