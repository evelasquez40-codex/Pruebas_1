---
name: scorm-universal
description: Construye lecciones interactivas AUTOCONTENIDAS y empaquetables como SCORM 1.2 para cualquier LMS (Moodle u otro), de CUALQUIER materia, grado o público — no está atada a ningún tema ni marca. Úsala SIEMPRE que el usuario pida crear, adaptar o corregir una lección/actividad/objeto de aprendizaje interactivo empaquetado como SCORM, aunque no diga "SCORM" explícitamente (por ejemplo: "una lección interactiva de [tema]", "un recurso H5P-style para Moodle", "un paquete para el LMS", "actividades tipo arrastrar/emparejar/quiz para una clase"). Cubre un motor genérico de 19 mecánicas interactivas (emparejar, escribir, escuchar y elegir, memoria, contar, figuras, canvas, completar espacios, sí/no, construir enunciados, "el diferente", acertijos, autoevaluación, test), el envoltorio pedagógico universal (guía para el adulto, introducción, reto final, tarea, resumen+test, puntaje final), la persistencia SCORM 1.2 completa (usuario, tiempos, reanudación, nota parcial) y accesibilidad/responsive. Si el usuario menciona una marca, tema visual o público específico (inglés, matemáticas, primaria, un logo propio), usa esta skill como base de ingeniería y adapta solo los datos y el tema visual — nunca reconstruyas el motor desde cero.
---

# scorm-universal (destilado de scorm-english, sept-2026)

Produce lecciones SCORM 1.2 **de cualquier materia** de principio a fin. Esta skill es la versión genérica del motor probado en producción en `scorm-english` (inglés/HSC): misma arquitectura, misma persistencia, mismos 21 bugs reales evitados — con todo el contenido específico de marca/materia removido. **Copiar `assets/index-skeleton.html` y cambiar datos** es siempre mejor que reconstruir el motor.

## Qué debe tener toda lección completa (checklist de estándar)

| Bloque | Regla vigente |
|---|---|
| Actividades | N actividades numeradas (define N con el usuario; 15-20 es un rango típico), agrupadas en el sidebar bajo un solo ítem si N ≥ 12. La mayoría calificables; autoevaluación/dibujo libre nunca se califican. Next **nunca se bloquea** por no acertar, solo por no intentar en las obligatorias no calificables. |
| Introducción | 5-6 diapositivas "libro ilustrado": ilustración + título + 3-4 frases cortas con palabras clave resaltadas + botón 🔊 opcional. En el idioma/nivel del público objetivo. |
| Resumen y Test | Carrusel horizontal (una diapositiva por eje temático + reflexión + test), mismo formato ilustrado; última diapositiva → puntaje final. |
| Reto final | Mini-juego que repase contenido YA visto en las actividades numéricas (nunca introduce contenido nuevo). Si vive en iframe: transparente y auto-ajustable en alto. |
| Tarea / producto para casa | 2 tareas mínimo, consulta + producto tangible, no se califica numéricamente. |
| Guía para el adulto / acompañante | Objetivos, referente curricular en palabras, cómo acompañar, estilos de aprendizaje que se activan. |
| Guía de apoyos / accesibilidad | 4 apoyos: visual, auditivo, motor, emocional. |
| Tema visual | Coherente: si usas ilustraciones reales/3D para un objeto, úsalas en todas las pantallas donde aparece; nunca mezcles con emojis/SVG plano para lo mismo. Paleta de marca del proyecto (nunca un azul genérico si el usuario ya tiene colores propios). |
| Tamaños | Elementos tocables ≥ 50 px, texto de actividad ≥ 17 px (más si el público es infantil). Cuerpo de cada pantalla centrado, ancho máximo razonable (~1180 px). |
| Persistencia SCORM | `student_name` en topbar, `session_time/total_time` con cronómetro, `lesson_location + suspend_data` con reproducción de acciones (`rec()`/`RESTORERS`), modal de bienvenida/reanudación, `score.raw` parcial en cada acierto, `passed/failed` al umbral definido en el manifest. Respaldo en `localStorage` fuera del LMS. |
| Móvil / tablet | < 1000 px: sidebar como cajón (foco, Escape, scrim), rejillas responsivas, pointer events en todo (funciona con dedo). |
| Accesibilidad | Controles reales (`button`/`role=button`+`tabindex`), Enter/Espacio, `aria-pressed` en bancos, `aria-live` en la retroalimentación, foco visible, `prefers-reduced-motion`. |

