# Guía SCORM Universal — cómo construir cualquier lección interactiva SCORM 1.2

> **Cómo usar esta guía**: cítala (pégala o referénciala) al pedirle a un asistente de IA —o a ti mismo si programas a mano— que construya una lección interactiva. No depende de ninguna materia, grado ni marca: es el patrón de ingeniería (motor + empaquetado SCORM) que hay debajo de cualquier lección de este tipo. Lo único que cambia lección a lección son los **datos** (textos, imágenes, respuestas correctas, colores de marca), nunca la lógica.
>
> Esta guía viene acompañada de dos archivos listos para copiar en `templates/`:
> - `templates/imsmanifest.xml` — manifiesto SCORM 1.2 genérico.
> - `templates/index-skeleton.html` — un SCO funcional de una sola página con sidebar, 4 mecánicas de ejemplo, persistencia SCORM completa y reanudación. Cópialo y reemplaza los datos.

---

## 1. Qué es un paquete SCORM 1.2 (lo mínimo indispensable)

Un paquete SCORM 1.2 para Moodle (o cualquier LMS compatible) es un ZIP **plano** (sin subcarpetas en la raíz) con al menos:

```
index.html         ← el SCO: toda la lección en un solo archivo autocontenido
imsmanifest.xml     ← el manifiesto que le dice al LMS qué abrir y cómo calificar
logo.png            ← (opcional) icono/imagen de portada del curso
```

Reglas fijas:

- **Un solo SCO** (`<organization>` con un único `<item>`) es más simple y más robusto que dividir la lección en varios SCOs — evita sincronizar progreso entre archivos.
- `adlcp:masteryscore` en el manifiesto define el % para pasar de `incomplete` a `passed`/`failed` (70 es un valor típico para primaria; ajústalo al caso).
- Todo el contenido (imágenes, audio, PDF, fuentes) se **incrusta en base64 dentro del propio `index.html`** — nada de rutas relativas a otros archivos, porque muchos LMS no garantizan que se conserve la estructura de carpetas dentro del SCO. Esto también hace que la lección funcione igual si se abre suelta (`file://` o por HTTP) fuera del LMS.
- Empaqueta con `zip -j paquete.zip index.html imsmanifest.xml logo.png` (la bandera `-j` aplana rutas; sin ella Moodle puede no encontrar `index.html` en la raíz del ZIP).
- **Verifica el ZIP por contenido antes de entregarlo**, no confíes en que el comando de zip corrió bien: `unzip -p paquete.zip index.html | grep -c "algo que sepas que agregaste"`. Un `&&` que falla a mitad de una cadena de comandos deja tranquilamente el ZIP viejo en la carpeta de salida.

Plantilla lista para usar: `templates/imsmanifest.xml` (solo cambia `identifier`, `<title>` y el umbral de `masteryscore` si aplica).

---

## 2. Arquitectura del motor (genérica, para cualquier tema)

El patrón que mejor escala (probado en producción con decenas de lecciones reales) es **sidebar + área de contenido**, no un simple carrusel de diapositivas con flechas. Un solo archivo HTML con:

- Un `<div class="sidebar">` con la lista de pantallas/bloques de la lección.
- Un `<div class="content">` donde se muestra la pantalla activa (`.screen`), controlada por una función `go(id)`.
- Todas las pantallas viven en el DOM a la vez (`display:none` salvo la activa) — evita reconstruir HTML al navegar, lo que a su vez evita bugs de balance de etiquetas.

### 2.1 IDs de pantalla — convención fija

Usa IDs de pantalla estables y **nunca los renumeres** una vez que la lección tiene contenido real (si agregas piezas después, dales IDs "altos" nuevos en vez de reordenar los existentes):

```
s20   Guía para el adulto/acompañante   (informativa, sin calificar)
s21   Guía de apoyos/adaptaciones        (informativa, sin calificar)
s22   Introducción                       (carrusel de 5-6 diapositivas)
s1..sN  Actividades 1..N                 (agrupadas en el sidebar bajo un solo ítem si N ≥ 12)
s(N+1)  Reto final / mini-juego          (siempre califica)
s(N+2)  Tarea o producto para casa       (sin calificar)
s(N+3)  Resumen y Test                   (resumen sin calificar + test que sí califica)
s(N+4)  Puntaje final
```

