/* ═══ NÚCLEO — IndexedDB, Supabase, backup, variables globales, save()/load() ═══ */

/* ═══ HELPERS SEGUROS (v4) ═══ */
// Escapa texto para insertarlo en HTML o en atributos ("..." y '...')
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function escHtml(s){return esc(s);} // compatibilidad con código anterior
// Texto dentro de un string JS entre comillas simples DENTRO de un atributo onclick="..."
function jsq(s){return esc(String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' '));}
// ID único numérico (compatible con ids viejos y con onclick="f(${id})"); evita choques entre dispositivos
let _uidLast=0;
function uid(){let n=Date.now()*1000+Math.floor(Math.random()*1000);if(n<=_uidLast)n=_uidLast+1;_uidLast=n;return n;}

/* ═══ GUARDADO CON DEBOUNCE ═══ */
let _saveT=null,_savePending=false;
function save(){_savePending=true;clearTimeout(_saveT);_saveT=setTimeout(saveNow,300);}
function saveFlush(){if(_savePending){clearTimeout(_saveT);saveNow();}}
function reloadSeguro(){saveFlush();setTimeout(()=>location.reload(),600);}
window.addEventListener('beforeunload',saveFlush);
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveFlush();});

/* ═══ VERSIÓN DE DATOS Y MIGRACIONES ═══ */
const DATA_VERSION=3;
const PT_ARRAYS=['appointments','payments','treatments','diary','consents','recetas','presupuestos','odoHistory','images'];
function roundMoneyInBundle(b){
  var R=function(o,k){if(!o)return;if(typeof o[k]==='string'&&o[k].trim()!==''&&isFinite(Number(o[k])))o[k]=Number(o[k]);if(typeof o[k]==='number')o[k]=r2(o[k]);};
  (b.patients||[]).forEach(function(p){
    (p.payments||[]).forEach(function(x){R(x,'amount');});
    (p.treatments||[]).forEach(function(x){R(x,'cost');});
    (p.presupuestos||[]).forEach(function(x){R(x,'descuento');R(x,'subtotal');R(x,'total');(x.items||[]).forEach(function(i){R(i,'precio');R(i,'subtotal');});});
  });
  (b.egresos||[]).forEach(function(x){R(x,'monto');});
  (b.servicios||[]).forEach(function(x){R(x,'precio');});
  (b.archivosContables||[]).forEach(function(a){R(a,'totalIngresos');R(a,'totalEgresos');(a.pagos||[]).forEach(function(x){R(x,'monto');});(a.egresos||[]).forEach(function(x){R(x,'monto');});});
}
function migrateBundle(b){
  if(!b)return b;
  const from=b.v||1;
  ['patients','egresos','facturas','archivosContables','servicios'].forEach(k=>{if(!Array.isArray(b[k]))b[k]=[];});
  // v1 → v2: todo paciente garantiza sus listas (evita "cannot read properties of undefined")
  (b.patients||[]).forEach(p=>{PT_ARRAYS.forEach(k=>{if(!Array.isArray(p[k]))p[k]=[];});});
  if(from<3)roundMoneyInBundle(b);   // v2 → v3: todo monto guardado queda con 2 decimales exactos
  if(from<DATA_VERSION){console.info('Datos migrados de v'+from+' a v'+DATA_VERSION);}
  b.v=DATA_VERSION;
  return b;
}

/* ═══ BACKUP AUTOMÁTICO DIARIO (copias locales en IndexedDB, últimas 5) ═══ */
async function verificarBackupDiario(){
  try{
    if(!patients||!patients.length)return;
    const hoy=today();
    if(localStorage.getItem('oa3_lastbackup')===hoy)return;
    saveFlush();
    await new Promise(r=>setTimeout(r,500)); // deja terminar el guardado a IndexedDB
    const estado=await idbGet('state');
    if(!estado||!estado.patients)return;
    let lista=(await idbGet('daily_backups'))||[];
    lista=lista.filter(x=>x.fecha!==hoy);
    lista.push({fecha:hoy,t:Date.now(),pacientes:estado.patients.length,data:estado});
    lista=lista.slice(-5);
    if(await idbSet('daily_backups',lista)){localStorage.setItem('oa3_lastbackup',hoy);}
  }catch(e){console.warn('Backup diario falló:',e);}
}
// Para soporte/recuperación: await listarBackupsLocales()  |  await descargarBackupLocal('2026-10-02')
async function listarBackupsLocales(){return((await idbGet('daily_backups'))||[]).map(x=>({fecha:x.fecha,pacientes:x.pacientes}));}
async function descargarBackupLocal(fecha){
  const x=((await idbGet('daily_backups'))||[]).find(b=>b.fecha===fecha);if(!x)return alert('No hay copia de '+fecha);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(x.data)],{type:'application/json'}));
  a.download='OdontoApp_copia_local_'+fecha+'.json';a.click();
}
// ═══ FIX: IMPRESIÓN SEGURA (popups bloqueados) ═══
function safeOpen(url,name,features){
var w=null;
try{ w=window.open(url,name,features); }catch(e){ w=null; }
if(w) return w;
alert('⚠️ El navegador bloqueó la ventana de impresión.\nEl documento se descargará como archivo HTML: ábrelo y presiona Ctrl+P para imprimirlo.');
var buf='';
return {
document:{
write:function(t){ buf+=t; },
close:function(){
var blob=new Blob([buf],{type:'text/html;charset=utf-8'});
var a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='OdontoApp_documento.html';
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(function(){URL.revokeObjectURL(a.href);},5000);
}
},
print:function(){},
close:function(){}
};
}

