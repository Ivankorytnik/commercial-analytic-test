(function(){
  const VERSION='1.0.0';
  const META_PREFIX='atom-core-requirement-meta-';
  const BLOCKERS_KEY='atom-blockers';
  let patchedCore=false;
  const original={};

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const meta=id=>read(`${META_PREFIX}${id}`,null);
  const isNotActual=id=>core()?.isRequirementNotActual?.(id)||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const isActiveTeam=team=>activity()?.isActive?activity().isActive(team):true;
  const pad=n=>String(n).padStart(2,'0');

  function parseLocal(value,endOfDay=false){
    if(!value)return NaN;
    const raw=String(value);
    const normalized=raw.includes('T')?raw:`${raw}T${endOfDay?'23:59':'00:00'}`;
    const d=new Date(normalized);
    return d.getTime();
  }
  function localInput(ts,endOfDay=false){
    const d=new Date(Number(ts));
    if(!Number.isFinite(d.getTime()))return'';
    if(endOfDay&&d.getHours()===0&&d.getMinutes()===0)d.setHours(23,59,0,0);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localFromDate(dateValue,end=false){
    if(!dateValue)return'';
    if(String(dateValue).includes('T'))return String(dateValue).slice(0,16);
    return `${dateValue}T${end?'23:59':'00:00'}`;
  }
  function fmtDateTime(value){
    if(!value)return'Не задано';
    const d=new Date(String(value).includes('T')?value:`${value}T00:00`);
    if(!Number.isFinite(d.getTime()))return String(value);
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function preciseRemaining(endTs){
    if(!Number.isFinite(endTs))return'<span class="req-enh-due na">Нет срока</span>';
    let ms=endTs-Date.now(),past=ms<0;ms=Math.abs(ms);
    const days=Math.floor(ms/86400000);ms-=days*86400000;
    const hours=Math.floor(ms/3600000);ms-=hours*3600000;
    const mins=Math.max(0,Math.floor(ms/60000));
    const parts=[];
    if(days)parts.push(`${days} дн.`);
    if(hours||days)parts.push(`${hours} ч.`);
    if(!days&&mins)parts.push(`${mins} мин.`);
    if(!parts.length)parts.push('< 1 мин.');
    return `<span class="req-enh-due ${past?'overdue':''}">${past?'Просрочено ':'Осталось '}${parts.join(' ')}</span>`;
  }

  function customPeriod(req){
    if(!req?.custom)return null;
    const m=meta(req.id)||{};
    const startAt=m.customStartAt||'';
    const endAt=m.customEndAt||'';
    if(!startAt||!endAt)return null;
    const start=parseLocal(startAt),end=parseLocal(endAt,true);
    if(!Number.isFinite(start)||!Number.isFinite(end))return null;
    return {start,end,startDate:startAt.slice(0,10),endDate:endAt.slice(0,10),startAt,endAt,stageId:req.stageId,stageName:core().stageName(req.stageId),changed:true,customDates:true,customTimes:true};
  }

  function requirementOverdue(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;
    if(!req||isNotActual(req.id)||!isActiveTeam(req.team))return false;
    const st=c.getState(req.id);if(['answered','done'].includes(st.statusId))return false;
    const cp=customPeriod(req);if(cp)return Date.now()>cp.end;
    return original.requirementOverdue?original.requirementOverdue(reqOrId):false;
  }
  function requirementProblem(reqOrId){
    const c=core(),req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;
    if(!req||isNotActual(req.id)||!isActiveTeam(req.team))return false;
    if(c.getState(req.id).statusId==='blocker')return true;
    return requirementOverdue(req);
  }
  function teamSummary(team){
    const c=core(),base=original.teamSummary?original.teamSummary(team):{};
    const rows=(c.requirementsByTeam(team)||[]).filter(r=>!isNotActual(r.id));
    return {...base,problem:rows.filter(r=>requirementProblem(r)).length};
  }
  function linkedSummary(stageId){
    const c=core(),rows=(c.requirementsByStage(stageId)||[]).filter(r=>!isNotActual(r.id));
    if(!rows.length)return original.linkedSummary?original.linkedSummary(stageId):{total:0,progress:0,problem:false,done:0};
    return {total:rows.length,progress:Math.round(rows.reduce((n,r)=>n+c.requirementProgress(r.id),0)/rows.length),problem:rows.some(r=>requirementProblem(r)),done:rows.filter(r=>c.getState(r.id).statusId==='done').length};
  }
  function stageSummary(stageId){
    const c=core(),base=original.stageSummary?original.stageSummary(stageId):null;
    if(!base)return base;
    const linked=linkedSummary(stageId),problem=Boolean(base.problem||linked.problem);
    if(base.progress>=100)return {...base,linked,problem:false,status:'Завершено'};
    return {...base,linked,problem,status:problem?'Блокер':base.status};
  }

  function reconcileExactBlockers(){
    const c=core();if(!c)return false;
    const rows=read(BLOCKERS_KEY,[]);let changed=false;
    const reqs=[];(c.teams?.()||[]).forEach(t=>(c.requirementsByTeam(t)||[]).forEach(r=>reqs.push(r)));
    reqs.filter(r=>r.custom&&meta(r.id)?.customEndAt).forEach(req=>{
      const key=`CORE:RACI:${req.id}`,st=c.getState(req.id),p=c.periodForRequirement(req),problem=requirementProblem(req),existing=rows.find(x=>x.autoKey===key),owner=c.personName(st.respondentId)||c.teamOwner(req.team),deadline=p?.endAt||'';
      if(problem&&!existing){
        rows.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${req.team}`,description:`${req.text}. Плановый срок: ${fmtDateTime(deadline)}`,severity:'Высокая',owner,due:p?.endDate||'',status:'Открыт',comment:`Индивидуальный срок. Этап Ганта: ${p?.stageId||req.stageId}. ${p?.stageName||c.stageName(req.stageId)}`,createdAt:new Date().toISOString()});changed=true;
      }else if(problem&&existing){
        const desc=`${req.text}. Плановый срок: ${fmtDateTime(deadline)}`;
        if(existing.due!==(p?.endDate||'')||existing.owner!==owner||existing.description!==desc){existing.due=p?.endDate||'';existing.owner=owner;existing.description=desc;changed=true;}
        if(['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}
      }else if(!problem&&existing&&!['Решен','Закрыт'].includes(existing.status)){
        existing.status='Решен';const note='Закрыт автоматически: индивидуальный срок еще не истек или требование завершено.';if(!String(existing.comment||'').includes(note))existing.comment=(existing.comment?existing.comment+'\n':'')+note;changed=true;
      }
    });
    if(changed)write(BLOCKERS_KEY,rows);
    return changed;
  }

  function patchCore(){
    const c=core();if(patchedCore||!c)return false;
    ['periodForRequirement','requirementOverdue','requirementProblem','teamSummary','linkedSummary','stageSummary','reconcile'].forEach(k=>original[k]=c[k]?.bind(c));
    if(!original.periodForRequirement||!original.reconcile)return false;
    c.periodForRequirement=function(reqOrId){const req=typeof reqOrId==='string'?c.requirement(reqOrId):reqOrId;return customPeriod(req)||original.periodForRequirement(reqOrId)};
    c.requirementOverdue=requirementOverdue;
    c.requirementProblem=requirementProblem;
    c.teamSummary=teamSummary;
    c.linkedSummary=linkedSummary;
    c.stageSummary=stageSummary;
    c.reconcile=function(){const changed=original.reconcile?original.reconcile():false;const exact=reconcileExactBlockers();return changed||exact;};
    patchedCore=true;
    c.reconcile();
    return true;
  }

  function stageDefaults(){
    const c=core(),stage=Number(document.getElementById('req-enh-new-stage')?.value||1),p=original.periodForRequirement?original.periodForRequirement({id:'__new-time__',stageId:stage,custom:false}):null;
    let start='',end='';
    if(p?.start&&Number.isFinite(Number(p.start)))start=localInput(p.start,false);else start=localFromDate(p?.startDate,false);
    if(p?.end&&Number.isFinite(Number(p.end)))end=localInput(p.end,true);else end=localFromDate(p?.endDate,true);
    return{start,end};
  }

  function patchForm(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const start=document.getElementById('req-enh-new-start'),end=document.getElementById('req-enh-new-end');if(!start||!end)return;
    if(start.type!=='datetime-local'){
      const d=stageDefaults();
      start.type='datetime-local';end.type='datetime-local';start.step='60';end.step='60';
      start.value=d.start;end.value=d.end;
      const sl=start.closest('.pa-field')?.querySelector('label'),el=end.closest('.pa-field')?.querySelector('label');
      if(sl)sl.textContent='Начало: дата и время';if(el)el.textContent='Окончание: дата и время';
    }
  }

  function patchRows(){
    const c=core();if(!c||!location.hash.startsWith('#management/requirements'))return;
    const table=document.querySelector('.req-enh-table');if(!table)return;
    const th=table.querySelectorAll('thead th');if(th[5])th[5].textContent='До закрытия';
    const body=table.querySelector('tbody'),rows=[...body.querySelectorAll('tr[data-req-enh-row]')];
    rows.forEach(row=>{
      const id=row.dataset.reqEnhRow,req=c.requirement(id);if(!req)return;
      const p=c.periodForRequirement(req),st=c.getState(id),na=isNotActual(id),inactive=!isActiveTeam(req.team),exact=Boolean(p?.customTimes);
      if(exact){
        const cells=row.children;
        if(cells[3])cells[3].innerHTML=`${fmtDateTime(p.startAt)} - ${fmtDateTime(p.endAt)}<br><span class="pa-note">индивидуальный срок</span>`;
        if(cells[4])cells[4].innerHTML=`<b>${fmtDateTime(p.endAt)}</b>`;
        if(cells[5])cells[5].innerHTML=na?'<span class="req-enh-due na">Не учитывается</span>':st.statusId==='done'?'<span class="req-enh-due done">Готово</span>':preciseRemaining(p.end);
        const overdue=!na&&!inactive&&st.statusId!=='done'&&Date.now()>p.end;
        row.classList.toggle('req-enh-overdue',overdue);
      }
      row.dataset.reqEndTs=String(Number.isFinite(Number(p?.end))?Number(p.end):Number.MAX_SAFE_INTEGER);
    });
    const ordered=rows.slice().sort((a,b)=>Number(a.dataset.reqEndTs)-Number(b.dataset.reqEndTs));
    if(ordered.some((r,i)=>r!==rows[i]))ordered.forEach(r=>body.appendChild(r));
  }

  function saveTimes(id,startAt,endAt){
    const key=`${META_PREFIX}${id}`,m=meta(id);if(!m)return false;
    m.customStartAt=startAt;m.customEndAt=endAt;
    m.customStartDate=startAt.slice(0,10);m.customEndDate=endAt.slice(0,10);
    write(key,m);
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-datetime',id,startAt,endAt}}));
    return true;
  }

  document.addEventListener('change',e=>{
    const stage=e.target.closest('#req-enh-new-stage');if(!stage)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=stageDefaults(),start=document.getElementById('req-enh-new-start'),end=document.getElementById('req-enh-new-end');if(start)start.value=d.start;if(end)end.value=d.end;
  },true);

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#req-enh-add');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    const c=core(),text=document.getElementById('req-enh-new-text')?.value.trim(),team=document.getElementById('req-enh-new-team')?.value,stage=Number(document.getElementById('req-enh-new-stage')?.value||1),startAt=document.getElementById('req-enh-new-start')?.value||'',endAt=document.getElementById('req-enh-new-end')?.value||'';
    if(!text)return alert('Укажите, что нужно получить');
    if(!team)return alert('Выберите команду');
    if(!startAt||!endAt)return alert('Укажите дату и время начала и окончания');
    const startTs=parseLocal(startAt),endTs=parseLocal(endAt,true);if(!Number.isFinite(startTs)||!Number.isFinite(endTs))return alert('Проверьте дату и время');
    if(endTs<=startTs)return alert('Окончание должно быть позже начала');
    const req=c.addRequirement(team,text,stage);if(!req)return;
    saveTimes(req.id,startAt,endAt);c.reconcile();window.ATOM_REQUIREMENTS_ENHANCED?.render?.();setTimeout(()=>{patchForm();patchRows();},0);
  },true);

  let queued=false;
  function patch(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!patchCore())return;patchForm();patchRows();});}
  new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,patch));
  window.ATOM_REQUIREMENTS_TIME={version:VERSION,patch};
  setTimeout(patch,700);setTimeout(patch,1600);
})();