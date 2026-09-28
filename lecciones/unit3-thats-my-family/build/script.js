/* ==========================================================================
   Unit 3: That's My Family — construido con la skill scorm-universal
   Motor: sidebar + área de contenido, datos en los 5 objetos de abajo.
   ========================================================================== */

/* ---------- 1) SCORM 1.2 API (con fallback a localStorage) ---------- */
var API = null;
function findAPI(win){
  var tries = 0;
  while (win.API == null && win.parent != null && win.parent != win && tries < 10) { win = win.parent; tries++; }
  return win.API || null;
}
try { API = findAPI(window); } catch(e) { API = null; }
if (API) { try { API.LMSInitialize(''); } catch(e) {} }
function lmsGet(key){
  if (API) { try { return API.LMSGetValue(key); } catch(e) { return ''; } }
  return localStorage.getItem('scorm_' + key) || '';
}
function lmsSet(key, val){
  if (API) { try { API.LMSSetValue(key, val); API.LMSCommit(''); } catch(e) {} }
  else { localStorage.setItem('scorm_' + key, val); }
}

/* ---------- 2) Los 5 objetos que gobiernan la lección ---------- */
var ACT_SEQUENCE = ['s1','s2','s3','s4','s5','s6','s7'];
var ACT_NAMES = {
  s1:'Vocabulary Match', s2:'Phonics & Dialogue', s3:'Describing Family',
  s4:'Our Values', s5:'Draw Your Family', s6:'Spelling Time', s7:'Yes or No?'
};
var scores = { match:0, phon:0, desc:0, values:0, spelling:0, yesno:0, reto:0, test:0 };
var MAX    = { match:6, phon:2, desc:3, values:3, spelling:6, yesno:4, reto:6, test:5 };
var KEY    = { s1:'match', s2:'phon', s3:'desc', s4:'values', s6:'spelling', s7:'yesno', s8:'reto', s10:'test' };
var FB = {
  s20:'', s21:'', s22:'',
  s1:'Tap a picture, then tap the matching word.',
  s2:'Complete the phonics word, then choose the right answer.',
  s3:'Choose the word that describes the picture.',
  s4:'Complete each sentence.',
  s5:'Draw your family — this is never graded.',
  s6:'Tap the letters in order to spell the word.',
  s7:'Read and choose YES or NO.',
  s8:'Sort each family word into the right box.',
  s9:'', s10:'Review, reflect, and take the test.', s11:''
};
var SCREENS = ['s20','s21','s22','s1','s2','s3','s4','s5','s6','s7','s8','s9','s10','s11'];

/* ---------- 3) Estado, navegación y progreso ---------- */
var cur = 's20';
var actDone = {};
var ST = { loc:'s20', a:{}, refl:'', tt:0 };
var sessionStart = Date.now();
var totalPrev = 0;
var RESTORING = false;
var drawDone = false;

function setFb(text){ if(!RESTORING) document.getElementById('fbText').textContent = text || ''; }

function go(id){
  cur = id;
  if (id === 's22') { introIdx = 1; introRender(); }
  if (id === 's10') { sumIdx = 1; sumRender(); }
  if (id === 's11') calcScore();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('.side-item[data-s]').forEach(function(si){
    var isGroup = si.id === 'sideActGroup';
    si.classList.toggle('active', isGroup ? ACT_SEQUENCE.indexOf(id) !== -1 : si.dataset.s === id);
  });
  document.getElementById('contentArea').scrollTop = 0;
  setFb(FB[id]);
  updateBar();
  ST.loc = id;
  save();
  closeDrawer();
}
window._goNext = go;

document.querySelectorAll('.side-item[data-s]').forEach(function(si){
  si.addEventListener('click', function(){
    var id = si.dataset.s;
    go(id === 's1' ? (ACT_SEQUENCE.indexOf(cur) !== -1 ? cur : ACT_SEQUENCE[0]) : id);
  });
});

