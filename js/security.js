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
const PIN_COMUNES=['1212','1122','2580','0852','1357','2468','1004','2000','2001','6969','4321','1313','7777'];
function pinDebil(p){
  if(/^(\d)\1+$/.test(p))return true;
  if(/^(\d\d)\1+$/.test(p))return true;          // 121212, 4545…
  if(PIN_COMUNES.includes(p))return true;
  const seq='0123456789',rev='9876543210';return seq.includes(p)||rev.includes(p);
}
const pinValido=p=>/^\d{4,8}$/.test(p);
/* Reglas de un PIN nuevo (sin pantalla): → {ok,error} */
function validarPin(a,b){
  a=String(a==null?'':a);b=String(b==null?'':b);
  if(!pinValido(a))return {ok:false,error:'El PIN debe tener de 4 a 8 dígitos (solo números).'};
  if(a!==b)return {ok:false,error:'Los PIN no coinciden.'};
  if(pinDebil(a))return {ok:false,error:'Elige un PIN menos obvio (no repetidos, consecutivos ni muy comunes).'};
  return {ok:true};
}

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
  // todo se calcula primero; solo si sale bien se reemplaza la configuración (antes un fallo a medias dejaba sal nueva con hash viejo = PIN inservible)
  const salt=newSalt(),hash=await derive(pin,salt);
  const code=genRecovery(),recSalt=newSalt(),recHash=await derive(normRec(code),recSalt);
  cfg=Object.assign({autoMin:10,fails:0,lockUntil:0},cfg||{},{salt,hash,recSalt,recHash});
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
const EV_PACIENTE=new Set(["Abrió ficha", "Aprobó presupuesto", "Completó cita", "Creó cita", "Creó consentimiento", "Creó consentimiento personalizado", "Creó nota del diario clínico", "Creó paciente", "Creó paciente desde una cita rápida", "Creó presupuesto", "Editó datos de una imagen", "Editó datos del paciente", "Editó nota del diario clínico", "Eliminó cita", "Eliminó consentimiento", "Eliminó imagen", "Eliminó nota del diario", "Eliminó paciente", "Eliminó pago", "Eliminó presupuesto", "Eliminó receta", "Eliminó registro de odontograma", "Eliminó tratamiento", "Emitió receta", "Envió recordatorio de cobro por WhatsApp", "Envió recordatorio de control por WhatsApp", "Guardó registro de odontograma", "Imprimió comprobante", "Imprimió consentimiento", "Imprimió odontograma", "Imprimió presupuesto", "Imprimió receta", "Marcó cita como «no asistió»", "Marcó paciente como \"no contactar\"", "Marcó paciente como contactado", "Marcó pago como facturado", "Marcó tratamiento como realizado", "Pospuso recordatorio de paciente", "Reactivó recordatorios del paciente", "Rechazó presupuesto", "Registró firma de consentimiento", "Registró pago", "Registró tratamiento", "Subió imágenes"]);   // eventos cuyo detalle (en versiones anteriores) llevaba el NOMBRE del paciente
/* Limpieza del registro, una sola vez cada paso:
   1) versiones anteriores guardaban el NOMBRE del paciente → se cambia por su N.° de ficha (o se quita si ya no se puede identificar);
   2) las v20–v21 anotaban el id interno (muy largo) como ficha → se cambia por el N.° de ficha corto. */
