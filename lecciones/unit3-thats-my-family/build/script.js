(function(){

/* ══════════ SCORM 1.2 + PERSISTENCIA (usuario, tiempos, reanudación, nota parcial) ══════════ */
function findAPI(w){var t=0;while(w&&t<10){try{if(w.API)return w.API;}catch(e){}try{if(w.opener&&w.opener.API)return w.opener.API;}catch(e){}w=w.parent;t++;}return null;}
var api=findAPI(window), LS_KEY='hsc_eng_g1_u3_state';
var RESTORING=false;
var ST={v:1,loc:'s20',a:{},test:{},ref:'',tt:0};
function lms(k,v){if(!api)return '';try{return v===undefined?api.LMSGetValue(k):api.LMSSetValue(k,v);}catch(e){return '';}}
var commitT=null;function commit(){if(!api)return;clearTimeout(commitT);commitT=setTimeout(function(){try{api.LMSCommit('');}catch(e){}},1500);}
var sessionStart=Date.now(), totalPrev=0;
function parseCMITime(t){if(!t)return 0;var m=String(t).match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);return m?(+m[1])*3600+(+m[2])*60+parseFloat(m[3]):0;}
function fmtCMITime(sec){sec=Math.max(0,Math.floor(sec));var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s2=sec%60;function p(n){return (n<10?'0':'')+n;}return p(h)+':'+p(m)+':'+p(s2)+'.00';}
function fmtClock(sec){sec=Math.floor(sec);var h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s2=sec%60;function p(n){return (n<10?'0':'')+n;}return (h?h+':':'')+(h?p(m):m)+':'+p(s2);}
function sessionSec(){return (Date.now()-sessionStart)/1000;}
function tickTime(){var t='⏱ '+fmtClock(totalPrev+sessionSec());document.getElementById('tb-time').textContent=t;var c=document.getElementById('cap-time');if(c)c.textContent=t;}
setInterval(tickTime,1000);
function flushTime(){lms('cmi.core.session_time',fmtCMITime(sessionSec()));if(!api){ST.tt=totalPrev+sessionSec();}}
setInterval(function(){flushTime();save();},60000);
var saveT=null;
function save(){clearTimeout(saveT);saveT=setTimeout(function(){
  var raw=JSON.stringify(ST);
  if(api){lms('cmi.core.lesson_location',ST.loc);lms('cmi.suspend_data',raw.length<4000?raw:JSON.stringify({v:1,loc:ST.loc,a:ST.a,test:ST.test,ref:''}));commit();}
  else{try{localStorage.setItem(LS_KEY,raw);}catch(e){}}
},250);}
function load(){var raw='';if(api){raw=lms('cmi.suspend_data');}else{try{raw=localStorage.getItem(LS_KEY)||'';}catch(e){}}
  if(!raw)return false;try{var o=JSON.parse(raw);if(o&&o.v===1){ST=o;ST.a=ST.a||{};ST.test=ST.test||{};return true;}}catch(e){}return false;}
function rec(screen,val,single){if(RESTORING)return;var arr=ST.a[screen]||(ST.a[screen]=[]);if(single){ST.a[screen]=[val];}else if(arr.indexOf(val)===-1)arr.push(val);save();}
function scormPartial(){if(!api)return;if(totalPts()===0)return;var m=maxPts();lms('cmi.core.score.raw',String(totalPts()));lms('cmi.core.score.max',String(m));lms('cmi.core.score.min','0');commit();}
function scormScore(r,m){if(!api)return;lms('cmi.core.score.raw',String(r));lms('cmi.core.score.max',String(m));lms('cmi.core.score.min','0');lms('cmi.core.lesson_status',(r/m*100)>=70?'passed':'failed');lms('cmi.core.exit','');commit();}
var studentName='';
if(api){
  api.LMSInitialize('');
  var st=lms('cmi.core.lesson_status');if(st==='not attempted'||st==='')lms('cmi.core.lesson_status','incomplete');
  totalPrev=parseCMITime(lms('cmi.core.total_time'));
  studentName=lms('cmi.core.student_name')||'';
  lms('cmi.core.exit','suspend');
}else{try{var o=JSON.parse(localStorage.getItem(LS_KEY)||'{}');totalPrev=o.tt||0;}catch(e){}}
if(studentName){var parts=studentName.split(',');var shown=(parts.length>1?parts[1].trim()+' '+parts[0].trim():studentName).trim();var u=document.getElementById('tb-user');u.textContent='👤 '+shown;u.title=studentName;u.style.display='';}
tickTime();
window.addEventListener('beforeunload',function(){flushTime();if(api){try{lms('cmi.core.lesson_location',ST.loc);lms('cmi.suspend_data',JSON.stringify(ST));lms('cmi.core.exit','suspend');api.LMSCommit('');api.LMSFinish('');}catch(e){}}else{try{localStorage.setItem(LS_KEY,JSON.stringify(ST));}catch(e){}}});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){flushTime();if(api){try{lms('cmi.suspend_data',JSON.stringify(ST));api.LMSCommit('');}catch(e){}}else{try{localStorage.setItem(LS_KEY,JSON.stringify(ST));}catch(e){}}}});

/* ══════════ SPEECH (bug de Chrome: timeout obligatorio entre cancel y speak) ══════════ */
function speak(text){
  if(RESTORING)return;
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  setTimeout(function(){var u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=0.82;window.speechSynthesis.speak(u);},60);
}
document.addEventListener('click',function(e){var b=e.target.closest('.speak');if(b&&b.dataset.say)speak(b.dataset.say);});

/* ══════════ CUERPO CENTRADO DE CADA ACTIVIDAD ══════════ */
(function(){['s1','s2','s3','s4','s5','s6','s7','s20','s21'].forEach(function(id){
  var sc=document.getElementById(id);if(!sc)return;var body=document.createElement('div');body.className='abody';
  var kids=Array.prototype.slice.call(sc.children).filter(function(k){return !k.classList.contains('instr');});
  kids.forEach(function(k){body.appendChild(k);});sc.appendChild(body);
});})();

