/* ═══ SINCRONIZACIÓN POR REGISTROS (Supabase con cuenta + RLS) ═══
   • Cada paciente, cita, pago, receta, egreso… es UN registro en la nube (tabla sync_records), no un JSON gigante.
   • Cada registro lleva una versión (rev). Una escritura solo entra si parte de la versión actual; si no, se descarga,
     se FUSIONA (tres vías: lo que había / lo mío / lo de la nube) y se reintenta. Así dos dispositivos no se pisan.
   • Los borradores locales sin conexión se conservan y se suben cuando vuelve internet.
   • Un borrado masivo local (p. ej. datos que no cargaron) NO se propaga a la nube sin confirmación. */
(function(){
'use strict';
var PAGE=1000,OVERLAP_MS=5*60*1000,DEBOUNCE_MS=3000,POLL_MS=60000,BATCH=50,BATCH_BYTES=700000,CONC=6;
var CHILD={appointments:'appt',payments:'pay',treatments:'tx',diary:'diary',images:'img',consents:'consent',recetas:'receta',presupuestos:'presup',odoHistory:'odo'};
var CHILD_REV={};Object.keys(CHILD).forEach(function(k){CHILD_REV[CHILD[k]]=k;});
var SID_KINDS={receta:1,presup:1};            // su "id" es el N° visible y puede repetirse entre dispositivos → clave propia (sid)
var TOP_KINDS={egresos:'egreso',facturas:'factura',servicios:'servicio',archivosContables:'archivo',quickAppts:'qappt'};
var TOP_REV={};Object.keys(TOP_KINDS).forEach(function(k){TOP_REV[TOP_KINDS[k]]=k;});
function topArr(name){return name==='egresos'?egresos:name==='facturas'?facturas:name==='servicios'?servicios:name==='archivosContables'?archivosContables:quickAppts;}

var cfg={url:'',key:'',clinicUuid:'',email:''},meta=null,running=null,timer=null,retryMs=0,pendingAgain=false;
var lastError='',pendingCount=0,guardInfo=null,needLogin=false,lastSyncAt=0,applying=false,state='idle',listenersOn=false;

/* ── utilidades ── */
function isPlain(x){return Object.prototype.toString.call(x)==='[object Object]';}
function stable(v){
  if(v===undefined)return 'u';
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  var ks=Object.keys(v).sort(),o=[];
  for(var i=0;i<ks.length;i++){if(v[ks[i]]!==undefined)o.push(JSON.stringify(ks[i])+':'+stable(v[ks[i]]));}
  return '{'+o.join(',')+'}';
}
function cyrb53(s){var h1=0xdeadbeef,h2=0x41c6ce57;for(var i=0,ch;i<s.length;i++){ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36)+'.'+s.length;}
function clone(x){return x===undefined?undefined:JSON.parse(JSON.stringify(x));}
function eqv(a,b){return stable(a)===stable(b);}
function hashOf(kind,d){
  if(kind==='img'&&d&&typeof d.data==='string'){var r=Object.assign({},d);delete r.data;return cyrb53(stable(r)+'|'+d.data.length+'|'+d.data.slice(0,48)+'|'+d.data.slice(-48));}
  return cyrb53(stable(d));
}
function errMsg(e){var m=(e&&(e.message||e.error_description||e.details))||String(e);if(/failed to fetch|networkerror|load failed|fetch failed/i.test(m))return 'Sin conexión a internet';return m;}
function audit(ev,det){try{if(window.Seguridad&&Seguridad._audit)Seguridad._audit(ev,det||'');}catch(e){}}

/* ── almacenamiento local propio (no toca la base principal) ── */
var _sdb=null;
function sdb(){return new Promise(function(res,rej){if(_sdb)return res(_sdb);var rq=indexedDB.open('odontoapp_sync',1);rq.onupgradeneeded=function(e){e.target.result.createObjectStore('kv');};rq.onsuccess=function(e){_sdb=e.target.result;res(_sdb);};rq.onerror=function(){rej(rq.error);};});}
function sdbGet(k){return sdb().then(function(db){return new Promise(function(res){var r=db.transaction('kv','readonly').objectStore('kv').get(k);r.onsuccess=function(){res(r.result);};r.onerror=function(){res(undefined);};});}).catch(function(){return undefined;});}
function sdbPut(entries){return sdb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction('kv','readwrite'),st=tx.objectStore('kv');entries.forEach(function(e){if(e[1]===undefined)st.delete(e[0]);else st.put(e[1],e[0]);});tx.oncomplete=function(){res(true);};tx.onerror=function(){rej(tx.error);};});});}
function sdbClear(){return sdb().then(function(db){return new Promise(function(res){var tx=db.transaction('kv','readwrite');tx.objectStore('kv').clear();tx.oncomplete=function(){res(true);};tx.onerror=function(){res(false);};});}).catch(function(){return false;});}
function saveMeta(){return sdbPut([['meta',meta]]);}
function newMeta(id){return {clinicId:id,cursor:null,recs:{},log:[],legacyDone:false,allowDeletes:false};}

/* ── configuración ── */
function loadCfg(){var c={};try{c=JSON.parse(localStorage.getItem('oa3_sb')||'{}');}catch(e){}cfg={url:c.url||'',key:c.key||'',clinicUuid:c.clinicUuid||'',email:c.email||''};}
function saveCfg(){var o={};try{o=JSON.parse(localStorage.getItem('oa3_sb')||'{}');}catch(e){}localStorage.setItem('oa3_sb',JSON.stringify(Object.assign(o,{url:sbUrl,key:sbKey,clinicaId:sbClinicaId,clinicUuid:cfg.clinicUuid,email:cfg.email})));}
function makeClient(){if(typeof supabase==='undefined'||!supabase||!supabase.createClient)return null;return supabase.createClient(sbUrl,sbKey,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'oa3_sb_auth'}});}
function ready(){return !!(sbClient&&cfg.clinicUuid&&meta&&!needLogin);}

