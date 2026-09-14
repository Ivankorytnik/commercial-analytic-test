(function(){
  const VERSION='1.0.0';
  let ganttPatched=false;
  let originalGetTaskState=null;
  let originalGetAllStates=null;
  let originalGantt=null;

  const authority=()=>window.ATOM_REQUIREMENTS_AUTHORITY;
  const ganttApi=()=>window.ATOM_GANTT;
  const core=()=>window.ATOM_CORE;
  const fmt=ts=>new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(Number(ts)));
  const DAY=86400000;
  const sod=ts=>{const d=new Date(Number(ts));return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
  const diffDays=(a,b)=>Math.round((sod(b)-sod(a))/DAY);

  function patchGanttApi(){
    const g=ganttApi(),a=authority();
    if(!g||!a?.stageRange)return false;
    if(ganttPatched)return true;

    originalGetTaskState=g.getTaskState?.bind(g);
    originalGetAllStates=g.getAllStates?.bind(g);
    if(!originalGetTaskState)return false;

    g.getTaskState=function(id){
      const base=originalGetTaskState(id);if(!base)return base;
      const r=a.stageRange(id);if(!r)return base;
      return {...base,startDate:r.start,due:r.end,customDue:null,changed:false,extended:false,shortened:false,deltaDays:0,authority:'requirements',requirementsCount:r.count};
    };
    g.getAllStates=function(){
      const rows=originalGetAllStates?originalGetAllStates():(g.tasks||[]).map(t=>originalGetTaskState(t.id)).filter(Boolean);
      return rows.map(base=>{
        const r=a.stageRange(base.id);return r?{...base,startDate:r.start,due:r.end,customDue:null,changed:false,extended:false,shortened:false,deltaDays:0,authority:'requirements',requirementsCount:r.count}:base;
      });
    };
    g.stageRange=a.stageRange;
    ganttPatched=true;
    return true;
  }

  function transformGantt(html){
    if(typeof html!=='string'||!html.includes('gantt-dashboard'))return html;
    const g=ganttApi(),a=authority();if(!g||!a)return html;
    const ps=Number(g.projectStart?.()||Date.now());
    const ranges=(g.tasks||[]).map(t=>a.stageRange(t.id)).filter(Boolean);
    const maxEnd=Math.max(ps+91*DAY,...ranges.map(r=>r.end));
    const horizon=Math.max(91,Math.ceil(Math.max(0,diffDays(ps,maxEnd))/7)*7);
    const host=document.createElement('div');host.innerHTML=html;

    const info=host.querySelector('.gantt-info');
    if(info)info.innerHTML='<b>Расчетный Гант.</b><span>Сроки формируются автоматически из «Управление проектом → Требования». Для изменения срока редактируйте период требования.</span>';

    host.querySelectorAll('.gantt-row').forEach(row=>{
      const name=row.querySelector('.gantt-name-cell b')?.textContent.trim();
      const task=(g.tasks||[]).find(t=>t.name===name);if(!task)return;
      const r=a.stageRange(task.id);if(!r)return;
      const from=Math.max(0,diffDays(ps,r.start));
      const to=Math.max(from+1,diffDays(ps,r.end));
      const bar=row.querySelector('.gantt-bar');
      if(bar){bar.style.left=`${Math.min(100,from/horizon*100)}%`;bar.style.width=`${Math.max(.7,(Math.min(horizon,to)-from)/horizon*100)}%`;}
      row.querySelector('.gantt-extension')?.remove();
      const cards=row.querySelectorAll('.gantt-detail-card');
      if(cards[0]){
        const label=cards[0].querySelector('.label'),b=cards[0].querySelector('b'),sub=cards[0].querySelector('.gantt-detail-sub');
        if(label)label.textContent='Период по требованиям';
        if(b)b.textContent=`${fmt(r.start)} - ${fmt(r.end)}`;
        if(sub)sub.textContent=r.count?`${r.count} требований формируют период этапа`:'Нет актуальных требований, используется базовый период';
      }
      if(cards[1]){
        const label=cards[1].querySelector('.label'),b=cards[1].querySelector('b'),sub=cards[1].querySelector('.gantt-detail-sub');
        if(label)label.textContent='Источник';
        if(b)b.textContent='Требования';
        if(sub)sub.textContent='Редактируется только на мастер-странице';
      }
      if(cards[2]){
        const label=cards[2].querySelector('.label');if(label)label.textContent='Изменение срока';
        cards[2].querySelector('.gantt-action-box')?.replaceChildren();
        cards[2].querySelector('.gantt-reschedule-form')?.remove();
        let note=cards[2].querySelector('.gantt-action-note');
        if(!note){note=document.createElement('div');note.className='gantt-action-note';cards[2].appendChild(note);}
        note.textContent='Измените период в «Управление проектом → Требования».';
      }
    });

    const footer=host.querySelector('.gantt-footer-focus');
    if(footer){
      const spans=footer.querySelectorAll('span');
      if(spans[1])spans[1].innerHTML=`Расчетное завершение: <b>${fmt(maxEnd)}</b>`;
      if(spans[2])spans[2].innerHTML='Источник сроков: <b>Требования</b>';
    }
    return host.innerHTML;
  }

  function wrapGanttRenderer(){
    if(originalGantt||typeof window.gantt!=='function')return Boolean(originalGantt);
    originalGantt=window.gantt;
    window.gantt=function(){patchGanttApi();return transformGantt(originalGantt.apply(this,arguments));};
    return true;
  }

  function patchStagesPanel(){
    if(!location.hash.startsWith('#management/stages'))return;
    const panel=document.getElementById('pa-panel'),a=authority(),c=core();if(!panel||!a||!c)return;
    let note=panel.querySelector('.requirements-derived-note');
    if(!note){note=document.createElement('div');note.className='pa-master requirements-derived-note';panel.insertBefore(note,panel.firstChild);}
    note.innerHTML='<b>Расчетный экран.</b> Начало и окончание этапов формируются из периодов требований. Изменять сроки нужно только на вкладке «Требования».';

    panel.querySelectorAll('tr[data-pa-stage]').forEach(row=>{
      const id=Number(row.dataset.paStage),r=a.stageRange(id);if(!r)return;
      const cells=row.children;
      if(cells[4])cells[4].textContent=fmt(r.start);
      const due=row.querySelector('[data-pa-stage-due]');
      if(due){due.value=r.endDate;due.disabled=true;due.title='Рассчитывается из требований';}
      const reason=row.querySelector('[data-pa-stage-reason]');if(reason){reason.value='';reason.disabled=true;reason.placeholder='Расчет из требований';}
      row.querySelectorAll('.pa-save-stage,.pa-reset-stage').forEach(btn=>{btn.disabled=true;btn.style.display='none';});
    });
  }

  function patchExpandedText(){
    if(location.hash!=='#expanded-gantt')return;
    const p=document.querySelector('.core-xg > div:first-child p');
    if(p)p.textContent='Каждый пункт «Что нужно» отображается по собственному периоду из «Управление проектом → Требования». Развернутый Гант является только представлением данных.';
  }

  function patchRaciView(){
    const h=decodeURIComponent(location.hash.slice(1));if(!h.startsWith('teams/'))return;
    const table=document.querySelector('.core-raci-table');if(!table)return;
    table.querySelectorAll('select[data-core-field],textarea[data-core-field]').forEach(el=>{el.disabled=true;el.title='Изменения выполняются в Управление проектом → Требования';});
    table.querySelectorAll('.core-delete').forEach(btn=>btn.style.display='none');
    if(!document.getElementById('core-master-requirements-link')){
      const top=document.querySelector('.core-detail-top');
      if(top){const b=document.createElement('button');b.id='core-master-requirements-link';b.className='btn primary';b.textContent='Открыть мастер-страницу требований';b.onclick=()=>{location.hash='#management/requirements'};top.appendChild(b);}
    }
  }

  function patchSecondaryViews(){patchStagesPanel();patchExpandedText();patchRaciView();}

  function install(){
    if(!authority()?.isPrimary||!ganttApi())return false;
    patchGanttApi();wrapGanttRenderer();patchSecondaryViews();
    window.ATOM_REQUIREMENTS_DERIVED_VIEWS={version:VERSION,patch:patchSecondaryViews};
    return true;
  }

  ['atom-requirements-authority-ready','atom-core-data-changed','atom-sync-update','atom-view-rendered','hashchange'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{install();patchSecondaryViews();},0)));
  const timer=setInterval(()=>{if(install())clearInterval(timer);},60);
  setTimeout(()=>clearInterval(timer),6000);
})();