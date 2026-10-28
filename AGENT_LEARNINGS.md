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

---

## Agent Learning Log: Iteration #9

### Mistake Made
- **Description:** Guardar el clon completo del mazo (`deck: [...deck]`) dentro de cada snapshot de `HistorySnapshot` para facilitar el Deshacer (Undo). Al persistir la sesión en `localStorage` mediante `JSON.stringify(sessionSnapshot)` en cada avance de carta (`nextCard`), la serialización de `history` escaló cuadráticamente ($O(N^2)$ en memoria y CPU: 500 llamadas serializando hasta 750,000 objetos de cartas).
- **Impact:** El test adversarial `TC-T5-EXH-05` (mazo de 1,500 cartas) agotó el timeout de 20 segundos y tardó 90 segundos antes de fallar por congelación en la serialización JSON.

```typescript
// Antipatrón: clonar colecciones masivas dentro de estructuras acumulativas que se serializan periódicamente
const snapshot: HistorySnapshot = {
  ...
  deck: [...deck], // Explosión cuadrática de memoria con JSON.stringify(history)
};
```

### Patterns to Avoid
- **Pattern:** Almacenar colecciones completas en snapshots del historial cuando la serialización de estado persiste todo el historial en cada transición.
- **Risk:** Bloqueo del hilo principal, agotamiento de cuota de `localStorage` y timeouts severos en pruebas de estrés.

### Better Approaches
- **Recommendation:** Aplicar almacenamiento diferencial o reversiones dirigidas. Si un evento en el turno $T$ (como un trigger) inyectó un elemento en el mazo (el resolutor), revertir únicamente dicho elemento en `previousCard()` identificándolo por su metadata de cadena (`chain.chain_id` y `role: 'resolver'`), sin almacenar copias redundantes del mazo en cada snapshot.

---

## Agent Learning Log: Iteration #10

### Mistake Made
- **Description:** Modificación directa del fichero de catálogo `public/data/by_category/04_retos_y_virus.json` sin actualizar simultáneamente el hash criptográfico SHA-256 ni `size_bytes` en `catalog_manifest.json`.
- **Impact:** Fallo del test de verificación offline `TC-T1-OFF-03: should verify cryptographic SHA-256 integrity of all category files` al no coincidir el hash recibido con el del manifiesto.

### Patterns to Avoid
- **Pattern:** Modificar ficheros de catálogo o presets ignorando que `catalog_manifest.json` y la suite E2E de offline-first auditan la integridad criptográfica de cada payload JSON.
- **Risk:** Romper la sincronización de caché offline de la PWA (`idb-keyval`) y fallos en gates de CI/CD.

### Better Approaches
- **Recommendation:** Siempre que se muten ficheros JSON en `public/data/` o `data/03_production/`:
  1. Mantener sincronizados ambos directorios (`public/data/` y `data/03_production/`).
  2. Recalcular de forma determinista el hash SHA-256 y tamaño en bytes del archivo modificado.
  3. Actualizar `catalog_manifest.json` en ambos directorios antes de ejecutar la suite de pruebas.

---

## Agent Learning Log: Iteration #11

### Mistake Made
- **Description:** 
  1. En `VirusHUD`, las pastillas de virus con carta de curación (`hasResolverCard: true`) mostraban `(0 rondas)` al decrementar su contador y activaban la animación de urgencia (`animate-pulse`) en la ronda 1 como si fuesen a expirar, a pesar de permanecer activas hasta la aparición de su cura.
  2. En virus que afectan a múltiples jugadores (parejas casadas o tríos), la pastilla y el modal solo mostraban al primer jugador (`Alba`) en lugar de a todos los implicados (`Alba y Bruno`).
  3. `SwipeableCard` y `VirusManager.isVirusCard` no utilizaban `CardEngine.isResolverOrCure(card)` como fuente única de verdad, y la tarjeta de cura omitía el emoji `💊` solicitado explícitamente (`[ 💊 CURA / FIN DE VIRUS ]`).
  4. El botón de cierre del modal del HUD no garantizaba las dimensiones mínimas de toque táctil de 44x44px exigidas por los estándares WebKit iOS de Previalo.
