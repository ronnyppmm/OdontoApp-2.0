/* ═══ NÚCLEO — IndexedDB, Supabase, backup, variables globales, save()/load() ═══ */

/* ═══ HELPERS SEGUROS (v4) ═══ */
// Escapa texto para insertarlo en HTML o en atributos ("..." y '...')
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// ID único numérico (compatible con ids viejos); evita choques entre dispositivos
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
    if(!Patients.all()||!Patients.all().length)return;
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
// Para soporte/recuperación: await listarBackupsLocales()  |  await Backup.downloadLocal('2026-10-02')
async function listarBackupsLocales(){return((await idbGet('daily_backups'))||[]).map(x=>({fecha:x.fecha,pacientes:x.pacientes}));}
/* Enlaza los botones Imprimir/Cerrar de un documento abierto en otra ventana. Se hace desde aquí (no con un <script> dentro del documento)
   porque la política de seguridad del navegador (CSP) no permite scripts en línea. auto=true imprime al abrir. */
function wirePrint(w,auto){
try{
var d=w&&w.document;if(!d||!d.getElementById)return;
var b=d.getElementById('btnPrint'),c=d.getElementById('btnClose');
if(b)b.addEventListener('click',function(){w.print();});
if(c)c.addEventListener('click',function(){w.close();});
if(auto)setTimeout(function(){try{w.print();}catch(e){}},400);
}catch(e){}
}
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
let curTab='datos',curPage='dashboard';
/* ═══ CONTADORES — siguiente N.° de cada tipo de registro (PRIVADOS: solo se tocan con esta API) ═══
   nextId: pacientes y N.° de ficha · nextEgId: egresos · nextFactId: facturas · nextRecetaId: recetas · nextPresupId: presupuestos.
   Nunca bajan por accidente: un valor inválido (texto, 0, negativo, decimal) se ignora. Los números usados no se reutilizan.
     Counters.get(k)            valor actual            Counters.take(k)     devuelve el actual y avanza (para crear un registro)
     Counters.set(k,n)          fija (true/false)       Counters.raiseTo(k,n) sube hasta n si es mayor (nunca baja)
     Counters.all()             copia {nextId:…}        Counters.merge(obj)  fija los que vengan válidos (cargar / restaurar)
     Counters.maxWith(obj)      sube cada uno al mayor (sincronizar)             Counters.reset()   todos a 1 */
const Counters=(function(){
  var KEYS=['nextId','nextEgId','nextFactId','nextRecetaId','nextPresupId'],v={};
  function reset(){KEYS.forEach(function(k){v[k]=1;});}
  function num(n){n=Number(n);return Number.isSafeInteger(n)&&n>=1?n:null;}
  function chk(k){if(KEYS.indexOf(k)<0)throw new Error('Contador desconocido: '+k);}
  function get(k){chk(k);return v[k];}
  function set(k,n){chk(k);var x=num(n);if(x===null)return false;v[k]=x;return true;}
  function take(k){chk(k);var x=v[k];v[k]=x+1;return x;}
  function raiseTo(k,n){chk(k);var x=num(n);if(x!==null&&x>v[k])v[k]=x;return v[k];}
  function all(){var o={};KEYS.forEach(function(k){o[k]=v[k];});return o;}
  function merge(o){if(!o||typeof o!=='object')return;KEYS.forEach(function(k){var x=num(o[k]);if(x!==null)v[k]=x;});}
  function maxWith(o){if(!o||typeof o!=='object')return;KEYS.forEach(function(k){raiseTo(k,o[k]);});}
  reset();
  return {KEYS:KEYS.slice(),get:get,set:set,take:take,raiseTo:raiseTo,all:all,merge:merge,maxWith:maxWith,reset:reset};
})();
let logoColor='#2f9d94',logoImg=null;
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
/* ── acceso a IndexedDB: con la bóveda activada TODO se guarda cifrado (ver js/vault.js) ──
   rawSet/rawGet leen y escriben tal cual; idbSet/idbGet cifran y descifran. */
