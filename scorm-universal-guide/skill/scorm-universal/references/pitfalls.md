# Bugs reales y cómo evitarlos (scorm-universal)

Cada uno de estos rompió algo en producción real (en `scorm-english` o al probar el esqueleto genérico de esta skill) antes de detectarse. No son hipotéticos.

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
9. **Probar persistencia con `file://` engaña**: Chromium da a cada pestaña `file://` un origen opaco y `localStorage` no se comparte entre pestañas del mismo archivo. Sirve siempre por HTTP (`python3 -m http.server`).
10. **Un `&&` que falla deja el ZIP viejo en outputs**: empaqueta en un paso separado del build/test y verifica el contenido del ZIP final (`unzip -p salida.zip index.html | grep -c "cadena nueva"`) antes de entregarlo.
11. **El cronómetro no se reinicia con "Intentar de nuevo"** si las variables de tiempo viven fuera del objeto de estado que sí se resetea. Al reiniciar, resetea explícitamente `sessionStart`/`totalPrev` también, no solo el estado lógico.
12. **Perder el ícono de un botón al primer clic** por sobrescribir `innerHTML` en el handler en vez de controlar el estado visual con una clase CSS. El estado visual de un botón con ícono SVG se controla con clases, nunca reescribiendo el marcado.
13. **"Reduce el tamaño" no significa "tamaño fijo pequeño"**: la respuesta correcta casi siempre es una escala fluida atada al espacio real disponible, no un número adivinado del peor caso visual.
14. **`flex:1` en un contenedor ignora silenciosamente una altura puesta por JS** (típico en el iframe auto-ajustable del reto final). Si un elemento con `flex:1` en algún ancestro no respeta una altura que le pones por JS/CSS, sospecha primero de esto.
15. **CRÍTICO — nunca escribas la secuencia literal `</script>` dentro de un string de JS embebido en un `<script>`**: aunque esté dentro de comillas, el parser de HTML (no el de JS) cierra ahí el bloque `<script>` que envuelve todo el motor, y todo el código después queda huérfano. No se detecta con `node --check` (que solo parsea el JS extraído) — hay que cargar el `index.html` real en un navegador tras cualquier cambio que incruste una etiqueta `<script>` dentro de un string. Regla fija: escribe siempre `'<'+'script>'` / `'<'+'/script>'` (o `<\/script>`) cuando necesites la etiqueta dentro de un string.
16. **Antes de cambiar qué devuelve una función compartida, busca TODAS sus llamadas** (`grep -n "nombreFuncion("`). Cambiar de SVG a `<img>`, por ejemplo, rompe silenciosamente el CSS que apuntaba al selector de etiqueta antigua (`svg{...}`) en vez de a una clase.
17. **`visibility:visible` en `@media print` no revierte un `display:none` fijo** de otra regla — son propiedades independientes. Si un área de impresión empieza en `display:none`, agrega explícitamente `display:block !important` dentro del propio `@media print`.
18. **Variables CSS con ámbito no viajan solas fuera de su contenedor**: si reutilizas una clase que depende de `var(--algo)` definida solo en un contenedor padre específico, y la usas en un contenedor nuevo que no define esa variable, el elemento se ve "apagado" sin que haya ningún error — el navegador simplemente ignora la declaración sin valor.
19. **Vuelve a medir `suspend_data` cada vez que agregues preguntas de analítica o seguimiento**: un objeto verboso por entrada puede acercarse al límite de ~4000 bytes donde el guardado descarta silenciosamente parte del estado. Compacta a arreglos posicionales (`[a,b,c]` en vez de `{a:..,b:..,c:..}`) si te acercas al límite, y mide siempre con el catálogo completo respondido (peor caso), no con una muestra.
20. **Deshabilitar un input dispara `blur` automáticamente**: si tu validación de "completar" corre tanto en `keydown` (Enter) como en `blur` (para validar al salir del campo), y en el acierto haces `input.disabled = true`, el navegador dispara `blur` en ese mismo instante porque un elemento deshabilitado no puede conservar el foco — así que el handler de `blur` vuelve a ejecutar la validación sobre un acierto que ya se registró, duplicando el `rec()` y el punto al reanudar. Guarda siempre al inicio del validador: `if(input.disabled) return;`. (Verificado en `assets/index-skeleton.html` con Playwright: sin el guard, el puntaje quedaba inflado tras cerrar y reabrir.)
21. **No hay generación de imágenes fotorrealistas dentro de este flujo**: si el diseño pide ilustraciones tipo render 3D más allá de lo que un SVG con gradientes puede lograr, sé explícito con quien pidió la lección — mejora todo lo que sí es código, y entrega una lista clara de los archivos de imagen pendientes (nombre, carpeta, medidas) para que se generen por fuera y se incrusten después, sin presentar un SVG como si fuera el render pedido.

---

# Checklist de entrega (correr SIEMPRE antes de dar el ZIP final)

1. **Sintaxis JS**: extraer el `<script>` y correr `node --check` sobre él.
2. **Balance de HTML**: contar `<div` vs `</div>` (ver bug #2).
3. **Manifest válido**: `xml.dom.minidom.parse('imsmanifest.xml')` sin excepción, y los archivos (`index.html`, `imsmanifest.xml`, `logo.png` si aplica) sueltos en la raíz del ZIP (`zip -j`, nunca en subcarpeta).
4. **Regresión completa en navegador real** (Playwright u otro), NO solo mirar el código:
   - Cargar el archivo, confirmar la pantalla inicial correcta.
   - Recorrer TODAS las pantallas por sidebar/flechas sin excepciones en consola.
   - Probar la interacción real de cada actividad NUEVA de esta sesión — clic, arrastre, o escritura según su tipo, y confirmar el cambio de puntaje visible en la barra superior.
   - Si hay iframe del reto: resolver al menos una interacción completa y confirmar que sumó puntos.
   - Si hay PDF/audio/imagen nueva: decodificar el base64 embebido y comparar bytes con el original.
5. **Reanudación**: trabajo parcial → cerrar → reabrir por HTTP → modal + estado + puntos restaurados exactos (sin duplicados, ver bug #20) + `session_time` + "Empezar de nuevo".
6. **Reporta lo que verificaste**, no solo "ya quedó" — decir exactamente qué se probó da a quien recibe la lección una base real para confiar en la entrega.
