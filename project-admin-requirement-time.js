(function(){
  const VERSION='1.0.1';
  const META_PREFIX='atom-core-requirement-meta-';
  let queued=false;

  const pad=n=>String(n).padStart(2,'0');
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'');return v??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const fmtDateTime=value=>{
    if(!value)return'Не задано';
    const d=new Date(String(value).includes('T')?value:`${value}T00:00`);
    if(!Number.isFinite(d.getTime()))return String(value);
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const toParts=value=>{
    const d=new Date(Number(value));
    if(!Number.isFinite(d.getTime()))return{date:'',time:''};
    return{date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`};
  };

  function periodDefaults(stageId){
    const c=window.ATOM_CORE;let p=null;
    try{p=c?.periodForRequirement?.({id:'__pa_new_time__',stageId:Number(stageId)||1,custom:false})||null;}catch{}
    let start={date:'',time:'09:00'},end={date:'',time:'18:00'};
    if(Number.isFinite(Number(p?.start)))start=toParts(Number(p.start));
    else if(p?.startDate)start={date:p.startDate,time:'09:00'};
    if(Number.isFinite(Number(p?.end))){end=toParts(Number(p.end));if(end.time==='00:00')end.time='18:00';}
    else if(p?.endDate)end={date:p.endDate,time:'18:00'};
    return{start,end};
  }

  function styles(){
    if(document.getElementById('pa-requirement-time-css'))return;
    const s=document.createElement('style');s.id='pa-requirement-time-css';s.textContent=`
      .pa-add.req.pa-time-add{grid-template-columns:minmax(260px,1.4fr) 210px 145px 110px 145px 110px auto!important}
      .pa-time-field input{min-width:0}
      @media(max-width:1250px){.pa-add.req.pa-time-add{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(max-width:760px){.pa-add.req.pa-time-add{grid-template-columns:1fr!important}}
    `;document.head.appendChild(s);
  }

  function injectForm(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const form=document.querySelector('#pa-panel .pa-add.req');
    const stage=document.getElementById('pa-new-req-stage');
    const button=document.getElementById('pa-add-req');
    if(!form||!stage||!button)return;
    styles();form.classList.add('pa-time-add');
    if(document.getElementById('pa-new-req-start-date'))return;
    const d=periodDefaults(stage.value);
    const html=`
      <div class="pa-field pa-time-field"><label>Дата начала</label><input id="pa-new-req-start-date" type="date" value="${d.start.date}" required></div>
      <div class="pa-field pa-time-field"><label>Время начала</label><input id="pa-new-req-start-time" type="time" step="60" value="${d.start.time||'09:00'}" required></div>
      <div class="pa-field pa-time-field"><label>Дата окончания</label><input id="pa-new-req-end-date" type="date" value="${d.end.date}" required></div>
      <div class="pa-field pa-time-field"><label>Время окончания</label><input id="pa-new-req-end-time" type="time" step="60" value="${d.end.time||'18:00'}" required></div>`;
    button.insertAdjacentHTML('beforebegin',html);
  }

  function refreshDefaults(){
    const stage=document.getElementById('pa-new-req-stage');if(!stage)return;
    const d=periodDefaults(stage.value);
    const sd=document.getElementById('pa-new-req-start-date'),st=document.getElementById('pa-new-req-start-time'),ed=document.getElementById('pa-new-req-end-date'),et=document.getElementById('pa-new-req-end-time');
    if(sd)sd.value=d.start.date;if(st)st.value=d.start.time||'09:00';if(ed)ed.value=d.end.date;if(et)et.value=d.end.time||'18:00';
  }

  function patchRows(){
    if(!location.hash.startsWith('#management/requirements'))return;

    // requirements-time.js is the single owner of period cells and edit controls.
    // The legacy renderer below is used only if that module is not available.
    if(window.ATOM_REQUIREMENTS_TIME?.patch)return;

    document.querySelectorAll('#pa-panel tr[data-pa-req]').forEach(row=>{
      const id=row.dataset.paReq,m=read(`${META_PREFIX}${id}`,null);if(!m?.customStartAt||!m?.customEndAt)return;
      const cell=row.children[2];if(!cell)return;
      cell.innerHTML=`<b>${fmtDateTime(m.customStartAt)} - ${fmtDateTime(m.customEndAt)}</b><br><span class="pa-note">индивидуальный срок</span>`;
    });
  }

  function addRequirement(){
    const c=window.ATOM_CORE;
    const text=document.getElementById('pa-new-req')?.value.trim();
    const team=document.getElementById('pa-req-team')?.value||'';
    const stage=Number(document.getElementById('pa-new-req-stage')?.value||1);
    const sd=document.getElementById('pa-new-req-start-date')?.value||'';
    const st=document.getElementById('pa-new-req-start-time')?.value||'';
    const ed=document.getElementById('pa-new-req-end-date')?.value||'';
    const et=document.getElementById('pa-new-req-end-time')?.value||'';
    if(!text)return alert('Укажите, что нужно получить');
    if(!team)return alert('Выберите команду');
    if(!sd||!st||!ed||!et)return alert('Укажите дату и время начала и окончания');
    const startAt=`${sd}T${st}`,endAt=`${ed}T${et}`;
    const startTs=new Date(startAt).getTime(),endTs=new Date(endAt).getTime();
    if(!Number.isFinite(startTs)||!Number.isFinite(endTs))return alert('Проверьте дату и время');
    if(endTs<=startTs)return alert('Окончание должно быть позже начала');
    const req=c?.addRequirement?.(team,text,stage);if(!req)return;
    const key=`${META_PREFIX}${req.id}`,m=read(key,{})||{};
    m.stageId=stage;m.customStartAt=startAt;m.customEndAt=endAt;m.customStartDate=sd;m.customEndDate=ed;
    write(key,m);
    c.reconcile?.();
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'requirement-add-datetime',id:req.id,startAt,endAt}}));
    setTimeout(()=>window.ATOM_PROJECT_ADMIN?.open?.(),0);
  }

  document.addEventListener('change',e=>{
    if(e.target.closest('#pa-new-req-stage'))setTimeout(refreshDefaults,0);
  },true);

  document.addEventListener('click',e=>{
    if(!e.target.closest('#pa-add-req'))return;
    if(!document.getElementById('pa-new-req-start-time'))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    addRequirement();
  },true);

  function patch(){injectForm();patchRows();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_PROJECT_ADMIN_REQUIREMENT_TIME={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);setTimeout(queue,1500);
})();