/* ═══ SEGURIDAD — PIN de acceso, bloqueo automático, código de recuperación y registro de actividad ═══ */
(function(){
'use strict';
const KEY='oa3_sec', QKEY='oa3_auditq', ITER=150000, MAX_LOG=3000;
let cfg=null; try{cfg=JSON.parse(localStorage.getItem(KEY));}catch(e){}
let locked=false, idleT=null, lastAct=0, saves=0;
const enabled=()=>!!(cfg&&cfg.hash);
const saveCfg=()=>localStorage.setItem(KEY,JSON.stringify(cfg));
const $=id=>document.getElementById(id);

/* ── criptografía ── */
const b64e=u=>btoa(String.fromCharCode.apply(null,Array.from(u)));
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hasCrypto=()=>!!(window.crypto&&crypto.subtle&&crypto.getRandomValues);
async function derive(secret,saltB64){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveBits']);
  return b64e(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:b64d(saltB64),iterations:ITER,hash:'SHA-256'},key,256)));
}
const newSalt=()=>b64e(crypto.getRandomValues(new Uint8Array(16)));
function eq(a,b){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
function genRecovery(){
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',r=crypto.getRandomValues(new Uint8Array(16));let s='';
  for(let i=0;i<16;i++){s+=A[r[i]%A.length];if(i%4===3&&i<15)s+='-';}return s;
}
const normRec=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function pinDebil(p){
  if(/^(\d)\1+$/.test(p))return true;
  const seq='0123456789',rev='9876543210';return seq.includes(p)||rev.includes(p);
}
const pinValido=p=>/^\d{4,8}$/.test(p);

/* ── intentos fallidos ── */
const segundosBloqueo=()=>Math.max(0,Math.ceil((((cfg&&cfg.lockUntil)||0)-Date.now())/1000));
function registrarFallo(){
  cfg.fails=(cfg.fails||0)+1;
  if(cfg.fails%5===0){const n=cfg.fails/5;cfg.lockUntil=Date.now()+Math.min(900,30*Math.pow(2,n-1))*1000;}
  saveCfg();
}
function limpiarFallos(){cfg.fails=0;cfg.lockUntil=0;saveCfg();}
async function verificarPin(pin){
  if(segundosBloqueo()>0)return'locked';
  if(await derive(pin,cfg.salt).then(h=>eq(h,cfg.hash))){limpiarFallos();return'ok';}
  registrarFallo();audit('PIN incorrecto','Intento '+cfg.fails+(segundosBloqueo()>0?' — acceso bloqueado temporalmente':''));
  return segundosBloqueo()>0?'locked':'bad';
}
async function verificarCodigo(code){
  if(segundosBloqueo()>0)return'locked';
  if(await derive(normRec(code),cfg.recSalt).then(h=>eq(h,cfg.recHash))){limpiarFallos();return'ok';}
  registrarFallo();audit('Código de recuperación incorrecto','Intento '+cfg.fails);
  return segundosBloqueo()>0?'locked':'bad';
}
async function fijarPin(pin){
  cfg=Object.assign({autoMin:10,fails:0,lockUntil:0},cfg||{});
  cfg.salt=newSalt();cfg.hash=await derive(pin,cfg.salt);
  const code=genRecovery();cfg.recSalt=newSalt();cfg.recHash=await derive(normRec(code),cfg.recSalt);
  saveCfg();return code;
}

/* ── registro de actividad (auditoría) ── */
let auditChain=Promise.resolve();
function audit(ev,det){
  try{
    const q=JSON.parse(localStorage.getItem(QKEY)||'[]');q.push({t:Date.now(),ev:String(ev),det:String(det||'')});
    localStorage.setItem(QKEY,JSON.stringify(q.slice(-200)));
  }catch(e){}
  clearTimeout(audit._t);audit._t=setTimeout(flushAudit,800);
}
function flushAudit(){
  auditChain=auditChain.then(async()=>{
    let q=[];try{q=JSON.parse(localStorage.getItem(QKEY)||'[]');}catch(e){}
    if(!q.length)return;
    const cur=(await idbGet('audit'))||[];
    const ok=await idbSet('audit',cur.concat(q).slice(-MAX_LOG));
    if(ok){try{const resto=JSON.parse(localStorage.getItem(QKEY)||'[]').slice(q.length);
      if(resto.length)localStorage.setItem(QKEY,JSON.stringify(resto));else localStorage.removeItem(QKEY);}catch(e){}}
  }).catch(()=>{});
  return auditChain;
}
window.addEventListener('beforeunload',()=>{try{flushAudit();}catch(e){}});
async function leerRegistro(){await flushAudit();return((await idbGet('audit'))||[]);}

/* ── pantalla de bloqueo ── */
function buildLock(){
  if($('lockScreen'))return;
  const d=document.createElement('div');d.id='lockScreen';
  d.innerHTML=`<div class="lock-box">
    <div class="lock-ico">🔒</div><div class="lock-title" id="lockClinic"></div>
    <div class="lock-sub">Ingresa tu PIN para continuar</div>
    <input id="lockPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN" aria-label="PIN">
    <div class="lock-msg" id="lockMsg" role="alert"></div>
    <button class="btn-primary lock-btn" id="lockGo">Entrar</button>
    <a class="lock-link" id="lockForgot" href="#">¿Olvidaste tu PIN?</a>
    <div id="lockForgotPanel" style="display:none">
      <div class="lock-sep"></div>
      <div class="lock-h">Tengo mi código de recuperación</div>
      <input id="lockRec" type="text" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="Código de recuperación">
      <input id="lockNew1" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Nuevo PIN (4 a 8 dígitos)">
      <input id="lockNew2" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Repite el nuevo PIN">
      <button class="btn-sec lock-btn" id="lockRecGo">Restablecer PIN</button>
      <div class="lock-sep"></div>
      <div class="lock-h">No tengo el código</div>
      <div class="lock-note">Tus datos siguen en este navegador pero no hay forma de abrirlos sin el PIN. Solo puedes borrar los datos de este dispositivo y restaurar desde un respaldo (archivo o Supabase). Escribe <b>BORRAR</b> para confirmar.</div>
      <input id="lockWipe" type="text" autocomplete="off" placeholder="BORRAR">
      <button class="lock-danger lock-btn" id="lockWipeGo">Borrar datos de este dispositivo</button>
    </div></div>`;
  document.body.appendChild(d);
  $('lockGo').addEventListener('click',intentarEntrar);
  $('lockPin').addEventListener('keydown',e=>{if(e.key==='Enter')intentarEntrar();});
  $('lockForgot').addEventListener('click',e=>{e.preventDefault();const p=$('lockForgotPanel');p.style.display=p.style.display==='none'?'block':'none';});
  $('lockRecGo').addEventListener('click',restablecerConCodigo);
  $('lockWipeGo').addEventListener('click',borrarTodoLocal);
}
const lockMsg=(t,ok)=>{const m=$('lockMsg');if(m){m.textContent=t||'';m.style.color=ok?'var(--green,#16a34a)':'var(--red,#ef4444)';}};
function mensajeEstado(r){
  if(r==='locked')return'Demasiados intentos. Espera '+segundosBloqueo()+' s e inténtalo de nuevo.';
  return'PIN incorrecto.'+(cfg.fails%5?' Intentos restantes antes del bloqueo: '+(5-cfg.fails%5):'');
}
async function intentarEntrar(){
  const inp=$('lockPin');if(!inp||!inp.value)return;
  $('lockGo').disabled=true;
  try{const r=await verificarPin(inp.value);inp.value='';
    if(r==='ok'){desbloquear('PIN');}else{lockMsg(mensajeEstado(r));inp.focus();}
  }finally{$('lockGo').disabled=false;}
}
function bloquear(motivo){
  if(!enabled()||locked)return;
  locked=true;buildLock();
  try{if(typeof closeModal==='function')closeModal();const sr=$('searchResults');if(sr)sr.classList.remove('show');const gs=$('globalSearch');if(gs)gs.value='';}catch(e){}
  $('lockClinic').textContent=($('logoText')&&$('logoText').textContent)||'OdontoApp';
  $('lockScreen').style.display='flex';document.body.classList.add('app-locked');
  lockMsg('');$('lockForgotPanel').style.display='none';
  clearTimeout(idleT);setTimeout(()=>{const i=$('lockPin');if(i)i.focus();},50);
  if(motivo)audit('Bloqueo',motivo);
}
function desbloquear(via){
  locked=false;const s=$('lockScreen');if(s)s.style.display='none';document.body.classList.remove('app-locked');
  audit('Acceso',via||'PIN');reiniciarInactividad();
}
async function restablecerConCodigo(){
  const code=$('lockRec').value,a=$('lockNew1').value,b=$('lockNew2').value;
  if(!pinValido(a)||a!==b)return lockMsg('El nuevo PIN debe tener de 4 a 8 dígitos y coincidir en ambos campos.');
  if(pinDebil(a))return lockMsg('Elige un PIN menos obvio (no repetidos ni consecutivos).');
  const r=await verificarCodigo(code);
  if(r!=='ok')return lockMsg(r==='locked'?mensajeEstado('locked'):'Código de recuperación incorrecto.');
  const nuevo=await fijarPin(a);audit('PIN restablecido','Con código de recuperación');
  ['lockRec','lockNew1','lockNew2'].forEach(i=>$(i).value='');
  desbloquear('Recuperación');
  mostrarCodigo(nuevo,'Tu PIN fue restablecido. Este es tu NUEVO código de recuperación (el anterior ya no sirve)');
}
async function borrarTodoLocal(){
  if($('lockWipe').value.trim().toUpperCase()!=='BORRAR')return lockMsg('Escribe BORRAR para confirmar.');
  audit('Borrado de datos locales','Desde pantalla de bloqueo, sin PIN');await flushAudit().catch(()=>{});
  try{localStorage.clear();}catch(e){}
  ['odontoapp_db','odontoapp_imgs','odontoapp_sync'].forEach(n=>{try{indexedDB.deleteDatabase(n);}catch(e){}});
  lockMsg('Datos borrados. Recargando…',true);setTimeout(()=>location.reload(),900);
}

/* ── bloqueo por inactividad ── */
function reiniciarInactividad(){
  clearTimeout(idleT);
  if(!enabled()||locked||!cfg.autoMin)return;
  idleT=setTimeout(()=>bloquear('Inactividad ('+cfg.autoMin+' min)'),cfg.autoMin*60000);
}
['mousedown','keydown','touchstart','scroll','mousemove'].forEach(ev=>document.addEventListener(ev,()=>{
  const n=Date.now();if(n-lastAct>3000){lastAct=n;reiniciarInactividad();}
},{passive:true,capture:true}));
// mientras está bloqueado, ningún atajo (Ctrl+K, Esc…) llega a la app
document.addEventListener('keydown',e=>{if(locked&&!(e.target.closest&&e.target.closest('#lockScreen'))){e.stopImmediatePropagation();e.preventDefault();}},true);

/* ── pantallas de configuración (modales) ── */
const modalPin=(titulo,campos,accion,btn)=>openModal(`<div class="modal-title">${titulo}</div>${campos}
  <div class="lock-msg" id="secMsg" role="alert" style="min-height:18px"></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" id="secGo" onclick="${accion}">${btn}</button></div>`);
const campo=(id,label,ph)=>`<div class="form-group" style="margin-bottom:10px"><label>${label}</label><input id="${id}" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="${ph||''}"></div>`;
const secMsg=t=>{const m=$('secMsg');if(m)m.textContent=t||'';};
function mostrarCodigo(code,intro){
  openModal(`<div class="modal-title">🔑 Código de recuperación</div>
  <p style="font-size:13px;color:var(--text2);margin-bottom:12px">${esc(intro||'Guarda este código en un lugar seguro (papel, gestor de contraseñas). Solo se muestra ahora y es la única forma de recuperar el acceso si olvidas el PIN.')}</p>
  <div class="rec-code" id="secRecCode">${esc(code)}</div>
  <div class="modal-footer"><button class="btn-sec" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.getElementById('secRecCode').textContent)">Copiar</button><button class="btn-primary" onclick="closeModal();renderConfigSiAbierta()">Ya lo guardé</button></div>`);
}
window.renderConfigSiAbierta=function(){try{actualizarBotonTopbar();showPage('configuracion');}catch(e){}};

const Seguridad={
  activo:enabled,
  abrirActivar(){
    if(!hasCrypto())return alert('El PIN necesita un contexto seguro (HTTPS o localhost). Abre la app desde GitHub Pages o Live Server.');
    modalPin('🔒 Activar PIN de acceso',campo('sec_p1','PIN (4 a 8 dígitos)')+campo('sec_p2','Repite el PIN'),'Seguridad.guardarActivar()','Activar');
  },
  async guardarActivar(){
    const a=$('sec_p1').value,b=$('sec_p2').value;
    if(!pinValido(a))return secMsg('El PIN debe tener de 4 a 8 dígitos.');
    if(a!==b)return secMsg('Los PIN no coinciden.');
    if(pinDebil(a))return secMsg('Elige un PIN menos obvio (no repetidos ni consecutivos).');
    $('secGo').disabled=true;const code=await fijarPin(a);audit('PIN activado','');
    mostrarCodigo(code);reiniciarInactividad();
  },
  abrirCambiar(){modalPin('Cambiar PIN',campo('sec_p0','PIN actual')+campo('sec_p1','Nuevo PIN (4 a 8 dígitos)')+campo('sec_p2','Repite el nuevo PIN'),'Seguridad.guardarCambiar()','Cambiar');},
  async guardarCambiar(){
    const a=$('sec_p1').value,b=$('sec_p2').value;
    if(!pinValido(a)||a!==b)return secMsg('El nuevo PIN debe tener de 4 a 8 dígitos y coincidir.');
    if(pinDebil(a))return secMsg('Elige un PIN menos obvio (no repetidos ni consecutivos).');
    $('secGo').disabled=true;const r=await verificarPin($('sec_p0').value);
    if(r!=='ok'){$('secGo').disabled=false;return secMsg(r==='locked'?mensajeEstado('locked'):'El PIN actual es incorrecto.');}
    const code=await fijarPin(a);audit('PIN cambiado','');mostrarCodigo(code,'PIN cambiado. Este es tu NUEVO código de recuperación (el anterior ya no sirve).');
  },
  abrirDesactivar(){modalPin('Desactivar PIN',`<p style="font-size:13px;color:var(--text2);margin-bottom:12px">La app quedará accesible sin PIN en este dispositivo.</p>`+campo('sec_p0','PIN actual'),'Seguridad.guardarDesactivar()','Desactivar');},
  async guardarDesactivar(){
    $('secGo').disabled=true;const r=await verificarPin($('sec_p0').value);
    if(r!=='ok'){$('secGo').disabled=false;return secMsg(r==='locked'?mensajeEstado('locked'):'El PIN actual es incorrecto.');}
    audit('PIN desactivado','');cfg=null;localStorage.removeItem(KEY);clearTimeout(idleT);closeModal();renderConfigSiAbierta();actualizarBotonTopbar();
  },
  setAuto(min){if(!enabled())return;cfg.autoMin=parseInt(min)||0;saveCfg();audit('Bloqueo automático',cfg.autoMin?cfg.autoMin+' min':'desactivado');reiniciarInactividad();},
  bloquear(){bloquear('Manual');},
  async verRegistro(){
    const L=(await leerRegistro()).slice().reverse().slice(0,300);
    const fila=x=>`<tr><td style="white-space:nowrap;padding:5px 8px;color:var(--text3)">${esc(new Date(x.t).toLocaleString('es-EC'))}</td><td style="padding:5px 8px;font-weight:600">${esc(x.ev)}</td><td style="padding:5px 8px;color:var(--text2)">${esc(x.det)}</td></tr>`;
    openModal(`<div class="modal-title">📋 Registro de actividad</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Últimos ${L.length} eventos (se conservan hasta ${MAX_LOG}). No contiene PIN ni datos clínicos, solo qué se hizo y cuándo.</div>
      <div style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>${L.map(fila).join('')||'<tr><td style="padding:16px;color:var(--text3)">Sin eventos todavía.</td></tr>'}</tbody></table></div>
      <div class="modal-footer"><button class="btn-sec" onclick="Seguridad.descargarRegistro()">Descargar CSV</button><button class="btn-primary" onclick="closeModal()">Cerrar</button></div>`);
  },
  async descargarRegistro(){
    const celda=s=>{s=String(s==null?'':s);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return'"'+s.replace(/"/g,'""')+'"';};
    const L=await leerRegistro();
    const csv='\ufeff'+'Fecha,Evento,Detalle\n'+L.map(x=>[new Date(x.t).toISOString(),x.ev,x.det].map(celda).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.download='OdontoApp_registro_actividad_'+today()+'.csv';a.click();
    audit('Exportó registro de actividad','CSV');
  },
  cardHtml(){
    const on=enabled(),sel=m=>`<option value="${m}"${(cfg&&cfg.autoMin)===m?' selected':''}>${m?m+' minutos':'Nunca'}</option>`;
    return `<div class="card"><div class="card-title">🔒 Seguridad y acceso</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:12px">${on?'<b style="color:var(--green,#16a34a)">PIN activo.</b> La app se bloquea al abrirla y tras un tiempo sin uso.':'<b style="color:var(--amber,#d97706)">PIN desactivado.</b> Cualquiera que abra este navegador puede ver los datos de los pacientes.'}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:${on?12:0}px">
        ${on?`<button class="btn-sec" onclick="Seguridad.bloquear()">Bloquear ahora</button><button class="btn-sec" onclick="Seguridad.abrirCambiar()">Cambiar PIN</button><button class="btn-sec" onclick="Seguridad.abrirDesactivar()">Desactivar PIN</button>`
            :`<button class="btn-primary" onclick="Seguridad.abrirActivar()">Activar PIN</button>`}
        <button class="btn-sec" onclick="Seguridad.verRegistro()">Ver registro de actividad</button>
      </div>
      ${on?`<div class="form-group" style="max-width:260px"><label>Bloqueo automático por inactividad</label><select onchange="Seguridad.setAuto(this.value)">${[5,10,30,0].map(sel).join('')}</select></div>`:''}
      <div style="font-size:11px;color:var(--text3);margin-top:12px;line-height:1.5">El PIN impide el acceso casual a la pantalla. No cifra los datos guardados en el navegador: protege también el dispositivo (clave de Windows/teléfono) y haz respaldos.</div></div>`;
  },
  _audit:audit,_estado:()=>({locked,enabled:enabled(),cfg:cfg&&{autoMin:cfg.autoMin,fails:cfg.fails}}),_flush:flushAudit
};
window.Seguridad=Seguridad;

/* ── botón 🔒 en la barra superior ── */
function actualizarBotonTopbar(){
  let b=$('lockBtn');
  if(!enabled()){if(b)b.remove();return;}
  if(b)return;
  const ref=$('darkToggle');if(!ref)return;
  b=document.createElement('button');b.id='lockBtn';b.title='Bloquear (requiere PIN)';b.textContent='🔒';b.setAttribute('aria-label','Bloquear');
  b.style.cssText=ref.style.cssText;b.addEventListener('click',()=>bloquear('Manual'));ref.parentNode.insertBefore(b,ref);
}
const _cfgOrig=window.renderConfiguracion;
if(typeof _cfgOrig==='function'){
  window.renderConfiguracion=function(){
    const h=_cfgOrig.apply(this,arguments),marca='<div class="card" style="border:1px solid #fca5a5">';
    return h.includes(marca)?h.replace(marca,Seguridad.cardHtml()+marca):h;
  };
}
setInterval(actualizarBotonTopbar,1500);actualizarBotonTopbar();

/* ── auditoría: engancha las acciones sensibles sin tocar su código ── */
let lastConfirm=null;const _cf=window.confirm;window.confirm=function(){lastConfirm=_cf.apply(window,arguments);return lastConfirm;};
const _save=window.save;window.save=function(){saves++;return _save.apply(this,arguments);};
const ptName=()=>{try{return curPt?curPt.name:'';}catch(e){return'';}};
const nom=id=>{try{const p=patients.find(x=>x.id===id);return p?p.name:'#'+id;}catch(e){return'';}};
/* modo 'ver' → registra siempre | modo 'cambio' → solo si la acción llamó a save() (evita registrar validaciones fallidas o cancelaciones) | modo 'confirm' → solo si el usuario aceptó el confirm() */
function hook(name,ev,modo,describir){hookOn(window,name,ev,modo,describir);}
function hookOn(holder,name,ev,modo,describir){
  const o=holder[name];if(typeof o!=='function')return;
  holder[name]=function(){
    const args=arguments;let det='';try{det=describir?describir.apply(null,args):'';}catch(e){}
    const antes=saves;lastConfirm=null;let r;
    try{r=o.apply(this,args);}catch(e){throw e;}
    const fin=()=>{if(det===null)return;if(modo==='ver'||(modo==='confirm'&&lastConfirm===true)||(modo==='cambio'&&saves>antes))audit(ev,det);};
    if(r&&typeof r.then==='function')return r.then(v=>{fin();return v;});
    fin();return r;
  };
}
let _lastSel={id:null,t:0};   // abrir el MISMO paciente dos veces en 1,5 s (crear→abrir, editar→reabrir) se anota una sola vez
hookOn(Patients,'select','Abrió ficha','ver',id=>{const n=Date.now(),dup=_lastSel.id===id&&n-_lastSel.t<1500;_lastSel={id:id,t:n};return dup?null:nom(id);});
hookOn(Patients,'saveNew','Creó paciente','cambio',()=>{try{return v('f_name');}catch(e){return'';}});
hookOn(Patients,'saveEdit','Editó datos del paciente','cambio',()=>ptName());
hookOn(Patients,'confirmDelete','Eliminó paciente','cambio',()=>ptName());
[['delAppt','Eliminó cita'],['deleteApptDetail','Eliminó cita'],['delDiary','Eliminó nota del diario'],['delOdoSnapshot','Eliminó registro de odontograma'],
 ['delTx','Eliminó tratamiento'],['delImg','Eliminó imagen'],['delConsent','Eliminó consentimiento'],['delReceta','Eliminó receta'],
 ['eliminarPresupuesto','Eliminó presupuesto'],['delPay','Eliminó pago'],['delEgreso','Eliminó egreso'],['eliminarArchivoMes','Eliminó archivo de mes']]
 .forEach(([f,ev])=>hook(f,ev,'cambio',function(){return ptName()+(arguments.length?' · id '+arguments[0]:'');}));
[['savePay','Registró pago'],['savePayFromPt','Registró pago'],['saveAppt','Creó cita'],['saveApptFromPt','Creó cita'],['cerrarMes','Cerró mes']]
 .forEach(([f,ev])=>hook(f,ev,'cambio',()=>ptName()));
hook('enviarRecallWA','Envió recordatorio de control por WhatsApp','ver',id=>nom(id));
hook('marcarContactado','Marcó paciente como contactado','cambio',id=>nom(id));
hook('posponerRecall','Pospuso recordatorio de paciente','cambio',id=>nom(id));
hook('noContactarRecall','Marcó paciente como "no contactar"','confirm',id=>nom(id));
hook('reactivarRecall','Reactivó recordatorios del paciente','cambio',id=>nom(id));
hook('factoryReset','Restableció la app (borró todo)','confirm',()=>'');
[['exportarDatos','Exportó respaldo completo'],['enviarCobroWA','Envió recordatorio de cobro por WhatsApp'],['importarDatos','Inició importación de respaldo'],['imprimirReceta','Imprimió receta'],['imprimirPresupuesto','Imprimió presupuesto'],
 ['imprimirComprobante','Imprimió comprobante'],['imprimirOdoSnapshot','Imprimió odontograma'],['restaurarDesdeHistorial','Restauró respaldo de la nube']]
 .forEach(([f,ev])=>hook(f,ev,'ver',()=>ptName()));

/* ── arranque: si hay PIN, bloquear YA, antes de que se pinte nada ── */
flushAudit();
if(enabled()){buildLock();bloquear('');reiniciarInactividad();}
})();
