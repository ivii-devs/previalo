---
description: Estándares de Viewport Pinning, Safe Areas y física táctil en WebKit iOS Standalone
globs: ["src/presentation/**/*.{tsx,css}", "src/index.css", "index.html"]
scope: "ui | viewport | touch"
---

# Viewport y Física Táctil iOS WebKit

## 1. Viewport Pinning (Regla Anti-Franja WebKit)
- NUNCA usar `100vh` ni `100dvh` unpinned en el layout contenedor (WebKit en Standalone con `black-translucent` descuenta la barra de Safari dejando un gap inferior de ~74px).
- SIEMPRE fijar `#root` con Viewport Pinning anclado a los límites reales del viewport (`src/index.css`):
  `position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; display: flex; flex-direction: column; overflow: hidden;`
- Prohibido extender `bottom` negativamente (`bottom: calc(-1 * env(safe-area-inset-top, 0px))`), ya que en iOS 17/18 Standalone PWA con `viewport-fit=cover`, expande `#root` fuera del borde inferior físico del dispositivo e infla artificialmente `clientHeight`, anulando la detección de desbordamiento de WebKit (`scrollHeight === clientHeight`) y bloqueando el scroll táctil nativo.
- Contenedor dinámico: `main { flex: 1; min-height: 0; flex-direction: column; }`.
- Viewport meta: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.

## 2. Safe Area Insets (Dynamic Island, Notch, Home Indicator)
- Cabecera fija (`TopHeader.tsx`): SIEMPRE aplicar utilidad `.pt-safe` (`padding-top: env(safe-area-inset-top, 0px)`).
- Barra inferior fija (`BottomNav.tsx`): SIEMPRE aplicar utilidad `.pb-safe` (`padding-bottom: env(safe-area-inset-bottom, 0px)`).
- Márgenes horizontales: Usar `.pl-safe` y `.pr-safe` (`env(safe-area-inset-left/right, 0px)`).

## 3. Prevención de Auto-Zoom y Teclados Nativos
- SIEMPRE `font-size: 16px !important` en todo `<input>`, `<select>`, `<textarea>` (`src/index.css`) para abortar auto-zoom de iOS.
- Declarar atributos semánticos: `inputmode` (`numeric`, `decimal`, `email`, `tel`, `url`) y `enterkeyhint` (`done`, `go`, `search`, `next`).

## 4. Resets y Física Táctil Nativa
- Controles interactivos (`button`, `[role="button"]`, `nav`, `header`):
  `-webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; touch-action: manipulation; user-select: none;`
- Selección de texto: Restringida exclusivamente a contenedores con clase `.selectable` (`user-select: text !important`).
- Dimensiones mínimas de toque: $44 \times 44\text{px}$ para todo botón, icono o chip interactivo.
- Feedback al toque: Definir `:active` inmediato (`transform: scale(0.97)` o `opacity: 0.8`).
- Hover en móvil: Encapsular `:hover` SIEMPRE en `@media (hover: hover)` para evitar estados atascados.

## 5. Confinamiento de Scroll (Anti-Rebote)
- Bloqueo global: `html, body { overscroll-behavior-y: none; overflow: hidden; height: 100%; }`.
- Scroll localizado: Permitido ÚNICAMENTE en contenedores con `.scroll-container` (`overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;`).
- Bordes de pantalla: Prohibido interceptar gestos horizontales en los primeros 20px laterales para no quebrar el swipe back/forward nativo.