/* ══════════ NAVEGACIÓN ══════════ */
var PARENT_SCREENS=['s20','s21'];
var ACT_SEQUENCE=['s1','s2','s3','s4','s5','s6','s7'];
var screens=['s20','s21','s22'].concat(ACT_SEQUENCE).concat(['s8','s9','s10','s11']);
var ACT_NAMES={s1:'Vocabulary Match',s2:'Phonics & Dialogue',s3:'Describing Family',s4:"We're all different!",s5:'Imagine & Draw',s6:'Spelling Time',s7:'Yes or No?'};
var titles=['🧭 Guía de acompañamiento','💡 Guía de apoyos','📖 Introducción'].concat(ACT_SEQUENCE.map(function(id,i){return (i+1)+' · '+ACT_NAMES[id];})).concat(['🎮 Final Challenge','📝 Actividad de trabajo escrito','🏁 Resumen y Test','Final Score']);
var cur='s20';
var sideItems=document.querySelectorAll('.side-item');
var actHdr=document.getElementById('act-hdr');
var actDone={};
function markSideDone(id){
  if(ACT_SEQUENCE.indexOf(id)!==-1){
    actDone[id]=true;refreshSideList();
    document.getElementById('actProgress').textContent=Object.keys(actDone).length+'/'+ACT_SEQUENCE.length;
    if(Object.keys(actDone).length>=ACT_SEQUENCE.length)document.getElementById('sideActGroup').classList.add('completed');
    return;
  }
  var el=document.querySelector('.side-item[data-s="'+id+'"]');if(el)el.classList.add('completed');
}
function actArrowsReset(){actDone={};refreshSideList();document.getElementById('actProgress').textContent='0/'+ACT_SEQUENCE.length;document.getElementById('sideActGroup').classList.remove('completed');}

var FB={s20:'Lee esta guía antes de empezar con tu hijo o hija.',s21:'Apoyos sugeridos para esta lección.',s22:'Ready to start?',
  s1:'Tap a word, then tap the matching family picture.',s2:'Complete the word, then complete the dialogue.',
  s3:'Look and choose the correct word.',s4:'Complete the dialogue with the word bank.',s5:'Draw your family — this is never graded.',
  s6:'Tap the letters in order to spell the word.',s7:'Read and choose YES or NO.',
  s8:'Complete all 5 challenges — they all count!',s9:'Imprime y completa las tres páginas de la guía original.',s10:'Answer the final test.',s11:''};
function go(id){
  cur=id;if(!RESTORING&&id!=='s11'){ST.loc=id;save();}
  document.body.classList.toggle('parent-view',PARENT_SCREENS.indexOf(id)!==-1);
  setFb(FB[id]||'');
  if(id==='s22'){introIdx=1;introRender();}
  if(id==='s10'){sumIdx=1;sumRender();}
  if(id==='s11')calcScore();
  document.querySelectorAll('.side-item .hsc-here').forEach(function(x){x.textContent='Estás aquí';});
  if(id==='s5')drawResize();
  screens.forEach(function(s){document.getElementById(s).classList.toggle('active',s===id);});
  sideItems.forEach(function(si){var isGroup=(si.id==='sideActGroup');var on=isGroup?(ACT_SEQUENCE.indexOf(id)!==-1):(si.dataset.s===id);si.classList.toggle('active',on);if(on)si.setAttribute('aria-current','page');else si.removeAttribute('aria-current');});
  actHdr.innerHTML='<div class="hdr-l"><span class="hdr-sub">👪 Family Explorer · Unit 3</span><div class="hdr-t">'+titles[screens.indexOf(id)]+'</div></div><div class="hdr-r"><span class="cap time" id="cap-time">'+document.getElementById('tb-time').textContent+'</span><span class="cap cap-pts">⭐ <span class="act-pts" id="act-pts">'+totalPts()+' pts</span></span><span class="cap" id="hdr-prog" style="display:none;"></span></div>';
  updateActArrows();updateBar();refreshSideList();
  document.getElementById('area').scrollTop=0;document.querySelectorAll('.info-wrap').forEach(function(w){w.scrollTop=0;});
}
function updateActArrows(){
  var wrap=document.getElementById('actArrows');var i=ACT_SEQUENCE.indexOf(cur);
  if(i===-1){wrap.classList.remove('show');return;}
  wrap.classList.add('show');
  document.getElementById('actArrowLeft').classList.toggle('disabled',i===0);
  document.getElementById('actArrowRight').classList.toggle('disabled',i===ACT_SEQUENCE.length-1);
}
document.getElementById('actArrowLeft').addEventListener('click',function(){var i=ACT_SEQUENCE.indexOf(cur);if(i>0)go(ACT_SEQUENCE[i-1]);});
document.getElementById('actArrowRight').addEventListener('click',function(){var i=ACT_SEQUENCE.indexOf(cur);if(i!==-1&&i<ACT_SEQUENCE.length-1)go(ACT_SEQUENCE[i+1]);});
sideItems.forEach(function(si){si.addEventListener('click',function(){go(si.dataset.s);if(document.getElementById('shell').classList.contains('menu-open'))menuOpen(false);});});
function fitSidebar(){
  var sb=document.getElementById('sidebar');
  if(!sb||document.getElementById('shell').classList.contains('collapsed'))return;
  if(window.matchMedia('(max-width:999px)').matches){sb.style.removeProperty('--sc');return;}
  var lo=0,hi=1,ok=0;
  sb.style.setProperty('--sc','1');
  if(sb.scrollHeight<=sb.clientHeight+1){return;}
  for(var i=0;i<12;i++){var mid=(lo+hi)/2;sb.style.setProperty('--sc',mid.toFixed(3));
    if(sb.scrollHeight<=sb.clientHeight+1){ok=mid;lo=mid;}else{hi=mid;}}
  sb.style.setProperty('--sc',ok.toFixed(3));
}
var fitT=null;function scheduleFit(){clearTimeout(fitT);fitT=setTimeout(fitSidebar,60);}
window.addEventListener('resize',scheduleFit);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(scheduleFit);
scheduleFit();setTimeout(scheduleFit,300);