/* ═══ FUSIÓN DE TRES VÍAS ═══ */
function idArray(a){if(!Array.isArray(a))return false;for(var i=0;i<a.length;i++){if(!isPlain(a[i])||a[i].id===undefined)return false;}return true;}
function merge3(b,l,r,ctx,path){
  if(eqv(l,r))return clone(l);
  if(!ctx.noBase){if(eqv(b,l))return clone(r);if(eqv(b,r))return clone(l);}
  else{if(l===undefined)return clone(r);if(r===undefined)return clone(l);}
  if(isPlain(l)&&isPlain(r)){
    var bb=isPlain(b)?b:{},keys={},out={};
    Object.keys(l).forEach(function(k){keys[k]=1;});Object.keys(r).forEach(function(k){keys[k]=1;});Object.keys(bb).forEach(function(k){keys[k]=1;});
    Object.keys(keys).forEach(function(k){var v=merge3(bb[k],l[k],r[k],ctx,path+'.'+k);if(v!==undefined)out[k]=v;});
    return out;
  }
  if(idArray(l)&&idArray(r)&&(b===undefined||idArray(b)))return mergeById(Array.isArray(b)?b:[],l,r,ctx,path);
  ctx.conflicts.push({path:path,lost:clone(ctx.win==='remote'?l:r),won:ctx.win});
  return clone(ctx.win==='remote'?r:l);
}
function mergeById(b,l,r,ctx,path){
  var bm={},lm={},rm={},order=[],seen={};
  function idx(arr,m){arr.forEach(function(e){m[String(e.id)]=e;});}
  idx(b,bm);idx(l,lm);idx(r,rm);
  l.forEach(function(e){var k=String(e.id);if(!seen[k]){seen[k]=1;order.push(k);}});
  r.forEach(function(e){var k=String(e.id);if(!seen[k]){seen[k]=1;order.push(k);}});
  var out=[];
  order.forEach(function(k){
    var bi=bm[k],li=lm[k],ri=rm[k],v;
    if(li!==undefined&&ri!==undefined)v=merge3(bi,li,ri,ctx,path+'['+k+']');
    else if(ctx.noBase)v=clone(li!==undefined?li:ri);
    else if(li!==undefined){ // no está en la nube
      if(bi===undefined)v=clone(li);                              // lo agregué yo
      else if(eqv(bi,li))v=undefined;                             // lo borró el otro y yo no lo toqué
      else{v=clone(li);ctx.conflicts.push({path:path+'['+k+']',lost:'(borrado en otro dispositivo)',won:'local'});} // yo lo edité: gana la edición
    }else{ // no está en lo mío
      if(bi===undefined)v=clone(ri);                              // lo agregó el otro
      else if(eqv(bi,ri))v=undefined;                             // lo borré yo y el otro no lo tocó
      else{v=clone(ri);ctx.conflicts.push({path:path+'['+k+']',lost:'(borrado en este dispositivo)',won:'remote'});}
    }
    if(v!==undefined)out.push(v);
  });
  return out;
}
function mergeRecord(kind,base,local,remote,noBase){
  var ctx={noBase:!!noBase,win:noBase?'remote':'local',conflicts:[]};
  var m=merge3(base,local,remote,ctx,'');
  if(kind==='config'&&isPlain(m)){
    var lc=(local&&local.counters)||{},rc=(remote&&remote.counters)||{},c=Object.assign({},m.counters||{});
    ['nextId','nextEgId','nextFactId','nextRecetaId','nextPresupId'].forEach(function(k){var mx=Math.max(+lc[k]||0,+rc[k]||0,+c[k]||0);if(mx)c[k]=mx;});
    m.counters=c;
    ctx.conflicts=ctx.conflicts.filter(function(x){return x.path.indexOf('.counters')!==0;});
  }
  return {data:m,conflicts:ctx.conflicts};
}

/* ═══ REGISTROS LOCALES ═══ */
function txt(id){var e=document.getElementById(id);return e?e.textContent:'';}
function configData(){
  return {clinica:{nombre:txt('logoText'),profesional:txt('logoProfesional'),ruc:clinicaRUC,direccion:clinicaDireccion,telefono:clinicaTelefono,logoColor:logoColor,logoImg:logoImg||''},
    meds:MEDICAMENTOS_COMUNES,
    counters:{nextId:nextId,nextEgId:nextEgId,nextFactId:nextFactId,nextRecetaId:nextRecetaId,nextPresupId:nextPresupId}};
}
function ensureKeys(){
  var changed=false,legacy=!meta.legacyDone;
  function fixArr(arr,needSid){
    var used={};
    (arr||[]).forEach(function(el){
      if(!isPlain(el))return;
      if(el.id===undefined||el.id===null){el.id=uid();changed=true;}
      if(needSid){
        if(!el.sid||used[el.sid]){el.sid=(legacy&&!used[String(el.id)]&&!el.sid)?String(el.id):String(uid());changed=true;}
        used[el.sid]=1;
      }
    });
  }
  patients.forEach(function(p){
    if(p.id===undefined||p.id===null){p.id=uid();changed=true;}
    Object.keys(CHILD).forEach(function(a){if(!Array.isArray(p[a])){p[a]=[];changed=true;}fixArr(p[a],!!SID_KINDS[CHILD[a]]);});
  });
  Object.keys(TOP_KINDS).forEach(function(n){fixArr(topArr(n),false);});
  if(changed){applying=true;try{saveNow();}finally{applying=false;}}
}
function snapshot(){
  var m=new Map();
  patients.forEach(function(p){
    if(p.demo)return;                      // los datos de ejemplo nunca se suben a la nube
    var core={};Object.keys(p).forEach(function(k){if(!CHILD[k])core[k]=p[k];});
    m.set('patient|'+p.id,{kind:'patient',id:String(p.id),data:core});
    Object.keys(CHILD).forEach(function(a){
      var kind=CHILD[a];
      (p[a]||[]).forEach(function(el){var id=String(p.id)+'/'+(SID_KINDS[kind]?el.sid:el.id);m.set(kind+'|'+id,{kind:kind,id:id,data:el});});
    });
  });
  Object.keys(TOP_KINDS).forEach(function(n){var kind=TOP_KINDS[n];topArr(n).forEach(function(el){if(isPlain(el)&&!el.demo)m.set(kind+'|'+el.id,{kind:kind,id:String(el.id),data:el});});});
  m.set('config|main',{kind:'config',id:'main',data:configData()});
  return m;
}

