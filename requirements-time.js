(function(){
  const VERSION='1.2.1';
  const META_PREFIX='atom-core-requirement-meta-';
  const BLOCKERS_KEY='atom-blockers';
  let patchedCore=false;
  let queued=false;
  const original={};

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const meta=id=>read(`${META_PREFIX}${id}`,null);
  const isNotActual=id=>core()?.isRequirementNotActual?.(id)||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const isActiveTeam=team=>activity()?.isActive?activity().isActive(team):true;
  const pad=n=>String(n).padStart(2,'0');
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const interactiveSelector='[data-req-enh-status],select[data-pa-req-status],[data-req-enh-person],select[data-pa-req-person],#req-enh-team,#pa-req-team,[data-req-enh-stage],select[data-pa-req-stage]';
  const editingSelect=()=>{const el=document.activeElement;return Boolean(el?.matches?.(interactiveSelector));};
  const setHtml=(el,html)=>{if(el&&el.innerHTML!==html)el.innerHTML=html;};

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
    if(!req)return null;
    const m=meta(req.id)||{};
    const startAt=m.customStartAt||'';
    const endAt=m.customEndAt||'';
    if(!startAt||!endAt)return null;
    const start=parseLocal(startAt),end=parseLocal(endAt,true);
    if(!Number.isFinite(start)||!Number.isFinite(end))return null;
    return {start,end,startDate:startAt.slice(0,10),endDate:endAt.slice(0,10),startAt,endAt,stageId:req.stageId,stageName:core().stageName(req.stageId),changed:true,customDates:true,customTimes:true,periodOverride:true};
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
    reqs.filter(r=>meta(r.id)?.customEndAt).forEach(req=>{
      const key=`CORE:RACI:${req.id}`,st=c.getState(req.id),p=c.periodForRequirement(req),problem=requirementProblem(req),existing=rows.find(x=>x.autoKey===key),owner=c.personName(st.respondentId)||c.teamOwner(req.team),deadline=p?.endAt||'';
      if(problem&&!existing){
        rows.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${req.team}`,description:`${req.text}. Плановый срок: ${fmtDateTime(deadline)}`,severity:'Высокая',owner,due:p?.endDate||'',status:'Открыт',comment:`Индивидуальный срок. Этап Ганта: ${p?.stageId||req.stageId}. ${p?.stageName||c.stageName(req.stageId)}`,createdAt:new Date().toISOString()});changed=true;
      }else if(problem&&existing){
        const desc=`${req.text}. Плановый срок: ${fmtDateTime(deadline)}`;
        if(existing.due!==(p?.endDate||'')||existing.owner!==owner||existing.description!==desc){existing.due=p?.endDate||'';existing.owner=owner;existing.description=desc;changed=true;}
        if(!existing.statusManual&&['Решен','Закрыт'].includes(existing.status)){existing.status='Открыт';changed=true;}
      }else if(!problem&&existing&&!existing.statusManual&&!['Решен','Закрыт'].includes(existing.status)){
        existing.status='Решен';const note='Закрыт автоматически: индивидуальный срок еще не истек или требование завершено.';if(!String(existing.comment||'').includes(note))existing.comment=(existing.comment?existing.comment+'\n':'')+note;changed=true;
      }
    });
    if(changed)write(BLOCKERS_KEY,rows);
    return changed;
  }

  function patchCore(){
    const c=core();
    if(!c)return false;
    if(patchedCore)return true;
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
    const stage=Number(document.getElementById('req-enh-new-stage')?.value||1),p=original.periodForRequirement?original.periodForRequirement({id:'__new-time__',stageId:stage,custom:false}):null;
    let start='',end='';
    if(p?.start&&Number.isFinite(Number(p.start)))start=localInput(p.start,false);else start=localFromDate(p?.startDate,false);
    if(p?.end&&Number.isFinite(Number(p.end)))end=localInput(p.end,true);else end=localFromDate(p?.endDate,true);
    return{start,end};
  }

  function patchForm(){
    if(!location.hash.startsWith('#management/requirements')||editingSelect())return;
    const start=document.getElementById('req-enh-new-start'),end=document.getElementById('req-enh-new-end');if(!start||!end)return;
    if(start.type!=='datetime-local'){
      const d=stageDefaults();
      start.type='datetime-local';end.type='datetime-local';start.step='60';end.step='60';
      start.value=d.start;end.value=d.end;
      const sl=start.closest('.pa-field')?.querySelector('label'),el=end.closest('.pa-field')?.querySelector('label');
      if(sl)sl.textContent='Начало: дата и время';if(el)el.textContent='Окончание: дата и время';
    }
  }

  function periodMarkup(req,p){
    const exact=Boolean(p?.customTimes);
    const startAt=exact?p.startAt:localFromDate(p?.startDate,false);
    const endAt=exact?p.endAt:localFromDate(p?.endDate,true);
    return `<div class="req-period-view"><b>${fmtDateTime(startAt)} - ${fmtDateTime(endAt)}</b><br><span class="pa-note">${exact?'индивидуальный срок':'период этапа Ганта'}</span><br><button type="button" class="btn req-period-edit" data-id="${esc(req.id)}" style="margin-top:5px;padding:4px 7px;font-size:9px">Изменить</button>${exact?` <button type="button" class="btn req-period-reset" data-id="${esc(req.id)}" style="margin-top:5px;padding:4px 7px;font-size:9px">По Ганту</button>`:''}</div>`;
  }

  function editMarkup(req,p){
    const start=customPeriod(req)?.startAt||localFromDate(p?.startDate,false);
    const end=customPeriod(req)?.endAt||localFromDate(p?.endDate,true);
    return `<div class="req-period-editor" data-id="${esc(req.id)}"><label class="pa-note">Начало</label><input type="datetime-local" class="req-period-start" step="60" value="${esc(start)}" style="width:100%;box-sizing:border-box;margin:3px 0 5px"><label class="pa-note">Окончание</label><input type="datetime-local" class="req-period-end" step="60" value="${esc(end)}" style="width:100%;box-sizing:border-box;margin:3px 0 6px"><div style="display:flex;gap:5px;flex-wrap:wrap"><button type="button" class="btn primary req-period-save" data-id="${esc(req.id)}" style="padding:4px 7px;font-size:9px">Сохранить</button><button type="button" class="btn req-period-cancel" data-id="${esc(req.id)}" style="padding:4px 7px;font-size:9px">Отмена</button></div></div>`;
  }

  function patchRows(){
    const c=core();if(!c||!location.hash.startsWith('#management/requirements')||editingSelect())return;

    const enhanced=document.querySelector('.req-enh-table');
    if(enhanced){
      const th=enhanced.querySelectorAll('thead th');if(th[5]&&th[5].textContent!=='До закрытия')th[5].textContent='До закрытия';
      const body=enhanced.querySelector('tbody'),rows=[...body.querySelectorAll('tr[data-req-enh-row]')];
      rows.forEach(row=>{
        const id=row.dataset.reqEnhRow,req=c.requirement(id);if(!req)return;
        const p=c.periodForRequirement(req),st=c.getState(id),na=isNotActual(id),inactive=!isActiveTeam(req.team),exact=Boolean(p?.customTimes);
        const cells=row.children;
        if(cells[3]&&!cells[3].querySelector('.req-period-editor'))setHtml(cells[3],periodMarkup(req,p));
        if(cells[4])setHtml(cells[4],`<b>${fmtDateTime(exact?p.endAt:localFromDate(p?.endDate,true))}</b>`);
        if(cells[5])setHtml(cells[5],na?'<span class="req-enh-due na">Не учитывается</span>':st.statusId==='done'?'<span class="req-enh-due done">Готово</span>':preciseRemaining(Number(p?.end)));
        const overdue=!na&&!inactive&&st.statusId!=='done'&&Number.isFinite(Number(p?.end))&&Date.now()>Number(p.end);
        row.classList.toggle('req-enh-overdue',overdue);
        row.dataset.reqEndTs=String(Number.isFinite(Number(p?.end))?Number(p.end):Number.MAX_SAFE_INTEGER);
      });
      const ordered=rows.slice().sort((a,b)=>Number(a.dataset.reqEndTs)-Number(b.dataset.reqEndTs));
      if(ordered.some((r,i)=>r!==rows[i]))ordered.forEach(r=>body.appendChild(r));
    }

    document.querySelectorAll('#pa-panel tr[data-pa-req]').forEach(row=>{
      const id=row.dataset.paReq,req=c.requirement(id);if(!req)return;
      const cell=row.children[2];if(!cell||cell.querySelector('.req-period-editor'))return;
      const p=c.periodForRequirement(req);
      setHtml(cell,periodMarkup(req,p));
    });
  }

  function saveTimes(id,startAt,endAt){
    const c=core(),req=c?.requirement?.(id);if(!req)return false;
    const key=`${META_PREFIX}${id}`,m=meta(id)||{};
    m.stageId=Number(m.stageId||req.stageId||1);
    m.customStartAt=startAt;m.customEndAt=endAt;
    m.customStartDate=startAt.slice(0,10);m.customEndDate=endAt.slice(0,10);
    m.periodOverride=true;
    write(key,m);
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-datetime',id,startAt,endAt}}));
    return true;
  }

  function resetTimes(id){
    const c=core(),req=c?.requirement?.(id);if(!req)return false;
    const key=`${META_PREFIX}${id}`,m=meta(id)||{};
    delete m.customStartAt;delete m.customEndAt;delete m.customStartDate;delete m.customEndDate;delete m.periodOverride;
    write(key,m);
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-datetime-reset',id}}));
    return true;
  }

  function rerenderAfterPeriodChange(){
    const c=core();c?.reconcile?.();
    try{window.ATOM_REQUIREMENTS_ENHANCED?.render?.();}catch{}
    try{window.ATOM_REQUIREMENTS_ALL_TEAM_FILTER?.patch?.();}catch{}
    setTimeout(()=>{patchForm();patchRows();},0);
  }

  document.addEventListener('change',e=>{
    const stage=e.target.closest('#req-enh-new-stage');if(!stage)return;
    e.preventDefault();e.stopImmediatePropagation();
    const d=stageDefaults(),start=document.getElementById('req-enh-new-start'),end=document.getElementById('req-enh-new-end');if(start)start.value=d.start;if(end)end.value=d.end;
  },true);

  document.addEventListener('click',e=>{
    const add=e.target.closest('#req-enh-add');
    if(add){
      e.preventDefault();e.stopImmediatePropagation();
      const c=core(),text=document.getElementById('req-enh-new-text')?.value.trim(),team=document.getElementById('req-enh-new-team')?.value,stage=Number(document.getElementById('req-enh-new-stage')?.value||1),startAt=document.getElementById('req-enh-new-start')?.value||'',endAt=document.getElementById('req-enh-new-end')?.value||'';
      if(!text)return alert('Укажите, что нужно получить');
      if(!team)return alert('Выберите команду');
      if(!startAt||!endAt)return alert('Укажите дату и время начала и окончания');
      const startTs=parseLocal(startAt),endTs=parseLocal(endAt,true);if(!Number.isFinite(startTs)||!Number.isFinite(endTs))return alert('Проверьте дату и время');
      if(endTs<=startTs)return alert('Окончание должно быть позже начала');
      const req=c.addRequirement(team,text,stage);if(!req)return;
      saveTimes(req.id,startAt,endAt);rerenderAfterPeriodChange();
      return;
    }

    const edit=e.target.closest('.req-period-edit');
    if(edit){
      const c=core(),id=edit.dataset.id,req=c?.requirement?.(id);if(!req)return;
      const row=edit.closest('tr'),cell=row?.querySelector('.req-period-view')?.parentElement;if(!cell)return;
      cell.innerHTML=editMarkup(req,c.periodForRequirement(req));
      return;
    }

    const cancel=e.target.closest('.req-period-cancel');
    if(cancel){patchRows();return;}

    const save=e.target.closest('.req-period-save');
    if(save){
      const id=save.dataset.id,editor=save.closest('.req-period-editor');
      const startAt=editor?.querySelector('.req-period-start')?.value||'',endAt=editor?.querySelector('.req-period-end')?.value||'';
      if(!startAt||!endAt)return alert('Укажите дату и время начала и окончания');
      const startTs=parseLocal(startAt),endTs=parseLocal(endAt,true);
      if(!Number.isFinite(startTs)||!Number.isFinite(endTs))return alert('Проверьте дату и время');
      if(endTs<=startTs)return alert('Окончание должно быть позже начала');
      if(saveTimes(id,startAt,endAt))rerenderAfterPeriodChange();
      return;
    }

    const reset=e.target.closest('.req-period-reset');
    if(reset&&confirm('Вернуть период требования к сроку этапа Ганта?')){resetTimes(reset.dataset.id);rerenderAfterPeriodChange();}
  },true);

  function patch(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      if(!patchCore())return;
      if(editingSelect())return;
      patchForm();patchRows();
    });
  }

  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,patch));
  document.addEventListener('focusout',e=>{if(e.target?.matches?.(interactiveSelector))setTimeout(patch,80);},true);
  window.ATOM_REQUIREMENTS_TIME={version:VERSION,patch,saveTimes,resetTimes,customPeriod};
  setTimeout(patch,300);
  setTimeout(patch,800);
  setTimeout(patch,1600);
  setTimeout(patch,3000);
})();