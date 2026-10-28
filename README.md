# Previalo 🍻🎲

**Previalo** es una aplicación web progresiva (PWA) de entretenimiento social diseñada bajo el modelo *Pass-and-Play* (dispositivo único compartido). Su propósito es gestionar y dinamizar partidas presenciales en grupo a través de un catálogo unificado de más de 6,900 tarjetas y tableros interactivos, operando de forma autónoma en el cliente sin requerir conexión a internet ni servidores remotos.

---

## 🔄 Dinámica de Juego y Ciclo de Vida de Partida

La aplicación está diseñada para colocarse en el centro de la mesa o circular de mano en mano entre los participantes. Toda la lógica de turnos, penalizaciones y reglas temporales se gestiona de forma centralizada:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CICLO GENERAL DE PARTIDA                        │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                      [ 1. Configuración de Sala ]
                      • Registro de jugadores activos
                      • Selección de modo (Cartas / Tablero)
                      • Selección de preset / intensidad
                                   │
                                   ▼
                      [ 2. Bucle de Juego Principal ]
        ┌──────────────────────────┴──────────────────────────┐
        ▼                                                     ▼
  MODO CARTAS                                           MODO TABLERO
  • Selección de carta activa                           • Lanzamiento de dado 3D
  • Interpolación de jugadores                          • Avance y rebote de casilla
  • Resolución del reto o dilema                        • Evento de casilla especial
  • Gestión y tick de Virus activos                     • Control de turnos y cárcel
        └──────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
                       [ 3. Registro y Cierre ]
                       • Conteo acumulativo de penitencias
                       • Modal de fin de partida y reinicio limpio
```

### 1. Configuración de Sesión
Antes de iniciar, la pantalla de preparación permite:
* **Gestión de Jugadores**: Registro ágil de participantes con memoria local de jugadores habituales para agregarlos con un solo toque.
* **Selección de Experiencia**: Elección entre dinámicas de cartas por turnos o recorrido sobre tablero.
* **Filtrado de Intensidad**: Posibilidad de jugar con el catálogo completo o acotarlo a filtros temáticos (Normal, Modo Caliente, Modo Parejas).

### 2. Flujo del Turno en Modo Cartas
1. **Pase de Dispositivo**: La interfaz indica a quién le corresponde leer o protagonizar la tarjeta.
2. **Interpolación Dinámica**: El motor inyecta automáticamente los nombres de los jugadores asignados al reto.
3. **Mecánica de Acción**: Se ejecuta la acción (pregunta, confesión, reto individual o votación colectiva).
4. **Contabilización**: El jugador activo o el grupo registran los tragos o puntos asociados.
5. **Transición y Control de Errores**: Deslizamiento hacia la siguiente carta, con opción de retroceso (*Undo*) para corregir toques accidentales sin alterar el orden del mazo.

---

## ⚙️ Mecánicas de Juego Detalladas

### ☣️ Sistema de Virus y Reglas Persistentes
A diferencia de los juegos de preguntas estáticos, Previalo implementa un sistema de **maldiciones temporales**:
* **Activación**: Al salir una carta clasificada como *Virus*, se asigna una penalización condicionada a un jugador (por ejemplo: *«Cada vez que alguien beba, debes hacer un brindis»* o *«Prohibido apoyar los codos en la mesa»*).
* **Seguimiento en Pantalla (HUD)**: Un indicador persistente muestra la regla activa y el número de turnos restantes.
* **Ciclo de Descuento (Tick)**: Cada nueva carta jugada descuenta un turno del contador.
* **Expiración Notificada**: Al llegar a cero, la aplicación reproduce una alerta visual y acústica indicando el fin del virus.

```
[ Carta Virus ] ──> Asigna penalización ──> HUD Activo (Turnos restantes: N)
                                                     │
                                            (Cada turno resta 1)
                                                     │
                                                     ▼