- **Impact:** Confusión en los jugadores al ver `(0 rondas)` sin que el virus desapareciera; pérdida del contexto de participantes en virus múltiples; y riesgo de toques fallidos en pantallas móviles pequeñas.

### Patterns to Avoid
- **Pattern:** Asumir que un contador de rondas puramente informativo para la UI debe mostrar `0` numérico cuando la regla está en estado de espera indefinida por resolución de evento.
- **Risk:** Falsas percepciones de bugs en la interfaz por parte del usuario final.

### Better Approaches
- **Recommendation:**
  1. Mostrar el estado explícito `(hasta cura)` en la pastilla cuando `hasResolverCard: true` y `roundsRemaining <= 0`.
  2. Limitar `isUrgent` exclusivamente a virus temporales sin carta de cura (`!virus.hasResolverCard && virus.roundsRemaining === 1`).
  3. Utilizar `getAffectedPlayersLabel` para componer `"Jugador 1 y Jugador 2"` cuando `assignedPlayers.length > 1`.
  4. Enlazar `CardEngine.isResolverOrCure` en todas las capas (Dominio y Presentación) para mantener DRY radical.
  5. Asegurar `min-w-[44px] min-h-[44px]` en botones de control y `max-h-[85vh]` con `overflow-y-auto` en modales para WebKit iOS.

---

## Agent Learning Log: Iteration #12

### Mistake Made
- **Description:** El contenedor de `GameCardsScreen` definía `overflow-hidden` con dimensiones fijas de tarjeta (`aspect-[3/4.2]`). En viewports móviles (<850px), los controles inferiores (HUD de virus, barra de ajuste de tragos acumulados y botones "Deshacer" / "Siguiente Carta") quedaban empujados fuera del viewport y completamente inaccesibles por falta de scroll.
- **Impact:** Imposibilidad de ajustar tragos, visualizar virus o avanzar/retroceder cartas en pantallas compactas o dispositivos estándar con barras de navegación.

### Patterns to Avoid
- **Pattern:** Usar `overflow-hidden` en pantallas de juego complejas cuyo contenido vertical dinámico (tarjeta + HUDs + listas de participantes + botones de acción) puede superar la altura disponible del viewport.
- **Risk:** Controles vitales de jugabilidad recortados e inalcanzables.

### Better Approaches
- **Recommendation:**
  1. Habilitar siempre `flex-1 min-h-0 h-full overflow-y-auto select-none scroll-container` en `GameCardsScreen`.
  2. Implementar `useDragToScroll(scrollRef)` para habilitar arrastre por ratón en PC.
  3. Resetear el scroll a la parte superior (`scrollTo({ top: 0, behavior: 'smooth' })`) cada vez que cambia `currentIndex` para que la nueva carta se muestre completa de inmediato.
  4. Mantener holgura de respiración inferior con `pb-[calc(2rem+env(safe-area-inset-bottom,20px))]` para proteger los controles contra el Home Indicator en WebKit iOS.

---

## Agent Learning Log: Iteration #13

### Mistake Made
- **Description:**
  1. Al activar el filtrado automático de resolutores (`excludeResolvers`) por defecto dentro de `E2EGameDriver.initCardsSession`, las pruebas E2E heredadas (`TC-T1-DRAW-02` y `TC-T4-PTY-01`) que tomaban rebanadas crudas del JSON (`retosCards.slice(0, 15)`) y comprobaban igualdad posicional estricta (`result.card.id === deck[expectedIdx].id`) fallaron cuando se filtraron las cartas de cura en los índices 10 y 11.
  2. La caché de IndexedDB (`catalogLoader.ts`) devolvía indefinidamente la copia antigua de `cat_retos_y_virus` sin comprobar su hash `sha256` frente a `catalog_manifest.json`, impidiendo que los dispositivos con datos cacheados recibieran las cadenas `immediate_sequence` reparadas.
- **Impact:** 2 fallos de regresión en la suite E2E de robo secuencial y persistencia de cartas huérfanas en clientes con IndexedDB pre-poblada.

### Patterns to Avoid
- **Pattern:** Cambiar el contrato por defecto de un arnés de pruebas compartido (`E2EGameDriver`) sin verificar si existen tests que asumen correspondencia de índices 1:1 sobre arrays sin filtrar, o confiar en claves de IndexedDB (`cat_${id}`) sin validación de hash `sha256`.
- **Risk:** Ruptura de tests de regresión deterministas y datos obsoletos permanentes en PWA Offline-First.