### 2.2 Los 5 objetos que gobiernan todo (data-driven, no hardcodees pantalla por pantalla)

```js
var ACT_SEQUENCE = ['s1','s2','s3', /* ... orden en el menú, no tienen que ser IDs consecutivos */];
var ACT_NAMES    = { s1:'Nombre visible de la actividad 1', /* ... */ };
var scores       = { a1:0, a2:0, /* una clave por actividad CALIFICABLE */ };
var MAX          = { a1:10, a2:5, /* puntaje máximo de esa clave */ };
var KEY          = { s1:'a1', /* pantalla -> clave de scores; las NO calificables no van aquí */ };
var FB           = { s1:'Texto de pista para esta pantalla.', /* evita heredar el texto de la pantalla anterior */ };
```

De estos cinco objetos se derivan automáticamente: la lista de pantallas, los títulos, la barra de progreso, el botón "Siguiente" y la tabla de puntaje final. **Agregar una actividad nueva es agregar una entrada en cada uno de estos objetos + su HTML + su función `xxBuild()`** — nunca tocar a mano la lógica de navegación o de puntaje.

Actividades **no calificables** (dibujo libre, autoevaluación, exploración) no llevan clave en `scores`/`KEY`; si son obligatorias para avanzar, deshabilita el botón "Siguiente" hasta que se completen (nunca bloquees por no acertar, solo por no intentar).

### 2.3 `markSideDone` — por ID de pantalla, nunca por posición

Si agrupas actividades bajo un solo ítem de sidebar (recomendado desde 12-15 actividades), las posiciones numéricas cambian de sentido. Usa siempre lookup por ID:

```js
var actDone = {};
function markSideDone(id){
  if(ACT_SEQUENCE.indexOf(id) !== -1){
    actDone[id] = true;
    var badge = document.getElementById('actProgress');
    if(badge) badge.textContent = Object.keys(actDone).length + '/' + ACT_SEQUENCE.length;
    return;
  }
  var el = document.querySelector('.side-item[data-s="' + id + '"]');
  if(el) el.classList.add('completed');
}
```

### 2.4 Flechas de navegación entre actividades

Cuando el sidebar agrupa las actividades bajo un solo ítem, pon flechas ‹ › fijas al centro vertical del área de contenido — **como hermanas de `.content`**, no dentro de cada pantalla (si no, se duplican o se pierden al cambiar de pantalla):

```js
function updateActArrows(){
  var i = ACT_SEQUENCE.indexOf(cur);
  var wrap = document.getElementById('actArrows');
  if(i === -1){ wrap.classList.remove('show'); return; }
  wrap.classList.add('show');
  document.getElementById('actArrowLeft').classList.toggle('disabled', i === 0);
  document.getElementById('actArrowRight').classList.toggle('disabled', i === ACT_SEQUENCE.length - 1);
}
// Llamar dentro de go(), justo antes de refrescar la barra de progreso.
```

### 2.5 `setFb` por pantalla

Cada pantalla nueva —calificable o no— necesita su propia línea dentro de `go(id)` para fijar el texto de pista. Si no la tiene, se queda mostrando literalmente el texto de la última actividad visitada, lo que confunde más que ayuda:

```js
function go(id){
  cur = id;
  if(id === 's7') setFb('Texto de pista apropiado para esta pantalla.');
  // ...resto de go(): mostrar/ocultar pantallas, updateActArrows(), updateBar(), etc.
}
```

---

## 3. Catálogo de mecánicas interactivas (genéricas, para cualquier materia)

Todas siguen la misma convención de puntaje: `scores.<clave>++` en el acierto → entrada en `totalPts()` → fila en la tabla de puntaje final → se resetean con "Intentar de nuevo". Adapta el **dato** (qué es correcto, qué imagen/texto se muestra) a tu tema; la mecánica no cambia.