function updateBar(){
  var i = SCREENS.indexOf(cur);
  document.getElementById('backBtn').disabled = i <= 0;
  var blocked = (cur === 's5' && !drawDone);
  document.getElementById('nextBtn').disabled = (i >= SCREENS.length - 1) || blocked;
}
document.getElementById('backBtn').addEventListener('click', function(){
  var i = SCREENS.indexOf(cur); if (i > 0) go(SCREENS[i - 1]);
});
document.getElementById('nextBtn').addEventListener('click', function(){
  var i = SCREENS.indexOf(cur); if (i < SCREENS.length - 1) go(SCREENS[i + 1]);
});

function markSideDone(id){
  if (ACT_SEQUENCE.indexOf(id) !== -1){
    actDone[id] = true;
    document.getElementById('actProgress').textContent = Object.keys(actDone).length + '/' + ACT_SEQUENCE.length;
    return;
  }
  var el = document.querySelector('.side-item[data-s="' + id + '"] .chk');
  if (el) el.style.opacity = 1;
}

/* ---------- 4) Puntaje total ---------- */
function totalPts(){ var t=0; for(var k in scores) t+=scores[k]; return t; }
function totalMax(){ var t=0; for(var k in MAX) t+=MAX[k]; return t; }
var commitTimer = null;
function updateGlobalPts(){
  document.getElementById('tb-pts').textContent = totalPts();
  clearTimeout(commitTimer);
  commitTimer = setTimeout(function(){
    lmsSet('cmi.core.score.raw', String(totalPts()));
    lmsSet('cmi.core.score.max', String(totalMax()));
    lmsSet('cmi.core.score.min', '0');
  }, 1500);
  save();
}
function calcScore(){
  var rows = [
    { n:'Vocabulary Match', s:scores.match, m:MAX.match },
    { n:'Phonics & Dialogue', s:scores.phon, m:MAX.phon },
    { n:'Describing Family', s:scores.desc, m:MAX.desc },
    { n:'Our Values', s:scores.values, m:MAX.values },
    { n:'Spelling Time', s:scores.spelling, m:MAX.spelling },
    { n:'Yes or No?', s:scores.yesno, m:MAX.yesno },
    { n:'Final Challenge', s:scores.reto, m:MAX.reto },
    { n:'Test', s:scores.test, m:MAX.test }
  ];
  document.getElementById('scoreTable').innerHTML = rows.map(r =>
    '<tr><td style="padding:6px 0">' + r.n + '</td><td style="text-align:right">' + r.s + ' / ' + r.m + '</td></tr>'
  ).join('');
  document.getElementById('scoreTotal').textContent = totalPts();
  document.getElementById('scoreMax').textContent = totalMax();
  var pct = totalMax() ? Math.round(100 * totalPts() / totalMax()) : 0;
  lmsSet('cmi.core.lesson_status', pct >= 70 ? 'passed' : 'failed');
}

/* ---------- 5) rec() — cada acierto guarda un token estable ---------- */
function rec(screenId, token){
  ST.a[screenId] = ST.a[screenId] || [];
  ST.a[screenId].push(token);
  save();
}

/* ---------- 6) Helper genérico "elige 1 de N" ---------- */
function pick(container, answer, key, max, screenId, subId){
  container.querySelectorAll('.opt').forEach(function(opt){
    opt.addEventListener('click', function(){
      if (opt.classList.contains('locked')) return;
      var val = String(opt.dataset.value).toLowerCase();
      var answers = String(answer).toLowerCase().split('|');
      var ok = answers.indexOf(val) !== -1;
      opt.classList.add(ok ? 'correct' : 'wrong');
      if (ok) {
        container.querySelectorAll('.opt').forEach(o => o.classList.add('locked'));
        scores[key] = Math.min(max, (scores[key] || 0) + 1);
        if (!RESTORING) { setFb('Correct!'); rec(screenId, (subId ? subId + '|' : '') + opt.dataset.value); }
        if (scores[key] >= max) markSideDone(screenId);
        updateGlobalPts();
      } else {
        if (!RESTORING) setFb('Try again.');
        setTimeout(() => opt.classList.remove('wrong'), 450);
      }
    });
  });
}
function restorePick(screenId, subId, value){
  var sel = subId ? ('#' + screenId + ' [data-sub="' + subId + '"] .opt[data-value="' + value + '"]')
                   : ('#' + screenId + ' .opt[data-value="' + value + '"]');
  var el = document.querySelector(sel);
  if (el) el.click();
}