/* ── aplicar un registro de la nube al estado local (siempre "en el mismo objeto" para no perder referencias como curPt) ── */
function findPatient(id){for(var i=0;i<patients.length;i++){if(String(patients[i].id)===String(id))return patients[i];}return null;}
function putInPlace(t,s,skipChild){
  Object.keys(t).forEach(function(k){if(skipChild&&CHILD[k])return;if(!(k in s))delete t[k];});
  Object.keys(s).forEach(function(k){t[k]=s[k];});
}
function insertSorted(arr,el){
  var n=Number(el.id);
  if(isFinite(n)){for(var i=arr.length-1;i>=0;i--){if(!(Number(arr[i].id)>n)){arr.splice(i+1,0,el);return;}}arr.unshift(el);}
  else arr.push(el);
}
function applyConfig(d){
  if(!d)return;
  if(d.clinica){
    var c=d.clinica,a=document.getElementById('logoText'),b=document.getElementById('logoProfesional');
    if(a)a.textContent=c.nombre||'OdontoApp';if(b)b.textContent=c.profesional||'Dr. Profesional';
    clinicaRUC=c.ruc||'';clinicaDireccion=c.direccion||'';clinicaTelefono=c.telefono||'';
    logoColor=c.logoColor||'#2f9d94';
    if(c.logoImg){logoImg=c.logoImg;try{applyLogoImg(logoImg);}catch(e){}}
    try{applyColor(logoColor);}catch(e){}
  }
  if(d.counters){
    nextId=Math.max(+nextId||0,+d.counters.nextId||0)||nextId;nextEgId=Math.max(+nextEgId||0,+d.counters.nextEgId||0)||nextEgId;
    nextFactId=Math.max(+nextFactId||0,+d.counters.nextFactId||0)||nextFactId;nextRecetaId=Math.max(+nextRecetaId||0,+d.counters.nextRecetaId||0)||nextRecetaId;
    nextPresupId=Math.max(+nextPresupId||0,+d.counters.nextPresupId||0)||nextPresupId;
  }
  if(Array.isArray(d.meds)&&d.meds.length)MEDICAMENTOS_COMUNES=d.meds;
}
function applyLocal(kind,id,data,deleted){
  if(kind==='patient'){
    var p=findPatient(id);
    if(deleted){if(p)patients.splice(patients.indexOf(p),1);return 'ok';}
    if(p){putInPlace(p,clone(data),true);}
    else{var np=clone(data);Object.keys(CHILD).forEach(function(a){if(!Array.isArray(np[a]))np[a]=[];});patients.push(np);}
    return 'ok';
  }
  if(CHILD_REV[kind]){
    var cut=id.indexOf('/'),pid=id.slice(0,cut),rest=id.slice(cut+1),par=findPatient(pid);
    if(!par)return deleted?'ok':'orphan';
    var arr=par[CHILD_REV[kind]]||(par[CHILD_REV[kind]]=[]),pos=-1;
    for(var i=0;i<arr.length;i++){if(String(SID_KINDS[kind]?arr[i].sid:arr[i].id)===rest){pos=i;break;}}
    if(deleted){if(pos>=0)arr.splice(pos,1);return 'ok';}
    if(pos>=0)putInPlace(arr[pos],clone(data));else insertSorted(arr,clone(data));
    return 'ok';
  }
  if(TOP_REV[kind]){
    var ta=topArr(TOP_REV[kind]),tp=-1;
    for(var j=0;j<ta.length;j++){if(String(ta[j].id)===id){tp=j;break;}}
    if(deleted){if(tp>=0)ta.splice(tp,1);return 'ok';}
    if(tp>=0)putInPlace(ta[tp],clone(data));else ta.push(clone(data));
    return 'ok';
  }
  if(kind==='config'){applyConfig(clone(data));return 'ok';}
  return 'ok';
}