// ═══ STATE ═══
const COLORS=['#0ea5e9','#10b981','#8b5cf6','#b98a4e','#ef4444','#ec4899','#06b6d4'];
const MONTHS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const FRASES_DIA=[
'La sonrisa es el mejor accesorio que puedes llevar.',
'Pequeños progresos cada día construyen grandes sonrisas.',
'Preferimos el cansancio de intentarlo al aburrimiento de no hacer nada.',
'Una boca sana es el reflejo de un cuerpo sano.',
'La constancia de hoy es la sonrisa de mañana.',
'Cuida cada detalle; el paciente lo siente.',
'El mejor tratamiento es la prevención.',
'Haz que cada paciente salga con una razón para sonreír.'
];
function fraseDelDia(){
const now=new Date();
return FRASES_DIA[Math.floor((now-new Date(now.getFullYear(),0,0))/864e5)%FRASES_DIA.length];
}
const MONTHS_FULL=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
let patients=[],egresos=[],facturas=[],quickAppts=[],archivosContables=[],servicios=[],curPt=null,curTab='datos',curPage='dashboard';
let selOdoTooth=null,selOdoZone=null,nextId=1,nextEgId=1,nextFactId=1,nextRecetaId=1,nextPresupId=1,logoColor='#2f9d94',logoImg=null;
let clinicaRUC='',clinicaDireccion='',clinicaTelefono='';

function initials(n){return n.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()}
function ptColor(id){return COLORS[id%COLORS.length]}
function v(id){return document.getElementById(id)?.value||''}
// Timezone-aware date helpers
function getTzOffset(){ return parseInt(localStorage.getItem('oa3_tz')||'-5'); }
function localDate(d){
  const offset=getTzOffset();
  const utc=d.getTime()+(d.getTimezoneOffset()*60000);
  return new Date(utc+(offset*3600000));
}
function today(){
  const d=localDate(new Date());
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function daysFromNow(n){
  const d=localDate(new Date());
  d.setDate(d.getDate()+n);
  return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}function fmtDate(d){if(!d)return'—';const dt=new Date(d+'T12:00');return`${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`}
function calcAge(birthdate){
  if(!birthdate)return'—';
  const hoy=new Date();
  const nac=new Date(birthdate+'T12:00');
  let edad=hoy.getFullYear()-nac.getFullYear();
  const m=hoy.getMonth()-nac.getMonth();
  if(m<0||(m===0&&hoy.getDate()<nac.getDate()))edad--;
  return edad;
}
function genAutorizacion(){return Array.from({length:49},()=>Math.floor(Math.random()*10)).join('')}

// ═══ STORAGE ═══
// ═══ BASE DE DATOS LOCAL (IndexedDB = varios GB de capacidad) ═══
let _dbMain=null;
function openMainDB(){
return new Promise((res,rej)=>{
if(_dbMain)return res(_dbMain);
const rq=indexedDB.open('odontoapp_db',1);
rq.onupgradeneeded=e=>{e.target.result.createObjectStore('kv');};
rq.onsuccess=e=>{_dbMain=e.target.result;
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(err){}
res(_dbMain);};
rq.onerror=e=>rej(e.target.error);
});
}
function idbSet(key,val){
return openMainDB().then(db=>new Promise(res=>{
const tx=db.transaction('kv','readwrite');
tx.objectStore('kv').put(val,key);
tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);
})).catch(e=>{console.warn('IndexedDB:',e);return false;});
}
function idbGet(key){
return openMainDB().then(db=>new Promise(res=>{
const rq=db.transaction('kv','readonly').objectStore('kv').get(key);
rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(undefined);
})).catch(()=>undefined);
}
function saveNow(){
_savePending=false;
const bundle={v:DATA_VERSION,t:Date.now(),patients,egresos,facturas,archivosContables,servicios,
nextId,nextEgId,nextFactId,nextRecetaId,nextPresupId,
logo:{text:document.getElementById('logoText').textContent,prof:document.getElementById('logoProfesional').textContent,color:logoColor,img:logoImg,ruc:clinicaRUC,dir:clinicaDireccion,tel:clinicaTelefono}};
idbSet('state',bundle); // ← la "base de datos grande"
try{ // espejo localStorage (compatibilidad); si no cabe, no rompe nada
localStorage.setItem('oa3_pts',JSON.stringify(patients));
localStorage.setItem('oa3_eg',JSON.stringify(egresos));
localStorage.setItem('oa3_fact',JSON.stringify(facturas));
localStorage.setItem('oa3_nid',nextId);
localStorage.setItem('oa3_neg',nextEgId);
localStorage.setItem('oa3_nfact',nextFactId);
localStorage.setItem('oa3_nreceta',nextRecetaId);
localStorage.setItem('oa3_npresup',nextPresupId);
localStorage.setItem('oa3_logo',JSON.stringify(bundle.logo));
localStorage.setItem('oa3_arch',JSON.stringify(archivosContables));
localStorage.setItem('oa3_svc',JSON.stringify(servicios));
localStorage.setItem('oa3_meta',JSON.stringify({t:bundle.t,bytes:new Blob([JSON.stringify(bundle)]).size}));
}catch(e){console.warn('localStorage lleno: los datos viven en IndexedDB');}
sbAutoSync();
}

