// Inyección de HTML (XSS): siembra datos hostiles en TODOS los textos libres, recorre todas las pantallas, pestañas, ventanas e
// impresiones, y exige 0 elementos inyectados. También comprueba que el texto normal (con & ' " <) se vea bien, sin doble escapado.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 600))); };

// Sale de cualquier texto libre: cierra un atributo (") y abre un elemento con onerror. Sirve para atributos y para contenido.
const P = '"><img src=x onerror=window.__xss=1>';
const RAW = /<img src=x onerror/g;

srv.listen(0, async () => {
  console.log('\nOdontoApp — inyección de HTML (XSS)');
  const errs = []; const opened = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); }); vc.on('error', () => {});
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true; w.open = () => ({ document: { write: t => opened.push(String(t)), close() {} } }); } });
  await wait(1800); const w = dom.window, D = w.document, E = s => w.eval(s);
  const d = E('today()');
  const STRUCT = ['id', 'data', 'surfData', 'wholeData', 'date', 'fecha', 'time', 'hora', 'mes', 'anio', 'fechaFirma', 'fechaAprobacion', 'fechaCierre', 'templateId'];   // formatos que la app necesita para dibujar
  const ENUMS = ['status', 'estado', 'tipo', 'type', 'tooth', 'categoria'];                                                                                                 // valores de listas fijas
  const hostile = (o, key, skip) => { if (Array.isArray(o)) return o.map(x => hostile(x, key, skip)); if (o && typeof o === 'object') { const r = {}; Object.keys(o).forEach(k => { r[k] = skip.includes(k) ? o[k] : hostile(o[k], k, skip); }); return r; } return (typeof o === 'string' && !skip.includes(key)) ? 'H_' + key + P : o; };
  const spec = (n, fecha) => ({ id: n, name: 'x', cedula: 'x', phone: '0991234567', birthdate: '1990-01-01', email: 'a@b.co', alergias: 'x', antecedentes: 'x',
    diary: [{ id: 1, date: fecha, title: 'x', body: 'x', tipo: 'x' }],
    treatments: [{ id: 1, name: 'x', tooth: '11', cost: 5, status: 'pendiente', date: fecha, notes: 'x', diagnostico: 'x' }, { id: 2, name: 'x', tooth: '12', cost: 5, status: 'realizado', date: fecha }],
    payments: [{ id: 1, amount: 5, date: fecha, type: 'Efectivo', concept: 'x', factPendiente: true }],
    appointments: [{ id: 1, date: fecha, time: '09:00', status: 'pendiente', reason: 'x', notes: 'x' }, { id: 2, date: fecha, time: '10:00', status: 'completada', reason: 'x', notes: 'x' }],
    images: [{ id: 1, name: 'x', date: fecha, data: 'data:image/jpeg;base64,AAAA', notes: 'x' }],
    consents: [{ id: 1, templateId: 'custom', titulo: 'x', texto: 'x', fecha, firmado: true, fechaFirma: fecha, nombrePaciente: 'x', nombreRepresentante: 'x', cedulaRepresentante: 'x' }, { id: 2, templateId: 'custom', titulo: 'x', texto: 'x', fecha, firmado: false, nombrePaciente: 'x' }],
    recetas: [{ id: 1, fecha, tipo: 'agudo', medico: 'x', especialidad: 'x', registro: 'x', hc: 'x', diagnosticos: [{ cod: 'x', desc: 'x' }], cie10cod: 'x', diagnostico: 'x', indicaciones: 'x', paciente: 'x', cedula: 'x', edad: 30,
      medicamentos: [{ nombre: 'x', formaFarmaceutica: 'x', concentracion: 'x', via: 'x', cantidadNum: '1', cantidadLetras: 'x', dosis: 'x', frecuencia: 'x', duracion: 'x', indicaciones: 'x', indicacion: 'x' }] }],
    presupuestos: [{ id: 1, fecha, validez: 30, observaciones: 'x', items: [{ nombre: 'x', precio: 5, qty: 1, subtotal: 5 }], descuento: 0, subtotal: 5, total: 5, estado: 'aprobado', firmaPaciente: 'x' }, { id: 2, fecha, validez: 30, observaciones: 'x', items: [{ nombre: 'x', precio: 5, qty: 1, subtotal: 5 }], descuento: 0, subtotal: 5, total: 5, estado: 'borrador', firmaPaciente: '' }],
    odoHistory: [{ id: 1, label: 'x', fecha, hora: '10:00', notas: 'x', surfData: {}, wholeData: {} }] });
  const setSetting = () => { E(`document.getElementById('logoText').textContent=${JSON.stringify('Clínica' + P)};document.getElementById('logoProfesional').textContent=${JSON.stringify('Dr' + P)};
    clinicaRUC=${JSON.stringify('1' + P)};clinicaDireccion=${JSON.stringify('Dir' + P)};clinicaTelefono=${JSON.stringify('9' + P)};logoImg=${JSON.stringify('x' + P)};MEDICAMENTOS_COMUNES=[${JSON.stringify('Amoxicilina' + P)}];`); };
  const seedAll = skip => {
    const j = o => 'JSON.parse(' + JSON.stringify(JSON.stringify(o)) + ')';
    E(`patients.length=0;egresos.length=0;archivosContables.length=0;servicios.length=0;quickAppts.length=0;
      patients.push(Patients.blank(${j(hostile(spec(1, d), '', skip))}));patients.push(Patients.blank(${j(hostile(spec(2, d), '', skip))}));
      egresos.push(${j(hostile({ id: 1, concepto: 'x', categoria: 'Otro', monto: 5, fecha: d, proveedor: 'x' }, '', skip))});
      servicios.push(${j(hostile({ id: 1, nombre: 'x', precio: 5 }, '', skip))});
      quickAppts.push(${j(hostile({ id: 'q1', ptName: 'x', reason: 'x', notes: 'x', date: d, time: '10:00', status: 'pendiente', phone: 'x' }, '', skip))});
      archivosContables.push(${j(hostile({ id: 5, mes: 0, anio: 2026, label: 'x', fechaCierre: d, totalIngresos: 5, totalEgresos: 1, utilidad: 4, pagos: [{ paciente: 'x', concepto: 'x', monto: 5, fecha: d, tipo: 'x' }], egresos: [{ concepto: 'x', categoria: 'x', monto: 1, fecha: d }] }, '', skip))});
      curPt=patients[0];`);
    setSetting();
  };

  const fails = []; let probes = 0, threw = 0;
  const bad = () => D.querySelectorAll('[onerror]').length;
  const reset = () => { try { E('closeModal()'); } catch (e) {} D.querySelectorAll('[onerror]').forEach(e => e.remove()); try { E('selectPt(1)'); } catch (e) {} D.querySelectorAll('[onerror]').forEach(e => e.remove()); };
  const probe = (label, fn) => {
    probes++; const before = opened.length; let ret, threwNow = false;
    try { ret = fn(); } catch (e) { threw++; threwNow = true; }
    const n = bad() + (typeof ret === 'string' ? (ret.match(RAW) || []).length : 0) + opened.slice(before).join('').split('').length * 0 + (opened.slice(before).join('').match(RAW) || []).length;
    if (process.env.DEBUG_PROBE && label.includes(process.env.DEBUG_PROBE)) console.log('   [debug]', label, 'inyecciones=' + n, threwNow ? 'LANZÓ ERROR' : 'ok', 'modal abierto=' + D.getElementById('modalOverlay').classList.contains('show'));
    if (n && process.env.DEBUG_CTX && label.includes(process.env.DEBUG_CTX)) { const h = opened.slice(before).join(''); let m; const re = /<img src=x onerror/g; let k = 0; while ((m = re.exec(h)) && k++ < 3) console.log('   [contexto]', label, '→', JSON.stringify(h.slice(Math.max(0, m.index - 90), m.index + 40))); }
    if (n) fails.push({ label, n }); reset(); return threwNow;
  };
  const natives = n => /\[native code\]/.test(Function.prototype.toString.call(E('window.' + n)));
  const fnNames = (re) => E('Object.getOwnPropertyNames(window)').filter(n => re.test(n) && E(`typeof window.${n}`) === 'function' && !natives(n));

  const pass = (name, skip) => {
    fails.length = 0; probes = 0; threw = 0; seedAll(skip); reset();
    ['datos', 'diario', 'odontograma', 'tratamientos', 'pagos', 'citas', 'imagenes', 'consentimientos', 'recetas', 'presupuestos'].forEach(t => probe('pestaña ' + t, () => E(`switchTab('${t}')`)));
    ['dashboard', 'estadisticas', 'recordatorios', 'configuracion'].forEach(p => probe('página ' + p, () => E(`showPage('${p}')`)));
    ['month', 'week', 'list'].forEach(v => probe('agenda ' + v, () => { E(`calView='${v}'`); E("showPage('agenda')"); }));
    E("calView='month'");
    ['H_', 'x', 'Amox', 'img'].forEach(q => probe('buscador "' + q + '"', () => E(`runSearch(${JSON.stringify(q)})`)));
    // toda función que dibuja o abre algo, sin argumentos y con el id 1 / una fecha (se excluyen las que guardan o borran)
    const names = fnNames(/^(render|ver|open|edit|show|view|abrir)[A-Z]/);
    names.forEach(n => [[''], ['1'], [JSON.stringify(d)]].forEach(a => probe(n + '(' + a[0] + ')', () => E(`window.${n}(${a[0]})`))));
    // impresiones: se abre cada detalle y se imprime
    const prints = fnNames(/^imprimir[A-Z]/);
    const opens = ['', ...fnNames(/^(ver|abrir)[A-Z]/).map(n => n)];
    opens.forEach(o => prints.forEach(p => ['', '1'].forEach(a => probe((o ? o + '(1) → ' : '') + p + '(' + a + ')', () => { if (o) E(`window.${o}(1)`); return E(`window.${p}(${a})`); }))));
    const grouped = {}; fails.forEach(f => { const k = f.label.split(' → ').pop().replace(/\(.*\)$/, '').trim(); grouped[k] = Math.max(grouped[k] || 0, f.n); });
    const summary = Object.keys(grouped).sort().map(k => k + ' ×' + grouped[k]).join(', ');
    check(name + ': 0 elementos inyectados en ' + probes + ' pantallas, pestañas, ventanas e impresiones (' + (names.length) + ' funciones de dibujo, ' + prints.length + ' de impresión)', fails.length === 0, Object.keys(grouped).length + ' superficies con inyección → ' + summary);
    return { probes, threw, names: names.length, prints: prints.length };
  };

  const A = pass('Modo ESTRICTO (casi todo hostil, incluso estados y tipos)', STRUCT);
  const B = pass('Modo ESTRUCTURADO (estados y tipos válidos; así se dibujan todas las ramas)', STRUCT.concat(ENUMS));
  const C = pass('Modo FECHAS Y HORAS hostiles (también date, fecha, time y hora; así se prueban los onclick)', ['id', 'data', 'surfData', 'wholeData', 'templateId']);
  check('el barrido es de verdad amplio: más de 150 sondas y al menos 40 funciones de dibujo recorridas', A.probes > 150 && A.names >= 40 && B.probes > 150, JSON.stringify([A, B]));
  check('la mayoría de las sondas se ejecutaron sin lanzar errores (si no, el "0 inyecciones" sería engañoso)', B.threw < B.probes * 0.35, `${B.threw} de ${B.probes} lanzaron error`);

  // ───────── el texto normal se ve bien (sin doble escapado) ─────────
  const N = { medico: "Dra. Ríos & O'Neil \"Jr\"", diag: 'Dolor <10 & fiebre', obs: "Control 'mensual' & revisión" };
  setSettingNormal();
  function setSettingNormal() { E(`document.getElementById('logoText').textContent=${JSON.stringify("Clínica O'Neil & Hijos")};clinicaRUC='1790012345001';clinicaDireccion='Av. 6 de Dic. & Colón';clinicaTelefono='02-2345678';logoImg='';MEDICAMENTOS_COMUNES=['Amoxicilina 500 mg','Ibuprofeno & paracetamol'];`); }
  E(`patients.length=0;egresos.length=0;archivosContables.length=0;servicios.length=0;quickAppts.length=0;
     patients.push(Patients.blank({id:1,name:"Ana O'Neil & Co",cedula:'1712345678',phone:'0991234567',
      recetas:[{id:1,fecha:'${d}',tipo:'agudo',medico:${JSON.stringify(N.medico)},especialidad:'Odontología & cirugía',registro:'R-1',hc:'H-1',diagnosticos:[{cod:'K02',desc:${JSON.stringify(N.diag)}}],cie10cod:'K02',diagnostico:${JSON.stringify(N.diag)},indicaciones:${JSON.stringify(N.obs)},paciente:"Ana O'Neil & Co",cedula:'1712345678',edad:30,medicamentos:[{nombre:'Ibuprofeno & paracetamol',formaFarmaceutica:'Tableta',concentracion:'400 mg',via:'Oral',cantidadNum:'10',cantidadLetras:'diez',dosis:'1',frecuencia:'Cada 8 horas',duracion:'3 días',indicaciones:'Con "alimentos" & agua'}]}],
      presupuestos:[{id:1,fecha:'${d}',validez:30,observaciones:${JSON.stringify(N.obs)},items:[{nombre:"Resina & pulido <molar>",precio:30,qty:1,subtotal:30}],descuento:0,subtotal:30,total:30,estado:'aprobado',firmaPaciente:''}],
      odoHistory:[{id:1,label:"Control 'inicial' & revisión",fecha:'${d}',hora:'10:00',notas:'Caries <1mm & placa',surfData:{},wholeData:{}}]}));curPt=patients[0];`);
  const modalOpenNow = () => D.getElementById('modalOverlay').classList.contains('show');
  const txt = () => D.getElementById('mainContent').textContent + ' ' + ((D.getElementById('modalContent') || {}).textContent || '');
  E('selectPt(1)'); E("switchTab('recetas')"); const tRec = txt();
  check('recetas: el médico, el diagnóstico y los medicamentos con & \' " < se leen tal cual', tRec.includes(N.medico) && tRec.includes('Ibuprofeno & paracetamol') && !/&amp;|&quot;|&#39;/.test(tRec), tRec.slice(0, 300));
  E('verReceta(1)'); const tVer = txt(); const modalTxt = (D.getElementById('modalContent') || {}).textContent || '';
  check('detalle de receta: sin doble escapado ("&amp;" literal) y con el texto completo', tVer.includes(N.diag) && tVer.includes(N.obs) && !/&amp;|&lt;|&quot;|&#39;/.test(tVer), JSON.stringify({ diag: tVer.includes(N.diag), indic: tVer.includes(N.obs), entidades: (tVer.match(/&amp;|&lt;|&quot;|&#39;/g) || []), modalAbierto: modalOpenNow(), modal: modalTxt.slice(0, 700) }));
  const o0 = opened.length; E('imprimirReceta()'); const hRec = opened.slice(o0).join('');
  check('receta impresa: texto escapado UNA vez (&amp; una sola vez, nunca &amp;amp;) y datos de la clínica correctos', /Ibuprofeno &amp; paracetamol/.test(hRec) && !/&amp;amp;|&amp;lt;|&amp;quot;/.test(hRec) && /Dir|Av\. 6 de Dic\. &amp; Colón/.test(hRec) && /Clínica O&#39;Neil &amp; Hijos/.test(hRec), hRec.match(/.{40}Ibuprofeno.{40}/)?.[0]);
  E("switchTab('presupuestos')"); const tPre = txt(); check('presupuestos: nombres con & < > se leen tal cual', tPre.includes('Resina & pulido <molar>') && !/&amp;|&lt;/.test(tPre), tPre.slice(0, 300));
  E('verPresupuesto(1)'); const tVp = txt(); check('detalle de presupuesto: sin doble escapado', tVp.includes('Resina & pulido <molar>') && !/&amp;|&lt;/.test(tVp));
  const o1 = opened.length; E('imprimirPresupuesto()'); const hPre = opened.slice(o1).join(''); check('presupuesto impreso: escapado una sola vez', /Resina &amp; pulido &lt;molar&gt;/.test(hPre) && !/&amp;amp;|&amp;lt;/.test(hPre), hPre.match(/.{30}Resina.{40}/)?.[0]);
  E("switchTab('odontograma')"); const tOdo = txt(); check('odontograma: la etiqueta y las notas del registro guardado se leen tal cual', tOdo.includes("Control 'inicial' & revisión") && !/&amp;|&#39;/.test(tOdo), tOdo.slice(0, 200));
  const o2 = opened.length; E('abrirOdoSnapshot(1)'); E('imprimirOdoSnapshot(1)'); const hOdo = opened.slice(o2).join('');
  check('odontograma impreso: etiqueta y notas escapadas una sola vez', /Control &#39;inicial&#39; &amp; revisión/.test(hOdo) && /Caries &lt;1mm &amp; placa/.test(hOdo) && !/&amp;amp;/.test(hOdo), hOdo.slice(0, 200));

  check('sin errores de JavaScript sin capturar durante todo el recorrido', errs.length === 0, errs.slice(0, 3).join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de inyección de HTML pasaron'); process.exit(fail ? 1 : 0);
});