/* ---------- 7) Helper genérico "completar" (input de texto) ---------- */
function checkFill(input, key, max, screenId, subId){
  if (input.disabled) return; /* deshabilitar dispara 'blur': evita registrar el acierto dos veces */
  var val = input.value.trim().toLowerCase();
  var answers = input.dataset.answer.toLowerCase().split('|');
  if (answers.indexOf(val) !== -1) {
    input.classList.add('correct'); input.disabled = true;
    scores[key] = Math.min(max, (scores[key] || 0) + 1);
    if (!RESTORING) { setFb('Correct!'); rec(screenId, (subId ? subId + '|' : '') + val); }
    if (scores[key] >= max) markSideDone(screenId);
    updateGlobalPts();
  } else {
    input.classList.add('wrong'); setTimeout(() => input.classList.remove('wrong'), 600);
  }
}
function wireFill(input, key, max, screenId, subId){
  input.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); checkFill(input, key, max, screenId, subId); } });
  input.addEventListener('blur', function(){ checkFill(input, key, max, screenId, subId); });
}
function restoreFill(input, key, max, screenId, subId, value){
  input.value = value; checkFill(input, key, max, screenId, subId);
}

/* ---------- 8) s1 — Vocabulary match ---------- */
var MATCH_FAMILY = { '1':'mum', '2':'dad', '3':'sister', '4':'brother', '5':'grandma', '6':'grandpa' };
var selectedFam = null;
document.querySelectorAll('#famItems .item-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    if (chip.classList.contains('used')) return;
    document.querySelectorAll('#famItems .item-chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel'); selectedFam = chip;
  });
});
document.querySelectorAll('#famSlots .slot').forEach(function(slot){
  slot.addEventListener('click', function(){
    if (!selectedFam) return;
    var ok = MATCH_FAMILY[selectedFam.dataset.id] === slot.dataset.id;
    if (ok) {
      selectedFam.classList.add('used'); selectedFam.classList.remove('sel');
      scores.match = Math.min(MAX.match, scores.match + 1);
      if (!RESTORING) { setFb('Correct!'); rec('s1', selectedFam.dataset.id); }
      if (scores.match >= MAX.match) markSideDone('s1');
      updateGlobalPts();
      selectedFam = null;
    } else {
      slot.classList.add('wrong'); setTimeout(() => slot.classList.remove('wrong'), 450);
      if (!RESTORING) setFb('Try again.');
    }
  });
});

/* ---------- 9) s2 — Phonics & Dialogue ---------- */
var phonInput = document.getElementById('phonInput');
wireFill(phonInput, 'phon', MAX.phon, 's2', null);
pick(document.querySelector('#s2 [data-sub="dlg"] .opts'), 'brother', 'phon', MAX.phon, 's2', 'dlg');

/* ---------- 10) s3 — Describing Family & Holidays ---------- */
pick(document.querySelector('#s3 [data-sub="q1"] .opts'), 'tall', 'desc', MAX.desc, 's3', 'q1');
pick(document.querySelector('#s3 [data-sub="q2"] .opts'), 'short', 'desc', MAX.desc, 's3', 'q2');
pick(document.querySelector('#s3 [data-sub="q3"] .opts'), 'beach', 'desc', MAX.desc, 's3', 'q3');

