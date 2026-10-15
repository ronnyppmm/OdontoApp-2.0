/* ═══ BÓVEDA — cifrado de los datos guardados en este dispositivo (AES-GCM de 256 bits) ═══
   Idea: los datos se cifran con una CLAVE DE DATOS (DEK) aleatoria que solo vive en memoria.
   La DEK se guarda «envuelta» (cifrada) de dos formas: con el PIN y con el código de recuperación.
   Quien tenga los archivos del navegador pero no el PIN ni el código solo ve bytes sin sentido.

   Límite honesto: el PIN tiene pocos dígitos, así que un atacante con los archivos y mucho tiempo de cálculo podría adivinarlo.
   Por eso: PBKDF2 de 600 000 vueltas y se exigen 6 a 8 dígitos para activar el cifrado.
   No protege contra alguien que use la app ya desbloqueada, ni los archivos de respaldo que tú exportas, ni la copia en la nube.

   Este archivo no depende de nada más de la app (se carga primero). El resto lo usa así:
     Vault.enabled()            ¿hay cifrado activado?          Vault.locked()   ¿activado y aún sin abrir?
     Vault.create(pin,codigo)   activa (guarda la DEK envuelta) Vault.unlockPin / unlockRec   abren
     Vault.rewrap(pin,codigo)   cambia PIN/código sin tocar los datos    Vault.remove()   desactiva
     Vault.seal(valor,aad) / Vault.open(sobre,aad)    cifra / descifra un valor (JSON o Blob)
     Vault.whenOpen()           promesa que se cumple cuando se puede leer (de inmediato si no hay cifrado) */
