// Arquitectura: el estado de pacientes es PRIVADO de Patients, ya no hay alias globales, todo archivo está precacheado y sin handlers inline.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 400))); };
const ALIAS = ["abrirCorreoBackup", "abrirOdoSnapshot", "abrirResetMes", "addConsent", "addConsentCustom", "addDiagItem", "addMedItem", "addPresupItem", "addPresupItemFromSvc", "applyColor", "applyLogoImg", "aprobarPresupuesto", "buscarCIE10", "cerrarMes", "cie10Cargar", "cie10Init", "clearTooth", "closeTP", "confirmDeletePt", "confirmarAprobacion", "confirmarFirma", "copiarSqlSync", "crearBackupHistorico", "delConsent", "delEgreso", "delPay", "delReceta", "descargarArchivoMes", "descargarBackupLocal", "descargarInformeAnual", "descargarInformeMensual", "diagCieInput", "diagDescInput", "editPt", "eliminarArchivoMes", "eliminarPresupuesto", "enviarRecallWA", "escHtml", "exportarDatos", "filterPts", "firmarConsent", "getDefaultWAMsg", "hideResults", "importarDatos", "imprimirComprobante", "imprimirOdoSnapshot", "imprimirPresupuesto", "imprimirReceta", "jsq", "loadCIE10Full", "marcarContactado", "marcarFacturada", "mostrarHistorialRespaldos", "noContactarRecall", "notifyOdo", "numToLetras", "openAddAppt", "openAddEgreso", "openAddPay", "openDeletePt", "openLogoEdit", "openNewPt", "openNuevaReceta", "openNuevoPresupuesto", "openSbPanel", "openSbSetup", "openSelectConsent", "parseCSV_CIE10", "posponerRecall", "prepararEmailBackup", "reactivarRecall", "recalcPresup", "rechazarPresupuesto", "recordatorioFactura", "removeDiagItem", "renderAgendaPage", "renderCitas", "renderConsentimientos", "renderDashboard", "renderDatos", "renderDiario", "renderEstadisticas", "renderImagenes", "renderOdontograma", "renderPagos", "renderPresupuestos", "renderRecetas", "renderSidebar", "renderTab", "renderTratamientos", "restaurarDesdeHistorial", "runSearch", "saveConsentCustom", "saveEditPt", "saveEgreso", "saveNewPt", "savePay", "savePresupuesto", "saveReceta", "sbAction", "sbConectar", "sbDesconectar", "sbLoadNow", "sbSyncManual", "searchGo", "searchKeyNav", "seleccionarServicioPay", "selectDiag", "selectPt", "setRecallCfg", "setRecallTab", "showDiagResults", "showResults", "switchTab", "syncConfirmarBorrado", "syncRecuperarDeNube", "toggleDarkMode", "verArchivoMes", "verConsent", "verPresupuesto", "verReceta"];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
/* código sin comentarios de bloque ni de línea completa */
const code = f => { let inb = false; return read(f).split('\n').filter(l => { const t = l.trim(); if (inb) { if (t.includes('*/')) inb = false; return false; } if (t.startsWith('/*') && !t.includes('*/')) { inb = true; return false; } return !(t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')); }).join('\n'); };
srv.listen(0, async () => {
  console.log('\nOdontoApp — arquitectura (estado privado, sin alias globales, archivos precacheados)');
  const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
  // 1. estado privado
  const offenders = [];
  jsFiles.filter(f => f !== 'patients.js').forEach(f => code('js/' + f).split('\n').forEach((l, i) => {
    const m = l.match(/(?<![.\w$'"-])(patients|curPt)\b(?![\w'"]|\s*:)/); if (m) offenders.push(f + ':' + (i + 1) + ' ' + l.trim().slice(0, 80));
  }));
  check('NINGÚN módulo (salvo patients.js) toca las variables patients / curPt: todo pasa por Patients.all/current/setAll/setCurrent', offenders.length === 0, offenders.slice(0, 5).join(' | '));
  // 2. sin mapas de alias
  const maps = jsFiles.filter(f => /var L=\{|Object\.keys\(L\)|window\[name\]/.test(code('js/' + f)));
  check('ya no hay mapas de alias (var L={…}, window[name]) en ningún módulo', maps.length === 0, maps.join());
  // 3. handlers inline
  const inl = jsFiles.concat(['index.html']).filter(f => /\son(click|input|change|keydown|keyup|mouseover|mouseout|mouseenter|mouseleave|focus|blur|submit|load|error)\s*=/i.test((f.endsWith('.js') ? code('js/' + f) : read(f)).replace(/window\.onload=function\(\)\{window\.print\(\)\}/g, '')));
  check('ningún archivo del proyecto tiene handlers inline (onclick, onchange…)', inl.length === 0, inl.join());
  // 4. sw.js
  const sw = read('sw.js'), base = (sw.match(/const BASE=\[([^\]]*)\]/) || [, ''])[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  const idx = read('index.html'), tags = [...idx.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => './' + m[1]);
  check('sw.js precachea TODOS los scripts de index.html (si falta uno, la app no abre sin internet)', tags.length >= 14 && tags.every(t => base.includes(t)), tags.filter(t => !base.includes(t)).join());
  check('…y todo lo que precachea existe en disco', base.every(b => b === './' || fs.existsSync(path.join(ROOT, b.replace(/^\.\//, '')))), base.filter(b => b !== './' && !fs.existsSync(path.join(ROOT, b.replace(/^\.\//, '')))).join());
  const own = tags.filter(t => !t.includes('/vendor/'));
  check('el orden de scripts en index.html es (Supabase local) → vault → core → app → … → main', own[0] === './js/vault.js' && own[1] === './js/core.js' && own[2] === './js/app.js' && own[own.length - 1] === './js/main.js' && tags.indexOf(tags.find(t => t.includes('/vendor/'))) < tags.indexOf('./js/core.js'), tags.join());
  // 5. en el navegador
  const errs = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL(`http://localhost:${srv.address().port}/index.html`, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true; } });
  const w = dom.window, E = s => w.eval(s); await wait(2200);
  check('las variables patients y curPt NO existen como globales', E('typeof patients') === 'undefined' && E('typeof curPt') === 'undefined' && !('patients' in w) && !('curPt' in w));
  const left = ALIAS.filter(n => E(`typeof ${n}`) !== 'undefined');
  check('ninguno de los ' + ALIAS.length + ' alias antiguos existe ya como global', left.length === 0, left.join());
  check('lo que SÍ queda global es el armazón: showPage, openModal, closeModal, renderConfiguracion, save, esc…', ['showPage', 'openModal', 'closeModal', 'renderConfiguracion', 'save', 'esc', 'uid', 'today'].every(n => E(`typeof ${n}`) === 'function'));
  // 5b. listas privadas
  const LISTAS = ['egresos', 'facturas', 'quickAppts', 'archivosContables', 'servicios'];
  const glob = LISTAS.filter(n => E(`typeof ${n}`) !== 'undefined' || (n in w));
  check('las 5 listas (egresos, facturas, quickAppts, archivosContables, servicios) NO son globales', glob.length === 0, glob.join());
  const owner = { egresos: 'finance.js', facturas: 'finance.js', archivosContables: 'finance.js', servicios: 'ui.js', quickAppts: 'agenda.js' };
  const fuera = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const KW = /^(return|in|of|new|typeof|else|case|await|void|delete|throw|yield|do|var|let|const)$/;
    for (const n of LISTAS) if (owner[n] !== f) { const re = new RegExp('(^|[^\\w.$\'"])' + n + '(?![\\w:\'"])(?!\\s*:)', 'gm'); let m; while ((m = re.exec(src))) { const t = /([A-Za-zñáéíóú,]+) $/.exec(src.slice(Math.max(0, m.index - 24), m.index + m[1].length)); if (t && !KW.test(t[1])) continue; /* texto visible, no código */ fuera.push(f + ':' + n); break; } }
  }
  check('ningún módulo usa esas listas fuera de su dueño (solo por accesores)', fuera.length === 0, fuera.join());
  // 5c. el texto que ve el usuario no contiene llamadas a la API (error de migración automática: «Facturas y Finance.expenses()»)
  const raros = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js'))) {
    fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').split('\n').forEach((ln, i) => {
      if (/^\s*(\/\/|\*)/.test(ln)) return;
      const re = /([A-Za-zñáéíóú]+) (Finance\.[a-z]+\(\)|Patients\.all\(\)|Services\.list\(\)|Appts\.quick\(\)|Backup\.[a-z]+\(\))( [a-zñáéíóú]|[,:;)]|\.(?![a-zA-Z]))/g; let m;
      while ((m = re.exec(ln))) if (!/^(return|in|of|new|typeof|else|case|await|void|delete|throw|yield|do)$/.test(m[1])) raros.push(f + ':' + (i + 1) + ' «' + m[0] + '»');
    });
  }
  check('ningún texto visible contiene nombres de API («Services.list()», «Finance.expenses()»…)', raros.length === 0, raros.join(' | '));
  // 5d. seguridad del navegador: CSP, sin scripts externos, Supabase local con huella
  const crypto = require('crypto');
  const idxH = read('index.html'), cspM = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(idxH), csp = cspM ? cspM[1] : '';
  const dir = n => ((new RegExp('(?:^|; )' + n + ' ([^;]*)')).exec(csp) || [, ''])[1];
  check('index.html declara una política de seguridad de contenido (CSP)', !!cspM);
  check('CSP: los scripts solo pueden venir de la propia app (sin unsafe-inline ni unsafe-eval)', /^'self'$/.test(dir('script-src').trim()) && !/unsafe/.test(dir('script-src')));
  check('CSP: sin plugins, sin <base> ajeno y sin envío de formularios', dir('object-src') === "'none'" && dir('base-uri') === "'none'" && dir('form-action') === "'none'");
  check('CSP: la conexión a internet solo se permite a Supabase', /^'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co$/.test(dir('connect-src').trim()));
  check('index.html no carga ningún script de internet', ![...idxH.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].some(m => /^(https?:)?\/\//.test(m[1])));
  check('index.html no tiene scripts en línea', ![...idxH.matchAll(/<script(?![^>]*\ssrc=)[^>]*>/g)].length);
  const sbTag = /<script src="(js\/vendor\/supabase-[\d.]+\.js)" integrity="sha384-([^"]+)"/.exec(idxH);
  check('Supabase va con versión exacta, copia local y huella SHA-384 que coincide con el archivo', !!sbTag && crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, sbTag[1]))).digest('base64') === sbTag[2], sbTag && sbTag[1]);
  const conScript = fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js') && /<script/i.test(fs.readFileSync(path.join(ROOT, 'js', x), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')));
  check('ningún módulo genera <script> en línea (los documentos de impresión se enlazan con wirePrint)', conScript.length === 0, conScript.join());
  // 5e. contadores privados (Counters)
  const CONT = ['nextId', 'nextEgId', 'nextFactId', 'nextRecetaId', 'nextPresupId'];
  check('los 5 contadores (nextId, nextEgId…) NO son variables globales', CONT.every(n => E(`typeof ${n}`) === 'undefined' && !(n in w)), CONT.filter(n => E(`typeof ${n}`) !== 'undefined').join());
  const sueltos = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
    const re = /(^|[^.\w$'"`])(next(?:Id|EgId|FactId|RecetaId|PresupId))\b(?!\s*:)/g; let m; while ((m = re.exec(src))) sueltos.push(f + ':' + m[2]);
  }
  check('ningún módulo usa los contadores como variables sueltas (solo Counters.get/take/set…)', sueltos.length === 0, sueltos.join());
  E("Counters.reset()");
  check('Counters: arrancan en 1; take() devuelve el actual y avanza; get() no avanza', E("Counters.get('nextId')") === 1 && E("Counters.take('nextId')") === 1 && E("Counters.take('nextId')") === 2 && E("Counters.get('nextId')") === 3);
  check('set() acepta enteros ≥ 1 y rechaza 0, negativos, decimales, texto, null y NaN (el valor no cambia)', E("Counters.set('nextEgId',7)") === true && ['0', '-3', '2.5', "'abc'", 'null', 'NaN', 'undefined', 'Infinity', '1e300'].every(v => E(`Counters.set('nextEgId',${v})`) === false) && E("Counters.get('nextEgId')") === 7);
  check('set() acepta un número escrito como texto («12»)', E("Counters.set('nextEgId','12')") === true && E("Counters.get('nextEgId')") === 12);
  check('raiseTo() solo sube; nunca baja', E("Counters.raiseTo('nextFactId',50)") === 50 && E("Counters.raiseTo('nextFactId',10)") === 50 && E("Counters.raiseTo('nextFactId','x')") === 50);
  check('un contador desconocido da error claro (no crea variables nuevas)', E("(()=>{try{Counters.get('otro');return 'no'}catch(e){return /desconocido/.test(e.message)}})()") === true && E("(()=>{try{Counters.set('__proto__',5);return 'no'}catch(e){return true}})()") === true);
  check('merge() fija solo los válidos; maxWith() sube al mayor; ambos ignoran basura', (E("Counters.reset();Counters.merge({nextId:9,nextEgId:'x',nextFactId:-1,nextRecetaId:4.5,nextPresupId:'6'})"), E("JSON.stringify(Counters.all())") === '{"nextId":9,"nextEgId":1,"nextFactId":1,"nextRecetaId":1,"nextPresupId":6}') && (E("Counters.maxWith({nextId:3,nextEgId:20,nextFactId:'z'});Counters.merge(null);Counters.maxWith('texto')"), E("JSON.stringify(Counters.all())") === '{"nextId":9,"nextEgId":20,"nextFactId":1,"nextRecetaId":1,"nextPresupId":6}'));
  check('all() devuelve una copia: cambiarla no cambia los contadores; KEYS tampoco se altera desde fuera', E("const c=Counters.all();c.nextId=999;Counters.get('nextId')") === 9 && E("Counters.KEYS.push('x');Counters.KEYS.length") === 6 && E("Object.keys(Counters.all()).length") === 5);
  E("Counters.merge({nextId:12,nextEgId:13,nextFactId:14,nextRecetaId:15,nextPresupId:16}); saveNow()"); await wait(300);
  const guardado = await E("idbGet('state')");
  check('los 5 contadores viajan en el estado guardado (con los mismos nombres de siempre)', CONT.every((n, i) => guardado[n] === 12 + i), JSON.stringify(CONT.map(n => guardado[n])));
  check('…y en el paquete de sincronización y en la copia de seguridad', JSON.stringify(E("buildPayload().data.nextPresupId")) === '16' && E("Backup.snapshot().nextRecetaId") === 15, E("Backup.snapshot().nextRecetaId"));
  w.confirm = () => true; E("factoryReset()"); await wait(400);
  check('«Restablecer de fábrica» reinicia TODOS los contadores (antes dejaba el de presupuestos); solo avanzan los de los datos de ejemplo', E("JSON.stringify(Counters.all())") === '{"nextId":3,"nextEgId":4,"nextFactId":1,"nextRecetaId":1,"nextPresupId":1}', E("JSON.stringify(Counters.all())"));
  // 6. API de estado
  E("Patients.setAll([{id:1,name:'A'},{id:2,name:'B'}])");
  check('setAll reemplaza la lista y all() la devuelve', E('Patients.all().length') === 2 && E('Patients.all()[1].name') === 'B');
  E("Patients.setCurrent(Patients.all()[0])"); check('setCurrent / current', E('Patients.current().name') === 'A');
  E("Patients.setAll([{id:9,name:'Otro'}])"); check('si el paciente abierto ya no está en la lista nueva, se cierra (no queda un fantasma)', E('Patients.current()') === null);
  E("Patients.setAll('basura')"); check('setAll con algo que no es lista deja una lista vacía (no rompe)', Array.isArray(E('Patients.all()')) && E('Patients.all().length') === 0);
  E("Patients.setCurrent(undefined)"); check('setCurrent(undefined) equivale a «ninguno»', E('Patients.current()') === null);
  E("Patients.setAll([{id:5,name:'Z',treatments:[],payments:[],appointments:[],diary:[],images:[],consents:[],recetas:[],presupuestos:[],odoHistory:[],surfData:{},wholeData:{}}]); Patients.select(5)");
  check('seleccionar un paciente lo deja abierto y la ficha se dibuja', E('Patients.current().id') === 5 && /Z/.test(w.document.getElementById('mainContent').textContent));
  check('sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  const bad = results.filter(x => !x).length; console.log(bad ? `\n✘ ${bad} comprobación(es) fallaron` : `\n✔ Todas las pruebas de arquitectura pasaron (${results.length} comprobaciones)`);
  w.close(); srv.close(); process.exit(bad ? 1 : 0);
});
