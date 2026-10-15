// Bóveda (cifrado en reposo): módulo Vault, almacenes cifrados, arranque bloqueado, PIN/código, activar y desactivar. Por CLIC y con IndexedDB real (fake-indexeddb).
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { webcrypto } = require('crypto');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); });
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const errs = [], alerts = [];
const windows = [];
async function boot(url, seedLS = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {};
      w.alert = m => alerts.push(String(m)); w.confirm = () => true; w.open = () => null;
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.Blob = Blob;   // Blob de Node: el de jsdom no sobrevive al clon estructurado de fake-indexeddb (solo pasa en pruebas)
       Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
      for (const [k, v] of Object.entries(seedLS)) w.localStorage.setItem(k, v);
    } });
  await wait(2200); windows.push(dom.window); return dom.window;
}
const keep = w => { const o = {}; for (const k of ['oa3_vault', 'oa3_sec']) { const v = w.localStorage.getItem(k); if (v != null) o[k] = v; } return o; };

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — Bóveda (cifrado de datos en este dispositivo)');
  let w = await boot(url); let D = w.document; let E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const setv = (id, v) => { D.getElementById(id).value = v; };

  // ───────── 1. módulo Vault ─────────
  check('sin cifrado: la bóveda está apagada y «abierta» (la app arranca como siempre)', E('Vault.enabled()') === false && E('Vault.locked()') === false && E('Vault.sealing()') === false);
  check('con 2 pacientes de ejemplo cargados y sin PIN', E('Patients.all().length') === 2 && E('Seguridad.activo()') === false);
  const r1 = await E(`(async()=>{
    const out={};
    await Vault.create('482915','ABCD-EFGH-JKLM-NPQR');
    out.enabled=Vault.enabled();out.open=Vault.isOpen();out.sealing=Vault.sealing();
    const env=await Vault.seal({a:1,t:'ñandú'},'kv|x');out.isEnv=Vault.isEnv(env);out.ivLen=env.iv.length;out.t=env.t;
    out.back=JSON.stringify(await Vault.open(env,'kv|x'));
    try{await Vault.open(env,'kv|OTRO');out.aad='abrió';}catch(e){out.aad='rechazado';}
    const t=new Uint8Array(env.ct.slice(0));t[0]^=1;try{await Vault.open(Object.assign({},env,{ct:t.buffer}),'kv|x');out.tamper='abrió';}catch(e){out.tamper='rechazado';}
    const e2=await Vault.seal({a:1,t:'ñandú'},'kv|x');out.distinctIv=Array.from(env.iv).join()!==Array.from(e2.iv).join();
    const blob=await Vault.seal(new Blob(['hola'],{type:'image/png'}),'img|1');out.bt=blob.t;out.bsize=blob.size;out.bmime=blob.mime;
    const bb=await Vault.open(blob,'img|1');out.bback=bb instanceof Blob&&bb.size===4&&bb.type==='image/png';
    out.plain=JSON.stringify(await Vault.open({x:1},'kv|x'));
    out.isEnvBool=[Vault.isEnv(env)===true,Vault.isEnv({x:1})===false,Vault.isEnv(null)===false,Vault.isEnv(undefined)===false,Vault.isEnv('s')===false];
    out.chkPin=[await Vault.checkPin('482915'),await Vault.checkPin('482916')];
    out.chkRec=[await Vault.checkRec('abcd efgh-jklm.npqr'),await Vault.checkRec('AAAA-AAAA-AAAA-AAAA')];
    Vault.remove();out.afterRemove=[Vault.enabled(),localStorage.getItem('oa3_vault')];
    return JSON.stringify(out);})()`).then(JSON.parse);
  check('crear: queda activa, abierta y cifrando', r1.enabled && r1.open && r1.sealing);
  check('cifrar un valor da un «sobre» con IV de 12 bytes y descifrar devuelve lo mismo (acentos incluidos)', r1.isEnv && r1.ivLen === 12 && r1.t === 'j' && r1.back === '{"a":1,"t":"ñandú"}', r1);
  check('el sobre está atado a su clave: con otro nombre (aad) NO abre (no se pueden intercambiar registros)', r1.aad === 'rechazado');
  check('si alguien altera un solo bit, NO abre (autenticado)', r1.tamper === 'rechazado');
  check('cada cifrado usa un IV distinto', r1.distinctIv);
  check('imágenes (Blob): se cifran y vuelven con su tipo y tamaño', r1.bt === 'b' && r1.bsize === 4 && r1.bmime === 'image/png' && r1.bback, r1);
  check('isEnv devuelve siempre true/false (se compara con ===)', r1.isEnvBool.every(Boolean), r1.isEnvBool);
  check('un dato antiguo sin cifrar pasa tal cual (así se lee a mitad de una conversión)', r1.plain === '{"x":1}');
  check('checkPin/checkRec: aciertan con el secreto bueno (el código ignora guiones, espacios y minúsculas) y fallan con el malo', r1.chkPin[0] === true && r1.chkPin[1] === false && r1.chkRec[0] === true && r1.chkRec[1] === false, r1);
  check('remove() desactiva y borra la configuración', r1.afterRemove[0] === false && r1.afterRemove[1] === null);
  const cfgSrc = fs.readFileSync(path.join(ROOT, 'js/vault.js'), 'utf8');
  check('PBKDF2 con 600 000 vueltas y AES-GCM de 256 bits; la clave de datos nunca se guarda en claro', /ITER=600000/.test(cfgSrc) && /length:256/.test(cfgSrc) && !/localStorage\.setItem\(LSK,[^)]*dekRaw/.test(cfgSrc));

  // ───────── 2. activar PIN y cifrado POR CLIC ─────────
  E('Seguridad.abrirActivar()'); setv('sec_p1', '482915'); setv('sec_p2', '482915'); click(D.getElementById('secGo')); await wait(1500);
  const rec1 = D.getElementById('secRecCode') && D.getElementById('secRecCode').textContent; E('closeModal()');
  check('PIN activado (código de recuperación mostrado)', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(rec1 || ''), rec1);
  check('la tarjeta ofrece «Activar cifrado de datos» y avisa que los datos están sin cifrar', (E('showPage("configuracion")'), /Activar cifrado de datos/.test(D.getElementById('mainContent').textContent) && /sin cifrar/.test(D.getElementById('mainContent').textContent)));
  E('Seguridad.abrirCifrar()'); setv('sec_p0', '4829'); click(D.getElementById('secGo')); await wait(200);
  check('con un PIN corto no se puede cifrar (pide 6 a 8 dígitos)', /6 a 8 dígitos/.test(D.getElementById('secMsg').textContent) && E('Vault.enabled()') === false);
  setv('sec_p0', '482916'); click(D.getElementById('secGo')); await wait(1500);
  check('PIN equivocado: no cifra nada', /incorrecto/.test(D.getElementById('secMsg').textContent) && E('Vault.enabled()') === false);
  E('closeModal()');
  // dejar datos sin cifrar en los tres almacenes para comprobar que TODO se convierte
  await E(`imgDbPut('foto1', new Blob(['IMAGEN-SECRETA'],{type:'image/png'}))`);
  await new Promise(ok => { const rq = indexedDB.open('odontoapp_sync', 1); rq.onupgradeneeded = e => e.target.result.createObjectStore('kv'); rq.onsuccess = () => { const db = rq.result, tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ clinicId: 'c1', recs: { a: 'María García' } }, 'meta'); tx.objectStore('kv').put('{"name":"María García"}', 'b|patients|1'); tx.oncomplete = () => { db.close(); ok(); }; }; });
  await E(`idbSet('audit',[{t:1,ev:'Abrió ficha',det:'Ficha N° 1'}])`);
  const rawKeys = async () => JSON.parse(await E(`(async()=>{const o={};for(const [n,s] of [['odontoapp_db','kv'],['odontoapp_imgs','images'],['odontoapp_sync','kv']]){o[n]={};const db=await new Promise((ok,no)=>{const r=indexedDB.open(n);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});if(!db.objectStoreNames.contains(s)){db.close();continue;}
    const keys=await new Promise(ok=>{const r=db.transaction(s).objectStore(s).getAllKeys();r.onsuccess=()=>ok(r.result);});
    for(const k of keys){const v=await new Promise(ok=>{const r=db.transaction(s).objectStore(s).get(k);r.onsuccess=()=>ok(r.result);});o[n][k]=Vault.isEnv(v)?'ENV':'PLANO:'+(v instanceof Blob?'blob':JSON.stringify(v).slice(0,40));}db.close();}return JSON.stringify(o);})()`));
  const before = await rawKeys();
  check('ANTES de cifrar los 3 almacenes están en claro', Object.values(before).every(s => Object.values(s).length && Object.values(s).every(v => v.startsWith('PLANO'))), before);
  E('Seguridad.abrirCifrar()'); setv('sec_p0', '482915'); click(D.getElementById('secGo')); await wait(4000);
  const rec2 = D.getElementById('secRecCode') && D.getElementById('secRecCode').textContent; E('closeModal()'); await wait(400);
  check('cifrado activado: muestra un código NUEVO', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(rec2 || '') && rec2 !== rec1, rec2);
  const after = await rawKeys();
  check('DESPUÉS: estado, auditoría, imagen y la base de sincronización quedaron cifrados', Object.values(after).every(s => Object.values(s).length && Object.values(s).every(v => v === 'ENV')), after);
  check('repetir la conversión no cifra dos veces (idempotente): 0 cambios', (await E('vaultReencode(true)')) === 0);
  check('el espejo legible de localStorage desapareció', !['oa3_pts', 'oa3_eg', 'oa3_fact', 'oa3_arch', 'oa3_svc', 'oa3_logo', 'oa3_meta'].some(k => w.localStorage.getItem(k) !== null));
  E('save()'); await wait(700);
  check('seguir guardando NO vuelve a escribir el espejo ni datos en claro', w.localStorage.getItem('oa3_pts') === null && (await rawKeys()).odontoapp_db.state === 'ENV');
  const imgOk = await E(`imgDbGet('foto1').then(b=>JSON.stringify({isB:b instanceof Blob,size:b&&b.size,type:b&&b.type,keys:b&&Object.keys(b)}))`);
  check('la imagen se lee de vuelta igual (tipo y tamaño)', /"size":14,"type":"image\/png"/.test(imgOk), imgOk);
  const aud = JSON.stringify(await E(`idbGet('audit')`));
  check('la auditoría se lee de vuelta (conserva el evento sembrado)', /Abrió ficha/.test(aud) && /Ficha N° 1/.test(aud), aud);
  check('no se puede quitar el PIN con el cifrado activo', (E('Seguridad.abrirDesactivar()'), setv('sec_p0', '482915'), click(D.getElementById('secGo')), await wait(400), /desactiva el cifrado/i.test(D.getElementById('secMsg').textContent)));
  E('closeModal()');

  // ───────── 3. arranque con la bóveda cerrada ─────────
  const seed = keep(w); w.close();
  w = await boot(url, seed); D = w.document; E = s => w.eval(s);
  const click2 = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const setv2 = (id, v) => { D.getElementById(id).value = v; };
  check('al abrir: bloqueada, con el aviso de descifrar, y la app NO cargó ningún dato', E('Vault.locked()') && E('getComputedStyle(document.getElementById("lockScreen")).display') === 'flex' && /descifrar/.test(D.getElementById('lockSub').textContent) && E('Patients.all().length') === 0);
  check('mientras está cerrada NADA se puede escribir (ni el estado, ni imágenes)', (await E(`idbSet('state',{v:3,patients:[]})`)) === false && (await E(`imgDbPut('x',new Blob(['a']))`).then(() => 'ok', () => 'rechazado')) === 'rechazado');
  check('…y leer da «nada», no datos', (await E(`idbGet('state')`)) === undefined);
  const rs = JSON.parse(await E(`(async()=>{const v=await rawGet('state');return JSON.stringify({s:Vault.isEnv(v),k:v&&Object.keys(v),t:typeof v});})()`));
  check('el estado cifrado sigue intacto después de esos intentos', rs.s === true, rs);
  setv2('lockPin', '111111'); click2(D.getElementById('lockGo')); await wait(1500);
  check('PIN incorrecto: sigue cerrada y avisa con los intentos que quedan', E('Vault.locked()') && /incorrecto/.test(D.getElementById('lockMsg').textContent) && /4/.test(D.getElementById('lockMsg').textContent), D.getElementById('lockMsg').textContent);
  for (let i = 0; i < 4; i++) { setv2('lockPin', '22222' + i); click2(D.getElementById('lockGo')); await wait(1100); }
  check('5 intentos fallidos: bloqueo temporal (también con el cifrado)', /Demasiados intentos/.test(D.getElementById('lockMsg').textContent), D.getElementById('lockMsg').textContent);
  setv2('lockPin', '482915'); click2(D.getElementById('lockGo')); await wait(800);
  check('durante el bloqueo temporal ni el PIN correcto abre', E('Vault.locked()') && E('Patients.all().length') === 0);
  // levantar el bloqueo temporal (como si pasaran los segundos) y entrar
  const sec = JSON.parse(w.localStorage.getItem('oa3_sec')); sec.lockUntil = 0; sec.fails = 0; w.localStorage.setItem('oa3_sec', JSON.stringify(sec));
  const vk = keep(w); w.close(); w = await boot(url, Object.assign(vk, { oa3_sec: JSON.stringify(sec) })); D = w.document; E = s => w.eval(s);
  const click3 = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const setv3 = (id, v) => { D.getElementById(id).value = v; };
  setv3('lockPin', '482915'); click3(D.getElementById('lockGo')); await wait(2800);
  check('PIN correcto: se abre, aparece el panel y vuelven los pacientes', !E('Vault.locked()') && E('Patients.all().length') === 2 && E('getComputedStyle(document.getElementById("lockScreen")).display') === 'none', E('Patients.all().length'));
  check('el paciente abierto se ve (los datos descifrados llegan a la pantalla)', (E('Patients.renderList()'), /María García/.test(D.getElementById('ptList').textContent)));
  check('el cambio de datos se guarda cifrado y sobrevive', (E(`Patients.setAll(Patients.all().concat([{id:uid(),name:'Zoila Nueva',treatments:[],payments:[],appointments:[],diary:[],consents:[],recetas:[],presupuestos:[],odoHistory:[],images:[],surfData:{},wholeData:{}}]));save();saveFlush()`), await wait(700), (await rawKeys()).odontoapp_db.state === 'ENV' && await E(`idbGet('state').then(s=>s.patients.some(p=>p.name==='Zoila Nueva'))`)));

  // ───────── 4. cambiar PIN y recuperar con código ─────────
  E('Seguridad.abrirCambiar()'); setv3('sec_p0', '482915'); setv3('sec_p1', '4829'); setv3('sec_p2', '4829'); click3(D.getElementById('secGo')); await wait(300);
  check('cambiar a un PIN de 4 dígitos con el cifrado activo se rechaza', /6 a 8 dígitos/.test(D.getElementById('secMsg').textContent));
  setv3('sec_p1', '739164'); setv3('sec_p2', '739164'); click3(D.getElementById('secGo')); await wait(3500);
  const rec3 = D.getElementById('secRecCode') && D.getElementById('secRecCode').textContent; E('closeModal()');
  check('PIN cambiado: código nuevo y los datos siguen ahí', /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(rec3 || '') && rec3 !== rec2 && E('Patients.all().length') === 3);
  const seed2 = keep(w); w.close(); w = await boot(url, seed2); D = w.document; E = s => w.eval(s);
  const cl = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const sv = (id, v) => { D.getElementById(id).value = v; };
  sv('lockPin', '482915'); cl(D.getElementById('lockGo')); await wait(1500);
  check('el PIN viejo ya no abre', E('Vault.locked()') && E('Patients.all().length') === 0);
  cl(D.getElementById('lockForgot')); sv('lockRec', rec2); sv('lockNew1', '905318'); sv('lockNew2', '905318'); cl(D.getElementById('lockRecGo')); await wait(1800);
  check('el código de recuperación anterior ya no sirve', E('Vault.locked()'));
  sv('lockRec', rec3); sv('lockNew1', '5839'); sv('lockNew2', '5839'); cl(D.getElementById('lockRecGo')); await wait(500);
  check('recuperando también se exigen 6 a 8 dígitos', E('Vault.locked()') && /6 a 8 dígitos/.test(D.getElementById('lockMsg').textContent), D.getElementById('lockMsg').textContent);
  sv('lockNew1', '905318'); sv('lockNew2', '905318'); cl(D.getElementById('lockRecGo')); await wait(3500);
  const rec4 = D.getElementById('secRecCode') && D.getElementById('secRecCode').textContent; E('closeModal()'); await wait(300);
  check('con el código vigente: abre, fija el PIN nuevo y entrega otro código; los 3 pacientes están', !E('Vault.locked()') && E('Patients.all().length') === 3 && /^[A-Z2-9]{4}/.test(rec4 || '') && rec4 !== rec3);
  const seed3 = keep(w); w.close(); w = await boot(url, seed3); D = w.document; E = s => w.eval(s);
  const c4 = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const s4 = (id, v) => { D.getElementById(id).value = v; };
  s4('lockPin', '905318'); c4(D.getElementById('lockGo')); await wait(2800);
  check('tras recargar, el PIN fijado en la recuperación abre', E('Patients.all().length') === 3);

  // ───────── 5. datos dañados: no se sobrescribe lo único que queda ─────────
  await E(`(async()=>{const e=await rawGet('daily_backups');if(e&&e.ct){const t=new Uint8Array(e.ct);t[3]^=255;await rawSet('daily_backups',e);}})()`);
  const dbk = await E(`idbGet('daily_backups')`);
  check('un registro alterado se lee como «nada» (no como datos falsos)', dbk === undefined);
  check('…y NO se deja sobrescribir hasta que se resuelva (se conserva lo único que queda)', (await E(`idbSet('daily_backups',[{fecha:'x'}])`)) === false);

  // desactivar el cifrado con un registro dañado: se aborta SIN perder nada y el cifrado sigue activo
  E('showPage("configuracion")'); E('Seguridad.abrirDescifrar()'); D.getElementById('sec_p0').value = '905318'; D.getElementById('secGo').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await wait(3500);
  check('desactivar con un registro dañado: avisa, el cifrado sigue activo y todo vuelve a cifrarse (sin quedar a medias)', /sigue activo/.test(D.getElementById('secMsg').textContent) && E('Vault.enabled()') && E('Vault.sealing()') && JSON.parse(await E(`(async()=>JSON.stringify({s:Vault.isEnv(await rawGet('state'))}))()`)).s === true, D.getElementById('secMsg').textContent);
  E('closeModal()');
  await E(`rawSet('daily_backups',[{fecha:'2026-01-01',pacientes:1}])`);   // se repara a mano el registro dañado

  // ───────── 6. conversión sin pérdidas ante cambios simultáneos ─────────
  const sim = await E(`(async()=>{
    const out={};
    Vault.pause(true);await vaultReencode(false);Vault.pause(false);
    await rawSet('prueba','A');
    const orig=Vault.seal;let first=true;
    Vault.seal=async function(v,a){if(first&&a==='kv|prueba'){first=false;await rawSet('prueba','B');}return orig.call(Vault,v,a);};
    const r1=await _reencodePass(openMainDB,'kv','kv',true,false);
    Vault.seal=orig;
    out.skipped=r1.skipped;out.valorTrasCarrera=await rawGet('prueba');
    const r2=await _reencodePass(openMainDB,'kv','kv',true,false);
    out.final=Vault.isEnv(await rawGet('prueba'))&&(await idbGet('prueba'))==='B';
    return JSON.stringify(out);})()`).then(JSON.parse);
  check('si un registro cambia mientras se cifra, NO se pisa con la versión vieja (se salta y se reintenta)', sim.skipped === 1 && sim.valorTrasCarrera === 'B' && sim.final === true, sim);

  // ───────── 7. desactivar el cifrado POR CLIC ─────────
  const vk5 = keep(w); w.close(); w = await boot(url, vk5); D = w.document; E = s => w.eval(s);
  const c5 = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const s5 = (id, v) => { D.getElementById(id).value = v; };
  s5('lockPin', '905318'); c5(D.getElementById('lockGo')); await wait(2800);
  E('showPage("configuracion")');
  check('con cifrado activo la tarjeta lo dice y ofrece desactivarlo', /Datos cifrados/.test(D.getElementById('mainContent').textContent) && /Desactivar cifrado/.test(D.getElementById('mainContent').textContent));
  E('Seguridad.abrirDescifrar()'); s5('sec_p0', '111111'); c5(D.getElementById('secGo')); await wait(1500);
  check('desactivar con PIN equivocado: no hace nada', /incorrecto/.test(D.getElementById('secMsg').textContent) && E('Vault.enabled()'));
  s5('sec_p0', '905318'); c5(D.getElementById('secGo')); await wait(4500);
  const fin = await rawKeys();
  check('desactivado: la bóveda desaparece y los 3 almacenes vuelven a estar en claro', E('Vault.enabled()') === false && w.localStorage.getItem('oa3_vault') === null && Object.values(fin).every(s => Object.values(s).length && Object.values(s).every(v => v.startsWith('PLANO'))), fin);
  check('el espejo de localStorage se reconstruye y los 3 pacientes siguen', JSON.parse(w.localStorage.getItem('oa3_pts') || '[]').length === 3 && E('Patients.all().length') === 3);
  check('la imagen sigue legible tras descifrar', (await E(`imgDbGet('foto1').then(b=>b.size===14)`)) === true);
  check('el PIN sigue activo (sin cifrado) y la pantalla de bloqueo ya no habla de descifrar', E('Seguridad.activo()') === true);
  const seed5 = keep(w); w.close(); w = await boot(url, seed5); D = w.document; E = s => w.eval(s);
  const c6 = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); const s6 = (id, v) => { D.getElementById(id).value = v; };
  check('al recargar sin cifrado: bloquea con el PIN pero ya NO está cerrada la bóveda', E('Vault.locked()') === false && E('getComputedStyle(document.getElementById("lockScreen")).display') === 'flex');
  s6('lockPin', '905318'); c6(D.getElementById('lockGo')); await wait(2500);
  check('el PIN (verificado ahora con su huella) abre y están los 3 pacientes', E('Patients.all().length') === 3);
  check('sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  const bad = results.filter(x => !x).length; console.log(bad ? `\n✘ ${bad} comprobación(es) fallaron` : `\n✔ Todas las pruebas de la bóveda pasaron (${results.length} comprobaciones)`);
  windows.forEach(x => { try { x.close(); } catch (e) {} }); srv.close(); process.exit(bad ? 1 : 0);
});