/* ═══ DESCARGAR (pull) ═══ */
async function pull(){
  var since=meta.cursor?new Date(Date.parse(meta.cursor)-OVERLAP_MS).toISOString():null,rows=[],last=since;
  for(;;){
    var q=sbClient.from('sync_records').select('kind,id,rev,data,deleted,updated_at').eq('clinic_id',cfg.clinicUuid).order('updated_at',{ascending:true}).limit(PAGE);
    if(last)q=q.gte('updated_at',last);
    var r=await q;if(r.error)throw r.error;
    var page=r.data||[];rows=rows.concat(page);
    if(page.length<PAGE)break;
    var nl=page[page.length-1].updated_at;if(nl===last)throw new Error('La paginación no avanza (demasiados registros con la misma hora)');last=nl;
  }
  var byKey={};
  rows.forEach(function(x){var k=x.kind+'|'+x.id;if(!byKey[k]||x.rev>byKey[k].rev)byKey[k]=x;});
  var list=Object.keys(byKey).map(function(k){return byKey[k];}).sort(function(a,b){return (a.kind==='patient'?0:1)-(b.kind==='patient'?0:1);});
  if(rows.length){var mx=rows.reduce(function(m,x){return x.updated_at>m?x.updated_at:m;},'');if(!meta.cursor||mx>meta.cursor)meta.cursor=mx;}
  var snap=snapshot(),writes=[],changed=0,orphans=[],conflicts=[];
  function logConf(key,list2,label){
    list2.forEach(function(c){meta.log.push({t:Date.now(),key:key,label:label||key,path:c.path,lost:typeof c.lost==='string'?c.lost:stable(c.lost).slice(0,200),won:c.won});});
    meta.log=meta.log.slice(-100);conflicts=conflicts.concat(list2);
  }
  function label(kind,id){var p=findPatient(kind==='patient'?id:id.split('/')[0]);return (p?p.name:'')+' ('+kind+')';}
  async function handle(x){
    var key=x.kind+'|'+x.id,m=meta.recs[key];
    if(m&&x.rev<=m.rev)return;
    var cur=snap.get(key),curHash=cur?hashOf(x.kind,cur.data):null;
    var dirty=cur?(!m||m.del||m.hash!==curHash):false;
    var locallyDeleted=!cur&&m&&!m.del;
    if(!x.deleted){
      var rdata=x.data,rhash=hashOf(x.kind,rdata);
      if(!cur&&!locallyDeleted){var res0=applyLocal(x.kind,x.id,rdata,false);if(res0==='orphan'){orphans.push(x);return;}changed++;}
      else if(locallyDeleted){
        if(m.hash===rhash){return;}                                     // la nube no cambió: mi borrado se subirá
        var res1=applyLocal(x.kind,x.id,rdata,false);if(res1==='orphan'){orphans.push(x);return;}
        logConf(key,[{path:'',lost:'(borrado en este dispositivo)',won:'remote'}],label(x.kind,x.id));changed++;
      }else if(!dirty){applyLocal(x.kind,x.id,rdata,false);changed++;}
      else{
        var baseStr=await sdbGet('b|'+key),base=baseStr?JSON.parse(baseStr):undefined;
        var mr=mergeRecord(x.kind,base,cur.data,rdata,base===undefined);
        applyLocal(x.kind,x.id,mr.data,false);
        if(mr.conflicts.length)logConf(key,mr.conflicts,label(x.kind,x.id));
        changed++;
      }
      meta.recs[key]={rev:x.rev,hash:rhash,del:false};
      writes.push(['b|'+key,stable(rdata)]);
    }else{
      if(!cur){meta.recs[key]={rev:x.rev,hash:null,del:true};writes.push(['b|'+key,undefined]);return;}
      if(!dirty){applyLocal(x.kind,x.id,null,true);changed++;meta.recs[key]={rev:x.rev,hash:null,del:true};writes.push(['b|'+key,undefined]);}
      else{ // lo borraron en otro dispositivo pero yo lo edité: gana la edición (se vuelve a subir)
        logConf(key,[{path:'',lost:'(borrado en otro dispositivo)',won:'local'}],label(x.kind,x.id));
        meta.recs[key]={rev:x.rev,hash:null,del:true};
      }
    }
  }
  applying=true;
  try{
    for(var i=0;i<list.length;i++)await handle(list[i]);
    var again=orphans;orphans=[];
    for(var j=0;j<again.length;j++){
      var o=again[j],pid=o.id.split('/')[0],pm=meta.recs['patient|'+pid];
      if(pm&&pm.del){meta.recs[o.kind+'|'+o.id]={rev:o.rev,hash:null,del:true};continue;}   // su paciente fue eliminado
      var rr=applyLocal(o.kind,o.id,o.deleted?null:o.data,!!o.deleted);
      if(rr==='orphan'){meta.needFull=true;}else{meta.recs[o.kind+'|'+o.id]={rev:o.rev,hash:o.deleted?null:hashOf(o.kind,o.data),del:!!o.deleted};if(!o.deleted)writes.push(['b|'+o.kind+'|'+o.id,stable(o.data)]);changed++;}
    }
    if(changed)saveNow();
  }finally{applying=false;}
  if(meta.needFull&&!orphans.length){meta.cursor=null;meta.needFull=false;}
  if(writes.length)await sdbPut(writes);
  return {changed:changed,conflicts:conflicts.length,total:list.length};
}