function refreshSideList(){var n=Object.keys(actDone).length,N=ACT_SEQUENCE.length,p=Math.round(n/N*100);document.getElementById('progText').textContent=n+' de '+N+' actividades';document.getElementById('progBar').style.width=p+'%';document.getElementById('progPct').textContent=p+'%';var w=document.getElementById('progBarWrap');w.setAttribute('aria-valuenow',String(n));w.setAttribute('aria-valuetext',n+' de '+N+' actividades, '+p+'%');}
document.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.getAttribute&&e.target.getAttribute('role')==='button'){e.preventDefault();e.target.click();}});
var menuBtn=document.getElementById('menuBtn');
function menuOpen(o){var sh=document.getElementById('shell');sh.classList.toggle('menu-open',o);var cont=document.querySelector('.content');if(cont){if(o)cont.setAttribute('inert','');else cont.removeAttribute('inert');}menuBtn.setAttribute('aria-expanded',o?'true':'false');document.getElementById('sidebar').setAttribute('aria-modal',o?'true':'false');if(o){var f=document.querySelector('.sidebar .side-item[aria-current]')||document.querySelector('.sidebar .side-item');if(f)f.focus();}else{menuBtn.focus();}}
menuBtn.setAttribute('aria-controls','sidebar');menuBtn.setAttribute('aria-expanded','false');
menuBtn.addEventListener('click',function(){menuOpen(!document.getElementById('shell').classList.contains('menu-open'));});
document.getElementById('sideScrim').addEventListener('click',function(){menuOpen(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('shell').classList.contains('menu-open'))menuOpen(false);});
document.getElementById('sideToggle').addEventListener('click',function(){var c=document.getElementById('shell').classList.toggle('collapsed');this.setAttribute('aria-expanded',c?'false':'true');var l=c?'Expandir menú':'Contraer menú';this.setAttribute('aria-label',l);this.title=l;if(!c)scheduleFit();sideItems.forEach(function(si){if(c)si.title=si.querySelector('.hsc-label').textContent.trim();else si.removeAttribute('title');});try{localStorage.setItem('hsc_side_collapsed_u3',c?'1':'0');}catch(e){}});
try{if(localStorage.getItem('hsc_side_collapsed_u3')==='1')document.getElementById('sideToggle').click();}catch(e){}
window._goNext=function(id){go(id);};

var scores={match:0,phon:0,desc:0,values:0,sp:0,yn:0,retos:0,test:0};
var MAX={match:6,phon:2,desc:3,values:3,sp:6,yn:4,retos:5};
var KEY={s1:'match',s2:'phon',s3:'desc',s4:'values',s6:'sp',s7:'yn'};
function totalPts(){var t=0;for(var k in scores)t+=scores[k];return t;}
function maxPts(){var t=0;for(var k in MAX)t+=MAX[k];return t+TEST_Q.length;}
function updateGlobalPts(){document.getElementById('g-pts').textContent=totalPts()+' pts';var ap=document.getElementById('act-pts');if(ap)ap.textContent=totalPts()+' pts';if(!RESTORING)scormPartial();}
function setFb(t){if(RESTORING)return;document.getElementById('g-fb').textContent=t;}
function setProg(t){document.getElementById('sbar-prog').textContent='';var hp=document.getElementById('hdr-prog');if(!hp)return;var m=/^(\d+)\/(\d+)$/.exec(t||'');if(!m){hp.style.display='none';return;}hp.style.display='';hp.innerHTML=m[1]+' / '+m[2]+' <span class="bar"><i style="width:'+Math.round(m[1]/m[2]*100)+'%"></i></span>';}
function setBtns(html){document.getElementById('sbar-btns').innerHTML=html;}
function nextBtn(id){return '<button class="b b-pri" onclick="window._goNext(\''+id+'\')">Next &#8250;</button>';}
window._retosStep=function(dir){
  try{var w=document.getElementById('retosFrame').contentWindow;if(typeof w.go==='function'){w.go((typeof w.screen==='number'?w.screen:0)+dir);}}catch(e){}
  updateBar();
};
window.addEventListener('message',function(e){if(e&&e.data&&e.data.source==='HSC_RETOS_NAV'&&cur==='s8'){updateBar();}
  if(e&&e.data&&e.data.__retoResult){var d=e.data.__retoResult;if(!RESTORING)rec('s8retos',d.id+'|'+(d.ok?1:0));retosScored[d.id]=!!d.ok;scores.retos=Object.keys(retosScored).filter(function(k){return retosScored[k];}).length;updateGlobalPts();updateBar();if(scores.retos>=MAX.retos)markSideDone('s8');}
});
function backBtn(){var i=ACT_SEQUENCE.indexOf(cur);var prev=i>0?ACT_SEQUENCE[i-1]:(i===0?'s22':null);if(cur==='s8')prev=ACT_SEQUENCE[ACT_SEQUENCE.length-1];if(cur==='s9')prev='s8';if(cur==='s10')prev='s9';if(cur==='s22')return '<button class="b b-back" onclick="window._introStep(-1)" '+(introIdx===1?'disabled':'')+'>&#8249; Back</button>';if(cur==='s10')return (sumIdx>1)?'<button class="b b-back" onclick="window._sumStep(-1)">&#8249; Back</button>':'<button class="b b-back" onclick="window._goNext(\'s9\')">&#8249; Back</button>';if(cur==='s8'){var rs=0;try{var w=document.getElementById('retosFrame').contentWindow;rs=typeof w.screen==='number'?w.screen:0;}catch(e){}if(rs>0)return '<button class="b b-back" onclick="window._retosStep(-1)">&#8249; Back</button>';}return prev?'<button class="b b-back" onclick="window._goNext(\''+prev+'\')">&#8249; Back</button>':'';}
function updateBar(){
  var btns='';setProg('');
  var i=ACT_SEQUENCE.indexOf(cur);
  var next=(i!==-1&&i<ACT_SEQUENCE.length-1)?ACT_SEQUENCE[i+1]:'s8';
  if(KEY[cur]){setProg(scores[KEY[cur]]+'/'+MAX[KEY[cur]]);btns=nextBtn(next);}
  else if(cur==='s5'){btns=drawDone?nextBtn(next):'<button class="b b-pri" disabled>Draw something first</button>';}
  else if(cur==='s8'){setProg(scores.retos+'/'+MAX.retos);var rs=0,rtotal=MAX.retos+1;try{var w=document.getElementById('retosFrame').contentWindow;rs=typeof w.screen==='number'?w.screen:0;rtotal=(w.N!==undefined?w.N:MAX.retos)+1;}catch(e){}btns=(rs<rtotal)?'<button class="b b-pri" onclick="window._retosStep(1)">Next &#8250;</button>':nextBtn('s9');}
  else if(cur==='s9'){btns=nextBtn('s10');}
  else if(cur==='s10'){setProg(scores.test+'/'+TEST_Q.length);btns=(sumIdx<SUM_N)?'<button class="b b-pri" onclick="window._sumStep(1)">Next &#8250;</button>':'<button class="b b-pri" onclick="window._goScore()">See my final score &#8250;</button>';}
  else if(cur==='s20'||cur==='s21'){document.getElementById('sbar-back').innerHTML='';setBtns('');return;}
  if(cur==='s22')btns=(introIdx<INTRO_N)?'<button class="b b-pri" onclick="window._introStep(1)">Next &#8250;</button>':'<button class="b b-pri" onclick="window._goNext(\'s1\')">Let\'s start! &#8250;</button>';
  document.getElementById('sbar-back').innerHTML=backBtn();
  setBtns(btns);
}
window._goScore=function(){calcScore();go('s11');};