async function load(){
let b=await idbGet('state');
if(!b||!b.patients){ // migración automática desde localStorage (primera vez)
const p=localStorage.getItem('oa3_pts');
if(p){
b={v:1,t:Date.now(),
patients:JSON.parse(p),
egresos:JSON.parse(localStorage.getItem('oa3_eg')||'[]'),
facturas:JSON.parse(localStorage.getItem('oa3_fact')||'[]'),
archivosContables:JSON.parse(localStorage.getItem('oa3_arch')||'[]'),
servicios:JSON.parse(localStorage.getItem('oa3_svc')||'[]'),
nextId:parseInt(localStorage.getItem('oa3_nid')||'1'),
nextEgId:parseInt(localStorage.getItem('oa3_neg')||'1'),
nextFactId:parseInt(localStorage.getItem('oa3_nfact')||'1'),
nextRecetaId:parseInt(localStorage.getItem('oa3_nreceta')||'1'),
nextPresupId:parseInt(localStorage.getItem('oa3_npresup')||'1'),
logo:JSON.parse(localStorage.getItem('oa3_logo')||'null')};
idbSet('state',b);
}
}
if(b){
b=migrateBundle(b);
patients=b.patients||[];egresos=b.egresos||[];facturas=b.facturas||[];
archivosContables=b.archivosContables||[];servicios=b.servicios||[];
nextId=b.nextId||nextId;nextEgId=b.nextEgId||nextEgId;nextFactId=b.nextFactId||nextFactId;
nextRecetaId=b.nextRecetaId||nextRecetaId;nextPresupId=b.nextPresupId||nextPresupId;
if(b.logo){
document.getElementById('logoText').textContent=b.logo.text||'OdontoApp';
document.getElementById('logoProfesional').textContent=b.logo.prof||'Dr. Profesional';
logoColor=b.logo.color||'#0ea5e9';logoImg=b.logo.img||null;
clinicaRUC=b.logo.ruc||'';clinicaDireccion=b.logo.dir||'';clinicaTelefono=b.logo.tel||'';
applyColor(logoColor);if(logoImg)applyLogoImg(logoImg);
}
}
patients.forEach(pt=>{
['surfData','wholeData'].forEach(k=>{if(!pt[k])pt[k]={};});
['treatments','payments','appointments','diary','images','consents','recetas','presupuestos'].forEach(k=>{if(!pt[k])pt[k]=[];});
if(pt.birthdate&&pt.age!==undefined)delete pt.age;
});
if(patients.length===0)seedDemo();
renderSidebar();
if(curPt)selectPt(curPt.id);else showPage(curPage||'dashboard');
}

function seedDemo(){
  patients=[
    {demo:true,id:nextId++,name:'María García',age:34,phone:'0987-654-321',email:'maria@mail.com',cedula:'1712345678',birthdate:todayBD(),alergias:'Penicilina',antecedentes:'Hipertensión controlada',surfData:{},wholeData:{},
     diary:[{id:1,date:'2025-03-10',time:'09:00',doctor:'Dr. Pérez',title:'Consulta inicial',body:'Paciente refiere dolor en zona posterior. Caries en pieza 36.',alert:'Control en 7 días'}],
     treatments:[{id:1,name:'Extracción molar 46',date:'2025-01-10',status:'realizado',cost:45,tooth:'46'},{id:2,name:'Obturación resina 36',date:'2025-03-15',status:'pendiente',cost:35,tooth:'36'}],
     payments:[{id:1,concept:'Extracción molar',date:'2025-01-10',amount:45,type:'Efectivo'}],
     appointments:[{id:1,date:daysFromNow(3),time:'10:00',reason:'Control y limpieza',status:'pendiente'}]},
    {demo:true,id:nextId++,name:'Carlos Ruiz',age:28,phone:'0991-234-567',email:'carlos@mail.com',cedula:'1798765432',birthdate:'1997-07-22',alergias:'Ninguna',antecedentes:'Sin antecedentes',surfData:{},wholeData:{},diary:[],
     treatments:[{id:1,name:'Limpieza dental',date:'2024-12-01',status:'realizado',cost:30,tooth:'General'}],
     payments:[{id:1,concept:'Limpieza dental',date:'2024-12-01',amount:30,type:'Transferencia'}],
     appointments:[{id:1,date:today(),time:'09:00',reason:'Revisión general',status:'pendiente'}]}
  ];
  egresos=[
    {demo:true,id:nextEgId++,concepto:'Materiales dentales',categoria:'Materiales',monto:120,fecha:'2025-03-01',proveedor:'DentalPro'},
    {demo:true,id:nextEgId++,concepto:'Arriendo local',categoria:'Arriendo',monto:350,fecha:'2025-03-01',proveedor:'Propietario'},
    {demo:true,id:nextEgId++,concepto:'Servicios básicos',categoria:'Servicios',monto:45,fecha:'2025-03-05',proveedor:'CNT / Eléctrica'},
  ];
  save();
}