async function limpiarNombres(){
  const f1=localStorage.getItem('oa3_audit_fichas')==='1',f2=localStorage.getItem('oa3_audit_fichas2')==='1';
  if(f1&&f2)return 0;
  const cur=(await idbGet('audit'))||[];let n=0;
  const porNombre={};try{Patients.all().forEach(p=>{const k=String(p&&p.name||'').trim().toLowerCase();if(!k)return;porNombre[k]=porNombre[k]===undefined?p:null;});}catch(e){}   // null = nombre repetido: no se adivina
  const out=cur.map(x=>{
    if(!x||!EV_PACIENTE.has(x.ev)||!x.det)return x;
    const m=/^(.*?)( · id .+)?$/.exec(String(x.det)),base=m[1].trim(),resto=m[2]||'';
    if(/^Ficha N° /.test(x.det)){
      if(f2)return x;
      const big=/^Ficha N° (\d+)$/.exec(base);
      if(!big||Number(big[1])<1e9)return x;                               // ya es un número de ficha corto
      const p=Patients.get(big[1]);if(!p||Patients.fichaOf(p)==null)return x;
      n++;return Object.assign({},x,{det:fichaTag(p)+resto});
    }
    if(f1)return x;
    n++;
    if(/^#?\d+$/.test(base)){const p=Patients.get(base.replace('#',''));return Object.assign({},x,{det:(p?fichaTag(p):'Ficha N° '+base.replace('#',''))+resto});}
    const p=porNombre[base.toLowerCase()];
    return Object.assign({},x,{det:(p?fichaTag(p):'(paciente no identificado)')+resto});
  });
  const done=()=>{localStorage.setItem('oa3_audit_fichas','1');localStorage.setItem('oa3_audit_fichas2','1');};
  if(!n){done();return 0;}
  if(await idbSet('audit',out))done();
  return n;
}
async function leerRegistro(){await flushAudit();await limpiarNombres().catch(()=>{});return((await idbGet('audit'))||[]);}

/* ── pantalla de bloqueo ── */
function buildLock(){
  if($('lockScreen'))return;
  const d=document.createElement('div');d.id='lockScreen';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Pantalla de bloqueo');
  d.innerHTML=`<div class="lock-box">
    <div class="lock-ico">🔒</div><div class="lock-title" id="lockClinic"></div>
    <div class="lock-sub">Ingresa tu PIN para continuar</div>
    <input id="lockPin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="PIN" aria-label="PIN" data-on-keydown="security.lockKey">
    <div class="lock-msg" id="lockMsg" role="alert"></div>
    <button class="btn-primary lock-btn" id="lockGo" data-action="security.enter">Entrar</button>
    <a class="lock-link" id="lockForgot" href="#" data-action="security.forgot">¿Olvidaste tu PIN?</a>
    <div id="lockForgotPanel" style="display:none">
      <div class="lock-sep"></div>
      <div class="lock-h">Tengo mi código de recuperación</div>
      <input id="lockRec" type="text" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="Código de recuperación">
      <input id="lockNew1" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Nuevo PIN (4 a 8 dígitos)">
      <input id="lockNew2" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Repite el nuevo PIN">
      <button class="btn-sec lock-btn" id="lockRecGo" data-action="security.recover">Restablecer PIN</button>
      <div class="lock-sep"></div>
      <div class="lock-h">No tengo el código</div>
      <div class="lock-note">Tus datos siguen en este navegador pero no hay forma de abrirlos sin el PIN. Solo puedes borrar los datos de este dispositivo y restaurar desde un respaldo (archivo o Supabase). Escribe <b>BORRAR</b> para confirmar.</div>
      <input id="lockWipe" type="text" autocomplete="off" placeholder="BORRAR">
      <button class="lock-danger lock-btn" id="lockWipeGo" data-action="security.wipe">Borrar datos de este dispositivo</button>
    </div></div>`;
  document.body.appendChild(d);
}
const lockMsg=(t,ok)=>{const m=$('lockMsg');if(m){m.textContent=t||'';m.style.color=ok?'var(--green,#16a34a)':'var(--red,#ef4444)';}};
function mensajeEstado(r){
  if(r==='locked')return'Demasiados intentos. Espera '+segundosBloqueo()+' s e inténtalo de nuevo.';
  return'PIN incorrecto.'+(cfg.fails%5?' Intentos restantes antes del bloqueo: '+(5-cfg.fails%5):'');
}
let entrando=false;
async function intentarEntrar(){
  const inp=$('lockPin');if(!inp||!inp.value||entrando)return;   // Enter + clic seguidos contaban dos intentos fallidos
  entrando=true;$('lockGo').disabled=true;
  try{const r=await verificarPin(inp.value);inp.value='';
    if(r==='ok'){desbloquear('PIN');}else{lockMsg(mensajeEstado(r));inp.focus();}
  }finally{entrando=false;$('lockGo').disabled=false;}
}
function alternarOlvide(){const p=$('lockForgotPanel');p.style.display=p.style.display==='none'?'block':'none';}
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
  const vp=validarPin(a,b);if(!vp.ok)return lockMsg(vp.error);
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
const modalPin=(titulo,campos,accion,btn)=>openModal(`<div class="modal-title">${titulo}</div>${campos.split('@@GO@@').join(accion)}
  <div class="lock-msg" id="secMsg" role="alert" style="min-height:18px"></div>
  <div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" id="secGo" data-action="${accion}">${btn}</button></div>`);
const campo=(id,label,ph)=>`<div class="form-group" style="margin-bottom:10px"><label>${label}</label><input id="${id}" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="${ph||''}" data-on-keydown="security.modalKey" data-go="@@GO@@"></div>`;
const secMsg=t=>{const m=$('secMsg');if(m)m.textContent=t||'';};
function mostrarCodigo(code,intro){
  openModal(`<div class="modal-title">🔑 Código de recuperación</div>
  <p style="font-size:13px;color:var(--text2);margin-bottom:12px">${esc(intro||'Guarda este código en un lugar seguro (papel, gestor de contraseñas). Solo se muestra ahora y es la única forma de recuperar el acceso si olvidas el PIN.')}</p>
  <div class="rec-code" id="secRecCode">${esc(code)}</div>
  <div class="lock-msg" id="secCopyMsg" role="status" style="min-height:18px"></div>
  <div class="modal-footer"><button class="btn-sec" data-action="security.copyCode">Copiar</button><button class="btn-primary" data-action="security.codeSaved">Ya lo guardé</button></div>`);
}
async function copiarCodigo(){
  const el=$('secRecCode'),msg=$('secCopyMsg');if(!el)return false;
  try{await navigator.clipboard.writeText(el.textContent);if(msg){msg.style.color='var(--green,#16a34a)';msg.textContent='✓ Copiado';}return true;}
  catch(e){if(msg){msg.style.color='var(--amber,#d97706)';msg.textContent='No pude copiarlo: selecciónalo y cópialo a mano.';}return false;}
}
window.renderConfigSiAbierta=function(){try{actualizarBotonTopbar();showPage('configuracion');}catch(e){}};

const Seguridad={
  activo:enabled,
  abrirActivar(){
    if(!hasCrypto())return alert('El PIN necesita un contexto seguro (HTTPS o localhost). Abre la app desde GitHub Pages o Live Server.');
    modalPin('🔒 Activar PIN de acceso',campo('sec_p1','PIN (4 a 8 dígitos)')+campo('sec_p2','Repite el PIN'),'security.saveActivate','Activar');
  },
  async guardarActivar(){
    const a=$('sec_p1').value,b=$('sec_p2').value;
    if(enabled())return secMsg('Ya hay un PIN activo. Usa «Cambiar PIN».');
    const vp=validarPin(a,b);if(!vp.ok)return secMsg(vp.error);
    $('secGo').disabled=true;
    try{const code=await fijarPin(a);audit('PIN activado','');mostrarCodigo(code);reiniciarInactividad();}
    catch(e){secMsg('No se pudo activar el PIN en este navegador.');const g=$('secGo');if(g)g.disabled=false;}
  },
  abrirCambiar(){modalPin('Cambiar PIN',campo('sec_p0','PIN actual')+campo('sec_p1','Nuevo PIN (4 a 8 dígitos)')+campo('sec_p2','Repite el nuevo PIN'),'security.saveChange','Cambiar');},
  async guardarCambiar(){
    const a=$('sec_p1').value,b=$('sec_p2').value;
    if(!enabled())return secMsg('No hay un PIN activo.');
    const vp=validarPin(a,b);if(!vp.ok)return secMsg(vp.error);
    $('secGo').disabled=true;const r=await verificarPin($('sec_p0').value);
    if(r!=='ok'){$('secGo').disabled=false;return secMsg(r==='locked'?mensajeEstado('locked'):'El PIN actual es incorrecto.');}
    try{const code=await fijarPin(a);audit('PIN cambiado','');mostrarCodigo(code,'PIN cambiado. Este es tu NUEVO código de recuperación (el anterior ya no sirve).');}
    catch(e){secMsg('No se pudo cambiar el PIN; el anterior sigue valiendo.');const g=$('secGo');if(g)g.disabled=false;}
  },
  abrirDesactivar(){modalPin('Desactivar PIN',`<p style="font-size:13px;color:var(--text2);margin-bottom:12px">La app quedará accesible sin PIN en este dispositivo.</p>`+campo('sec_p0','PIN actual'),'security.saveDisable','Desactivar');},
  async guardarDesactivar(){
    $('secGo').disabled=true;const r=await verificarPin($('sec_p0').value);
    if(r!=='ok'){$('secGo').disabled=false;return secMsg(r==='locked'?mensajeEstado('locked'):'El PIN actual es incorrecto.');}
    audit('PIN desactivado','');cfg=null;localStorage.removeItem(KEY);clearTimeout(idleT);closeModal();renderConfigSiAbierta();actualizarBotonTopbar();
  },
  setAuto(min){if(!enabled())return;const m=parseInt(min)||0;if([0,5,10,30].indexOf(m)<0)return;cfg.autoMin=m;saveCfg();audit('Bloqueo automático',cfg.autoMin?cfg.autoMin+' min':'desactivado');reiniciarInactividad();},
  bloquear(){bloquear('Manual');},
  async verRegistro(){
    const L=(await leerRegistro()).slice().reverse().slice(0,300);
    const fila=x=>`<tr><td style="white-space:nowrap;padding:5px 8px;color:var(--text3)">${esc(new Date(x.t).toLocaleString('es-EC'))}</td><td style="padding:5px 8px;font-weight:600">${esc(x.ev)}</td><td style="padding:5px 8px;color:var(--text2)">${esc(x.det)}</td></tr>`;
    openModal(`<div class="modal-title">📋 Registro de actividad</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Últimos ${L.length} eventos (se conservan hasta ${MAX_LOG}). No contiene PIN, nombres ni datos clínicos: solo qué se hizo, cuándo y el N.° de ficha.</div>
      <div style="max-height:52vh;overflow:auto;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>${L.map(fila).join('')||'<tr><td style="padding:16px;color:var(--text3)">Sin eventos todavía.</td></tr>'}</tbody></table></div>
      <div class="modal-footer"><button class="btn-sec" data-action="security.downloadLog">Descargar CSV</button><button class="btn-primary" data-action="app.closeModal">Cerrar</button></div>`);
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
        ${on?`<button class="btn-sec" data-action="security.lock">Bloquear ahora</button><button class="btn-sec" data-action="security.openChange">Cambiar PIN</button><button class="btn-sec" data-action="security.openDisable">Desactivar PIN</button>`
            :`<button class="btn-primary" data-action="security.openActivate">Activar PIN</button>`}
        <button class="btn-sec" data-action="security.viewLog">Ver registro de actividad</button>
      </div>
      ${on?`<div class="form-group" style="max-width:260px"><label>Bloqueo automático por inactividad</label><select data-on-change="security.setAuto">${[5,10,30,0].map(sel).join('')}</select></div>`:''}
      <div style="font-size:11px;color:var(--text3);margin-top:12px;line-height:1.5">El PIN impide el acceso casual a la pantalla. No cifra los datos guardados en el navegador: protege también el dispositivo (clave de Windows/teléfono) y haz respaldos.</div></div>`;
  },
  validarPin,_audit:audit,_limpiarNombres:limpiarNombres,_estado:()=>({locked,enabled:enabled(),cfg:cfg&&{autoMin:cfg.autoMin,fails:cfg.fails}}),_flush:flushAudit
};
window.Seguridad=Seguridad;
App.actions({
  'security.enter':function(){intentarEntrar();},
  'security.lockKey':function(c){if(c.event.key==='Enter')intentarEntrar();},
  'security.forgot':function(c){c.event.preventDefault();alternarOlvide();},
  'security.recover':function(){restablecerConCodigo();},
  'security.wipe':function(){borrarTodoLocal();},
  'security.lock':function(){Seguridad.bloquear();},
  'security.openActivate':function(){Seguridad.abrirActivar();},
  'security.openChange':function(){Seguridad.abrirCambiar();},
  'security.openDisable':function(){Seguridad.abrirDesactivar();},
  'security.saveActivate':function(){Seguridad.guardarActivar();},
  'security.saveChange':function(){Seguridad.guardarCambiar();},
  'security.saveDisable':function(){Seguridad.guardarDesactivar();},
  'security.modalKey':function(c){if(c.event.key==='Enter'&&c.data.go)App.dispatch(c.data.go,c);},
  'security.setAuto':function(c){Seguridad.setAuto(c.value);},
  'security.viewLog':function(){Seguridad.verRegistro();},
  'security.downloadLog':function(){Seguridad.descargarRegistro();},
  'security.copyCode':function(){copiarCodigo();},
  'security.codeSaved':function(){closeModal();renderConfigSiAbierta();}
});

/* ── botón 🔒 en la barra superior ── */
function actualizarBotonTopbar(){
  let b=$('lockBtn');
  if(!enabled()){if(b)b.remove();return;}
  if(b)return;
  const ref=$('darkToggle');if(!ref)return;
  b=document.createElement('button');b.id='lockBtn';b.title='Bloquear (requiere PIN)';b.textContent='🔒';b.setAttribute('aria-label','Bloquear');
  b.style.cssText=ref.style.cssText;b.setAttribute('data-action','security.lock');ref.parentNode.insertBefore(b,ref);
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
/* PRIVACIDAD (LOPDP): el registro NUNCA guarda nombres de pacientes, solo el N.° de ficha (el id del paciente). */
const fichaTag=p=>{if(!p||p.id==null)return'';const f=Patients.fichaOf(p);return 'Ficha N° '+(f!=null?f:p.id);};   // N.° de ficha corto; si aún no tiene, el id
const ptName=()=>{try{return fichaTag(Patients.current());}catch(e){return'';}};        // (nombre antiguo) ahora devuelve la ficha
const nom=id=>{try{if(id==null)return'';const p=Patients.get(id);return p?fichaTag(p):'Ficha N° '+id;}catch(e){return'';}};
const ultimoPaciente=()=>()=>{try{return fichaTag(Patients.all()[Patients.all().length-1]);}catch(e){return'';}};   // función = se evalúa DESPUÉS de la acción (el id aún no existía)
const despuesCurPt=()=>()=>{try{return fichaTag(Patients.current());}catch(e){return'';}};
/* modo 'ver' → registra siempre | modo 'cambio' → solo si la acción llamó a save() (evita registrar validaciones fallidas o cancelaciones) | modo 'confirm' → solo si el usuario aceptó el confirm() */
function hook(name,ev,modo,describir){hookOn(window,name,ev,modo,describir);}
function hookOn(holder,name,ev,modo,describir){
  const o=holder[name];if(typeof o!=='function')return;
  holder[name]=function(){
    const args=arguments;let det='';try{det=describir?describir.apply(null,args):'';}catch(e){}
    const antes=saves;lastConfirm=null;let r;
    try{r=o.apply(this,args);}catch(e){throw e;}
    const fin=()=>{if(typeof det==='function'){try{det=det();}catch(e){det='';}}if(det===null)return;if(modo==='ver'||(modo==='confirm'&&lastConfirm===true)||(modo==='cambio'&&saves>antes))audit(ev,det);};
    if(r&&typeof r.then==='function')return r.then(v=>{fin();return v;});
    fin();return r;
  };
}
let _lastSel={id:null,t:0};   // abrir el MISMO paciente dos veces en 1,5 s (crear→abrir, editar→reabrir) se anota una sola vez
hookOn(Patients,'select','Abrió ficha','ver',id=>{const n=Date.now(),dup=_lastSel.id===id&&n-_lastSel.t<1500;_lastSel={id:id,t:n};return dup?null:nom(id);});
hookOn(Patients,'saveNew','Creó paciente','cambio',despuesCurPt);
hookOn(Patients,'saveEdit','Editó datos del paciente','cambio',()=>ptName());
hookOn(Patients,'confirmDelete','Eliminó paciente','cambio',()=>ptName());
hookOn(Agenda,'saveQuick','Creó cita rápida','cambio',()=>'');
hookOn(Agenda,'saveAdd','Creó cita','cambio',()=>ptName());
hookOn(Agenda,'saveDetail','Editó cita','cambio',(id)=>'id '+id);
hookOn(Agenda,'deleteDetailUI','Eliminó cita','cambio',(id)=>'id '+id);
hookOn(Agenda,'deleteUI','Eliminó cita','cambio',id=>ptName()+' · id '+id);
hookOn(Agenda,'completeUI','Completó cita','cambio',id=>ptName()+' · id '+id);
hookOn(Agenda,'noShowUI','Marcó cita como «no asistió»','cambio',id=>ptName()+' · id '+id);
hookOn(Agenda,'confirmConvert','Creó paciente desde una cita rápida','cambio',ultimoPaciente);
hookOn(Agenda,'sendWAUI','Preparó recordatorio de cita por WhatsApp','cambio',id=>'id '+id);
hookOn(Settings,'saveClinic','Cambió los datos de la clínica','cambio',()=>'');
hookOn(Settings,'saveWA','Cambió el mensaje de WhatsApp','cambio',()=>'');
hookOn(Services,'add','Agregó servicio al catálogo','cambio',f=>f&&f.nombre);
hookOn(Services,'update','Editó servicio del catálogo','cambio',(id,f)=>f&&f.nombre);
hookOn(Services,'remove','Eliminó servicio del catálogo','cambio',id=>{const s=Services.get(id);return s?s.nombre:'id '+id;});
hookOn(Meds,'add','Agregó medicamento a la lista','cambio',n=>n);
hookOn(Meds,'remove','Quitó medicamento de la lista','cambio',n=>n);
hookOn(Logo,'setFromFile','Cambió el logo','ver',()=>'');
hookOn(Logo,'clear','Quitó el logo','cambio',()=>'');
hookOn(Diary,'saveNew','Creó nota del diario clínico','cambio',()=>ptName());
hookOn(Diary,'saveEdit','Editó nota del diario clínico','cambio',id=>ptName()+' · id '+id);
hookOn(Diary,'deleteUI','Eliminó nota del diario','cambio',id=>ptName()+' · id '+id);
hookOn(Odonto,'saveSnapshot','Guardó registro de odontograma','cambio',()=>ptName());
hookOn(Odonto,'deleteSnapshotUI','Eliminó registro de odontograma','cambio',id=>ptName()+' · id '+id);
hookOn(Odonto,'printSnapshot','Imprimió odontograma','ver',()=>ptName());
hookOn(Treatments,'saveNew','Registró tratamiento','cambio',()=>ptName());
hookOn(Treatments,'doneUI','Marcó tratamiento como realizado','cambio',id=>ptName()+' · id '+id);
hookOn(Treatments,'deleteUI','Eliminó tratamiento','cambio',id=>ptName()+' · id '+id);
hookOn(Images,'uploadUI','Subió imágenes','cambio',()=>ptName());
hookOn(Images,'saveEdit','Editó datos de una imagen','cambio',id=>ptName()+' · id '+id);
hookOn(Images,'deleteUI','Eliminó imagen','cambio',id=>ptName()+' · id '+id);
hookOn(Finance,'savePay','Registró pago','cambio',()=>ptName());
hookOn(Finance,'deletePayment','Eliminó pago','cambio',id=>ptName()+' · id '+id);
hookOn(Finance,'markInvoicedUI','Marcó pago como facturado','cambio',id=>ptName()+' · id '+id);
hookOn(Finance,'saveExpense','Registró egreso','cambio',()=>'');
hookOn(Finance,'deleteExpense','Eliminó egreso','cambio',id=>'id '+id);
hookOn(Finance,'closeMonthUI','Cerró mes','cambio',(m,y)=>MONTHS_FULL[m]+' '+y);
hookOn(Finance,'reopenUI','Reabrió mes (eliminó su resumen)','cambio',id=>{const a=Finance.archives().find(x=>String(x.id)===String(id));return a?a.label:'id '+id;});
hookOn(Finance,'printReceipt','Imprimió comprobante','ver',()=>ptName());
hookOn(Finance,'downloadMonthly','Descargó informe mensual','ver',()=>'');
hookOn(Finance,'downloadAnnual','Descargó informe anual','ver',y=>String(y));
hookOn(Finance,'downloadArchive','Descargó informe de un mes archivado','ver',id=>{const a=Finance.archives().find(x=>String(x.id)===String(id));return a?a.label:'id '+id;});
hookOn(Consents,'add','Creó consentimiento','cambio',()=>ptName());
hookOn(Consents,'saveCustom','Creó consentimiento personalizado','cambio',()=>ptName());
hookOn(Consents,'confirmSign','Registró firma de consentimiento','cambio',id=>ptName()+' · id '+id);
hookOn(Consents,'deleteUI','Eliminó consentimiento','cambio',id=>ptName()+' · id '+id);
hookOn(Consents,'printDoc','Imprimió consentimiento','ver',()=>ptName());
hookOn(Prescriptions,'saveNew','Emitió receta','cambio',()=>ptName());
hookOn(Prescriptions,'deleteUI','Eliminó receta','cambio',id=>ptName()+' · id '+id);
hookOn(Prescriptions,'printRx','Imprimió receta','ver',()=>ptName());
hookOn(Quotes,'saveNew','Creó presupuesto','cambio',()=>ptName());
hookOn(Quotes,'confirmApprove','Aprobó presupuesto','cambio',id=>ptName()+' · id '+id);
hookOn(Quotes,'rejectUI','Rechazó presupuesto','cambio',id=>ptName()+' · id '+id);
hookOn(Quotes,'deleteUI','Eliminó presupuesto','cambio',id=>ptName()+' · id '+id);
hookOn(Quotes,'confirmDelete','Eliminó presupuesto','cambio',id=>ptName()+' · id '+id);
hookOn(Quotes,'printQuote','Imprimió presupuesto','ver',()=>ptName());
hookOn(Recalls,'sendWA','Envió recordatorio de control por WhatsApp','ver',id=>nom(id));
hookOn(Recalls,'markContacted','Marcó paciente como contactado','cambio',id=>nom(id));
hookOn(Recalls,'postpone','Pospuso recordatorio de paciente','cambio',id=>nom(id));
hookOn(Recalls,'noContact','Marcó paciente como "no contactar"','confirm',id=>nom(id));
hookOn(Recalls,'reactivate','Reactivó recordatorios del paciente','cambio',id=>nom(id));
hook('factoryReset','Restableció la app (borró todo)','confirm',()=>'');
hook('enviarCobroWA','Envió recordatorio de cobro por WhatsApp','ver',()=>ptName());
hookOn(Backup,'exportFile','Exportó respaldo completo','ver',()=>'');
hookOn(Backup,'importUI','Inició importación de respaldo','ver',()=>'');
hookOn(Backup,'importFile','Importó respaldo desde archivo','confirm',()=>'');
hookOn(Backup,'mailto','Preparó respaldo por correo','ver',()=>'');
hookOn(Backup,'downloadLocal','Descargó copia local','ver',f=>String(f||''));
hookOn(Backup,'restoreLocal','Restauró copia local','confirm',f=>String(f||''));
hookOn(Backup,'undoLast','Deshizo la última restauración','confirm',()=>'');
hookOn(Backup,'createCloud','Creó punto de restauración en la nube','ver',()=>'');
hookOn(Backup,'restoreCloud','Restauró respaldo de la nube','confirm',()=>'');
hookOn(Backup,'importOldCloud','Importó datos de la nube antigua','confirm',()=>'');

/* ── arranque: si hay PIN, bloquear YA, antes de que se pinte nada ── */
flushAudit();
if(enabled()){buildLock();bloquear('');reiniciarInactividad();}
})();