/* ═══ SUBIR (push) ═══ */
function pool(items,worker,n){var i=0,errs=[];return Promise.all(Array.apply(null,Array(Math.min(n,items.length||1))).map(function(){return (async function(){while(i<items.length){var it=items[i++];try{await worker(it);}catch(e){errs.push(e);}}})();})).then(function(){if(errs.length)throw errs[0];});}
function guardFilter(dels){
  if(meta.allowDeletes)return {allowed:dels,blocked:[]};
  var alive=function(prefix){return Object.keys(meta.recs).filter(function(k){return k.indexOf(prefix)===0&&!meta.recs[k].del;}).length;};
  var aliveP=alive('patient|'),delP=dels.filter(function(d){return d.key.indexOf('patient|')===0;});
  var blockP=(aliveP>=3&&patients.filter(function(p){return !p.demo;}).length===0)||(delP.length>=5&&delP.length>=aliveP*0.25);
  var blockedPid={};if(blockP)delP.forEach(function(d){blockedPid[d.key.split('|')[1]]=1;});
  var blockedKinds={};
  Object.keys(TOP_KINDS).forEach(function(n){var kd=TOP_KINDS[n],dk=dels.filter(function(d){return d.key.indexOf(kd+'|')===0;}).length,ak=alive(kd+'|');if(dk>=8&&dk>=ak*0.5)blockedKinds[kd]=1;});
  var allowed=[],blocked=[];
  dels.forEach(function(d){
    var kind=d.key.split('|')[0],id=d.key.slice(kind.length+1),isBlocked=false;
    if(kind==='patient')isBlocked=!!blockedPid[id];else if(CHILD_REV[kind])isBlocked=!!blockedPid[id.split('/')[0]];else if(blockedKinds[kind])isBlocked=true;
    (isBlocked?blocked:allowed).push(d);
  });
  return {allowed:allowed,blocked:blocked};
}
async function push(){
  var snap=snapshot(),ins=[],upd=[],dels=[],writes=[],conflicts=0;
  snap.forEach(function(rec,key){
    var h=hashOf(rec.kind,rec.data),m=meta.recs[key];
    if(!m)ins.push({key:key,rec:rec,h:h});
    else if(m.del)upd.push({key:key,rec:rec,h:h,base:m.rev});
    else if(m.hash!==h)upd.push({key:key,rec:rec,h:h,base:m.rev});
  });
  Object.keys(meta.recs).forEach(function(k){if(!meta.recs[k].del&&!snap.has(k))dels.push({key:k,base:meta.recs[k].rev});});
  var g=guardFilter(dels);
  guardInfo=g.blocked.length?{total:g.blocked.length,patients:g.blocked.filter(function(d){return d.key.indexOf('patient|')===0;}).length}:null;
  pendingCount=ins.length+upd.length+g.allowed.length+g.blocked.length;
  var c=cfg.clinicUuid;
  function ok(key,rev,hash,del,data){meta.recs[key]={rev:rev,hash:hash,del:del};writes.push(['b|'+key,del?undefined:stable(data)]);pendingCount=Math.max(0,pendingCount-1);}
  // altas, en lotes
  var chunks=[],cur=[],curBytes=0;
  ins.forEach(function(o){var sz=JSON.stringify(o.rec.data).length+200;if(cur.length&&(cur.length>=BATCH||curBytes+sz>BATCH_BYTES)){chunks.push(cur);cur=[];curBytes=0;}cur.push(o);curBytes+=sz;});
  if(cur.length)chunks.push(cur);
  for(var i=0;i<chunks.length;i++){
    var chunk=chunks[i];
    var r=await sbClient.from('sync_records').insert(chunk.map(function(o){return {clinic_id:c,kind:o.rec.kind,id:o.rec.id,data:clone(o.rec.data)};})).select('kind,id,rev');
    if(!r.error){chunk.forEach(function(o){ok(o.key,1,o.h,false,o.rec.data);});}
    else if(r.error.code==='23505'){
      for(var j=0;j<chunk.length;j++){
        var o=chunk[j],r1=await sbClient.from('sync_records').insert({clinic_id:c,kind:o.rec.kind,id:o.rec.id,data:clone(o.rec.data)}).select('rev');
        if(!r1.error)ok(o.key,1,o.h,false,o.rec.data);else if(r1.error.code==='23505')conflicts++;else throw r1.error;
      }
    }else throw r.error;
  }
  // cambios y borrados con control de versión (solo entran si parten de la versión que el servidor tiene)
  var jobs=upd.map(function(o){return {t:'u',o:o};}).concat(g.allowed.map(function(d){return {t:'d',o:d};}));
  await pool(jobs,async function(j){
    var o=j.o,kind=o.key.split('|')[0],id=o.key.slice(kind.length+1);
    var patch=j.t==='u'?{data:clone(o.rec.data),rev:o.base+1,deleted:false}:{data:null,rev:o.base+1,deleted:true};
    var r=await sbClient.from('sync_records').update(patch).eq('clinic_id',c).eq('kind',kind).eq('id',id).eq('rev',o.base).select('rev');
    if(r.error){if(r.error.code==='40001'){conflicts++;return;}throw r.error;}
    if(!r.data||!r.data.length){conflicts++;return;}
    if(j.t==='u')ok(o.key,o.base+1,o.h,false,o.rec.data);else ok(o.key,o.base+1,null,true);
  },CONC);
  if(meta.allowDeletes&&!conflicts)meta.allowDeletes=false;
  if(writes.length)await sdbPut(writes);
  return {conflicts:conflicts,sent:ins.length+upd.length+g.allowed.length};
}

function countPending(){
  try{
    var snap=snapshot(),n=0;
    snap.forEach(function(rec,key){var m=meta.recs[key];if(!m||m.del||m.hash!==hashOf(rec.kind,rec.data))n++;});
    Object.keys(meta.recs).forEach(function(k){if(!meta.recs[k].del&&!snap.has(k))n++;});
    return n;
  }catch(e){return pendingCount;}
}
/* ═══ CICLO DE SINCRONIZACIÓN ═══ */
async function syncNow(){
  if(!ready())return;
  if(running){pendingAgain=true;return running;}
  running=(async function(){
    setStatus('sync');var pr={changed:0};
    try{
      var s=await sbClient.auth.getSession();
      if(!s||!s.data||!s.data.session){needLogin=true;setStatus('login');return;}
      ensureKeys();
      for(var round=0;round<4;round++){
        pr=await pull();var ps=await push();
        if(!ps.conflicts)break;
      }
      meta.legacyDone=true;await saveMeta();
      retryMs=0;lastError='';lastSyncAt=Date.now();try{localStorage.setItem('oa3_sb_lastsync',new Date().toISOString());}catch(e){}
      if(guardInfo)audit('Nube: borrado masivo bloqueado',guardInfo.patients+' pacientes / '+guardInfo.total+' registros');
      setStatus(guardInfo?'guard':'ok');
      if(pr.changed)refrescarVista();
    }catch(e){
      lastError=errMsg(e);console.warn('Sync:',e);pendingCount=countPending();
      retryMs=Math.min(300000,(retryMs||15000)*2);setStatus('error');
      schedule(retryMs);
    }finally{running=null;if(pendingAgain){pendingAgain=false;schedule(500);}}
  })();
  return running;
}
function schedule(ms){if(!ready())return;clearTimeout(timer);timer=setTimeout(function(){syncNow().catch(function(){});},ms==null?DEBOUNCE_MS:ms);}
window.syncSchedule=function(ms){if(applying)return;schedule(ms);};

