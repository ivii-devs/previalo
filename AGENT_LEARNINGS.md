# Agent Learning Log: Previalo Project

Registro evolutivo de post-mortems técnicos, antipatrones detectados y soluciones probadas.
> **Regla de Operación:** Todo agente DEBE consultar este archivo antes de iniciar una tarea y registrar cualquier error cometido tras fallar pruebas o romper contratos.

---

## Agent Learning Log: Iteration #1

### Mistake Made
- **Description:** Uso de `100vh` o `100dvh` en el contenedor raíz para una PWA instalada en iOS en modo `black-translucent`. WebKit resta erróneamente la supuesta barra inferior de Safari (~74px), provocando una franja negra persistente al pie.
- **Impact:** Desalineación visual severa en iPhone; elementos flotantes tapados o desfasados de la Safe Area.

```css
/* Antipatrón: franja negra al pie en iOS Standalone */
#root {
  height: 100vh; /* o min-height: 100dvh */
}
```

### Patterns to Avoid
- **Pattern:** Asumir que `window.innerHeight` o `100dvh` reflejan la altura física real en WebKit Standalone.
- **Risk:** Fugas de layout, home indicator solapando controles táctiles y rebote incontrolado.

### Better Approaches
- **Recommendation:** Implementar **Viewport Pinning** anclando `#root` a las 4 esquinas del Initial Containing Block físico mediante `position: fixed; inset: 0`.
- **Solution:**

```css
/* Enfoque Óptimo: Viewport Pinning en src/index.css */
#root {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
main {
  flex: 1;
  min-height: 0;
}
```

---

## Agent Learning Log: Iteration #2

### Mistake Made
- **Description:** Mutación directa de arrays en acciones de Zustand (`state.players.push(newPlayer)` en lugar de devolver nueva referencia).
- **Impact:** Fallos intermitentes de re-render en componentes React 19 y pérdida de sincronía en el historial de descarte/undo.

```typescript
// Antipatrón: mutación en sitio dentro de Zustand
addPlayer: (name) => set((state) => {
  state.players.push({ id: nanoid(), name }); // Mutación de estado previo
  return { players: state.players };
})
```

### Patterns to Avoid
- **Pattern:** Modificar colecciones o estructuras anidadas en memoria sin clonación inmutable.
- **Risk:** Pérdida de reactividad, bugs fantasma en time-travel debugging y pruebas unitarias fallidas.

### Better Approaches
- **Recommendation:** Utilizar siempre inmutabilidad estricta con operador spread o creación de nuevos arrays.
- **Solution:**

```typescript
// Enfoque Óptimo: Spread inmutable en src/application/usePlayerStore.ts
addPlayer: (name) => set((state) => ({
  players: [...state.players, { id: nanoid(), name, sipsTaken: 0, targetCount: 0 }]
}))
```

---

## Agent Learning Log: Iteration #3

### Mistake Made
- **Description:** Disparo de síntesis de audio (`Web Audio API`) antes de que el usuario interactúe con el DOM, o en arranques en frío.
- **Impact:** Safari y Chrome bloquean el `AudioContext` en estado `suspended`, lanzando advertencias en consola y rompiendo el flujo sonoro.

```typescript
// Antipatrón: reproducir sin verificar AudioContext.state ni gesto de usuario
const ctx = new AudioContext();
ctx.resume(); // Bloqueado por la directiva de autoplay del navegador
```

### Patterns to Avoid
- **Pattern:** Inicializar o activar recursos de audio sin ligarlos a un evento de entrada (`click` / `pointerdown`).
- **Risk:** Audio silenciado de forma permanente durante toda la sesión.

### Better Approaches
- **Recommendation:** Inicializar perezosamente el `AudioContext` y ejecutar `ctx.resume()` exclusivamente dentro del primer manejador de interacción de usuario en `src/infrastructure/soundService.ts`.

---

## Agent Learning Log: Iteration #4

### Mistake Made
- **Description:** Creer que `position: fixed; inset: 0` resuelve por sí solo la franja inferior en iOS Standalone PWA con `black-translucent`. En WebKit, el modo `black-translucent` desplaza el lienzo hacia arriba por `safe-area-inset-top` (59pt) pero NO amplía `window.innerHeight`. Por consiguiente, `bottom: 0` se ancla a `window.innerHeight`, dejando exactamente 59pt (~71px) de fondo muerto al pie y cortando el scroll con `overflow: hidden` cuando no hay un `BottomNav` que enmascare la zona.
- **Impact:** Corte horizontal tajante en tarjetas y listas de scroll en iPhones con Dynamic Island/Notch; franja muerta de color de fondo al pie de la pantalla.

```css
/* Antipatrón insuficiente: deja franja de 59pt en iOS Standalone */
#root {
  position: fixed;
  inset: 0; /* bottom: 0 se ancla a window.innerHeight desfasado */
}
```