[ Fin de Virus ] <── Notificación acústica <── Turnos restantes = 0
```

### 🎲 Mecánicas del Tablero (La Guatoca)
El modo tablero traslada la experiencia física del juego de la oca al entorno digital:
* **Recorrido de 45 Casillas**: Casillas tematizadas con retos inmediatos, casillas de castigo y zonas neutras.
* **Lanzamiento de Dados**: Simulación física en 3D que genera valores aleatorios uniformes del 1 al 6.
* **Aritmética de Rebote**: Si un jugador está en la casilla 43 y saca un 4 en el dado, avanza 2 casillas hasta la meta (45) y retrocede las 2 sobrantes, aterrizando en la casilla 43.
* **Casillas de Desplazamiento Especial**: Casillas enlazadas que permiten saltar hacia adelante (*«De copa en copa...»*) o retroceder posiciones por penalización.
* **Estado de Inmovilización (Cárcel)**: Si un jugador cae en la casilla de cárcel, su turno queda suspendido durante las rondas estipuladas mientras el resto de fichas continúan compitiendo.

### ⚖️ Motor de Sustitución y Equidad (`VariableReplacer`)
Para evitar que la aleatoriedad matemática simple seleccione repetidamente a los mismos participantes, el motor aplica reglas de distribución controlada:
* **Balanceo de Protagonismo**: Lleva un registro interno de apariciones por jugador en la sesión activa, favoreciendo a aquellos que han tenido menor participación en turnos recientes (desviación máxima controlada $\le 15\%$).
* **Garantía de Distinción**: En tarjetas que requieren dos o más participantes (`{player}` y `{player2}`), el motor garantiza que nunca se asigne la misma persona a ambos roles.
* **Adaptación Gramatical**: Ajusta automáticamente los artículos, pronombres y terminaciones según los nombres y equipos involucrados.

### 💥 Modo Caos (Intercalado Balanceado)
El Modo Caos fusiona tarjetas de múltiples categorías en un único mazo dinámico:
* **Regla de No-Monotonía**: El algoritmo de barajado garantiza que nunca aparezcan más de tres cartas consecutivas pertenecientes a la misma categoría temática.
* **Alternancia de Ritmo**: Combina preguntas reflexivas (*¿Qué prefieres?*), votaciones de alta energía (*Quién es más probable*), confesiones íntimas y retos de acción física para mantener el dinamismo grupal.

---

## 📐 Estructura de Datos y Catálogo

El contenido se estructura de forma modular en archivos independientes por categoría y tableros, coordinados a través de un catálogo central:

| Categoría / Modo | Formato de Interacción | Objetivo de la Dinámica |
|---|---|---|
| **Yo Nunca** | Grupal / Simultáneo | Romper el hielo mediante confesiones de experiencias pasadas |
| **¿Qué Prefieres?** | Debate / Votación | Elección entre dos dilemas extremos con argumentación |
| **Quién es Más Probable** | Votación a mano alzada | Juicio grupal simultáneo señalando al participante correspondiente |
| **Verdad o Reto** | Individual / Selección | Elección entre responder una pregunta íntima o cumplir una prueba física |
| **Retos y Virus** | Individual / Persistente | Asignación de tareas activas y reglas que perduran varias rondas |
| **Guerra de Equipos** | Por bandos (Team A / Team B) | Competición por relevos, pruebas grupales y sistema de puntuación |
| **Confesiones** | Individual / Parejas | Preguntas comprometidas diseñadas para rondas avanzadas |
| **El Tablero (Clásico / Hot)** | Turnos con dado y fichas | Carrera competitiva de 45 casillas con trampas y casillas temáticas |

---

## 💾 Persistencia de Sesión y Resiliencia en Cliente

Al ejecutarse completamente en el navegador del dispositivo, la aplicación implementa mecanismos de tolerancia a interrupciones:
* **Almacenamiento Local Reactivo**: Cada avance de carta, tirada de dado, cambio en las fichas del tablero y estado de los virus se persiste inmediatamente en el almacenamiento local.
* **Recuperación ante Bloqueo de Pantalla**: Si el dispositivo móvil entra en reposo o el navegador se recarga, la partida se restaura exactamente en el estado, turno y posición en que se encontraba.
* **Audio Procedural sin Carga de Archivos**: Los avisos sonoros (clics de dados, paso de cartas, alarmas de virus) son generados algorítmicamente mediante síntesis de ondas con la *Web Audio API*, eliminando esperas de carga de archivos multimedia.
