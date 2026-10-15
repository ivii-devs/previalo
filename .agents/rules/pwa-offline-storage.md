---
description: Estrategia offline-first, Workbox Cache-First, Web Audio API y almacenamiento WebKit
globs: ["src/infrastructure/**/*.ts", "vite.config.ts", "public/**/*"]
scope: "infrastructure | service-worker | storage | audio"
---

# PWA Offline, Almacenamiento y Web Audio

## 1. Service Worker y Caché Workbox
- Configuración en `vite.config.ts` vía `vite-plugin-pwa` (`registerType: 'autoUpdate'`).
- Precaching de assets: `**/*.{js,css,html,ico,png,svg,json}`.
- Runtime Caching Cache-First: Exclusivo para `/data/**` (catálogos de datos y tableros) con retención de 30 días bajo la caché `previalo-catalog-cache`.

## 2. Almacenamiento Defensivo en WebKit
- PREFERIR `idb-keyval` (IndexedDB) sobre `localStorage` para almacenar catálogos (`src/infrastructure/catalogLoader.ts`). Evita bloqueo del hilo principal.
- NUNCA almacenar objetos voluminosos en `localStorage`; limitarlo a flags primitivas de configuración o IDs breves.
- Filosofía efímera: Tratar los datos locales como reconstituibles mediante precarga o fallback local si WebKit purga el almacenamiento por inactividad.

## 3. Ciclo de Vida y Detección Standalone
- Detección de ejecución PWA:
  `window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true`
- Resiliencia a suspensión en iOS: Monitorear eventos `visibilitychange` y `pageshow` para revalidar sincronía de sesiones cuando el usuario regresa a la app.
- A2HS / Instalación contextual: Interceptar `beforeinstallprompt` en `src/infrastructure/registerSW.ts`. NUNCA solicitar instalación en el arranque en frío; presentar botón contextual en pantalla.

## 4. Síntesis Procedural de Sonido y Háptica
- Módulo `src/infrastructure/soundService.ts`: Cero archivos de audio `.mp3`/`.wav`. Efectos sintetizados proceduralmente mediante Web Audio API pura.
- Desbloqueo de audio: Inicializar o resumir `AudioContext` ÚNICAMENTE tras una interacción de usuario (`pointerdown` / `click`).
- Vibración háptica: Disparar `navigator.vibrate` como complemento táctil; mantener fallback pasivo silencioso cuando WebKit iOS ignore la API.
