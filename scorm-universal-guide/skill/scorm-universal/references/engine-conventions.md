# Convenciones del motor (scorm-universal)

Patrón **sidebar + área de contenido**: un solo archivo HTML con un `<div class="sidebar">` con la lista de pantallas/bloques y un `<div class="content">` donde se muestra la pantalla activa (`.screen`), controlada por una función `go(id)`. Todas las pantallas viven en el DOM a la vez (`display:none` salvo la activa) — evita reconstruir HTML al navegar, lo que a su vez evita bugs de balance de etiquetas.

## IDs de pantalla — convención fija

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

## Los 5 objetos que gobiernan todo (data-driven, no hardcodees pantalla por pantalla)

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

## `markSideDone` — por ID de pantalla, nunca por posición

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

## Flechas de navegación entre actividades

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

## `setFb` por pantalla

Cada pantalla nueva —calificable o no— necesita su propia línea dentro de `go(id)` para fijar el texto de pista. Si no la tiene, se queda mostrando literalmente el texto de la última actividad visitada, lo que confunde más que ayuda:

```js
function go(id){
  cur = id;
  if(id === 's7') setFb('Texto de pista apropiado para esta pantalla.');
  // ...resto de go(): mostrar/ocultar pantallas, updateActArrows(), updateBar(), etc.
}
```

## Sidebar agrupado (15+ actividades)

Cuando la lección tiene 15+ actividades numéricas, el sidebar se ve mejor con un solo ítem colapsado en vez de 15+ líneas:

```html
<div class="side-item" data-s="s1" id="sideActGroup">
  <span class="snum star">🎯</span><span>Actividades interactivas</span>
  <span class="side-progress" id="actProgress">0/N</span>
</div>
```

Al resaltar el ítem activo del sidebar, el ítem agrupado necesita lógica especial (está "activo" si `cur` es CUALQUIER actividad, no solo la primera):

```js
sideItems.forEach(function(si){
  var isGroup = si.id === 'sideActGroup';
  si.classList.toggle('active', isGroup ? ACT_SEQUENCE.includes(id) : si.dataset.s === id);
});
```

## Responsive / móvil

Bajo ~1000 px el sidebar pasa a **cajón lateral** (`.sidebar` fija, `transform:translateX(-100%)`, se abre con un botón ☰ de la topbar y se cierra con el scrim, Escape o al elegir un ítem); `.content` recibe `inert` mientras el cajón está abierto, foco al ítem activo y de vuelta al botón de menú al cerrar. Las rejillas bajan a 2-3 columnas. Todo el motor usa **pointer events** (no solo mouse) para que funcione con el dedo; el canvas necesita `touch-action:none` para no hacer scroll de página al dibujar.
