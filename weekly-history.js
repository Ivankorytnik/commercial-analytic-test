(function(){
  const ARCHIVE_KEY='atom-weekly-report-archive-v1';
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')||f}catch{return f}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'';const p=v.split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:v};

  function labelKey(key){
    if(key.startsWith('atom-stage-status-'))return'Изменен статус этапа';
    if(key.startsWith('atom-source-status-'))return'Изменен статус источника';
    if(key.startsWith('atom-responsible-'))return'Назначен ответственный';
    if(key.startsWith('atom-dictionary-ready-'))return'Обновлен Data Dictionary';
    if(key.startsWith('atom-raci-requirement-state-'))return'Обновлены ответы RACI';
    if(key==='atom-blockers')return'Обновлены блокеры';
    if(key.startsWith('atom-gantt-due-'))return'Изменен срок в Ганте';
    return'Обновлены данные проекта';
  }

  function buildDraft(){
    const from=document.getElementById('weekly-from')?.value;
    const to=document.getElementById('weekly-to')?.value;
    const fromTs=from?new Date(from+'T00:00:00').getTime():Date.now()-7*86400000;
    const toTs=to?new Date(to+'T23:59:59').getTime():Date.now();
    const audit=window.ATOM_LOGIC?.audit?.()||[];
    const recent=audit.filter(x=>{const ts=new Date(x.ts).getTime();return ts>=fromTs&&ts<=toTs;});
    const groups=[];const seen=new Set();
    recent.slice().reverse().forEach(x=>{const l=labelKey(x.key);if(!seen.has(l)){seen.add(l);groups.push(l);}});
    const done=groups.length?groups.map((x,i)=>`${i+1}. ${x}`).join('\n'):'1. За отчетный период изменения пока не зафиксированы.';

    const now=Date.now(),next=now+7*86400000;
    const states=window.ATOM_GANTT?.getAllStates?.()||[];
    const upcoming=states.filter(s=>{
      const start=new Date(s.startDate).getTime(),due=new Date(s.due).getTime();
      return s.status!=='Завершено'&&((start<=next&&due>=now)||(start>now&&start<=next));
    });
    const plan=upcoming.length?upcoming.map((s,i)=>`${i+1}. ${s.name}: довести до следующего контрольного статуса по Ганту (${fmt(new Date(s.due).toISOString().slice(0,10))})`).join('\n'):'1. Проверить текущие этапы и зафиксировать план на следующую неделю.';
    const doneEl=document.getElementById('weekly-done'),planEl=document.getElementById('weekly-plan');
    if(doneEl){doneEl.value=done;doneEl.dispatchEvent(new Event('input',{bubbles:true}));}
    if(planEl){planEl.value=plan;planEl.dispatchEvent(new Event('input',{bubbles:true}));}
  }

  function saveSnapshot(){
    const from=document.getElementById('weekly-from')?.value||'',to=document.getElementById('weekly-to')?.value||'',done=document.getElementById('weekly-done')?.value||'',plan=document.getElementById('weekly-plan')?.value||'';
    if(!from||!to)return alert('Укажи отчетный период');
    const logic=window.ATOM_LOGIC;
    const entry={id:`${from}_${to}`,from,to,done,plan,savedAt:new Date().toISOString(),metrics:logic?{progress:logic.projectProgress(),sources:logic.sourcesSummary(),owners:logic.ownersSummary(),dictionary:logic.dictionarySummary(),blockers:logic.activeBlockers().length}:null};
    const list=read(ARCHIVE_KEY,[]);const i=list.findIndex(x=>x.id===entry.id);if(i>=0)list[i]=entry;else list.unshift(entry);localStorage.setItem(ARCHIVE_KEY,JSON.stringify(list.slice(0,104)));renderArchive(true);
  }

  function renderArchive(forceOpen=false){
    const host=document.getElementById('weekly-archive');if(!host)return;
    if(forceOpen)host.open=true;
    const list=read(ARCHIVE_KEY,[]);
    const body=host.querySelector('.weekly-archive-body');if(!body)return;
    body.innerHTML=list.length?list.map(x=>`<div style="display:grid;grid-template-columns:150px 90px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)"><b>${fmt(x.from)} - ${fmt(x.to)}</b><span>${x.metrics?x.metrics.progress+'%':'-'}</span><span style="font-size:11px;color:var(--muted)">${esc((x.done||'').split('\n')[0]||'Без описания')}</span><button class="btn weekly-archive-open" data-id="${esc(x.id)}">Открыть</button></div>`).join(''):'<div style="padding:10px 0;color:var(--muted);font-size:12px">Сохраненных недель пока нет.</div>';
  }

  function inject(){
    const toolbar=document.querySelector('.weekly-toolbar');if(!toolbar||document.getElementById('weekly-history-tools'))return;
    const tools=document.createElement('div');tools.id='weekly-history-tools';tools.style.display='flex';tools.style.gap='8px';tools.style.flexWrap='wrap';tools.innerHTML='<button class="btn" id="weekly-auto-draft">Сформировать из проекта</button><button class="btn" id="weekly-save-snapshot">Сохранить неделю</button>';
    toolbar.appendChild(tools);
    const wrap=document.querySelector('.weekly-page-wrap');if(wrap){const details=document.createElement('details');details.id='weekly-archive';details.style.marginTop='12px';details.innerHTML='<summary style="cursor:pointer;font-weight:700">Архив еженедельных отчетов</summary><div class="weekly-archive-body" style="margin-top:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:4px 12px"></div>';wrap.appendChild(details);renderArchive();}
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#weekly-auto-draft')){buildDraft();return;}
    if(e.target.closest('#weekly-save-snapshot')){saveSnapshot();return;}
    const open=e.target.closest('.weekly-archive-open');if(open){const item=read(ARCHIVE_KEY,[]).find(x=>x.id===open.dataset.id);if(!item)return;['from','to','done','plan'].forEach(k=>{const el=document.getElementById('weekly-'+k);if(el){el.value=item[k]||'';el.dispatchEvent(new Event('input',{bubbles:true}));}});window.scrollTo({top:0,behavior:'smooth'});}
  });
  const app=document.getElementById('app');if(app)new MutationObserver(()=>requestAnimationFrame(inject)).observe(app,{childList:true,subtree:true});
  inject();window.ATOM_WEEKLY_HISTORY={buildDraft,saveSnapshot};
})();