/* ---------- 11) s4 — Values ---------- */
var valInput1 = document.getElementById('valInput1');
var valInput2 = document.getElementById('valInput2');
var valInput3 = document.getElementById('valInput3');
wireFill(valInput1, 'values', MAX.values, 's4', 'v1');
wireFill(valInput2, 'values', MAX.values, 's4', 'v2');
wireFill(valInput3, 'values', MAX.values, 's4', 'v3');

/* ---------- 12) s5 — Draw (no calificable, obligatoria) ---------- */
(function initCanvas(){
  var canvas = document.getElementById('drawCanvas');
  var ctx = canvas.getContext('2d');
  var drawing = false;
  function pos(e){
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', function(e){ drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('pointermove', function(e){ if (!drawing) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1f3268'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); });
  window.addEventListener('pointerup', function(){ drawing = false; });
  document.getElementById('clearDraw').addEventListener('click', function(){ ctx.clearRect(0, 0, canvas.width, canvas.height); });
})();
function finishDraw(){
  drawDone = true;
  markSideDone('s5');
  if (!RESTORING) { rec('s5', '1'); setFb("Great drawing!"); }
  updateBar();
}
document.getElementById('doneDraw').addEventListener('click', finishDraw);

/* ---------- 13) s6 — Spelling ---------- */
var SPELL_WORDS = ['mum','dad','sister','brother','grandma','grandpa'];
var spellState = {};
function shuffleWord(w){
  var arr = w.split('');
  for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  if (arr.join('') === w && w.length > 1) { var t = arr[0]; arr[0] = arr[1]; arr[1] = t; }
  return arr;
}
function buildSpellRow(word){
  spellState[word] = { built: '' };
  var row = document.createElement('div');
  row.className = 'spell-row'; row.dataset.word = word;
  var lettersDiv = document.createElement('div'); lettersDiv.className = 'letters';
  shuffleWord(word).forEach(function(ch){
    var b = document.createElement('button'); b.className = 'letter'; b.textContent = ch;
    b.addEventListener('click', function(){
      if (b.classList.contains('used')) return;
      var expected = word[spellState[word].built.length];
      if (ch === expected) {
        b.classList.add('used'); b.style.opacity = .35; b.disabled = true;
        spellState[word].built += ch;
        renderBuilt(word);
        if (spellState[word].built.length === word.length) completeSpell(word);
      } else {
        b.classList.add('wrongflash'); setTimeout(() => b.classList.remove('wrongflash'), 350);
      }
    });
    lettersDiv.appendChild(b);
  });
  var builtDiv = document.createElement('div'); builtDiv.className = 'built'; builtDiv.id = 'built-' + word;
  for (var i = 0; i < word.length; i++) { var d = document.createElement('div'); d.className = 'letter'; d.textContent = ''; builtDiv.appendChild(d); }
  var resetBtn = document.createElement('button'); resetBtn.className = 'side-item'; resetBtn.style.width = 'auto';
  resetBtn.textContent = '↺ Reset'; resetBtn.style.background = '#eef3ff'; resetBtn.style.color = '#1f3268';
  resetBtn.addEventListener('click', function(){
    if (row.classList.contains('correct')) return;
    spellState[word].built = '';
    lettersDiv.querySelectorAll('.letter').forEach(function(b){ b.classList.remove('used'); b.style.opacity = 1; b.disabled = false; });
    renderBuilt(word);
  });
  row.appendChild(document.createTextNode(word.toUpperCase() + ': '));
  row.appendChild(lettersDiv); row.appendChild(builtDiv); row.appendChild(resetBtn);
  document.getElementById('spellArea').appendChild(row);
}
function renderBuilt(word){
  var builtDiv = document.getElementById('built-' + word);
  var chars = spellState[word].built.split('');
  builtDiv.querySelectorAll('.letter').forEach(function(d, i){ d.textContent = chars[i] || ''; });
}
function completeSpell(word){
  var row = document.querySelector('.spell-row[data-word="' + word + '"]');
  spellState[word].built = word;
  renderBuilt(word);
  row.classList.add('correct');
  scores.spelling = Math.min(MAX.spelling, scores.spelling + 1);
  if (!RESTORING) { setFb('Correct! ' + word); rec('s6', word); }
  if (scores.spelling >= MAX.spelling) markSideDone('s6');
  updateGlobalPts();
}
SPELL_WORDS.forEach(buildSpellRow);

