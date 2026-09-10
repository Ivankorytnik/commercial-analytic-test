(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return'Не задано';const p=String(v).split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:v};
  const DAY=86400000;
  let updateQueued=false;
  let lastView='';

  function c(){return window.ATOM_CORE}
  function statusOptions(id){return c().STATUS.map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${esc(x.label)}</option>`).join('')}
  function peopleOptions(selected){return ['<option value="">Не назначен</option>',...c().people().map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`)].join('')}
  function stageOptions(selected){return Array.from({length:12},(_,i)=>i+1).map(id=>`<option value="${id}" ${Number(selected)===id?'selected':''}>${id}. ${esc(c().stageName(id))}</option>`).join('')}
  function title(){return document.querySelector('#app .section-title h2')?.textContent.trim()||''}

  function styles(){
    if(document.getElementById('logic-core-fast-css'))return;
    const s=document.createElement('style');s.id='logic-core-fast-css';s.textContent=`
      .core-raci-table{width:100%;border-collapse:collapse;min-width:1180px}.core-raci-table th,.core-raci-table td{padding:9px;border-bottom:1px solid var(--line);border-right:1px solid #edf1f1;text-align:left;vertical-align:top;font-size:11px}.core-raci-table th{background:#edf3f3;position:sticky;top:0;z-index:2;font-size:10px}.core-raci-wrap{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:12px}.core-period b{white-space:nowrap}.core-period small{display:block;color:var(--muted);margin-top:3px}.core-stage{min-width:170px}.core-raci-table select,.core-raci-table textarea{width:100%;box-sizing:border-box;border:1px solid #ccd9d9;border-radius:7px;padding:7px 8px;background:#fff;font:inherit;font-size:11px}.core-raci-table textarea{min-height:50px;resize:vertical}.core-problem{background:#fff4f1}.core-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.core-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px}.core-kpi span{display:block;color:var(--muted);font-size:10px}.core-kpi b{font-size:20px}.core-detail{display:grid;gap:12px}.core-detail-top{display:flex;justify-content:space-between;align-items:end;gap:10px;flex-wrap:wrap}.core-detail-top h2{margin:0 0 3px}.core-detail-top p{margin:0;color:var(--muted);font-size:12px}.core-add{display:grid;grid-template-columns:minmax(240px,1fr) 260px auto;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px}.core-add input,.core-add select{padding:8px;border:1px solid var(--line);border-radius:7px;font:inherit;font-size:11px}
      .core-team-readiness{margin-top:16px}.core-team-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:9px}.core-team-head h2{margin:0;font-size:18px}.core-team-head small{color:var(--muted)}.core-team-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.core-team-card{background:#fff;border:1px solid var(--line);border-radius:11px;padding:11px 12px;text-align:left;cursor:pointer;font:inherit;color:var(--text)}.core-team-card:hover{border-color:#9fded7;background:#fbfefe}.core-team-top{display:flex;justify-content:space-between;gap:8px}.core-team-name{font-size:12px;font-weight:700}.core-team-owner{font-size:9px;color:var(--muted);margin-top:3px}.core-team-pct{font-size:19px;font-weight:700}.core-team-progress{height:5px;background:#e6eeee;border-radius:99px;overflow:hidden;margin:9px 0 7px}.core-team-progress i{display:block;height:100%;background:var(--accent);border-radius:99px}.core-team-meta{display:flex;justify-content:space-between;gap:5px;flex-wrap:wrap;font-size:9px;color:#66797a}.core-problem-text{color:#a53636;font-weight:700}
      .core-today-box{margin-top:16px}.core-today-list{display:grid;gap:7px;margin-top:8px}.core-today-row{display:grid;grid-template-columns:160px 1fr auto;gap:10px;align-items:center;padding:8px 10px;background:#fff;border:1px solid var(--line);border-radius:8px;font-size:11px}.core-today-row small{color:var(--muted)}
      .core-xg{display:grid;gap:10px}.core-xg-wrap{overflow:auto;max-height:calc(100vh - 250px);border:1px solid var(--line);border-radius:12px;background:#fff}.core-xg-head,.core-xg-row{display:grid;grid-template-columns:620px minmax(900px,1fr);min-width:1520px}.core-xg-meta{position:sticky;left:0;z-index:5;background:inherit;display:grid;grid-template-columns:120px 55px 255px 110px 80px;border-right:1px solid #d6e0e0}.core-xg-head{position:sticky;top:0;z-index:20;background:#edf3f3}.core-xg-head .core-xg-meta{background:#edf3f3;z-index:22}.core-xg-cell{padding:8px;border-right:1px solid #e4eaea;font-size:10px;display:flex;align-items:center}.core-xg-track{position:relative;min-height:54px;min-width:900px}.core-xg-row{border-bottom:1px solid #e7eded;min-height:54px}.core-xg-bar{position:absolute;top:14px;height:25px;border-radius:6px;background:#35bfb1;display:flex;align-items:center;overflow:hidden}.core-xg-bar.done{background:#2ca66f}.core-xg-bar.problem{background:#d9534f}.core-xg-bar.idle{background:#cfdada}.core-xg-bar span{font-size:8px;font-weight:700;color:#fff;padding-left:5px;white-space:nowrap}.core-xg-week{display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid #d5dfdf;font-size:10px}.core-xg-week small{font-size:8px;color:#809091}.core-xg-headtrack{display:flex;position:relative;min-width:900px}.core-grid{position:absolute;top:0;bottom:0;width:1px;background:#e1e8e8}.core-today{position:absolute;top:0;bottom:0;width:2px;background:#d95c5c;z-index:4}
      @media(max-width:1200px){.core-team-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:900px){.core-kpis{grid-template-columns:repeat(2,1fr)}.core-add{grid-template-columns:1fr}.core-team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.core-team-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function allTeamSummaries(){
    const core=c(),all=core.requirements(),byTeam=new Map(core.teams().map(t=>[t,[]]));
    all.forEach(r=>{if(!byTeam.has(r.team))byTeam.set(r.team,[]);byTeam.get(r.team).push(r)});
    return [...byTeam.entries()].map(([team,rows])=>{
      const states=rows.map(r=>core.getState(r.id));
      const progress=rows.length?Math.round(rows.reduce((n,r)=>n+core.requirementProgress(r.id),0)/rows.length):0;
      return {team,total:rows.length,progress,done:states.filter(s=>s.statusId==='done').length,work:states.filter(s=>!['not_requested','done'].includes(s.statusId)).length,problem:rows.filter(r=>core.requirementProblem(r)).length,owner:core.teamOwner(team)};
    });
  }

  function ensureExpandedNav(){
    const sidebar=document.querySelector('.sidebar'),gantt=sidebar?.querySelector('.nav[data-view="gantt"]');if(!sidebar||!gantt)return;
    let b=document.getElementById('expanded-gantt-nav');
    if(!b){b=document.createElement('button');b.id='expanded-gantt-nav';b.type='button';b.className='nav';b.textContent='Развернутый Гант';gantt.insertAdjacentElement('afterend',b);}
  }

  function renderRaci(team){
    const core=c();if(!core)return;
    history.replaceState(null,'',`#teams/${encodeURIComponent(team)}`);
    document.querySelector('.content')?.classList.remove('gantt-content-focus');document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.querySelector('.nav[data-view="teams"]')?.classList.add('active');
    const rows=core.requirementsByTeam(team),sum=allTeamSummaries().find(x=>x.team===team)||{progress:0,total:0,done:0,work:0,problem:0,owner:'Не назначен'},teamRow=(DATA?.teams||[]).find(r=>r[0]===team)||[];
    app.innerHTML=`<div class="core-detail"><div class="core-detail-top"><div><h2>Что нужно от команды</h2><p>${esc(team)} · Logic Core v1.2</p></div><button class="btn" id="core-raci-back">Назад к RACI</button></div><div class="core-kpis"><div class="core-kpi"><span>Готовность</span><b>${sum.progress}%</b></div><div class="core-kpi"><span>Всего</span><b>${sum.total}</b></div><div class="core-kpi"><span>Готово</span><b>${sum.done}</b></div><div class="core-kpi"><span>В работе</span><b>${sum.work}</b></div><div class="core-kpi"><span>Проблемы</span><b>${sum.problem}</b></div></div><div class="callout"><b>RACI: ${esc(teamRow[1]||'')}</b> · ${esc(teamRow[2]||'')} · владелец: ${esc(sum.owner)}</div><div class="core-raci-wrap"><table class="core-raci-table"><thead><tr><th>Что нужно</th><th>Этап Ганта</th><th>Период по Ганту</th><th>Статус</th><th>Ответственный</th><th>Комментарий</th><th></th></tr></thead><tbody>${rows.map((r,i)=>{const s=core.getState(r.id),p=core.periodForRequirement(r),problem=core.requirementProblem(r);return `<tr class="${problem?'core-problem':''}" data-core-id="${esc(r.id)}"><td><b>${i+1}.</b> ${esc(r.text)}</td><td class="core-stage">${r.custom?`<select data-core-field="stageId">${stageOptions(r.stageId)}</select>`:`<b>${r.stageId}. ${esc(p.stageName)}</b>`}</td><td class="core-period"><b>${fmt(p.startDate)} - ${fmt(p.endDate)}</b><small>${p.changed?'актуальный срок после переноса':'актуальный период этапа'}</small>${problem?'<small style="color:#a53636;font-weight:700">Блокер / просрочка</small>':''}</td><td><select data-core-field="statusId">${statusOptions(s.statusId)}</select></td><td><select data-core-field="respondentId">${peopleOptions(s.respondentId)}</select></td><td><textarea data-core-field="comment" placeholder="Комментарий">${esc(s.comment)}</textarea></td><td>${r.custom?`<button class="btn core-delete" data-id="${esc(r.id)}">Удалить</button>`:''}</td></tr>`}).join('')}</tbody></table></div><div class="core-add"><input id="core-new-text" placeholder="Добавить новый пункт «Что нужно»"><select id="core-new-stage">${stageOptions(1)}</select><button class="btn primary" id="core-add-req" data-team="${esc(team)}">Добавить</button></div></div>`;
  }

  function patchTeams(){
    if(title()!=='Команды и RACI')return;
    const table=document.querySelector('#app table.table');if(!table)return;
    const head=table.querySelector('thead tr');if(!head)return;
    let idx=[...head.children].findIndex(x=>x.dataset.coreNeeds==='1');
    if(idx<0){const th=document.createElement('th');th.dataset.coreNeeds='1';th.textContent='Что нужно';const owner=head.children[3];if(owner)head.insertBefore(th,owner);else head.appendChild(th);idx=[...head.children].indexOf(th);}
    const sums=new Map(allTeamSummaries().map(x=>[x.team,x]));
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const team=tr.children[0]?.textContent.trim();if(!team)return;const s=sums.get(team);if(!s)return;
      let cell=tr.querySelector('[data-core-needs-cell]');
      if(!cell){cell=document.createElement('td');cell.dataset.coreNeedsCell='1';const owner=tr.children[3];if(owner)tr.insertBefore(cell,owner);else tr.appendChild(cell);}
      cell.innerHTML=`<b>${s.done} / ${s.total} готово</b><br><span style="font-size:10px;color:var(--muted)">готовность ${s.progress}%${s.problem?` · проблем ${s.problem}`:''}</span><br><button type="button" class="raci-open-team" data-team="${esc(team)}" style="margin-top:6px;border:1px solid #9edfd7;background:#eefcfa;color:#0f6962;border-radius:7px;padding:6px 9px;font:inherit;font-size:10px;font-weight:700;cursor:pointer">Открыть подробную страницу</button>`;
    });
  }

  function patchRoadmap(){
    if(title()!=='Этапы проекта')return;const rows=document.querySelectorAll('#app table.table tbody tr');
    rows.forEach(tr=>{const id=Number(tr.children[0]?.textContent||0);if(!id)return;const s=c().stageSummary(id),cell=tr.children[3];if(cell)cell.innerHTML=`${s.progress}% <div class="progress"><div style="width:${s.progress}%"></div></div>`;const sel=tr.querySelector('.stage-status-select');if(sel&&[...sel.options].some(o=>o.value===s.status))sel.value=s.status;});
  }

  function patchOverview(){
    if(!document.querySelector('#app .project-start-card'))return;
    const core=c(),progress=core.projectProgress(),hp=document.getElementById('header-progress'),hb=document.getElementById('header-progress-bar');if(hp)hp.textContent=`${progress}%`;if(hb)hb.style.width=`${progress}%`;
    const src=core.sourcesSummary(),own=core.ownersSummary(),dict=core.dictionarySummary(),dod=core.dodEvaluation(),stages=Array.from({length:12},(_,i)=>core.stageSummary(i+1));
    document.querySelectorAll('#app .card.kpi').forEach(card=>{const l=card.querySelector('.label')?.textContent.trim(),v=card.querySelector('.value'),sub=card.querySelector('.sub');if(l==='Готовность проекта'&&v)v.textContent=`${progress}%`;if(l==='Источники готовы'&&v)v.textContent=`${src.ready} / ${src.total}`;if(l==='Владельцы назначены'&&v)v.textContent=`${own.ready} / ${own.total}`;if(l==='Критические блокеры'&&v){const list=JSON.parse(localStorage.getItem('atom-blockers')||'[]').filter(x=>!['Решен','Закрыт'].includes(x.status));v.textContent=String(list.filter(x=>x.severity==='Критическая').length);if(sub)sub.textContent=`активных всего: ${list.length}`;}});
    const grid=document.querySelector('#app .grid');if(!grid)return;
    grid.querySelectorAll('.core-extra-kpi').forEach(x=>x.remove());
    const extra=[['Этапы завершены',`${stages.filter(x=>x.progress>=100).length} / 12`],['Data Dictionary',`${dict.ready} / ${dict.total}`],['Definition of Done',`${dod.filter(x=>x.ok).length} / ${dod.length}`]];
    extra.forEach(([label,value])=>grid.insertAdjacentHTML('beforeend',`<div class="card kpi core-extra-kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">Logic Core</div></div>`));
    let host=document.getElementById('core-team-readiness');if(!host){host=document.createElement('section');host.id='core-team-readiness';host.className='core-team-readiness';grid.insertAdjacentElement('afterend',host);}
    const sums=allTeamSummaries(),avg=Math.round(sums.reduce((n,x)=>n+x.progress,0)/Math.max(1,sums.length));
    host.innerHTML=`<div class="core-team-head"><div><h2>Готовность по командам</h2><small>По всем пунктам «Что нужно»</small></div><div>Средняя готовность <b>${avg}%</b></div></div><div class="core-team-grid">${sums.map(s=>`<button class="core-team-card" data-core-team="${esc(s.team)}"><div class="core-team-top"><div><div class="core-team-name">${esc(s.team)}</div><div class="core-team-owner">${esc(s.owner)}</div></div><div class="core-team-pct">${s.progress}%</div></div><div class="core-team-progress"><i style="width:${s.progress}%"></i></div><div class="core-team-meta"><span>Готово ${s.done}/${s.total}</span><span>В работе ${s.work}</span><span class="${s.problem?'core-problem-text':''}">${s.problem?`Проблем ${s.problem}`:'Без проблем'}</span></div></button>`).join('')}</div>`;
    let todayHost=document.getElementById('core-today-work');if(!todayHost){todayHost=document.createElement('section');todayHost.id='core-today-work';todayHost.className='core-today-box card';host.insertAdjacentElement('afterend',todayHost);}
    const now=Date.now(),week=now+7*DAY;const active=(window.ATOM_GANTT?.getAllStates?.()||[]).filter(s=>s.status!=='Завершено'&&new Date(s.startDate).getTime()<=week&&new Date(s.due).getTime()>=now).slice(0,6);
    todayHost.innerHTML=`<h3 style="margin:0">Сегодня в работе</h3><div class="core-today-list">${active.length?active.map(s=>`<div class="core-today-row"><b>${esc(s.name)}</b><small>${fmt(c().dateInput(s.startDate))} - ${fmt(c().dateInput(s.due))}</small><span>${c().stageSummary(s.id).progress}%</span></div>`).join(''):'<div style="color:var(--muted);font-size:11px">Активных этапов на текущую неделю нет.</div>'}</div>`;
  }

  function patchDod(){
    if(title()!=='Definition of Done')return;const list=document.querySelector('#app .checklist');if(!list)return;const d=c().dodEvaluation(),names=DATA?.dod||[];list.innerHTML=d.map((x,i)=>`<div class="check"><span style="font-weight:700;color:${x.ok?'#227457':'#7b8d8e'}">${x.ok?'✓':'·'}</span><span><b>${esc(names[i]||'Условие')}</b><small style="display:block;color:var(--muted)">${esc(x.detail)}</small></span></div>`).join('');
  }

  function patchHeader(){const p=c()?.projectProgress?.()??0,h=document.getElementById('header-progress'),b=document.getElementById('header-progress-bar');if(h)h.textContent=`${p}%`;if(b)b.style.width=`${p}%`}
  function patchCurrent(){if(!c())return;patchHeader();const t=title();if(t==='Команды и RACI')patchTeams();else if(t==='Этапы проекта')patchRoadmap();else if(t==='Definition of Done')patchDod();else if(document.querySelector('#app .project-start-card'))patchOverview();}
  function queuePatch(){if(updateQueued)return;updateQueued=true;requestAnimationFrame(()=>{updateQueued=false;patchCurrent();window.dispatchEvent(new CustomEvent('atom-view-rendered'));});}

  function renderExpanded(){
    const core=c();if(!core)return;history.replaceState(null,'','#expanded-gantt');document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.getElementById('expanded-gantt-nav')?.classList.add('active');document.querySelector('.content')?.classList.add('gantt-content-focus');
    const start=core.startTs(),rows=core.requirements(),startDay=new Date(start);startDay.setHours(0,0,0,0);const diff=v=>Math.round((new Date(v)-startDay)/DAY);const horizon=Math.max(91,Math.ceil(Math.max(91,...rows.map(r=>diff(core.periodForRequirement(r).endDate)))/7)*7);let weeks='';for(let d=0,n=1;d<horizon;d+=7,n++){const dt=new Date(startDay);dt.setDate(dt.getDate()+d);weeks+=`<div class="core-xg-week" style="width:${Math.min(7,horizon-d)/horizon*100}%"><b>Н${n}</b><small>${fmt(core.dateInput(dt))}</small></div>`}const td=diff(core.dateInput(Date.now())),today=td>=0&&td<=horizon?`<i class="core-today" style="left:${td/horizon*100}%"></i>`:'';
    app.innerHTML=`<div class="core-xg"><div><h2 style="margin:0">Развернутая диаграмма Ганта</h2><p style="margin:4px 0 0;color:var(--muted);font-size:12px">Каждый пункт «Что нужно» связан с этапом основного Ганта и автоматически следует за его сроком</p></div><div class="core-xg-wrap"><div class="core-xg-head"><div class="core-xg-meta"><div class="core-xg-cell">Команда</div><div class="core-xg-cell">RACI</div><div class="core-xg-cell">Что нужно</div><div class="core-xg-cell">Ответственный</div><div class="core-xg-cell">Статус</div></div><div class="core-xg-headtrack">${weeks}${today}</div></div>${rows.map(r=>{const s=core.getState(r.id),p=core.periodForRequirement(r),from=Math.max(0,diff(p.startDate)),to=Math.max(from+1,diff(p.endDate)),cls=s.statusId==='done'?'done':core.requirementProblem(r)?'problem':s.statusId==='not_requested'?'idle':'';const rr=(DATA?.teams||[]).find(x=>x[0]===r.team)||[];return `<div class="core-xg-row"><div class="core-xg-meta"><div class="core-xg-cell">${esc(r.team)}</div><div class="core-xg-cell"><b>${esc(rr[1]||'')}</b></div><div class="core-xg-cell">${esc(r.text)}</div><div class="core-xg-cell">${esc(core.personName(s.respondentId)||core.teamOwner(r.team))}</div><div class="core-xg-cell">${esc(core.statusLabel(s.statusId))}</div></div><div class="core-xg-track">${Array.from({length:Math.ceil(horizon/7)-1},(_,i)=>`<i class="core-grid" style="left:${(i+1)*7/horizon*100}%"></i>`).join('')}${today}<div class="core-xg-bar ${cls}" style="left:${Math.min(100,from/horizon*100)}%;width:${Math.max(.5,(Math.min(horizon,to)-from)/horizon*100)}%"><span>${r.stageId}. ${esc(core.stageName(r.stageId))}</span></div></div></div>`}).join('')}</div></div>`;
  }

  function saveRow(row){const id=row?.dataset.coreId;if(!id)return;const patch={};row.querySelectorAll('[data-core-field]').forEach(el=>{if(el.dataset.coreField!=='stageId')patch[el.dataset.coreField]=el.value});c().setState(id,patch)}

  document.addEventListener('click',e=>{
    const nav=e.target.closest('.nav');if(nav&&nav.dataset.view){const view=nav.dataset.view;lastView=view;history.replaceState(null,'',`#${view}`);setTimeout(queuePatch,0);return;}
    if(e.target.closest('#expanded-gantt-nav')){renderExpanded();return;}
    const open=e.target.closest('.raci-open-team,[data-core-team]');if(open){e.preventDefault();renderRaci(open.dataset.team||open.dataset.coreTeam);return;}
    if(e.target.closest('#core-raci-back')){history.replaceState(null,'','#teams');document.querySelector('.nav[data-view="teams"]')?.click();return;}
    const add=e.target.closest('#core-add-req');if(add){const text=document.getElementById('core-new-text')?.value.trim(),stage=Number(document.getElementById('core-new-stage')?.value||1);if(!text)return alert('Укажи, что нужно получить от команды');c().addRequirement(add.dataset.team,text,stage);c().reconcile();renderRaci(add.dataset.team);return;}
    const del=e.target.closest('.core-delete');if(del){if(confirm('Удалить этот дополнительный пункт?')){const req=c().requirement(del.dataset.id);c().deleteRequirement(del.dataset.id);c().reconcile();if(req)renderRaci(req.team);}return;}
  });

  document.addEventListener('change',e=>{
    const el=e.target.closest('[data-core-field]');if(!el)return;const row=el.closest('[data-core-id]'),id=row?.dataset.coreId;if(!id)return;
    if(el.dataset.coreField==='stageId'){const req=c().requirement(id);if(req?.custom){const key=`atom-core-requirement-meta-${id}`,meta=JSON.parse(localStorage.getItem(key)||'{}');meta.stageId=Number(el.value);localStorage.setItem(key,JSON.stringify(meta));window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-stage',id}}));}return;}
    saveRow(row);c().reconcile();renderRaci(c().requirement(id)?.team||'');
  });
  document.addEventListener('focusout',e=>{if(e.target.matches('textarea[data-core-field="comment"]')){const row=e.target.closest('[data-core-id]');if(row){saveRow(row);c().reconcile();}}});

  window.addEventListener('atom-core-data-changed',()=>{c().reconcile();if(location.hash==='#expanded-gantt')renderExpanded();else{const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('teams/'))renderRaci(h.slice(6));else queuePatch();}});
  window.addEventListener('atom-sync-update',()=>{c()?.reconcile?.();const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('teams/'))renderRaci(h.slice(6));else if(h==='expanded-gantt')renderExpanded();else queuePatch();});
  window.addEventListener('hashchange',()=>{const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('teams/'))renderRaci(h.slice(6));else if(h==='expanded-gantt')renderExpanded();else queuePatch();});

  styles();ensureExpandedNav();
  setTimeout(()=>{ensureExpandedNav();c()?.reconcile?.();const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('teams/'))renderRaci(h.slice(6));else if(h==='expanded-gantt')renderExpanded();else queuePatch();},500);
  window.ATOM_CORE_UI={renderRaci,renderExpanded,patchCurrent,queuePatch};
})();