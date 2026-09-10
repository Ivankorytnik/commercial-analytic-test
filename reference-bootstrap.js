(function(){
  const KEY='atom-reference-data-v1';
  const EMAIL='atom-responsible-emails-v1';
  const defaults={
    responsibles:['Не назначен','Иван Корытник','Александр Костылев'],
    stage:['Не начато','Подготовка','В работе','Ожидание данных','На согласовании','Блокер','Завершено'],
    source:['Не начато','Владелец определен','Доступ запрошен','Доступ получен','Структура данных описана','Данные получены','Интеграция в работе','На проверке','Блокер','Готово'],
    blocker:['Открыт','В работе','Ожидаем ответ','На эскалации','Решен','Закрыт'],
    severity:['Низкая','Средняя','Высокая','Критическая']
  };
  let current={};
  try{current=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{}
  let changed=false;
  Object.keys(defaults).forEach(k=>{if(!Array.isArray(current[k])||!current[k].length){current[k]=defaults[k].slice();changed=true;}});
  if(changed||!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(current));
  if(!localStorage.getItem(EMAIL))localStorage.setItem(EMAIL,'{}');
})();