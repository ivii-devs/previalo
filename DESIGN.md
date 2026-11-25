# Previalo Design System (`DESIGN.md`)

Fuente de verdad visual y ergonómica para la PWA **Previalo**. Todo componente y pantalla de `src/presentation/` debe consumir exclusivamente los tokens semánticos y reglas definidos en este documento.

---

## 1. Dirección Estética y Diales

- **Personalidad:** *Baraja nocturna moderna* — superficies oscuras limpias y mate, alto contraste tipográfico, cero brillos neón, cero degradados decorativos y protagonismo absoluto para las cartas y los jugadores.
- **Diales calibrados:**
  - `DESIGN_VARIANCE`: `5–6` en pantallas principales (`Home`, `Setup`, `Cartas`, `Tablero`), `3` en `Ajustes` y `Legal`, `8` en celebración de victoria (`GameOverModal`).
  - `MOTION_INTENSITY`: `Subtle` — transiciones breves (`100–200 ms`) exclusivamente con `transform` y `opacity` a 60/120 Hz. Se desactivan automáticamente con `prefers-reduced-motion: reduce`.
  - `VISUAL_DENSITY`: `Comfortable` — cuadrícula base de 4 px con separación generosa y áreas táctiles mínimas de `44×44 px`.

---

## 2. Tokens Semánticos de Rol

Los componentes deben usar **exclusivamente** roles semánticos (`bg-background`, `bg-surface`, `bg-surface-muted`, `border-border`, `text-text`, `bg-action`, `text-action-ink`, etc.). **Prohibido usar modificadores `dark:` o colores hexadecimales arbitrarios en componentes.**

| Rol Tailwind | Variable interna | Uso |
|---|---|---|
| `background` | `--pv-background` | Lienzo base de la aplicación y cabecera |
| `surface` | `--pv-surface` | Tarjetas principales, cartas del mazo, modales |
| `surface-muted` | `--pv-surface-muted` | Campos de entrada, chips inactivos, botones secundarios |
| `surface-raised` | `--pv-surface-raised` | Estado elevado / hover sobre superficie atenuada |
| `border` | `--pv-border` | Divisores y bordes sutiles de 1 px |
| `border-strong` | `--pv-border-strong` | Bordes de cartas activas y modales |
| `text` | `--pv-text` | Texto principal de alto contraste |
| `text-secondary` | `--pv-text-secondary` | Descripciones y cuerpo de lectura |
| `text-muted` | `--pv-text-muted` | Metadatos, contadores y etiquetas auxiliares |
| `action` | `--pv-action` | CTA primario, elementos seleccionados y acento de marca |
| `action-hover` | `--pv-action-hover` | Estado hover/pulsado del CTA primario |
| `action-ink` | `--pv-action-ink` | Texto sobre fondo `bg-action` (contraste AA/AAA garantizado) |
| `selected` | `--pv-selected` | Fondo tenue de chips y opciones seleccionadas |
| `focus` | `--pv-focus` | Anillo visible de foco accesible (`focus-visible:ring-focus`) |

### Señales semánticas (tríadas `color`, `color-quiet`, `color-line`, `color-ink`)
- `success` — Salida de tablero, cura de virus, estado online, inicio de jugador.
- `warning` — Tragos acumulados, cartas de continuación, estado offline, meta del tablero.
- `danger` — Errores, trampas de calavera/retroceso, borrado de datos.
- `virus` — Reglas virus activas, cárcel del tablero.
- `info` — Saltos *De bar en bar*, información técnica de almacenamiento.
- `spicy` — Modo Spicy / Parejas y niveles Hot (+18).

---

## 3. Paletas de los 5 Temas Mate

| ID interno (`data-theme`) | Nombre visible | Fondo (`background`) | Superficie (`surface`) | Acción (`action`) | Tinta CTA (`action-ink`) |
|---|---|---|---|---|---|
| `coral-night` *(defecto)* | **Noche Coral** | `#121113` | `#1b191d` | `#ff6257` | `#141112` |
| `indigo-obsidian` | **Obsidiana Índigo** | `#101118` | `#181a24` | `#7c7aff` | `#0f1018` |
| `emerald-forest` | **Bosque Esmeralda** | `#0f1412` | `#161e1b` | `#2ecc87` | `#0d1512` |
| `amber-dusk` | **Ámbar Nocturno** | `#14110f` | `#1e1916` | `#f59e0b` | `#16110e` |
| `warm-day` | **Modo Día** | `#f7f4ef` | `#ffffff` | `#cc3931` | `#ffffff` |

Migración automática desde claves heredadas en `localStorage`:
`cyber-neon → coral-night`, `electric-purple → indigo-obsidian`, `acid-lime → emerald-forest`, `sunset-hot → amber-dusk`, `day-mode → warm-day`.

---

## 4. Tipografía (100% Offline)

Empaquetada localmente mediante `@fontsource/plus-jakarta-sans` y `@fontsource/inter`:
- `font-heading`: **Plus Jakarta Sans** (`600`, `700`, `800`) — marca, encabezados de pantalla, títulos de modo y texto principal de las cartas.
- `font-body`: **Inter** (`400`, `500`, `600`, `700`) — botones, etiquetas, filtros, modales y cuerpo de lectura.
- `font-mono`: monoespaciada de sistema — contadores de cartas, progreso `1 / 50`, números de casilla `#14`.
- Tamaño mínimo recomendado: `12px` (`text-xs`) en controles interactivos y metadatos clave; `16px` obligatorio en `<input>` para bloquear el auto-zoom en WebKit iOS.

---

## 5. Geometría, Radios y Elevación

- Radios concéntricos moderados:
  - Controles compactos / chips: `rounded-lg` (`8px`) o `rounded-xl` (`12px`).
  - Tarjetas y botones primarios: `rounded-2xl` (`16px`).
  - Cartas del mazo y modales: `rounded-[20px]`.
- Elevación mate: sombras neutras sutiles sin resplandores de color (`--shadow-card`, `--shadow-modal`).

---

## 6. Invariantes WebKit iOS Standalone y Anti-AI-Slop

1. `#root` y `[data-testid="app-root"]` anclados con `position: fixed; inset: 0; bottom: 0` (prohibido `100vh`/`100dvh` para el lienzo raíz y prohibidos `bottom` negativos).
2. `<main>` siempre con `flex-1 min-h-0 flex flex-col overflow-hidden relative`; toda vista desplazable con `flex-1 min-h-0 overflow-y-auto scroll-container`.
3. Todo control interactivo garantiza un área táctil mínima de `44×44 px` (`min-w-[44px] min-h-[44px]`) y `focus-visible:ring-2 focus-visible:ring-focus`.
4. Acciones primarias en `SetupScreen`, `GameCardsScreen` y `GameBoardScreen` fijadas en la zona inferior del pulgar respetando `env(safe-area-inset-bottom, 0px)`.
5. **Cero degradados decorativos, cero halos difuminados, cero glassmorphism en tarjetas, cero tarjetas anidadas (*card-in-card*).**
6. **Cero emojis en la interfaz** (botones, títulos, categorías, filtros o avisos); los emojis se reservan **únicamente** para los avatares de los jugadores.
7. Textos en *sentence case* natural y directo.