## Cuándo usar cada referencia

| Vas a... | Lee primero |
|---|---|
| Construir una lección nueva | `assets/index-skeleton.html` (rellena los 5 objetos de datos + el HTML de cada pantalla) |
| Elegir o adaptar una mecánica de actividad | `references/activity-types.md` (19 mecánicas + helper `pick()`) |
| Tocar el motor, el sidebar o la navegación | `references/engine-conventions.md` |
| Armar Intro / Reto / Tarea / Resumen / Test / Guías | `references/wrapper-sections.md` |
| Implementar o depurar la persistencia SCORM | `references/persistence-and-accessibility.md` |
| Evitar bugs ya sufridos y correr el checklist de entrega | `references/pitfalls.md` |
| Empaquetar como SCORM 1.2 | `assets/imsmanifest.xml` |

## Flujo de trabajo

1. **Recoge los insumos**: tema/materia, público y nivel, contenido fuente (guía, PDF, apuntes), imágenes/audio si existen, tema visual o marca si el usuario tiene una. Nunca reconstruyas contenido "de memoria" si hay una fuente original.
2. **Planifica N actividades** sobre las partes reales del contenido fuente (1-2 mecánicas por parte), eligiendo del catálogo de `activity-types.md`, antes de escribir código.
3. **Copia `assets/index-skeleton.html`**, ajusta `ACT_SEQUENCE`, `ACT_NAMES`, `scores`, `MAX`, `KEY`, `FB`, el HTML de cada pantalla y el tema visual/paleta. Para cada actividad: `rec()` en el acierto + entrada en `RESTORERS` + atributos `data-*` estables (ver `engine-conventions.md`).
4. **Construye y valida sintaxis**: extrae el `<script>` y corre `node --check`; cuenta `<div` vs `</div>` en el bloque tocado.
5. **Prueba en navegador real** (no solo revises el código): recorre todas las pantallas, prueba cada actividad, confirma el cambio de puntaje visible.
6. **Prueba reanudación** sirviendo por HTTP (`python3 -m http.server`; `file://` engaña con `localStorage`): trabajo parcial → cerrar → reabrir → modal + estado + puntos restaurados.
7. **Empaqueta plano** (`zip -j index.html imsmanifest.xml logo.png`) en un paso separado del build/test, y **verifica el ZIP por contenido** antes de entregarlo.
8. **Entrega**: ZIP, HTML suelto para previsualizar sin LMS, y un resumen honesto de qué se probó y qué queda pendiente (la validación dentro de un LMS real siempre queda pendiente si no hay acceso a uno).

## Principios no negociables

- **El motor de navegación/persistencia nunca se edita en su lógica**; solo los datos (`ACT_*`, `scores`, `MAX`, `KEY`, `FB`, el HTML de cada pantalla) y el tema visual/CSS.
- **Nunca asumas la respuesta de un audio que no puedes escuchar**: márcalo `TODO-CONFIRMAR` y dilo al usuario.
- **Dibujo libre y autoevaluación nunca se califican.**
- **Nunca reduzcas toda la pantalla con `transform:scale()`** para que quepa; usa rejillas responsivas.
- **Un `&&` que falla deja el ZIP viejo en outputs**: empaqueta aparte y comprueba el contenido.
- **`file://` engaña al probar persistencia**: prueba siempre por HTTP.
- **Cuando el usuario diga que "solo ve N actividades"**, primero recorre con Next: probablemente un bloqueo. Next no debería bloquearse nunca salvo por una actividad obligatoria no calificable sin completar.
- Ver `references/pitfalls.md` para los 21 bugs reales completos y su corrección.
