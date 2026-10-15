---
description: Invariantes algorítmicos, pureza funcional y contratos de tipos para motores de dominio
globs: ["src/domain/**/*.ts"]
scope: "domain | algorithms | engines"
---

# Invariantes de Motores de Dominio (`src/domain/`)

## 1. Pureza Funcional y Contratos de Tipos
- SIEMPRE funciones puras sin efectos colaterales; NUNCA mutar parámetros recibidos (usar copias y spread).
- NUNCA importar `window`, `document`, React, Zustand ni librerías de UI dentro de `src/domain/`.
- Contratos de tipos: Centralizados en `src/domain/types/` (`card.ts`, `board.ts`, `player.ts`, `session.ts`, `virus.ts`).
- Prohibido `any`. Usar narrowing estricto, type guards y uniones discriminadas exhaustivas.

## 2. `CardEngine.ts` (Generación y Barajado de Mazos)
- Barajado uniforme: SIEMPRE algoritmo Fisher-Yates $O(N)$ con equiprobabilidad demostrable. NUNCA `sort(() => Math.random() - 0.5)`.
- Algoritmo de intercalado (Interleaving): Mazos combinados DEBEN aplicar intercalado algorítmico para evitar clustering consecutivo de una misma categoría según la política inyectada.
- Inmutabilidad en transformaciones: Operaciones de filtrado o composición retornan colecciones nuevas sin alterar los conjuntos de origen.

## 3. `VariableReplacer.ts` (Interpolación y Equidad de Asignación)
- Unicidad de participantes (Distinctness): La asignación de múltiples participantes en una misma tarjeta DEBE garantizar conjuntos disjuntos sin colisiones ($p_i \neq p_j$ para todo $i \neq j$).
- Sustitución de magnitudes dinámicas: Los tokens cuantitativos numéricos DEBEN derivarse de las escalas definidas en los tipos/configuraciones de sesión, NUNCA de constantes mágicas en código.
- Algoritmo de Fairness: Ponderar la asignación por frecuencia histórica ($C_p$) y tiempo de enfriamiento ($T_p$) para garantizar convergencia estadística a distribución equitativa.
- Guardas de dimensionalidad: Validar que el conteo de participantes satisfaga los requisitos mínimos exigidos por los metadatos de la tarjeta antes de su resolución.

## 4. `VirusManager.ts` (Gestor de Modificadores Temporales)
- Ciclo de vida desacoplado: La duración de cada modificador temporal se deriva del modelo de la entidad o configuración inyectada; el motor es agnóstico a duraciones específicas.
- Transiciones atómicas: `tickRound()` decrementa contadores de forma inmutable y pura.
- Detección de umbral terminal: Emitir flag/evento de expiración de forma limpia antes de purgar el modificador.

## 5. `BoardEngine.ts` (Navegación de Tableros y Probabilidad)
- Generación pseudo-aleatoria: Generadores de tirada con distribución uniforme y sin sesgo en el rango entero parametrizado.
- Rebote topológico (Overshoot): Ante avances que excedan el límite físico del recorrido, calcular rebote reflejado exacto: `destination = maxTiles - (pos + roll - maxTiles)`.
- Resolución de casillas: Resolver transiciones de estado como función pura guiada por los metadatos y tipos del tablero activo, NUNCA mediante reglas fijas codificadas a fuego en el motor.
