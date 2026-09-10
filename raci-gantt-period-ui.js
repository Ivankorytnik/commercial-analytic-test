(function(){
  let queued=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'Не задано';const p=v.split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:v};
  const today=()=>new Date().toISOString().slice(0,10);

  function currentTeam(){return document.getElementById('raci-team-switch')?.value||''}

  function patchRaci(){
    const table=document.querySelector('#app .raci-detail-table');
    const schedule=window.ATOM_RACI_GANTT_SCHEDULE;
    if(!table||!schedule)return;
    const team=currentTeam();if(!team)return;

    const subtitle=document.querySelector('#app .raci-detail-title p');
    if(subtitle)subtitle.textContent='Подробный контроль результата, статуса, периода по Ганту и ответственного';

    const head=table.querySelector('thead tr');
    if(head&&!head.dataset.ganttPeriod){
      const ths=[...head.children];
      if(ths.length>=7){
        ths[2].textContent='Период по Ганту';
        ths[3].remove();
        ths[4].remove();
      }
      head.dataset.ganttPeriod='1';
    }

    table.querySelectorAll('tbody tr[data-raci-item]').forEach(tr=>{
      const id=tr.dataset.raciItem;
      const cells=[...tr.children];
      if(cells.length>=7){
        const period=schedule.period(team,id);
        const status=tr.querySelector('[data-raci-field="status"]')?.value||'Не запрошено';
        const overdue=schedule.isOverdue(team,id,status);
        cells[2].className='raci-date raci-gantt-period';
        cells[2].innerHTML=`<b>${fmt(period.startDate)} - ${fmt(period.endDate)}</b><small style="display:block;margin-top:4px;color:var(--muted)">Неделя ${period.weekFrom}${period.weekTo!==period.weekFrom?` - ${period.weekTo}`:''} · из Ганта</small>${overdue?'<span class="raci-overdue-note">Плановый срок по Ганту просрочен</span>':''}`;
        cells[3].remove();
        cells[4].remove();
        tr.classList.toggle('overdue',overdue);
        const oldNote=tr.querySelector('.raci-req-text .raci-overdue-note');
        if(oldNote)oldNote.remove();
      }
    });
    table.style.minWidth='980px';
  }

  function dayDiff(startTs,dateString){
    const p=dateString.split('-').map(Number);if(p.length!==3)return 0;
    const d=new Date(p[0],p[1]-1,p[2]);d.setHours(0,0,0,0);
    const s=new Date(startTs);s.setHours(0,0,0,0);
    return Math.round((d-s)/86400000);
  }

  function patchExpandedGantt(){
    const page=document.querySelector('#app .xg-page');
    const schedule=window.ATOM_RACI_GANTT_SCHEDULE;
    if(!page||!schedule)return;
    const weeks=page.querySelectorAll('.xg-week').length||13;
    const horizon=weeks*7;
    const start=schedule.projectStart();

    page.querySelectorAll('.xg-row[data-xg-row]').forEach(row=>{
      const key=row.dataset.xgRow||'';
      const cut=key.lastIndexOf('|');if(cut<0)return;
      const team=key.slice(0,cut),id=key.slice(cut+1);
      const period=schedule.period(team,id);
      const status=row.querySelector('.xg-bar span')?.textContent.trim()||'Не запрошено';
      const from=Math.max(0,dayDiff(start,period.startDate));
      const to=Math.max(from+1,dayDiff(start,period.endDate));
      const bar=row.querySelector('.xg-bar');
      if(bar){
        bar.style.left=`${Math.min(100,from/horizon*100)}%`;
        bar.style.width=`${Math.max(.5,(Math.min(horizon,to)-Math.max(0,from))/horizon*100)}%`;
        bar.classList.remove('derived');
        const overdue=schedule.isOverdue(team,id,status);
        bar.style.background=status==='Готово'?'#2ca66f':(status==='Блокер'||overdue)?'#d9534f':status==='Не запрошено'?'#cfdada':'#35bfb1';
        bar.title=`Период по Ганту: ${fmt(period.startDate)} - ${fmt(period.endDate)}`;
      }
      const editor=row.querySelector('.xg-editor-grid');
      if(editor&&!editor.dataset.ganttPeriod){
        const req=editor.querySelector('[data-xg-field="requestDate"]')?.closest('.xg-field');
        const due=editor.querySelector('[data-xg-field="dueDate"]')?.closest('.xg-field');
        if(req){req.innerHTML=`<label>Период по Ганту</label><div style="padding:8px;border:1px solid var(--line);border-radius:7px;background:#eef5f4;font-size:10px"><b>${fmt(period.startDate)} - ${fmt(period.endDate)}</b><br><span style="color:var(--muted)">Неделя ${period.weekFrom}${period.weekTo!==period.weekFrom?` - ${period.weekTo}`:''}</span></div>`;}
        if(due)due.remove();
        editor.style.gridTemplateColumns='220px 165px 170px minmax(220px,1fr) auto';
        editor.dataset.ganttPeriod='1';
      }
    });

    const legend=[...page.querySelectorAll('.xg-legend span')].find(x=>x.textContent.includes('Даты заданы в RACI'));
    if(legend)legend.innerHTML='<i class="xg-dot" style="background:#35bfb1"></i>Период по Ганту';
  }

  function fixRaciBlockers(){
    const schedule=window.ATOM_RACI_GANTT_SCHEDULE;if(!schedule)return;
    let states={};try{states=JSON.parse(localStorage.getItem('atom-raci-requirement-state-v2')||'{}')||{}}catch{return;}
    let blockers=[];try{blockers=JSON.parse(localStorage.getItem('atom-blockers')||'[]')||[]}catch{}
    let changed=false;
    Object.entries(states).forEach(([team,items])=>Object.entries(items||{}).forEach(([id,s])=>{
      const key=`RACI:${team}:${id}`,over=schedule.isOverdue(team,id,s.status||'Не запрошено');
      const b=blockers.find(x=>x.autoKey===key);
      const period=schedule.period(team,id);
      if(over&&!b){blockers.push({id:Date.now()+Math.floor(Math.random()*100000),autoKey:key,source:`RACI: ${team}`,description:`Просрочен плановый срок по Ганту`,severity:'Высокая',owner:s.respondent||'Не назначен',due:period.endDate,status:'Открыт',comment:`Создан автоматически. Период по Ганту: ${fmt(period.startDate)} - ${fmt(period.endDate)}`,createdAt:new Date().toISOString()});changed=true;}
      if(over&&b&&b.due!==period.endDate){b.due=period.endDate;changed=true;}
      if(!over&&b&&!['Решен','Закрыт'].includes(b.status)){b.status='Решен';b.comment=(b.comment?b.comment+'\n':'')+'Закрыт автоматически: срок по Ганту больше не просрочен.';changed=true;}
    }));
    if(changed)localStorage.setItem('atom-blockers',JSON.stringify(blockers));
  }

  function patch(){patchRaci();patchExpandedGantt();}
  const root=document.getElementById('app');
  if(root)new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}).observe(root,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',()=>{patch();fixRaciBlockers();});
  window.addEventListener('hashchange',()=>setTimeout(patch,100));
  setInterval(()=>{patch();fixRaciBlockers();},10000);
  setTimeout(()=>{patch();fixRaciBlockers();},1000);
  window.ATOM_RACI_GANTT_UI={patch,fixRaciBlockers};
})();