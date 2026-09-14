(function(){
  const PEOPLE_KEY='atom-core-people-v1';
  const REF_KEY='atom-reference-data-v1';
  const ROLES=[['admin','Админ'],['leader','Руководитель'],['member','Участник']];

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const read=(k,f)=>{try{const x=JSON.parse(localStorage.getItem(k)||'');return x??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

  function teams(){
    try{
      const fromCore=window.ATOM_CORE?.teams?.();
      if(Array.isArray(fromCore)&&fromCore.length)return fromCore;
    }catch{}
    try{return Array.isArray(DATA?.teams)?DATA.teams.map(x=>x[0]).filter(Boolean):[]}catch{return[]}
  }

  function normalizeRole(role){
    const map={'Админ':'admin','Руководитель':'leader','Участник':'member'};
    const value=map[role]||role;
    return ROLES.some(([id])=>id===value)?value:'member';
  }

  function personMeta(name){
    const p=read(PEOPLE_KEY,[]).find(x=>x.name===name)||{};
    return {team:p.team||'',role:normalizeRole(p.role)};
  }

  function teamOptions(selected=''){
    return [`<option value="" ${!selected?'selected':''}>Не выбрана</option>`,...teams().map(t=>`<option value="${esc(t)}" ${t===selected?'selected':''}>${esc(t)}</option>`)].join('');
  }

  function roleOptions(selected='member'){
    selected=normalizeRole(selected);
    return ROLES.map(([id,label])=>`<option value="${id}" ${id===selected?'selected':''}>${label}</option>`).join('');
  }

  function styles(){
    if(document.getElementById('person-team-role-css'))return;
    const s=document.createElement('style');s.id='person-team-role-css';s.textContent=`
      .pa-add.person.pa-person-access{grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) minmax(180px,1fr) minmax(140px,.7fr) auto}
      .pa-person-access-table{min-width:1180px}
      @media(max-width:900px){.pa-add.person.pa-person-access{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function patchDirectories(){
    const addName=document.getElementById('pa-person-name');
    if(!addName)return;
    styles();

    const table=addName.closest('#pa-panel')?.querySelector('.pa-table');
    if(table){
      table.classList.add('pa-person-access-table');
      const head=table.querySelector('thead tr');
      if(head&&!head.querySelector('[data-pa-person-team-head]')){
        const action=head.lastElementChild;
        const thTeam=document.createElement('th');thTeam.dataset.paPersonTeamHead='1';thTeam.textContent='Команда';
        const thRole=document.createElement('th');thRole.dataset.paPersonRoleHead='1';thRole.textContent='Роль';
        head.insertBefore(thTeam,action);head.insertBefore(thRole,action);
      }

      table.querySelectorAll('tbody tr[data-pa-person]').forEach(row=>{
        const name=row.dataset.paPerson||'';
        const meta=personMeta(name);
        const action=row.lastElementChild;
        if(!row.querySelector('[data-pa-person-team]')){
          const td=document.createElement('td');
          td.innerHTML=`<select data-pa-person-team>${teamOptions(meta.team)}</select>`;
          row.insertBefore(td,action);
        }
        if(!row.querySelector('[data-pa-person-role]')){
          const td=document.createElement('td');
          td.innerHTML=`<select data-pa-person-role>${roleOptions(meta.role)}</select>`;
          row.insertBefore(td,action);
        }
      });
    }

    const form=addName.closest('.pa-add.person');
    if(form&&!form.dataset.personAccessEnhanced){
      form.dataset.personAccessEnhanced='1';
      form.classList.add('pa-person-access');
      const button=form.querySelector('#pa-add-person');
      button?.insertAdjacentHTML('beforebegin',`<div class="pa-field"><label>Команда</label><select id="pa-person-team">${teamOptions('')}</select></div><div class="pa-field"><label>Роль</label><select id="pa-person-role">${roleOptions('member')}</select></div>`);
    }
  }

  function persistMeta(name,oldName,team,role,email){
    if(!name||!team)return;
    let list=read(PEOPLE_KEY,[]);
    let p=list.find(x=>x.name===name)||(oldName?list.find(x=>x.name===oldName):null);
    if(!p){
      window.ATOM_CORE?.findPersonId?.(name);
      list=read(PEOPLE_KEY,[]);
      p=list.find(x=>x.name===name);
    }
    if(!p)return;
    p.name=name;
    p.team=team;
    p.role=normalizeRole(role);
    if(email!==undefined)p.email=email||'';
    write(PEOPLE_KEY,list);
    window.dispatchEvent(new CustomEvent('atom-core-data-changed',{detail:{type:'person-access',name,team,role:p.role}}));
  }

  document.addEventListener('click',e=>{
    const add=e.target.closest('#pa-add-person');
    if(add){
      const name=document.getElementById('pa-person-name')?.value.trim()||'';
      const email=document.getElementById('pa-person-email')?.value.trim()||'';
      const team=document.getElementById('pa-person-team')?.value||'';
      const role=document.getElementById('pa-person-role')?.value||'member';
      if(name&&!team){e.preventDefault();e.stopImmediatePropagation();alert('Выбери команду ответственного');return;}
      const refs=read(REF_KEY,{}),dupe=Array.isArray(refs.responsibles)&&refs.responsibles.includes(name);
      if(!name||dupe)return;
      setTimeout(()=>{persistMeta(name,'',team,role,email);patchDirectories();},0);
      return;
    }

    const save=e.target.closest('.pa-save-person');
    if(save){
      const row=save.closest('[data-pa-person]');
      const oldName=row?.dataset.paPerson||'';
      const newName=row?.querySelector('[data-pa-person-name]')?.value.trim()||'';
      const email=row?.querySelector('[data-pa-person-email]')?.value.trim()||'';
      const team=row?.querySelector('[data-pa-person-team]')?.value||'';
      const role=row?.querySelector('[data-pa-person-role]')?.value||'member';
      if(newName&&!team){e.preventDefault();e.stopImmediatePropagation();alert('Выбери команду ответственного');return;}
      const refs=read(REF_KEY,{}),dupe=Array.isArray(refs.responsibles)&&refs.responsibles.some(x=>x===newName&&x!==oldName);
      if(dupe){e.preventDefault();e.stopImmediatePropagation();alert('Такой ответственный уже есть');return;}
      if(!oldName||!newName)return;
      setTimeout(()=>{persistMeta(newName,oldName,team,role,email);patchDirectories();},0);
    }
  },true);

  let queued=false;
  function queuePatch(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;patchDirectories();});
  }

  const mo=new MutationObserver(queuePatch);
  mo.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',queuePatch);
  window.addEventListener('atom-sync-update',queuePatch);
  window.addEventListener('atom-core-ready',queuePatch);
  styles();setTimeout(queuePatch,700);
})();