/* ---------- 14) s7 — Yes or No ---------- */
pick(document.querySelector('#s7 [data-sub="q1"] .opts'), 'yes', 'yesno', MAX.yesno, 's7', 'q1');
pick(document.querySelector('#s7 [data-sub="q2"] .opts'), 'yes', 'yesno', MAX.yesno, 's7', 'q2');
pick(document.querySelector('#s7 [data-sub="q3"] .opts'), 'no', 'yesno', MAX.yesno, 's7', 'q3');
pick(document.querySelector('#s7 [data-sub="q4"] .opts'), 'yes', 'yesno', MAX.yesno, 's7', 'q4');

/* ---------- 15) s8 — Final Challenge (classify) ---------- */
var CLASSIFY_FAMILY = { mum:'adult', dad:'adult', sister:'kid', brother:'kid', grandma:'adult', grandpa:'adult' };
var selectedReto = null;
document.querySelectorAll('#retoItems .item-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    if (chip.classList.contains('used')) return;
    document.querySelectorAll('#retoItems .item-chip').forEach(c => c.classList.remove('sel'));
    chip.classList.add('sel'); selectedReto = chip;
  });
});
document.querySelectorAll('.classify-box').forEach(function(box){
  box.addEventListener('click', function(){
    if (!selectedReto) return;
    var ok = CLASSIFY_FAMILY[selectedReto.dataset.id] === box.dataset.cat;
    if (ok) {
      selectedReto.classList.add('used', 'locked'); selectedReto.classList.remove('sel');
      box.appendChild(selectedReto);
      scores.reto = Math.min(MAX.reto, scores.reto + 1);
      if (!RESTORING) { setFb('Correct!'); rec('s8', selectedReto.dataset.id); }
      if (scores.reto >= MAX.reto) markSideDone('s8');
      updateGlobalPts();
      selectedReto = null;
    } else {
      box.style.borderColor = '#d94b4b'; setTimeout(() => box.style.borderColor = '', 450);
      if (!RESTORING) setFb('Try again.');
    }
  });
});

/* ---------- 16) s9 — Home task: descarga del PDF original ---------- */
document.getElementById('pdfDownload').href = 'data:application/pdf;base64,{{PDF_B64}}';

/* ---------- 17) s10 — Summary carousel + test ---------- */
var SUM_N = document.querySelectorAll('.sum-slide').length;
var sumIdx = 1;
function sumRender(){
  document.querySelectorAll('.sum-slide').forEach(s => s.classList.toggle('active', +s.dataset.i === sumIdx));
  var dots = document.getElementById('sumDots'); dots.innerHTML = '';
  for (var i = 1; i <= SUM_N; i++) { var d = document.createElement('div'); d.className = 'intro-dot' + (i === sumIdx ? ' active' : ''); dots.appendChild(d); }
  document.getElementById('sumBack').disabled = sumIdx === 1;
  document.getElementById('sumNext').disabled = sumIdx === SUM_N;
}
document.getElementById('sumBack').addEventListener('click', function(){ if (sumIdx > 1) { sumIdx--; sumRender(); } });
document.getElementById('sumNext').addEventListener('click', function(){ if (sumIdx < SUM_N) { sumIdx++; sumRender(); } });
pick(document.querySelector('#s10 [data-sub="t1"] .opts'), 'grandma', 'test', MAX.test, 's10', 't1');
pick(document.querySelector('#s10 [data-sub="t2"] .opts'), 'brother', 'test', MAX.test, 's10', 't2');
pick(document.querySelector('#s10 [data-sub="t3"] .opts'), 'short', 'test', MAX.test, 's10', 't3');
pick(document.querySelector('#s10 [data-sub="t4"] .opts'), 'meet', 'test', MAX.test, 's10', 't4');
pick(document.querySelector('#s10 [data-sub="t5"] .opts'), 'special', 'test', MAX.test, 's10', 't5');
document.getElementById('reflexBox').addEventListener('blur', function(){ ST.refl = this.value; save(); });

