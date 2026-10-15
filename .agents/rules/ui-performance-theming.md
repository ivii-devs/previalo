---
description: Rendimiento visual 60/120Hz ProMotion, Framer Motion y arquitectura de theming con Tailwind v4
globs: ["src/presentation/**/*.{tsx,css}"]
scope: "ui | animations | themes"
---

# Rendimiento Visual, Animación y Theming

## 1. Aceleración por GPU y ProMotion 60/120Hz
- Animar EXCLUSIVAMENTE propiedades compositadas por GPU: `transform` y `opacity` (vía Framer Motion `motion.*`).
- NUNCA animar propiedades de geometría de layout: `top`, `bottom`, `left`, `right`, `width`, `height`, `margin`, `padding` (provocan layout recalculation masivo y caídas de frames en WebKit).
- Usar `will-change: transform` únicamente durante gestos táctiles de arrastre activo.

## 2. Arquitectura de Theming Dinámico (Tailwind CSS v4)
- Centralización semántica en `src/index.css`: Toda la paleta se expone mediante variables CSS dinámicas (`--bg-base`, `--bg-surface`, `--accent-primary`, `--border-color`, `--glow-shadow`, etc.).
- Desacoplamiento de temas: Los temas se activan mediante selectores de atributos (`[data-theme="..."]` / `[data-color-mode="..."]`).
- PROHIBIDO aplicar colores hexadecimales fijos en línea o utilidades de color estáticas no semánticas en componentes.
- Consumo en componentes: Aplicar exclusivamente clases de utilidad semánticas (`.theme-*`).

## 3. Contención de Navegación SPA
- Pantallas encapsuladas en `src/presentation/screens/`: Transición reactiva y atómica gestionada en `App.tsx` sin recargas de página ni routers dependientes de servidor externo.
- Enlaces externos: SIEMPRE `target="_blank" rel="noopener noreferrer"` para impedir la salida accidental del contenedor standalone de WebKit.

## 4. UI Optimista y Estabilidad de Layout (CLS = 0)
- Feedback reactivo optimista (<16ms) en gestos directos, swipes e interacciones interactivas.
- Contenedores de cartas, modales y recursos visuales DEBEN definir dimensiones mínimas o ratios fijos para garantizar Cumulative Layout Shift = 0.
