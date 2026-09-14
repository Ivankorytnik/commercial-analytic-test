(function(){
  const VERSION='1.0.0';
  let busy=false;
  const core=()=>window.ATOM_CORE;
  const pad=n=>String(n).padStart(2,'0');
  const meta=id=>{try{return JSON.parse(localStorage.getItem(`atom-core-requirement-meta-${id}`)||'null')}catch{return null}};
  const isNotActual=id=>core()?.isRequirementNotActual?.(id)||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const isActiveTeam=team=>window.ATOM_TEAM_ACTIVITY?.isActive?window.ATOM_TEAM_ACTIVITY.isActive(team):true;

  function fmtDateTime(value){
    if(!value)return'Не задано';
    const d=new Date(String(value).includes('T')?value:`${value}T00:00`);
    if(!Number.isFinite(d.getTime()))return String(value);
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function remaining(endTs){
    if(!Number.isFinite(endTs))return'<span class="req-enh-due na">Нет срока</span>';
    let ms=endTs-Date.now(),past=ms<0;ms=Math.abs(ms);
    const days=Math.floor(ms/86400000);ms-=days*86400000;
    const hours=Math.floor(ms/3600000);ms-=hours*3600000;
    const mins=Math.floor(ms/60000);
    const parts=[];
    if(days)parts.push(`${days} дн.`);
    if(hours||days)parts.push(`${hours} ч.`);
    if(!days&&mins)parts.push(`${mins} мин.`);
    if(!parts.length)parts.push('< 1 мин.');
    return `<span class="req-enh-due ${past?'overdue':''}">${past?'Просрочено ':'Осталось '}${parts.join(' ')}</span>`;
  }

  function ensureEnhancedRequirements(){
    if(!location.hash.startsWith('#management/requirements'))return false;
    const host=document.getElementById('pa-panel');
    if(!host)return false;
    if(!document.getElementById('req-enhanced-root')&&window.ATOM_REQUIREMENTS_ENHANCED?.render){
      window.ATOM_REQUIREMENTS_ENHANCED.render();
    }
    return Boolean(document.getElementById('req-enhanced-root'));
  }

  function ensureDateTimeControls(){
    const start=document.getElementById('req-enh-new-start');
    const end=document.getElementById('req-enh-new-end');
    if(!start||!end)return;
    const oldStart=start.value||'';
    const oldEnd=end.value||'';
    if(start.type!=='datetime-local')start.type='datetime-local';
    if(end.type!=='datetime-local')end.type='datetime-local';
    start.step='60';end.step='60';
    if(oldStart&&!start.value)start.value=oldStart.includes('T')?oldStart.slice(0,16):`${oldStart}T00:00`;
    else if(oldStart&&!oldStart.includes('T'))start.value=`${oldStart}T00:00`;
    if(oldEnd&&!end.value)end.value=oldEnd.includes('T')?oldEnd.slice(0,16):`${oldEnd}T23:59`;
    else if(oldEnd&&!oldEnd.includes('T'))end.value=`${oldEnd}T23:59`;
    const sl=start.closest('.pa-field')?.querySelector('label');
    const el=end.closest('.pa-field')?.querySelector('label');
    if(sl)sl.textContent='Начало: дата и время';
    if(el)el.textContent='Окончание: дата и время';
  }

  function ensureAllFilter(){
    const select=document.getElementById('req-enh-team');
    if(!select)return;
    if(![...select.options].some(o=>o.value==='__all__')){
      const o=document.createElement('option');o.value='__all__';o.textContent='Все';select.insertBefore(o,select.firstChild);
    }
  }

  function patchRows(){
    const c=core(),table=document.querySelector('.req-enh-table');
    if(!c||!table)return;
    const headers=table.querySelectorAll('thead th');
    if(headers[5])headers[5].textContent='До закрытия';
    const body=table.querySelector('tbody');if(!body)return;
    const rows=[...body.querySelectorAll('tr[data-req-enh-row]')];
    rows.forEach(row=>{
      const id=row.dataset.reqEnhRow,req=c.requirement?.(id);if(!req)return;
      const p=c.periodForRequirement?.(req),st=c.getState?.(id),m=meta(id)||{};
      let endTs=Number(p?.end);
      if(m.customEndAt){endTs=new Date(m.customEndAt).getTime();}
      else if(!Number.isFinite(endTs)&&p?.endDate){endTs=new Date(`${p.endDate}T23:59:00`).getTime();}
      row.dataset.reqEndTs=String(Number.isFinite(endTs)?endTs:Number.MAX_SAFE_INTEGER);
      if(m.customStartAt&&m.customEndAt){
        const cells=row.children;
        if(cells[3])cells[3].innerHTML=`${fmtDateTime(m.customStartAt)} - ${fmtDateTime(m.customEndAt)}<br><span class="pa-note">индивидуальный срок</span>`;
        if(cells[4])cells[4].innerHTML=`<b>${fmtDateTime(m.customEndAt)}</b>`;
        if(cells[5]){
          if(isNotActual(id))cells[5].innerHTML='<span class="req-enh-due na">Не учитывается</span>';
          else if(st?.statusId==='done')cells[5].innerHTML='<span class="req-enh-due done">Готово</span>';
          else cells[5].innerHTML=remaining(endTs);
        }
        const overdue=!isNotActual(id)&&isActiveTeam(req.team)&&st?.statusId!=='done'&&Number.isFinite(endTs)&&Date.now()>endTs;
        row.classList.toggle('req-enh-overdue',overdue);
      }
    });
    const sorted=rows.slice().sort((a,b)=>Number(a.dataset.reqEndTs)-Number(b.dataset.reqEndTs));
    if(sorted.some((r,i)=>r!==rows[i]))sorted.forEach(r=>body.appendChild(r));
  }

  function ensureDirectories(){
    if(location.hash.startsWith('#management/directories'))window.ATOM_REFERENCE_DIRECTORY_EDITOR?.patch?.();
  }

  function ensureTeams(){
    if(location.hash.startsWith('#management/teams'))window.ATOM_TEAM_ACTIVITY_UI?.patch?.();
  }

  function patch(){
    if(busy)return;busy=true;
    requestAnimationFrame(()=>{
      try{
        if(ensureEnhancedRequirements()){
          ensureAllFilter();
          ensureDateTimeControls();
          patchRows();
        }
        ensureDirectories();
        ensureTeams();
        window.ATOM_TEAM_ACTIVITY_FIX?.patch?.();
      }finally{busy=false;}
    });
  }

  const observer=new MutationObserver(patch);observer.observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-team-activity-changed','atom-reference-data-changed'].forEach(ev=>window.addEventListener(ev,patch));
  window.ATOM_REQUIREMENTS_VISIBILITY_FIX={version:VERSION,patch};
  setTimeout(patch,200);setTimeout(patch,800);setTimeout(patch,1600);setTimeout(patch,3000);
})();