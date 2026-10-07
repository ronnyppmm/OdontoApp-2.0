// Prueba de humo: carga la app, siembra un paciente "malicioso" y verifica seguridad, migración, guardado y backup.
// Uso:  npm i  &&  npm test
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); });
});
const EVIL = `O'Brien "X" <img src=x onerror=window.__xss=1> \\`;
const results = []; const check = (name, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + name + (ok ? '' : '  ' + extra)); };
const wait = ms => new Promise(r => setTimeout(r, ms));

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  const errs = []; const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 160)); });
  const hoy = new Date().toISOString().slice(0, 10);
  const dom = await JSDOM.fromURL(url, {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.__alerts = 0;
      w.alert = () => { w.__alerts++; }; w.confirm = () => true;
      // paciente viejo (sin listas) con datos hostiles, para probar migración y escapado
      w.localStorage.setItem('oa3_pts', JSON.stringify([{ id: 1, name: EVIL, phone: "0999'); window.__xss=1; ('" }]));
    }
  });
  const w = dom.window; await wait(2500);
  console.log('\nOdontoApp — prueba de humo');
  check('carga sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  check('migración: el paciente viejo ahora tiene sus listas', w.eval("Array.isArray(patients[0].appointments)&&Array.isArray(patients[0].payments)&&Array.isArray(patients[0].diary)"));
  check('datos migrados a la versión actual', (await w.eval("idbGet('state')")).v === w.eval('DATA_VERSION'));

  w.eval(`patients[0].appointments.push({id:uid(),reason:${JSON.stringify(EVIL)},date:today(),time:'09:00',status:'pendiente'})`);
  w.eval('renderSidebar()'); w.eval('selectPt(patients[0].id)');
  for (const t of ['datos', 'diario', 'odontograma', 'tratamientos', 'pagos', 'citas', 'imagenes', 'consentimientos']) { try { w.switchTab(t, w.document.createElement('div')); } catch (e) { errs.push('tab ' + t + ': ' + e.message); } }
  for (const p of ['agenda', 'estadisticas', 'recetas', 'presupuestos', 'configuracion', 'dashboard']) { try { w.showPage(p); } catch (e) { errs.push('page ' + p + ': ' + e.message); } }
  check('recorrer pestañas y páginas sin errores', errs.length === 0, errs.join(' | '));
  check('XSS: ningún <img onerror> se inyectó en el DOM', w.document.querySelectorAll('[onerror]').length === 0);
  check('XSS: el script del paciente no se ejecutó', w.__xss === undefined);
  check('el nombre hostil se muestra como texto', w.document.body.textContent.includes('O\'Brien "X"'));
  check('jsq() escapa comillas y barras', w.jsq(`a'b"c\\d`) === `a\\&#39;b&quot;c\\\\d`);

  const ids = new Set(); for (let i = 0; i < 5000; i++) ids.add(w.uid());
  check('uid(): 5000 IDs únicos', ids.size === 5000);

  w.eval("patients[0].name='Guardado con debounce'"); w.eval('save()');
  check('save() es diferido (no escribe al instante)', (await w.eval("idbGet('state')")).patients[0].name !== 'Guardado con debounce');
  await wait(700);
  check('save() escribe tras ~300 ms', (await w.eval("idbGet('state')")).patients[0].name === 'Guardado con debounce');

  w.localStorage.removeItem('oa3_lastbackup'); await w.eval('verificarBackupDiario()');
  const lista = await w.eval('listarBackupsLocales()');
  check('backup diario crea una copia local', lista.length === 1 && lista[0].fecha === w.eval('today()'), JSON.stringify(lista));
  await w.eval('verificarBackupDiario()');
  check('backup diario no se repite el mismo día', (await w.eval('listarBackupsLocales()')).length === 1);

  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas pasaron'); process.exit(fail ? 1 : 0);
});
