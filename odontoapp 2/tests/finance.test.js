// Módulo Finanzas: pagos, egresos, cierre y reapertura de mes, informes, comprobante, seguridad y auditoría.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 280))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

srv.listen(0, async () => {
  console.log('\nOdontoApp — módulo Finanzas');
  const errs = [], alerts = [], confirms = [], consoleErr = []; let confirmAnswer = true;
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); }); vc.on('error', m => consoleErr.push(String(m)));
  const blobs = [], downloads = [], opened = [];
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = m => { confirms.push(String(m)); return confirmAnswer; };
      w.open = () => ({ document: { write: t => opened.push(t), close() {} } }); } });
  await wait(1800); const w = dom.window, D = w.document, E = s => w.eval(s);
  w.URL.createObjectURL = b => { blobs.push(b); return 'blob:x'; }; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const setv = (id, val) => { let e = D.getElementById(id); if (!e) { e = D.createElement('input'); e.id = id; D.body.appendChild(e); } e.value = val; };
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const main = () => D.getElementById('mainContent').textContent;
  const fin = s => `Finance.${s}`;
  const pad = n => String(n).padStart(2, '0');
  const now = E('(()=>{const n=localDate(new Date());return [n.getFullYear(),n.getMonth()]})()'), CY = now[0], CM = now[1];
  const PM = (CM + 11) % 12, PY = CM === 0 ? CY - 1 : CY;            // mes anterior
  const day = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const seed = (pts, eg, arch) => { w.__p = JSON.parse(JSON.stringify(pts)); w.__e = JSON.parse(JSON.stringify(eg || [])); w.__a = JSON.parse(JSON.stringify(arch || []));
    E('patients.length=0;curPt=null;__p.forEach(p=>patients.push(Patients.blank(p)));egresos.length=0;__e.forEach(e=>egresos.push(e));archivosContables.length=0;__a.forEach(a=>archivosContables.push(a));saveNow();'); };
  const pay = (id, amount, date, o = {}) => Object.assign({ id, amount, date, type: 'Efectivo', concept: 'Pago ' + id }, o);
  const eg = (id, monto, fecha, o = {}) => Object.assign({ id, concepto: 'Gasto ' + id, categoria: 'Materiales', monto, fecha, proveedor: '' }, o);

  // ───────── 1. estructura ─────────
  const src = read('js/finance.js');
  check('finance.js ya no tiene ningún handler inline (onclick, onmouseover…)', !/\son(click|input|change|keydown|focus|blur|mouseenter|mouseleave|mousedown|mouseover|mouseout)\s*=/i.test(src));
  const legacy = ['renderEstadisticas', 'renderPagos', 'openAddPay', 'savePay', 'seleccionarServicioPay', 'delPay', 'marcarFacturada', 'recordatorioFactura', 'imprimirComprobante', 'openAddEgreso', 'saveEgreso', 'delEgreso', 'abrirResetMes', 'cerrarMes', 'verArchivoMes', 'eliminarArchivoMes', 'descargarArchivoMes', 'descargarInformeAnual', 'descargarInformeMensual'];
  check('los 19 nombres antiguos siguen existiendo (los usan módulos aún no migrados)', legacy.every(n => E(`typeof ${n}`) === 'function'));
  check('chart.js ya no tiene la segunda ruta de pagos (código muerto que nadie llamaba)', !/function (openPayFromPt|savePayFromPt)/.test(read('js/chart.js')) && !/savePayFromPt/.test(read('js/security.js')));
  check('el HTML generado ya no usa onmouseover: el botón del catálogo se estiliza con CSS', /\.svc-chip:hover/.test(read('css/styles.css')));

  // ───────── 2. fechas e importes ─────────
  const V = s => E(`Finance.validDate(${JSON.stringify(s)})`);
  check('fechas: acepta reales y rechaza 30 de febrero, mes 13, vacío, texto y años absurdos', V('2026-10-03') && V('2024-02-29') && !V('2026-02-30') && !V('2025-02-29') && !V('2026-13-01') && !V('') && !V('ayer') && !V('1850-01-01') && !V('2999-01-01'));
  check('ym() lee año y mes sin usar Date (sin corrimientos por zona horaria)', JSON.stringify(E("Finance.ym('2026-10-31')")) === '{"y":2026,"m":9}' && E("Finance.ym('basura')") === null && E("Finance.ym('2026-00-10')") === null);
  check('fm(): los negativos salen como -$5.00 (antes $-5.00) y la utilidad nunca sale como -0.00', E('Finance.fm(-5)') === '-$5.00' && E('Finance.fm(5)') === '$5.00' && E('Finance.fm(subM(0.3,0.1+0.2))') === '$0.00');

  // ───────── 3. datos del mes ─────────
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 0.1, day(CY, CM, 2)), pay(2, 0.2, day(CY, CM, 3)), pay(3, 50, day(PY, PM, 10)), pay(4, 5, day(CY, CM, 4), { archivado: true })] }, { id: 2, name: 'Beto', payments: [pay(5, 20, day(CY, CM, 5))] }],
    [eg(1, 0.3, day(CY, CM, 6)), eg(2, 10, day(PY, PM, 8))]);
  const md = E(`Finance.monthData(${CM},${CY})`);
  check('monthData: suma exacta (0.1 + 0.2 + 20 = 20.30), sin archivados, utilidad y pacientes únicos', md.totalIngresos === 20.3 && md.pagos.length === 3 && md.totalEgresos === 0.3 && md.utilidad === 20 && md.pacientes === 2, JSON.stringify([md.totalIngresos, md.pagos.length, md.utilidad, md.pacientes]));
  const mdAll = E(`Finance.monthData(${CM},${CY},{includeArchived:true})`);
  check('monthData con includeArchived suma también lo archivado (informe del mes completo)', mdAll.totalIngresos === 25.3 && mdAll.pagos.length === 4);
  check('un mes sin movimientos da ceros, no errores', E('Finance.monthData(0,1999).totalIngresos') === 0);
  const yl = E(`Finance.yearLive(${CY})`);
  check('yearLive: movimientos del año aún no cerrados', yl.ingresos === (PY === CY ? 70.3 : 20.3) && yl.egresos === (PY === CY ? 10.3 : 0.3), JSON.stringify(yl));

  // ───────── 4. movimientos "invisibles" ─────────
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 30, ''), pay(2, 10, day(CY, CM, 1))] }], [eg(1, 15, 'no-es-fecha')]);
  const di = E('Finance.dataIssues()');
  check('dataIssues detecta pagos y egresos sin fecha válida y suma cuánto dinero no se está contando', di.total === 2 && di.pagos[0].py.id === 1 && di.egresos[0].id === 1 && di.monto === 45, JSON.stringify([di.total, di.monto]));
  E("showPage('estadisticas')");
  check('la pantalla de Finanzas lo avisa: «2 movimientos sin fecha válida ($45.00)»', /2 movimientos sin fecha válida \(\$45\.00\)/.test(main()), main().slice(0, 200));
  click($('[data-action="patients.select"][data-id="1"]')); check('«Ver paciente» abre su ficha para corregirlo', E('curPt.id') === 1);
  E("showPage('estadisticas')"); click($('[data-action="finance.deleteExpense"]')); check('y el egreso sin fecha se puede eliminar desde el aviso (queda solo el pago sin fecha)', E('egresos.length') === 0 && E('Finance.dataIssues().egresos.length') === 0 && E('Finance.dataIssues().total') === 1 && /1 movimiento sin fecha válida \(\$30\.00\)/.test(main()));

  // ───────── 5. validación ─────────
  const CP = f => JSON.parse(JSON.stringify(E(`Finance.checkPayment(${JSON.stringify(f)})`))), CE = f => JSON.parse(JSON.stringify(E(`Finance.checkExpense(${JSON.stringify(f)})`)));
  const good = { monto: '12,50', fecha: '2026-10-01', tipo: '  Transferencia ', concepto: '  Abono   inicial ' };
  check('pago válido: monto con coma, textos limpios, concepto por defecto «Pago» y forma por defecto «Efectivo»', CP(good).clean.amount === 12.5 && CP(good).clean.concept === 'Abono inicial' && CP(good).clean.type === 'Transferencia' && CP({ monto: 5, fecha: '2026-10-01' }).clean.concept === 'Pago' && CP({ monto: 5, fecha: '2026-10-01' }).clean.type === 'Efectivo');
  check('pago inválido: monto 0/negativo/texto o fecha vacía/falsa', ['0', '-3', 'abc', ''].every(m => !CP({ ...good, monto: m }).ok) && !CP({ ...good, fecha: '' }).ok && !CP({ ...good, fecha: '2026-02-30' }).ok && /fecha/.test(CP({ ...good, fecha: '' }).error));
  check('egreso: concepto obligatorio (≤120), monto y fecha válidos; categoría y proveedor limpios', !CE({ concepto: '  ', monto: 5, fecha: '2026-10-01' }).ok && !CE({ concepto: 'x'.repeat(121), monto: 5, fecha: '2026-10-01' }).ok && !CE({ concepto: 'a', monto: 0, fecha: '2026-10-01' }).ok && !CE({ concepto: 'a', monto: 5, fecha: '' }).ok && CE({ concepto: ' Luz ', monto: '5,5', fecha: '2026-10-01', categoria: '', proveedor: '  CNEL  ' }).clean.categoria === 'Otro' && CE({ concepto: ' Luz ', monto: '5,5', fecha: '2026-10-01', proveedor: '  CNEL  ' }).clean.proveedor === 'CNEL');

  // ───────── 6. operaciones ─────────
  seed([{ id: 1, name: 'Ana' }, { id: 2, name: 'Beto' }]);
  const a1 = E(`Finance.addPayment(1,{amount:10,date:'${day(CY, CM, 1)}',type:'Efectivo',concept:'Abono'})`), a2 = E(`Finance.addPayment(1,{amount:5,date:'${day(CY, CM, 1)}',type:'Efectivo',concept:'Otro'})`);
  check('addPayment: id único, queda pendiente de facturar y se guarda en el paciente correcto', a1.id !== a2.id && a1.factPendiente === true && E('patients[0].payments.length') === 2 && E('patients[1].payments.length') === 0 && E('Finance.addPayment(999,{amount:1,date:"2026-10-01",type:"x",concept:"y"})') === null);
  check('markInvoiced la marca como facturada en cualquier paciente', E(`Finance.markInvoiced(${a1.id})`) === true && E(`Finance.findPayment(${a1.id}).py.factPendiente`) === false && E('Finance.markInvoiced(123)') === false);
  check('removePayment elimina solo ese pago, en el mismo arreglo', E(`Finance.removePayment(1,${a1.id})`).id === a1.id && E('patients[0].payments.length') === 1 && E('Finance.removePayment(1,123)') === null);
  const e1 = E(`Finance.addExpense({concepto:'Luz',categoria:'Servicios',monto:30,fecha:'${day(CY, CM, 1)}',proveedor:''})`);
  check('addExpense / removeExpense: alta y baja en el mismo arreglo', E('egresos.length') === 1 && E(`Finance.removeExpense(${e1.id}).id`) === e1.id && E('egresos.length') === 0 && E('Finance.removeExpense(1)') === null);

  // ───────── 7. cerrar y reabrir un mes ─────────
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 40.1, day(PY, PM, 10)), pay(2, 0.2, day(PY, PM, 11)), pay(3, 99, day(CY, CM, 1))] }, { id: 2, name: 'Beto', payments: [pay(4, 10, day(PY, PM, 12))] }], [eg(1, 25.05, day(PY, PM, 9)), eg(2, 7, day(CY, CM, 2))]);
  check('cerrar un mes sin movimientos se rechaza', E('Finance.closeMonth(0,1999)').error === 'empty');
  const cl = E(`Finance.closeMonth(${PM},${PY})`), arch = E('archivosContables[0]');
  check('cerrar el mes: resumen con totales exactos (50.30 / 25.05 / 25.25), 3 pagos y 2 pacientes', cl.ok && arch.totalIngresos === 50.3 && arch.totalEgresos === 25.05 && arch.utilidad === 25.25 && arch.pagos.length === 3 && arch.pacientesAtendidos === 2 && /\d{4}$/.test(arch.label), JSON.stringify([arch.totalIngresos, arch.totalEgresos, arch.utilidad]));
  check('los movimientos del mes quedan archivados y los del mes actual no', E('patients[0].payments[0].archivado') === true && E('patients[1].payments[0].archivado') === true && E('egresos[0].archivado') === true && !E('patients[0].payments[2].archivado') && !E('egresos[1].archivado'));
  check('el mes ya no suma en las estadísticas vivas, pero sí en el total del año', E(`Finance.monthData(${PM},${PY}).totalIngresos`) === 0 && E(`Finance.monthData(${PM},${PY},{includeArchived:true}).totalIngresos`) === 50.3);
  E('egresos[0].monto=999'); check('el resumen guarda una COPIA de los egresos (cambiar uno vivo no altera lo archivado)', E('archivosContables[0].egresos[0].monto') === 25.05); E('egresos[0].monto=25.05');
  check('cerrar dos veces el mismo mes se rechaza', E(`Finance.closeMonth(${PM},${PY})`).error === 'closed' && E('archivosContables.length') === 1);
  const cnt = E('Finance.archivedCount(archivosContables[0])'); check('archivedCount cuenta lo que se reabriría (3 pagos, 1 egreso)', cnt.pagos === 3 && cnt.egresos === 1);
  const re = E(`Finance.reopenMonth(${arch.id})`);
  check('reabrir el mes: el resumen desaparece y sus movimientos vuelven a contarse', re.pagos === 3 && re.egresos === 1 && E('archivosContables.length') === 0 && E(`Finance.monthData(${PM},${PY}).totalIngresos`) === 50.3 && E('patients[0].payments[0].archivado') === undefined && E('egresos[0].archivado') === undefined, JSON.stringify(re));
  check('y se puede cerrar de nuevo con los mismos totales', E(`Finance.closeMonth(${PM},${PY})`).ok && E('archivosContables[0].totalIngresos') === 50.3);
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 10, day(PY, PM, 3), { archivado: true })] }], [], [{ id: 77, mes: PM, anio: PY, label: 'Mes viejo', pagos: [], egresos: [], totalIngresos: 10, totalEgresos: 0, utilidad: 10 }]);
  check('reabrir un cierre antiguo (sin ids de pagos guardados) también funciona', E('Finance.reopenMonth(77)').pagos === 1 && E('patients[0].payments[0].archivado') === undefined && E('Finance.reopenMonth(77)') === null);

  // ───────── 8. flujo de pago por clics ─────────
  seed([{ id: 1, name: 'Ana López', cedula: '1712345678', treatments: [{ id: 1, name: 'Endodoncia', cost: 100, status: 'realizado', date: day(CY, CM, 1) }] }]);
  E('selectPt(1)'); E("switchTab('pagos')");
  click($('[data-action="finance.openAddPay"]'));
  check('«+ Registrar pago» abre el formulario con la fecha de hoy', !!D.getElementById('f_pya') && D.getElementById('f_pyd').value === E('today()') && $$('#f_pyt option').length === 5);
  alerts.length = 0; setv('f_pya', '25.5'); setv('f_pyd', ''); click($('[data-action="finance.savePay"]'));
  check('pago con la fecha vacía: se rechaza con aviso (antes se guardaba y desaparecía de los meses)', alerts.some(a => /fecha del pago/i.test(a)) && E('patients[0].payments.length') === 0);
  setv('f_pyd', (CY + 1) + '-01-15'); confirmAnswer = false; confirms.length = 0; click($('[data-action="finance.savePay"]'));
  alerts.length = 0; setv('f_pyd', '2999-01-01'); click($('[data-action="finance.savePay"]')); const rechazada = alerts.some(a => /fecha del pago no es válida/.test(a)) && E('patients[0].payments.length') === 0; setv('f_pyd', (CY + 1) + '-01-15'); confirmAnswer = false; confirms.length = 0; click($('[data-action="finance.savePay"]'));
  check('un año absurdo (2999) se rechaza como fecha inválida; una fecha futura razonable pide confirmación y, si dice "no", no guarda', rechazada &&  confirms.some(c => /futura/.test(c)) && E('patients[0].payments.length') === 0);
  setv('f_pyd', E('today()')); setv('f_pyc', '  Abono   <b>1</b> '); setv('f_pyt', 'Transferencia'); confirmAnswer = true; click($('[data-action="finance.savePay"]'));
  const pg = E('patients[0].payments[0]');
  check('pago válido: se guarda limpio y pendiente de facturar, y se muestra el recordatorio del SRI con sus datos', pg && pg.amount === 25.5 && pg.concept === 'Abono <b>1</b>' && pg.factPendiente === true && /Recordatorio de factura/.test(modal()) && /\$25\.50/.test(modal()) && /Ana López/.test(modal()) && !$('#modalContent b'));
  click($('#modalContent [data-action="finance.markInvoiced"]'));
  check('«Ya la hice en el SRI» marca el pago como facturado y cierra el aviso (antes quedaba abierto)', E('patients[0].payments[0].factPendiente') === false && !modalOpen());
  check('la pestaña muestra el pago, el saldo del plan y ya no avisa de pendientes', /Abono/.test(main()) && /\$25\.50/.test(main()) && !/sin facturar en el SRI/.test(main()));

  // ───────── 9. mes cerrado: avisos al registrar y al eliminar ─────────
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 40, day(PY, PM, 10))] }], [eg(1, 10, day(PY, PM, 9))]);
  E(`Finance.closeMonth(${PM},${PY})`); E('selectPt(1)'); E("switchTab('pagos')");
  click($('[data-action="finance.openAddPay"]')); setv('f_pya', '15'); setv('f_pyd', day(PY, PM, 20)); confirmAnswer = false; confirms.length = 0; click($('[data-action="finance.savePay"]'));
  check('registrar un pago fechado en un mes ya cerrado avisa que no se sumará a ese cierre y permite cancelar', confirms.some(c => /ya está cerrado/.test(c) && /NO se sumará/.test(c)) && E('patients[0].payments.length') === 1);
  confirmAnswer = true; click($('[data-action="finance.savePay"]'));
  check('si el usuario acepta, se guarda, queda fuera del resumen archivado y cuenta en el total del año', E('patients[0].payments.length') === 2 && E('archivosContables[0].totalIngresos') === 40 && E(`Finance.yearLive(${PY}).ingresos`) >= 15);
  E('closeModal()'); E("switchTab('pagos')");
  const delArch = $$('[data-action="finance.deletePayment"]').find(b => /Pago 1/.test(b.closest('.row-item').textContent));
  confirmAnswer = false; confirms.length = 0; click(delArch);
  check('eliminar un pago de un mes cerrado: el aviso muestra concepto, monto, fecha y advierte que el resumen no cambiará', confirms.some(c => /Pago 1/.test(c) && /\$40\.00/.test(c) && /mes ya cerrado/.test(c)) && E('patients[0].payments.length') === 2);
  confirmAnswer = true; click(delArch); check('al confirmar se elimina', E('patients[0].payments.length') === 1);

  // ───────── 10. egresos por clics ─────────
  seed([{ id: 1, name: 'Ana' }]); E("showPage('estadisticas')");
  click($('[data-action="finance.openAddExpense"]'));
  alerts.length = 0; setv('f_ec', '  '); setv('f_em', '10'); click($('[data-action="finance.saveExpense"]'));
  check('egreso sin concepto: aviso (antes se ignoraba en silencio)', alerts.some(a => /concepto es obligatorio/i.test(a)) && E('egresos.length') === 0);
  setv('f_ec', 'Luz'); setv('f_ef', ''); alerts.length = 0; click($('[data-action="finance.saveExpense"]'));
  check('egreso sin fecha válida: aviso y no se guarda', alerts.some(a => /fecha del egreso/i.test(a)) && E('egresos.length') === 0);
  setv('f_ef', E('today()')); setv('f_ecat', 'Servicios'); setv('f_ep', 'CNEL EP'); click($('[data-action="finance.saveExpense"]'));
  check('egreso válido: se guarda, cierra el formulario y aparece en la lista y en «por categoría»', E('egresos.length') === 1 && !modalOpen() && /Luz/.test(main()) && /CNEL EP/.test(main()) && /Servicios/.test(main()));
  confirmAnswer = false; confirms.length = 0; click($('[data-action="finance.deleteExpense"]')); check('eliminar egreso: pide confirmación mostrando qué se elimina; "no" lo conserva', confirms.some(c => /Luz/.test(c) && /\$10\.00/.test(c)) && E('egresos.length') === 1);
  confirmAnswer = true; click($('[data-action="finance.deleteExpense"]')); check('al confirmar se elimina y la pantalla se actualiza', E('egresos.length') === 0 && !/CNEL EP/.test(main()));

  // ───────── 11. cerrar / ver / reabrir desde la pantalla ─────────
  seed([{ id: 1, name: 'Ana', payments: [pay(1, 40, day(PY, PM, 10)), pay(2, 10, day(CY, CM, 1))] }], [eg(1, 15, day(PY, PM, 9))]); E("showPage('estadisticas')");
  click($('[data-action="finance.openCloseMonth"]'));
  check('«Cerrar mes» lista los últimos 12 meses con sus totales y solo ofrece cerrar los que tienen movimientos', /Cerrar y archivar mes/.test(modal()) && $$('#modalContent [data-action="finance.closeMonth"]').length === 2 && /Sin movimientos/.test(modal()));
  const btnPrev = $$('#modalContent [data-action="finance.closeMonth"]').find(b => b.dataset.m === String(PM) && b.dataset.y === String(PY));
  confirmAnswer = false; confirms.length = 0; click(btnPrev);
  check('cerrar un mes muestra el resumen exacto y permite cancelar sin cambios', confirms.some(c => /Ingresos: \$40\.00/.test(c) && /Egresos: \$15\.00/.test(c) && /Utilidad: \$25\.00/.test(c)) && E('archivosContables.length') === 0);
  confirmAnswer = true; alerts.length = 0; click(btnPrev);
  check('al confirmar: se archiva sin recargar la página y la pantalla muestra el resumen anual', E('archivosContables.length') === 1 && alerts.some(a => /cerrado y archivado correctamente/.test(a)) && /Resumen anual/.test(main()) && /TOTAL AÑO/.test(main()) && !modalOpen());
  click($('[data-action="finance.viewArchive"]')); check('«Ver» muestra el detalle archivado con sus pagos y egresos', /Detalle archivado/.test(modal()) && /Ingresos \(1\)/.test(modal()) && /Egresos \(1\)/.test(modal()) && /\$25\.00/.test(modal())); E('closeModal()');
  confirmAnswer = false; confirms.length = 0; click($('[data-action="finance.reopenMonth"]'));
  check('la ✕ del resumen ahora REABRE el mes y explica lo que pasará (1 pago y 1 egreso)', confirms.some(c => /Reabrir/.test(c) && /1 pago y 1 egreso/.test(c)) && E('archivosContables.length') === 1);
  confirmAnswer = true; click($('[data-action="finance.reopenMonth"]'));
  check('al confirmar: el resumen se elimina, los movimientos vuelven a contarse y NO desaparecen de los reportes', E('archivosContables.length') === 0 && E(`Finance.monthData(${PM},${PY}).totalIngresos`) === 40 && E('patients[0].payments[0].archivado') === undefined);

  // ───────── 12. datos hostiles ─────────
  const EV = '<img src=x onerror=window.__xss=1>';
  seed([{ id: 1, name: 'Paciente ' + EV, cedula: 'C' + EV, payments: [pay(1, 20, day(CY, CM, 1), { type: 'Tipo' + EV, concept: 'Concepto' + EV, factPendiente: true })], treatments: [{ id: 1, name: 'Trat ' + EV, cost: 50, status: 'pendiente', date: day(CY, CM, 1) }] }],
    [eg(1, 5, day(CY, CM, 1), { concepto: 'Eg' + EV, categoria: 'Cat' + EV, proveedor: 'Prov' + EV })]);
  E("showPage('estadisticas')"); const bad = () => D.querySelectorAll('#mainContent [onerror], #modalContent [onerror]').length;
  check('SEGURIDAD: Finanzas muestra proveedor, categoría, concepto y paciente hostiles como texto (proveedor y categoría antes se inyectaban)', bad() === 0 && /Prov<img/.test(main()) && /Cat<img/.test(main()), bad());
  E('selectPt(1)'); E("switchTab('pagos')"); check('SEGURIDAD: la pestaña de pagos escapa tipo de pago y concepto', bad() === 0 && /Tipo<img/.test(main()));
  click($('[data-action="finance.printReceipt"]')); const rc = opened[opened.length - 1] || '';
  check('SEGURIDAD: el comprobante impreso escapa tratamientos, tipo, paciente y datos de la clínica', !/<img src=x onerror/.test(rc) && /Trat &lt;img/.test(rc) && /Tipo&lt;img/.test(rc));
  E("document.getElementById('logoText').textContent='Clínica <script>x</script>';clinicaRUC='1<img src=x onerror=1>';clinicaDireccion='Dir <b>x</b>';clinicaTelefono='9<i>'");
  const rc2 = E('Finance.receiptHtml(patients[0].payments[0],patients[0])');
  check('SEGURIDAD: nombre, RUC, dirección y teléfono de la clínica también (antes iban sin escapar)', !/<script>x<\/script>/.test(rc2) && !/<img src=x onerror=1>/.test(rc2) && !/Dir <b>x/.test(rc2) && /Cl&iacute;nica|Clínica &lt;script&gt;/.test(rc2.replace('&#39;', "'")) && /Dir &lt;b&gt;/.test(rc2));
  check('el comprobante ya no usa onclick: sus botones Imprimir/Cerrar se enlazan con un script propio', !/onclick=/.test(rc2) && /id="btnPrint"/.test(rc2) && /id="btnClose"/.test(rc2) && /addEventListener/.test(rc2));
  E("document.getElementById('logoText').textContent='Clínica Prueba';clinicaRUC='';clinicaDireccion='';clinicaTelefono=''");

  // ───────── 13. informes y descargas ─────────
  seed([{ id: 1, name: 'Ana ' + EV, payments: [pay(1, 0.1, day(CY, CM, 1), { type: 'Tipo' + EV }), pay(2, 0.2, day(CY, CM, 2))] }, { id: 2, name: 'Beto', payments: [pay(3, 50, day(CY, CM, 3), { archivado: true })] }], [eg(1, 0.3, day(CY, CM, 4), { concepto: 'Gasto' + EV })]);
  const mr = E(`(()=>{const d=Finance.monthData(${CM},${CY},{includeArchived:true});return Finance.monthlyReportHtml('Mes',d.pagos,d.egresos,d.totalIngresos,d.totalEgresos,d.utilidad,d.pacientes,today())})()`);
  check('informe mensual: totales exactos (ingresos $50.30, egresos $0.30, utilidad +$50.00) y sin decimales largos', /\$50\.30/.test(mr) && /\$0\.30/.test(mr) && /\+\$50\.00/.test(mr) && !/\d\.\d{3,}/.test(mr.replace(/rgba?\([^)]*\)/g, '')));
  check('SEGURIDAD: el informe mensual escapa paciente, concepto y tipo', !/<img src=x onerror/.test(mr) && /Ana &lt;img/.test(mr));
  const origOrder = E('JSON.stringify(patients[0].payments.map(p=>p.id))'); E(`Finance.monthlyReportHtml('x',[{fecha:'2026-10-05'},{fecha:undefined},{fecha:'2026-10-01'}].map(f=>Object.assign({paciente:'a',concepto:'b',monto:1,tipo:'t'},f)),[],3,0,3,1,'2026-10-01')`);
  check('el informe no se cae con una fecha vacía ni reordena los datos originales', E('JSON.stringify(patients[0].payments.map(p=>p.id))') === origOrder);
  confirms.length = 0; downloads.length = 0; blobs.length = 0; E("showPage('estadisticas')"); click($('[data-action="finance.downloadMonthly"]'));
  const mTxt = await blobs[0].text();
  check('«Informe del mes» descarga un .html con el mes completo (incluye lo ya archivado: $50.30)', /^Informe_/.test(downloads[0]) && /\.html$/.test(downloads[0]) && /\$50\.30/.test(mTxt) && !/[\\/:*?"<>|]/.test(downloads[0]), downloads[0]);
  E(`Finance.closeMonth(${CM},${CY})`); E("showPage('estadisticas')"); blobs.length = 0; downloads.length = 0;
  click($('[data-action="finance.downloadAnnual"]')); const yTxt = await blobs[0].text();
  check('informe anual: totales del año exactos y nombre de archivo con el año', /Informe_Anual_/.test(downloads[0]) && new RegExp('Informe_Anual_' + CY).test(downloads[0]) && /TOTAL AÑO/.test(yTxt) && /\$0\.30/.test(yTxt) && !/\d\.\d{3,}/.test(yTxt.replace(/rgba?\([^)]*\)/g, '')) && !/<img src=x onerror/.test(yTxt));
  blobs.length = 0; downloads.length = 0; click($('[data-action="finance.viewArchive"]')); click($('#modalContent [data-action="finance.downloadArchive"]'));
  check('descargar desde el detalle de un mes archivado cierra la ventana', downloads.length === 1 && !modalOpen());

  // ───────── 14. auditoría ─────────
  seed([{ id: 1, name: 'Audit', payments: [pay(9, 10, day(PY, PM, 5))] }, { id: 2, name: 'Otro' }]); E('selectPt(1)'); E("switchTab('pagos')");
  await w.Seguridad._flush(); const n0 = ((await E("idbGet('audit')")) || []).length;
  click($('[data-action="finance.openAddPay"]')); setv('f_pya', 'abc'); click($('[data-action="finance.savePay"]'));        // inválido: no debe anotarse
  setv('f_pya', '8'); setv('f_pyd', E('today()')); click($('[data-action="finance.savePay"]'));                                // válido
  click($('#modalContent [data-action="finance.markInvoiced"]'));
  click($$('[data-action="finance.printReceipt"]')[0]);
  confirmAnswer = false; click($$('[data-action="finance.deletePayment"]')[0]);                                               // cancelado: no debe anotarse
  confirmAnswer = true; click($$('[data-action="finance.deletePayment"]')[0]);
  E("showPage('estadisticas')"); click($('[data-action="finance.openAddExpense"]')); setv('f_ec', 'Luz'); setv('f_em', '5'); setv('f_ef', E('today()')); click($('[data-action="finance.saveExpense"]'));
  click($('[data-action="finance.deleteExpense"]')); click($('[data-action="finance.downloadMonthly"]'));
  E(`Finance.closeMonthUI(${PM},${PY})`); click($('[data-action="finance.reopenMonth"]')); await wait(60); await w.Seguridad._flush();
  const log = ((await E("idbGet('audit')")) || []).slice(n0), has = e => log.some(x => x.ev === e), count = e => log.filter(x => x.ev === e).length;
  check('el registro de actividad anota: pago, facturado, comprobante, eliminar pago, egreso, eliminar egreso, informe, cerrar y reabrir mes', ['Registró pago', 'Marcó pago como facturado', 'Imprimió comprobante', 'Eliminó pago', 'Registró egreso', 'Eliminó egreso', 'Descargó informe mensual', 'Cerró mes', 'Reabrió mes (eliminó su resumen)'].every(has), JSON.stringify(log.map(x => x.ev)));
  check('lo inválido o cancelado NO se anota (1 solo pago registrado, 1 solo pago eliminado)', count('Registró pago') === 1 && count('Eliminó pago') === 1, JSON.stringify(log.map(x => x.ev)));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de Finanzas pasaron'); process.exit(fail ? 1 : 0);
});
