(function(){
  const VERSION='1.0.0';
  let queued=false;

  const splitDateTime=value=>{
    const s=String(value||'');
    if(!s)return{date:'',time:''};
    const [date,timeRaw='']=s.split('T');
    return{date,time:(timeRaw||'').slice(0,5)};
  };

  function styles(){
    if(document.getElementById('requirements-time-visible-css'))return;
    const s=document.createElement('style');
    s.id='requirements-time-visible-css';
    s.textContent=`
      .req-original-datetime-field{display:none!important}
      .req-explicit-time-field input{min-width:112px}
      .req-explicit-date-field input{min-width:145px}
      .req-enh-add.req-time-explicit{grid-template-columns:minmax(220px,1.3fr) 170px 210px 150px 120px 150px 120px auto!important}
      @media(max-width:1250px){.req-enh-add.req-time-explicit{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
      @media(max-width:760px){.req-enh-add.req-time-explicit{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(s);
  }

  function syncHiddenFromVisible(){
    const hiddenStart=document.getElementById('req-enh-new-start');
    const hiddenEnd=document.getElementById('req-enh-new-end');
    const sd=document.getElementById('req-visible-start-date');
    const st=document.getElementById('req-visible-start-time');
    const ed=document.getElementById('req-visible-end-date');
    const et=document.getElementById('req-visible-end-time');
    if(!hiddenStart||!hiddenEnd||!sd||!st||!ed||!et)return;
    hiddenStart.value=sd.value&&st.value?`${sd.value}T${st.value}`:'';
    hiddenEnd.value=ed.value&&et.value?`${ed.value}T${et.value}`:'';
  }

  function syncVisibleFromHidden(force=false){
    const hiddenStart=document.getElementById('req-enh-new-start');
    const hiddenEnd=document.getElementById('req-enh-new-end');
    const sd=document.getElementById('req-visible-start-date');
    const st=document.getElementById('req-visible-start-time');
    const ed=document.getElementById('req-visible-end-date');
    const et=document.getElementById('req-visible-end-time');
    if(!hiddenStart||!hiddenEnd||!sd||!st||!ed||!et)return;
    const a=splitDateTime(hiddenStart.value),b=splitDateTime(hiddenEnd.value);
    if(force||!sd.value)sd.value=a.date;
    if(force||!st.value)st.value=a.time||'09:00';
    if(force||!ed.value)ed.value=b.date;
    if(force||!et.value)et.value=b.time||'18:00';
    syncHiddenFromVisible();
  }

  function ensureFields(){
    if(!location.hash.startsWith('#management/requirements'))return;
    const form=document.querySelector('.req-enh-add');
    const start=document.getElementById('req-enh-new-start');
    const end=document.getElementById('req-enh-new-end');
    if(!form||!start||!end)return;
    styles();
    form.classList.add('req-time-explicit');
    const startWrap=start.closest('.pa-field');
    const endWrap=end.closest('.pa-field');
    if(startWrap)startWrap.classList.add('req-original-datetime-field');
    if(endWrap)endWrap.classList.add('req-original-datetime-field');

    if(!document.getElementById('req-visible-start-date')){
      const startDate=document.createElement('div');
      startDate.className='pa-field req-explicit-date-field';
      startDate.innerHTML='<label>Дата начала</label><input type="date" id="req-visible-start-date" required>';
      const startTime=document.createElement('div');
      startTime.className='pa-field req-explicit-time-field';
      startTime.innerHTML='<label>Время начала</label><input type="time" id="req-visible-start-time" step="60" required>';
      const endDate=document.createElement('div');
      endDate.className='pa-field req-explicit-date-field';
      endDate.innerHTML='<label>Дата окончания</label><input type="date" id="req-visible-end-date" required>';
      const endTime=document.createElement('div');
      endTime.className='pa-field req-explicit-time-field';
      endTime.innerHTML='<label>Время окончания</label><input type="time" id="req-visible-end-time" step="60" required>';

      if(startWrap){form.insertBefore(startDate,startWrap);form.insertBefore(startTime,startWrap);}
      else form.appendChild(startDate),form.appendChild(startTime);
      if(endWrap){form.insertBefore(endDate,endWrap);form.insertBefore(endTime,endWrap);}
      else form.appendChild(endDate),form.appendChild(endTime);
      syncVisibleFromHidden(true);
    }else{
      syncVisibleFromHidden(false);
    }
  }

  document.addEventListener('input',e=>{
    if(!e.target.closest('#req-visible-start-date,#req-visible-start-time,#req-visible-end-date,#req-visible-end-time'))return;
    syncHiddenFromVisible();
  });
  document.addEventListener('change',e=>{
    if(e.target.closest('#req-visible-start-date,#req-visible-start-time,#req-visible-end-date,#req-visible-end-time')){
      syncHiddenFromVisible();
      return;
    }
    if(e.target.closest('#req-enh-new-stage'))setTimeout(()=>syncVisibleFromHidden(true),10);
  });

  function patch(){ensureFields();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patch();});}
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  ['hashchange','atom-view-rendered','atom-sync-update','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_REQUIREMENTS_TIME_VISIBLE={version:VERSION,patch};
  setTimeout(queue,200);setTimeout(queue,700);setTimeout(queue,1500);
})();