function todayBD(){const d=localDate(new Date());return`1990-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

// ═══ INDEXEDDB: almacenamiento para imágenes pesadas ═══
let _imgDB=null;
function openImgDB(){
return new Promise((res,rej)=>{
if(_imgDB)return res(_imgDB);
const req=indexedDB.open('odontoapp_imgs',1);
req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains('images'))db.createObjectStore('images');};
req.onsuccess=e=>{_imgDB=e.target.result;res(_imgDB);};
req.onerror=e=>rej(e.target.error);
});
}
function imgDbPut(id,blob){return openImgDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(blob,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);}));}
function imgDbGet(id){return openImgDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('images','readonly');const rq=tx.objectStore('images').get(id);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);}));}
function imgDbDel(id){return openImgDB().then(db=>new Promise((res)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').delete(id);tx.oncomplete=res;tx.onerror=()=>res();}));}
function fmtBytes(b){if(b>1048576)return(b/1048576).toFixed(1)+'MB';return Math.round(b/1024)+'KB';}

function factoryReset(){
  if(!confirm('⚠️ ¿Estás seguro?\n\nEsto eliminará TODOS los datos:\n• Pacientes y su historial\n• Facturas y egresos\n• Recetas y consentimientos\n• Configuración de la clínica\n\nEsta acción NO se puede deshacer.\nSe recomienda hacer un backup antes.'))return;
  if(!confirm('Segunda confirmación requerida.\n\n¿Confirmas que deseas borrar todos los datos y volver a los valores de fábrica?'))return;
  // Clear all localStorage keys used by the app
  ['oa3_pts','oa3_eg','oa3_fact','oa3_nid','oa3_neg','oa3_nfact','oa3_nreceta','oa3_logo','oa3_meds','oa3_qa','oa3_arch','oa3_svc'].forEach(k=>localStorage.removeItem(k));
  servicios=[];
  // Reset state
  patients=[];egresos=[];facturas=[];quickAppts=[];
  nextId=1;nextEgId=1;nextFactId=1;nextRecetaId=1;
  logoColor='#2f9d94';logoImg=null;
  clinicaRUC='';clinicaDireccion='';clinicaTelefono='';
  MEDICAMENTOS_COMUNES=['Amoxicilina 500mg','Amoxicilina + Ácido Clavulánico 875/125mg','Azitromicina 500mg','Clindamicina 300mg','Metronidazol 500mg','Ibuprofeno 400mg','Ibuprofeno 600mg','Paracetamol 500mg','Naproxeno 500mg','Ketorolaco 10mg','Diclofenaco 50mg','Dexametasona 4mg','Prednisona 5mg','Cloruro de Sodio 0.9% (Suero Fisiológico)','Clorhexidina 0.12% enjuague bucal','Gel de Clorhexidina 1%','Clorfenamina 4mg','Loratadina 10mg','Omeprazol 20mg'];
  // Reset logo UI
  document.getElementById('logoText').textContent='OdontoApp';
  document.getElementById('logoProfesional').textContent='Dr. Profesional';
  const icon=document.getElementById('logoIcon');
  icon.style.background='#2f9d94';
  icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C9.2 2 7 4.2 7 7c0 2 1 4 2.2 5.2L10.5 21c.2.8.8 1 1.5 1s1.3-.2 1.5-1l1.3-8.8C16 11 17 9 17 7c0-2.8-2.2-5-5-5z"/></svg>`;
  applyColor('#2f9d94');
  // Seed demo data and restart
  seedDemo();
  closeModal();
  curPt=null;
  renderSidebar();
  showPage('dashboard');
  alert('✓ App restablecida correctamente a los valores de fábrica.');
}

