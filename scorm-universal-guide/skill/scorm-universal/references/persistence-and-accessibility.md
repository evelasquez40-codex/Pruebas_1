# Persistencia SCORM 1.2 y accesibilidad (scorm-universal)

## Persistencia (obligatoria, no opcional)

Sin esto la lección "funciona" pero pierde todo el progreso al cerrar la pestaña — inaceptable para un LMS real. El bloque de persistencia se escribe **una sola vez** y no se reescribe lección a lección:

1. **Usuario**: lee `cmi.core.student_name` ("Apellido, Nombre") y muestra el primer nombre en la topbar y en el saludo de reanudación.
2. **Tiempos**: cronómetro visible = `cmi.core.total_time` (acumulado por el LMS) + sesión actual. Escribe `cmi.core.session_time` en `beforeunload`, en `visibilitychange → hidden` **y** cada 60 s (por si el navegador muere sin disparar esos eventos). Al iniciar, fija `cmi.core.exit = 'suspend'` para que el LMS reanude en vez de reiniciar.
3. **Reanudación**: un objeto de estado (`ST`) va a `cmi.suspend_data` como JSON (**mantente por debajo de ~4000 bytes** — mide `JSON.stringify(ST).length` con el catálogo completo respondido en el peor caso, no con una muestra parcial) y la pantalla actual a `cmi.core.lesson_location`. Cada acierto llama `rec(screenId, token)` con un **token estable que sobreviva al barajado** (nunca la posición visual dentro de una lista que se reordena). Al reabrir, un `RESTORERS[screenId](token)` reproduce esa acción localizando el elemento por atributo `data-*`/texto, nunca por posición.
4. **Nota parcial**: escribe `cmi.core.score.raw/max/min` en cada acierto (con debounce de 1-1.5 s para no saturar el LMS). `lesson_status` se mantiene `incomplete` hasta la pantalla final, donde pasa a `passed`/`failed` según el umbral definido en `masteryscore` del manifest.

Sin LMS (vista previa suelta) todo lo anterior cae a `localStorage` con la misma lógica — así la lección se puede probar y demostrar sin depender del LMS.

**Al agregar una actividad nueva**: (a) `rec()` en su rama de acierto con un token estable; (b) su entrada en `RESTORERS`; (c) atributos `data-*` en los elementos que el restaurador necesite localizar; (d) si tiene temporizadores (memoria, animaciones), pausarlos cuando `RESTORING === true`.

**Primera vez vs. regreso**: un mismo modal cubre los dos casos según si hay o no estado previo guardado (`had = load()`):
- **Primera vez** (`!had`): saludo + un solo botón "Empezar" que solo cierra el modal (no navega ni resetea nada, porque no hay nada que continuar).
- **Cada regreso** (`had`): "¡Bienvenido de nuevo!" con los puntos y la pantalla exactos donde quedó, botones "Continuar"/"Empezar de nuevo".

**Prueba obligatoria antes de entregar**: sirve la lección por HTTP (`python3 -m http.server`), inyecta un `window.API` simulado, haz trabajo parcial, cierra, reabre y verifica: modal correcto, pantalla, puntos, cada actividad restaurada, `session_time` y "Empezar de nuevo". **`file://` engaña**: Chromium da a cada pestaña `file://` un origen opaco y `localStorage` no se comparte entre pestañas del mismo archivo, así que un test de "cerrar y reabrir" parece fallar sin que haya bug real.

## API SCORM 1.2 (con fallback local)

```js
var API = null;
function findAPI(win){
  var tries = 0;
  while(win.API == null && win.parent != null && win.parent != win && tries < 10){ win = win.parent; tries++; }
  return win.API || null;
}
try { API = findAPI(window); } catch(e) { API = null; }
if(API){ try { API.LMSInitialize(''); } catch(e) {} }

function lmsGet(key){
  if(API){ try { return API.LMSGetValue(key); } catch(e) { return ''; } }
  return localStorage.getItem('scorm_' + key) || '';
}
function lmsSet(key, val){
  if(API){ try { API.LMSSetValue(key, val); API.LMSCommit(''); } catch(e) {} }
  else { localStorage.setItem('scorm_' + key, val); }
}
```

Llama `API.LMSFinish('')` en `beforeunload`, después de haber confirmado el guardado.

## Guía visual y de accesibilidad (independiente de la marca)

- **Elementos tocables ≥ 50 px**, texto de actividad ≥ 17 px — más aún si el público es infantil.
- **Nunca reduzcas toda la pantalla con `transform:scale()`** para que "quepa"; usa rejillas responsivas y, si necesitas escalar contenido a la altura disponible, hazlo con una variable CSS + medición JS (búsqueda binaria), no con un tamaño fijo adivinado de una sola captura de pantalla.
- **Coherencia de estilo de ilustración**: si decides usar imágenes reales/3D para un objeto, úsalo consistentemente en todas las pantallas donde aparece ese mismo objeto — no mezcles fotos/3D con emojis o SVG planos para la misma cosa. Y **cuando cambies una ilustración, cambia el dato** (la respuesta correcta, las opciones, los textos que la describen) — son parte del mismo cambio.
- **Controles reales**: `button` o `role="button"` + `tabindex="0"`, con Enter/Espacio disparando el mismo evento que el clic. `aria-pressed` en bancos de selección, `aria-live` en la zona de retroalimentación, foco visible siempre, y respeta `prefers-reduced-motion`.
- **Responsive obligatorio**: bajo ~1000 px el sidebar pasa a cajón lateral (con foco atrapado, cierre por Escape/scrim/selección, `inert` en el contenido mientras está abierto), las rejillas bajan a 2-3 columnas, y todo el motor usa **pointer events** (no solo mouse) para que funcione con el dedo. El canvas necesita `touch-action:none` para no hacer scroll de página al dibujar.
- **Botones de impresión**: si hay un botón "Imprimir/Descargar informe" dentro de un iframe embebido en un LMS, `window.print()` puede fallar en silencio por el sandbox del reproductor. Llama `window.print()` de forma **síncrona** dentro del propio clic (nunca tras un `setTimeout`), envuelve en `try/catch`, y ofrece siempre un botón de respaldo que abra el mismo contenido en una pestaña nueva con `window.open()`.