function refrescarVista(){
  try{renderSidebar();}catch(e){}
  var ov=document.getElementById('modalOverlay');if(ov&&ov.classList.contains('show'))return;
  var a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return;
  try{
    if(curPt){if(patients.indexOf(curPt)<0){curPt=null;showPage('dashboard');}else if(typeof renderTab==='function')renderTab();}
    else if(curPage&&curPage!=='configuracion')showPage(curPage);
  }catch(e){console.warn('refrescarVista',e);}
}

/* ═══ ESTADO EN PANTALLA ═══ */
function setStatus(s){
  state=s;
  var pend=pendingCount>0?' ('+pendingCount+' pendiente'+(pendingCount>1?'s':'')+')':'';
  var map={ok:['✓ Sincronizado','#3ecf8e'],sync:['⏳ Sincronizando…','#94a3b8'],error:['✗ Sin sincronizar'+pend,'#ef4444'],login:['Inicia sesión en la nube','#f59e0b'],guard:['⚠ Revisa un borrado masivo','#f59e0b'],idle:['Conectar Supabase',null]};
  var m=map[s]||map.idle;updateSbBtn(m[0],m[1]);
  var el=document.getElementById('sb-status');
  if(el){el.style.color=s==='error'?'#ef4444':s==='ok'?'#10b981':'var(--text2)';el.textContent=s==='error'?'✗ '+lastError:s==='ok'?'✓ Al día — '+new Date().toLocaleTimeString('es-EC'):m[0];}
  var ps=document.getElementById('sb-pend');if(ps)ps.textContent=String(pendingCount);
}

