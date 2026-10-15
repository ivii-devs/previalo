# Previalo Agent Router

- **Core**: React 19 + TypeScript 5.7 (strict) + Vite 6
- **Estilos & Animación**: Tailwind CSS v4 (`@tailwindcss/vite`) + Framer Motion 12
- **Arquitectura**: Clean Architecture (Pure Domain, Application Stores, Infrastructure, UI)
- **Estado & Almacenamiento**: Zustand 5 + `idb-keyval` (IndexedDB) + Workbox PWA
- **Plataforma & Testing**: WebKit iOS PWA Standalone (Offline-First) + Vitest 3

## Protocolo de Contexto Mínimo
1. Antes de iniciar cualquier tarea, lee `AGENT_LEARNINGS.md`.
2. Lee **ÚNICAMENTE** los ficheros de `.agents/rules/` cuyos globs coincidan con la tarea actual.
3. Prohibido cargar reglas no relacionadas para evitar saturar la ventana de contexto.
4. Tras cometer un error o fallo en tests, registra el post-mortem en `AGENT_LEARNINGS.md`.

## Mapa de Enrutamiento de Contexto

| Tarea / Archivos Afectados | Regla a Cargar |
|---|---|
| Arquitectura, refactor, DRY, nuevas reglas de negocio (`src/**/*`) | `.agents/rules/architecture-invariants.md` |
| Motores de cartas, dados, virus, reemplazo (`src/domain/**/*`) | `.agents/rules/domain-engines.md` |
| Stores Zustand, persistencia, sesiones (`src/application/**/*`) | `.agents/rules/application-state.md` |
| Viewport, Safe Areas, eventos táctiles, inputs (`src/presentation/**/*`, `*.css`, `*.html`) | `.agents/rules/ios-viewport-touch.md` |
| Componentes visuales, animaciones 60/120Hz, temas (`src/presentation/**/*`) | `.agents/rules/ui-performance-theming.md` |
| Service Worker, Workbox, IndexedDB, Audio, PWA (`src/infrastructure/**/*`, `vite.config.ts`) | `.agents/rules/pwa-offline-storage.md` |
| Tests, gates de calidad, typecheck, build (`tests/**/*`, `*.test.*`) | `.agents/rules/testing-verification-gate.md` |
