(function(){
  const STATE_KEY='atom-raci-requirement-state-v2';
  const CUSTOM_KEY='atom-raci-custom-requirements-v2';
  const DAY=86400000;
  const TEAM_WINDOWS={
    'Коммерческий блок':[0,14],
    'B2B продажи':[7,35],
    'B2C продажи':[7,35],
    'Маркетинг':[7,35],
    'Сайт':[7,42],
    'Метрики':[7,42],
    '1 линия':[7,35],
    '2 линия':[7,35],
    'ELMA':[14,63],
    'Альфа-Авто':[28,63],
    '1С / финансы':[35,70],
    'DATA / DWH':[35,77],
    'BI':[63,91],
    'ИБ':[0,91]
  };
  const BASE_COUNTS={
    'Коммерческий блок':5,'B2B продажи':8,'B2C продажи':8,'Маркетинг':8,'Сайт':8,'Метрики':8,
    '1 линия':8,'2 линия':8,'ELMA':11,'Альфа-Авто':12,'1С / финансы':11,'DATA / DWH':11,'BI':10,'ИБ':11
  };
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}};
  const pad=n=>String(n).padStart(2,'0');
  const dateInput=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const parseDate=v=>{if(!v)return null;const p=v.split('-').map(Number);if(p.length!==3||p.some(Number.isNaN))return null;return new Date(p[0],p[1]-1,p[2]).getTime()};
  const addDays=(ts,n)=>{const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d.getTime()};
  const projectStart=()=>Number(localStorage.getItem('atom-project-started-at')||0)||Date.now();
  const customIds=team=>(read(CUSTOM_KEY,{})[team]||[]).map(x=>x.id);
  const ids=team=>[...Array.from({length:BASE_COUNTS[team]||0},(_,i)=>`base-${i+1}`),...customIds(team)];
  const itemState=(team,id)=>{const all=read(STATE_KEY,{});return all[team]?.[id]||{}};

  function derived(team,index,total,start){
    const win=TEAM_WINDOWS[team]||[0,91];
    const span=Math.max(7,win[1]-win[0]);
    const slots=Math.max(1,total);
    const slot=Math.max(7,Math.ceil(span/slots/7)*7);
    let from=win[0]+Math.floor(index*span/slots/7)*7;
    let to=Math.min(win[1],from+slot);
    if(to<=from)to=Math.min(91,from+7);
    return {start:addDays(start,from),end:addDays(start,to),derived:true};
  }

  function period(team,id){
    const list=ids(team),index=Math.max(0,list.indexOf(id)),total=Math.max(1,list.length),start=projectStart();
    const st=itemState(team,id),req=parseDate(st.requestDate),due=parseDate(st.dueDate);
    let out;
    if(req&&due)out={start:req,end:Math.max(req,due),derived:false};
    else if(req)out={start:req,end:addDays(req,7),derived:false};
    else if(due)out={start:addDays(due,-7),end:due,derived:false};
    else out=derived(team,index,total,start);
    const startOffset=Math.max(0,Math.round((out.start-new Date(new Date(start).getFullYear(),new Date(start).getMonth(),new Date(start).getDate()).getTime())/DAY));
    const endOffset=Math.max(startOffset+1,Math.round((out.end-new Date(new Date(start).getFullYear(),new Date(start).getMonth(),new Date(start).getDate()).getTime())/DAY));
    return {...out,startDate:dateInput(out.start),endDate:dateInput(out.end),weekFrom:Math.floor(startOffset/7)+1,weekTo:Math.max(Math.floor(Math.max(0,endOffset-1)/7)+1,Math.floor(startOffset/7)+1)};
  }

  function isOverdue(team,id,status){
    if(['Ответ получен','Готово'].includes(status))return false;
    return period(team,id).endDate<dateInput(Date.now());
  }

  window.ATOM_RACI_GANTT_SCHEDULE={TEAM_WINDOWS,BASE_COUNTS,ids,period,isOverdue,projectStart,dateInput};
})();