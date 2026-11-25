# Changelog

Todos los cambios notables de Previalo quedan registrados en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-01

### Elevación a PWA Profesional en Producción

#### Añadido
- **Identidad Visual Blanco y Negro (B&W):**
  - Rediseño completo de la iconografía a estética monocromática minimalista (fondo `#000000` y silueta de copa en `#ffffff`).
  - Generación de suite completa de iconos: `icon-192x192.png`, `icon-512x512.png` (`purpose: any`), `icon-maskable-192x192.png`, `icon-maskable-512x512.png` (`purpose: maskable`), `apple-touch-icon.png` (180x180 opaco sin canal alfa), `badge-96x96.png` (monocromo sobre transparente), `favicon.svg`, `favicon.ico` y banner panorámico `og-image.png` (1200x630px).
- **Web App Manifest & Atajos:**
  - Configuración estricta de `start_url`, `scope` e `id` a `/`.
  - Atajos rápidos en el launcher del sistema operativo para Modo Caos (`/?mode=chaos`), Modo Spicy (`/?mode=spicy`), El Tablero (`/?mode=board`) y Yo Nunca (`/?category=yo_nunca`).
  - Enrutamiento reactivo en `App.tsx` para lanzar de inmediato el modo invocado desde un atajo.
- **Service Worker & Resiliencia Offline:**
  - Componente `OfflineFallback.tsx` y página estática `public/offline.html` para rescate cuando un recurso no precacheado no esté disponible.
  - Componente `UpdateToast.tsx` para notificar actualizaciones compiladas de la aplicación sin interrumpir las partidas en curso.
  - Script independiente `public/push-sw.js` enlazado mediante `workbox.importScripts`.
  - Servicio `notificationService.ts` con flujo double opt-in (sin peticiones en frío) y soporte defensivo de la Badging API.
- **Onboarding de Instalación (A2HS):**
  - Componente `PWAInstallPrompt.tsx` con soporte dual: botón de instalación nativo en Android/Chrome Desktop y modal guiado de 2 pasos para Safari en iOS con descarte recordable de 7 días.
- **Marco Legal y Privacidad:**
  - Componente `LegalModal.tsx` accesible desde la portada y la configuración con pestañas para Términos y Consumo Responsable (+18), Privacidad (RGPD local sin servidores ni telemetría) y Almacenamiento Técnico (Art. 22.2 LSSI).
  - Botón de derecho de supresión («Borrar datos locales y vaciar caché») en `SettingsModal.tsx`.
- **Seguridad y Repositorio:**
  - Cabeceras de seguridad estrictas en `vercel.json` (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
  - Archivos estándar de repositorio: `LICENSE` (MIT), `SECURITY.md`, `public/robots.txt` y `.env.example`.

#### Modificado
- Purgado de clase no estándar `bottom-[calc(-1*env(safe-area-inset-top,0px))]` en `src/App.tsx`.
- Contención de altura estricta con Safe Areas (`max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)]`) y scroll localizado en todos los modales flotantes (`SettingsModal`, `TileModal`, `GameOverModal`, `VirusExpiredModal`).
- Limpieza quirúrgica de `.gitignore` eliminando herramientas ajenas y blindando carpetas de compilación PWA.
