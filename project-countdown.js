(function(){
  const START_KEY='atom-project-started-at';
  const PROJECT_DAYS=91;
  const PROJECT_DURATION_MS=PROJECT_DAYS*24*60*60*1000;
  let countdownTimer=null;
  const pad=n=>String(n).padStart(2,'0');
  function formatRemaining(ms){const total=Math.max(0,Math.floor(ms/1000)),days=Math.floor(total/86400),hours=Math.floor((total%86400)/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;return `${pad(days)} дн. ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;}
  function formatFinish(ts){return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ts));}
  function ensureCountdown(){
    const card=document.querySelector('.project-start-card');
    if(!card||document.getElementById('project-countdown'))return;
    const wrap=document.createElement('div');wrap.className='project-countdown-wrap';wrap.innerHTML=`<div class="label">До завершения проекта</div><div id="project-countdown" class="project-timer">91 дн. 00:00:00</div><div id="project-finish-at" class="start-meta">13 недель после старта</div>`;
    const button=card.querySelector('#start-project-btn');if(button)card.insertBefore(wrap,button);else card.appendChild(wrap);
    if(!document.getElementById('project-countdown-style')){const style=document.createElement('style');style.id='project-countdown-style';style.textContent='.project-countdown-wrap{min-width:230px}.project-countdown-wrap .project-timer{white-space:nowrap}@media(max-width:900px){.project-countdown-wrap{min-width:0;width:100%}}';document.head.appendChild(style);}
  }
  function updateCountdown(){
    ensureCountdown();
    const counter=document.getElementById('project-countdown'),finishLabel=document.getElementById('project-finish-at');if(!counter||!finishLabel)return;
    const raw=localStorage.getItem(START_KEY);
    if(!raw){counter.textContent='91 дн. 00:00:00';finishLabel.textContent='13 недель после старта';return;}
    const start=Number(raw),finish=start+PROJECT_DURATION_MS,remaining=finish-Date.now();
    counter.textContent=formatRemaining(remaining);
    finishLabel.textContent=remaining>0?`Плановое завершение: ${formatFinish(finish)}`:`Плановый срок истек: ${formatFinish(finish)}`;
  }
  const appRoot=document.getElementById('app');if(appRoot){const observer=new MutationObserver(()=>requestAnimationFrame(updateCountdown));observer.observe(appRoot,{childList:true});}
  countdownTimer=setInterval(updateCountdown,1000);updateCountdown();
})();