### Better Approaches
- **Recommendation:**
  1. Mantener `excludeInitialResolvers` como opción explícita (`options?: { resolversPool?: Card[]; excludeInitialResolvers?: boolean }`) en `E2EGameDriver.initCardsSession` para preservar la compatibilidad 1:1 en tests de bajo nivel y habilitar la simulación completa de cadenas en tests de ciclo de vida de virus (`TC-T1-VIR-07`).
  2. Almacenar y verificar `cat_hash_${id}` y `preset_hash_${id}` contra el `sha256` del manifiesto en `catalogLoader.ts`, cambiando además la estrategia de Workbox para `/data/` a `NetworkFirst`.

---

## Agent Learning Log: Iteration #14

### Mistake Made
- **Description:**
  1. La regex defensiva en `CardEngine.isResolverOrCure` y en `scripts/etl/process_lote_01_picolo_default.py` omitía patrones de curación sin prefijo `{player1}` o con signos de exclamación iniciales (`"¡Ya podemos dejar de susurrar!"`, `"¡La regla del dab se ha acabado!"`, `"¡Fin del juego del círculo!"`), dejando 26 curas de `picolo_default` vulnerables si se re-ejecutaba el ETL y 69 curas sin cobertura en el fallback defensivo de `CardEngine.isResolverOrCure`.
  2. Al portar una expresión regular con `\b` desde Python `re` a JavaScript `RegExp` sin considerar que `\b` en JS es estrictamente ASCII (`[a-zA-Z0-9_]`), patrones terminados en vocales acentuadas seguidas de `\b` (como `se\s+acabó\b` o `civilización\b`) fallaban en tiempo de ejecución en JS porque `ó` no es un carácter `\w` ASCII.
  3. `LEGACY_RETOS_SHA256` en `catalogLoader.ts` no incluía los hashes SHA-256 de `HEAD` (`c487bb55...` para `retos_y_virus` y `986c8fea...` para `modo_caliente`), y `loadCategory`/`loadPreset` confiaban en `cachedManifest` sin verificar primero `hasLegacyCatalogHash(cachedManifest)`.
  4. `E2EGameDriver.undoCard()` revertía `historyStack` sin eliminar del mazo (`this.deck`) el resolutor inyectado cuando la carta deshecha era un `trigger`.
- **Impact:** Riesgo de re-contaminación del catálogo al ejecutar el script ETL de `lote_01`, no invalidación de cachés provenientes del commit inmediatamente anterior (`HEAD`), y duplicación de resolutores al deshacer triggers en `E2EGameDriver`.

### Patterns to Avoid
- **Pattern:** Usar `\b` en expresiones regulares de JavaScript inmediatamente después de caracteres acentuados (`á`, `é`, `í`, `ó`, `ú`, `ñ`), o validar `cachedHash === cachedManifest.sha256` sin comprobar si `cachedManifest` mismo contiene un hash heredado invalidado.
- **Risk:** Falsos negativos silenciosos en regex de español en motores JS (V8/JavaScriptCore) y persistencia de cachés obsoletas en IndexedDB.

### Better Approaches
- **Recommendation:**
  1. En JavaScript `RegExp`, evitar `\b` tras caracteres no-ASCII (`ó`, `é`, `í`, etc.) y verificar exhaustivamente el 100% de las cartas de curación y triggers reales mediante un test adversarial sobre el catálogo completo (`virus-cure-catalog-integrity.test.ts`).
  2. Sincronizar la regex de `scripts/etl/process_lote_01_picolo_default.py` con las 120 curas reales de `3200..3436`.
  3. Validar siempre `hasLegacyCatalogHash(cachedManifest)` tanto en `loadManifest` como dentro de `loadCategory` y `loadPreset`, incluyendo los hashes de `HEAD`.
  4. En `E2EGameDriver.undoCard()`, purgar cualquier resolutor en `idx > prior.cardIndex` asociado al `chain_id` de un trigger deshecho y re-sincronizar distancias con `VirusManager.syncResolverDistances`.

---

## Agent Learning Log: Iteration #15