/* ---------- 18) Introducción (carousel) ---------- */
var INTRO_N = document.querySelectorAll('.intro-slide').length;
var introIdx = 1;
function introRender(){
  document.querySelectorAll('.intro-slide').forEach(s => s.classList.toggle('active', +s.dataset.i === introIdx));
  var dots = document.getElementById('introDots'); dots.innerHTML = '';
  for (var i = 1; i <= INTRO_N; i++) { var d = document.createElement('div'); d.className = 'intro-dot' + (i === introIdx ? ' active' : ''); dots.appendChild(d); }
  document.getElementById('introBack').disabled = introIdx === 1;
  document.getElementById('introNext').disabled = introIdx === INTRO_N;
}
document.getElementById('introBack').addEventListener('click', function(){ if (introIdx > 1) { introIdx--; introRender(); } });
document.getElementById('introNext').addEventListener('click', function(){ if (introIdx < INTRO_N) { introIdx++; introRender(); } });
document.getElementById('introStart').addEventListener('click', function(){ go('s1'); });

/* ---------- 19) Reloj visible + cmi.core.session_time ---------- */
function pad(n){ return n < 10 ? '0' + n : n; }
function parseScormTime(t){
  var m = /^(\d+):(\d+):(\d+(\.\d+)?)$/.exec(t || ''); if (!m) return 0;
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}
function toScormTime(sec){
  sec = Math.max(0, Math.round(sec));
  var h = Math.floor(sec / 3600), mi = Math.floor((sec % 3600) / 60), s = sec % 60;
  return pad(h) + ':' + pad(mi) + ':' + pad(s);
}
function tickTime(){
  var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  var total = totalPrev + elapsed;
  document.getElementById('tb-time').textContent = pad(Math.floor(total / 60)) + ':' + pad(total % 60);
}
setInterval(tickTime, 1000);
function commitSessionTime(){
  var elapsed = (Date.now() - sessionStart) / 1000;
  lmsSet('cmi.core.session_time', toScormTime(elapsed));
}
setInterval(commitSessionTime, 60000);
window.addEventListener('beforeunload', commitSessionTime);
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') commitSessionTime(); });

/* ---------- 20) Guardar / cargar estado ---------- */
function save(){
  try { lmsSet('cmi.core.lesson_location', ST.loc); lmsSet('cmi.suspend_data', JSON.stringify(ST)); } catch (e) {}
}
function load(){
  var raw = lmsGet('cmi.suspend_data');
  if (!raw) return false;
  try { var parsed = JSON.parse(raw); if (parsed && parsed.a) { ST = parsed; return true; } } catch (e) {}
  return false;
}

