(function(){
  const VERSION='1.0.0';

  function styles(){
    if(document.getElementById('faq-project-progress-css'))return;
    const s=document.createElement('style');
    s.id='faq-project-progress-css';
    s.textContent=`
      .faq-progress-logic{display:grid;gap:10px}
      .faq-progress-formula{padding:10px 12px;border-radius:9px;background:#eefcfa;border-left:4px solid var(--accent);color:#24494a;font-size:11px;line-height:1.5}
      .faq-progress-section{padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:#fbfdfd}
      .faq-progress-section h4{margin:0 0 7px;font-size:11px;color:#173536}
      .faq-progress-section p{margin:0 0 6px;font-size:11px;line-height:1.5}.faq-progress-section p:last-child{margin-bottom:0}
      .faq-progress-statuses{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
      .faq-progress-chip{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef5f4;color:#3d5d5e;font-size:9px;font-weight:700}
      .faq-progress-stage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:7px}
      .faq-progress-stage{padding:7px 8px;border-radius:7px;background:#f3f7f7;font-size:9px;line-height:1.4;color:#486263}
      .faq-progress-stage b{color:#173536}
      .faq-progress-current{padding:10px 12px;border-radius:9px;background:#102526;color:#e9f5f4;font-size:10px;line-height:1.5}
      .faq-progress-current strong{font-size:16px;color:#fff}
      .faq-progress-current-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;margin-top:7px;color:#c7d8d8}
      .faq-progress-warning{padding:9px 11px;border-radius:8px;background:#fff7e3;color:#765b10;font-size:10px;line-height:1.5}
      @media(max-width:750px){.faq-progress-stage-grid,.faq-progress-current-list{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function currentBreakdown(){
    const c=window.ATOM_CORE;
    if(!c?.stageSummary)return null;
    try{
      const stages=Array.from({length:12},(_,i)=>c.stageSummary(i+1)).filter(x=>x?.relevant);
      const value=c.projectProgress?.()??(stages.length?Math.round(stages.reduce((n,x)=>n+Number(x.progress||0),0)/stages.length):0);
      const activeTeams=window.ATOM_TEAM_ACTIVITY?.activeCount?.();
      const sources=c.sourcesSummary?.();
      return {stages,value,activeTeams,sources};
    }catch{return null;}
  }

  function answerHtml(){
    const cur=currentBreakdown();
    const stageRows=cur?.stages?.length
      ?cur.stages.map(x=>`<div><b>${x.id}. ${escapeHtml(x.name)}</b>: ${Number(x.progress||0)}%</div>`).join('')
      :'<div>Текущая разбивка станет доступна после загрузки данных проекта.</div>';
    const formula=cur?.stages?.length
      ?`(${cur.stages.map(x=>Number(x.progress||0)).join(' + ')}) / ${cur.stages.length} = <strong>${cur.value}%</strong>`
      :'Итог = сумма процентов релевантных этапов / количество релевантных этапов';

    return `<div class="faq-progress-logic">
      <div class="faq-progress-formula"><b>Главная формула.</b> Итоговый процент проекта - это округлённое среднее арифметическое процентов только тех этапов, которые сейчас релевантны активному контуру проекта.<br><b>% проекта = ROUND((P1 + P2 + ... + Pn) / n).</b> Все вошедшие в расчёт этапы имеют одинаковый вес.</div>

      <div class="faq-progress-section"><h4>1. Сначала определяется активный контур</h4>
        <p>Основной источник истины - <b>«Управление проектом → Команды»</b>. Требования неактивной команды в расчёт не входят.</p>
        <p>Источники данных наследуют активность связанных команд. Источник, связанный только с неактивной командой, сохраняется в системе, но исключается из расчёта.</p>
      </div>

      <div class="faq-progress-section"><h4>2. Какие требования участвуют</h4>
        <p>В расчёт этапа попадают требования только активных команд. Требования со статусами <b>«Не актуально»</b>, <b>«В очереди»</b> и <b>«Готово»</b> исключаются из текущего активного пула.</p>
        <p>Для остальных требований используется процент их текущего статуса:</p>
        <div class="faq-progress-statuses">
          <span class="faq-progress-chip">Не запрошено: 0%</span>
          <span class="faq-progress-chip">Запрос подготовлен: 10%</span>
          <span class="faq-progress-chip">Запрос отправлен: 25%</span>
          <span class="faq-progress-chip">В работе: 50%</span>
          <span class="faq-progress-chip">Требует уточнения: 60%</span>
          <span class="faq-progress-chip">Ответ получен: 75%</span>
          <span class="faq-progress-chip">Готово: закрыто</span>
        </div>
        <p style="margin-top:7px">Если требование переведено в <b>«Блокер»</b>, его числовой прогресс сохраняется на уровне предыдущего статуса. Блокер меняет состояние этапа на проблемное, но сам по себе не обнуляет уже достигнутый процент.</p>
      </div>

      <div class="faq-progress-section"><h4>3. Как считается процент внутри каждого этапа</h4>
        <div class="faq-progress-stage-grid">
          <div class="faq-progress-stage"><b>Обычные этапы</b><br>Среднее значение процентов активных требований, относящихся к этому этапу.</div>
          <div class="faq-progress-stage"><b>Этап 2. Команды и владельцы</b><br>Назначенные владельцы / количество активных команд × 100%.</div>
          <div class="faq-progress-stage"><b>Этап 3. Источники лидов</b><br>Определённые активные источники / все активные источники × 100%. Источник считается определённым, если его статус уже не «Не начато».</div>
          <div class="faq-progress-stage"><b>Этап 5. Data Dictionary</b><br>Среднее между прогрессом требований этапа и долей готовых полей Data Dictionary, если обе части присутствуют.</div>
          <div class="faq-progress-stage"><b>Этап 6. Сквозные ID</b><br>Среднее между прогрессом требований этапа и готовностью критических ID.</div>
          <div class="faq-progress-stage"><b>Этап 7. Интеграции</b><br>Среднее между прогрессом требований этапа и долей активных источников со статусом «Готово».</div>
        </div>
      </div>

      <div class="faq-progress-section"><h4>4. Какие этапы входят в итоговый знаменатель</h4>
        <p>В общий процент попадает только <b>релевантный этап</b>: у него есть активные учитываемые требования либо соответствующий активный объект расчёта, например активные команды, активные источники, Data Dictionary или критические ID.</p>
        <p>Этап без актуальных работ не получает искусственные 0% и не уменьшает итоговый процент. Он просто не входит в среднее.</p>
      </div>

      <div class="faq-progress-current"><b>Текущая расшифровка расчёта</b><br>${cur?`Активных команд: <b>${cur.activeTeams??'—'}</b>. Активных источников в расчёте: <b>${cur.sources?.total??'—'}</b>. Релевантных этапов: <b>${cur.stages.length}</b>.`:'Данные ещё загружаются.'}<div class="faq-progress-current-list">${stageRows}</div><div style="margin-top:8px">${formula}</div></div>

      <div class="faq-progress-warning"><b>Важно:</b> просрочка и наличие блокера влияют на статус этапа и сигнализируют о проблеме, но процент рассчитывается по фактической готовности объектов и статусов. Изменение активности команды или источника может изменить и состав этапов, и знаменатель итоговой формулы.</div>
    </div>`;
  }

  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  function patch(){
    styles();
    const list=document.querySelector('.faq-current-list');
    if(!list)return;
    const items=[...list.querySelectorAll('.faq-current-item')];
    let item=items.find(x=>/Как считается готовность проекта\?/i.test(x.querySelector('summary')?.textContent||''));
    if(!item)item=items.find(x=>/% выполнения проекта/i.test(x.querySelector('summary')?.textContent||''));
    if(!item)return;
    const summary=item.querySelector('summary');
    const answer=item.querySelector('.faq-current-answer');
    if(!summary||!answer)return;
    const prefix=(summary.textContent.match(/^\s*\d+\.\s*/)||[''])[0];
    summary.textContent=`${prefix}Как считается % выполнения проекта?`;
    answer.innerHTML=answerHtml();
    answer.dataset.progressLogicVersion=VERSION;
  }

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;patch();});
  });
  observer.observe(document.body,{childList:true,subtree:true});

  ['atom-project-progress-changed','atom-team-activity-changed','atom-source-activity-changed','atom-core-data-changed'].forEach(ev=>window.addEventListener(ev,()=>{
    const answer=document.querySelector('.faq-current-answer[data-progress-logic-version]');
    if(answer)answer.innerHTML=answerHtml();
  }));

  document.addEventListener('click',e=>{if(e.target.closest?.('#faq-nav'))setTimeout(patch,0);});
  window.ATOM_FAQ_PROJECT_PROGRESS={version:VERSION,patch,currentBreakdown};
  setTimeout(patch,0);
})();