// Seguridad por CLIC: tarjeta de Configuración, modales del PIN, pantalla de bloqueo, recuperación, auditoría y robustez.
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
    beforeParse(w) { if(!w.Blob.prototype.text){w.Blob.prototype.text=function(){return new Promise((ok,ko)=>{const r=new w.FileReader();r.onload=()=>ok(r.result);r.onerror=ko;r.readAsText(this)})}}; 
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
  console.log('\nOdontoApp — seguridad por clic (tarjeta, modales, bloqueo, recuperación, registro)');
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const strip = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  let w = await boot(url, { oa3_pts: JSON.stringify([{ id: 1, name: 'Ana Prueba' }]) });
  let D = w.document; const E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const act = (name, sel = '') => D.querySelector(`[data-action="${name}"]${sel}`);
  const key = (id, k) => D.getElementById(id).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const msg = () => (D.getElementById('secMsg') || {}).textContent || '';
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const go = async (name, ms = 500) => { click(act(name)); await wait(ms); };
  const lsec = () => JSON.parse(w.localStorage.getItem('oa3_sec') || 'null');
  const openCfg = () => { E("showPage('configuracion')"); };

  // ───────── 1. estructura ─────────
  check('security.js ya no contiene ningún handler inline ni addEventListener de clic', !/\son(click|input|change|keydown)\s*=/i.test(strip('js/security.js')) && !/addEventListener\('(click)'/.test(strip('js/security.js')));
  check('con PIN desactivado, la tarjeta ofrece «Activar PIN» y avisa del riesgo', (openCfg(), !!act('security.openActivate') && /PIN desactivado/.test(D.getElementById('mainContent').textContent) && !act('security.openChange')));

  // ───────── 2. activar el PIN ─────────
  click(act('security.openActivate')); check('«Activar PIN» abre el modal con dos campos', modalOpen() && !!D.getElementById('sec_p1') && !!D.getElementById('sec_p2'));
  const fill = (p1, p2, p0) => { if (p0 !== undefined) D.getElementById('sec_p0').value = p0; D.getElementById('sec_p1').value = p1; D.getElementById('sec_p2').value = p2; };
  fill('12', '12'); await go('security.saveActivate', 150); check('PIN de 2 dígitos: error claro, nada guardado', /4 a 8 dígitos/.test(msg()) && !lsec());
  fill('12a4', '12a4'); await go('security.saveActivate', 150); check('PIN con letras: error', /4 a 8 dígitos/.test(msg()) && !lsec());
  fill('4821', '4822'); await go('security.saveActivate', 150); check('PIN y repetición distintos: error', /no coinciden/.test(msg()) && !lsec());
  for (const weak of ['1111', '1234', '9876', '1212', '121212', '2580', '0000']) { fill(weak, weak); await go('security.saveActivate', 120); if (!/obvio/.test(msg()) || lsec()) { check('PIN débil «' + weak + '» rechazado', false, msg()); } }
  check('PIN débiles (repetidos, consecutivos, de pares repetidos y muy comunes como 2580) se rechazan', !lsec() && /obvio/.test(msg()));
  fill('4821', '4821'); key('sec_p2', 'Enter'); await wait(600);
  const code = (D.getElementById('secRecCode') || {}).textContent;
  check('Enter en el campo activa el PIN y muestra el código de recuperación', !!lsec() && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(code || ''), code);
  // copiar
  let copied = null; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async t => { copied = t; } }, configurable: true });
  await go('security.copyCode', 100); check('«Copiar» copia el código y confirma con «✓ Copiado»', copied === code && /Copiado/.test(D.getElementById('secCopyMsg').textContent), copied);
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denegado'); } }, configurable: true });
  await go('security.copyCode', 100); check('si el navegador no deja copiar, lo dice (ANTES fallaba en silencio)', /a mano/.test(D.getElementById('secCopyMsg').textContent));
  click(act('security.codeSaved')); await wait(100); check('«Ya lo guardé» cierra y la tarjeta pasa a «PIN activo»', !modalOpen() && /PIN activo/.test(D.getElementById('mainContent').textContent) && !!act('security.openChange') && !!act('security.openDisable') && !!act('security.lock'));
  check('el botón 🔒 de la barra superior aparece y también va por data-action', !!D.getElementById('lockBtn') && D.getElementById('lockBtn').getAttribute('data-action') === 'security.lock');
  const rawA = w.localStorage.getItem('oa3_sec'); check('el PIN y el código no están en texto plano', !rawA.includes('4821') && !rawA.includes(code.replace(/-/g, '')));
  E("Seguridad.abrirActivar()"); fill('7359', '7359'); await go('security.saveActivate', 200); check('…y lo explica en vez de reescribir el PIN', /Ya hay un PIN activo/.test(msg()) && lsec().hash === JSON.parse(rawA).hash, msg()); click(act('app.closeModal'));

  // ───────── 3. bloqueo automático ─────────
  openCfg(); const sel = D.querySelector('select[data-on-change="security.setAuto"]');
  sel.value = '5'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); check('el selector de bloqueo automático guarda 5 minutos', lsec().autoMin === 5);
  sel.value = '0'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); check('…y «Nunca» (0)', lsec().autoMin === 0);
  E("Seguridad.setAuto(7)"); E("Seguridad.setAuto('x')"); E("Seguridad.setAuto(-5)"); check('valores raros (7, «x», -5) se ignoran: antes «x» desactivaba el bloqueo sin avisar', lsec().autoMin === 0);
  E("Seguridad.setAuto(10)");

  // ───────── 4. cambiar el PIN ─────────
  openCfg(); click(act('security.openChange')); check('«Cambiar PIN» abre el modal con tres campos', !!D.getElementById('sec_p0') && !!D.getElementById('sec_p1'));
  fill('7359', '7359', '0000'); await go('security.saveChange', 600); check('PIN actual incorrecto: error y el botón vuelve a estar disponible', /actual es incorrecto/.test(msg()) && !D.getElementById('secGo').disabled);
  fill('1111', '1111', '4821'); await go('security.saveChange', 400); check('PIN nuevo débil: rechazado antes de gastar un intento', /obvio/.test(msg()) && (lsec().fails || 0) === 1, JSON.stringify(lsec().fails));
  // fallo a mitad de camino: la configuración vieja se conserva
  const before = w.localStorage.getItem('oa3_sec'); const sub = require('crypto').webcrypto.subtle; const orig = sub.deriveBits.bind(sub); let n = 0;
  sub.deriveBits = async (...a) => { n++; if (n > 1) throw new Error('fallo simulado'); return orig(...a); };
  fill('7359', '7359', '4821'); await go('security.saveChange', 600); sub.deriveBits = orig;
  check('si el navegador falla a mitad de «cambiar PIN», el PIN anterior sigue valiendo (ANTES quedaba sal nueva con hash viejo = PIN inservible)', /No se pudo cambiar/.test(msg()) && JSON.parse(w.localStorage.getItem('oa3_sec')).hash === JSON.parse(before).hash && JSON.parse(w.localStorage.getItem('oa3_sec')).salt === JSON.parse(before).salt && !D.getElementById('secGo').disabled, msg());
  fill('7359', '7359', '4821'); await go('security.saveChange', 800); const code2 = (D.getElementById('secRecCode') || {}).textContent;
  check('cambio correcto: PIN nuevo, código nuevo distinto', !!code2 && code2 !== code && lsec().hash !== JSON.parse(rawA).hash);
  click(act('security.codeSaved'));

  // ───────── 5. pantalla de bloqueo ─────────
  openCfg(); click(act('security.lock')); await wait(100);
  check('«Bloquear ahora» muestra la pantalla de bloqueo accesible (role=dialog)', D.getElementById('lockScreen').style.display === 'flex' && D.getElementById('lockScreen').getAttribute('role') === 'dialog' && E('Seguridad._estado().locked'));
  check('la pantalla de bloqueo no usa handlers inline', !/\son(click|keydown|input)=/i.test(D.getElementById('lockScreen').innerHTML));
  const lf = click(act('security.forgot')); check('«¿Olvidaste tu PIN?» muestra el panel sin saltar a «#»', D.getElementById('lockForgotPanel').style.display === 'block' && !w.location.hash); click(act('security.forgot')); check('…y lo oculta al volver a pulsar', D.getElementById('lockForgotPanel').style.display === 'none');
  // doble envío
  D.getElementById('lockPin').value = '0000'; key('lockPin', 'Enter'); key('lockPin', 'Enter'); click(act('security.enter')); await wait(700);
  check('Enter pulsado dos veces seguidas cuenta UN solo intento fallido (ANTES contaba dos)', lsec().fails === 1, 'fails=' + lsec().fails);
  D.getElementById('lockPin').value = '7359'; key('lockPin', 'Enter'); await wait(600); check('Enter en el campo del PIN desbloquea', !E('Seguridad._estado().locked') && D.getElementById('lockScreen').style.display === 'none');
  check('al entrar bien se limpian los intentos fallidos', lsec().fails === 0);

  // ───────── 6. bloqueo tras 5 intentos y recuperación por clic ─────────
  click(act('security.lock', '')) ; E("Seguridad.bloquear()"); await wait(80);
  for (let i = 0; i < 5; i++) { D.getElementById('lockPin').value = '9999'; click(act('security.enter')); await wait(400); }
  check('5 fallos: ni el PIN correcto entra y el mensaje dice cuánto esperar', (D.getElementById('lockPin').value = '7359', click(act('security.enter')), await wait(500), E('Seguridad._estado().locked')) && /Espera/.test(D.getElementById('lockMsg').textContent));
  const _now = w.Date.now; w.Date.now = () => _now.call(w.Date) + 120000; click(act('security.forgot'));
  const rec = (c, a, b) => { D.getElementById('lockRec').value = c; D.getElementById('lockNew1').value = a; D.getElementById('lockNew2').value = b; };
  rec(code2, '1111', '1111'); click(act('security.recover')); await wait(300); check('recuperación con PIN nuevo débil: rechazada sin gastar el código', /obvio/.test(D.getElementById('lockMsg').textContent) && E('Seguridad._estado().locked'));
  rec(code2, '5827', '5828'); click(act('security.recover')); await wait(300); check('recuperación con PIN que no coincide: rechazada', /no coinciden/.test(D.getElementById('lockMsg').textContent));
  rec('AAAA-AAAA-AAAA-AAAA', '5827', '5827'); click(act('security.recover')); await wait(700); check('código incorrecto: no restablece', /Código de recuperación incorrecto/.test(D.getElementById('lockMsg').textContent) && E('Seguridad._estado().locked'));
  rec(code2.toLowerCase(), '5827', '5827'); click(act('security.recover')); await wait(900); w.Date.now = _now;
  const code3 = (D.getElementById('secRecCode') || {}).textContent;
  check('código correcto (en minúsculas también): desbloquea y entrega un código NUEVO', !E('Seguridad._estado().locked') && !!code3 && code3 !== code2 && /restablecido/.test(modal()), code3);
  click(act('security.codeSaved'));

  // ───────── 7. registro de actividad ─────────
  E("Seguridad._audit('Prueba', " + JSON.stringify('<img src=x onerror=1 id=PWN>') + ")"); openCfg(); click(act('security.viewLog')); await wait(500);
  check('«Ver registro de actividad» lo muestra y el texto con HTML sale como texto', /Registro de actividad/.test(modal()) && !D.getElementById('PWN') && modal().includes('<img src=x onerror=1 id=PWN>') && /PIN incorrecto/.test(modal()));
  let csv = ''; w.URL.createObjectURL = b => { b.text().then(t => csv = t); return 'blob:x'; }; w.HTMLAnchorElement.prototype.click = function () {};
  click(act('security.downloadLog')); await wait(300); check('«Descargar CSV» entrega el registro con encabezados y neutraliza fórmulas', csv.includes('Fecha,Evento,Detalle') && csv.includes('Prueba'));
  E("Seguridad._audit('Fórmula','=1+1')"); csv = ''; click(act('security.downloadLog')); await wait(300); check('una celda que empieza con «=» se guarda como texto en el CSV', /"'=1\+1"/.test(csv), csv.slice(-120));
  click(act('app.closeModal'));

  // ───────── 8. desactivar ─────────
  openCfg(); click(act('security.openDisable')); D.getElementById('sec_p0').value = '0000'; await go('security.saveDisable', 500); check('desactivar con PIN incorrecto: error y sigue activo', /incorrecto/.test(msg()) && E('Seguridad.activo()'));
  D.getElementById('sec_p0').value = '5827'; key('sec_p0', 'Enter'); await wait(700);
  check('con el PIN correcto (Enter): se desactiva, desaparece 🔒 y la tarjeta ofrece activar de nuevo', !E('Seguridad.activo()') && !w.localStorage.getItem('oa3_sec') && !D.getElementById('lockBtn') && !!act('security.openActivate'));

  // ───────── 9. borrar desde el bloqueo, por clic ─────────
  w.close(); await wait(100);
  const seed = { oa3_sec: JSON.stringify(lsecSeed()), oa3_pts: JSON.stringify([{ id: 1, name: 'Ana Prueba' }]) };
  function lsecSeed() { return { autoMin: 10, fails: 0, lockUntil: 0, salt: 'AAAAAAAAAAAAAAAAAAAAAA==', hash: 'x'.repeat(44), recSalt: 'AAAAAAAAAAAAAAAAAAAAAA==', recHash: 'y'.repeat(44) }; }
  w = await boot(url, seed); D = w.document;
  check('con PIN configurado, la app arranca bloqueada', D.getElementById('lockScreen').style.display === 'flex');
  click(act('security.forgot')); D.getElementById('lockWipe').value = 'no'; click(act('security.wipe')); await wait(200); check('sin escribir BORRAR no se borra nada', !!w.localStorage.getItem('oa3_pts') && /BORRAR/.test(D.getElementById('lockMsg').textContent));
  D.getElementById('lockWipe').value = 'borrar'; click(act('security.wipe')); await wait(500); check('escribiendo BORRAR se borran los datos locales y queda anotado', !w.localStorage.getItem('oa3_pts') && !w.localStorage.getItem('oa3_sec') && ((await w.eval("idbGet('audit')")) || []).some(x => x.ev === 'Borrado de datos locales'));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : `\n✔ Todas las pruebas de seguridad por clic pasaron (${results.length} comprobaciones)`); process.exit(fail ? 1 : 0);
});