/* ---------- 21) RESTORERS — reproduce cada acierto guardado ---------- */
var RESTORERS = {
  s1: function(token){
    var chip = document.querySelector('#famItems .item-chip[data-id="' + token + '"]');
    var slot = document.querySelector('#famSlots .slot[data-id="' + MATCH_FAMILY[token] + '"]');
    if (chip) chip.click();
    if (slot) slot.click();
  },
  s2: function(token){
    if (token.indexOf('|') === -1) { restoreFill(phonInput, 'phon', MAX.phon, 's2', null, token); }
    else { var v = token.split('|')[1]; restorePick('s2', 'dlg', v); }
  },
  s3: function(token){ var p = token.split('|'); restorePick('s3', p[0], p[1]); },
  s4: function(token){
    var p = token.split('|'); var map = { v1: valInput1, v2: valInput2, v3: valInput3 };
    restoreFill(map[p[0]], 'values', MAX.values, 's4', p[0], p[1]);
  },
  s5: function(){ finishDraw(); },
  s6: function(token){ completeSpell(token); },
  s7: function(token){ var p = token.split('|'); restorePick('s7', p[0], p[1]); },
  s8: function(token){
    var chip = document.querySelector('#retoItems .item-chip[data-id="' + token + '"]');
    var box = document.querySelector('.classify-box[data-cat="' + CLASSIFY_FAMILY[token] + '"]');
    if (chip) chip.click();
    if (box) box.click();
  },
  s10: function(token){ var p = token.split('|'); restorePick('s10', p[0], p[1]); }
};
function restoreState(){
  RESTORING = true;
  Object.keys(ST.a || {}).forEach(function(screenId){
    (ST.a[screenId] || []).forEach(function(token){ if (RESTORERS[screenId]) RESTORERS[screenId](token); });
  });
  if (ST.refl) document.getElementById('reflexBox').value = ST.refl;
  RESTORING = false;
  updateGlobalPts();
}

/* ---------- 22) Nombre del estudiante + saludo / reanudación ---------- */
function firstName(){
  var raw = lmsGet('cmi.core.student_name') || '';
  var parts = raw.split(',');
  var name = (parts[1] || parts[0] || '').trim();
  return name || 'explorer';
}
document.getElementById('tb-user').textContent = firstName();
document.getElementById('scoreName').textContent = firstName();

function openResume(had){
  var modal = document.getElementById('resumeModal');
  if (had) {
    document.getElementById('resumeTitle').textContent = 'Welcome back, ' + firstName() + '!';
    document.getElementById('resumeBody').textContent = 'You have ' + totalPts() + ' pts and you were on: ' + (ACT_NAMES[ST.loc] || ST.loc);
    document.getElementById('resumeRestart').style.display = '';
    document.getElementById('resumeContinue').textContent = 'Continue';
  } else {
    document.getElementById('resumeTitle').textContent = 'Hi, ' + firstName() + '!';
    document.getElementById('resumeBody').textContent = "Are you ready to learn about families in English?";
    document.getElementById('resumeContinue').textContent = "Let's start!";
    document.getElementById('resumeRestart').style.display = 'none';
  }
  modal.classList.add('show');
}
document.getElementById('resumeContinue').addEventListener('click', function(){
  document.getElementById('resumeModal').classList.remove('show');
  go(ST.loc || 's20');
});
document.getElementById('resumeRestart').addEventListener('click', function(){
  ST = { loc:'s20', a:{}, refl:'', tt:0 };
  scores = { match:0, phon:0, desc:0, values:0, spelling:0, yesno:0, reto:0, test:0 };
  actDone = {}; drawDone = false;
  sessionStart = Date.now(); totalPrev = 0;
  location.reload();
});

/* ---------- 23) Menú móvil (cajón) ---------- */
function closeDrawer(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.remove('show');
}
document.getElementById('menuBtn').addEventListener('click', function(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('scrim').classList.add('show');
});
document.getElementById('scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeDrawer(); });

/* ---------- 24) Arranque ---------- */
(function start(){
  lmsSet('cmi.core.exit', 'suspend');
  totalPrev = parseScormTime(lmsGet('cmi.core.total_time'));
  introRender(); sumRender();
  var had = load();
  if (had) restoreState();
  calcScore();
  go(ST.loc || 's20');
  openResume(had);
})();

window.addEventListener('beforeunload', function(){
  commitSessionTime();
  save();
  if (API) { try { API.LMSFinish(''); } catch (e) {} }
});
