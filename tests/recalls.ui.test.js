// Recordatorios por CLIC (data-action) + privacidad del registro de actividad (solo N.° de ficha, nunca nombres).
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const errs = [], alerts = [], opened = []; let confirmAns = true;
srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — Recordatorios por clic y privacidad del registro');
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = () => confirmAns; w.open = u => { opened.push(String(u)); return null; }; } });
  const w = dom.window, D = w.document, E = s => w.eval(s); await wait(2200);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const act = (name, sel = '') => D.querySelector(`[data-action="${name}"]${sel}`);
  const txt = () => D.getElementById('mainContent').textContent;
  const hoy = E('today()'), dias = d => E(`sumarDias('${hoy}',${d})`);
  const strip = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  check('recalls.js ya no tiene handlers inline', !/\son(click|input|change|keydown)\s*=/i.test(strip('js/recalls.js')));

  const mk = (id, name, extra = {}) => Object.assign({ id, name, phone: '0991234567', appointments: [], treatments: [], payments: [], presupuestos: [] }, extra);
  const done = (d, id) => ({ id, date: d, time: '09:00', status: 'completada' });
  w.__P = [
    mk(101, 'Paciente Secreto Uno', { appointments: [done(dias(-40), 1), null], treatments: [{ id: 1, name: 'x', cost: 90, status: 'pendiente', date: dias(-60) }, null] }),
    mk(102, 'Control Dos', { phone: '', appointments: [done(dias(-220), 2)] }),
    mk(103, 'Inactiva Tres', { appointments: [done(dias(-500), 3)] }),
    mk('abc', 'Id Texto', { appointments: [done(dias(-300), 4)] })
  ];
  E('Patients.all().length=0; __P.forEach(p=>Patients.all().push(p)); save();');
  check('citas/tratamientos nulos o pacientes raros ya no rompen el cálculo (ANTES se caía)', (() => { try { return E("calcularRecalls(Patients.all().concat([null,'raro']))").tx.length === 1; } catch (e) { return false; } })());
  E("showPage('recordatorios')"); await wait(150);
  check('la pantalla se dibuja y todos sus botones usan data-action', /Tratamiento sin terminar \(1\)/.test(txt()) && D.querySelectorAll('#mainContent [onclick],#mainContent [onchange]').length === 0 && !!act('recalls.wa') && !!act('recalls.done') && !!act('recalls.snooze') && !!act('recalls.never') && !!act('recalls.view'));
  check('las pestañas y los selectores de configuración también', D.querySelectorAll('[data-action="recalls.tab"]').length === 6 && D.querySelectorAll('select[data-on-change="recalls.cfg"]').length === 4);

  click(act('recalls.wa', '[data-id="101"]')); await wait(60);
  check('clic en WhatsApp abre wa.me con el número de Ecuador', /^https:\/\/wa\.me\/593991234567\?text=/.test(opened[opened.length - 1] || ''), opened.join(','));
  check('…y aparece «Ya lo envié»', txt().includes('Ya lo envié'));
  click(act('recalls.wa', '[data-id="102"]')); await wait(40);
  check('sin teléfono: avisa y no abre nada', alerts.some(a => /no tiene número/.test(a)) && opened.length === 1);
  click(act('recalls.tab', '[data-tab="control"]')); await wait(60);
  check('clic en una pestaña cambia la lista', /Control Dos/.test(txt()) && !/Paciente Secreto/.test(txt()));
  E("Recalls.setTab('<img>')"); check('una pestaña inventada se ignora', /Control Dos/.test(txt()));
  click(act('recalls.tab', '[data-tab="todos"]')); await wait(60);
  click(act('recalls.done', '[data-id="101"]')); await wait(80);
  const p101 = E('Patients.all()[0].recall');
  check('clic en «Contactado» guarda fecha y lo oculta 30 días', p101.ultimo === hoy && p101.hasta === dias(30) && p101.log.length === 1, JSON.stringify(p101));
  click(act('recalls.snooze', '[data-id="102"]')); await wait(60);
  check('clic en «⏰ 60 días» pospone 60 días', E('Patients.all()[1].recall.hasta') === dias(60));
  E("Recalls.postpone(103,99999)"); check('días absurdos se reemplazan por el valor de configuración', E('Patients.all()[2].recall.hasta') === dias(30));
  click(act('recalls.tab', '[data-tab="pospuestos"]')); await wait(60);
  confirmAns = false; click(act('recalls.never', '[data-id="103"]')); await wait(50);
  check('«🚫 No contactar» pregunta y, si dices que no, no cambia nada', !E('Patients.all()[2].noRecall'));
  confirmAns = true; click(act('recalls.never', '[data-id="103"]')); await wait(60);
  check('…si dices que sí, lo marca', E('Patients.all()[2].noRecall') === true);
  click(act('recalls.tab', '[data-tab="noContactar"]')); await wait(60);
  check('la pestaña «No contactar» ofrece Reactivar', !!act('recalls.reactivate'));
  click(act('recalls.reactivate', '[data-id="103"]')); await wait(60);
  check('clic en Reactivar quita la marca', !E('Patients.all()[2].noRecall'));
  click(act('recalls.tab', '[data-tab="todos"]')); await wait(60);
  const sel = D.querySelector('select[data-key="meses"]'); sel.value = '9'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(60);
  check('cambiar el selector guarda la configuración', JSON.parse(w.localStorage.getItem('oa3_recall_cfg')).meses === 9);
  check('claves inventadas o valores raros no se guardan', E("Recalls.setCfg('__proto__',5)") === false && E("Recalls.setCfg('meses','x')") === false && E("Recalls.setCfg('meses',-3)") === false);
  E("Recalls.setCfg('meses',6)");
  E("Recalls.markContacted('abc')"); check('ids de texto también funcionan', E("Patients.all()[3].recall.ultimo") === hoy);
  check('acciones sobre un id que no existe no fallan', E("Recalls.markContacted(999)") === false && E("Recalls.sendWA(999)") === false);
  click(act('recalls.tab', '[data-tab="pospuestos"]')); await wait(60);
  click(act('recalls.view', '[data-id="102"]')); await wait(80);
  check('«Ver» abre la ficha del paciente', E('Patients.current() && Patients.current().id') === 102);
  E("showPage('dashboard')"); await wait(100);
  check('la tarjeta del dashboard abre Recordatorios con data-action', (() => { const b = act('app.showPage', '[data-page="recordatorios"]'); return !b || !b.hasAttribute('onclick'); })());

  // ───────── privacidad del registro ─────────
  await w.Seguridad._flush(); await wait(300);
  let log = (await E("idbGet('audit')")) || [];
  const raw = JSON.stringify(log);
  const evs = log.filter(x => /recordatorio|contactado|no contactar|Reactivó|Pospuso/i.test(x.ev));
  check('las acciones de recordatorios quedan anotadas con «Ficha N° …»', evs.length >= 5 && evs.every(x => /^Ficha N° /.test(x.det)), JSON.stringify(evs));
  check('NINGÚN nombre de paciente aparece en el registro (LOPDP)', !/Secreto|Control Dos|Inactiva|Id Texto/.test(raw), raw.slice(0, 300));

  // alta de paciente por el formulario: se anota la ficha, no el nombre
  E("Patients.openNew()"); D.getElementById('f_name').value = 'Nombre Privado Cuatro'; D.getElementById('f_cedula') && (D.getElementById('f_cedula').value = '');
  click(act('patients.saveNew')); await wait(200); await w.Seguridad._flush();
  log = (await E("idbGet('audit')")) || [];
  const cre = log.filter(x => x.ev === 'Creó paciente');
  check('«Creó paciente» guarda el N.° de ficha del paciente nuevo, no su nombre', cre.length === 1 && cre[0].det === 'Ficha N° ' + E('Patients.current().id') && !/Privado/.test(JSON.stringify(log)), JSON.stringify(cre));

  // registros viejos con nombres: se limpian una vez
  await E(`idbSet('audit', [
    {t:1,ev:'Abrió ficha',det:'Control Dos'},{t:2,ev:'Completó cita',det:'Control Dos · id 7'},{t:3,ev:'Registró pago',det:'Persona Borrada'},
    {t:4,ev:'Abrió ficha',det:'#101'},{t:5,ev:'Agregó servicio al catálogo',det:'Limpieza'},{t:6,ev:'Nube: conectado',det:'Cuenta dr@x.com'},{t:7,ev:'Creó cita',det:'Nombre Escrito A Mano'}])`);
  E("localStorage.removeItem('oa3_audit_fichas')");
  E("Seguridad.verRegistro()"); await wait(500);
  log = (await E("idbGet('audit')")) || [];
  const by = ev => log.filter(x => x.ev === ev).map(x => x.det);
  check('registros antiguos: el nombre se cambia por la ficha, conservando «· id N»', JSON.stringify(by('Completó cita')) === '["Ficha N° 102 · id 7"]' && by('Abrió ficha').includes('Ficha N° 102') && by('Abrió ficha').includes('Ficha N° 101'), JSON.stringify(log));
  check('…y si ya no se puede identificar (paciente borrado, nombre escrito a mano) se quita el nombre', by('Registró pago')[0] === '(paciente no identificado)' && by('Creó cita')[0] === '(paciente no identificado)');
  check('…sin tocar los eventos que no son de pacientes', by('Agregó servicio al catálogo')[0] === 'Limpieza' && by('Nube: conectado')[0] === 'Cuenta dr@x.com');
  check('el visor del registro ya no muestra nombres', !/Control Dos|Persona Borrada/.test(D.getElementById('modalContent').textContent));
  check('la limpieza se hace una sola vez', w.localStorage.getItem('oa3_audit_fichas') === '1' && (await E("Seguridad._limpiarNombres()")) === 0);
  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  const bad = results.filter(x => !x).length; console.log(bad ? `\n✘ ${bad} comprobación(es) fallaron` : `\n✔ Todas las pruebas de Recordatorios por clic pasaron (${results.length} comprobaciones)`);
  srv.close(); process.exit(bad ? 1 : 0);
});