| # | Mecánica | ¿Se califica? | Úsala para... |
|---|---|---|---|
| 1 | Emparejar por clic-clic (ítem → casilla) | Sí | Vocabulario, conceptos con su definición/imagen |
| 2 | Escuchar y elegir (audio real o TTS) | Sí | Comprensión auditiva, pronunciación, identificación sonora |
| 3 | Selección múltiple por escena (checkboxes) | Sí | "Elige las N opciones correctas de esta situación" |
| 4 | Canvas flood-fill (colorear puntos objetivo) | Parcial (solo puntos de control) | Identificar partes de un diagrama, mapa, ciclo |
| 5 | Canvas de dibujo libre | **No** — solo obligatoria | Expresión libre, boceto, exploración |
| 6 | Completar (input de texto) | Sí | Ortografía, completar fórmulas, vocabulario |
| 7 | Elegir 1 de 2 (clic simple) | Sí | Decisiones binarias, verdadero/falso con texto |
| 8 | Arrastrar + retroalimentación dinámica | **No** — solo obligatoria | Simulaciones exploratorias ("¿qué pasa si...?") |
| 9 | Autoevaluación (caritas o escala 1-3) | **No** — solo obligatoria | Cierre metacognitivo ("¿qué tan seguro me siento?") |
| 10 | Test final de opción múltiple | Sí | Evaluación sumativa de cierre |
| 11 | Elegir 1 de N con imagen/ícono por opción | Sí | Cualquier "elige la respuesta correcta entre varias" |
| 12 | Reordenar unidades en secuencia (letras, pasos, palabras) | Sí | Ortografía, orden cronológico, construcción de oraciones |
| 13 | Memoria (parejas) | Sí (1 pt/pareja) | Asociación concepto↔representación |
| 14 | Conteo / cálculo simple | Sí | Matemáticas básicas, conteo de elementos en escena |
| 15 | Figura/forma generada por código (SVG) → identificarla | Sí | Geometría, clasificación visual verificable por construcción |
| 16 | Sí/No sobre una escena | Sí | Comprensión de una situación o imagen |
| 17 | Construir enunciado (tocar unidades en orden) | Sí | Gramática, fórmulas, pasos de un proceso |
| 18 | "El diferente" (1 de 4 no pertenece al grupo) | Sí | Clasificación, categorización |
| 19 | Acertijo/pista → elegir 1 de 3 opciones | Sí | Vocabulario, razonamiento deductivo simple |

**Helper genérico reutilizable** para las mecánicas "elige 1 de N" (11, 14-19): un solo listener por contenedor, bloquea opciones al acertar, suma puntos, marca la actividad completa:

```js
function pick(container, answer, key, max, screenId, okText, badText){
  container.querySelectorAll('.opt').forEach(function(opt){
    opt.addEventListener('click', function(){
      if(opt.classList.contains('locked')) return;
      var ok = opt.dataset.value === String(answer);
      opt.classList.add(ok ? 'correct' : 'wrong');
      if(ok){
        container.querySelectorAll('.opt').forEach(o => o.classList.add('locked'));
        scores[key] = Math.min(max, (scores[key] || 0) + 1);
        setFb(okText || '¡Correcto!');
        rec(screenId, opt.dataset.value);
        if(scores[key] >= max) markSideDone(screenId);
        updateGlobalPts();
      } else {
        setFb(badText || 'Intenta de nuevo.');
        setTimeout(() => opt.classList.remove('wrong'), 450);
      }
    });
  });
}
```

### Patrones de código por mecánica

**1. Emparejar clic-clic:**
```js
var MATCH = {'1':'a','2':'b'}; // id del ítem -> id de la casilla correcta
function initItem(el){
  el.addEventListener('click', function(){
    if(el.classList.contains('used')) return;
    document.querySelectorAll('.item-chip').forEach(w => w.classList.remove('sel'));
    el.classList.add('sel'); selected = el;
  });
}
function initSlot(slot){
  slot.addEventListener('click', function(){
    if(!selected) return;
    var ok = MATCH[selected.dataset.id] === slot.dataset.id;
    if(ok){ selected.classList.add('used'); slot.appendChild(selected.cloneNode(true)); scores.match++; rec('sX', selected.dataset.id); }
    else { slot.classList.add('wrongflash'); setTimeout(() => slot.classList.remove('wrongflash'), 450); }
    updateGlobalPts();
  });
}
```
Para arrastre visual real (no clic-clic) usa **pointer events**, nunca el drag&drop nativo de HTML5 — falla en tablets.