const Vault=(function(){
'use strict';
var LSK='oa3_vault',ITER=600000;
function aadKey(){return new TextEncoder().encode('oa-vault-v1');}
var cfg=null,dek=null,dekRaw=null,waiters=[],paused=false;
try{cfg=JSON.parse(localStorage.getItem(LSK));}catch(e){cfg=null;}
if(!cfg||!cfg.on||!cfg.pin||!cfg.rec)cfg=null;

function b64e(u){var s='',a=new Uint8Array(u);for(var i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s);}
function b64d(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function rnd(n){return crypto.getRandomValues(new Uint8Array(n));}
function subtle(){if(!(window.crypto&&crypto.subtle))throw new Error('Sin WebCrypto (se necesita HTTPS o localhost)');return crypto.subtle;}
function norm(code){return String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}

function enabled(){return !!cfg;}
function isOpen(){return !cfg||!!dek;}
function locked(){return !!cfg&&!dek;}
/* ¿lo que se guarde ahora debe cifrarse? Se pausa mientras se descifra todo, para que nada nuevo se cifre a mitad de camino */
function sealing(){return !!cfg&&!!dek&&!paused;}
function pause(b){paused=!!b;}
function whenOpen(){return isOpen()?Promise.resolve(true):new Promise(function(ok){waiters.push(ok);});}
function setKey(raw){
  return subtle().importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']).then(function(k){
    dek=k;dekRaw=raw;var w=waiters;waiters=[];w.forEach(function(f){f(true);});return true;
  });
}

/* ── envolver / desenvolver la DEK con una clave derivada de un secreto ── */
function kekFrom(secret,salt,iter){
  return subtle().importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveKey']).then(function(base){
    return subtle().deriveKey({name:'PBKDF2',salt:salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  });
}
function wrap(secret,raw){
  var salt=rnd(16),iv=rnd(12);
  return kekFrom(secret,salt,ITER).then(function(k){
    return subtle().encrypt({name:'AES-GCM',iv:iv,additionalData:aadKey()},k,raw);
  }).then(function(ct){return {s:b64e(salt),iv:b64e(iv),ct:b64e(ct)};});
}
function unwrap(secret,w,iter){
  return kekFrom(secret,b64d(w.s),iter||ITER).then(function(k){
    return subtle().decrypt({name:'AES-GCM',iv:b64d(w.iv),additionalData:aadKey()},k,b64d(w.ct));
  }).then(function(raw){return new Uint8Array(raw);}).catch(function(){return null;});
}
function persist(c){localStorage.setItem(LSK,JSON.stringify(c));}

/* Activa el cifrado: crea una DEK nueva y la guarda envuelta con el PIN y con el código. Queda ABIERTA (la DEK en memoria). */
function create(pin,code){
  var raw=rnd(32);
  return Promise.all([wrap(String(pin),raw),wrap(norm(code),raw)]).then(function(w){
    var c={v:1,on:true,iter:ITER,pin:w[0],rec:w[1]};
    persist(c);cfg=c;return setKey(raw);
  });
}
/* Cambia PIN y código (la DEK no cambia, así que los datos no se tocan). Necesita la bóveda abierta. */
function rewrap(pin,code){
  if(!cfg||!dekRaw)return Promise.reject(new Error('Bóveda cerrada'));
  return Promise.all([wrap(String(pin),dekRaw),wrap(norm(code),dekRaw)]).then(function(w){
    var c={v:1,on:true,iter:ITER,pin:w[0],rec:w[1]};persist(c);cfg=c;return true;
  });
}
function unlockWith(secret,which){
  if(!cfg)return Promise.resolve(true);
  return unwrap(secret,cfg[which],cfg.iter).then(function(raw){
    if(!raw)return false;
    return dek?true:setKey(raw);
  });
}
function unlockPin(pin){return unlockWith(String(pin),'pin');}
function unlockRec(code){return unlockWith(norm(code),'rec');}
/* Verifica el PIN sin abrir nada nuevo (la bóveda ya abierta) */
function checkPin(pin){return cfg?unwrap(String(pin),cfg.pin,cfg.iter).then(function(r){return !!r;}):Promise.resolve(true);}
function checkRec(code){return cfg?unwrap(norm(code),cfg.rec,cfg.iter).then(function(r){return !!r;}):Promise.resolve(true);}
/* Desactiva (solo después de haber descifrado todos los datos) */
function remove(){try{localStorage.removeItem(LSK);}catch(e){}cfg=null;dek=null;dekRaw=null;paused=false;var w=waiters;waiters=[];w.forEach(function(f){f(true);});}

/* ── cifrar / descifrar valores ── */
function isEnv(v){return !!(v&&typeof v==='object'&&v.oa===1&&v.iv&&v.ct);}
function toBuf(blob){
  if(blob.arrayBuffer)return blob.arrayBuffer();
  return new Promise(function(ok,no){var r=new FileReader();r.onload=function(){ok(r.result);};r.onerror=function(){no(r.error);};r.readAsArrayBuffer(blob);});
}
function isBlob(v){return typeof Blob!=='undefined'&&v instanceof Blob;}
function seal(value,aad){
  if(!dek)return Promise.reject(new Error('Bóveda cerrada'));
  var iv=rnd(12),ad=new TextEncoder().encode(String(aad||''));
  var pre=isBlob(value)?toBuf(value).then(function(b){return {t:'b',buf:b,mime:value.type||'',size:value.size};})
    :Promise.resolve({t:'j',buf:new TextEncoder().encode(JSON.stringify(value)),size:0});
  return pre.then(function(p){
    return subtle().encrypt({name:'AES-GCM',iv:iv,additionalData:ad},dek,p.buf).then(function(ct){
      var env={oa:1,t:p.t,iv:iv,ct:ct};if(p.t==='b'){env.mime=p.mime;env.size=p.size;}return env;
    });
  });
}
function open(env,aad){
  if(!isEnv(env))return Promise.resolve(env);                 // dato antiguo sin cifrar: se lee tal cual
  if(!dek)return Promise.reject(new Error('Bóveda cerrada'));
  var ad=new TextEncoder().encode(String(aad||''));
  return subtle().decrypt({name:'AES-GCM',iv:env.iv,additionalData:ad},dek,env.ct).then(function(buf){
    if(env.t==='b')return new Blob([buf],{type:env.mime||''});
    return JSON.parse(new TextDecoder().decode(buf));
  });
}

return {enabled:enabled,sealing:sealing,pause:pause,locked:locked,isOpen:isOpen,whenOpen:whenOpen,create:create,rewrap:rewrap,unlockPin:unlockPin,unlockRec:unlockRec,
  checkPin:checkPin,checkRec:checkRec,remove:remove,isEnv:isEnv,seal:seal,open:open,ITER:ITER};
})();