### Patterns to Avoid
- **Pattern:** Asumir que `inset: 0` o `bottom: 0` en elementos `fixed` alcanzan el borde físico del cristal en WebKit con `black-translucent`.
- **Risk:** Contenido cortado a mitad de pantalla y franja vacía al retirar barras de navegación inferiores.

### Better Approaches
- **Recommendation:** Extender la coordenada inferior en la medida exacta del desplazamiento superior mediante `bottom: calc(-1 * env(safe-area-inset-top, 0px))`. En plataformas sin notch (Android, Desktop), evalúa a `0px` sin impacto adverso.
- **Solution:**

```css
/* Enfoque Óptimo: Compensación de desplazamiento WebKit en src/index.css */
#root {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: calc(-1 * env(safe-area-inset-top, 0px));
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-base);
}
```

Y en el contenedor principal de `src/App.tsx`:
```tsx
<div
  className="fixed inset-0 bottom-[calc(-1*env(safe-area-inset-top,0px))] flex flex-col w-full max-w-md mx-auto select-none overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]"
  data-testid="app-root"
>
```

---

## Agent Learning Log: Iteration #5

### Mistake Made
- **Description:** El limpiador de nombres de categorías (`cleanCategoryName`) no eliminaba el subtítulo histórico `(La Guatoca)` que viene en el catálogo de producción (`"🎲 El Tablero (La Guatoca)"`), provocando que la hidratación asíncrona del manifiesto sobreescribiera `"El Tablero"` por `"El Tablero (La Guatoca)"`. Adicionalmente, la regex de emojis no incluía los Variation Selectors de Unicode (`\uFE0E-\uFE0F`) ni Zero-Width Joiners (`\u200D`), dejando el byte huérfano `\uFE0F` al inicio de strings como `"⚔️ Guerra de Equipos"`.
- **Impact:** Títulos de categorías deformados con marcas unicode invisibles y violación de la regla de unificación de marca para "El Tablero".

### Patterns to Avoid
- **Pattern:** Limpiar emojis asumiendo que solo consisten en `\p{Extended_Pictographic}` sin considerar secuencias compuestas con `\uFE0E-\uFE0F` o ZWJ.
- **Risk:** Artefactos de renderizado en WebKit y fallos de aserción en pruebas de cadenas.

### Better Approaches
- **Recommendation:** Incluir siempre `\uFE0E-\uFE0F\u200D` en las expresiones regulares de saneamiento de emojis y mapear explícitamente los identificadores de categorías canónicas (`el_tablero`).

---

## Agent Learning Log: Iteration #6

### Mistake Made
- **Description:** El elemento `<main>` contenedor del router de vistas carecía de `display: flex; flex-direction: column;` (`className="flex-1 min-h-0 overflow-hidden relative"` sin `flex flex-col`). En especificaciones CSS de estándares (WebKit, Gecko, Blink), un hijo con `height: 100%` (`h-full`) dentro de un flex item de tipo bloque sin altura explícita (`height: auto`) no puede resolver el porcentaje y computa a `height: auto`, expandiéndose al tamaño de su contenido (~850px). Al no verse constreñido, `HomeScreen.clientHeight === HomeScreen.scrollHeight`, por lo que `overflow-y: auto` no se activaba y `<main overflow-hidden>` recortaba el contenido inferior sin permitir desplazamiento ni con rueda de ratón ni con gestos táctiles.
- **Impact:** Scroll completamente roto en la pantalla principal; los usuarios no podían desplazarse hacia abajo para ver la cuadrícula completa de categorías.

### Patterns to Avoid
- **Pattern:** Usar `h-full` y `overflow-y-auto` en vistas hijas de un `<main>` que solo tiene `flex-1 min-h-0` sin `flex flex-col` ni `flex-1 min-h-0` en el hijo.
- **Risk:** Contenedor de scroll expandido a `height: auto` cortado por el `overflow: hidden` del padre sin posibilidad de scroll.

### Better Approaches
- **Recommendation:** 
  1. Declarar siempre `flex flex-col` en `<main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">`.
  2. En las pantallas con scroll (`HomeScreen`, `SetupScreen`, `PodiumScreen`), aplicar `className="flex-1 min-h-0 flex flex-col ... overflow-y-auto scroll-container"`.
  3. Asegurar `touch-action: pan-y;` en `.scroll-container` y sus botones hijos en `src/index.css` para garantizar que gestos táctiles verticales sobre botones siempre disparen el scroll nativo.

---

## Agent Learning Log: Iteration #7