**4. Canvas flood-fill (calificación parcial por puntos de control):**
```js
var TARGETS = [{n:1, fx:0.13, fy:0.52, color:'#2e9e4f'}, /* fx/fy en fracción 0-1, no píxeles absolutos */];
// Calificar: leer el pixel en (fx*canvas.width, fy*canvas.height) y comparar color con tolerancia ~40/canal.
// Nunca califiques "coloreó bien todo": es imposible verificar de forma confiable. Muestra los puntos numerados
// visiblemente sobre el dibujo para que el usuario sepa exactamente dónde tocar.
function floodFill(x, y, hex){
  // BFS/stack-based, nunca recursivo (desborda la pila en imágenes grandes).
}
```

**6. Completar (input de texto):**
```js
function checkAnswer(input){
  var val = input.value.trim().toLowerCase();
  if(val === input.dataset.answer){ input.classList.add('correct'); input.disabled = true; scores.write++; rec('sX', val); }
  else { input.classList.add('wrong'); setTimeout(() => input.classList.remove('wrong'), 600); }
  updateGlobalPts();
}
input.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); checkAnswer(input); } });
input.addEventListener('blur', () => checkAnswer(input));
```

**12. Reordenar (letras/pasos/palabras en orden):**
```js
var units = shuffle(sequence.slice()); // si queda igual al original, invierte el arreglo
// cada unidad solo se acepta si es sequence[built.length]; si no, parpadea en rojo.
// al completar: built.classList.add('correct'); scores.xx++; rec('sX', sequence.join('|'));
```

**13. Memoria:**
12 cartas (6 pares) barajadas. Estado `{open:[], lock:false, found:0}`. Pareja válida = mismo valor, distinto tipo de representación. 1 punto por pareja. **Resetea el mensaje de estado en el build**: un bug real y recurrente es que tras "Intentar de nuevo" el texto se queda en "¡Todas encontradas!".

**Test final (mecánica 10):** genera las preguntas por JS desde un array de datos, no las escribas a mano en HTML:
```js
var TEST_Q = [{q:'...', o:['opción A','opción B','opción C'], ok:1}]; // ok = índice de la opción correcta
```

---

## 4. Envoltorio pedagógico (las piezas alrededor de las actividades numéricas)

Estas 7 piezas son universales para cualquier tema; solo cambia el contenido, nunca la estructura:

### 4.1 Guía para el adulto/acompañante (informativa, sin calificar)
1. **Objetivos**: qué se trabaja, resumido en 2-3 líneas + lo que la persona podrá hacer al terminar.
2. **Referente curricular**: el estándar/competencia que aplique (sin inventar códigos si no los tienes — describe la competencia en palabras).
3. **Cómo acompañar**: 3-5 consejos prácticos y concretos.
4. **Estilos de aprendizaje que se activan**: visual/auditivo/kinestésico/lecto-escritor, una frase cada uno.

### 4.2 Guía de apoyos/adaptaciones (accesibilidad)
4 tarjetas fijas, adaptando el contenido a la lección específica:
- 👁️ Apoyo visual (imágenes grandes, contraste, numeración clara)
- 👂 Apoyo auditivo (botón "repetir" sin límite, alternativa de lectura en voz alta)
- ✋ Apoyo motor (funciona con mouse/trackpad/dedo, sin cronómetro estricto, zonas de destino amplias ≥ 50 px)
- 💬 Apoyo emocional (actividades de exploración/autoevaluación **nunca** se califican como correcto/incorrecto, para reducir la ansiedad ante el error)

### 4.3 Introducción (carrusel de 5-6 diapositivas, formato "libro ilustrado")
Cada diapositiva: ilustración grande (≈46% del ancho) + título + 3-4 frases cortas con palabras clave resaltadas + botón "🔊 Escuchar" (TTS opcional). Una diapositiva por eje temático de la lección + una final con "¿Listo? ¡Empecemos!" y el botón de inicio. El carrusel debe ser genérico (`INTRO_N = document.querySelectorAll('.intro-slide').length`) para que agregar una diapositiva sea solo agregar el elemento, sin tocar JS de navegación.