// ═══ BACKUP Y EXPORTACIÓN DE DATOS ═══
function exportarDatos(){
  const logoInfo={
    clinicaNombre:document.getElementById('logoText').textContent,
    profesional:document.getElementById('logoProfesional').textContent,
    ruc:clinicaRUC,direccion:clinicaDireccion,telefono:clinicaTelefono
  };
  const backup={
    version:'OdontoApp_v3',
    fechaExportacion:new Date().toISOString(),
    clinica:logoInfo,
    totalPacientes:patients.length,
    totalFacturas:facturas.length,
    totalEgresos:egresos.length,
    patients,egresos,facturas,servicios,archivosContables,quickAppts,
nextId,nextEgId,nextFactId,nextRecetaId,nextPresupId
};
  // Strip base64 images to reduce file size (optional: keep them)
  const backupStr=JSON.stringify(backup,null,2);
  const blob=new Blob([backupStr],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const fecha=today();
  a.href=url;
  a.download=`OdontoApp_backup_${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function prepararEmailBackup(){
  const logoInfo={
    clinicaNombre:document.getElementById('logoText').textContent,
    profesional:document.getElementById('logoProfesional').textContent,
    ruc:clinicaRUC
  };
  const fecha=today();
  // Build summary text for email body
  const totalIngresos=patients.reduce((s,p)=>s+p.payments.reduce((a,py)=>addM(a,py.amount),0),0);
  const totalEgresosNum=egresos.reduce((s,e)=>addM(s,e.monto),0);
  const pendTx=patients.reduce((s,p)=>s+p.treatments.filter(t=>t.status==='pendiente').length,0);
  const resumen=`RESUMEN OdontoApp — ${fecha}
Clínica: ${esc(logoInfo.clinicaNombre)}
Profesional: ${esc(logoInfo.profesional)}
RUC: ${esc(logoInfo.ruc||'—')}

PACIENTES: ${patients.length} registrados
TRATAMIENTOS PENDIENTES: ${pendTx}
INGRESOS TOTALES: ${money(totalIngresos)}
EGRESOS TOTALES: ${money(totalEgresosNum)}
UTILIDAD: ${money(totalIngresos-totalEgresosNum)}
FACTURAS EMITIDAS: ${facturas.length}

Exportado desde OdontoApp el ${fecha}`;
  openModal(`<div class="modal-title">📧 Enviar respaldo por correo</div>
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:16px">
    <div style="font-size:12px;font-weight:600;color:#15803d;margin-bottom:6px">✓ ¿Cómo funciona?</div>
    <div style="font-size:12px;color:#166534;line-height:1.7">
      1. Haz clic en <strong>"Descargar backup"</strong> para guardar el archivo JSON con todos tus datos.<br>
      2. Haz clic en <strong>"Abrir correo"</strong> para abrir tu cliente de email con el asunto ya llenado.<br>
      3. Adjunta manualmente el archivo descargado al correo y envíalo.
    </div>
  </div>
  <div class="form-row form-full"><div class="form-group"><label>Tu correo electrónico</label><input id="f_email_backup" type="email" placeholder="tuemail@gmail.com"></div></div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;font-family:monospace;font-size:11px;white-space:pre;overflow-x:auto;color:var(--text2)">${resumen}</div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" style="background:var(--green)" onclick="exportarDatos()">⬇ Descargar backup</button>
    <button class="btn-primary" onclick="abrirCorreoBackup()">📧 Abrir correo</button>
  </div>`);
}

function abrirCorreoBackup(){
  const email=v('f_email_backup');
  const clinicaNombre=document.getElementById('logoText').textContent;
  const fecha=today();
  const asunto=encodeURIComponent(`Backup OdontoApp — ${clinicaNombre} — ${fecha}`);
  const cuerpo=encodeURIComponent(`Adjunto el archivo de respaldo de OdontoApp correspondiente al ${fecha}.\n\nClinica: ${clinicaNombre}\n\nPor favor conservar este archivo en lugar seguro.\n\n---\nEnviado desde OdontoApp`);
  const mailto=email?`mailto:${email}?subject=${asunto}&body=${cuerpo}`:`mailto:?subject=${asunto}&body=${cuerpo}`;
  window.open(mailto);
  exportarDatos();
}

function importarDatos(){
  const input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=function(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=function(ev){
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.patients)throw new Error('Formato inválido');
        if(!confirm(`¿Importar backup del ${data.fechaExportacion?.split('T')[0]||'—'}?\n\nEsto reemplazará los datos actuales con ${data.totalPacientes} pacientes.\n\nEsta acción no se puede deshacer.`))return;
        patients=data.patients;
        egresos=data.egresos||[];
        facturas=data.facturas||[];
        nextId=data.nextId||patients.length+1;
        nextEgId=data.nextEgId||egresos.length+1;
        nextFactId=data.nextFactId||facturas.length+1;
        nextRecetaId=data.nextRecetaId||1;nextPresupId=data.nextPresupId||1;if(data.servicios)servicios=data.servicios;if(data.archivosContables)archivosContables=data.archivosContables;if(data.quickAppts)quickAppts=data.quickAppts;
nextPresupId=data.nextPresupId||1;
if(data.servicios)servicios=data.servicios;
if(data.archivosContables)archivosContables=data.archivosContables;
if(data.quickAppts)quickAppts=data.quickAppts;
        // Fix missing arrays
        patients.forEach(pt=>{
          ['surfData','wholeData'].forEach(k=>{if(!pt[k])pt[k]={};});
          ['treatments','payments','appointments','diary','images','consents','recetas','presupuestos'].forEach(k=>{if(!pt[k])pt[k]=[];});
        });
        // Restore logo if present
        if(data.clinica){
          document.getElementById('logoText').textContent=data.clinica.clinicaNombre||'OdontoApp';
          document.getElementById('logoProfesional').textContent=data.clinica.profesional||'Dr. Profesional';
          clinicaRUC=data.clinica.ruc||'';
          clinicaDireccion=data.clinica.direccion||'';
          clinicaTelefono=data.clinica.telefono||'';
        }
        save();closeModal();curPt=null;renderSidebar();showPage('dashboard');
        alert(`✓ Importación exitosa.\n${patients.length} pacientes restaurados.`);
      }catch(err){alert('Error al importar: '+err.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}

// ═══ SUPABASE SYNC ═══
let sbClient = null;
let sbUrl = '';
let sbKey = '';
let sbClinicaId = '';
let sbSyncing = false;
let sbSaveTimer = null;

function sbLoadConfig(){
  const cfg = localStorage.getItem('oa3_sb');
  if(cfg){ const c=JSON.parse(cfg); sbUrl=c.url||''; sbKey=c.key||''; sbClinicaId=c.clinicaId||''; }
}

function sbSaveConfig(){
  let o={};try{o=JSON.parse(localStorage.getItem('oa3_sb')||'{}');}catch(e){}
  localStorage.setItem('oa3_sb', JSON.stringify(Object.assign(o,{url:sbUrl, key:sbKey, clinicaId:sbClinicaId})));
}

function updateSbBtn(text, color){
  const btn=document.getElementById('sbBtn');
  const txt=document.getElementById('sbBtnText');
  if(txt) txt.textContent=text;
  if(btn&&color){ btn.style.borderColor=color; btn.style.color=color; }
}






function buildPayload(){
  return {
    id: sbClinicaId,
    data: {
      version:'OdontoApp_v3',
      guardado: new Date().toISOString(),
      clinica:{
        nombre:document.getElementById('logoText').textContent,
        profesional:document.getElementById('logoProfesional').textContent,
        ruc:clinicaRUC, direccion:clinicaDireccion, telefono:clinicaTelefono,
        logoColor, logoImg
      },
      patients, egresos, facturas, servicios, archivosContables, quickAppts,
nextId, nextEgId, nextFactId, nextRecetaId, nextPresupId,
servicios, archivosContables, quickAppts, nextPresupId, meds: MEDICAMENTOS_COMUNES
    },
    updated_at: new Date().toISOString()
  };
}


async function sbLoadNow(){
  if(!sbClient||!sbClinicaId) return;
  const status=document.getElementById('sb-status');
  if(status){ status.style.color='var(--text2)'; status.textContent='⏳ Cargando desde Supabase...'; }
  try {
    const {data, error} = await sbClient.from('clinica_data').select('data,updated_at').eq('id',sbClinicaId).single();
    if(error) throw error;
    if(!data||!data.data) throw new Error('No se encontraron datos en la nube');
    const d = data.data;
    closeModal();
    if(!confirm(`¿Cargar datos del ${new Date(data.updated_at).toLocaleString('es-EC')}?\n\n${d.patients?.length||0} pacientes, ${d.facturas?.length||0} facturas.\n\n⚠️ Los datos locales no sincronizados se reemplazarán.`)) return;
    // Restore
    patients=d.patients||[]; egresos=d.egresos||[]; facturas=d.facturas||[];
    nextId=d.nextId||patients.length+1; nextEgId=d.nextEgId||egresos.length+1;
nextFactId=d.nextFactId||facturas.length+1; nextRecetaId=d.nextRecetaId||1;nextPresupId=d.nextPresupId||1;if(d.servicios)servicios=d.servicios;if(d.archivosContables)archivosContables=d.archivosContables;if(d.quickAppts)quickAppts=d.quickAppts; nextPresupId=d.nextPresupId||1;
if(d.servicios)servicios=d.servicios; if(d.archivosContables)archivosContables=d.archivosContables; if(d.quickAppts)quickAppts=d.quickAppts;    if(d.meds?.length){ MEDICAMENTOS_COMUNES=d.meds; saveMeds(); }
    patients.forEach(pt=>{
      ['surfData','wholeData'].forEach(k=>{if(!pt[k])pt[k]={};});
      ['treatments','payments','appointments','diary','images','consents','recetas','presupuestos'].forEach(k=>{if(!pt[k])pt[k]=[];});
    });
    if(d.clinica){
      document.getElementById('logoText').textContent=d.clinica.nombre||'OdontoApp';
      document.getElementById('logoProfesional').textContent=d.clinica.profesional||'Dr. Profesional';
      clinicaRUC=d.clinica.ruc||''; clinicaDireccion=d.clinica.direccion||''; clinicaTelefono=d.clinica.telefono||'';
      logoColor=d.clinica.logoColor||'#2f9d94';
      if(d.clinica.logoImg){logoImg=d.clinica.logoImg; applyLogoImg(logoImg);}
      applyColor(logoColor);
    }
    save();
    localStorage.setItem('oa3_sb_lastsync', new Date().toISOString());
    curPt=null; renderSidebar(); showPage('dashboard');
    updateSbBtn('✓ Supabase conectado','#3ecf8e');
    alert('✓ Datos cargados correctamente desde la nube.');
  } catch(e){
    if(status){ status.style.color='#ef4444'; status.textContent='✗ Error: '+e.message; }
  }
}
// ═══════════════════════════════════════════════════════════
// 🛡️ SISTEMA DE RESPALDOS VERSIONADOS (HISTORIAL EN SUPABASE)
// ═══════════════════════════════════════════════════════════

// 1. Crear un punto de restauración en el tiempo
async function crearBackupHistorico(nota = "Backup manual") {
    if (!sbClient || !sbClinicaId) {
        alert("⚠️ Primero debes conectar Supabase.");
        return false;
    }

    try {
        // Obtener el estado actual de la app (el mismo que usa save())
        const bundle = {
            v: 1,
            t: Date.now(),
            patients: patients,
            egresos: egresos,
            facturas: facturas,
            archivosContables: archivosContables,
            servicios: servicios,
            quickAppts: quickAppts || [],
            nextId: nextId,
            nextEgId: nextEgId,
            nextFactId: nextFactId,
            nextRecetaId: nextRecetaId,
            nextPresupId: nextPresupId,
            logo: {
                text: document.getElementById('logoText').textContent,
                prof: document.getElementById('logoProfesional').textContent,
                color: logoColor,
                img: logoImg,
                ruc: clinicaRUC,
                dir: clinicaDireccion,
                tel: clinicaTelefono
            }
        };

        const version = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const sizeBytes = new Blob([JSON.stringify(bundle)]).size;

        // Mostrar estado de carga
        const btn = document.getElementById('btnCrearBackup');
        if (btn) {
            btn.textContent = '⏳ Guardando...';
            btn.disabled = true;
        }

        // Insertar NUEVA fila en el historial (NO sobrescribe la anterior)
        const { error } = await sbClient.from('clinica_backups').insert({
            clinica_id: sbClinicaId,
            version: version,
            nota: nota,
            backup_data: bundle,
            size_bytes: sizeBytes
        });

        if (error) throw error;

        // Limpieza automática: mantener solo los últimos 15 respaldos
        await limpiarRespaldosAntiguos();

        // Guardar timestamp del último backup automático
        localStorage.setItem('oa3_last_auto_backup', Date.now().toString());

        if (btn) {
            btn.textContent = '✅ Respaldo creado';
            setTimeout(() => {
                btn.textContent = '💾 Crear punto de restauración ahora';
                btn.disabled = false;
            }, 2000);
        }

        alert(`✅ ¡Respaldo histórico creado!\n\n📅 Fecha: ${new Date().toLocaleString('es-EC')}\n📝 Nota: ${nota}\n Tamaño: ${(sizeBytes/1024).toFixed(1)} KB`);
        return true;
    } catch (e) {
        console.error("Error al crear backup histórico:", e);
        alert("❌ Error al guardar en la nube: " + e.message);
        const btn = document.getElementById('btnCrearBackup');
        if (btn) {
            btn.textContent = ' Error';
            setTimeout(() => {
                btn.textContent = '💾 Crear punto de restauración ahora';
                btn.disabled = false;
            }, 2000);
        }
        return false;
    }
}

// 2. Mantener solo los últimos 15 respaldos (evita llenar Supabase)
async function limpiarRespaldosAntiguos() {
    try {
        const { data, error } = await sbClient
            .from('clinica_backups')
            .select('id')
            .eq('clinica_id', sbClinicaId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 15) {
            const aBorrar = data.slice(15).map(d => d.id);
            const { error: delError } = await sbClient
                .from('clinica_backups')
                .delete()
                .in('id', aBorrar);
            
            if (delError) console.warn("No se pudieron borrar respaldos antiguos:", delError);
            else console.log(`🧹 Limpieza: Se eliminaron ${aBorrar.length} respaldos antiguos.`);
        }
    } catch (e) {
        console.warn("No se pudo limpiar respaldos antiguos:", e);
    }
}

// 3. Restaurar desde un punto en el tiempo
async function restaurarDesdeHistorial(backupId, version, nota) {
    if (!confirm(`⚠️ ¿Estás seguro de restaurar la versión del ${version}?\n\nNota: ${nota}\n\nEsto REEMPLAZARÁ todos los datos actuales de este dispositivo con los de esa fecha.\n\n Recomendación: Crea un respaldo actual antes de restaurar por seguridad.`)) {
        return;
    }

    try {
        const { data, error } = await sbClient
            .from('clinica_backups')
            .select('backup_data')
            .eq('id', backupId)
            .single();

        if (error || !data) throw new Error("No se encontró el respaldo");

        const bundle = data.backup_data;

        // Sobrescribir TODAS las variables globales con los datos históricos
        patients = bundle.patients || [];
        egresos = bundle.egresos || [];
        facturas = bundle.facturas || [];
        archivosContables = bundle.archivosContables || [];
        servicios = bundle.servicios || [];
        quickAppts = bundle.quickAppts || [];
        nextId = bundle.nextId || 1;
        nextEgId = bundle.nextEgId || 1;
        nextFactId = bundle.nextFactId || 1;
        nextRecetaId = bundle.nextRecetaId || 1;
        nextPresupId = bundle.nextPresupId || 1;

        // Actualizar logo si existe
        if (bundle.logo) {
            if (bundle.logo.text) document.getElementById('logoText').textContent = bundle.logo.text;
            if (bundle.logo.prof) document.getElementById('logoProfesional').textContent = bundle.logo.prof;
            logoColor = bundle.logo.color || '#2f9d94';
            logoImg = bundle.logo.img || '';
            clinicaRUC = bundle.logo.ruc || '';
            clinicaDireccion = bundle.logo.dir || '';
            clinicaTelefono = bundle.logo.tel || '';
        }

        // Guardar en IndexedDB
        save();

        alert(`✅ Datos restaurados correctamente desde:\n\n📅 ${version}\n📝 ${nota}\n\nLa página se recargará.`);
        reloadSeguro();
    } catch (e) {
        alert(" Error al restaurar: " + e.message);
    }
}

// 4. Mostrar el historial de respaldos en un modal
async function mostrarHistorialRespaldos() {
    if (!sbClient || !sbClinicaId) {
        alert("⚠️ Primero debes conectar Supabase.");
        return;
    }

    // Mostrar modal de carga
    openModal(`<div class="modal-title">📜 Cargando historial...</div><div style="text-align:center;padding:40px"><div style="font-size:40px;animation:spin 1s linear infinite">⏳</div></div>`);

    try {
        const { data, error } = await sbClient
            .from('clinica_backups')
            .select('id, version, nota, size_bytes, created_at')
            .eq('clinica_id', sbClinicaId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            openModal(`<div class="modal-title">📜 Historial de Respaldos</div>
            <div style="text-align:center;padding:40px">
                <div style="font-size:50px;margin-bottom:15px"></div>
                <div style="font-size:15px;font-weight:600;color:var(--text)">Aún no hay respaldos históricos</div>
                <div style="font-size:13px;color:var(--text3);margin-top:8px">Crea tu primer punto de restauración para empezar.</div>
            </div>
            <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>`);
            return;
        }

        let html = `<div class="modal-title"> Historial de Respaldos en la Nube</div>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#0c4a6e">
            <strong>💡 ¿Cómo funciona?</strong> Cada respaldo es una "foto" de tus datos en un momento específico. 
            Si algo se borra o se daña, puedes volver a cualquier punto del historial.
            <br><br>Se mantienen automáticamente los <strong>últimos 15 respaldos</strong> para no llenar tu base de datos.
        </div>
        <div style="max-height:400px;overflow-y:auto;">`;
        
        data.forEach((b, index) => {
            const fecha = new Date(b.created_at).toLocaleString('es-EC', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const sizeMB = (b.size_bytes / (1024 * 1024)).toFixed(2);
            const esElMasReciente = index === 0;
            
            html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border);${esElMasReciente ? 'background:#f0fdf4;' : ''}">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                        ${esElMasReciente ? '<span style="background:#10b981;color:white;font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700">MÁS RECIENTE</span>' : ''}
                        <div style="font-weight:600;font-size:13px;color:var(--text)">${b.nota || 'Backup automático'}</div>
                    </div>
                    <div style="font-size:11px;color:var(--text3);margin-bottom:3px">📅 ${fecha}</div>
                    <div style="font-size:10px;color:var(--accent);font-family:monospace">💾 ${sizeMB} MB · ID: ${b.version}</div>
                </div>
                <button class="btn-sm" style="background:var(--amber);color:white;margin-left:10px;white-space:nowrap" 
                    onclick="restaurarDesdeHistorial('${b.id}', '${jsq(fecha)}', '${jsq((b.nota || 'Backup automático'))}')">Restaurar</button>
            </div>`;
        });

        html += `</div>
        <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>`;
        openModal(html);
    } catch (e) {
        openModal(`<div class="modal-title">📜 Historial de Respaldos</div>
        <div style="text-align:center;padding:28px 20px">
            <div style="font-size:40px;margin-bottom:12px">⚠️</div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">No se pudo cargar el historial</div>
            <div style="font-size:12px;color:var(--text3);margin-top:8px">${esc(e.message)}</div>
        </div>
        <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>`);
    }
}


