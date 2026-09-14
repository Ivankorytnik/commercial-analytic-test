(function(){
  const VERSION='1.1.0';
  const ALL='__all__';
  const STORAGE_KEY='atom-expanded-gantt-team-filter';
  let queued=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const core=()=>window.ATOM_CORE;
  const activity=()=>window.ATOM_TEAM_ACTIVITY;

  function selected(){return sessionStorage.getItem(STORAGE_KEY)||ALL}
  function save(value){sessionStorage.setItem(STORAGE_KEY,value||ALL)}

  function styles(){
    if(document.getElementById('expanded-gantt-team-filter-css'))return;
    const s=document.createElement('style');s.id='expanded-gantt-team-filter-css';s.textContent=`
      .core-xg-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:9px 11px}
      .core-xg-filter-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.core-xg-filter-left label{font-size:10px;font-weight:700;color:#526a6b}.core-xg-team-select{min-width:240px;padding:8px 9px;border:1px solid #ccd9d9;border-radius:7px;background:#fff;color:var(--text);font:inherit;font-size:11px}.core-xg-filter-summary{font-size:10px;color:var(--muted)}
      .core-xg-row.xg-team-hidden{display:none!important}
      @media(max-width:700px){.core-xg-team-select{min-width:100%;width:100%}.core-xg-filter-left{width:100%}}
    `;document.head.appendChild(s);
  }

  function teamList(){
    const c=core();if(!c)return[];
    const rows=[...document.querySelectorAll('.core-xg-wrap .core-xg-row')];
    const fromRows=rows.map(row=>row.querySelector('.core-xg-meta .core-xg-cell')?.textContent.trim()).filter(Boolean);
    const unique=[...new Set(fromRows)];
    if(unique.length)return unique;
    const teams=c.teams?.()||[];
    return activity()?.isActive?teams.filter(t=>activity().isActive(t)):teams;
  }

  function optionHtml(teams,current){
    return `<option value="${ALL}" ${current===ALL?'selected':''}>Все команды</option>${teams.map(t=>`<option value="${esc(t)}" ${current===t?'selected':''}>${esc(t)}</option>`).join('')}`;
  }

  function ensureToolbar(){
    if(location.hash!=='#expanded-gantt')return null;
    const root=document.querySelector('.core-xg');if(!root)return null;
    styles();

    let bar=document.getElementById('core-xg-team-toolbar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='core-xg-team-toolbar';
      bar.className='core-xg-toolbar';
      bar.innerHTML='<div class="core-xg-filter-left"><label for="core-xg-team-select">Команда</label><select id="core-xg-team-select" class="core-xg-team-select"></select></div><div class="core-xg-filter-summary" id="core-xg-filter-summary"></div>';
      const wrap=root.querySelector('.core-xg-wrap');
      if(wrap)root.insertBefore(bar,wrap);else root.appendChild(bar);
    }

    const teams=teamList();
    const current=selected();
    const valid=current===ALL||teams.includes(current)?current:ALL;
    if(valid!==current)save(valid);

    const select=bar.querySelector('#core-xg-team-select');
    const signature=teams.join('\u001f');
    if(select&&bar.dataset.teamSignature!==signature){
      select.innerHTML=optionHtml(teams,valid);
      bar.dataset.teamSignature=signature;
    }else if(select&&document.activeElement!==select&&select.value!==valid){
      select.value=valid;
    }

    return bar;
  }

  function apply(){
    if(location.hash!=='#expanded-gantt')return;
    const bar=ensureToolbar();if(!bar)return;
    const select=bar.querySelector('#core-xg-team-select');
    const value=select?.value||selected();
    save(value);

    const rows=[...document.querySelectorAll('.core-xg-wrap .core-xg-row')];
    let shown=0;
    rows.forEach(row=>{
      const team=row.querySelector('.core-xg-meta .core-xg-cell')?.textContent.trim()||'';
      const visible=value===ALL||team===value;
      row.classList.toggle('xg-team-hidden',!visible);
      if(visible)shown++;
    });

    const summary=bar.querySelector('#core-xg-filter-summary');
    const text=value===ALL?`Показано: ${shown} требований`:`${value} · ${shown} требований`;
    if(summary&&summary.textContent!==text)summary.textContent=text;
  }

  document.addEventListener('change',e=>{
    const select=e.target.closest('#core-xg-team-select');if(!select)return;
    save(select.value);
    apply();
  });

  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  }

  new MutationObserver(mutations=>{
    if(location.hash!=='#expanded-gantt')return;
    const relevant=mutations.some(m=>{
      if(m.target?.closest?.('#core-xg-team-toolbar'))return false;
      return [...m.addedNodes,...m.removedNodes].some(node=>{
        if(node.nodeType!==1)return false;
        return node.matches?.('.core-xg,.core-xg-wrap,.core-xg-row')||node.querySelector?.('.core-xg,.core-xg-wrap,.core-xg-row');
      });
    });
    if(relevant)queue();
  }).observe(document.body,{childList:true,subtree:true});

  ['hashchange','atom-core-ready','atom-sync-update','atom-view-rendered','atom-core-data-changed','atom-team-activity-changed'].forEach(ev=>window.addEventListener(ev,queue));
  window.ATOM_EXPANDED_GANTT_TEAM_FILTER={version:VERSION,apply};
  styles();setTimeout(queue,200);setTimeout(queue,700);setTimeout(queue,1500);
})();