### 4.4 Reto final / mini-juego (siempre califica)
Un mini-juego separado (puede vivir en un `<iframe>` propio) que **repase contenido ya visto** en las actividades numéricas — nunca introduzca contenido nuevo. Si usas un motor de retos reutilizable, la regla de oro es: **su lógica nunca se edita**, solo los datos de los retos y el texto de ambientación (tema visual/narrativo).

Si el reto vive en un iframe, hazlo transparente y **auto-ajustable en alto** (lee `contentDocument.scrollHeight` y fija `iframe.style.height`), para que se vea como una pantalla más y no como una ventana aparte. Cuidado: si algún ancestro del iframe tiene `flex:1`, el `flex-basis` implícito ignora silenciosamente cualquier `height` que le pongas por JS — hay que forzar también `flex:none` en la misma regla.

### 4.5 Tarea o producto para casa (sin calificar numéricamente)
2 tareas mínimo, tipo consulta + producto tangible, usando el vocabulario/concepto central de la lección. El adulto verifica y firma; no se califica en el SCO. Si el usuario sube un PDF con la guía/consigna impresa, incrústalo como descarga en base64 (`<a href="data:application/pdf;base64,..." download="...">`), en una tarjeta aparte.

### 4.6 Resumen y Test (mixto)
- **Resumen real de lo aprendido**, no un párrafo — en carrusel horizontal, una diapositiva por eje temático + una de reflexión libre (sin calificar) + el test. Todo lo que aparece en el resumen debe haberse practicado antes en las actividades numéricas.
- **Test de 5-8 preguntas de opción múltiple**, una por bloque de actividades relevante (nunca preguntes algo que no se haya visto en la lección). Puede implementarse como su propio sub-carrusel horizontal anidado dentro de la última diapositiva del resumen, con el mismo patrón de dots + Anterior/Siguiente que el carrusel exterior.

### 4.7 Puntaje final
Pantalla de cierre que suma automáticamente todas las claves de `scores` (no debería necesitar cambios de contenido, solo de estilo si adaptas el tema visual).

---

## 5. Persistencia SCORM 1.2 (obligatoria, no opcional)

Sin esto la lección "funciona" pero pierde todo el progreso al cerrar la pestaña — inaceptable para un LMS real. El bloque de persistencia se escribe **una sola vez** y no se reescribe lección a lección:

1. **Usuario**: lee `cmi.core.student_name` ("Apellido, Nombre") y muestra el primer nombre en la topbar y en el saludo de reanudación.
2. **Tiempos**: cronómetro visible = `cmi.core.total_time` (acumulado por el LMS) + sesión actual. Escribe `cmi.core.session_time` en `beforeunload`, en `visibilitychange → hidden` **y** cada 60 s (por si el navegador muere sin disparar esos eventos). Al iniciar, fija `cmi.core.exit = 'suspend'` para que el LMS reanude en vez de reiniciar.
3. **Reanudación**: un objeto de estado (`ST`) va a `cmi.suspend_data` como JSON (**mantente por debajo de ~4000 bytes** — mide `JSON.stringify(ST).length` con el catálogo completo respondido en el peor caso, no con una muestra parcial) y la pantalla actual a `cmi.core.lesson_location`. Cada acierto llama `rec(screenId, token)` con un **token estable que sobreviva al barajado** (una palabra, un índice de tarjeta, `"valor|posición"` — nunca la posición visual dentro de una lista que se reordena). Al reabrir, un `RESTORERS[screenId](token)` reproduce esa acción localizando el elemento por atributo `data-*`/texto, nunca por posición.
4. **Nota parcial**: escribe `cmi.core.score.raw/max/min` en cada acierto (con debounce de 1-1.5 s para no saturar el LMS). `lesson_status` se mantiene `incomplete` hasta la pantalla final, donde pasa a `passed`/`failed` según el umbral definido en `masteryscore`.

Sin LMS (vista previa suelta) todo lo anterior cae a `localStorage` con la misma lógica — así la lección se puede probar y demostrar sin depender de Moodle.

**Al agregar una actividad nueva**: (a) `rec()` en su rama de acierto con un token estable; (b) su entrada en `RESTORERS`; (c) atributos `data-*` en los elementos que el restaurador necesite localizar; (d) si tiene temporizadores (memoria, animaciones), pausarlos cuando `RESTORING === true`.

