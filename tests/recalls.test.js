// Pruebas de recordatorios: reglas de a quién contactar, acciones y pantalla.
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

srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — recordatorios de pacientes');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 160)); });
  const opened = [], alerts = [];
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.confirm = () => true; w.alert = m => alerts.push(m); w.open = u => { opened.push(u); return null; }; } });
  const w = dom.window; await wait(2200); const E = s => w.eval(s);

  // ───────── reglas (fecha fija: 2026-10-03) ─────────
  const HOY = '2026-10-03';
  const pt = (id, name, o = {}) => Object.assign({ id, name, phone: '0991112233', appointments: [], treatments: [], payments: [], presupuestos: [] }, o);
  const done = d => ({ id: 1, date: d, time: '09:00', reason: 'x', status: 'completada' });
  const pend = c => ({ id: 2, name: 'Endodoncia', cost: c, status: 'pendiente', date: '2026-01-01', tooth: '11' });
  const L = [
    pt(1, 'Tx', { appointments: [done('2026-09-01')], treatments: [pend(80)] }),
    pt(2, 'TxReciente', { appointments: [done('2026-09-28')], treatments: [pend(50)] }),
    pt(3, 'Control', { appointments: [done('2026-03-15')] }),
    pt(4, 'Borde6m', { appointments: [done('2026-04-03')] }),
    pt(5, 'Borde5m29d', { appointments: [done('2026-04-04')] }),
    pt(6, 'Inactivo', { appointments: [done('2025-08-01')] }),
    pt(7, 'ConCitaFutura', { appointments: [done('2025-01-01'), { id: 3, date: '2026-10-10', time: '10:00', status: 'pendiente' }] }),
    pt(8, 'CitaPendientePasada', { appointments: [done('2025-01-01'), { id: 3, date: '2026-09-01', time: '10:00', status: 'pendiente' }] }),
    pt(9, 'Pospuesto', { appointments: [done('2026-03-01')], recall: { hasta: '2026-11-01' } }),
    pt(10, 'PospHoy', { appointments: [done('2026-03-01')], recall: { hasta: '2026-10-03' } }),
    pt(11, 'NoContactar', { appointments: [done('2025-01-01')], noRecall: true }),
    pt(12, 'SinVisitas', { treatments: [pend(30)] }),
    pt(13, 'TxEInactivo', { appointments: [done('2025-06-01')], treatments: [pend(120)] }),
    pt(14, 'FechaFutura', { appointments: [done('2026-12-01')] }),
    pt(15, 'TxRealizado', { treatments: [{ id: 9, name: 'Resina', cost: 40, status: 'realizado', date: '2026-02-01' }] })
  ];
  w.__L = JSON.parse(JSON.stringify(L));
  const R = E(`calcularRecalls(__L,{meses:6,inactivoMeses:12,diasTx:14,snoozeDias:30},'${HOY}')`);
  const n = k => R[k].map(i => i.p.name).sort().join(',');
  check('tratamiento sin terminar: ≥14 días y pendiente (Tx, TxEInactivo)', n('tx') === 'Tx,TxEInactivo', n('tx'));
  check('un tratamiento pendiente reciente (5 días) todavía no se reclama', !n('tx').includes('TxReciente') && !n('control').includes('TxReciente'));
  check('tiene prioridad "tratamiento" sobre "inactivo" (aparece una sola vez)', !n('inactivo').includes('TxEInactivo'));
  check('control vencido: exactamente 6 meses sí, 5 meses 29 días no', n('control').includes('Borde6m') && !n('control').includes('Borde5m29d'), n('control'));
  check('control vencido incluye a quien tiene 6-11 meses (Control, Borde6m, PospHoy y TxRealizado)', n('control') === 'Borde6m,Control,PospHoy,TxRealizado', n('control'));
  check('inactivo: 12+ meses sin visita (Inactivo y CitaPendientePasada)', n('inactivo') === 'CitaPendientePasada,Inactivo', n('inactivo'));
  check('con cita futura agendada no aparece', ![...R.tx, ...R.control, ...R.inactivo, ...R.pospuestos].some(i => i.p.name === 'ConCitaFutura'));
  check('una cita pendiente YA pasada no cuenta como cita futura (el paciente sí aparece)', n('inactivo').includes('CitaPendientePasada'));
  check('pospuesto hasta una fecha futura se oculta; hasta hoy ya vuelve a aparecer', n('pospuestos') === 'Pospuesto' && n('control').includes('PospHoy'), n('pospuestos'));
  check('"no contactar" queda fuera y se lista aparte', n('noContactar') === 'NoContactar' && ![...R.tx, ...R.control, ...R.inactivo].some(i => i.p.name === 'NoContactar'));
  check('sin visitas registradas o con fecha futura: se ignoran', ![...R.tx, ...R.control, ...R.inactivo, ...R.pospuestos].some(i => ['SinVisitas', 'FechaFutura'].includes(i.p.name)));
  check('un tratamiento realizado cuenta como visita (TxRealizado: 8 meses → control)', [...R.control].some(i => i.p.name === 'TxRealizado'));
  check('se ordena por más tiempo sin visita primero', R.tx[0].p.name === 'TxEInactivo');
  check('detalle: cantidad y monto de tratamientos pendientes', R.tx.find(i => i.p.name === 'Tx').pendientes === 1 && R.tx.find(i => i.p.name === 'Tx').montoPend === 80);
  const R3 = E(`calcularRecalls(__L,{meses:3,inactivoMeses:12,diasTx:14,snoozeDias:30},'${HOY}')`);
  check('al cambiar la configuración (control a 3 meses) entran más pacientes', R3.control.length > R.control.length);
  check('fechas: sumarDias cruza fin de mes y meses completos son exactos', E("sumarDias('2026-01-31',1)") === '2026-02-01' && E("mesesEntre('2026-01-31','2026-02-28')") === 0 && E("mesesEntre('2025-10-03','2026-10-03')") === 12);
  check('datos incompletos no rompen (paciente sin listas)', E("calcularRecalls([{id:99,name:'Vacío'}],null,'2026-10-03')").tx.length === 0);

  // ───────── pantalla y acciones (con la fecha real de la app) ─────────
  const hoy = E('today()'), dias = d => E(`sumarDias('${hoy}',${d})`);
  E(`patients.length=0; patients.push(
    {id:101,name:'Tx <img src=x onerror=window.__xss=1>',phone:'0991234567',appointments:[{id:1,date:'${dias(-40)}',time:'09:00',status:'completada'}],treatments:[{id:1,name:'SECRETO-endodoncia',cost:90,status:'pendiente',date:'${dias(-40)}'}],payments:[],presupuestos:[]},
    {id:102,name:'Control Cero',phone:'',appointments:[{id:2,date:'${dias(-220)}',time:'09:00',status:'completada'}],treatments:[],payments:[],presupuestos:[]},
    {id:103,name:'Inactiva Tres',phone:'0987654321',appointments:[{id:3,date:'${dias(-500)}',time:'09:00',status:'completada'}],treatments:[],payments:[],presupuestos:[]},
    {id:104,name:'Al Día',phone:'0980000000',appointments:[{id:4,date:'${dias(-10)}',time:'09:00',status:'completada'}],treatments:[],payments:[],presupuestos:[]});
    save();`);
  E("showPage('recordatorios')"); await wait(120);
  const doc = w.document, txt = () => doc.getElementById('mainContent').textContent;
  check('la página Recordatorios existe en el menú y muestra los 3 grupos', !!doc.getElementById('nav-recordatorios') && /Tratamiento sin terminar \(1\)/.test(txt()) && /Control vencido \(1\)/.test(txt()) && /Inactivo \(1\)/.test(txt()), txt().slice(0, 200));
  check('quien está al día no aparece', !txt().includes('Al Día'));
  check('XSS: el nombre hostil se muestra como texto', doc.querySelectorAll('[onerror]').length === 0 && w.__xss === undefined);
  check('sin teléfono: se avisa en la fila', txt().includes('sin teléfono'));
  check('insignia del menú con el total (3)', (() => { E('actualizarBadgeRecalls()'); const b = doc.getElementById('recallBadge'); return b && b.textContent === '3'; })());
  E("showPage('dashboard')"); await wait(100);
  check('dashboard: tarjeta "3 pacientes por contactar"', /3 pacientes por contactar/.test(doc.getElementById('mainContent').textContent));
  E("showPage('recordatorios')"); await wait(100);

  E('enviarRecallWA(101)'); await wait(50);
  const u = opened[opened.length - 1] || '', msg = decodeURIComponent(u);
  check('WhatsApp: número de Ecuador y saludo con el nombre', u.startsWith('https://wa.me/593991234567?text=') && msg.includes('Hola Tx'), msg);
  check('privacidad: el mensaje NO menciona el tratamiento', !msg.includes('SECRETO') && !/endodoncia/i.test(msg) && msg.includes('tratamiento pendiente'));
  check('tras abrir WhatsApp aparece "Ya lo envié" (no se oculta solo)', txt().includes('Ya lo envié') && /Tratamiento sin terminar \(1\)/.test(txt()));
  E('enviarRecallWA(102)'); check('sin teléfono: avisa y no abre WhatsApp', alerts.length === 1 && opened.length === 1, alerts.join('|'));
  E('enviarRecallWA(103)'); const m3 = decodeURIComponent(opened[opened.length - 1]);
  check('mensaje de inactivo y de control son distintos', m3.includes('más de un año') && !m3.includes('Han pasado'));

  E('marcarContactado(101)'); await wait(80);
  const p101 = E('patients.find(p=>p.id===101).recall');
  check('marcar contactado: guarda fecha y oculta el aviso 30 días', p101.ultimo === hoy && p101.hasta === dias(30) && p101.log.length === 1, JSON.stringify(p101));
  check('el paciente contactado sale de la lista y pasa a Pospuestos', /Tratamiento sin terminar \(0\)|^((?!Tratamiento sin terminar).)*$/s.test(txt()) || !txt().includes('SECRETO'));
  E("setRecallTab('pospuestos')"); await wait(60);
  check('pestaña Pospuestos lista al paciente con "Oculto hasta"', txt().includes('Oculto hasta'));
  E('posponerRecall(102,60)'); await wait(50);
  check('posponer 60 días lo oculta hasta esa fecha', E('patients.find(p=>p.id===102).recall.hasta') === dias(60));
  E("setRecallTab('todos')"); E('noContactarRecall(103)'); await wait(60);
  check('"No contactar" lo saca de la lista y lo guarda', E('patients.find(p=>p.id===103).noRecall') === true && !txt().includes('Inactiva Tres'));
  E("setRecallTab('noContactar')"); await wait(50);
  check('pestaña "No contactar" permite reactivar', txt().includes('Inactiva Tres') && txt().includes('Reactivar'));
  E('reactivarRecall(103)'); await wait(50);
  check('reactivar: vuelve a la lista de inactivos', E('calcularRecalls(patients).inactivo.length') === 1);

  E("setRecallCfg('meses',3)"); check('la configuración se conserva (localStorage)', JSON.parse(w.localStorage.getItem('oa3_recall_cfg')).meses === 3 && E('recallCfg().meses') === 3);
  E("setRecallCfg('inactivoMeses',2)"); check('configuración incoherente se corrige (inactivo siempre > control)', E('recallCfg().inactivoMeses') > E('recallCfg().meses'));

  await w.Seguridad._flush(); await wait(400);
  const log = (await E("idbGet('audit')")) || [];
  check('auditoría: registra envío, contactado, posponer, no contactar y reactivar', ['Envió recordatorio de control por WhatsApp', 'Marcó paciente como contactado', 'Pospuso recordatorio de paciente', 'Marcó paciente como "no contactar"', 'Reactivó recordatorios del paciente'].every(e => log.some(x => x.ev === e)));
  const st = await E("idbGet('state')");
  check('los datos de recordatorio persisten en el estado guardado', st.patients.find(p => p.id === 101).recall.ultimo === hoy);
  E("showPage('dashboard')"); await wait(80);
  check('dashboard: montos con 2 decimales exactos', !/\$\d+\.\d{3,}/.test(doc.getElementById('mainContent').textContent));
  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de recordatorios pasaron'); process.exit(fail ? 1 : 0);
});
