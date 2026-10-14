// Respaldos (Backup): leer cualquier formato, importar/deshacer, copias locales, historial en la nube, correo y borrado de fábrica. Todo por CLIC.
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
const errs = [], alerts = [], asked = []; let confirmAns = true, lastInput = null, lastBlob = null, opened = [];
async function boot(url, seedLS = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {};
      w.alert = m => alerts.push(String(m)); w.confirm = m => { asked.push(String(m)); return confirmAns; };
      w.open = u => { opened.push(String(u)); return null; };
      w.URL.createObjectURL = b => { lastBlob = b; return 'blob:x'; }; w.URL.revokeObjectURL = () => {};
      const oc = w.HTMLInputElement.prototype.click; w.HTMLInputElement.prototype.click = function () { if (this.type === 'file') lastInput = this; else oc.call(this); };
      w.TextEncoder = TextEncoder; Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
      for (const [k, v] of Object.entries(seedLS)) w.localStorage.setItem(k, v);
    } });
  await wait(2200); return dom.window;
}
let W = null; const blobText = b => new Promise(ok => { const r = new W.FileReader(); r.onload = () => ok(r.result); r.readAsText(b); });

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — Respaldos (formatos, importar/deshacer, copias locales, historial, correo, borrado)');
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const pts = [{ id: 1, name: 'Ana Prueba', recetas: [{ id: 7 }], presupuestos: [{ id: 3 }] }, { id: 2, name: 'Beto Prueba' }];
  let w = await boot(url, { oa3_pts: JSON.stringify(pts) });
  W = w; let D = w.document; const E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const act = (name, sel = '') => D.querySelector(`[data-action="${name}"]${sel}`);
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalHTML = () => (D.getElementById('modalContent') || {}).innerHTML || '';
  const lastAlert = () => alerts[alerts.length - 1] || '';
  const pickFile = async (text, name = 'r.json') => { const f = new w.File([text], name, { type: 'application/json' }); Object.defineProperty(lastInput, 'files', { value: [f], configurable: true }); lastInput.dispatchEvent(new w.Event('change')); await wait(500); };

  // ───────── 1. estructura ─────────
  const strip = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  check('backup.js no tiene handlers inline', !/\son(click|input|change|keydown)\s*=/i.test(strip('js/backup.js')));
  check('core.js ya no contiene las funciones de respaldo/importación', !/function (exportarDatos|importarDatos|restaurarDesdeHistorial|mostrarHistorialRespaldos|crearBackupHistorico|sbLoadNow)\b/.test(read('js/core.js')) && !/\sonclick="/.test(read('js/core.js').replace(/\/\/.*\n/g,'')));
  check('sw.js precachea backup.js', /\.\/js\/backup\.js/.test(read('sw.js')));
  check('la app arrancó con los 2 pacientes de prueba', E('Patients.all().length') === 2);

  // ───────── 2. normalize: todos los formatos y entradas dañadas ─────────
  const N = o => E('Backup.normalize(' + JSON.stringify(o) + ')');
  check('rechaza null, texto, lista y objeto sin pacientes', [null, 'x', [], {}, { patients: 'a' }, { patients: {} }].every(x => !N(x).ok));
  const nExp = N({ patients: [{ id: 1, name: 'A' }], clinica: { clinicaNombre: 'Clínica Sonrisa', profesional: 'Dr. Ronny', ruc: '1790012345001', logoColor: '#aa11bb' }, meds: ['Ibuprofeno 400mg', 'ibuprofeno 400mg', '  ', 'Amoxi'], nextId: 9 });
  check('formato de archivo: clínica, color, medicamentos sin repetidos y contador', nExp.ok && nExp.data.clinic.nombre === 'Clínica Sonrisa' && nExp.data.clinic.color === '#aa11bb' && nExp.data.meds.length === 2 && nExp.data.counters.nextId === 9, JSON.stringify(nExp).slice(0, 200));
  const nOld = N({ patients: [{ id: 1, name: 'A' }], clinica: { nombre: 'Vieja', logoColor: '#112233', logoImg: null } });
  check('formato de la nube antigua (clinica.nombre)', nOld.ok && nOld.data.clinic.nombre === 'Vieja');
  const nDay = N({ patients: [{ id: 1, name: 'A' }], logo: { text: 'Diaria', prof: 'Dra. X', color: '#334455', ruc: '1', dir: 'Calle', tel: '09' } });
  check('formato de copia diaria (logo.text/prof/color)', nDay.ok && nDay.data.clinic.nombre === 'Diaria' && nDay.data.clinic.profesional === 'Dra. X' && nDay.data.clinic.color === '#334455');
  const nBad = N({ patients: [{ id: 1, name: 'A' }, null, 5, { id: 1, name: 'Repetido' }, { id: 3 }], egresos: [null, { id: 4, monto: 5 }, 'x'], clinica: { logoColor: 'red;}</style>', logoImg: 'javascript:alert(1)' } });
  check('descarta registros que no son objetos, arregla ids repetidos y pacientes sin nombre, y avisa', nBad.ok && nBad.data.patients.length === 3 && new Set(nBad.data.patients.map(p => String(p.id))).size === 3 && nBad.data.patients.some(p => p.name === '(sin nombre)') && nBad.data.egresos.length === 1 && nBad.warnings.length >= 3, JSON.stringify(nBad.warnings));
  check('color y logo peligrosos se ignoran (no se aplican)', nBad.data.clinic.color === null && nBad.data.clinic.img === null);
  check('una sección que no es lista invalida el respaldo con mensaje claro', /dañada/.test(N({ patients: [], facturas: 'x' }).error || ''));
  const nCnt = N({ patients: [{ id: 50, name: 'A', recetas: [{ id: 80 }], presupuestos: [{ id: 12 }] }, { id: 1.7e15, name: 'Grande' }], egresos: [{ id: 30 }], facturas: [{ id: 40 }], nextId: 2, nextEgId: 1, nextFactId: 1, nextRecetaId: 1 });
  check('los contadores nunca quedan por debajo de lo existente (ANTES se repetían números)', nCnt.data.counters.nextId === 51 && nCnt.data.counters.nextEgId === 31 && nCnt.data.counters.nextFactId === 41 && nCnt.data.counters.nextRecetaId === 81 && nCnt.data.counters.nextPresupId === 13, JSON.stringify(nCnt.data.counters));

  // ───────── 3. exportar ─────────
  E("Logo.applyColor('#123456'); logoColor='#123456'; MEDICAMENTOS_COMUNES.push('Medicina nueva 5mg'); document.getElementById('logoText').textContent='Clínica Test'");
  click(act('backup.email')); await wait(100);
  check('«⬇ Backup» abre el modal de respaldo con aviso de que aún no hay archivo', /Respaldo de tus datos/.test(modal()) && /Todavía no has descargado/.test(modal()));
  click(act('backup.download')); await wait(200);
  const exp = JSON.parse(await blobText(lastBlob));
  check('el archivo incluye pacientes, logo/color y medicamentos (ANTES se perdían)', exp.patients.length === 2 && exp.clinica.logoColor === '#123456' && exp.meds.includes('Medicina nueva 5mg') && exp.clinica.clinicaNombre === 'Clínica Test' && exp.nextRecetaId >= 1);
  check('queda anotado el último respaldo en archivo', !!w.localStorage.getItem('oa3_last_export'));

  // ───────── 4. importar por archivo ─────────
  E("Backup.importUI()"); check('«Importar» abre el selector de archivos', !!lastInput && lastInput.type === 'file');
  const before = E('Patients.all().length'); asked.length = 0; alerts.length = 0;
  await pickFile('esto no es json'); check('un archivo que no es JSON se rechaza con mensaje, sin tocar nada', /no es un respaldo válido/.test(lastAlert()) && E('Patients.all().length') === before && !asked.length, lastAlert());
  E("Backup.importUI()"); await pickFile(JSON.stringify({ hola: 1 })); check('un JSON sin pacientes se rechaza (ANTES decía «undefined paciente(s)»)', /no tiene la lista de pacientes/.test(lastAlert()) && E('Patients.all().length') === before);
  E("Backup.importUI()"); await pickFile(JSON.stringify({ patients: 'x' })); check('«Patients.all()» que no es lista se rechaza', E('Patients.all().length') === before);
  const good = { fechaExportacion: '2026-03-01T10:00:00Z', clinica: { clinicaNombre: 'Importada SA', profesional: 'Dr. Import', logoColor: '#0a0b0c' }, patients: [{ id: 1, name: 'Zoe Importada', recetas: [{ id: 21 }] }, { id: 2, name: 'Yago Importado' }, { id: 3, name: 'Xena' }], egresos: [{ id: 5, monto: 10.456 }], facturas: [], meds: ['Solo esta 1mg'], nextId: 1 };
  confirmAns = false; asked.length = 0; E("Backup.importUI()"); await pickFile(JSON.stringify(good));
  check('pregunta con los números REALES del archivo y, si dices que no, no cambia nada', asked.length === 1 && /3 paciente\(s\), 1 egreso\(s\)/.test(asked[0]) && E('Patients.all().length') === before && E("idbGet('pre_restore')") !== undefined, asked[0]);
  confirmAns = true; asked.length = 0; alerts.length = 0; E("Backup.importUI()"); await pickFile(JSON.stringify(good));
  check('al aceptar: datos, clínica y medicamentos reemplazados', E('Patients.all().length') === 3 && D.getElementById('logoText').textContent === 'Importada SA' && E('MEDICAMENTOS_COMUNES.length') === 1 && /Importación exitosa/.test(lastAlert()), lastAlert());
  check('…el contador de recetas queda por encima de la receta 21 y el monto con 2 decimales', E('nextRecetaId') > 21 && E('egresos[0].monto') === 10.46, E('nextRecetaId') + ' ' + E('egresos[0].monto'));
  check('…y se guardó una copia de lo anterior', (await E("idbGet('pre_restore')")).pacientes === before);
  await wait(900); check('lo importado se guarda de verdad (sobrevive a recargar)', (await E("idbGet('state')")).patients.length === 3 && (await E("idbGet('state')")).patients[0].name === 'Zoe Importada');
  // deshacer
  click(act('backup.email')); await wait(300);
  check('el modal ofrece «Deshacer» con los pacientes que había', !!act('backup.undo') && new RegExp('había <b>' + before + '</b>').test(modalHTML()) || /Antes de la última restauración/.test(modal()));
  asked.length = 0; click(act('backup.undo')); await wait(500);
  check('«Deshacer» devuelve el estado anterior (Ana y Beto)', E('Patients.all().length') === before && E('Patients.all()[0].name') === 'Ana Prueba' && D.getElementById('logoText').textContent === 'Clínica Test', E('Patients.all().length'));
  check('…y deshacer es reversible (guarda lo que había)', (await E("idbGet('pre_restore')")).pacientes === 3);

  // ───────── 5. copias automáticas locales ─────────
  const day = { fecha: '2026-10-01', pacientes: 3, t: 1, data: { patients: [{ id: 1, name: 'Copia Uno' }, { id: 2, name: 'Copia Dos' }, { id: 3, name: 'Copia Tres' }] } };
  const dayBad = { fecha: '2026-10-02', pacientes: 9, t: 2, data: { nada: true } };
  await E(`idbSet('daily_backups', ${JSON.stringify([day, dayBad])})`);
  E("Backup.openMain()"); await wait(500);
  check('lista las copias locales con «Descargar» y «Restaurar» (ANTES no había forma de usarlas)', D.querySelectorAll('[data-action="backup.restoreLocal"]').length === 2 && /2026-10-01/.test(D.getElementById('bk-local').textContent));
  alerts.length = 0; click(act('backup.downloadLocal', '[data-fecha="2026-10-01"]')); await wait(300);
  check('descargar una copia entrega su JSON', JSON.parse(await blobText(lastBlob)).patients.length === 3);
  click(act('backup.restoreLocal', '[data-fecha="2026-10-02"]')); await wait(400);
  check('una copia dañada no se restaura y lo dice', /dañada/.test(lastAlert()) && E('Patients.all().length') === before, lastAlert());
  E("Backup.openMain()"); await wait(400); asked.length = 0;
  click(act('backup.restoreLocal', '[data-fecha="2026-10-01"]')); await wait(500);
  check('restaurar una copia buena pregunta, reemplaza y cierra el modal', asked.length === 1 && E('Patients.all().length') === 3 && E('Patients.all()[0].name') === 'Copia Uno' && !D.getElementById('modalOverlay').classList.contains('show'), asked[0]);

  // ───────── 6. correo ─────────
  E("Backup.openMain()"); await wait(200); opened.length = 0; alerts.length = 0;
  D.getElementById('f_email_backup').value = 'mal&bcc=x@y.com'; click(act('backup.mailto'));
  check('un correo con caracteres de inyección se rechaza (ANTES se pegaba en el enlace)', /no parece válido/.test(lastAlert()) && !opened.length, lastAlert());
  D.getElementById('f_email_backup').value = 'dr@clinica.com'; click(act('backup.mailto')); await wait(200);
  check('con correo válido abre el cliente de correo y descarga el archivo', opened.length === 1 && /^mailto:dr@clinica\.com\?subject=/.test(opened[0]));
  E("closeModal()");

  // ───────── 7. historial en la nube ─────────
  alerts.length = 0; E("Backup.openHistory()");
  check('sin nube conectada pide conectar (no falla)', /conectar Supabase/.test(lastAlert()));
  const hostile = '<img src=x onerror="window.__pwn=1">';
  E(`window.__rows=[{id:'b1',version:${JSON.stringify(hostile)},nota:${JSON.stringify(hostile + '\'");alert(1);//')},size_bytes:2048,created_at:'2026-05-01T10:00:00Z'},{id:'b2',version:'2026-04-01',nota:'Normal',size_bytes:1024,created_at:'2026-04-01T10:00:00Z'}];
   window.__bk={ins:[],del:[]};
   sbClinicaId='c1'; sbClient={from(t){const q={t,f:{}};const b={select(){return b},eq(k,v){q.f[k]=v;return b},order(){return b},insert(p){window.__bk.ins.push(p);return Promise.resolve({error:null})},delete(){return {in(k,ids){window.__bk.del.push(ids);return Promise.resolve({error:null})}}},single(){const r=window.__rows.find(x=>x.id===q.f.id);return Promise.resolve(r?{data:{backup_data:r.data},error:null}:{error:{message:'no'}})},then(a,c){return Promise.resolve({data:window.__rows,error:null}).then(a,c)}};return b}}`);
  E("window.__rows[1].data={patients:[{id:1,name:'Desde Nube'}],facturas:[]}");
  E("Backup.openHistory()"); await wait(300);
  check('el historial muestra notas hostiles como TEXTO (ANTES se inyectaba HTML)', !w.__pwn && !D.querySelector('#modalContent img') && /<img/.test(modal()), modalHTML().slice(0, 200));
  check('cada fila tiene su botón «Restaurar» por data-action (sin onclick)', D.querySelectorAll('[data-action="backup.restoreCloud"]').length === 2 && !/onclick/.test(modalHTML()));
  asked.length = 0; click(act('backup.restoreCloud', '[data-id="b2"]')); await wait(600);
  check('restaurar desde la nube pregunta con la fecha y reemplaza', asked.length === 1 && /1 paciente\(s\)/.test(asked[0]) && E('Patients.all()[0].name') === 'Desde Nube', asked[0]);
  check('…y el aviso menciona que hay copia previa para deshacer', /para poder deshacerlo/.test(asked[0]));
  alerts.length = 0; asked.length = 0; E("window.__rows[0].data={algo:1}"); E("Backup.openHistory()"); await wait(300); click(act('backup.restoreCloud', '[data-id="b1"]')); await wait(400);
  check('un respaldo dañado en la nube no se restaura', /dañado/.test(lastAlert()) && E('Patients.all()[0].name') === 'Desde Nube', lastAlert());
  // crear punto
  E("window.__rows=Array.from({length:17},(_,i)=>({id:'r'+i}))"); alerts.length = 0;
  E("Backup.createCloud('  Antes   de la cirugía  ')"); await wait(400);
  const ins = E("window.__bk.ins[0]");
  check('crear punto de restauración guarda nota limpia y foto completa', ins && ins.nota === 'Antes de la cirugía' && ins.backup_data.patients.length === 1 && ins.size_bytes > 0 && /creado/.test(lastAlert()), JSON.stringify(ins).slice(0, 150));
  check('conserva solo los 15 más recientes (borra los 2 sobrantes)', JSON.stringify(E("window.__bk.del")) === '[["r15","r16"]]', JSON.stringify(E("window.__bk.del")));
  check('la nota se limita a 80 caracteres', E("Backup.checkNote('x'.repeat(200))").length === 80 && E("Backup.checkNote('')") === 'Respaldo manual');
  E("sbClient=null");

  // ───────── 8. nube antigua ─────────
  alerts.length = 0; const oldR = E("Backup.importOldCloud()"); check('sin nube conectada no hace nada ni falla', (await oldR).ok === false);

  // ───────── 9. restablecer de fábrica borra también las copias ─────────
  await E(`idbSet('daily_backups',[{fecha:'2026-10-03',pacientes:1,t:3,data:{patients:[{id:1,name:'Secreto'}]}}])`);
  await E(`imgDbPut('img1', new Blob(['x']))`);
  check('antes de borrar hay copias, copia previa e imagen original', (await E("idbGet('daily_backups')")).length === 1 && !!(await E("idbGet('pre_restore')")) && !!(await E("imgDbGet('img1')")));
  confirmAns = true; E("factoryReset()"); await wait(700);
  check('restablecer borra copias diarias, copia previa e imágenes originales (ANTES los datos del paciente seguían guardados)', (await E("idbGet('daily_backups')")).length === 0 && !(await E("idbGet('pre_restore')")) && !(await E("imgDbGet('img1')")));

  // ───────── 10. el registro de actividad anota respaldos ─────────
  await w.Seguridad._flush(); const au = await E("idbGet('audit')") || [];
  check('el registro de actividad anota la exportación, importación y restauraciones', ['Exportó respaldo completo', 'Importó respaldo desde archivo', 'Restauró copia local', 'Restauró respaldo de la nube', 'Deshizo la última restauración'].every(ev => au.some(a => a.ev === ev || a.evento === ev || JSON.stringify(a).includes(ev))), JSON.stringify(au.map(a => a.ev || a.evento)).slice(0, 300));
  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  const bad = results.filter(x => !x).length; console.log(bad ? `\n✘ ${bad} comprobación(es) fallaron` : `\n✔ Todas las pruebas de Respaldos pasaron (${results.length} comprobaciones)`);
  srv.close(); process.exit(bad ? 1 : 0);
});