/* ══════════ DATOS: familia ══════════ */
var FAM=[{w:'mum',e:'👩'},{w:'dad',e:'👨'},{w:'sister',e:'👧'},{w:'brother',e:'👦'},{w:'grandma',e:'👵'},{w:'grandpa',e:'👴'}];
function famImg(w,cls){var t=FAM.filter(function(x){return x.w===w;})[0];return '<span class="toy3d fam-em '+(cls||'')+'" style="font-size:'+(cls==='sm'?'56':cls==='md'?'72':'64')+'px;">'+(t?t.e:'❓')+'</span>';}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function flash(el,cls){el.classList.add(cls);setTimeout(function(){el.classList.remove(cls);},450);}

/* ══════════ S1 VOCABULARY MATCH ══════════ */
var matchSel=null;
function matchBuild(){
  var bank=document.getElementById('matchBank'),grid=document.getElementById('matchGrid');
  bank.innerHTML='';grid.innerHTML='';matchSel=null;
  shuffle(FAM).forEach(function(t){var c=document.createElement('span');c.className='chip';c.textContent=t.w;c.dataset.w=t.w;c.setAttribute('role','button');c.setAttribute('tabindex','0');c.setAttribute('aria-pressed','false');
    c.addEventListener('click',function(){bank.querySelectorAll('.chip').forEach(function(x){x.classList.remove('sel');x.setAttribute('aria-pressed','false');});c.classList.add('sel');c.setAttribute('aria-pressed','true');matchSel=c;speak(t.w);});bank.appendChild(c);});
  FAM.forEach(function(t,i){var d=document.createElement('div');d.className='dropbox';d.dataset.w=t.w;d.innerHTML='<span class="num">'+(i+1)+'</span>'+famImg(t.w);d.setAttribute('role','button');d.setAttribute('tabindex','0');d.setAttribute('aria-label','family member '+(i+1));
    d.addEventListener('click',function(){
      if(d.classList.contains('done'))return;
      if(!matchSel){setFb('First tap a word.');return;}
      if(matchSel.dataset.w===t.w){rec('s1',t.w);d.classList.add('done');d.innerHTML+='<span class="placed">'+t.w+'</span>';matchSel.classList.add('used');matchSel.classList.remove('sel');matchSel=null;
        scores.match++;setFb('✓ '+t.w+'!');if(scores.match>=MAX.match){markSideDone('s1');setFb('✓ All 6 family words! Great!');}}
      else{flash(d,'wrongflash');setFb('✗ Try again.');}
      updateGlobalPts();updateBar();
    });grid.appendChild(d);});
}
matchBuild();

/* ══════════ S2 PHONICS & DIALOGUE ══════════ */
function phonBuild(){
  var g=document.getElementById('phonGrid');g.innerHTML='';
  var c1=document.createElement('div');c1.className='wcard';
  c1.innerHTML='<div style="font-size:32px;font-weight:900;color:var(--navy);">m _ _ / m _</div><div class="hint">Emma\'s phonics — write the word</div>';
  var inp=document.createElement('input');inp.className='winput';inp.maxLength=10;inp.dataset.answer='mum';inp.placeholder='m…';inp.autocomplete='off';
  function checkPhon(){if(inp.disabled)return;var v=inp.value.trim().toLowerCase();if(!v)return;
    if(v===inp.dataset.lastTry)return;inp.dataset.lastTry=v;
    if(v==='mum'){rec('s2','mum');inp.classList.add('correct');inp.disabled=true;scores.phon++;speak('mum');setFb('✓ mum!');if(scores.phon>=MAX.phon)markSideDone('s2');}
    else{flash(inp,'wrong');setFb('✗ Check the letters and try again.');}
    updateGlobalPts();updateBar();}
  inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();checkPhon();}});
  inp.addEventListener('blur',checkPhon);
  c1.appendChild(inp);var sp=document.createElement('button');sp.className='speak';sp.textContent='🔊';sp.dataset.say='mum';c1.appendChild(sp);g.appendChild(c1);

  var c2=document.createElement('div');c2.className='prep-card';
  c2.innerHTML='<div class="sent">👦 "— Who\'s that? — That\'s my ___!"</div><div class="prep-opts"><span class="opt" data-w="brother">brother</span><span class="opt" data-w="dad">dad</span><span class="opt" data-w="grandpa">grandpa</span></div>';
  g.appendChild(c2);
  pick(c2,'brother','phon',MAX.phon,'s2','brother!','Listen again and try.',null);
}
phonBuild();
function phonReset(){phonBuild();}