/* ═══ CONECTAR / DESCONECTAR ═══ */
var SB_SCHEMA_URL='supabase/schema.sql';
window.copiarSqlSync=async function(){
  try{var t=await (await fetch(SB_SCHEMA_URL,{cache:'no-store'})).text();await navigator.clipboard.writeText(t);alert('✓ SQL copiado. Pégalo en Supabase → SQL Editor → Run.');}
  catch(e){alert('No pude copiarlo automáticamente.\nAbre el archivo supabase/schema.sql de la carpeta de la app y copia su contenido.');}
};
window.openSbSetup=function(){
  openModal('<div class="modal-title">☁️ Conectar con Supabase</div>'+
  '<div style="background:#e8f0fe;border:1px solid #93c5fd;border-radius:10px;padding:14px;margin-bottom:14px;font-size:12px;color:#1e3a8a;line-height:1.8">'+
  '<b>1.</b> Crea un proyecto en <a href="https://supabase.com" target="_blank" style="color:#1a6cf6;font-weight:600">supabase.com</a> (gratis).<br>'+
  '<b>2.</b> En <b>SQL Editor</b> pega y ejecuta el SQL: <button class="btn-sm" style="font-size:11px;padding:3px 9px" onclick="copiarSqlSync()">📋 Copiar SQL</button><br>'+
  '<b>3.</b> En <b>Authentication → Users → Add user</b> crea tu usuario (correo y contraseña, marca <i>Auto Confirm</i>).<br>'+
  '<b>4.</b> En <b>Authentication → Sign In / Providers</b> desactiva <i>Allow new users to sign up</i> (así nadie más puede crear cuentas).<br>'+
  '<b>5.</b> En <b>Settings → API</b> copia la <b>Project URL</b> y la <b>anon public key</b>.</div>'+
  '<div class="form-row form-full"><div class="form-group"><label>Project URL *</label><input id="f_sburl" value="'+esc(sbUrl)+'" placeholder="https://abcdefgh.supabase.co" style="font-size:12px;font-family:monospace"></div></div>'+
  '<div class="form-row form-full"><div class="form-group"><label>Anon public key *</label><input id="f_sbkey" value="'+esc(sbKey)+'" placeholder="eyJ..." style="font-size:11px;font-family:monospace"></div></div>'+
  '<div class="form-row"><div class="form-group"><label>Correo *</label><input id="f_sbmail" type="email" autocomplete="username" value="'+esc(cfg.email)+'"></div>'+
  '<div class="form-group"><label>Contraseña *</label><input id="f_sbpass" type="password" autocomplete="current-password"></div></div>'+
  '<div class="form-row form-full"><div class="form-group"><label>ID de clínica anterior (solo si ya usabas Supabase antes, opcional)</label><input id="f_sbcid" value="'+esc(sbClinicaId&&sbClinicaId!==cfg.clinicUuid?sbClinicaId:'')+'" placeholder="dr-garcia-quito" style="font-size:13px"></div></div>'+
  '<div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" id="sbGo" onclick="sbConectar()">Conectar</button></div>'+
  '<div id="sb-status" style="margin-top:8px;font-size:12px;text-align:center;min-height:18px"></div>');
};
function friendlyAuthError(e){
  var m=errMsg(e);
  if(/invalid login/i.test(m))return 'Correo o contraseña incorrectos.';
  if(/email not confirmed/i.test(m))return 'Ese usuario no está confirmado. Créalo con “Auto Confirm” en Supabase → Authentication → Users.';
  return m;
}
window.sbConectar=async function(){
  var url=v('f_sburl').trim(),key=v('f_sbkey').trim(),mail=v('f_sbmail').trim(),pass=document.getElementById('f_sbpass').value,legacy=v('f_sbcid').trim().toLowerCase().replace(/\s+/g,'-');
  var st=document.getElementById('sb-status'),say=function(t,c){if(st){st.style.color=c||'var(--text2)';st.textContent=t;}};
  if(!url||!key||!mail||!pass){alert('Completa URL, key, correo y contraseña.');return;}
  if(!/^https:\/\/[^\s]+$/.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)/.test(url)){alert('La URL debe ser del formato https://xxxx.supabase.co');return;}
  var btn=document.getElementById('sbGo');if(btn)btn.disabled=true;
  try{
    sbUrl=url;sbKey=key;sbClinicaId=legacy||'';
    sbClient=makeClient();if(!sbClient)throw new Error('No se pudo cargar la librería de Supabase (¿hay internet?).');
    say('⏳ Iniciando sesión…');
    var a=await sbClient.auth.signInWithPassword({email:mail,password:pass});if(a.error)throw new Error(friendlyAuthError(a.error));
    say('⏳ Buscando tu clínica…');
    var mem=await sbClient.from('clinic_members').select('clinic_id,role,clinics(name)').limit(5);
    if(mem.error){if(/relation|schema cache|does not exist|PGRST205|42P01/i.test(JSON.stringify(mem.error)))throw new Error('Faltan las tablas: ejecuta el SQL del paso 2.');throw mem.error;}
    var cid;
    if(mem.data&&mem.data.length)cid=mem.data[0].clinic_id;
    else{
      if(!confirm('Tu cuenta todavía no tiene una clínica en la nube.\n\n¿Crear una nueva con tus datos actuales?'))throw new Error('Conexión cancelada.');
      var cr=await sbClient.rpc('create_clinic',{p_name:txt('logoText')||'Mi clínica'});if(cr.error)throw cr.error;cid=cr.data;
    }
    cfg.clinicUuid=cid;cfg.email=mail;if(!sbClinicaId)sbClinicaId=cid;
    meta=newMeta(cid);needLogin=false;
    // ¿la nube ya tiene datos y este dispositivo también?
    var cnt=await sbClient.from('sync_records').select('id',{count:'exact',head:true}).eq('clinic_id',cid).eq('kind','patient').eq('deleted',false);
    var remoteN=cnt.count||0,localN=patients.filter(function(p){return !p.demo;}).length;
    if(remoteN>0&&localN>0){
      var combine=confirm('La nube ya tiene '+remoteN+' paciente(s) y este dispositivo tiene '+localN+'.\n\nAceptar = COMBINAR ambos (se conserva todo; si algo choca, gana lo de la nube y queda anotado).\nCancelar = otras opciones.');
      if(!combine){
        if(confirm('¿Reemplazar los datos de ESTE dispositivo por los de la nube?\n\n⚠️ Lo que solo exista aquí se perderá.')){patients=[];egresos=[];facturas=[];quickAppts=[];archivosContables=[];}
        else throw new Error('Conexión cancelada. No se cambió nada.');
      }
    }
    if(remoteN>0){patients=patients.filter(function(p){return !p.demo;});egresos=egresos.filter(function(e){return !e.demo;});}   // la nube ya tiene datos reales: fuera los de ejemplo
    saveCfg();await saveMeta();
    audit('Nube: conectado','Cuenta '+mail);
    setStatus('sync');closeModal();
    await syncNow();
    openSbPanel();
  }catch(e){
    sbClient=null;meta=null;
    if(document.getElementById('sb-status'))say('✗ '+errMsg(e),'#ef4444');else alert(errMsg(e));
    if(btn)btn.disabled=false;
  }
};
window.sbDesconectar=async function(){
  if(!confirm('¿Cerrar sesión y desconectar de Supabase?\n\nTus datos locales NO se borran y los de la nube tampoco.'))return;
  try{if(sbClient)await sbClient.auth.signOut();}catch(e){}
  audit('Nube: desconectado','');
  sbClient=null;sbUrl='';sbKey='';sbClinicaId='';cfg={url:'',key:'',clinicUuid:'',email:''};meta=null;clearTimeout(timer);
  localStorage.setItem('oa3_sb',JSON.stringify({url:'',key:'',clinicaId:'',clinicUuid:'',email:''}));
  await sdbClear();setStatus('idle');closeModal();
};
window.sbAction=function(){if(!sbUrl||!sbKey||!cfg.clinicUuid){openSbSetup();return;}if(!sbClient)sbClient=makeClient();openSbPanel();};
window.sbSyncManual=async function(){if(needLogin){alert('Tu sesión expiró. Usa “Cambiar cuenta” para volver a iniciar sesión.');return;}await syncNow();openSbPanel();};
window.syncRecuperarDeNube=async function(){
  if(!confirm('Se descargará todo desde la nube y SE REEMPLAZARÁN los datos de este dispositivo.\n\n¿Continuar?'))return;
  patients=[];egresos=[];facturas=[];quickAppts=[];archivosContables=[];servicios=servicios||[];
  meta=newMeta(cfg.clinicUuid);await sdbClear();await saveMeta();audit('Nube: recuperó todo desde la nube','');
  applying=true;try{saveNow();}finally{applying=false;}
  guardInfo=null;await syncNow();refrescarVista();openSbPanel();
};
window.syncConfirmarBorrado=async function(){
  if(!confirm('Esto BORRARÁ también en la nube los registros que ya no existen aquí.\n\n¿Estás seguro de que eliminaste esos datos a propósito?'))return;
  meta.allowDeletes=true;await saveMeta();audit('Nube: confirmó borrado masivo','');guardInfo=null;await syncNow();openSbPanel();
};
function fmtLog(x){return '<div style="padding:4px 0;border-bottom:1px solid var(--border)"><b>'+esc(x.label)+'</b> · '+esc(x.path||'(registro completo)')+'<br><span style="color:var(--text3)">Ganó '+(x.won==='local'?'este dispositivo':'la nube')+'. Se descartó: '+esc(x.lost)+' · '+new Date(x.t).toLocaleString('es-EC')+'</span></div>';}
window.openSbPanel=function(){
  var last=localStorage.getItem('oa3_sb_lastsync'),log=(meta&&meta.log)||[];
  openModal('<div class="modal-title">☁️ Sincronización en la nube</div>'+
  '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:12px;display:flex;align-items:center;gap:12px"><div style="font-size:28px">'+(needLogin?'🔑':'✅')+'</div><div>'+
  '<div style="font-size:13px;font-weight:700;color:#15803d">'+(needLogin?'Sesión expirada':'Conectado')+' · '+esc(cfg.email)+'</div>'+
  (last?'<div style="font-size:11px;color:#166534;margin-top:2px">Última sincronización: '+esc(new Date(last).toLocaleString('es-EC'))+'</div>':'')+
  '<div style="font-size:11px;color:#166534;margin-top:2px">Cambios pendientes de subir: <b id="sb-pend">'+pendingCount+'</b></div></div></div>'+
  (guardInfo?'<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin-bottom:12px;font-size:12px;color:#78350f"><b>⚠️ Se bloqueó un borrado masivo.</b> Este dispositivo no tiene '+guardInfo.patients+' paciente(s) que sí están en la nube. Si los datos no cargaron bien, es lo correcto: <b>no se tocó la nube</b>.<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn-primary" style="font-size:12px" onclick="syncRecuperarDeNube()">Recuperar desde la nube</button><button class="btn-sec" style="font-size:12px" onclick="syncConfirmarBorrado()">Sí, los eliminé a propósito</button></div></div>':'')+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn-primary" onclick="sbSyncManual()">🔄 Sincronizar ahora</button>'+
  (sbClinicaId&&sbClinicaId!==cfg.clinicUuid?'<button class="btn-sec" onclick="sbLoadNow()" title="Trae los datos de la nube antigua (un solo registro)">Importar de la nube antigua</button>':'')+'</div>'+
  '<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:10px;padding:12px;margin-bottom:12px;font-size:11px;color:#6b4a2f">Cada paciente, cita y pago se sincroniza <b>por separado</b>: si dos dispositivos editan cosas distintas, <b>se conservan ambas</b>. Sin internet sigues trabajando y todo se sube al volver la conexión.</div>'+
  (log.length?'<details style="margin-bottom:12px;font-size:11px"><summary style="cursor:pointer;font-weight:600">Cambios descartados al fusionar ('+log.length+')</summary><div style="max-height:160px;overflow:auto;margin-top:6px">'+log.slice().reverse().slice(0,30).map(fmtLog).join('')+'</div></details>':'')+
  '<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:14px"><div style="font-size:14px;font-weight:700;margin-bottom:10px">🛡️ Historial de Respaldos</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button id="btnCrearBackup" onclick="crearBackupHistorico(\'Respaldo manual\')" style="padding:12px;background:var(--accent);color:white;border:none;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer">💾 Crear punto de restauración</button>'+
  '<button onclick="mostrarHistorialRespaldos()" style="padding:12px;background:var(--surface-bg);color:var(--text);border:1px solid var(--border);border-radius:10px;font-size:12px;font-weight:600;cursor:pointer">📜 Ver historial</button></div></div>'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><button onclick="sbDesconectar()" style="font-size:11px;color:var(--red);background:none;border:none;cursor:pointer">Cerrar sesión y desconectar</button>'+
  '<button onclick="openSbSetup()" style="font-size:11px;color:var(--text2);background:none;border:none;cursor:pointer">Cambiar cuenta</button><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>'+
  '<div id="sb-status" style="margin-top:10px;font-size:12px;text-align:center;min-height:20px"></div>');
  setStatus(state);
};