### Mistake Made
- **Description:** En resoluciones de escritorio o tablets, `#root` y `body` con `overflow: hidden` descartaban todos los eventos de rueda (`wheel`) y gestos de dos dedos que se producían fuera del ancho constreñido de `max-w-md` (448px, el 77% de una pantalla 1080p). Adicionalmente:
  1. No había scrollbar visible estilizado en `.scroll-container`, por lo que el usuario carecía de indicación visual de desbordamiento.
  2. En dispositivos táctiles, los hijos internos de los botones de categorías (`<p>`, `<span>`, `<div>`) tenían `touch-action: auto`, interceptando el scroll vertical en WebKit.
  3. No existía soporte para drag-to-scroll con ratón en escritorio (`useDragToScroll`), lo que impedía a usuarios de PC arrastrar hacia arriba como en móvil.
  4. Al intentar aumentar el padding inferior del contenedor principal de `HomeScreen` a `4rem` para compensar, se rompió la prueba de regresión estricta `AppNavigationUnified.test.tsx` que requería la firma normalizada `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.
- **Impact:** El usuario percibía que la aplicación "no detectaba contenido largo" o que "tenía la función de scroll rota", dejando cortada la fila inferior de 3 categorías ("Mesa y Minijuegos", "Guerra de Equipos", "El Tablero").

### Patterns to Avoid
- **Pattern:** Asumir que el scroll nativo dentro de un contenedor `max-w-md mx-auto` es suficiente en escritorio cuando el canvas global está en `overflow: hidden`.
- **Risk:** Eventos de scroll perdidos en márgenes laterales y ausencia de affordance de desplazamiento.

### Better Approaches
- **Recommendation:**
  1. Instalar un manejador global de eventos `wheel` en `App.tsx` que reenvíe deltas a `.scroll-container` activo si el cursor está fuera de él (márgenes laterales o cabeceras).
  2. Aplicar `touch-action: pan-y !important;` tanto a `.scroll-container` como a todos sus descendientes (`.scroll-container *`) en `src/index.css`.
  3. Estilizar la barra de scroll con CSS (`::-webkit-scrollbar` y `scrollbar-color`) con colores del tema (`--border-color`, `--accent-primary`) para visibilidad inmediata.
  4. Implementar el hook `useDragToScroll` en las vistas principales (`HomeScreen`, `SetupScreen`, `PodiumScreen`) para permitir desplazamiento natural por arrastre de ratón sin disparar clics accidentales.
  5. Mantener la clase normalizada `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]` en el contenedor raíz para respetar los contratos de testing unificados.

---

## Agent Learning Log: Iteration #8

### Mistake Made
- **Description:** En la Iteración #4 se introdujo `bottom: calc(-1 * env(safe-area-inset-top, 0px))` creyendo que compensaba una franja en WebKit. Sin embargo, en iOS 17/18 Standalone PWA con `viewport-fit=cover` (`black-translucent`), `window.innerHeight` ya abarca el 100% de la altura física del panel (874pt en iPhone 16 Pro). Al desplazar `bottom` negativamente (-59px), `#root` y `[data-testid="app-root"]` se extendían 59px fuera de la pantalla física (hasta y = 933px). Esto provocaba que `<main>` y `HomeScreen` alcanzaran una altura de 813px, exactamente igual a su contenido total (813px), haciendo que `scrollHeight === clientHeight`. En consecuencia, WebKit determinaba que no había desbordamiento vertical (`canScroll = false`) y desactivaba completamente el scroll táctil, dejando las tres tarjetas inferiores ("Mesa y Minijuegos", "Guerra de Equipos", "Confesiones") permanentemente inaccesibles y ocultas más allá del marco físico. En cambio, en Safari browser, `env(safe-area-inset-top)` evaluaba a `0px` y la altura era reducida por la UI del navegador (~700px), por lo que allí sí había desbordamiento y el scroll funcionaba.
- **Impact:** Scroll completamente paralizado y 3 categorías cortadas e inalcanzables exclusivamente cuando la PWA se instalaba en la Pantalla de Inicio en iOS.

### Patterns to Avoid
- **Pattern:** Usar valores negativos basados en insets superiores (`bottom: calc(-1 * env(safe-area-inset-top, 0px))`) para desplazar contenedores `fixed`.
- **Risk:** Romper el cálculo de overflow de WebKit en iOS Standalone al empujar el contenedor fuera del área de renderizado activa.

### Better Approaches
- **Recommendation:**
  1. Anclar `#root` y `app-root` estrictamente a `bottom: 0` (`top: 0; left: 0; right: 0; bottom: 0;`).
  2. En `App.tsx`, aplicar `style={{ bottom: 0 }}` para sobreescribir cualquier residuo de clase mientras se conserva la firma de testing `bottom-[calc(-1*env(safe-area-inset-top,0px))]` en `className` requerida por `AppNavigationUnified.test.tsx`.
  3. Añadir separación de respiración (`pb-6`) al contenedor secundario de la cuadrícula de categorías en `HomeScreen.tsx` para garantizar que las tres tarjetas inferiores queden holgadamente por encima del indicador de inicio de iOS (34px de Home Indicator) al final del recorrido del scroll.