function rawSet(key,val){
return openMainDB().then(db=>new Promise(res=>{
const tx=db.transaction('kv','readwrite');
tx.objectStore('kv').put(val,key);
tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);
}));
}
function rawGet(key){
return openMainDB().then(db=>new Promise(res=>{
const rq=db.transaction('kv','readonly').objectStore('kv').get(key);
rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(undefined);
}));
}
let _idbQ=Promise.resolve();      // las escrituras salen en el mismo orden en que se pidieron (cifrar es asíncrono)
const _idbFault={};               // claves que no se pudieron descifrar: NO se sobrescriben (si no, se perdería lo único que queda)
function idbSet(key,val){
if(Vault.locked()||_idbFault[key])return Promise.resolve(false);
const sealed=(Vault.sealing()&&val!==undefined)?Vault.seal(val,'kv|'+key):Promise.resolve(val);
sealed.catch(()=>{});
const w=_idbQ.then(()=>sealed).then(v=>rawSet(key,v)).catch(e=>{console.warn('IndexedDB:',e);return false;});
_idbQ=w;return w;
}
function idbGet(key){
return rawGet(key).then(v=>{
if(!Vault.isEnv(v))return v;
if(Vault.locked())return undefined;
return Vault.open(v,'kv|'+key).then(x=>{delete _idbFault[key];return x;},err=>{
_idbFault[key]=true;console.error('No se pudo descifrar '+key,err);
if(key==='state'){try{alert('⚠️ No se pudieron leer los datos cifrados de este dispositivo.\n\nPor seguridad la app NO sobrescribirá nada. Restaura un respaldo o recupera con tu código.');}catch(e){}}
return undefined;});
}).catch(()=>undefined);
}
/* Con el cifrado activado no queda copia legible de los datos en localStorage */
function purgeMirror(){['oa3_pts','oa3_eg','oa3_fact','oa3_arch','oa3_svc','oa3_logo','oa3_meta'].forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});}
function saveNow(){
_savePending=false;
const bundle={v:DATA_VERSION,t:Date.now(),patients:Patients.all(),egresos:Finance.expenses(),facturas:Finance.invoices(),archivosContables:Finance.archives(),servicios:Services.list(),quickAppts:Appts.quick(),meds:MEDICAMENTOS_COMUNES,
...Counters.all(),
logo:{text:document.getElementById('logoText').textContent,prof:document.getElementById('logoProfesional').textContent,color:logoColor,img:logoImg,ruc:clinicaRUC,dir:clinicaDireccion,tel:clinicaTelefono}};
idbSet('state',bundle); // ← la "base de datos grande"
if(Vault.enabled()){purgeMirror();}else try{ // espejo localStorage (compatibilidad); si no cabe, no rompe nada
localStorage.setItem('oa3_pts',JSON.stringify(Patients.all()));
localStorage.setItem('oa3_eg',JSON.stringify(Finance.expenses()));
localStorage.setItem('oa3_fact',JSON.stringify(Finance.invoices()));
localStorage.setItem('oa3_nid',Counters.get('nextId'));
localStorage.setItem('oa3_neg',Counters.get('nextEgId'));
localStorage.setItem('oa3_nfact',Counters.get('nextFactId'));
localStorage.setItem('oa3_nreceta',Counters.get('nextRecetaId'));
localStorage.setItem('oa3_npresup',Counters.get('nextPresupId'));
localStorage.setItem('oa3_logo',JSON.stringify(bundle.logo));
localStorage.setItem('oa3_arch',JSON.stringify(Finance.archives()));
localStorage.setItem('oa3_svc',JSON.stringify(Services.list()));
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
Patients.setAll(b.patients||[]);Finance.setExpenses(b.egresos);Finance.setInvoices(b.facturas);
Finance.setArchives(b.archivosContables);Services.setAll(b.servicios);
Appts.setQuick(b.quickAppts);
if(Array.isArray(b.meds)&&b.meds.length)MEDICAMENTOS_COMUNES=b.meds.filter(m=>typeof m==='string');
Counters.merge(b);
if(b.logo){
document.getElementById('logoText').textContent=b.logo.text||'OdontoApp';
document.getElementById('logoProfesional').textContent=b.logo.prof||'Dr. Profesional';
logoColor=b.logo.color||'#0ea5e9';logoImg=b.logo.img||null;
clinicaRUC=b.logo.ruc||'';clinicaDireccion=b.logo.dir||'';clinicaTelefono=b.logo.tel||'';
Logo.applyColor(logoColor);if(logoImg)Logo.applyImg(logoImg);
}
}
Patients.all().forEach(pt=>{
['surfData','wholeData'].forEach(k=>{if(!pt[k])pt[k]={};});
['treatments','payments','appointments','diary','images','consents','recetas','presupuestos'].forEach(k=>{if(!pt[k])pt[k]=[];});
if(pt.birthdate&&pt.age!==undefined)delete pt.age;
});
Appts.adoptLegacy();   // citas rápidas guardadas por versiones anteriores solo en localStorage
if(Patients.all().length===0)seedDemo();
Patients.renderList();
if(Patients.current())Patients.select(Patients.current().id);else showPage(curPage||'dashboard');
}

