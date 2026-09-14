(function(){
  const KEY='atom-reference-data-v1';
  const EMAIL='atom-responsible-emails-v1';
  const defaults={
    responsibles:['Не назначен','Иван Корытник','Александр Костылев'],
    stage:['Не начато','Подготовка','В работе','Ожидание данных','На согласовании','Блокер','Завершено'],
    requirement:['Не запрошено','Запрос подготовлен','Запрос отправлен','В работе','Ответ получен','Требует уточнения','Блокер','Готово','Не актуально'],
    source:['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово'],
    blocker:['Открыт','В работе','Ожидаем ответ','На эскалации','Решен','Закрыт'],
    severity:['Низкая','Средняя','Высокая','Критическая']
  };
  let current={};
  try{current=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  let changed=false;
  Object.keys(defaults).forEach(k=>{if(!Array.isArray(current[k])||!current[k].length){current[k]=defaults[k].slice();changed=true;}});

  // One-time compatibility migration: if “Не активно” was previously added to stage statuses,
  // also expose it in the requirements status directory where it belongs.
  if(Array.isArray(current.stage)&&current.stage.some(x=>String(x).trim().toLowerCase()==='не активно')){
    current.requirement=Array.isArray(current.requirement)?current.requirement:defaults.requirement.slice();
    if(!current.requirement.some(x=>String(x).trim().toLowerCase()==='не активно')){
      current.requirement.push('Не активно');
      changed=true;
    }
  }

  if(changed||!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(current));
  if(!localStorage.getItem(EMAIL))localStorage.setItem(EMAIL,'{}');
})();