/* ═══ ARRANQUE ═══ */
window.syncStart=async function(){
  sbLoadConfig();loadCfg();
  if(!sbUrl||!sbKey||!cfg.clinicUuid){setStatus('idle');return;}
  sbClient=makeClient();
  if(!sbClient){updateSbBtn('Nube no disponible (sin internet al abrir)','#f59e0b');return;}
  var m=await sdbGet('meta');meta=(m&&m.clinicId===cfg.clinicUuid)?m:newMeta(cfg.clinicUuid);
  setStatus('sync');
  if(!listenersOn){
    listenersOn=true;
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&ready()&&Date.now()-lastSyncAt>30000)schedule(300);});
    window.addEventListener('online',function(){schedule(500);});
    setInterval(function(){if(ready()&&!document.hidden&&!running)schedule(0);},POLL_MS);
  }
  schedule(800);
};
window.SyncEngine={merge3:merge3,mergeRecord:mergeRecord,stable:stable,hashOf:hashOf,snapshot:snapshot,syncNow:syncNow,push:push,pull:pull,
  info:function(){return {meta:meta,pendingCount:pendingCount,guardInfo:guardInfo,state:state,lastError:lastError,needLogin:needLogin,cfg:cfg};},
  setMeta:function(m){meta=m;},ensureKeys:ensureKeys,setPage:function(n){PAGE=n;},setBatchBytes:function(n){BATCH_BYTES=n;},countPending:countPending};
})();
