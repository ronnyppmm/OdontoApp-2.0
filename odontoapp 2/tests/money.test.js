// Dinero sin errores de decimales: redondeo, lectura de montos, sumas, presupuesto y migración de datos viejos.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 250))); };
srv.listen(0, async () => {
  console.log('\nOdontoApp — dinero y fechas');
  const errs = [], alerts = []; const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 160)); });
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = () => true; } });
  await wait(1800); const w = dom.window, E = s => w.eval(s), D = w.document;
  const setIn = (id, val) => { let e = D.getElementById(id); if (!e) { e = D.createElement('input'); e.id = id; D.body.appendChild(e); } e.value = val; };

  // ── redondeo ──
  check('r2: 1.005 → 1.01, 2.675 → 2.68, 0.1+0.2 → 0.3 (el redondeo normal de JS falla en estos)', w.r2(1.005) === 1.01 && w.r2(2.675) === 2.68 && w.r2(0.1 + 0.2) === 0.3, [w.r2(1.005), w.r2(2.675), w.r2(0.1 + 0.2)]);
  check('r2: negativos, valores no numéricos y residuos mínimos', w.r2(-1.005) === -1.01 && w.r2(NaN) === 0 && w.r2(Infinity) === 0 && w.r2(undefined) === 0 && w.r2(1e-12) === 0 && w.r2('12.345') === 12.35);
  let s = 0; for (let i = 0; i < 10; i++) s = w.addM(s, 0.1);
  check('sumar 0.10 diez veces da exactamente 1 (con + normal da 0.9999999999999999)', s === 1 && (() => { let x = 0; for (let i = 0; i < 10; i++) x += 0.1; return x !== 1; })(), s);
  check('addM / subM / mulM exactos: 33.33×3 = 99.99, 19.99×3 = 59.97, 0.07×3 = 0.21, 100 − 99.99 = 0.01', w.mulM(33.33, 3) === 99.99 && w.mulM(19.99, 3) === 59.97 && w.mulM(0.07, 3) === 0.21 && w.subM(100, 99.99) === 0.01);
  let big = 0; for (let i = 0; i < 5000; i++) big = w.addM(big, 19.99);
  check('5.000 sumas de 19.99 = 99 950.00 exacto (sin deriva)', big === 99950, big);

  // ── lectura de montos escritos por personas ──
  const P = x => w.parseMonto(x);
  check('parseMonto acepta: 12.5 · 12,50 · $ 45 · 1.234,56 · 1,234.56', P('12.5') === 12.5 && P('12,50') === 12.5 && P('$ 45') === 45 && P('1.234,56') === 1234.56 && P('1,234.56') === 1234.56, [P('12.5'), P('12,50'), P('$ 45'), P('1.234,56'), P('1,234.56')]);
  check('parseMonto redondea a 2 decimales (12.345 → 12.35)', P('12.345') === 12.35 && P('0.004') === 0);
  check('parseMonto rechaza: vacío, letras, negativos, más de 9.999.999,99, nulos', ['', 'abc', '-5', '10000000', null, undefined, '12..5', '1e3', '--'].every(x => Number.isNaN(P(x))), ['', 'abc', '-5', '10000000', null, '1e3'].map(P));

  // ── formularios reales ──
  E("patients.length=0; patients.push({id:1,name:'Prueba',phone:'',treatments:[],payments:[],appointments:[],diary:[],images:[],consents:[],recetas:[],presupuestos:[],odoHistory:[]}); curPt=patients[0]; egresos.length=0;");
  setIn('f_pya', '12.345'); setIn('f_pyd', '2026-10-01'); setIn('f_pyt', 'Efectivo'); setIn('f_pyc', 'x');
  try { w.savePay(); } catch (e) { errs.push('savePay: ' + e.message); }
  check('un pago escrito como 12.345 se guarda como 12.35', E('curPt.payments[0].amount') === 12.35, E('curPt.payments[0].amount'));
  E("switchTab('pagos')"); check('switchTab sin elemento (como lo llaman guardar cita o receta) activa la pestaña correcta y no lanza error', E('curTab') === 'pagos' && (D.querySelector('.tab.active')?.getAttribute('onclick') || '').includes("'pagos'") && errs.length === 0, errs.join('|'));
  alerts.length = 0; setIn('f_pya', 'abc'); w.savePay();
  check('un pago con texto inválido se rechaza con aviso y no se guarda', alerts.some(a => /inválido/i.test(a)) && E('curPt.payments.length') === 1, alerts.join('|'));
  setIn('f_pya', '-20'); setIn('f_pyc', 'x'); setIn('f_pyd', '2026-10-01'); setIn('f_pyt', 'Efectivo'); alerts.length = 0; w.savePay();
  check('un pago negativo se rechaza con aviso (antes se ignoraba en silencio)', alerts.some(a => /inválido/i.test(a)) && E('curPt.payments.length') === 1);
  for (let i = 0; i < 3; i++) { setIn('f_ec', 'Gasto ' + i); setIn('f_em', '0.1'); setIn('f_ecat', 'Materiales'); setIn('f_ef', E('today()')); setIn('f_ep', ''); w.saveEgreso(); }
  alerts.length = 0; setIn('f_ec', 'Malo'); setIn('f_em', '0'); w.saveEgreso();
  check('3 egresos de $0.10 suman exactamente $0.30 y un egreso en cero se rechaza con aviso', E('egresos.reduce((s,e)=>w_addM(s,e.monto),0)'.replace('w_addM', 'addM')) === 0.3 && E('egresos.length') === 3 && alerts.length === 1);
  E("showPage('estadisticas')"); await wait(150);
  const fin = D.getElementById('mainContent').textContent;
  check('Finanzas muestra $0.30 de egresos, sin decimales largos', /\$0\.30/.test(fin) && !/\d\.\d{3,}/.test(fin.replace(/\d{4}-\d{2}-\d{2}/g, '')), fin.match(/.{20}0\.[0-9]{3,}.{10}/)?.[0]);

  // ── presupuesto ──
  E('curPt=patients[0]');
  const fila = (n, nombre, precio, qty) => { D.getElementById('pi-' + n)?.remove(); const r = D.createElement('div'); r.id = 'pi-' + n; D.body.appendChild(r); setIn('pin_' + n, nombre); setIn('pip_' + n, precio); setIn('piq_' + n, qty); };
  const limpiar = () => D.querySelectorAll('[id^="pi-"]').forEach(e => e.remove());
  setIn('f_pfd', '2026-10-02'); setIn('f_pfval', '30'); setIn('f_pfobs', ''); setIn('f_pftotal', '');
  limpiar(); fila(1, 'Resina', '33.33', '3'); setIn('f_pfdesc', '10'); E('presupItemCount=1'); w.savePresupuesto();
  const p1 = E('curPt.presupuestos[0]');
  check('presupuesto 33.33 × 3 con $10 de descuento: subtotal 99.99 y total 89.99 exactos', p1 && p1.subtotal === 99.99 && p1.total === 89.99 && p1.items[0].subtotal === 99.99, JSON.stringify(p1));
  limpiar(); fila(1, 'A', '0.07', '3'); fila(2, 'B', '19.99', '3'); setIn('f_pfdesc', '500'); w.savePresupuesto();
  const p2 = E('curPt.presupuestos[1]');
  check('un descuento mayor al subtotal se limita al subtotal (total $0.00, nunca negativo)', p2 && p2.subtotal === 60.18 && p2.descuento === 60.18 && p2.total === 0, JSON.stringify(p2));
  limpiar(); fila(1, 'A', '10', '1'); fila(2, 'B', '10.50', '2'); setIn('f_pfdesc', '3.333'); w.recalcPresup();
  check('el total en pantalla del formulario coincide con el que se guardará ($27.67)', D.getElementById('f_pftotal').textContent === '$27.67', D.getElementById('f_pftotal').textContent);

  // ── migración de datos viejos ──
  const b = w.migrateBundle({ v: 2, patients: [{ id: 1, payments: [{ id: 1, amount: 0.1 + 0.2 }, { id: 2, amount: 12.345 }, { id: 3, amount: '45.5' }], treatments: [{ id: 1, cost: 19.989999999 }], presupuestos: [{ id: 1, subtotal: 99.99000000001, total: 89.99000000001, descuento: 10, items: [{ precio: 33.330000001, subtotal: 99.990000003 }] }] }], egresos: [{ id: 1, monto: 1.005 }], servicios: [{ id: 1, precio: 9.999 }], archivosContables: [{ id: 1, totalIngresos: 0.30000000000000004, pagos: [{ monto: 7.775 }] }] });
  const pp = b.patients[0];
  check('migración v2→v3: montos viejos con fracciones quedan en 2 decimales (0.3, 12.35, 45.5, 19.99, …)', pp.payments[0].amount === 0.3 && pp.payments[1].amount === 12.35 && pp.payments[2].amount === 45.5 && pp.treatments[0].cost === 19.99 && b.egresos[0].monto === 1.01 && b.servicios[0].precio === 10, JSON.stringify([pp.payments, pp.treatments, b.egresos, b.servicios]));
  check('migración: presupuestos y cierres de mes archivados también', pp.presupuestos[0].subtotal === 99.99 && pp.presupuestos[0].total === 89.99 && pp.presupuestos[0].items[0].precio === 33.33 && b.archivosContables[0].totalIngresos === 0.3 && b.archivosContables[0].pagos[0].monto === 7.78);
  check('los datos ya correctos no cambian y la versión queda en 3', pp.presupuestos[0].descuento === 10 && b.v === 3 && w.eval('DATA_VERSION') === 3);

  // ── fechas ──
  check('today() usa la fecha local (la de Ecuador), no la UTC', /^\d{4}-\d{2}-\d{2}$/.test(E('today()')));
  check('fmtDate no corre un día por zona horaria (2026-10-03 → "3 Oct 2026")', /^3 \w+ 2026$/.test(E("fmtDate('2026-10-03')")), E("fmtDate('2026-10-03')"));
  const src = ['core', 'security', 'ui', 'finance', 'chart', 'agenda', 'clinical', 'patients'].map(f => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')).join('\n');
  check('ya no quedan fechas calculadas con toISOString (UTC) en respaldos ni exportaciones', !/toISOString\(\)\.(slice|split|substring)/.test(src));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de dinero pasaron'); process.exit(fail ? 1 : 0);
});