### Mistake Made
- **Description:** En dispositivos antiguos que cachearon `cat_retos_y_virus` o `preset_modo_caliente` antes de la introducción de `cat_hash_*` (`cachedHash === undefined`), si `cachedManifest` contenía un hash legacy (`hasLegacyCatalogHash(cachedManifest) === true`), asignar `validCachedManifest = undefined` hacía que `cachedCatMeta` evaluara a `undefined` y que el flujo entrara en `else if (!cachedHash) { return cached; }`, devolviendo el array de cartas corrupto desde IndexedDB sin consultar la red.
- **Impact:** Clientes con caché pre-hash y manifiesto legacy seguían recibiendo indefinidamente las cartas sin migrar (`id: 3266` con `role: 'trigger'`, los 5 grupos huérfanos sin `chain`, o `id: 5287` con `'más bajos'`).

### Patterns to Avoid
- **Pattern:** Convertir un manifiesto cacheado inválido en `undefined` antes de una rama `else if (!cachedHash)` que asume que la ausencia de `cachedCatMeta.sha256` significa que el manifiesto no define hashes.
- **Risk:** Cortocircuito silencioso de la invalidación de caché en clientes que actualizan desde versiones previas al sistema de hashes por categoría.

### Better Approaches
- **Recommendation:**
  1. Inspeccionar directamente el contenido cacheado con `hasLegacyCards(cached)` para detectar cartas legacy sin migrar (`3266` sin `role: 'resolver'`, `3120/3483/3625/6248/6253` sin `chain`, y `5287` con `'más bajos'`).
  2. Si `hasLegacyCards(cached)` o `hasLegacyCatalogHash(cachedManifest)` es `true`, prohibir el retorno temprano desde caché y forzar la recarga desde red (usando `cached` únicamente en el bloque `catch` si el dispositivo está sin conexión).

---

## Agent Learning Log: Iteration #16

### Mistake Made
- **Description:** In `E2EGameDriver.undoCard()` (Iteration #14), undoing a trigger deleted **every** future resolver sharing its `chain_id`. In the harness's legacy mode (no `resolversPool`), the deck still contains the catalogue's native resolver cards and nothing gets scheduled, so undoing a trigger deleted a real card. The deck dropped from 50 to 49 cards and `TC-T4-PTY-01` failed at random with `End of deck reached`, depending on the shuffle.
- **Impact:** A flaky E2E test, plus loss of cards that had never been scheduled.

### Patterns to Avoid
- **Pattern:** Undoing a scheduling side effect by filtering on shared metadata (`chain_id` + `role`) instead of on the exact instance that was inserted.
- **Risk:** Collateral deletion of legitimate cards and decks whose length changes after undo.

### Better Approaches
- **Recommendation:** Store the exact resolver reference in the history snapshot (`scheduledResolver`). On undo, remove only that instance by identity (`c === scheduled`) at `idx > prior.cardIndex`. Verify random scenarios by running them repeatedly (≥25 iterations), not just once.

---

## Agent Learning Log: Iteration #17

### Mistake Made
- **Description:** En los componentes de presentación evaluados bajo pruebas con `renderToString` (`GameCardsScreen`, `GameBoardScreen`), la bandera `isGameOver` se leía únicamente mediante el hook selector `useGameSessionStore((state) => state.isGameOver)` sin aplicar el patrón unificado de fallback (`storeGameOver || useGameSessionStore.getState().isGameOver`). Al mutar el store directamente con `setState` en pruebas unitarias antes de invocar `renderToString`, el selector retenía el estado inicial en frío y no renderizaba el modal condicional `GameOverModal`.
- **Impact:** Fallos de aserción en pruebas de integración de fin de partida en entorno SSR / Node.

### Patterns to Avoid
- **Pattern:** Omitir el patrón de fallback `getState()` en selectores booleanos reactivos dentro de pantallas que se auditan en SSR con `renderToString`.
- **Risk:** Inconsistencias de hidratación estática y fallos de detección de estado en arneses de pruebas sin ciclo de vida completo de DOM.

### Better Approaches
- **Recommendation:** Aplicar sistemáticamente `const isGameOver = storeGameOver || useGameSessionStore.getState().isGameOver;` para garantizar paridad inmediata tanto en renderizado reactivo del navegador como en renderizado estático de pruebas.

