(function(){
  const API='https://ytdacypygsfalkixhemj.supabase.co/functions/v1/commercial-analytics-api';
  const PREFIXES=['atom-'];
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;
  const originalClear=Storage.prototype.clear;
  let hydrated=false;
  let pulling=false;
  let flushing=false;
  let lastError='';
  const queue=new Map();
  const remoteKnown=new Set();

  const managed=k=>PREFIXES.some(p=>String(k).startsWith(p));
  const nowLabel=()=>new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());

  function dispatchStatus(state,message){
    window.dispatchEvent(new CustomEvent('atom-sync-status',{detail:{state,message,time:new Date().toISOString()}}));
  }

  function localEntries(){
    const rows=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(managed(key)) rows.push({key,value:localStorage.getItem(key)});
    }
    return rows;
  }

  async function api(method,params='',body){
    const r=await fetch(`${API}?table=ca_sync_state${params?'&'+params:''}`,{
      method,
      headers:{'Content-Type':'application/json'},
      body:body?JSON.stringify(body):undefined
    });
    if(!r.ok) throw new Error(await r.text());
    const t=await r.text();
    return t?JSON.parse(t):null;
  }

  function enqueue(key,op,value=null){
    if(!managed(key))return;
    queue.set(String(key),{op,value,ts:new Date().toISOString()});
    dispatchStatus('saving','Сохраняется');
    setTimeout(flushQueue,80);
  }

  async function flushQueue(){
    if(flushing||!hydrated||!queue.size)return;
    flushing=true;
    try{
      while(queue.size){
        const batch=[...queue.entries()];
        queue.clear();
        const upserts=batch.filter(([,v])=>v.op==='set').map(([key,v])=>({key,value:String(v.value),updated_at:v.ts}));
        const deletes=batch.filter(([,v])=>v.op==='delete').map(([key])=>key);
        if(upserts.length){
          await api('POST','on_conflict=key',upserts);
          upserts.forEach(x=>remoteKnown.add(x.key));
        }
        for(const key of deletes){
          await api('DELETE',`key=eq.${encodeURIComponent(key)}`);
          remoteKnown.delete(key);
        }
      }
      lastError='';
      dispatchStatus('synced',`Синхронизировано ${nowLabel()}`);
    }catch(e){
      console.error('sync flush failed',e);
      lastError=String(e?.message||e);
      dispatchStatus('error','Ошибка синхронизации');
    }finally{
      flushing=false;
      if(queue.size)setTimeout(flushQueue,250);
    }
  }

  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    if(this===window.localStorage&&hydrated)enqueue(key,'set',value);
  };

  Storage.prototype.removeItem=function(key){
    originalRemove.call(this,key);
    if(this===window.localStorage&&hydrated)enqueue(key,'delete');
  };

  Storage.prototype.clear=function(){
    if(this!==window.localStorage)return originalClear.call(this);
    const keys=[];
    for(let i=0;i<this.length;i++){
      const k=this.key(i);
      if(managed(k))keys.push(k);
    }
    originalClear.call(this);
    if(hydrated)keys.forEach(k=>enqueue(k,'delete'));
  };

  async function hydrate(){
    let changed=false;
    try{
      dispatchStatus('loading','Синхронизация...');
      const rows=await api('GET','select=key,value,updated_at&order=updated_at.asc');
      if(Array.isArray(rows)&&rows.length){
        const remoteKeys=new Set();
        rows.forEach(r=>{
          if(!managed(r.key))return;
          remoteKeys.add(r.key);remoteKnown.add(r.key);
          if(localStorage.getItem(r.key)!==r.value){originalSet.call(localStorage,r.key,r.value);changed=true;}
        });
        const stale=[];
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(managed(k)&&!remoteKeys.has(k))stale.push(k);
        }
        stale.forEach(k=>{originalRemove.call(localStorage,k);changed=true;});
      }else{
        const seed=localEntries();
        if(seed.length){
          await api('POST','on_conflict=key',seed.map(r=>({...r,updated_at:new Date().toISOString()})));
          seed.forEach(r=>remoteKnown.add(r.key));
        }
      }
      lastError='';
      dispatchStatus('synced',`Синхронизировано ${nowLabel()}`);
    }catch(e){
      console.error('sync hydrate failed',e);
      lastError=String(e?.message||e);
      dispatchStatus('error','Ошибка синхронизации');
    }finally{
      hydrated=true;
      window.dispatchEvent(new CustomEvent('atom-sync-ready'));
      if(changed)window.dispatchEvent(new CustomEvent('atom-sync-update'));
    }
  }

  async function pull(){
    if(pulling||flushing||queue.size)return;
    pulling=true;
    let changed=false;
    try{
      const rows=await api('GET','select=key,value,updated_at&order=updated_at.asc');
      if(Array.isArray(rows)){
        const remoteKeys=new Set();
        rows.forEach(r=>{
          if(!managed(r.key))return;
          remoteKeys.add(r.key);remoteKnown.add(r.key);
          if(localStorage.getItem(r.key)!==r.value){originalSet.call(localStorage,r.key,r.value);changed=true;}
        });
        const stale=[];
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(managed(k)&&remoteKnown.has(k)&&!remoteKeys.has(k))stale.push(k);
        }
        stale.forEach(k=>{originalRemove.call(localStorage,k);remoteKnown.delete(k);changed=true;});
      }
      lastError='';
      dispatchStatus('synced',`Синхронизировано ${nowLabel()}`);
    }catch(e){
      console.error('sync pull failed',e);
      lastError=String(e?.message||e);
      dispatchStatus('error','Ошибка синхронизации');
    }finally{
      pulling=false;
      if(changed)window.dispatchEvent(new CustomEvent('atom-sync-update'));
    }
  }

  window.ATOM_SYNC={pull,flush:flushQueue,status:()=>({hydrated,pulling,flushing,pending:queue.size,error:lastError})};
  hydrate();
  setInterval(pull,15000);
})();