/* ══════════ S3 DESCRIBING FAMILY & HOLIDAYS ══════════ */
var DESC=[
  {id:'q1',sent:"That's my brother. He's ___.",opts:['tall','short'],ok:'tall'},
  {id:'q2',sent:"That's my dad. He isn't tall. He's ___.",opts:['short','tall'],ok:'short'},
  {id:'q3',sent:'My photo is on the ___.',opts:['beach','city'],ok:'beach'}
];
function descBuild(){
  var g=document.getElementById('descGrid');g.innerHTML='';
  DESC.forEach(function(d,i){var c=document.createElement('div');c.className='prep-card';c.dataset.rec=d.id;
    var h='<div class="sent">'+(i+1)+'. '+d.sent+'</div><div class="prep-opts">';
    d.opts.forEach(function(o){h+='<span class="opt" data-w="'+o+'">'+o+'</span>';});
    c.innerHTML=h+'</div>';g.appendChild(c);
    pick(c,d.ok,'desc',MAX.desc,'s3',d.ok+'!','Look at the sentence again.',null);
  });
}
descBuild();

/* ══════════ S4 VALUES (gap-fill genérico) ══════════ */
function gapFill(bankId,screenId,words,answers,key,max,onAll){
  var bank=document.getElementById(bankId),sel=null;
  bank.innerHTML='';
  shuffle(words).forEach(function(w){var c=document.createElement('span');c.className='chip';c.textContent=w;c.dataset.w=w;
    c.addEventListener('click',function(){bank.querySelectorAll('.chip').forEach(function(x){x.classList.remove('sel');});c.classList.add('sel');sel=c;});bank.appendChild(c);});
  document.querySelectorAll('#'+screenId+' .gap').forEach(function(gp){gp.textContent='____';gp.classList.remove('filled');gp.classList.add('target');
    gp.onclick=function(){if(gp.classList.contains('filled'))return;if(!sel){setFb('First tap a word.');return;}
      var expected=answers[gp.dataset.g].split('|');
      if(expected.indexOf(sel.dataset.w)!==-1){rec(screenId,sel.dataset.w+'|'+gp.dataset.g);gp.textContent=sel.dataset.w;gp.classList.add('filled');gp.classList.remove('target');sel.classList.add('used');sel.classList.remove('sel');sel=null;
        scores[key]++;setFb('✓ Correct!');if(scores[key]>=max)onAll();}
      else{flash(gp,'wrongflash');setFb('✗ Not that word.');}
      updateGlobalPts();updateBar();};});
}
function valuesBuild(){gapFill('valBank','s4',['sister','meet','special','book','please'],['sister','meet','special|great|amazing|wonderful|cool'],'values',MAX.values,function(){markSideDone('s4');setFb('✓ Great! We are all different, and that\'s special!');});}
valuesBuild();

/* ══════════ S5 IMAGINE & DRAW (canvas libre — NUNCA se califica) ══════════ */
var drawDone=false,drawColor='#2e3f6e',drawing=false;
var cv=document.getElementById('drawCanvas'),ctx=cv.getContext('2d');
function drawGuide(){ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.save();ctx.strokeStyle='#dbe5f5';ctx.lineWidth=4;ctx.setLineDash([12,10]);ctx.strokeRect(75,50,610,250);ctx.restore();ctx.fillStyle='#a8b8d6';ctx.font='700 22px Nunito, sans-serif';ctx.fillText('Draw your family here!',255,365);}
function drawResize(){if(!drawDone)drawGuide();}
function cpos(e){var r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height];}
cv.addEventListener('pointerdown',function(e){e.preventDefault();cv.setPointerCapture(e.pointerId);drawing=true;var p=cpos(e);ctx.strokeStyle=drawColor;ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+0.1,p[1]);ctx.stroke();if(!drawDone){drawDone=true;rec('s5','1',true);markSideDone('s5');updateBar();document.getElementById('drawMsg').textContent='Great! Keep adding details to your family.';}});
cv.addEventListener('pointermove',function(e){if(!drawing)return;var p=cpos(e);ctx.lineTo(p[0],p[1]);ctx.stroke();});cv.addEventListener('pointerup',function(){drawing=false;});cv.addEventListener('pointercancel',function(){drawing=false;});
document.querySelectorAll('#s5 .swatch').forEach(function(x){x.addEventListener('click',function(){document.querySelectorAll('#s5 .swatch').forEach(function(y){y.classList.remove('sel');});x.classList.add('sel');drawColor=x.dataset.c;});});document.getElementById('drawClear').addEventListener('click',function(){drawDone=false;drawGuide();updateBar();});drawGuide();

/* ══════════ S6 SPELLING TIME ══════════ */
var SP=['mum','dad','sister','brother','grandma','grandpa'];
function spBuild(){var g=document.getElementById('spGrid');g.innerHTML='';
  SP.forEach(function(w){var d=document.createElement('div');d.className='wcard';
    var letters=shuffle(w.split(''));if(letters.join('')===w)letters=letters.reverse();
    var h=famImg(w,'md')+'<div class="letters"></div><div class="built">&nbsp;</div><button class="b b-sec sp-reset">↺</button>';d.innerHTML=h;
    var box=d.querySelector('.letters'),built=d.querySelector('.built'),curW='',done=false;
    letters.forEach(function(L){var b=document.createElement('span');b.className='letter';b.textContent=L;
      b.addEventListener('click',function(){if(done)return;if(L!==w[curW.length]){flash(b,'wrong');setFb('✗ Not that letter.');return;}b.classList.add('used');curW+=L;built.textContent=curW;
        if(curW===w){done=true;rec('s6',w);built.classList.add('correct');scores.sp++;speak(w);setFb('✓ '+w+'!');if(scores.sp>=MAX.sp)markSideDone('s6');updateGlobalPts();updateBar();}});box.appendChild(b);});
    d.querySelector('.sp-reset').addEventListener('click',function(){if(done)return;curW='';built.innerHTML='&nbsp;';box.querySelectorAll('.letter').forEach(function(x){x.classList.remove('used');});});
    g.appendChild(d);});}
spBuild();

