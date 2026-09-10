(function(){
  const SOURCES_KEY='atom-custom-sources-v1';
  const DICT_KEY='atom-custom-dictionary-v1';

  const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')||[]}catch{return[]}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

  function sourceStatuses(){
    try{
      const refs=JSON.parse(localStorage.getItem('atom-reference-data-v1')||'{}');
      if(Array.isArray(refs.source)&&refs.source.length)return refs.source;
    }catch{}
    return ['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово'];
  }

  function responsibleOptions(){
    try{
      const refs=JSON.parse(localStorage.getItem('atom-reference-data-v1')||'{}');
      if(Array.isArray(refs.responsibles)&&refs.responsibles.length)return refs.responsibles;
    }catch{}
    return ['Не назначен','Иван Корытник','Александр Костылев'];
  }

  function ensureStyles(){
    if(document.getElementById('custom-data-css'))return;
    const style=document.createElement('style');
    style.id='custom-data-css';
    style.textContent=`
      .custom-add-card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;margin:0 0 14px;box-shadow:0 2px 8px rgba(20,45,46,.03)}
      .custom-add-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}
      .custom-add-head h3{margin:0;font-size:15px}
      .custom-add-head small{color:var(--muted)}
      .custom-source-grid{display:grid;grid-template-columns:1.1fr 1.6fr 1.5fr 1fr 1fr auto;gap:8px;align-items:end}
      .custom-dict-grid{display:grid;grid-template-columns:1.1fr 1.1fr 1.7fr 1fr auto;gap:8px;align-items:end}
      .custom-field label{display:block;font-size:10px;color:var(--muted);margin-bottom:4px}
      .custom-field input,.custom-field select{width:100%;min-width:0;padding:8px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;font:inherit;font-size:12px;color:var(--text)}
      .custom-delete,.custom-edit{border:0;background:transparent;cursor:pointer;font-size:11px;padding:4px 6px;border-radius:6px}
      .custom-edit{color:var(--accent-dark)}.custom-delete{color:#a53636}
      .custom-row-actions{white-space:nowrap}
      .custom-source-badge{display:inline-block;padding:3px 6px;border-radius:999px;background:#eef7f6;color:#0f6962;font-size:10px;font-weight:700}
      @media(max-width:1100px){.custom-source-grid,.custom-dict-grid{grid-template-columns:1fr 1fr}.custom-add-card .btn{width:max-content}}
      @media(max-width:650px){.custom-source-grid,.custom-dict-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function sourceNames(){
    const base=Array.isArray(DATA?.sources_list)?DATA.sources_list.map(r=>r[0]):[];
    const custom=read(SOURCES_KEY).map(x=>x.name);
    return [...new Set([...base,...custom].filter(Boolean))];
  }

  function sourceStatus(id){
    return localStorage.getItem(`atom-source-status-custom-${id}`)||'Не начато';
  }

  function sourceOptions(selected){
    const list=sourceStatuses().slice();
    if(selected&&!list.includes(selected))list.push(selected);
    return list.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
  }

  function responsibleSelect(selected){
    const list=responsibleOptions().slice();
    if(selected&&!list.includes(selected))list.push(selected);
    return list.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');
  }

  function injectSources(){
    const title=[...app.querySelectorAll('.section-title h2')].find(x=>x.textContent.trim()==='Источники данных');
    if(!title||document.getElementById('custom-source-card'))return;
    const section=title.closest('.section-title');
    const table=section?.parentElement?.querySelector('table.table');
    if(!section||!table)return;

    const card=document.createElement('div');
    card.id='custom-source-card';
    card.className='custom-add-card';
    card.innerHTML=`<div class="custom-add-head"><h3>+ Добавить источник данных</h3><small>Новый источник попадет в общий реестр</small></div>
      <div class="custom-source-grid">
        <div class="custom-field"><label>Источник</label><input id="cs-name" placeholder="Например, Telegram"></div>
        <div class="custom-field"><label>Какие данные</label><input id="cs-data" placeholder="Лиды, обращения, UTM, звонки..."></div>
        <div class="custom-field"><label>Целевая связка</label><input id="cs-target" placeholder="Например, ELMA / Lead ID"></div>
        <div class="custom-field"><label>Ответственный</label><select id="cs-owner">${responsibleSelect('Не назначен')}</select></div>
        <div class="custom-field"><label>Статус</label><select id="cs-status">${sourceOptions('Не начато')}</select></div>
        <button class="btn primary" id="add-custom-source">Добавить</button>
      </div>`;
    section.insertAdjacentElement('afterend',card);

    const tbody=table.querySelector('tbody');
    if(!tbody)return;
    read(SOURCES_KEY).forEach(item=>{
      const tr=document.createElement('tr');
      tr.dataset.customSourceId=item.id;
      tr.innerHTML=`<td><b>${esc(item.name)}</b><br><span class="custom-source-badge">Добавлено вручную</span></td><td>${esc(item.data)}</td><td>${esc(item.target)}</td><td><select class="source-status-select custom-source-status" data-source-index="custom-${esc(item.id)}" data-custom-id="${esc(item.id)}">${sourceOptions(sourceStatus(item.id))}</select><div style="margin-top:5px;font-size:10px;color:var(--muted)">${esc(item.owner||'Не назначен')}</div></td><td class="custom-row-actions"><button class="custom-edit" data-edit-source="${esc(item.id)}">Изменить</button><button class="custom-delete" data-delete-source="${esc(item.id)}">Удалить</button></td>`;
      tbody.appendChild(tr);
    });

    const headRow=table.querySelector('thead tr');
    if(headRow&&!headRow.querySelector('[data-custom-actions-head]')){
      const th=document.createElement('th');th.dataset.customActionsHead='1';th.textContent='';headRow.appendChild(th);
    }
  }

  function injectDictionary(){
    const title=[...app.querySelectorAll('.section-title h2')].find(x=>x.textContent.trim()==='Data Dictionary');
    if(!title||document.getElementById('custom-dictionary-card'))return;
    const section=title.closest('.section-title');
    const table=section?.parentElement?.querySelector('table.table');
    if(!section||!table)return;

    const datalist=sourceNames().map(x=>`<option value="${esc(x)}"></option>`).join('');
    const card=document.createElement('div');
    card.id='custom-dictionary-card';
    card.className='custom-add-card';
    card.innerHTML=`<div class="custom-add-head"><h3>+ Добавить Data Dictionary</h3><small>Добавить новое поле в словарь данных</small></div>
      <div class="custom-dict-grid">
        <div class="custom-field"><label>Поле</label><input id="cd-field" placeholder="Например, lead_source"></div>
        <div class="custom-field"><label>Источник / система</label><input id="cd-system" list="custom-source-list" placeholder="ELMA, сайт, 1С..."><datalist id="custom-source-list">${datalist}</datalist></div>
        <div class="custom-field"><label>Назначение</label><input id="cd-purpose" placeholder="Для чего используется поле"></div>
        <div class="custom-field"><label>Класс</label><select id="cd-class"><option value="required">Обязательно</option><option value="critical">Критично</option></select></div>
        <button class="btn primary" id="add-custom-dictionary">Добавить</button>
      </div>`;
    section.insertAdjacentElement('afterend',card);

    const tbody=table.querySelector('tbody');
    if(!tbody)return;
    read(DICT_KEY).forEach(item=>{
      const tr=document.createElement('tr');
      tr.dataset.customDictionaryId=item.id;
      tr.innerHTML=`<td><b>${esc(item.field)}</b></td><td>${esc(item.system)}</td><td>${esc(item.purpose)}</td><td><span class="badge ${item.class==='critical'?'bad':'work'}">${item.class==='critical'?'Критично':'Обязательно'}</span></td><td><label><input type="checkbox" class="custom-dictionary-ready" data-custom-dictionary-ready="${esc(item.id)}" ${item.ready?'checked':''}> <span>${item.ready?'Готово':'Не готово'}</span></label></td><td class="custom-row-actions"><button class="custom-edit" data-edit-dictionary="${esc(item.id)}">Изменить</button><button class="custom-delete" data-delete-dictionary="${esc(item.id)}">Удалить</button></td>`;
      tbody.appendChild(tr);
    });

    const headRow=table.querySelector('thead tr');
    if(headRow&&!headRow.querySelector('[data-custom-actions-head]')){
      const th=document.createElement('th');th.dataset.customActionsHead='1';th.textContent='';headRow.appendChild(th);
    }
  }

  function patchOverview(){
    const label=[...app.querySelectorAll('.card.kpi .label')].find(x=>x.textContent.trim()==='Источники готовы');
    if(!label)return;
    const card=label.closest('.card.kpi');
    const value=card?.querySelector('.value');
    if(!value)return;
    const custom=read(SOURCES_KEY);
    const baseTotal=Array.isArray(DATA?.sources_list)?DATA.sources_list.length:(Number(DATA?.sources)||0);
    const baseReady=Array.isArray(DATA?.sources_list)?DATA.sources_list.filter((_,i)=>getSourceStatus(i)==='Готово').length:0;
    const customReady=custom.filter(x=>sourceStatus(x.id)==='Готово').length;
    value.textContent=`${baseReady+customReady} / ${baseTotal+custom.length}`;
  }

  function refresh(){
    ensureStyles();
    injectSources();
    injectDictionary();
    patchOverview();
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#add-custom-source')){
      const name=document.getElementById('cs-name')?.value.trim()||'';
      const data=document.getElementById('cs-data')?.value.trim()||'';
      const target=document.getElementById('cs-target')?.value.trim()||'';
      const owner=document.getElementById('cs-owner')?.value||'Не назначен';
      const status=document.getElementById('cs-status')?.value||'Не начато';
      if(!name)return alert('Укажи название источника');
      const list=read(SOURCES_KEY);
      if(list.some(x=>x.name.toLowerCase()===name.toLowerCase()))return alert('Такой источник уже добавлен');
      const id=uid();
      list.push({id,name,data,target,owner});
      write(SOURCES_KEY,list);
      localStorage.setItem(`atom-source-status-custom-${id}`,status);
      render('sources');
      return;
    }

    const editSource=e.target.closest('[data-edit-source]');
    if(editSource){
      const id=editSource.dataset.editSource,list=read(SOURCES_KEY),item=list.find(x=>x.id===id);if(!item)return;
      const name=prompt('Источник',item.name);if(name===null||!name.trim())return;
      const data=prompt('Какие данные',item.data||'');if(data===null)return;
      const target=prompt('Целевая связка',item.target||'');if(target===null)return;
      const owner=prompt('Ответственный',item.owner||'Не назначен');if(owner===null)return;
      Object.assign(item,{name:name.trim(),data:data.trim(),target:target.trim(),owner:owner.trim()||'Не назначен'});write(SOURCES_KEY,list);render('sources');return;
    }

    const deleteSource=e.target.closest('[data-delete-source]');
    if(deleteSource){
      const id=deleteSource.dataset.deleteSource;if(!confirm('Удалить добавленный источник данных?'))return;
      write(SOURCES_KEY,read(SOURCES_KEY).filter(x=>x.id!==id));localStorage.removeItem(`atom-source-status-custom-${id}`);render('sources');return;
    }

    if(e.target.closest('#add-custom-dictionary')){
      const field=document.getElementById('cd-field')?.value.trim()||'';
      const system=document.getElementById('cd-system')?.value.trim()||'';
      const purpose=document.getElementById('cd-purpose')?.value.trim()||'';
      const cls=document.getElementById('cd-class')?.value||'required';
      if(!field)return alert('Укажи название поля');
      const list=read(DICT_KEY);
      if(list.some(x=>x.field.toLowerCase()===field.toLowerCase()&&x.system.toLowerCase()===system.toLowerCase()))return alert('Такое поле уже добавлено');
      list.push({id:uid(),field,system,purpose,class:cls,ready:false});write(DICT_KEY,list);render('dictionary');return;
    }

    const editDictionary=e.target.closest('[data-edit-dictionary]');
    if(editDictionary){
      const id=editDictionary.dataset.editDictionary,list=read(DICT_KEY),item=list.find(x=>x.id===id);if(!item)return;
      const field=prompt('Поле',item.field);if(field===null||!field.trim())return;
      const system=prompt('Источник / система',item.system||'');if(system===null)return;
      const purpose=prompt('Назначение',item.purpose||'');if(purpose===null)return;
      Object.assign(item,{field:field.trim(),system:system.trim(),purpose:purpose.trim()});write(DICT_KEY,list);render('dictionary');return;
    }

    const deleteDictionary=e.target.closest('[data-delete-dictionary]');
    if(deleteDictionary){
      const id=deleteDictionary.dataset.deleteDictionary;if(!confirm('Удалить эту строку Data Dictionary?'))return;
      write(DICT_KEY,read(DICT_KEY).filter(x=>x.id!==id));render('dictionary');return;
    }
  });

  document.addEventListener('change',e=>{
    const status=e.target.closest('.custom-source-status');
    if(status){localStorage.setItem(`atom-source-status-custom-${status.dataset.customId}`,status.value);patchOverview();return;}
    const ready=e.target.closest('.custom-dictionary-ready');
    if(ready){const id=ready.dataset.customDictionaryReady,list=read(DICT_KEY),item=list.find(x=>x.id===id);if(item){item.ready=ready.checked;write(DICT_KEY,list);const span=ready.parentElement?.querySelector('span');if(span)span.textContent=ready.checked?'Готово':'Не готово';}return;}
  });

  let scheduled=false;
  const mo=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});});
  mo.observe(app,{childList:true,subtree:true});
  window.addEventListener('atom-sync-update',refresh);
  refresh();
  window.ATOM_CUSTOM_DATA={refresh};
})();