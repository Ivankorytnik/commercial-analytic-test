(function(){
  const KEY='atom-reference-data-v1';
  const EMAIL='atom-responsible-emails-v1';
  const defaults={
    responsibles:['Не назначен','Иван Корытник','Александр Костылев'],
    stage:['Не начато','Подготовка','В работе','Ожидание данных','На согласовании','Блокер','Завершено'],
    requirement:['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово','Не актуально','В очереди'],
    source:['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово'],
    blocker:['Открыт','В работе','Ожидаем ответ','На эскалации','Решен','Закрыт'],
    severity:['Низкая','Средняя','Высокая','Критическая']
  };
  const norm=s=>String(s||'').trim().toLowerCase();
  let current={};
  try{current=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  let changed=false;
  Object.keys(defaults).forEach(k=>{if(!Array.isArray(current[k])||!current[k].length){current[k]=defaults[k].slice();changed=true;}});

  current.requirement=(Array.isArray(current.requirement)?current.requirement:defaults.requirement.slice()).map(x=>norm(x)==='не активно'?'В очереди':x);
  current.requirement=current.requirement.filter((x,i,a)=>a.findIndex(y=>norm(y)===norm(x))===i);
  defaults.requirement.forEach(v=>{if(!current.requirement.some(x=>norm(x)===norm(v))){current.requirement.push(v);changed=true;}});

  if(changed||!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(current));
  if(!localStorage.getItem(EMAIL))localStorage.setItem(EMAIL,'{}');
})();