/* ══════════ helper genérico de "elige 1 de N" ══════════ */
function pick(container,answer,key,max,screenId,okText,badText,opts){
  var done=false;
  container.querySelectorAll(opts||'.opt').forEach(function(o){o.addEventListener('click',function(){if(done)return;
    if(o.dataset.w===answer){rec(screenId,container.dataset.rec||answer);o.classList.add('correct');done=true;container.querySelectorAll(opts||'.opt').forEach(function(x){x.classList.add('locked');});scores[key]++;setFb('✓ '+okText);if(typeof okText==='string'&&okText)speak(okText.replace('!',''));
      if(scores[key]>=max)markSideDone(screenId);}
    else{flash(o,'wrong');setFb('✗ '+badText);}
    updateGlobalPts();updateBar();});});
}

/* ══════════ S7 YES OR NO ══════════ */
var YN=[
  {w:'brother',q:'Is the brother tall?',ok:'yes'},
  {w:'grandma',q:'Is she grandma?',ok:'yes'},
  {w:'grandpa',q:'Is he dad?',ok:'no'},
  {w:'dad',q:'Is the dad short?',ok:'yes'}
];
function ynBuild(){var g=document.getElementById('ynGrid');g.innerHTML='';YN.forEach(function(y,i){var d=document.createElement('div');d.className='prep-card';d.innerHTML=famImg(y.w,'md')+'<div class="sent">'+(i+1)+'. '+y.q+'</div><div class="prep-opts"><span class="opt" data-w="yes">YES</span><span class="opt" data-w="no">NO</span></div>';d.dataset.rec=String(i);pick(d,y.ok,'yn',MAX.yn,'s7',y.ok==='yes'?'Yes!':'No!','Look at the picture again.',null);g.appendChild(d);});}
ynBuild();

/* ══════════ S8 FINAL CHALLENGE (iframe, motor de retos reutilizado) ══════════ */
var retosScored={r1:false,r2:false,r3:false,r4:false,r5:false};
document.getElementById('retosFrame').srcdoc=RETOS_SIM;

/* ══════════ S9 TRABAJO ESCRITO (visor de la guía real + descarga del PDF) ══════════ */
var worksheetPage=0,worksheetUrl=null;
function worksheetRender(){
 var img=document.getElementById('worksheetPage');
 var pages=window.WORKSHEET_PAGES;
 img.src=pages[worksheetPage];
 img.alt='Guía original, página '+(worksheetPage+1)+' de '+pages.length;
 document.getElementById('worksheetCount').textContent='Página '+(worksheetPage+1)+' de '+pages.length;
 document.getElementById('worksheetPrev').disabled=worksheetPage===0;
 document.getElementById('worksheetNext').disabled=worksheetPage===pages.length-1;
}
function worksheetPDF(){
 if(worksheetUrl)return worksheetUrl;
 var bin=atob(PDF_B64),arr=new Uint8Array(bin.length);
 for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
 worksheetUrl=URL.createObjectURL(new Blob([arr],{type:'application/pdf'}));
 return worksheetUrl;
}
document.getElementById('worksheetPrev').onclick=function(){if(worksheetPage>0){worksheetPage--;worksheetRender();}};
document.getElementById('worksheetNext').onclick=function(){if(worksheetPage<window.WORKSHEET_PAGES.length-1){worksheetPage++;worksheetRender();}};
document.getElementById('pdfBtn').addEventListener('click',function(){
 try{
  var a=document.createElement('a');a.href=worksheetPDF();a.download='Guia_Escrita_UNIT_3_THATS_MY_FAMILY.pdf';document.body.appendChild(a);a.click();a.remove();
  document.getElementById('worksheetStatus').textContent='PDF preparado. Imprime las 3 páginas y completa la guía a mano.';
 }catch(e){document.getElementById('worksheetStatus').textContent='No se pudo abrir el PDF en este navegador. Vuelve a pulsar Descargar PDF.';}
});
document.getElementById('worksheetOpen').onclick=function(){
 var win=window.open(worksheetPDF(),'_blank');
 document.getElementById('worksheetStatus').textContent=win?'La guía se abrió en otra pestaña. Usa el botón de imprimir del visor PDF.':'La pestaña fue bloqueada. Usa Descargar PDF para imprimir la guía.';
};
document.getElementById('worksheetZoom').onclick=function(){
 var dia=document.getElementById('worksheetDialog');
 document.getElementById('worksheetZoomPage').src=window.WORKSHEET_PAGES[worksheetPage];
 document.getElementById('worksheetZoomTitle').textContent='Guía original · Página '+(worksheetPage+1)+' de 3';
 dia.showModal();
};
document.getElementById('worksheetClose').onclick=function(){document.getElementById('worksheetDialog').close();};
document.getElementById('worksheetDone').onchange=function(){
 if(this.checked){markSideDone('s9');rec('s9','1',true);setFb('✓ Guía terminada y revisada por un adulto.');}
 else{delete ST.a.s9;var item=document.querySelector('.side-item[data-s="s9"]');if(item)item.classList.remove('completed');save();}
};
worksheetRender();

document.getElementById('reflexBox').addEventListener('input',function(){ST.ref=this.value.slice(0,400);save();});

/* ══════════ S10 RESUMEN: carrusel ══════════ */
var sumIdx=1,SUM_N=document.querySelectorAll('.sum-slide').length;
function sumRender(){
  document.getElementById('sumTrack').style.transform='translateX(-'+((sumIdx-1)*100)+'%)';
  var dots=document.getElementById('sumDots');
  if(!dots.children.length){for(var k=1;k<=SUM_N;k++){var d=document.createElement('div');d.className='intro-dot';d.dataset.i=k;d.title=document.querySelectorAll('.sum-slide')[k-1].dataset.t;d.addEventListener('click',function(){sumIdx=+this.dataset.i;sumRender();updateBar();});dots.appendChild(d);}}
  dots.querySelectorAll('.intro-dot').forEach(function(d,i){d.classList.toggle('active',(i+1)===sumIdx);});
  document.querySelectorAll('.sum-slide').forEach(function(s,i){s.scrollTop=0;});
}
window._sumStep=function(dir){sumIdx=Math.max(1,Math.min(SUM_N,sumIdx+dir));sumRender();updateBar();};