**Primera vez vs. regreso**: un mismo modal cubre los dos casos según si hay o no estado previo guardado (`had = load()`):
- **Primera vez** (`!had`): saludo + un solo botón "Empezar" que solo cierra el modal (no navega ni resetea nada, porque no hay nada que continuar).
- **Cada regreso** (`had`): "¡Bienvenido de nuevo!" con los puntos y la pantalla exactos donde quedó, botones "Continuar"/"Empezar de nuevo".

**Prueba obligatoria antes de entregar**: sirve la lección por HTTP (`python3 -m http.server`), inyecta un `window.API` simulado, haz trabajo parcial, cierra, reabre y verifica: modal correcto, pantalla, puntos, cada actividad restaurada, `session_time` y "Empezar de nuevo". **`file://` engaña**: Chromium da a cada pestaña `file://` un origen opaco y `localStorage` no se comparte entre pestañas del mismo archivo, así que un test de "cerrar y reabrir" parece fallar sin que haya bug real.

---

## 6. Guía visual y de accesibilidad (independiente de la marca)

- **Elementos tocables ≥ 50 px**, texto de actividad ≥ 17 px — más aún si el público es infantil.
- **Nunca reduzcas toda la pantalla con `transform:scale()`** para que "quepa"; usa rejillas responsivas y, si necesitas escalar contenido a la altura disponible, hazlo con una variable CSS + medición JS (búsqueda binaria), no con un tamaño fijo adivinado de una sola captura de pantalla.
- **Coherencia de estilo de ilustración**: si decides usar imágenes reales/3D para un objeto, úsalo consistentemente en todas las pantallas donde aparece ese mismo objeto — no mezcles fotos/3D con emojis o SVG planos para la misma cosa. Y **cuando cambies una ilustración, cambia el dato** (la respuesta correcta, las opciones, los textos que la describen) — son parte del mismo cambio.
- **Controles reales**: `button` o `role="button"` + `tabindex="0"`, con Enter/Espacio disparando el mismo evento que el clic. `aria-pressed` en bancos de selección, `aria-live` en la zona de retroalimentación, foco visible siempre, y respeta `prefers-reduced-motion`.
- **Responsive obligatorio**: bajo ~1000 px el sidebar pasa a cajón lateral (con foco atrapado, cierre por Escape/scrim/selección, `inert` en el contenido mientras está abierto), las rejillas bajan a 2-3 columnas, y todo el motor usa **pointer events** (no solo mouse) para que funcione con el dedo. El canvas necesita `touch-action:none` para no hacer scroll de página al dibujar.
- **Botones de impresión**: si hay un botón "Imprimir/Descargar informe" dentro de un iframe embebido en un LMS, `window.print()` puede fallar en silencio por el sandbox del reproductor. Llama `window.print()` de forma **síncrona** dentro del propio clic (nunca tras un `setTimeout`), envuelve en `try/catch`, y ofrece siempre un botón de respaldo que abra el mismo contenido en una pestaña nueva con `window.open()`.

---

## 7. Errores reales que rompieron entregas (evítalos desde el diseño)

Son bugs que ya ocurrieron en producción, no advertencias hipotéticas:

1. **Reemplazo de string que se traga un atributo vecino**: al buscar el primer `>` o `">` tras un bloque base64 para reemplazar un `src`, si la etiqueta tiene más atributos después, ese primer cierre puede pertenecer a otro atributo y lo borra en silencio. Usa marcadores de inicio **y** fin específicos del atributo completo (`src="..."`), nunca solo del valor.
2. **`</div>` de más al reconstruir HTML por script**: después de cualquier reconstrucción automatizada de HTML, cuenta `<div` vs `</div>` en el bloque tocado. Cuidado con falsos positivos: comentarios HTML con ejemplos de código sin cerrar cuentan en un conteo de texto plano aunque el navegador los ignore; y si el archivo incrusta otro HTML completo como string JS, acota el conteo al bloque real, no a todo el archivo.
3. **`speechSynthesis.cancel()` seguido de `speak()` en el mismo tick** deja el motor de voz de Chrome "colgado" sin lanzar error. Fix obligatorio si usas TTS:
   ```js
   function speak(text){
     window.speechSynthesis.cancel();
     setTimeout(function(){
       var u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 0.9;
       window.speechSynthesis.speak(u);
     }, 60); // el timeout es obligatorio, no cosmético
   }
   ```
