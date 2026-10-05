// Pruebas del saldo/cobranza: una sola regla en todas las pantallas.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
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
const T = (id, cost, status) => ({ id, name: 'Trat ' + id, cost, status, date: '2026-09-01', tooth: '11' });
const P = (id, amount, date) => ({ id, amount, date, type: 'Efectivo', concept: 'Abono' });
const A = { id: 1, name: 'Ana Deudora', phone: '0991234567',
  treatments: [T(1, 100, 'realizado'), T(2, 50.1, 'realizado'), T(3, 200, 'pendiente')],
  payments: [P(1, 0.1, '2026-09-02'), P(2, 0.2, '2026-09-03'), P(3, 120, '2026-09-10')],
  presupuestos: [{ id: 1, estado: 'aprobado', total: 300, subtotal: 300, items: [], fecha: '2026-09-01' }, { id: 2, estado: 'borrador', total: 80, subtotal: 80, items: [] }, { id: 3, estado: 'rechazado', total: 999, subtotal: 999, items: [] }] };
const B = { id: 2, name: 'Beto Anticipo', phone: '', treatments: [T(4, 40, 'realizado')], payments: [P(4, 100, '2026-09-05')], presupuestos: [] };
const C = { id: 3, name: 'Carla AlDía', phone: '0980000000', treatments: [T(5, 30, 'realizado')], payments: [P(5, 30, '2026-09-06')], presupuestos: [] };

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — saldos y cobranza');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 160)); });
  const opened = [], alerts = [];
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.confirm = () => true;
      w.alert = m => alerts.push(m); w.open = u => opened.push(u);
      w.localStorage.setItem('oa3_pts', JSON.stringify([A, B, C]));
    } });
  const w = dom.window; await wait(2200);
  const E = s => w.eval(s);

  // ── la regla ──
  const a = E('resumenCuenta(patients[0])');
  check('realizado = solo tratamientos realizados (150.10)', a.realizado === 150.1, a.realizado);
  check('por realizar = pendientes (200)', a.porRealizar === 200);
  check('pagado suma sin errores de decimales (0.1+0.2+120 = 120.30)', a.pagado === 120.3, a.pagado);
  check('exigible hoy = realizado − pagado (29.80)', a.exigible === 29.8, a.exigible);
  check('saldo del plan = realizado + por realizar − pagado (229.80)', a.planPendiente === 229.8, a.planPendiente);
  check('presupuesto: solo cuenta el aprobado; borrador aparte; rechazado ignorado', a.aprobado === 300 && a.borrador === 80 && a.aprobadoPendiente === 179.7, JSON.stringify(a));
  const b = E('resumenCuenta(patients[1])');
  check('pago mayor al trabajo hecho = anticipo a favor (60), sin deuda', b.aFavor === 60 && b.exigible === 0 && b.planPendiente === 0, JSON.stringify(b));
  const c = E('resumenCuenta(patients[2])');
  check('al día: exigible 0 y a favor 0', c.exigible === 0 && c.aFavor === 0);
  const e0 = E('resumenCuenta({})');
  check('paciente vacío o con datos incompletos no rompe', e0.pagado === 0 && e0.exigible === 0);
  const cart = E('carteraTotal(patients)');
  check('cartera total: plan 229.80, exigible 29.80, 1 paciente con saldo, a favor 60', cart.plan === 229.8 && cart.exigible === 29.8 && cart.conSaldo === 1 && cart.aFavor === 60, JSON.stringify(cart));
  check('último pago es la fecha más reciente', a.ultimoPago === '2026-09-10');

  // ── las pantallas muestran lo mismo ──
  E('selectPt(1)'); await wait(80);
  const datos = E('renderDatos()'), pagos = E('renderPagos()'), pres = E('renderPresupuestos()'), comp = E('(function(){return typeof imprimirComprobante})()');
  check('pestaña Datos: saldo $229.80 y exigible $29.80', datos.includes('$229.80') && datos.includes('$29.80'));
  check('pestaña Pagos: saldo del plan $229.80, total tratamientos $350.10, pagado $120.30', pagos.includes('$229.80') && pagos.includes('$350.10') && pagos.includes('$120.30'));
  check('pestaña Presupuestos: aprobado $300.00 y saldo $179.70; borrador avisado, no sumado', pres.includes('$300.00') && pres.includes('$179.70') && pres.includes('Borradores sin aprobar: $80.00'));
  check('ninguna pantalla muestra decimales largos (0.30000000000000004)', ![datos, pagos, pres].some(h => /\d\.\d{3,}/.test(h.replace(/#[0-9a-f]{6}|rgba?\([^)]*\)/gi, ''))));
  E('selectPt(2)'); await wait(80);
  const pagosB = E('renderPagos()');
  check('paciente con anticipo: se ve "Anticipo a favor $60.00" (antes decía "Al día")', pagosB.includes('Anticipo a favor') && pagosB.includes('$60.00'));

  // ── Finanzas ──
  E("showPage('estadisticas')"); await wait(150);
  const fin = w.document.body.textContent;
  check('Finanzas: cartera pendiente $229.80 y exigible hoy $29.80 (1 paciente)', fin.includes('$229.80') && fin.includes('Exigible hoy: $29.80 (1 paciente)'), fin.match(/Cartera pendiente.{0,120}/)?.[0]);
  const nombres = [...w.document.querySelectorAll('.row-name')].map(x => x.textContent).filter(n => /Ana|Beto|Carla/.test(n));
  check('lista por paciente ordenada: primero el que más debe', nombres[0] === 'Ana Deudora', nombres.join(','));
  const botonesWA = [...w.document.querySelectorAll('button[aria-label="Cobrar por WhatsApp"]')];
  check('botón de cobro solo aparece para quien tiene saldo exigible (1)', botonesWA.length === 1);

  // ── WhatsApp de cobro ──
  E('enviarCobroWA(1)');
  check('cobro por WhatsApp: número ecuatoriano y monto exigible en el mensaje', opened.length === 1 && opened[0].startsWith('https://wa.me/593991234567?text=') && decodeURIComponent(opened[0]).includes('$29.80'), opened[0]);
  E('enviarCobroWA(2)'); E('enviarCobroWA(3)');
  check('sin saldo exigible o sin teléfono: avisa y no abre WhatsApp', opened.length === 1 && alerts.length === 2, alerts.join(' | '));
  await w.Seguridad._flush();
  check('el envío de cobro queda en el registro de actividad', ((await E("idbGet('audit')")) || []).some(x => x.ev.includes('recordatorio de cobro')));

  // ── aprobar presupuesto con descuento ──
  E(`patients[2].presupuestos.push({id:9,estado:'borrador',subtotal:30,total:25,descuento:5,items:[{nombre:'A',subtotal:10},{nombre:'B',subtotal:10},{nombre:'C',subtotal:10}]}); patients[2].treatments=[]; selectPt(3);`);
  for (const [id, val] of [['f_pfecha', '2026-10-02'], ['f_pfirma', 'Carla']]) { const i = w.document.createElement('input'); i.id = id; i.value = val; w.document.body.appendChild(i); }
  E('confirmarAprobacion(9)'); await wait(80);
  const tr = E('patients[2].treatments');
  const suma = Math.round(tr.reduce((s, t) => s + t.cost, 0) * 100) / 100;
  check('al aprobar: el descuento se reparte y la suma de tratamientos = total del presupuesto (25.00)', tr.length === 3 && suma === 25, JSON.stringify(tr.map(t => t.cost)));
  check('los tratamientos quedan ligados al presupuesto (presupId)', tr.every(t => t.presupId === 9));
  const c2 = E('resumenCuenta(patients[2])');
  check('tras aprobar: plan a cobrar 25.00, sin doble conteo con el presupuesto', c2.porRealizar === 25 && c2.aprobado === 25, JSON.stringify(c2));

  // ── comprobante impreso ──
  let htmlComp = ''; w.open = () => ({ document: { write: t => { htmlComp += t; }, close() {} } });
  E('selectPt(1)'); await wait(60); E('imprimirComprobante(3)');
  check('comprobante impreso: muestra el mismo saldo pendiente ($229.80)', htmlComp.includes('SALDO PENDIENTE') && htmlComp.includes('$229.80'), htmlComp.slice(0, 80));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de saldos pasaron'); process.exit(fail ? 1 : 0);
});