/* ══════════ TEST FINAL (sub-carrusel) ══════════ */
var TEST_Q=[
 {q:'What do we call your mum\'s mum?',o:['grandma','grandpa'],ok:0,img:function(){return famImg('grandma','md');}},
 {q:'👦 "That\'s my ___! He\'s tall."',o:['brother','dad'],ok:0,img:function(){return famImg('brother','md');}},
 {q:'Is dad tall or short in our story?',o:['short','tall'],ok:0},
 {q:'"Nice to ___ you!"',o:['meet','see'],ok:0},
 {q:'We\'re all different, and that\'s ___!',o:['special','boring'],ok:0}
];
var testAnswered={},testCorrect={},testIdx=1,TEST_N=TEST_Q.length;
function testBuild(){
  var track=document.getElementById('testTrack'),h='';
  TEST_Q.forEach(function(item,qi){
    h+='<div class="test-slide" data-qi="'+qi+'">';
    if(item.img)h+='<div class="test-illus">'+item.img()+'</div>';
    h+='<div class="test-q"><div class="qt">'+(qi+1)+'. '+item.q+'</div>';
    item.o.forEach(function(opt,oi){h+='<button type="button" class="test-opt" data-qi="'+qi+'" data-oi="'+oi+'"><span>'+opt+'</span></button>';});
    h+='</div></div>';
  });
  track.innerHTML=h;
  track.querySelectorAll('.test-opt').forEach(function(btn){btn.addEventListener('click',function(){var qi=btn.dataset.qi;if(testAnswered[qi]!==undefined)return;var oi=parseInt(btn.dataset.oi,10),item=TEST_Q[qi],group=track.querySelectorAll('.test-opt[data-qi="'+qi+'"]');testAnswered[qi]=true;
    ST.test[qi]=oi;save();if(oi===item.ok){btn.classList.add('correct');testCorrect[qi]=true;setFb('✓ Correct!');}else{btn.classList.add('wrong');group[item.ok].classList.add('correct');setFb('✗ The correct answer is highlighted.');}
    scores.test=Object.keys(testCorrect).length;if(Object.keys(testAnswered).length>=TEST_Q.length)markSideDone('s10');updateGlobalPts();updateBar();
    if(!RESTORING)setTimeout(function(){if(testIdx<TEST_N)window._testStep(1);},700);});});
  testRender();
}
function testRender(){
  document.getElementById('testTrack').style.transform='translateX(-'+((testIdx-1)*100)+'%)';
  var slide=document.querySelector('.sum-slide.sum-test');if(slide)slide.scrollTop=0;
  var dots=document.getElementById('testDots');dots.innerHTML='';
  for(var k=1;k<=TEST_N;k++){var d=document.createElement('div');d.className='intro-dot'+(k===testIdx?' active':'');d.addEventListener('click',(function(k){return function(){testIdx=k;testRender();};})(k));dots.appendChild(d);}
  document.getElementById('testPrev').disabled=(testIdx===1);
  document.getElementById('testNext').disabled=(testIdx===TEST_N);
}
window._testStep=function(d){testIdx=Math.max(1,Math.min(TEST_N,testIdx+d));testRender();};
document.getElementById('testPrev').addEventListener('click',function(){window._testStep(-1);});
document.getElementById('testNext').addEventListener('click',function(){window._testStep(1);});
testBuild();
function testReset(){testAnswered={};testCorrect={};scores.test=0;testIdx=1;testBuild();}

/* ══════════ INTRODUCCIÓN: carrusel ══════════ */
var introIdx=1,INTRO_N=document.querySelectorAll('.intro-slide').length;
function introRender(){
  document.querySelectorAll('.intro-slide').forEach(function(s){s.classList.toggle('active',+s.dataset.i===introIdx);});
  document.querySelectorAll('#introDots .intro-dot').forEach(function(d){d.classList.toggle('active',+d.dataset.i===introIdx);});
}
window._introStep=function(dir){introIdx=Math.max(1,Math.min(INTRO_N,introIdx+dir));introRender();updateBar();};
document.getElementById('introBack').addEventListener('click',function(){window._introStep(-1);});
document.getElementById('introNext').addEventListener('click',function(){window._introStep(1);});