4. **Audio comprimido incompatible**: convierte siempre a MP3 antes de incrustar (`ffmpeg -y -i entrada.m4a -codec:a libmp3lame -qscale:a 4 salida.mp3`), aunque tu navegador de prueba reproduzca bien el formato original.
5. **Audio/TTS bloqueado dentro de iframes con sandbox**: si algo suena fuera del LMS pero no dentro de la vista embebida, no es un bug del código — es la configuración del reproductor. En Moodle, la actividad SCORM debe abrirse en **"Nueva ventana"**, no en "Actual" ni en una ventana emergente con sandbox.
6. **Simular clics dentro de un `<iframe srcdoc>` anidado con coordenadas**: falla de forma intermitente en pruebas automatizadas. Usa clic por JS puro dentro del frame: `frame.evaluate(el => el.click())`, nunca clic por coordenadas cuando hay reflow entre clics.
7. **Recorte de imágenes con marco/borde decorativo**: no recortes "a ojo". Detecta el bbox real del contenido con `numpy`/`PIL` y pinta de blanco explícitamente todo lo que quede fuera de ese bbox, en vez de adivinar un rectángulo.
8. **No asumas cuál archivo es el correcto**: si el usuario ya subió un archivo equivocado antes en la misma conversación, compara por hash (`md5sum`) antes de decir nada sobre si es "el mismo" o "uno nuevo".
9. **Probar persistencia con `file://` engaña** (ver sección 5). Sirve por HTTP.
10. **Un `&&` que falla deja el ZIP viejo en outputs**: empaqueta en un paso separado del build/test y verifica el contenido del ZIP final antes de entregarlo.
11. **El cronómetro no se reinicia con "Intentar de nuevo"** si las variables de tiempo viven fuera del objeto de estado que sí se resetea. Al reiniciar, resetea explícitamente `sessionStart`/`totalPrev` también, no solo el estado lógico.
12. **Perder el ícono de un botón al primer clic** por sobrescribir `innerHTML` en el handler en vez de controlar el estado visual con una clase CSS. El estado visual de un botón con ícono SVG se controla con clases, nunca reescribiendo el marcado.
13. **"Reduce el tamaño" no significa "tamaño fijo pequeño"**: la respuesta correcta casi siempre es una escala fluida atada al espacio real disponible, no un número adivinado del peor caso visual.
14. **`flex:1` en un contenedor ignora silenciosamente una altura puesta por JS** (ver iframe auto-ajustable en 4.4). Si un elemento con `flex:1` en algún ancestro no respeta una altura que le pones por JS/CSS, sospecha primero de esto.
15. **CRÍTICO — nunca escribas la secuencia literal `</script>` dentro de un string de JS embebido en un `<script>`**: aunque esté dentro de comillas, el parser de HTML (no el de JS) cierra ahí el bloque `<script>` que envuelve todo el motor, y todo el código después queda huérfano. No se detecta con `node --check` (que solo parsea el JS extraído) — hay que cargar el `index.html` real en un navegador tras cualquier cambio que incruste una etiqueta `<script>` dentro de un string. Regla fija: escribe siempre `'<'+'script>'` / `'<'+'/script>'` (o `<\/script>`) cuando necesites la etiqueta dentro de un string.
16. **Antes de cambiar qué devuelve una función compartida, busca TODAS sus llamadas** (`grep -n "nombreFuncion("`). Cambiar de SVG a `<img>`, por ejemplo, rompe silenciosamente el CSS que apuntaba al selector de etiqueta antigua (`svg{...}`) en vez de a una clase.
17. **`visibility:visible` en `@media print` no revierte un `display:none` fijo** de otra regla — son propiedades independientes. Si un área de impresión empieza en `display:none`, agrega explícitamente `display:block !important` dentro del propio `@media print`.
18. **Variables CSS con ámbito no viajan solas fuera de su contenedor**: si reutilizas una clase que depende de `var(--algo)` definida solo en un contenedor padre específico, y la usas en un contenedor nuevo que no define esa variable, el elemento se ve "apagado" sin que haya ningún error — el navegador simplemente ignora la declaración sin valor.
19. **Vuelve a medir `suspend_data` cada vez que agregues preguntas de analítica o seguimiento**: un objeto verboso por entrada puede acercarse al límite de ~4000 bytes donde el guardado descarta silenciosamente parte del estado. Compacta a arreglos posicionales (`[a,b,c]` en vez de `{a:..,b:..,c:..}`) si te acercas al límite, y mide siempre con el catálogo completo respondido (peor caso), no con una muestra.
20. **Deshabilitar un input dispara `blur` automáticamente**: si tu validación de "completar palabra" corre tanto en `keydown` (Enter) como en `blur` (para validar al salir del campo), y en el acierto haces `input.disabled = true`, el navegador dispara `blur` en ese mismo instante porque un elemento deshabilitado no puede conservar el foco — así que el handler de `blur` vuelve a ejecutar la validación sobre un acierto que ya se registró, duplicando el `rec()` y el punto al reanudar. Guarda siempre al inicio del validador: `if (input.disabled) return;`.
21. **No hay generación de imágenes fotorrealistas dentro de este flujo**: si el diseño pide ilustraciones tipo render 3D más allá de lo que un SVG con gradientes puede lograr, sé explícito con quien pidió la lección — mejora todo lo que sí es código, y entrega una lista clara de los archivos de imagen pendientes (nombre, carpeta, medidas) para que se generen por fuera y se incrusten después, sin presentar un SVG como si fuera el render pedido.

