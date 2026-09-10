(function(){
const K='atom-reference-data-v1',EK='atom-responsible-emails-v1';
const D={
responsibles:{t:'Ответственные',f:'Не назначен',a:['Не назначен','Иван Корытник','Александр Костылев']},
stage:{t:'Статусы этапов',f:'Не начато',a:['Не начато','Подготовка','В работе','Ожидание данных','На согласовании','Блокер','Завершено']},
source:{t:'Статусы источников',f:'Не начато',a:['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово']},
blocker:{t:'Статусы блокеров',f:'Открыт',a:['Открыт','В работе','Ожидаем ответ','На эскалации','Решен','Закрыт']},
severity:{t:'Критичность блокеров',f:'Средняя',a:['Низкая','Средняя','Высокая','Критическая']}
};
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function load(){let x={};try{x=JSON.parse(localStorage.getItem(K)||'{}')||{};}catch{};Object.keys(D).forEach(k=>{if(!Array.isArray(x[k])||!x[k].length)x[k]=D[k].a.slice();});return x;}
function loadEmails(){try{return JSON.parse(localStorage.getItem(EK)||'{}')||{};}catch{return{};}}
let S=load(),E=loadEmails();
function save(){localStorage.setItem(K,JSON.stringify(S));localStorage.setItem(EK,JSON.stringify(E));patch();}
if(!localStorage.getItem(K))save();
function blockers(){try{return JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[];}catch{return[];}}
function saveBlockers(x){localStorage.setItem('atom-blockers',JSON.stringify(x));}
function migrate(type,oldv,newv){
 if(type==='responsibles'){
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('atom-responsible-')&&localStorage.getItem(k)===oldv)localStorage.setItem(k,newv);}
  const b=blockers();b.forEach(x=>{if(x.owner===oldv)x.owner=newv;});saveBlockers(b);
  if(Object.prototype.hasOwnProperty.call(E,oldv)){E[newv]=E[oldv];delete E[oldv];}
 }
 if(type==='stage')for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('atom-stage-status-')&&localStorage.getItem(k)===oldv)localStorage.setItem(k,newv);}
 if(type==='source')for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('atom-source-status-')&&localStorage.getItem(k)===oldv)localStorage.setItem(k,newv);}
 if(type==='blocker'){const b=blockers();b.forEach(x=>{if(x.status===oldv)x.status=newv;});saveBlockers(b);}
 if(type==='severity'){const b=blockers();b.forEach(x=>{if(x.severity===oldv)x.severity=newv;});saveBlockers(b);}
}
function opts(el,type,val){if(!el)return;let a=S[type].slice();if(val&&!a.includes(val))a.push(val);el.innerHTML=a.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if(val)el.value=val;}
function byId(id){return blockers().find(x=>String(x.id)===String(id));}
function patch(){
 document.querySelectorAll('.responsible-select').forEach(e=>opts(e,'responsibles',localStorage.getItem(`atom-responsible-${e.dataset.teamIndex}`)||D.responsibles.f));
 opts(document.getElementById('bl-owner'),'responsibles',document.getElementById('bl-owner')?.value||D.responsibles.f);
 document.querySelectorAll('.stage-status-select').forEach(e=>opts(e,'stage',localStorage.getItem(`atom-stage-status-${e.dataset.stageId}`)||D.stage.f));
 document.querySelectorAll('.source-status-select').forEach(e=>opts(e,'source',localStorage.getItem(`atom-source-status-${e.dataset.sourceIndex}`)||D.source.f));
 document.querySelectorAll('.blocker-status').forEach(e=>opts(e,'blocker',byId(e.dataset.id)?.status||D.blocker.f));
 document.querySelectorAll('.blocker-severity').forEach(e=>opts(e,'severity',byId(e.dataset.id)?.severity||D.severity.f));
 opts(document.getElementById('bl-severity'),'severity',document.getElementById('bl-severity')?.value||D.severity.f);
}
function styles(){if(document.getElementById('dir-css'))return;const s=document.createElement('style');s.id='dir-css';s.textContent='.dir-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dir-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:15px}.dir-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;align-items:center;padding:7px 0;border-bottom:1px solid var(--line)}.dir-row:last-child{border-bottom:0}.dir-person{min-width:0}.dir-email{display:block;font-size:11px;color:var(--muted);margin-top:2px;overflow-wrap:anywhere}.dir-row button{padding:5px 8px;border:1px solid var(--line);background:#fff;border-radius:7px;cursor:pointer}.dir-row .del{color:#a53636}.dir-add{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}.dir-add.resp{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}.dir-add input{padding:9px;border:1px solid var(--line);border-radius:8px;min-width:0}.dir-note{font-size:12px;color:var(--muted);margin-top:14px}@media(max-width:900px){.dir-grid{grid-template-columns:1fr}.dir-add.resp{grid-template-columns:1fr}}';document.head.appendChild(s);}
function row(k,v,i){const person=k==='responsibles';return `<div class="dir-row"><span class="dir-person">${esc(v)}${person?`<small class="dir-email">${esc(E[v]||'E-mail не указан')}</small>`:''}</span><button class="dir-edit" data-k="${k}" data-i="${i}">${person?'Изменить':'Изменить'}</button><button class="dir-del del" data-k="${k}" data-i="${i}">Удалить</button></div>`;}
function addForm(k){if(k==='responsibles')return `<div class="dir-add resp"><input class="dir-new" data-k="${k}" placeholder="ФИО"><input class="dir-new-email" type="email" placeholder="E-mail"><button class="btn primary dir-add-btn" data-k="${k}">Добавить</button></div>`;return `<div class="dir-add"><input class="dir-new" data-k="${k}" placeholder="Новое значение"><button class="btn primary dir-add-btn" data-k="${k}">Добавить</button></div>`;}
function open(){styles();app.innerHTML=`<div class="section-title"><h2>Справочники</h2><small>Все выпадающие меню проекта</small></div><div class="callout"><b>Изменения применяются ко всему проекту</b> и синхронизируются между устройствами.</div><div class="dir-grid">${Object.keys(D).map(k=>`<div class="dir-card"><h3>${D[k].t}</h3>${S[k].map((v,i)=>row(k,v,i)).join('')}${addForm(k)}</div>`).join('')}</div><div class="dir-note">В справочнике «Ответственные» для каждого сотрудника можно хранить e-mail. В выпадающих меню отображается только ФИО.</div>`;}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function add(k){const e=document.querySelector(`.dir-new[data-k="${k}"]`),v=(e?.value||'').trim();if(!v)return;if(S[k].some(x=>x.toLowerCase()===v.toLowerCase()))return alert('Такое значение уже есть');if(k==='responsibles'){const mail=(document.querySelector('.dir-new-email')?.value||'').trim();if(!validEmail(mail))return alert('Проверь формат e-mail');E[v]=mail;}S[k].push(v);save();open();}
function edit(k,i){const old=S[k][i],v=prompt(k==='responsibles'?'ФИО':'Новое значение',old);if(v===null)return;const n=v.trim();if(!n)return;if(S[k].some((x,j)=>j!==i&&x.toLowerCase()===n.toLowerCase()))return alert('Такое значение уже есть');if(k==='responsibles'){const mail=prompt('E-mail',E[old]||'');if(mail===null)return;const m=mail.trim();if(!validEmail(m))return alert('Проверь формат e-mail');S[k][i]=n;migrate(k,old,n);E[n]=m;}else{S[k][i]=n;migrate(k,old,n);}save();open();}
function del(k,i){const old=S[k][i];if(S[k].length===1)return alert('В справочнике должно остаться хотя бы одно значение');if(!confirm(`Удалить «${old}»?`))return;const fb=S[k].includes(D[k].f)&&old!==D[k].f?D[k].f:S[k].find((_,j)=>j!==i);migrate(k,old,fb);S[k].splice(i,1);if(k==='responsibles')delete E[old];save();open();}
function button(){const sb=document.querySelector('.sidebar');if(!sb||document.getElementById('directories-nav'))return;const b=document.createElement('button');b.id='directories-nav';b.className='nav';b.textContent='Справочники';b.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');open();});sb.appendChild(b);}
document.addEventListener('click',e=>{const a=e.target.closest('.dir-add-btn');if(a)return add(a.dataset.k);const ed=e.target.closest('.dir-edit');if(ed)return edit(ed.dataset.k,+ed.dataset.i);const d=e.target.closest('.dir-del');if(d)return del(d.dataset.k,+d.dataset.i);});
const mo=new MutationObserver(()=>patch());mo.observe(document.body,{childList:true,subtree:true});
window.addEventListener('atom-sync-update',()=>{S=load();E=loadEmails();patch();});
styles();button();patch();window.ATOM_DIRECTORIES={open};
})();