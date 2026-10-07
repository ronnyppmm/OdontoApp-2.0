// Pruebas del módulo de seguridad: PIN, bloqueo, recuperación y registro de actividad.
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
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + extra)); };
const errs = [];
async function boot(url, seedLS = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 160)); });
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true;
      w.TextEncoder = TextEncoder; Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
      for (const [k, v] of Object.entries(seedLS)) w.localStorage.setItem(k, v);
    } });
  await wait(2200); return dom.window;
}
const setv = (w, id, v) => { w.document.getElementById(id).value = v; };
const visible = (w, id) => { const e = w.document.getElementById(id); return !!e && e.style.display !== 'none'; };
const audit = async w => { await w.Seguridad._flush(); return await w.eval("idbGet('audit')") || []; };

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — seguridad (PIN, bloqueo, auditoría)');
  let w = await boot(url, { oa3_pts: JSON.stringify([{ id: 1, name: 'Ana Prueba' }]) });
  check('sin PIN: la app abre normal y no hay pantalla de bloqueo', !w.document.getElementById('lockScreen'));
  check('la tarjeta de Seguridad aparece en Configuración', w.eval('renderConfiguracion()').includes('Seguridad y acceso'));

  // —— activar PIN ——
  w.Seguridad.abrirActivar(); setv(w, 'sec_p1', '1111'); setv(w, 'sec_p2', '1111'); await w.Seguridad.guardarActivar();
  check('PIN débil (1111) es rechazado', !w.Seguridad.activo() && /obvio/.test(w.document.getElementById('secMsg').textContent));
  setv(w, 'sec_p1', '4821'); setv(w, 'sec_p2', '4821'); await w.Seguridad.guardarActivar();
  const code = w.document.getElementById('secRecCode') && w.document.getElementById('secRecCode').textContent;
  check('PIN activado y se muestra un código de recuperación', w.Seguridad.activo() && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(code), code);
  const raw = w.localStorage.getItem('oa3_sec');
  check('el PIN y el código NO se guardan en texto plano', !raw.includes('4821') && !raw.includes(code.replace(/-/g, '')) && JSON.parse(raw).hash.length > 20);
  const cfg1 = JSON.parse(raw);

  // —— bloqueo y desbloqueo ——
  w.Seguridad.bloquear();
  check('bloquear() muestra la pantalla de bloqueo', visible(w, 'lockScreen') && w.document.body.classList.contains('app-locked'));
  setv(w, 'lockPin', '0000'); w.document.getElementById('lockGo').click(); await wait(500);
  check('PIN incorrecto: mensaje y sigue bloqueado', /incorrecto/i.test(w.document.getElementById('lockMsg').textContent) && w.Seguridad._estado().locked);
  setv(w, 'lockPin', '4821'); w.document.getElementById('lockGo').click(); await wait(500);
  check('PIN correcto desbloquea', !w.Seguridad._estado().locked && !visible(w, 'lockScreen'));

  // —— atajos bloqueados mientras está bloqueado ——
  w.Seguridad.bloquear(); let llego = false; w.document.addEventListener('keydown', () => { llego = true; });
  w.document.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  check('bloqueado: los atajos de teclado no llegan a la app', llego === false);

  // —— bloqueo tras 5 fallos (persistente) ——
  for (let i = 0; i < 5; i++) { setv(w, 'lockPin', '9999'); w.document.getElementById('lockGo').click(); await wait(350); }
  setv(w, 'lockPin', '4821'); w.document.getElementById('lockGo').click(); await wait(400);
  check('tras 5 fallos, ni el PIN correcto entra (bloqueo temporal)', w.Seguridad._estado().locked && /Espera/.test(w.document.getElementById('lockMsg').textContent));

  // —— recuperación con código ——
  const _now = w.Date.now; w.Date.now = () => _now.call(w.Date) + 120000; // pasan 2 minutos: termina el bloqueo temporal
  w.document.getElementById('lockForgot').click();
  setv(w, 'lockRec', 'AAAA-AAAA-AAAA-AAAA'); setv(w, 'lockNew1', '7359'); setv(w, 'lockNew2', '7359'); w.document.getElementById('lockRecGo').click(); await wait(500);
  check('código de recuperación incorrecto no restablece', w.Seguridad._estado().locked);
  setv(w, 'lockRec', code.toLowerCase()); setv(w, 'lockNew1', '7359'); setv(w, 'lockNew2', '7359'); w.document.getElementById('lockRecGo').click(); await wait(700);
  const nuevoCode = w.document.getElementById('secRecCode') && w.document.getElementById('secRecCode').textContent;
  check('código correcto: restablece el PIN, desbloquea y entrega código nuevo', !w.Seguridad._estado().locked && nuevoCode && nuevoCode !== code, nuevoCode);
  w.Date.now = _now;
  const cfg2 = JSON.parse(w.localStorage.getItem('oa3_sec'));
  check('el PIN y el código anteriores dejan de servir', cfg2.hash !== cfg1.hash && cfg2.recHash !== cfg1.recHash);
  w.closeModal();

  // —— auditoría ——
  w.eval("selectPt(patients[0].id)"); await wait(50);
  w.openNewPt(); setv(w, 'f_name', ''); w.saveNewPt();
  w.openNewPt(); setv(w, 'f_name', 'Paciente Nuevo'); w.saveNewPt(); await wait(500);
  let log = await audit(w); const ev = e => log.filter(x => x.ev === e);
  check('registra: PIN activado, PIN incorrecto, acceso, bloqueo', ['PIN activado', 'PIN incorrecto', 'Acceso', 'Bloqueo', 'PIN restablecido'].every(e => ev(e).length > 0));
  check('registra: "Abrió ficha" con el nombre del paciente', ev('Abrió ficha').some(x => x.det === 'Ana Prueba'));
  check('registra "Creó paciente" solo cuando realmente se creó', ev('Creó paciente').length === 1 && ev('Creó paciente')[0].det === 'Paciente Nuevo', JSON.stringify(ev('Creó paciente')));
  check('el registro nunca contiene el PIN', !JSON.stringify(log).includes('4821') && !JSON.stringify(log).includes('7359'));

  // delete cancelado no se registra
  w.confirm = () => false; w.eval("curPt=patients[0]");
  const antes = ev('Eliminó paciente').length; w.confirm = () => true;
  w.eval("curPt=patients.find(p=>p.name==='Paciente Nuevo')"); w.confirmDeletePt(); await wait(500);
  log = await audit(w);
  check('registra "Eliminó paciente" al confirmar', log.filter(x => x.ev === 'Eliminó paciente').length === antes + 1);

  // CSV
  let csv = ''; const A = w.URL.createObjectURL; w.URL.createObjectURL = b => { b.text().then(t => csv = t); return 'blob:x'; };
  w.HTMLAnchorElement.prototype.click = function () {}; await w.Seguridad.descargarRegistro(); await wait(200);
  check('el CSV del registro se genera con encabezados', csv.includes('Fecha,Evento,Detalle') && csv.includes('Abrió ficha'));
  await w.Seguridad.verRegistro();
  check('el visor del registro muestra los eventos', w.document.getElementById('modalContent').textContent.includes('Abrió ficha'));
  w.closeModal();

  // —— persistencia: recargar con PIN activo ——
  const ls = { oa3_sec: w.localStorage.getItem('oa3_sec'), oa3_pts: w.localStorage.getItem('oa3_pts') };
  w.close();
  const w2 = await boot(url, ls);
  check('al recargar con PIN activo, arranca bloqueado', visible(w2, 'lockScreen') && w2.Seguridad._estado().locked);
  check('mientras está bloqueado aparece el botón 🔒 solo con PIN activo (barra superior)', !!w2.document.getElementById('lockBtn'));
  setv(w2, 'lockPin', '7359'); w2.document.getElementById('lockGo').click(); await wait(500);
  check('el PIN nuevo abre la app tras recargar', !w2.Seguridad._estado().locked);

  const ls2 = { oa3_sec: w2.localStorage.getItem('oa3_sec'), oa3_pts: w2.localStorage.getItem('oa3_pts') };
  // desactivar
  w2.Seguridad.abrirDesactivar(); setv(w2, 'sec_p0', '1234'); await w2.Seguridad.guardarDesactivar();
  check('desactivar con PIN incorrecto no funciona', w2.Seguridad.activo());
  setv(w2, 'sec_p0', '7359'); await w2.Seguridad.guardarDesactivar();
  check('desactivar con PIN correcto quita el bloqueo', !w2.Seguridad.activo() && !w2.localStorage.getItem('oa3_sec'));

  w2.close();

  // —— "No tengo el código": solo borra si se escribe BORRAR ——
  const w3 = await boot(url, ls2);
  w3.document.getElementById('lockForgot').click();
  setv(w3, 'lockWipe', 'no'); w3.document.getElementById('lockWipeGo').click(); await wait(200);
  check('borrar datos sin escribir BORRAR no hace nada', !!w3.localStorage.getItem('oa3_pts') && !!w3.localStorage.getItem('oa3_sec'));
  setv(w3, 'lockWipe', 'borrar'); w3.document.getElementById('lockWipeGo').click(); await wait(400);
  check('escribiendo BORRAR se limpian los datos locales', !w3.localStorage.getItem('oa3_pts') && !w3.localStorage.getItem('oa3_sec'));
  check('el borrado queda anotado en el registro de actividad', (await w3.eval("idbGet('audit')")||[]).some(x => x.ev === 'Borrado de datos locales'));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w3.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de seguridad pasaron'); process.exit(fail ? 1 : 0);
});