/* ══════════ REANUDACIÓN: reconstruye la UI reproduciendo las acciones guardadas ══════════ */
function q(sel,root){return (root||document).querySelector(sel);}
function clickAll(list,fn){(list||[]).forEach(fn);}
var RESTORERS={
  s1:function(w){var c=q('#matchBank .chip[data-w="'+w+'"]'),d=q('#matchGrid .dropbox[data-w="'+w+'"]');if(c&&d){c.click();d.click();}},
  s2:function(w){if(w==='mum'){var i=q('#phonGrid input[data-answer="mum"]');if(i){i.value='mum';i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));}}else{var o=q('#phonGrid .opt[data-w="'+w+'"]');if(o)o.click();}},
  s3:function(id){var d=document.querySelector('#descGrid .prep-card[data-rec="'+id+'"]');if(!d)return;var item=DESC.filter(function(x){return x.id===id;})[0];var o=q('.opt[data-w="'+item.ok+'"]',d);if(o)o.click();},
  s4:function(v){var p=v.split('|');var c=q('#valBank .chip[data-w="'+p[0]+'"]'),g=q('#s4 .gap[data-g="'+p[1]+'"]');if(c&&g){c.click();g.click();}},
  s5:function(){drawDone=true;markSideDone('s5');document.getElementById('drawMsg').textContent='You already drew here. Draw again if you like!';},
  s6:function(w){var d=document.querySelectorAll('#spGrid .wcard')[SP.indexOf(w)];if(!d)return;w.split('').forEach(function(L){var ls=d.querySelectorAll('.letter:not(.used)');for(var k=0;k<ls.length;k++){if(ls[k].textContent===L){ls[k].click();break;}}});},
  s7:function(i){var d=document.querySelectorAll('#ynGrid .prep-card')[+i];if(d){var o=q('.opt[data-w="'+YN[+i].ok+'"]',d);if(o)o.click();}},
  s9:function(){markSideDone('s9');document.getElementById('worksheetDone').checked=true;}
};
function restoreState(){
  RESTORING=true;
  try{
    Object.keys(ST.a).forEach(function(sc){if(sc==='s8retos')return;if(RESTORERS[sc])clickAll(ST.a[sc],RESTORERS[sc]);});
    (ST.a.s8retos||[]).forEach(function(tok){var p=tok.split('|');retosScored[p[0]]=p[1]==='1';});
    scores.retos=Object.keys(retosScored).filter(function(k){return retosScored[k];}).length;
    if(scores.retos>=MAX.retos)markSideDone('s8');
    Object.keys(ST.test||{}).forEach(function(qi){var b=q('.test-opt[data-qi="'+qi+'"][data-oi="'+ST.test[qi]+'"]');if(b)b.click();});
    document.getElementById('reflexBox').value=ST.ref||'';
  }catch(e){}
  RESTORING=false;
  updateGlobalPts();
}
function firstName(){return studentName?studentName.split(',').slice(-1)[0].trim().split(' ')[0]:'';}
(function(){
  var had=load();
  var m=document.getElementById('resumeModal');
  if(!had){
    var fn=firstName();
    document.getElementById('rm-title').textContent=(fn?'Hi, '+fn+'!':'Hi, explorer!');
    document.getElementById('rm-text').innerHTML='Welcome to <b>Unit 3: That\'s My Family!</b> Let\'s learn family words, descriptions and kind English together! 👪';
    document.getElementById('rm-restart').style.display='none';
    document.getElementById('rm-go').textContent='▶ Let\'s start!';
    m.classList.add('show');
    document.getElementById('rm-go').onclick=function(){m.classList.remove('show');};
    return;
  }
  var doneCount=Object.keys(ST.a).filter(function(k){return ACT_SEQUENCE.indexOf(k)!==-1;}).length;
  restoreState();
  var loc=(screens.indexOf(ST.loc)!==-1&&ST.loc!=='s11')?ST.loc:'s20';
  var where=ACT_SEQUENCE.indexOf(loc)!==-1?('activity '+(ACT_SEQUENCE.indexOf(loc)+1)+' · '+ACT_NAMES[loc]):(titles[screens.indexOf(loc)]||'');
  document.getElementById('rm-restart').style.display='';
  if(PARENT_SCREENS.indexOf(loc)!==-1){
    document.getElementById('rm-title').textContent='Bienvenido de nuevo'+(studentName?', '+firstName():'')+'.';
    document.getElementById('rm-text').innerHTML='Te quedaste en <b>'+where+'</b>.'+(doneCount>0?'<br>Actividades de los niños: <b>'+doneCount+' de '+ACT_SEQUENCE.length+'</b>.':'')+'<br>¿Quieres continuar?';
    document.getElementById('rm-go').textContent='▶ Continuar';
    document.getElementById('rm-restart').textContent='↺ Empezar de nuevo';
  }else{
    document.getElementById('rm-title').textContent='Welcome back'+(studentName?', '+firstName():'')+'!';
    document.getElementById('rm-text').innerHTML='You have <b>'+totalPts()+' pts</b> and you were on <b>'+where+'</b>.<br>Do you want to continue?';
    document.getElementById('rm-go').textContent='▶ Continue';
    document.getElementById('rm-restart').textContent='↺ Start over';
  }
  m.classList.add('show');
  document.getElementById('rm-go').onclick=function(){m.classList.remove('show');go(loc);};
  document.getElementById('rm-restart').onclick=function(){m.classList.remove('show');document.getElementById('sc-retry').click();};
})();

/* ══════════ SCORE ══════════ */
function calcScore(){
  var rows=ACT_SEQUENCE.filter(function(id){return KEY[id];}).map(function(id){return {n:(ACT_SEQUENCE.indexOf(id)+1)+' · '+ACT_NAMES[id],k:KEY[id]};});
  rows.push({n:'Final Challenge',k:'retos'});
  var raw=0,max=0;rows.forEach(function(r){raw+=scores[r.k];max+=MAX[r.k];});raw+=scores.test;max+=TEST_Q.length;
  var pct=Math.round(raw/max*100);scormScore(raw,max);
  document.getElementById('sc-e').textContent=pct>=90?'🏆':pct>=70?'⭐':pct>=50?'👍':'💪';
  document.getElementById('sc-t').textContent=(pct>=90?'Outstanding!':pct>=70?'Great Job!':pct>=50?'Good Effort!':'Keep Practicing!')+' · '+raw+'/'+max+' ('+pct+'%)';
  var tb=document.getElementById('sc-tb');tb.innerHTML='';
  rows.forEach(function(r){tb.innerHTML+='<tr><td>'+r.n+'</td><td class="right">'+scores[r.k]+' / '+MAX[r.k]+'</td></tr>';});
  tb.innerHTML+='<tr><td>Final test</td><td class="right">'+scores.test+' / '+TEST_Q.length+'</td></tr>';
}
document.getElementById('sc-retry').onclick=function(){
  for(var k in scores)scores[k]=0;ST={v:1,loc:'s20',a:{},test:{},ref:'',tt:0};document.getElementById('reflexBox').value='';sessionStart=Date.now();totalPrev=0;tickTime();
  if(!api){try{localStorage.setItem(LS_KEY,JSON.stringify(ST));}catch(e){}}else{lms('cmi.suspend_data',JSON.stringify(ST));lms('cmi.core.lesson_location','s20');lms('cmi.core.lesson_status','incomplete');commit();}
  matchBuild();phonReset();descBuild();valuesBuild();spBuild();ynBuild();testReset();
  drawDone=false;drawGuide();
  retosScored={r1:false,r2:false,r3:false,r4:false,r5:false};var rf=document.getElementById('retosFrame');if(rf)rf.srcdoc=RETOS_SIM;
  document.getElementById('worksheetDone').checked=false;worksheetPage=0;worksheetRender();
  actArrowsReset();sideItems.forEach(function(s){s.classList.remove('completed');});updateGlobalPts();go('s20');
};

go('s20');

})();