// Auto-sync debounced
function sbAutoSync(){ if(typeof syncSchedule==='function') syncSchedule(); }

// ═══ MEDIDOR DE ALMACENAMIENTO (local + Supabase) ═══
async function medirAlmacenamiento(){
  const keys=['oa3_pts','oa3_eg','oa3_fact','oa3_logo','oa3_arch','oa3_svc','oa3_meds','oa3_qa','oa3_sb','oa3_nid','oa3_neg','oa3_nfact','oa3_nreceta','oa3_npresup','oa3_dark','oa3_tz','oa3_wamsg','oa3_sb_lastsync'];
  let lsBytes=0;
  keys.forEach(k=>{const s=localStorage.getItem(k);if(s)lsBytes+=new Blob([s]).size;});
  let idbBytes=0,idbCount=0;
  try{
    const db=await openImgDB();
    await new Promise(res=>{
      const cur=db.transaction('images','readonly').objectStore('images').openCursor();
      cur.onsuccess=e=>{
        const c=e.target.result;
        if(c){if(c.value&&c.value.size)idbBytes+=c.value.size;idbCount++;c.continue();}
        else res();
      };
      cur.onerror=()=>res();
    });
  }catch(e){}
  return{lsBytes,idbBytes,idbCount};
}
async function medirSupabase(){
  if(!sbClient||!sbClinicaId)return null;
  let payloadBytes=0;
  try{payloadBytes=new Blob([JSON.stringify(buildPayload())]).size;}catch(e){}
  let dbBytes=null;
  try{
    const {data,error}=await sbClient.rpc('clinica_db_size');
    if(!error&&typeof data==='number')dbBytes=data;
  }catch(e){}
  return{payloadBytes,dbBytes};
}
async function pintarMedidor(){
  const el=document.getElementById('storage-meter');
  if(!el)return;
  const m=await medirAlmacenamiento();
  const LS_MAX=5*1024*1024;
  const pct=Math.min(100,Math.round(m.lsBytes/LS_MAX*100));
  const col=pct<60?'var(--green)':pct<85?'var(--amber)':'var(--red)';
  let html=`
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>📱 Datos del consultorio (localStorage)</span><b style="color:${col}">${fmtBytes(m.lsBytes)} / ~5 MB · ${pct}%</b></div>
    <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px;transition:width .4s"></div></div>
    <div style="font-size:10px;color:var(--text3);margin-top:4px">${pct>=85?'🔴 Cerca del límite: haz un backup y libera espacio (imágenes y pacientes antiguos).':pct>=60?'🟡 Vigila el crecimiento: las miniaturas de imágenes son lo que más pesa.':'🟢 Margen saludable.'}</div>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:12px"><span>🖼️ Radiografías/fotos originales (este dispositivo)</span><b>${fmtBytes(m.idbBytes)}${m.idbCount?' · '+m.idbCount+' archivos':''}</b></div>`;
  if(sbClient&&sbClinicaId){
    const s=await medirSupabase();
    if(s){
      const sbPct=s.dbBytes!==null?Math.max(1,Math.min(100,Math.round(s.dbBytes/(500*1024*1024)*100))):0;
      html+=`<div style="border-top:1px solid var(--border);padding-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:6px"><span>☁️ Peso de cada sincronización a Supabase</span><b>${fmtBytes(s.payloadBytes)}</b></div>
      ${s.dbBytes!==null?`<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span>☁️ Base de datos en la nube (plan gratis: 500 MB)</span><b>${fmtBytes(s.dbBytes)} · ${sbPct}%</b></div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${sbPct}%;background:var(--accent);border-radius:4px"></div></div>`
      :`<div style="font-size:10px;color:var(--text3)">💡 Para ver el total de la base de datos, ejecuta una vez el SQL opcional del medidor en tu Supabase.</div>`}
      </div>`;
    }
  }else{
    html+=`<div style="font-size:11px;color:var(--text3);border-top:1px solid var(--border);padding-top:8px">☁️ Supabase sin conectar: tu única copia está en este dispositivo.</div>`;
  }
  el.innerHTML=html;
}