function seedDemo(){
  Patients.setAll([
    {demo:true,id:Counters.take('nextId'),name:'María García',age:34,phone:'0987-654-321',email:'maria@mail.com',cedula:'1712345678',birthdate:todayBD(),alergias:'Penicilina',antecedentes:'Hipertensión controlada',surfData:{},wholeData:{},
     diary:[{id:1,date:'2025-03-10',time:'09:00',doctor:'Dr. Pérez',title:'Consulta inicial',body:'Paciente refiere dolor en zona posterior. Caries en pieza 36.',alert:'Control en 7 días'}],
     treatments:[{id:1,name:'Extracción molar 46',date:'2025-01-10',status:'realizado',cost:45,tooth:'46'},{id:2,name:'Obturación resina 36',date:'2025-03-15',status:'pendiente',cost:35,tooth:'36'}],
     payments:[{id:1,concept:'Extracción molar',date:'2025-01-10',amount:45,type:'Efectivo'}],
     appointments:[{id:1,date:daysFromNow(3),time:'10:00',reason:'Control y limpieza',status:'pendiente'}]},
    {demo:true,id:Counters.take('nextId'),name:'Carlos Ruiz',age:28,phone:'0991-234-567',email:'carlos@mail.com',cedula:'1798765432',birthdate:'1997-07-22',alergias:'Ninguna',antecedentes:'Sin antecedentes',surfData:{},wholeData:{},diary:[],
     treatments:[{id:1,name:'Limpieza dental',date:'2024-12-01',status:'realizado',cost:30,tooth:'General'}],
     payments:[{id:1,concept:'Limpieza dental',date:'2024-12-01',amount:30,type:'Transferencia'}],
     appointments:[{id:1,date:today(),time:'09:00',reason:'Revisión general',status:'pendiente'}]}
  ]);
  Finance.setExpenses([
    {demo:true,id:Counters.take('nextEgId'),concepto:'Materiales dentales',categoria:'Materiales',monto:120,fecha:'2025-03-01',proveedor:'DentalPro'},
    {demo:true,id:Counters.take('nextEgId'),concepto:'Arriendo local',categoria:'Arriendo',monto:350,fecha:'2025-03-01',proveedor:'Propietario'},
    {demo:true,id:Counters.take('nextEgId'),concepto:'Servicios básicos',categoria:'Servicios',monto:45,fecha:'2025-03-05',proveedor:'CNT / Eléctrica'},
  ]);
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
function imgDbPut(id,blob){if(Vault.locked())return Promise.reject(new Error('Bóveda cerrada'));return (Vault.sealing()?Vault.seal(blob,'img|'+id):Promise.resolve(blob)).then(v=>openImgDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(v,id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);})));}
function imgDbGet(id){return openImgDB().then(db=>new Promise((res,rej)=>{const tx=db.transaction('images','readonly');const rq=tx.objectStore('images').get(id);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);})).then(v=>Vault.isEnv(v)?Vault.open(v,'img|'+id):v);}
function imgDbDel(id){return openImgDB().then(db=>new Promise((res)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').delete(id);tx.oncomplete=res;tx.onerror=()=>res();}));}
/* ── activar / desactivar el cifrado de lo que ya está guardado ──
   Se recorre cada registro por separado: si algo se interrumpe, los registros ya convertidos y los que faltan
   se leen igual (Vault.open deja pasar lo que aún no está cifrado). Antes de reemplazar un registro se comprueba que
   descifrado da exactamente lo mismo, y solo se reemplaza si nadie lo cambió mientras tanto. */
function _sameVal(a,b){
if(typeof Blob!=='undefined'&&a instanceof Blob)return b instanceof Blob&&a.size===b.size&&a.type===b.type;
return JSON.stringify(a)===JSON.stringify(b);
}
function _sameCt(a,b){
if(!a||!b||a.byteLength!==b.byteLength)return false;
const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;
}
async function _reencodePass(open,store,tag,sealIt,fresh){
const db=await open();let changed=0,skipped=0;
try{
if(!db.objectStoreNames.contains(store))return{changed:0,skipped:0};   // base sin ese almacén: no hay nada que convertir
const keys=await new Promise(res=>{const rq=db.transaction(store,'readonly').objectStore(store).getAllKeys();rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res([]);});
for(const k of keys){
const v=await new Promise(res=>{const rq=db.transaction(store,'readonly').objectStore(store).get(k);rq.onsuccess=()=>res(rq.result);rq.onerror=()=>res(undefined);});
if(v===undefined||sealIt===Vault.isEnv(v))continue;
const aad=tag+'|'+k;
const nv=sealIt?await Vault.seal(v,aad):await Vault.open(v,aad);
if(sealIt&&!_sameVal(await Vault.open(nv,aad),v))throw new Error('La verificación de '+aad+' falló');
const ok=await new Promise(res=>{
const tx=db.transaction(store,'readwrite'),st=tx.objectStore(store),g=st.get(k);let did=false;
g.onsuccess=()=>{const cur=g.result;
const same=sealIt?(!Vault.isEnv(cur)&&_sameVal(cur,v)):(Vault.isEnv(cur)&&_sameCt(cur.ct,v.ct));
if(same){st.put(nv,k);did=true;}};
tx.oncomplete=()=>res(did);tx.onerror=()=>res(false);tx.onabort=()=>res(false);
});
if(ok)changed++;else skipped++;
}
return{changed,skipped};
}finally{if(fresh)db.close();}
}
async function vaultReencode(sealIt){
const stores=[
[openMainDB,'kv','kv'],
[openImgDB,'images','img'],
[()=>new Promise((res,rej)=>{const rq=indexedDB.open('odontoapp_sync',1);rq.onupgradeneeded=e=>{if(!e.target.result.objectStoreNames.contains('kv'))e.target.result.createObjectStore('kv');};rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);}),'kv','sdb',true]
];
let total=0;
for(const [open,store,tag,fresh] of stores){
let r,tries=0;
do{r=await _reencodePass(open,store,tag,sealIt,fresh);total+=r.changed;}while(r.skipped>0&&++tries<5);
if(r.skipped>0)throw new Error('Hubo cambios simultáneos en '+tag+'; inténtalo de nuevo');
}
return total;
}
function fmtBytes(b){if(b>1048576)return(b/1048576).toFixed(1)+'MB';return Math.round(b/1024)+'KB';}

function factoryReset(){
  if(!confirm('⚠️ ¿Estás seguro?\n\nEsto eliminará TODOS los datos:\n• Pacientes y su historial\n• Facturas y egresos\n• Recetas y consentimientos\n• Configuración de la clínica\n\nEsta acción NO se puede deshacer.\nSe recomienda hacer un backup antes.'))return;
  if(!confirm('Segunda confirmación requerida.\n\n¿Confirmas que deseas borrar todos los datos y volver a los valores de fábrica?'))return;
  // Clear all localStorage keys used by the app
  ['oa3_pts','oa3_eg','oa3_fact','oa3_nid','oa3_neg','oa3_nfact','oa3_nreceta','oa3_logo','oa3_meds','oa3_qa','oa3_qa_ok','oa3_arch','oa3_svc'].forEach(k=>localStorage.removeItem(k));
  // Reset state
  Patients.setAll([]);Finance.setExpenses([]);Finance.setInvoices([]);Finance.setArchives([]);Services.setAll([]);Appts.setQuick([]);
  Counters.reset();
  logoColor='#2f9d94';logoImg=null;
  clinicaRUC='';clinicaDireccion='';clinicaTelefono='';
  MEDICAMENTOS_COMUNES=['Amoxicilina 500mg','Amoxicilina + Ácido Clavulánico 875/125mg','Azitromicina 500mg','Clindamicina 300mg','Metronidazol 500mg','Ibuprofeno 400mg','Ibuprofeno 600mg','Paracetamol 500mg','Naproxeno 500mg','Ketorolaco 10mg','Diclofenaco 50mg','Dexametasona 4mg','Prednisona 5mg','Cloruro de Sodio 0.9% (Suero Fisiológico)','Clorhexidina 0.12% enjuague bucal','Gel de Clorhexidina 1%','Clorfenamina 4mg','Loratadina 10mg','Omeprazol 20mg'];
  try{if(typeof Backup!=='undefined')Backup.wipeCopies();}catch(e){}
  // Reset logo UI
  document.getElementById('logoText').textContent='OdontoApp';
  document.getElementById('logoProfesional').textContent='Dr. Profesional';
  const icon=document.getElementById('logoIcon');
  icon.style.background='#2f9d94';
  icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C9.2 2 7 4.2 7 7c0 2 1 4 2.2 5.2L10.5 21c.2.8.8 1 1.5 1s1.3-.2 1.5-1l1.3-8.8C16 11 17 9 17 7c0-2.8-2.2-5-5-5z"/></svg>`;
  Logo.applyColor('#2f9d94');
  // Seed demo data and restart
  seedDemo();
  closeModal();
  Patients.setCurrent(null);
  Patients.renderList();
  showPage('dashboard');
  alert('✓ App restablecida correctamente a los valores de fábrica.');
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
      patients:Patients.all(), egresos:Finance.expenses(), facturas:Finance.invoices(), servicios:Services.list(), archivosContables:Finance.archives(), quickAppts:Appts.quick(),
...Counters.all(),
meds: MEDICAMENTOS_COMUNES
    },
    updated_at: new Date().toISOString()
  };
}


// Auto-sync debounced
function sbAutoSync(){ if(typeof syncSchedule==='function') syncSchedule(); }

// ═══ MEDIDOR DE ALMACENAMIENTO (local + Supabase) ═══
async function medirAlmacenamiento(){
  const keys=['oa3_pts','oa3_eg','oa3_fact','oa3_logo','oa3_arch','oa3_svc','oa3_meds','oa3_qa','oa3_qa_ok','oa3_sb','oa3_nid','oa3_neg','oa3_nfact','oa3_nreceta','oa3_npresup','oa3_dark','oa3_tz','oa3_wamsg','oa3_sb_lastsync'];
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
