(function(){
  const VERSION='1.0.0';
  const META_PREFIX='atom-core-requirement-meta-';
  let queued=false;

  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const fmt=value=>{
    if(!value)return'Не задано';
    const p=String(value).split('-');
    return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:String(value);
  };

  function defaultsForStage(stageId){
    const c=window.ATOM_CORE;let p=null;
    try{p=c?.periodForRequirement?.({id:'__pa_new_dates__',stageId:Number(stageId)||1,custom:false})||null;}catch{}
    return {start:p?.startDate||'',end:p?.endDate||''};
  }

  function styles(){
    if(document.getElementById('pa-requirement-dates-css'))return;
    const s=document.createElement('style');
    s.id='pa-requirement-dates-css';
    s.textContent=`
      .pa-add.req.pa-date-add{grid-template-columns:minmax(260px,1.5fr) 220px 160px 160px auto!important}
      @media(max-width:1100px){.pa-add.req.pa-date-add{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:700px){.pa-add.req.pa-date-add{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function injectForm(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const form=document.querySelector('#pa-panel .pa-add.req');
    const stage=document.getElementById('pa-new-req-stage');
    const button=document.getElementById('pa-add-req');
    if(!form||!stage||!button)return;
    styles();
    form.classList.add('pa-date-add');
    if(document.getElementById('pa-new-req-start-date'))return;
    const d=defaultsForStage(stage.value);
    button.insertAdjacentHTML('beforebegin',`
      <div class="pa-field"><label>Дата начала</label><input id="pa-new-req-start-date" type="date" value="${d.start}" required></div>
      <div class="pa-field"><label>Дата окончания</label><input id="pa-new-req-end-date" type="date" value="${d.end}" required></div>`);
  }

  function refreshDefaults(){
    const stage=document.getElementById('pa-new-req-stage');
    const start=document.getElementById('pa-new-req-start-date');
    const end=document.getElementById('pa-new-req-end-date');
    if(!stage||!start||!end)return;
    const d=defaultsForStage(stage.value);
    start.value=d.start;
    end.value=d.end;
  }

  function patchRows(){
    if(!location.hash.startsWith('#management/requirements'))return;
    document.querySelectorAll('#pa-panel tr[data-pa-req]').forEach(row=>{
      const id=row.dataset.paReq,m=read(`${META_PREFIX}${id}`,null);
      if(!m?.customStartDate||!m?.customEndDate)return;
      const cell=row.children[2];
      if(cell)cell.innerHTML=`<b>${fmt(m.customStartDate)} - ${fmt(m.customEndDate)}</b><br><span class="pa-note">индивидуальный срок</span>`;
    });
  }

  function addRequirement(){
    const c=window.ATOM_CORE;
    const text=document.getElementById('pa-new-req')?.value.trim();
    const team=document.getElementById('pa-req-team')?.value||'';
    const stage=Number(document.getElementById('pa-new-req-stage')?.value||1);
    const startDate=document.getElementById('pa-new-req-start-date')?.value||'';
    const endDate=document.getElementById('pa-new-req-end-date')?.value||'';
    if(!text)return alert('Укажите, что нужно получить');
    if(!team)return alert('Выберите команду');
    if(!startDate||!endDate)return alert('Укажите дату начала и дату окончания');
    if(endDate<startDate)return alert('Дата окончания не может быть раньше даты начала');
    const req=c?.addRequirement?.(team,text,stage);
    if(!req)return;
    const key=`${META_PREFIX}${req.id}`,m=read(key,{})||{};
    m.stageId=stage;
    m.customStartDate=startDate;
    m.customEndDate=endDate;
    delete m.customStartAt;
    delete m.customEndAt;
    write(key,m);
    c.reconcile?.();
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-add-dates',id:req.id,startDate,endDate}}));
    setTimeout(()=>window.ATOM_PROJECT_ADMIN?.open?.(),0);
  }

  document.addEventListener('change',e=>{
    if(e.target.closest('#pa-new-req-stage'))setTimeout(refreshDefaults,0);
  },true);

  document.addEventListener('click',e=>{
    if(!e.target.closest('#pa-add-req'))return;
    if(!document.getElementById('pa-new-req-start-date'))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    addRequirement();
  },true);

  function patch(){injectForm();patchRows();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_PROJECT_ADMIN_REQUIREMENT_DATES={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);setTimeout(queue,1500);
})();