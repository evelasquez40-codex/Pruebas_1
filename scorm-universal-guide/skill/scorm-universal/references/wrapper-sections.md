# Secciones de envoltorio pedagógico (scorm-universal)

Toda lección completa lleva estas 7 piezas alrededor de las actividades numéricas. Universales para cualquier tema; solo cambia el contenido, nunca la estructura.

## Guía para el adulto / acompañante (informativa, sin calificar)

Tarjetas informativas (`.info-card`), sin interacción calificable:
1. **Objetivos de la lección**: qué se trabaja, resumido en 2-3 líneas + lo que la persona podrá hacer al terminar.
2. **Referente curricular**: el estándar/competencia que aplique. No inventes códigos específicos si no los tienes — describe la competencia en palabras.
3. **Cómo acompañar**: 3-5 consejos prácticos y concretos (dejar explorar antes de intervenir, usar el botón "de nuevo" en audios, no calificar el dibujo libre, celebrar el progreso sin importar el resultado en autoevaluación).
4. **Estilos de aprendizaje que se activan**: visual/auditivo/kinestésico/lecto-escritor, una frase cada uno.

## Guía de apoyos / accesibilidad (informativa, sin calificar)

4 tarjetas fijas, adaptando el contenido a lo que la lección específica incluya:
- 👁️ Apoyo visual (imágenes grandes, contraste, numeración clara)
- 👂 Apoyo auditivo (botón "de nuevo" sin límite, alternativa de lectura en voz alta)
- ✋ Apoyo motor (funciona con mouse/trackpad/dedo, sin cronómetro estricto, zonas de destino amplias ≥ 50 px)
- 💬 Apoyo emocional (actividades de exploración/autoevaluación **nunca** se califican como correcto/incorrecto, para reducir la ansiedad ante el error)

## Introducción (carrusel de 5-6 diapositivas, formato "libro ilustrado")

Cada diapositiva: ilustración grande (≈46% del ancho, tarjeta blanca) + título + 3-4 frases cortas con palabras clave resaltadas como fichas de color + botón "🔊 Escuchar" opcional (TTS) que lee la diapositiva. Nada de párrafos largos. Una diapositiva por eje temático de la unidad, y la última con el cierre/valor + "¿Listo? ¡Empecemos!" + botón de inicio. El carrusel debe ser genérico (`INTRO_N = document.querySelectorAll('.intro-slide').length`), así que agregar una diapositiva es solo agregar el elemento `.intro-slide` + `.intro-dot`, sin tocar JS de navegación.

Patrón de carrusel (reutilizar tal cual, cambiando solo el contenido):

```html
<div class="cover-wrap" id="introStage">
  <div class="intro-slide active" data-i="1">...</div>
  <div class="intro-slide" data-i="2">...</div>
  <div class="intro-slide" data-i="3">...<button class="cover-start" onclick="window._goNext('s1')">Empezar »</button></div>
  <div class="intro-dots"><div class="intro-dot active" data-i="1"></div><div class="intro-dot" data-i="2"></div><div class="intro-dot" data-i="3"></div></div>
</div>
<button class="act-arrow left" id="introBack">‹</button>
<button class="act-arrow right" id="introNext">›</button>
```

```js
var introIdx = 1;
function introRender(){
  document.querySelectorAll('.intro-slide').forEach(s => s.classList.toggle('active', +s.dataset.i === introIdx));
  document.querySelectorAll('.intro-dot').forEach(d => d.classList.toggle('active', +d.dataset.i === introIdx));
  document.getElementById('introBack').classList.toggle('disabled', introIdx === 1);
  document.getElementById('introNext').classList.toggle('disabled', introIdx === INTRO_N);
}
// Reiniciar siempre a la diapositiva 1 al reingresar (dentro de go(), en el caso de la pantalla de intro):
// introIdx = 1; if(typeof introRender === 'function') introRender();
```

## Reto final / mini-juego (siempre en el idioma/nivel de la lección, siempre califica)

Si usas un motor de retos reutilizable, la regla de oro es: **su lógica nunca se edita**, solo:
1. Los datos de los retos (2-5 retos, un tipo "clasificar" flexible es el más reutilizable — 2 a 4 categorías, cualquier cantidad de ítems). Diseña los retos para que refuercen contenido YA visto en las actividades numéricas de esta misma lección — nunca inventes contenido nuevo aquí.
2. El texto de ambientación (título, subtítulo, mensaje de cierre) — cambia el tema narrativo del motor genérico al tema de tu lección.

Si el reto vive en un `<iframe>`, hazlo transparente y **auto-ajustable en alto**: lee `contentDocument.scrollHeight` y fija `iframe.style.height`, para que se vea como una pantalla más y no como una ventana aparte. **Cuidado**: si algún ancestro del iframe tiene `flex:1`, el `flex-basis` implícito ignora silenciosamente cualquier `height` puesto por JS — hay que forzar también `flex:none` en la misma regla (ver `pitfalls.md`).

## Tarea o producto para casa (para casa, sin calificar numéricamente)

2 tareas mínimo, tipo consulta + producto tangible, usando el vocabulario/concepto central de la lección:
1. Una consulta o entrevista corta usando una pregunta clave de la lección.
2. Un producto visual (cartel, dibujo, foto, esquema) que use el contenido de la lección con al menos un ejemplo completo aplicado.

El adulto verifica y firma; no se califica en el SCO. Si el usuario sube un PDF con la guía/consigna impresa, incrústalo como descarga en base64 (`<a href="data:application/pdf;base64,..." download="...">`), en una tarjeta aparte.

## Resumen y Test (mixto: resumen visual sin calificar, test que sí califica)

- **Resumen real de lo aprendido**, no un párrafo — en carrusel horizontal (`.sum-track` con `translateX`, una `.sum-slide` por eje temático + reflexión + test; puntos `#sumDots`). Cada diapositiva sigue el formato "libro ilustrado" de la intro. Todo lo que aparece en el resumen debe haberse practicado antes en las actividades numéricas.
- Textarea de reflexión libre, sin calificar.
- Test de 5-8 preguntas de opción múltiple, una por bloque de actividades relevante (nunca preguntes algo que no se haya visto en la lección). Usa el patrón #10 de `activity-types.md`. Puede implementarse como su propio sub-carrusel horizontal anidado dentro de la última diapositiva del resumen, con el mismo patrón de dots + Anterior/Siguiente que el carrusel exterior — mismo patrón que el reto final anida sus desafíos dentro del flujo general. Al acertar o fallar, puede avanzar sola a la siguiente pregunta tras un instante (`setTimeout(...,700)`), salvo durante la reproducción de estado guardado.

## Puntaje final

Pantalla de cierre que suma automáticamente todas las claves de `scores` — no debería necesitar cambios de contenido, solo de estilo si adaptas el tema visual.

## Fondo decorativo de las diapositivas (opcional)

Si usas un fondo institucional sutil, ponlo en el contenedor principal completo (todas las pantallas menos el sidebar, que nunca lo lleva). Las pantallas grandes con poco contenido (intro, resumen) pueden llevar además su propia copia del mismo tratamiento porque ahí se aprecia mejor; en pantallas densas de tarjetas (guías, actividades) debe ser intencionalmente más discreto — nunca debe competir con el texto. Si compones una foto de fondo, hazlo siempre con un degradado blanco encima (`linear-gradient(145deg,rgba(255,255,255,.93),rgba(227,241,255,.88)),url(...)`) — sin él el texto pierde contraste sobre la imagen.