---

## 8. Flujo de trabajo recomendado

1. **Recoge los insumos**: contenido/guía fuente, imágenes, audio, tema y nivel del público. Nunca reconstruyas contenido "de memoria" si hay una fuente original disponible.
2. **Planifica las actividades** sobre las partes reales del contenido fuente (1-2 mecánicas por parte), eligiendo del catálogo de la sección 3, antes de escribir código.
3. **Copia el esqueleto** (`templates/index-skeleton.html`), ajusta `ACT_SEQUENCE`, `ACT_NAMES`, `scores`, `MAX`, `KEY`, `FB` y los datos de cada actividad. Para cada actividad: `rec()` en el acierto + entrada en `RESTORERS` + atributos `data-*` estables.
4. **Construye y valida sintaxis**: extrae el `<script>` y corre `node --check` sobre él; cuenta `<div` vs `</div>`.
5. **Prueba en navegador real** (no solo revises el código): recorre todas las pantallas, prueba cada actividad nueva, confirma el cambio de puntaje visible, y si hay iframe embebido, resuelve al menos una interacción completa dentro de él.
6. **Prueba reanudación** por HTTP: trabajo parcial → cerrar → reabrir → modal + estado + puntos restaurados.
7. **Empaqueta plano** (`zip -j`) en un paso separado del build/test, y **verifica el ZIP por contenido** antes de entregarlo.
8. **Entrega**: ZIP, HTML suelto para previsualizar sin LMS, y un resumen honesto de qué se probó y qué queda pendiente (la validación dentro de un Moodle real siempre queda pendiente si no hay acceso a uno).

---

## 9. Cómo citar esta guía al pedir una lección

Ejemplo de instrucción para un asistente de IA (o para ti mismo como checklist):

> "Usando la Guía SCORM Universal (`scorm-universal-guide/GUIA-SCORM-UNIVERSAL.md`) y el esqueleto `templates/index-skeleton.html`, construye una lección SCORM 1.2 sobre **[tema]** para **[público/grado]**, con **[N] actividades** interactivas eligiendo mecánicas del catálogo de la sección 3, envoltorio pedagógico completo (guía para el adulto, introducción, reto final, tarea, resumen+test, puntaje final), persistencia SCORM completa, y el checklist de entrega de la sección 8 antes de darme el ZIP final."

No hace falta repetir el contenido de esta guía en el mensaje: basta con nombrarla y decir el tema, el público y cuántas actividades quieres — toda la ingeniería (estructura de pantallas, mecánicas, persistencia, empaquetado, pruebas) ya está definida aquí.
