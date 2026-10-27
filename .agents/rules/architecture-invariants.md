---
description: Invariantes duros de Clean Architecture, propiedad de dominio, DRY y disciplina de refactor
globs: "src/**/*, scripts/**/*"
scope: "architecture | domain | refactor"
---

# Invariantes de Arquitectura y Dominio

## 1. Separación Estricta de Capas
- **Domain (`src/domain/`)**: Lógica pura de juego y modelos TypeScript. Cero dependencias de React, DOM, `window`, `document` o librerías UI.
- **Application (`src/application/`)**: Stores Zustand (`useGameSessionStore`, `usePlayerStore`, `useSettingsStore`). Orquestación y estado reactivo.
- **Infrastructure (`src/infrastructure/`)**: Servicios de persistencia (`catalogLoader`), audio sintético (`soundService`) y PWA (`registerSW`).
- **Presentation (`src/presentation/`)**: Componentes React 19, pantallas, estilos Tailwind v4 y animaciones Framer Motion.

## 2. Invariante 1: Un Solo Módulo Propietario por Regla
- Barajado, composición y entrelazado de mazos: SIEMPRE en `src/domain/engines/CardEngine.ts`.
- Sustitución de variables dinámicas, fairness y unicidad de participantes: SIEMPRE en `src/domain/engines/VariableReplacer.ts`.
- Control de ciclo de vida de modificadores de juego y temporalidad: SIEMPRE en `src/domain/engines/VirusManager.ts`.
- Topología de casillas, tiradas pseudoaleatorias y resolución de tablero: SIEMPRE en `src/domain/engines/BoardEngine.ts`.
- NUNCA codificar reglas de juego o fórmulas matemáticas dentro de componentes UI o stores.
- NUNCA usar importaciones dinámicas o hacks a nivel de función para eludir ciclos de dependencias; corregir la propiedad arquitectónica.

## 3. Invariante 2: DRY Radical y Fuente Única de Verdad
- SIEMPRE ejecutar `grep` en el repositorio antes de implementar cualquier cálculo, umbral, regex, formato o validación.
- Al segundo uso de cualquier lógica:
  1. Extraer al módulo propietario en `src/domain/engines/`.
  2. Migrar llamador previo.
  3. Ejecutar suite de tests (`npm test`); verificar 100% verde sin cambios de comportamiento observable.
  4. Implementar el nuevo llamador.
- NUNCA crear helpers duplicados o utilidades paralelas dejando copias previas intactas.

## 4. Invariante 3: Sin Lógica de Dominio en Presentación
- Vistas (`src/presentation/screens/`) y componentes (`src/presentation/components/`) SOLO presentan datos y capturan eventos de usuario.
- NUNCA calcular magnitudes de juego, penalizaciones, turnos o destinos de casilla directamente en JSX o manejadores de eventos.
- Delegar SIEMPRE a stores de `src/application/` o métodos puros de `src/domain/engines/`.

## 5. Disciplina de Refactorización
- PREFERIR refactorizar primero y verificar con tests verdes; cambiar comportamiento DESPUÉS en commit/paso separado.
- NUNCA mezclar reescritura estructural y cambio de comportamiento en el mismo diff.
- Todo refactor DEBE preservar comportamiento observable: orden, redondeo, límites, inmutabilidad y contratos de tipos.
