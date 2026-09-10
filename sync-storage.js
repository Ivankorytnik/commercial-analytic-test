(function(){
  const API='https://ytdacypygsfalkixhemj.supabase.co/functions/v1/commercial-analytics-api';
  const PREFIXES=['atom-'];
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;
  const originalClear=Storage.prototype.clear;
  let hydrated=false;
  let syncing=false;

  const managed=k=>PREFIXES.some(p=>String(k).startsWith(p));

  async function api(method,params='',body){
    const r=await fetch(`${API}?table=ca_sync_state${params?'&'+params:''}`,{
      method,
      headers:{'Content-Type':'application/json'},
      body:body?JSON.stringify(body):undefined
    });
    if(!r.ok) throw new Error(await r.text());
    return r.text().then(t=>t?JSON.parse(t):null);
  }

  async function pushKey(key,value){
    if(!managed(key)||syncing) return;
    try{
      await api('POST','on_conflict=key',[{key:String(key),value:String(value),updated_at:new Date().toISOString()}]);
    }catch(e){console.error('sync push failed',e);}
  }

  async function deleteKey(key){
    if(!managed(key)||syncing) return;
    try{await api('DELETE',`key=eq.${encodeURIComponent(key)}`);}catch(e){console.error('sync delete failed',e);}
  }

  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    if(this===window.localStorage&&hydrated) pushKey(key,value);
  };

  Storage.prototype.removeItem=function(key){
    originalRemove.call(this,key);
    if(this===window.localStorage&&hydrated) deleteKey(key);
  };

  Storage.prototype.clear=function(){
    if(this!==window.localStorage) return originalClear.call(this);
    const keys=[];
    for(let i=0;i<this.length;i++){const k=this.key(i);if(managed(k)) keys.push(k);}
    originalClear.call(this);
    if(hydrated) keys.forEach(deleteKey);
  };

  async function hydrate(){
    try{
      syncing=true;
      const rows=await api('GET','select=key,value&order=updated_at.asc');
      if(Array.isArray(rows)){
        rows.forEach(r=>{ if(managed(r.key)) originalSet.call(localStorage,r.key,r.value); });
      }
    }catch(e){console.error('sync hydrate failed',e);}finally{
      syncing=false;
      hydrated=true;
      window.dispatchEvent(new CustomEvent('atom-sync-ready'));
    }
  }

  async function pull(){
    if(syncing) return;
    try{
      syncing=true;
      const rows=await api('GET','select=key,value&order=updated_at.asc');
      if(Array.isArray(rows)){
        rows.forEach(r=>{ if(managed(r.key) && localStorage.getItem(r.key)!==r.value) originalSet.call(localStorage,r.key,r.value); });
      }
      window.dispatchEvent(new CustomEvent('atom-sync-update'));
    }catch(e){console.error('sync pull failed',e);}finally{syncing=false;}
  }

  window.ATOM_SYNC={pull};
  hydrate();
  setInterval(pull,15000);
})();