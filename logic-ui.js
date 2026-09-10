(function(){
  const DAY=86400000;
  const NAV_MAP={overview:'Обзор',gantt:'Диаграмма Ганта',roadmap:'Этапы проекта',teams:'Команды и RACI',sources:'Источники данных',funnel:'Сквозной путь',dictionary:'Data Dictionary',issues:'Блокеры',dod:'Definition of Done'};
  const EXTRA_MAP={'faq-nav':'faq','directories-nav':'directories','weekly-report-nav':'weekly','security-nav':'security'};
  let restoring=false;

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function todayStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();}
  function fmt(ts){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit'}).format(new Date(ts));}

  function routeName(btn){
    if(btn?.dataset?.view)return btn.dataset.view;
    return EXTRA_MAP[btn?.id]||'';
  }

  function setHash(route){
    if(!route||restoring)return;
    const next='#'+route;
    if(location.hash!==next)history.replaceState(null,'',next);
  }

  function openRoute(route){
    const staticBtn=document.querySelector(`.nav[data-view="${route}"]`);
    if(staticBtn){staticBtn.click();return true;}
    const id=Object.keys(EXTRA_MAP).find(k=>EXTRA_MAP[k]===route);
    const extra=id?document.getElementById(id):null;
    if(extra){extra.click();return true;}
    return false;
  }

  function restoreHash(){
    const route=(location.hash||'#overview').slice(1);
    if(route==='overview')return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(openRoute(route)||tries>30)clearInterval(timer);
    },150);
  }

  function patchOverview(){
    if(!document.querySelector('#app .project-start-card')||!window.ATOM_LOGIC)return;
    const logic=window.ATOM_LOGIC;
    const cards=[...document.querySelectorAll('#app .card.kpi')];
    const map={
      'Готовность проекта':{value:`${logic.projectProgress()}%`,route:'roadmap'},
      'Источники готовы':(()=>{const x=logic.sourcesSummary();return{value:`${x.ready} / ${x.total}`,route:'sources'}})(),
      'Владельцы назначены':(()=>{const x=logic.ownersSummary();return{value:`${x.ready} / ${x.total}`,route:'teams'}})(),
      'Критические блокеры':{value:String(logic.activeBlockers().filter(x=>x.severity==='Критическая').length),route:'issues'},
      'Data Dictionary':(()=>{const x=logic.dictionarySummary();return{value:`${x.ready} / ${x.total}`,route:'dictionary'}})(),
      'Definition of Done':(()=>{const d=logic.dodEvaluation();return{value:`${d.filter(x=>x.ok).length} / ${d.length}`,route:'dod'}})()
    };
    cards.forEach(card=>{
      const label=card.querySelector('.label')?.textContent.trim();
      const cfg=map[label];if(!cfg)return;
      const value=card.querySelector('.value');if(value)value.textContent=cfg.value;
      card.dataset.logicRoute=cfg.route;
      card.style.cursor='pointer';
      card.title=`Открыть: ${NAV_MAP[cfg.route]||cfg.route}`;
    });
    patchToday();
  }

  function patchToday(){
    const block=document.querySelector('[data-overview-today]');
    if(!block||!window.ATOM_GANTT)return;
    const startRaw=localStorage.getItem('atom-project-started-at');
    if(!startRaw){
      block.innerHTML='<div><div style="font-size:12px;color:#66797a;margin-bottom:4px">Из диаграммы Ганта</div><h3 style="margin:0;font-size:18px">Сегодня в работе</h3></div><div style="margin-top:10px;color:#66797a;font-size:13px">После старта проекта здесь появятся этапы из актуальной недельной сетки Ганта.</div>';
      return;
    }
    const now=todayStart();
    const states=window.ATOM_GANTT.getAllStates().filter(s=>{
      const from=new Date(s.startDate);const fs=new Date(from.getFullYear(),from.getMonth(),from.getDate()).getTime();
      const due=new Date(s.due);const ds=new Date(due.getFullYear(),due.getMonth(),due.getDate()).getTime();
      return now>=fs&&now<=ds&&s.status!=='Завершено';
    });
    const start=Number(startRaw);const day=Math.floor((now-new Date(new Date(start).getFullYear(),new Date(start).getMonth(),new Date(start).getDate()).getTime())/DAY)+1;
    block.innerHTML=`<div style="display:flex;justify-content:space-between;gap:16px;align-items:center"><div><div style="font-size:12px;color:#66797a;margin-bottom:4px">Из актуального Ганта</div><h3 style="margin:0;font-size:18px">Сегодня в работе</h3></div><div style="font-size:12px;color:#66797a">День ${Math.max(1,day)} из 91</div></div>${states.length?`<div style="display:grid;gap:8px;margin-top:10px">${states.map(s=>`<div style="display:grid;grid-template-columns:minmax(220px,1fr) 150px 90px;gap:12px;align-items:center;padding:10px 12px;border:1px solid #dbe5e5;border-radius:10px;background:#fff"><div><b>${esc(s.name)}</b><div style="font-size:11px;color:#66797a;margin-top:3px">${fmt(s.startDate)} - ${fmt(s.due)}</div></div><div style="font-size:12px">${esc(s.status)}</div><div style="font-size:13px;font-weight:700;text-align:right">${window.ATOM_LOGIC.stageProgress(s.id)}%</div></div>`).join('')}</div>`:'<div style="margin-top:10px;color:#66797a;font-size:13px">На сегодня по актуальному Ганту активных этапов нет.</div>'}`;
  }

  function patchDod(){
    const title=[...document.querySelectorAll('#app .section-title h2')].find(x=>x.textContent.trim()==='Definition of Done');
    if(!title||!window.ATOM_LOGIC)return;
    const checklist=document.querySelector('#app .checklist');
    if(!checklist||checklist.dataset.autoDod==='1')return;
    const evals=window.ATOM_LOGIC.dodEvaluation();
    const names=(typeof DATA!=='undefined'&&Array.isArray(DATA?.dod))?DATA.dod:[];
    checklist.dataset.autoDod='1';
    checklist.innerHTML=evals.map((x,i)=>`<div class="check" style="display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:flex-start"><span style="width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:${x.ok?'#e5f7ef':'#eef2f2'};color:${x.ok?'#227457':'#7b8d8e'};font-weight:700">${x.ok?'✓':'·'}</span><span><b>${i+1}. ${esc(names[i]||'Условие')}</b><small style="display:block;color:#66797a;margin-top:3px">${esc(x.detail)}</small></span></div>`).join('');
    const call=document.createElement('div');call.className='callout';call.innerHTML='<b>Автоматический контроль.</b> Эти пункты больше не отмечаются вручную. Они закрываются по фактическим статусам связанных разделов проекта.';
    checklist.insertAdjacentElement('beforebegin',call);
  }

  function syncRaciBlockers(){
    const raw=localStorage.getItem('atom-raci-requirement-state-v2');
    if(!raw)return;
    let state={};try{state=JSON.parse(raw)||{}}catch{return;}
    let blockers=[];try{blockers=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{}
    const today=new Date().toISOString().slice(0,10);
    let changed=false;
    Object.entries(state).forEach(([team,items])=>Object.entries(items||{}).forEach(([id,s])=>{
      const key=`RACI:${team}:${id}`;
      const overdue=s.dueDate&&s.dueDate<today&&!['Ответ получен','Готово'].includes(s.status);
      const existing=blockers.find(x=>x.autoKey===key);
      if(overdue&&!existing){
        blockers.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${team}`,description:`Просрочен срок ответа по пункту ${id}`,severity:'Высокая',owner:s.respondent||'Не назначен',due:s.dueDate,status:'Открыт',comment:'Создан автоматически из подробной страницы команды',createdAt:new Date().toISOString()});changed=true;
      }else if(!overdue&&existing&&!['Решен','Закрыт'].includes(existing.status)){
        existing.status='Решен';existing.comment=(existing.comment?existing.comment+'\n':'')+'Закрыт автоматически после получения ответа или изменения срока.';changed=true;
      }
    }));
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(blockers));
  }

  function patchCurrent(){
    patchOverview();patchDod();syncRaciBlockers();
    window.ATOM_LOGIC?.patch?.();
  }

  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav');if(nav)setTimeout(()=>setHash(routeName(nav)),0);
    const card=e.target.closest('[data-logic-route]');if(card){openRoute(card.dataset.logicRoute);setHash(card.dataset.logicRoute);}
  },true);

  window.addEventListener('hashchange',()=>{if(!restoring)openRoute(location.hash.slice(1));});
  window.addEventListener('atom-sync-update',()=>setTimeout(patchCurrent,50));
  const mo=new MutationObserver(()=>requestAnimationFrame(patchCurrent));
  mo.observe(document.getElementById('app'),{childList:true,subtree:true});
  setInterval(syncRaciBlockers,30000);
  setTimeout(()=>{restoreHash();patchCurrent();},700);
  window.ATOM_LOGIC_UI={openRoute,patchCurrent};
})();