# Catálogo de mecánicas interactivas (scorm-universal)

Todas siguen la misma convención de puntaje: `scores.<clave>++` en el acierto → entrada en `totalPts()` → fila en la tabla de puntaje final → se resetean con "Intentar de nuevo". Adapta el **dato** (qué es correcto, qué imagen/texto se muestra) a tu tema; la mecánica no cambia.

## Tabla resumen

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

## Helper genérico reutilizable ("elige 1 de N": mecánicas 3, 9-19)

Un solo listener por contenedor, bloquea opciones al acertar, suma puntos, marca la actividad completa:

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

## Patrones de código por mecánica

### 1. Emparejar clic-clic
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

### 2. Escuchar y elegir (audio real embebido)
- Audio SIEMPRE en MP3 (ver `pitfalls.md` — nunca M4A directo).
- Patrón `.ply-row` con botón play (▶/❙❙) + botón "de nuevo" (🔁) que hace `audio.currentTime = 0`.
- **NUNCA asumas cuál es la correcta si depende del audio** — pregunta al usuario o marca `TODO-CONFIRMAR`.

### 3. Checkboxes multi-select por escena
```js
btn.addEventListener('click', function(){
  var checked = Array.from(panel.querySelectorAll('input:checked')).map(b => b.value);
  var isMatch = checked.length === correct.length && checked.every(v => correct.includes(v));
  // isMatch exacto (ni de más ni de menos) -> correcto
});
```

### 4. Canvas flood-fill (calificación parcial por puntos de control)
**Nunca** califiques el dibujo completo. Define 2-5 puntos de control (coordenadas en fracción del canvas, no en píxeles absolutos) con su color esperado, y muestra círculos numerados VISIBLES sobre el dibujo para que se sepa exactamente dónde tocar:
```js
var TARGETS = [{n:1, fx:0.13, fy:0.52, color:'#2e9e4f'}, /* fx/fy en fracción 0-1 */];
// Calificar: leer el pixel en (fx*canvas.width, fy*canvas.height) y comparar color con tolerancia ~40/canal.
```
Algoritmo de flood-fill: BFS/stack-based, nunca recursivo (desborda la pila en imágenes grandes).

### 5. Canvas de dibujo libre — nunca se califica
Mismo patrón de pointer events que el flood-fill pero dibujando trazo continuo:
```js
canvas.addEventListener('pointerdown', e => { drawing = true; ctx.beginPath(); ctx.moveTo(x,y); });
canvas.addEventListener('pointermove', e => { if(drawing){ ctx.lineTo(x,y); ctx.stroke(); } });
```
Puede llevar una guía tenue de fondo redibujada tras cada "Borrar".

### 6. Completar (input de texto)
```js
function checkAnswer(input){
  if(input.disabled) return; // deshabilitar dispara 'blur': evita registrar el acierto dos veces (ver pitfalls.md #20)
  var val = input.value.trim().toLowerCase();
  if(val === input.dataset.answer){ input.classList.add('correct'); input.disabled = true; scores.write++; rec('sX', val); }
  else { input.classList.add('wrong'); setTimeout(() => input.classList.remove('wrong'), 600); }
  updateGlobalPts();
}
input.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); checkAnswer(input); } });
input.addEventListener('blur', () => checkAnswer(input));
```

### 7. Elegir 1 de 2 (clic simple)
```js
opt.addEventListener('click', function(){
  if(opt.dataset.value === CORRECT[item]){ opt.classList.add('correct'); scores.xx++; }
  else { opt.classList.add('wrong'); setTimeout(() => opt.classList.remove('wrong'), 450); }
});
```

### 8. Arrastrar + retroalimentación dinámica sin calificar
Mismo drag de pointer events que la mecánica #1, pero en vez de sumar puntos, actualiza un elemento visual y marca `markSideDone()` solo cuando TODOS los campos requeridos se llenaron — es "obligatoria" (bloquea el botón de avanzar) pero no resta ni suma nota.

### 9. Autoevaluación (caritas o escala 1-3)
Cada línea con un icono a la izquierda, el texto, y tres caritas (o círculos) para elegir un nivel de confianza. **Nunca se califica** — es autopercepción, no un examen.
```js
c.addEventListener('click', function(){
  var row = c.dataset.row, val = parseInt(c.dataset.val, 10);
  nicRatings[row] = (nicRatings[row] === val) ? val - 1 : val; // clic de nuevo en el mismo = desmarcar
  document.querySelectorAll('.nic-circle').forEach(circle => {
    circle.classList.toggle('filled', parseInt(circle.dataset.val, 10) <= nicRatings[circle.dataset.row]);
  });
});
```

### 10. Test final de opción múltiple
Reutiliza el patrón #7/#11 generando las preguntas por JS desde un array de datos:
```js
var TEST_Q = [{q:'...', o:['opción A','opción B'], ok:1}, ...]; // ok = índice de la opción correcta
TEST_Q.forEach((item, qi) => { /* generar el bloque de pregunta con sus botones .opt */ });
```

### 11. Elegir 1 de N con TTS (sin audio grabado)
Cuando no hay audio real, usa `speechSynthesis` (con el fix del timeout de 60 ms de `pitfalls.md`) y un botón grande 🔊 por ítem. Añade un enlace "mostrar palabra" como apoyo de accesibilidad. Como la respuesta la defines tú (no depende de un audio ajeno), SÍ se califica sin `TODO-CONFIRMAR`.

### 12. Reordenar (letras/pasos/palabras en orden)
`units = shuffle(sequence.slice())` (si queda igual al original, invierte). Cada unidad solo se acepta si es `sequence[built.length]`, si no parpadea en rojo. Botón ↺ limpia. Al completar: `built.classList.add('correct')`, suma, `rec('sX', sequence.join('|'))`.

### 13. Memoria
12 cartas (6 pares) barajadas. Estado `{open:[], lock:false, found:0}`. Pareja válida = mismo valor, distinto tipo de representación. 1 punto por pareja. **Resetea el mensaje de estado en el build** — bug real recurrente: tras "Intentar de nuevo" el texto se queda en "¡Todas encontradas!".

### 14-19. Elige 1 de N (conteo, figuras, sí/no, "el diferente", acertijos) y construir enunciado
Todas generan su HTML desde un array de datos y llaman a `pick()`. En mecánicas con figura/forma dibuja tú el SVG para que la respuesta correcta sea verificable por construcción. "Construir enunciado" = mismo patrón que reordenar pero con unidades semánticas (palabras, pasos) en vez de letras.

## Persistencia por mecánica (obligatorio)

Cada rama de acierto llama `rec(screenId, token)`; el token debe sobrevivir al barajado: un valor estable (palabra, índice, `'valor|posición'`), nunca la posición visual dentro de una lista que se reordena. `RESTORERS[screenId](token)` reproduce el acierto localizando el elemento por `data-*`/texto, nunca por posición. Las no calificables usan `rec(id, '1')` como marca simple. Memoria: puntaje inmediato al restaurar. Autoevaluación y test guardan su estado directo en el objeto de estado (`ST`).
