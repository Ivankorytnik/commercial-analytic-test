(function(){
  const VERSION='1.1.0';
  const HASH='#status-mailer';
  const BLOCKERS_KEY='atom-blockers';
  let queued=false;

  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const pad=n=>String(n).padStart(2,'0');
  const isNotActual=id=>Boolean(core()?.isRequirementNotActual?.(id))||localStorage.getItem(`atom-requirement-not-actual-${id}`)==='1';
  const isActiveTeam=team=>activity()?.isActive?activity().isActive(team):true;

  function fmtDate(value,withTime=false){
    if(!value)return'срок не задан';
    const d=value instanceof Date?value:new Date(typeof value==='number'?value:String(value).includes('T')?value:`${value}T00:00:00`);
    if(!Number.isFinite(d.getTime()))return String(value);
    const date=`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
    return withTime?`${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`:date;
  }

  function shortName(name){
    const s=String(name||'').trim();
    if(!s)return'Коллега';
    return s.split(/\s+/)[0];
  }

  function statusLabel(id){
    const c=core();
    if(id==='__not_actual__'||id==='not_actual')return'Не актуально';
    return c?.statusLabel?.(id)||c?.STATUS?.find(x=>x.id===id)?.label||id||'Не запрошено';
  }

  function deadlineInfo(req){
    const c=core(),p=c?.periodForRequirement?.(req);
    if(!p)return{ts:Number.MAX_SAFE_INTEGER,text:'срок не задан',overdue:false};
    let ts=Number(p.end);
    let text='';
    if(p.endAt){
      const exact=new Date(p.endAt);ts=exact.getTime();text=fmtDate(exact,true);
    }else if(p.endDate){
      const end=new Date(`${p.endDate}T23:59:59`);ts=Number.isFinite(Number(p.end))?Number(p.end):end.getTime();text=fmtDate(p.endDate,false);
    }else if(Number.isFinite(ts))text=fmtDate(ts,true);
    else text='срок не задан';
    const state=c?.getState?.(req.id);
    const overdue=state?.statusId!=='done'&&Number.isFinite(ts)&&ts<Date.now();
    return{ts:Number.isFinite(ts)?ts:Number.MAX_SAFE_INTEGER,text,overdue};
  }

  function allRequirements(){
    const c=core();if(!c)return[];
    const out=[];
    (c.teams?.()||[]).forEach(team=>{
      (c.requirementsByTeam?.(team)||[]).forEach(req=>{
        if(isNotActual(req.id)||!isActiveTeam(req.team))return;
        out.push(req);
      });
    });
    return out;
  }

  function activeBlockers(){
    return read(BLOCKERS_KEY,[]).filter(x=>!['Решен','Закрыт'].includes(x.status));
  }

  function teamOwnership(name){
    if(typeof DATA==='undefined'||!Array.isArray(DATA?.teams))return[];
    return DATA.teams.map((r,i)=>({team:r[0],owner:localStorage.getItem(`atom-responsible-${i}`)||'Не назначен'})).filter(x=>x.owner===name).map(x=>x.team);
  }

  function buildRecipients(){
    const c=core();if(!c)return[];
    const people=c.people?.()||[];
    const reqs=allRequirements();
    const blockers=activeBlockers();
    const byId=new Map(people.map(p=>[p.id,p]));
    const rows=people.map(person=>{
      const assigned=reqs.filter(req=>c.getState(req.id).respondentId===person.id).map(req=>{
        const state=c.getState(req.id),deadline=deadlineInfo(req);
        return {req,state,deadline,problem:Boolean(c.requirementProblem?.(req))};
      }).sort((a,b)=>{
        const ad=a.state.statusId==='done'?1:0,bd=b.state.statusId==='done'?1:0;
        if(ad!==bd)return ad-bd;
        if(a.deadline.overdue!==b.deadline.overdue)return a.deadline.overdue?-1:1;
        return a.deadline.ts-b.deadline.ts;
      });
      const assignedIds=new Set(assigned.map(x=>x.req.id));
      const personBlockers=blockers.filter(b=>{
        if(String(b.owner||'').trim()!==String(person.name||'').trim())return false;
        if(String(b.autoKey||'').startsWith('CORE:RACI:')){
          const id=String(b.autoKey).slice('CORE:RACI:'.length);
          if(assignedIds.has(id))return false;
        }
        return true;
      });
      return {person,requirements:assigned,blockers:personBlockers,teams:teamOwnership(person.name)};
    }).filter(x=>x.requirements.length||x.blockers.length);

    const knownNames=new Set(rows.map(x=>x.person.name));
    blockers.forEach(b=>{
      const name=String(b.owner||'').trim();
      if(!name||name==='Не назначен'||knownNames.has(name))return;
      const p=[...byId.values()].find(x=>x.name===name)||{id:`external-${name}`,name,email:''};
      rows.push({person:p,requirements:[],blockers:blockers.filter(x=>String(x.owner||'').trim()===name),teams:teamOwnership(name)});
      knownNames.add(name);
    });
    return rows.sort((a,b)=>a.person.name.localeCompare(b.person.name,'ru'));
  }

  function requirementLine(item,index){
    const c=core(),req=item.req,state=item.state,d=item.deadline;
    const stage=`${req.stageId}. ${c.stageName(req.stageId)}`;
    const overdue=d.overdue?' [ПРОСРОЧЕНО]':'';
    const problem=item.problem?' [ПРОБЛЕМА]':'';
    const comment=String(state.comment||'').trim();
    return [
      `${index+1}. [${req.team}] ${req.text}`,
      `   Статус: ${statusLabel(state.statusId)}${problem}`,
      `   Этап: ${stage}`,
      `   Срок: ${d.text}${overdue}`,
      comment?`   Комментарий: ${comment}`:''
    ].filter(Boolean).join('\n');
  }

  function blockerLine(b,index){
    const due=b.due?fmtDate(b.due,false):'срок не задан';
    return [
      `${index+1}. ${b.description||b.source||'Блокер'}`,
      `   Критичность: ${b.severity||'Не задана'}`,
      `   Статус: ${b.status||'Открыт'}`,
      `   Срок: ${due}`,
      b.comment?`   Комментарий: ${b.comment}`:''
    ].filter(Boolean).join('\n');
  }

  function buildMail(row){
    const today=fmtDate(new Date(),false);
    const first=shortName(row.person.name);
    const activeReq=row.requirements.filter(x=>x.state.statusId!=='done');
    const doneCount=row.requirements.filter(x=>x.state.statusId==='done').length;
    const overdue=activeReq.filter(x=>x.deadline.overdue).length;
    const subject=`АТОМ | Актуализация статусов задач | ${today}`;
    const body=[];
    body.push(`${first}, добрый день!`,'',`Прошу актуализировать статусы по задачам, которые закреплены за вами в проекте «Коммерческая аналитика АТОМ».`,`По состоянию на ${today}:`,'');
    if(row.teams.length)body.push(`Зоны ответственности: ${row.teams.join(', ')}`,'');
    body.push('СТАТУС:',`В работе - ${activeReq.length}`,`Просрочено - ${overdue}`,`Готово - ${doneCount}`,`Активных блокеров - ${row.blockers.length}`,'');
    if(activeReq.length){
      body.push('ЗАДАЧИ В РАБОТЕ:','');
      activeReq.forEach((x,i)=>{body.push(requirementLine(x,i),'');});
    }
    if(row.blockers.length){
      body.push('АКТИВНЫЕ БЛОКЕРЫ:','');
      row.blockers.forEach((x,i)=>{body.push(blockerLine(x,i),'');});
    }
    body.push('Просьба проверить статусы и при необходимости направить актуальный комментарий и срок.','','Спасибо!','Иван Корытник');
    return{subject,body:body.join('\n')};
  }

  function styles(){
    if(document.getElementById('status-mailer-css'))return;
    const s=document.createElement('style');s.id='status-mailer-css';s.textContent=`
      .status-mailer-page{display:grid;gap:12px}.status-mailer-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}.status-mailer-head h2{margin:0;font-size:22px}.status-mailer-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.status-mailer-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.status-mailer-kpi{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px}.status-mailer-kpi span{display:block;font-size:9px;color:var(--muted)}.status-mailer-kpi b{font-size:20px}.status-mailer-list{display:grid;gap:9px}.status-mailer-card{background:#fff;border:1px solid var(--line);border-radius:11px;overflow:hidden}.status-mailer-card-head{display:grid;grid-template-columns:minmax(180px,1fr) minmax(200px,1fr) auto;gap:10px;align-items:center;padding:12px}.status-mailer-person b{display:block;font-size:12px}.status-mailer-person small,.status-mailer-counts{color:var(--muted);font-size:10px}.status-mailer-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.status-mailer-preview{display:none;border-top:1px solid var(--line);padding:12px;background:#f8fbfb}.status-mailer-card.open .status-mailer-preview{display:block}.status-mailer-preview pre{margin:0;white-space:pre-wrap;font:11px/1.5 Arial,sans-serif;color:var(--text);max-height:420px;overflow:auto}.status-mailer-warning{padding:9px 11px;border-left:4px solid #d59a34;background:#fff6df;border-radius:7px;font-size:10px;color:#745513}.status-mailer-empty{padding:20px;background:#fff;border:1px solid var(--line);border-radius:11px;color:var(--muted);font-size:12px}.status-mailer-nav{font-weight:700!important}.status-mailer-copy-ok{background:#e5f7ef!important;color:#227457!important}
      @media(max-width:900px){.status-mailer-kpis{grid-template-columns:repeat(2,1fr)}.status-mailer-card-head{grid-template-columns:1fr}.status-mailer-actions{justify-content:flex-start}}
    `;document.head.appendChild(s);
  }

  function ensureNav(){
    const sidebar=document.querySelector('.sidebar');if(!sidebar)return;
    let btn=document.getElementById('status-mailer-nav');if(btn)return;
    btn=document.createElement('button');btn.type='button';btn.id='status-mailer-nav';btn.className='nav status-mailer-nav';btn.textContent='Отправить коллегам статусы';
    const info=sidebar.querySelector('.nav-info-separator');
    if(info)sidebar.insertBefore(btn,info);else sidebar.appendChild(btn);
    btn.addEventListener('click',()=>{history.pushState(null,'',HASH);render();});
  }

  function render(){
    if(location.hash!==HASH)return;
    const c=core();if(!c||typeof DATA==='undefined'){setTimeout(render,250);return;}
    styles();ensureNav();
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    document.getElementById('status-mailer-nav')?.classList.add('active');
    document.querySelector('.content')?.classList.remove('gantt-content-focus');
    const rows=buildRecipients();
    const totalReq=rows.reduce((n,x)=>n+x.requirements.length,0);
    const overdue=rows.reduce((n,x)=>n+x.requirements.filter(r=>r.state.statusId!=='done'&&r.deadline.overdue).length,0);
    const blockers=rows.reduce((n,x)=>n+x.blockers.length,0);
    const missing=rows.filter(x=>!String(x.person.email||'').trim()).length;
    app.innerHTML=`<div class="status-mailer-page"><div class="status-mailer-head"><div><h2>Отправить коллегам статусы</h2><p>Система собирает актуальные задачи и активные блокеры по каждому ответственному и формирует персональное письмо.</p></div><button class="btn" id="status-mailer-refresh">Обновить данные</button></div><div class="status-mailer-kpis"><div class="status-mailer-kpi"><span>Получателей</span><b>${rows.length}</b></div><div class="status-mailer-kpi"><span>Требований</span><b>${totalReq}</b></div><div class="status-mailer-kpi"><span>Просрочено</span><b>${overdue}</b></div><div class="status-mailer-kpi"><span>Активных блокеров</span><b>${blockers}</b></div></div>${missing?`<div class="status-mailer-warning">У ${missing} получател${missing===1?'я':'ей'} не заполнен e-mail. Добавьте адрес в Управление проектом → Справочники.</div>`:''}<div class="status-mailer-list">${rows.length?rows.map((row,i)=>{const mail=buildMail(row),email=String(row.person.email||'').trim(),active=row.requirements.filter(x=>x.state.statusId!=='done').length,done=row.requirements.filter(x=>x.state.statusId==='done').length,over=row.requirements.filter(x=>x.state.statusId!=='done'&&x.deadline.overdue).length;return `<section class="status-mailer-card" data-mail-index="${i}"><div class="status-mailer-card-head"><div class="status-mailer-person"><b>${esc(row.person.name)}</b><small>${email?esc(email):'E-mail не указан'}</small></div><div class="status-mailer-counts">В работе: ${active} · просрочено: ${over} · готово: ${done} · блокеров: ${row.blockers.length}</div><div class="status-mailer-actions"><button class="btn" data-mail-preview="${i}">Предпросмотр</button><button class="btn" data-mail-copy="${i}">Копировать</button><button class="btn primary" data-mail-open="${i}" ${email?'':'disabled'}>Открыть письмо</button></div></div><div class="status-mailer-preview"><pre>${esc(`Тема: ${mail.subject}\nКому: ${email||'не указан'}\n\n${mail.body}`)}</pre></div></section>`;}).join(''):'<div class="status-mailer-empty">Нет актуальных задач или активных блокеров, назначенных на ответственных.</div>'}</div></div>`;
    window.ATOM_STATUS_MAILER_DATA=rows.map(row=>({...row,mail:buildMail(row)}));
  }

  function copyText(text,button){
    const done=()=>{if(!button)return;const old=button.textContent;button.textContent='Скопировано';button.classList.add('status-mailer-copy-ok');setTimeout(()=>{button.textContent=old;button.classList.remove('status-mailer-copy-ok');},1400);};
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));else fallbackCopy(text,done);
  }
  function fallbackCopy(text,done){
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done();}catch{}ta.remove();
  }

  document.addEventListener('click',e=>{
    const refresh=e.target.closest('#status-mailer-refresh');if(refresh){render();return;}
    const preview=e.target.closest('[data-mail-preview]');if(preview){const card=preview.closest('.status-mailer-card');card?.classList.toggle('open');preview.textContent=card?.classList.contains('open')?'Скрыть':'Предпросмотр';return;}
    const copy=e.target.closest('[data-mail-copy]');if(copy){const row=window.ATOM_STATUS_MAILER_DATA?.[Number(copy.dataset.mailCopy)];if(row)copyText(`Тема: ${row.mail.subject}\n\n${row.mail.body}`,copy);return;}
    const open=e.target.closest('[data-mail-open]');if(open&&!open.disabled){const row=window.ATOM_STATUS_MAILER_DATA?.[Number(open.dataset.mailOpen)];if(!row)return;const email=String(row.person.email||'').trim();if(!email)return;const href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(row.mail.subject)}&body=${encodeURIComponent(row.mail.body)}`;const a=document.createElement('a');a.href=href;a.style.display='none';document.body.appendChild(a);a.click();a.remove();return;}
  });

  function patch(){styles();ensureNav();if(location.hash===HASH)render();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  window.addEventListener('hashchange',queue);
  window.addEventListener('popstate',queue);
  ['atom-sync-update','atom-core-data-changed','atom-team-activity-changed','atom-project-reconciled','atom-view-rendered'].forEach(ev=>window.addEventListener(ev,()=>{if(location.hash===HASH)queue();}));
  new MutationObserver(()=>{if(!document.getElementById('status-mailer-nav'))queue();}).observe(document.body,{childList:true,subtree:true});
  window.ATOM_STATUS_MAILER={version:VERSION,render,buildRecipients};
  setTimeout(queue,500);setTimeout(queue,1400);
})();