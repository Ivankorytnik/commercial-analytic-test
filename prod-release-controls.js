(function(){
  const PROD_URL='https://ivankorytnik.github.io/commercial-analytics/';
  const PROD_REPO_URL='https://github.com/Ivankorytnik/commercial-analytics';

  function styles(){
    if(document.getElementById('prod-release-controls-css')) return;
    const s=document.createElement('style');
    s.id='prod-release-controls-css';
    s.textContent=`
      .pa-release-card{grid-column:1/-1;background:#fff;border:1px solid var(--line);border-radius:11px;padding:14px}
      .pa-release-card h3{margin:0 0 8px;font-size:14px}.pa-release-card p{font-size:11px;color:var(--muted);line-height:1.5}
      .pa-release-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
      .pa-release-safe{background:#0f6962!important;color:#fff!important;border-color:#0f6962!important;font-weight:700}
      .pa-release-force{background:#a53636!important;color:#fff!important;border-color:#a53636!important;font-weight:700}
      .pa-release-rules{margin:10px 0 0;padding-left:18px;font-size:11px;color:#425959;line-height:1.55}
      .pa-release-rules li{margin:4px 0}.pa-release-note{font-size:10px;color:var(--muted)}
      .pa-release-modal-bg{position:fixed;inset:0;z-index:99999;background:rgba(18,31,32,.5);display:flex;align-items:center;justify-content:center;padding:18px}
      .pa-release-modal{width:min(700px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #d9e4e4;border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.24);padding:18px}
      .pa-release-modal h2{margin:0 0 8px;font-size:21px}.pa-release-modal p{font-size:12px;line-height:1.5;color:#526a6b}
      .pa-release-warn{padding:11px 12px;border-radius:9px;background:#fff0f0;border:1px solid #efcaca;color:#8e3030;font-size:11px;line-height:1.5;margin:10px 0}
      .pa-release-checks{display:grid;gap:7px;margin:12px 0}.pa-release-checks label{display:flex;gap:8px;align-items:flex-start;padding:8px 9px;background:#f7f9f9;border:1px solid #e0e8e8;border-radius:8px;font-size:11px;line-height:1.4}
      .pa-release-modal-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}
      .pa-release-input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #ccd9d9;border-radius:8px;font:inherit}
    `;
    document.head.appendChild(s);
  }

  function card(){
    return `<div class="pa-release-card" id="pa-release-card">
      <h3>Релиз TEST -> PROD</h3>
      <p>Два режима выпуска. Обычный релиз сохраняет рабочие данные PROD. Безусловный релиз означает полную замену PROD версией TEST.</p>
      <ol class="pa-release-rules">
        <li><b>Обычный релиз:</b> код и согласованные изменения структуры, данные PROD сохраняются, справочники merge.</li>
        <li><b>Безусловный релиз:</b> полный перенос TEST -> PROD с заменой кода, конфигурации и данных PROD данными TEST.</li>
      </ol>
      <div class="pa-release-actions">
        <button type="button" class="btn pa-release-safe" id="pa-release-safe">Залить на PROD</button>
        <button type="button" class="btn pa-release-force" id="pa-release-force">Залить на PROD безусловно</button>
        <button type="button" class="btn" id="pa-release-open-prod">Открыть PROD</button>
        <span class="pa-release-note">Безусловный режим предназначен только для полной замены PROD.</span>
      </div>
    </div>`;
  }

  function inject(){
    if(!location.hash.startsWith('#management/settings')) return;
    styles();
    const host=document.querySelector('#pa-panel .pa-settings');
    if(!host || document.getElementById('pa-release-card')) return;
    host.insertAdjacentHTML('beforeend',card());
  }

  function close(){document.getElementById('pa-release-modal-bg')?.remove();}

  function showSafe(){
    close();styles();
    const el=document.createElement('div');el.className='pa-release-modal-bg';el.id='pa-release-modal-bg';
    el.innerHTML=`<div class="pa-release-modal"><h2>Залить на PROD</h2><p>Безопасный режим релиза.</p><div class="pa-release-checks"><label><input type="checkbox" checked disabled><span>Сохранить рабочие данные PROD.</span></label><label><input type="checkbox" checked disabled><span>Не переносить тестовые записи.</span></label><label><input type="checkbox" checked disabled><span>Справочники объединять, а не заменять.</span></label><label><input type="checkbox" checked disabled><span>Структуру менять миграциями.</span></label></div><div class="pa-release-warn"><b>Текущая архитектура:</b> TEST и PROD используют общий облачный sync-контур. Поэтому автоматический перенос данных между ними отдельно не выполняется.</div><div class="pa-release-modal-actions"><button class="btn" id="pa-release-repo">Открыть PROD repository</button><button class="btn primary" id="pa-release-close">Закрыть</button></div></div>`;
    document.body.appendChild(el);
  }

  function showForce(){
    close();styles();
    const el=document.createElement('div');el.className='pa-release-modal-bg';el.id='pa-release-modal-bg';
    el.innerHTML=`<div class="pa-release-modal"><h2>Безусловный перенос TEST -> PROD</h2><div class="pa-release-warn"><b>Полная замена PROD.</b><br>Этот режим означает: код TEST заменяет код PROD, конфигурация TEST заменяет конфигурацию PROD, данные TEST должны заменить данные PROD без merge и без сохранения отличий PROD.</div><p>Для защиты от случайного запуска введите <b>PROD</b>.</p><input class="pa-release-input" id="pa-force-confirm" autocomplete="off" placeholder="Введите PROD"><div class="pa-release-modal-actions"><button class="btn" id="pa-release-close">Отмена</button><button class="btn pa-release-force" id="pa-force-confirm-btn" disabled>Подтвердить полный перенос</button></div></div>`;
    document.body.appendChild(el);
  }

  document.addEventListener('input',e=>{
    if(e.target.id==='pa-force-confirm'){
      const btn=document.getElementById('pa-force-confirm-btn');if(btn)btn.disabled=e.target.value.trim()!=='PROD';
    }
  });

  document.addEventListener('click',e=>{
    if(e.target.closest('#pa-release-safe')){e.preventDefault();showSafe();return;}
    if(e.target.closest('#pa-release-force')){e.preventDefault();showForce();return;}
    if(e.target.closest('#pa-release-open-prod')){e.preventDefault();window.open(PROD_URL,'_blank','noopener');return;}
    if(e.target.closest('#pa-release-repo')){e.preventDefault();window.open(PROD_REPO_URL,'_blank','noopener');return;}
    if(e.target.closest('#pa-release-close')){e.preventDefault();close();return;}
    if(e.target.closest('#pa-force-confirm-btn')){
      e.preventDefault();
      localStorage.setItem('atom-prod-release-request',JSON.stringify({mode:'force-full-replace',requestedAt:new Date().toISOString()}));
      close();
      alert('Режим полного переноса зафиксирован. Для фактической замены PROD нужен серверный deploy-механизм с доступом к GitHub и отдельным TEST/PROD хранилищам.');
      return;
    }
    if(e.target.id==='pa-release-modal-bg')close();
  });

  window.addEventListener('hashchange',()=>setTimeout(inject,0));
  const observer=new MutationObserver(inject);observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(inject,800);
})();
