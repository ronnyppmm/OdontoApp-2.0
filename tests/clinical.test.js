// Módulo Clínica: consentimientos, CIE-10, recetas y presupuestos (datos, validación, flujos por clic, impresiones, auditoría).
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 400))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

srv.listen(0, async () => {
  console.log('\nOdontoApp — módulo Clínica');
  const errs = [], alerts = [], confirms = [], opened = []; let confirmAnswer = true;
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 220)); }); vc.on('error', () => {});
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = m => { confirms.push(String(m)); return confirmAnswer; };
      w.open = () => ({ document: { write: t => opened.push(String(t)), close() {} } }); w.TextDecoder = require('util').TextDecoder; } });
  await wait(1800); const w = dom.window, D = w.document, E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const input = (el, val) => { el.value = val; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const setv = (id, val) => { let e = D.getElementById(id); if (!e) { e = D.createElement('input'); e.id = id; D.body.appendChild(e); } e.value = val; };
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const main = () => D.getElementById('mainContent').textContent;
  const d = E('today()'), pastDay = E("sumarDias(today(),-3)"), future = E("sumarDias(today(),5)");
  const seed = (extra) => { w.__x = JSON.parse(JSON.stringify(extra || {})); E("Patients.all().length=0;Patients.all().push(Patients.blank(Object.assign({id:1,name:'Ana López',cedula:'1712345678',birthdate:'1990-05-17'},__x)));Patients.setCurrent(Patients.all()[0]);nextRecetaId=1;nextPresupId=1;nextId=2;saveNow();Patients.select(1);"); };
  const lastOpened = () => opened[opened.length - 1] || '';

  // ───────── 1. estructura ─────────
  const src = read('js/clinical.js');
  check('clinical.js ya no tiene ningún handler inline (onclick, oninput, onmouseover…)', !/\son(click|input|change|keydown|focus|blur|mouseenter|mouseleave|mousedown|mouseover|mouseout)\s*=/i.test(src));
  const legacy = ['renderConsentimientos', 'openSelectConsent', 'addConsent', 'addConsentCustom', 'saveConsentCustom', 'verConsent', 'firmarConsent', 'confirmarFirma', 'delConsent', 'cie10Init', 'loadCIE10Full', 'cie10Cargar', 'buscarCIE10', 'parseCSV_CIE10',
    'renderRecetas', 'openNuevaReceta', 'addMedItem', 'addDiagItem', 'removeDiagItem', 'diagCieInput', 'diagDescInput', 'showDiagResults', 'selectDiag', 'saveReceta', 'delReceta', 'verReceta', 'imprimirReceta', 'numToLetras',
    'renderPresupuestos', 'openNuevoPresupuesto', 'addPresupItem', 'addPresupItemFromSvc', 'recalcPresup', 'savePresupuesto', 'verPresupuesto', 'aprobarPresupuesto', 'confirmarAprobacion', 'rechazarPresupuesto', 'eliminarPresupuesto', 'imprimirPresupuesto'];
  check('los ' + legacy.length + ' nombres antiguos YA NO existen como globales', legacy.every(n => E(`typeof ${n}`) === 'undefined'), legacy.filter(n => E(`typeof ${n}`) !== 'undefined').join());
  check('los catálogos se conservaron intactos (8 plantillas de consentimiento, 185 diagnósticos CIE-10, 16 medicamentos de catálogo, 19 comunes)', E('CONSENT_TEMPLATES.length') === 8 && E('CIE10_ODO.length') === 185 && E('CATALOGO_MEDS.length') === 16 && E('MEDICAMENTOS_COMUNES.length') === 19);

  // ───────── 2. consentimientos: datos ─────────
  seed();
  const cc = f => JSON.parse(JSON.stringify(E(`Consents.checkSign(${JSON.stringify(f)})`)));
  const good = { nombre: '  Ana   López ', representante: '', fecha: d };
  check('firma: nombre y fecha obligatorios, fecha real y no futura; se limpian los espacios', cc(good).ok && cc(good).clean.nombre === 'Ana López' && !cc({ ...good, nombre: '  ' }).ok && !cc({ ...good, fecha: '' }).ok && !cc({ ...good, fecha: '2026-02-30' }).ok && /futura/.test(cc({ ...good, fecha: future }).error) && !cc({ ...good, nombre: 'x'.repeat(121) }).ok);
  const cu = f => JSON.parse(JSON.stringify(E(`Consents.checkCustom(${JSON.stringify(f)})`)));
  check('consentimiento personalizado: título y texto obligatorios, título ≤120', !cu({ titulo: '', texto: 'x' }).ok && !cu({ titulo: 'T', texto: '  ' }).ok && !cu({ titulo: 'x'.repeat(121), texto: 'x' }).ok && cu({ titulo: ' T ', texto: ' cuerpo ' }).clean.titulo === 'T');
  const c1 = E("Consents.addFromTemplate(1,'extraccion')");
  check('desde una plantilla: copia el texto en ese momento, queda sin firmar y asignado al paciente', c1.titulo === E("CONSENT_TEMPLATES.find(t=>t.id==='extraccion').titulo") && c1.texto === E("CONSENT_TEMPLATES.find(t=>t.id==='extraccion').texto") && c1.firmado === false && c1.nombrePaciente === 'Ana López' && E('Consents.addFromTemplate(1,"no-existe")') === null && E("Consents.addFromTemplate(999,'extraccion')") === null);
  check('firmar: guarda fecha y firmantes; una segunda firma NO pisa la primera (p. ej. otro dispositivo)', E(`Consents.sign(1,${c1.id},{nombre:'Ana López',representante:'',fecha:'${d}'})`).ok && E(`Consents.sign(1,${c1.id},{nombre:'Otra persona',representante:'',fecha:'${pastDay}'})`).error === 'signed' && E(`Consents.find(Patients.all()[0],${c1.id}).nombrePaciente`) === 'Ana López' && E('Consents.sign(1,12345,{nombre:"x",representante:"",fecha:"' + d + '"})').error === 'notfound');
  check('eliminar: quita solo ese consentimiento', E(`Consents.remove(1,${c1.id}).id`) === c1.id && E('Patients.all()[0].consents.length') === 0 && E('Consents.remove(1,1)') === null);

  // ───────── 3. consentimientos: pantalla ─────────
  seed(); E("Ficha.tab('consentimientos')");
  click($('[data-action="consents.openSelect"]'));
  check('«Nuevo consentimiento» abre el selector con las 8 plantillas y la opción personalizada', $$('#modalContent [data-action="consents.add"]').length === 8 && !!$('#modalContent [data-action="consents.openCustom"]'));
  click($$('#modalContent [data-action="consents.add"]').find(b => b.dataset.id === 'endodoncia'));
  check('elegir una plantilla crea el consentimiento, cierra el selector y lo muestra en la lista', E('Patients.all()[0].consents.length') === 1 && E('Patients.all()[0].consents[0].templateId') === 'endodoncia' && !modalOpen() && /Sin firmar|Pendiente|ENDODONCIA|Endodoncia/i.test(main()), main().slice(0, 200));
  click($('[data-action="consents.openSelect"]')); click($('#modalContent [data-action="consents.openCustom"]'));
  alerts.length = 0; setv('f_ctit', ''); setv('f_ctxt', ''); click($('[data-action="consents.saveCustom"]'));
  check('personalizado sin título ni texto: aviso y no se crea', alerts.some(a => /título y el texto/i.test(a)) && E('Patients.all()[0].consents.length') === 1);
  setv('f_ctit', 'Consentimiento <b>especial</b> & más'); setv('f_ctxt', 'Texto del consentimiento.\nSegunda línea.'); click($('[data-action="consents.saveCustom"]'));
  check('personalizado válido: se crea con el título tal cual (sin interpretar HTML) y cierra el formulario', E('Patients.all()[0].consents.length') === 2 && E('Patients.all()[0].consents[1].titulo') === 'Consentimiento <b>especial</b> & más' && !modalOpen() && !$('#mainContent b') && /Consentimiento <b>especial<\/b> & más/.test(main()));
  const cid = E('Patients.all()[0].consents[0].id');
  click($(`[data-action="consents.view"][data-id="${cid}"]`));
  check('«Ver» muestra el documento con su texto', modalOpen() && /endodoncia/i.test(modal()) && !!$('#modalContent [data-action="consents.openSign"]'));
  click($('#modalContent [data-action="consents.openSign"]'));
  check('«Marcar como firmado» desde el detalle abre el formulario de firma y se queda abierto (antes se cerraba al instante)', modalOpen() && /Registrar firma/.test(modal()) && !!D.getElementById('f_ffirma'), modal().slice(0, 150));
  alerts.length = 0; setv('f_ffirma', ''); setv('f_fnpac', ''); click($('[data-action="consents.confirmSign"]'));
  check('firmar con fecha y nombre vacíos se rechaza con aviso (antes se aceptaba y quedaba sin fecha ni nombre)', alerts.length === 1 && E(`Consents.find(Patients.all()[0],${cid}).firmado`) === false, alerts.join('|'));
  setv('f_ffirma', future); setv('f_fnpac', 'Ana López'); alerts.length = 0; click($('[data-action="consents.confirmSign"]'));
  check('firmar con fecha futura se rechaza', /futura/.test(alerts.join()) && E(`Consents.find(Patients.all()[0],${cid}).firmado`) === false);
  setv('f_ffirma', d); setv('f_fnpac', '  Ana   López  '); setv('f_fnrep', 'Luis López'); click($('[data-action="consents.confirmSign"]'));
  const signed = E(`Consents.find(Patients.all()[0],${cid})`);
  check('firma válida: queda firmado con fecha, firmante y representante, y el modal se cierra', signed.firmado && signed.fechaFirma === d && signed.nombrePaciente === 'Ana López' && signed.nombreRepresentante === 'Luis López' && !modalOpen());
  // otro dispositivo ya lo firmó: confirmar de nuevo no pisa
  E(`Consents.openSign(${cid})`); alerts.length = 0; E(`Consents.find(Patients.all()[0],${cid}).nombrePaciente='Firmante original'`); setv('f_ffirma', d); setv('f_fnpac', 'Intruso'); click($('[data-action="consents.confirmSign"]'));
  check('si ya estaba firmado, avisa y NO cambia la firma existente', /ya fue firmado/.test(alerts.join()) && E(`Consents.find(Patients.all()[0],${cid}).nombrePaciente`) === 'Firmante original');
  click($(`[data-action="consents.view"][data-id="${cid}"]`)); opened.length = 0; click($('#modalContent [data-action="consents.print"]'));
  const ph = lastOpened();
  check('imprimir abre un documento propio con título, paciente, texto, firmante y fecha (antes imprimía la página de detrás porque la hoja de impresión oculta la ventana)', /Consentimiento — /.test(ph) && /Ana López/.test(ph) && /Firmante original/.test(ph) && new RegExp('Firmado el').test(ph) && /ENDODONCIA|Endodoncia/i.test(ph), ph.slice(0, 200));
  check('el documento impreso no usa onclick (sus botones se enlazan con un script propio)', !/onclick=/.test(ph) && /id="btnPrint"/.test(ph) && /addEventListener/.test(ph));
  confirmAnswer = false; confirms.length = 0; click($(`[data-action="consents.delete"][data-id="${cid}"]`)) ;
  E('closeModal()'); E("Ficha.tab('consentimientos')"); click($(`[data-action="consents.delete"][data-id="${cid}"]`));
  check('eliminar un consentimiento FIRMADO advierte que es un documento legal y que se pierde la firma; "no" lo conserva', confirms.some(c => /FIRMADO/.test(c) && /documento legal/.test(c)) && E('Patients.all()[0].consents.length') === 2);
  const cu2 = E('Patients.all()[0].consents[1].id'); confirms.length = 0; confirmAnswer = true; click($(`[data-action="consents.delete"][data-id="${cu2}"]`));
  check('eliminar uno sin firmar usa el aviso simple y lo elimina', confirms.every(c => !/FIRMADO/.test(c)) && E('Patients.all()[0].consents.length') === 1);
  confirmAnswer = true; click($(`[data-action="consents.delete"][data-id="${cid}"]`)); check('y al confirmar uno firmado se elimina', E('Patients.all()[0].consents.length') === 0);

  // ───────── 4. CIE-10 ─────────
  const P = s => JSON.parse(JSON.stringify(E(`Cie10.parse(${JSON.stringify(s)})`)));
  check('parse: «código,descripción» con cabecera; ignora filas sin código válido y repetidos', JSON.stringify(P('codigo,descripcion\nA00,Cólera\nA01,Fiebre tifoidea\nbasura,x\nA00,Repetido\n')) === JSON.stringify([['A00', 'Cólera'], ['A01', 'Fiebre tifoidea']]));
  check('parse: BOM de Excel, separador «;» y tabulador', P('\ufeffA00;Cólera\r\nA01;Tifoidea')[0][0] === 'A00' && P('A00\tCólera\nA01\tOtra').length === 2 && P('A00\tCólera')[0][1] === 'Cólera');
  check('parse: comillas con comas adentro y comillas dobles escapadas', P('A00,"Cólera, debida a Vibrio ""cholerae"""')[0][1] === 'Cólera, debida a Vibrio "cholerae"');
  check('parse: formato de 7 columnas (código en la 1.ª, descripción en la 7.ª)', P('code,code_0,a,b,c,d,description\nK02,K02,x,y,z,w,Caries dental')[0][1] === 'Caries dental');
  check('parse: archivo vacío o sin códigos devuelve lista vacía, no errores', P('').length === 0 && P('nada\notra cosa').length === 0 && P('\n\n').length === 0);
  E("CIE10_FULL=[['A00','Cólera'],['K02','Caries dental'],['K021','Caries de la dentina'],['K05','Gingivitis y enfermedades periodontales']]");
  const S = q => JSON.parse(JSON.stringify(E(`Cie10.search(${JSON.stringify(q)})`)));
  check('buscar sin acentos: «colera» encuentra «Cólera» y «periodontales» encuentra la descripción', S('colera')[0][0] === 'A00' && S('periodon')[0][0] === 'K05');
  check('buscar por código: los que EMPIEZAN con el código salen primero, luego los que lo contienen en la descripción', S('K02').map(r => r[0]).join() === 'K02,K021' && S('k02')[0][0] === 'K02');
  check('buscar: mínimo 2 caracteres, máximo 8 resultados, y sin catálogo completo usa el catálogo odontológico', S('K').length === 0 && S('').length === 0 && (E("CIE10_FULL=Array.from({length:30},(_,i)=>['K'+String(10+i).padStart(2,'0'),'Caries '+i])"), S('caries').length === 8) && (E('CIE10_FULL=null'), S('caries').length > 0));
  E("localStorage.setItem('oa3_cie10full',JSON.stringify([['A00','Cólera'],['A01','Tifoidea']]));CIE10_FULL=null;");
  await E('Cie10.load(true)'); await wait(50);
  check('load(): traslada lo que había en localStorage a IndexedDB y libera ese espacio (antes había dos lugares de guardado)', E('CIE10_FULL&&CIE10_FULL.length') === 2 && E("localStorage.getItem('oa3_cie10full')") === null && (await E("idbGet('cie10full')")).length === 2);
  check('load() es idempotente (el arranque lo llama dos veces)', E('Cie10.load()') === E('Cie10.load()'));
  D.body.insertAdjacentHTML('beforeend', '<span id="cie10count"></span>');
  alerts.length = 0; E("Cie10.importRows([['K02','Caries dental'],['K05','Gingivitis'],['M26','Anomalías dentofaciales']])"); await wait(80);
  check('importar guarda en IndexedDB, actualiza el catálogo en memoria y el contador, y avisa', E('CIE10_FULL.length') === 3 && (await E("idbGet('cie10full')")).length === 3 && /3 códigos cargados/.test(D.getElementById('cie10count').textContent) && alerts.some(a => /3 códigos/.test(a)), JSON.stringify([alerts, D.getElementById('cie10count').textContent]));
  alerts.length = 0; check('importar un archivo sin códigos válidos avisa y no toca lo cargado', (await E('Cie10.importRows([])')) === false && E('CIE10_FULL.length') === 3 && alerts.some(a => /No se encontraron/.test(a)));
  const bytes = Buffer.from('K02;Caries dental\nM26;Anomalías dentofaciales\n', 'latin1');       // «í» como un byte suelto: Windows-1252
  alerts.length = 0; const ok = await E('Cie10.importFile(new File([new Uint8Array([' + [...bytes].join(',') + '])],"cie.csv"))');
  check('importar un CSV de Excel en Windows-1252: las tildes se conservan (antes salían como "�")', ok === true && E("CIE10_FULL[1][1]") === 'Anomalías dentofaciales', E("CIE10_FULL[1][1]"));
  E('CIE10_FULL=null');

  // ───────── 5. recetas: datos ─────────
  seed();
  check('cantidad en letras: 1→UN, 45→CUARENTA Y CINCO, 101→CIENTO UN; fuera de 1–999 no se inventa nada (antes -5 daba «undefined»)', E('Prescriptions.numToLetras(1)') === 'UN' && E('Prescriptions.numToLetras(45)') === 'CUARENTA Y CINCO' && E('Prescriptions.numToLetras(101)') === 'CIENTO UN' && E('Prescriptions.numToLetras(-5)') === '' && E('Prescriptions.numToLetras(0)') === '' && E('Prescriptions.numToLetras(1500)') === '1500' && E("Prescriptions.numToLetras('abc')") === '');
  const med = (o) => Object.assign({ nombre: 'Ibuprofeno', formaFarmaceutica: 'Tableta', concentracion: '400 mg', via: 'Oral', cantidadNum: '15', dosis: '1 tableta', frecuencia: 'Cada 8 horas', duracion: '5 días' }, o);
  const rx = (o) => Object.assign({ fecha: d, tipo: 'agudo', medico: 'Dra. Ríos', especialidad: 'Odontología', registro: 'R-1', hc: 'H-1', diagnosticos: [{ cod: 'k02', desc: 'Caries' }], indicaciones: '', medicamentos: [med()] }, o);
  const CR = f => JSON.parse(JSON.stringify(E(`Prescriptions.check(${JSON.stringify(f)})`)));
  check('receta válida: limpia y pone en mayúscula el código, cantidad en letras automática, sin avisos', CR(rx()).ok && CR(rx()).clean.diagnosticos[0].cod === 'K02' && CR(rx()).clean.medicamentos[0].cantidadLetras === 'QUINCE' && CR(rx()).warnings.length === 0);
  check('receta: fecha real y no futura, médico obligatorio, al menos un medicamento', !CR(rx({ fecha: '' })).ok && !CR(rx({ fecha: '2026-02-30' })).ok && /futura/.test(CR(rx({ fecha: future })).error) && /médico/i.test(CR(rx({ medico: '  ' })).error) && /al menos un medicamento/i.test(CR(rx({ medicamentos: [med({ nombre: '' })] })).error));
  check('receta: cantidad entera de 1 a 999 (rechaza -5, 0, 1000, 2.5, texto)', ['-5', '0', '1000', '2.5', 'abc'].every(c => !CR(rx({ medicamentos: [med({ cantidadNum: c })] })).ok) && CR(rx({ medicamentos: [med({ cantidadNum: '' })] })).ok);
  check('receta: avisa (sin impedir) si falta diagnóstico, dosis, duración o cantidad', CR(rx({ diagnosticos: [] })).warnings.some(w => /diagnóstico/.test(w)) && CR(rx({ medicamentos: [med({ dosis: '', duracion: '', cantidadNum: '' })] })).warnings.length === 3);
  const r1 = E(`Prescriptions.add(1,${JSON.stringify(CR(rx()).clean)})`), r2 = E(`Prescriptions.add(1,${JSON.stringify(CR(rx()).clean)})`);
  check('emitir: numeración correlativa (1, 2), datos del paciente copiados y diagnóstico principal derivado', r1.id === 1 && r2.id === 2 && E('nextRecetaId') === 3 && r1.paciente === 'Ana López' && r1.cedula === '1712345678' && r1.cie10cod === 'K02' && r1.diagnostico === 'Caries' && r1.edad >= 35);
  check('eliminar receta: quita solo esa y el número NO se reutiliza', E('Prescriptions.remove(1,1).id') === 1 && E('Patients.all()[0].recetas.length') === 1 && E('nextRecetaId') === 3 && E('Prescriptions.remove(1,1)') === null);

  // ───────── 6. recetas: pantalla ─────────
  seed(); E("CIE10_FULL=[['K02','Caries dental'],['K021','Caries de la dentina <b>x</b>'],['K05','Gingivitis']]"); E("Ficha.tab('recetas')");
  click($('[data-action="rx.openNew"]'));
  check('«Nueva receta» abre el formulario con una fila de diagnóstico, una de medicamento y los campos de la fecha de hoy', modalOpen() && !!D.getElementById('f_rmed') && D.getElementById('f_rdate').value === d && !!D.getElementById('dcie_1') && !!D.getElementById('mn_1'), modal().slice(0, 100));
  check('NUEVO: el formulario de medicamento tiene el campo «Concentración» (antes el dato se leía pero el campo no existía)', !!D.getElementById('mc_1'));
  input(D.getElementById('dcie_1'), 'K02'); const resBox = D.getElementById('diag-results-1');
  check('escribir un código CIE-10 muestra sugerencias y escapa el texto de cada una', resBox.style.display === 'block' && $$('#diag-results-1 .diag-res').length === 2 && !resBox.querySelector('b') && /<b>x<\/b>/.test(resBox.textContent));
  click($$('#diag-results-1 .diag-res')[1]); check('elegir una sugerencia llena código y descripción y cierra la lista', D.getElementById('dcie_1').value === 'K021' && D.getElementById('ddesc_1').value === 'Caries de la dentina <b>x</b>' && resBox.style.display === 'none');
  input(D.getElementById('ddesc_1'), 'gingiv'); check('también se busca escribiendo la descripción, sin importar tildes', $$('#diag-results-1 .diag-res').length === 1 && /K05/.test(resBox.textContent));
  click($$('#diag-results-1 .diag-res')[0]);
  click($('[data-action="rx.addDiag"]')); check('«+ Diagnóstico» agrega otra fila y «✕» la quita', !!D.getElementById('dcie_2') && (click($('[data-action="rx.removeDiag"][data-id="2"]')), !D.getElementById('dcie_2')));
  input(D.getElementById('mqn_1'), '15'); check('la cantidad en números rellena sola la cantidad en letras', D.getElementById('mql_1').value === 'QUINCE');
  setv('f_rmed', '  Dra. Ríos  '); setv('f_resp', 'Odontología'); input(D.getElementById('mn_1'), 'Ibuprofeno'); setv('mc_1', '400 mg'); setv('md_1', ''); setv('mdu_1', '');
  confirmAnswer = false; confirms.length = 0; click($('[data-action="rx.save"]'));
  check('con dosis y duración vacías avisa qué falta y, si dice "no", no emite', confirms.some(c => /falta la dosis/.test(c) && /falta la duración/.test(c)) && E('Patients.all()[0].recetas.length') === 0);
  setv('md_1', '1 tableta'); setv('mdu_1', '5 días'); confirms.length = 0; click($('[data-action="rx.save"]'));
  const rec = E('Patients.all()[0].recetas[0]');
  check('completa: se emite sin avisos, con la concentración guardada (antes siempre quedaba vacía) y número 1', rec && rec.id === 1 && confirms.length === 0 && rec.medicamentos[0].concentracion === '400 mg' && rec.medico === 'Dra. Ríos' && rec.diagnostico === 'Gingivitis' && !modalOpen(), JSON.stringify(rec));
  check('la lista muestra la receta con su número y médico', /000001/.test(main()) && /Dra\. Ríos/.test(main()) && /Ibuprofeno/.test(main()));
  alerts.length = 0; click($('[data-action="rx.openNew"]')); setv('f_rdate', ''); input(D.getElementById('mn_1'), 'X'); click($('[data-action="rx.save"]'));
  check('receta con la fecha vacía: se rechaza con aviso (antes se emitía y se imprimía mal)', alerts.some(a => /fecha de la receta/.test(a)) && E('Patients.all()[0].recetas.length') === 1);
  setv('f_rdate', future); alerts.length = 0; click($('[data-action="rx.save"]')); check('receta con fecha futura: se rechaza', alerts.some(a => /futura/.test(a)));
  setv('f_rdate', d); setv('f_rmed', ''); alerts.length = 0; click($('[data-action="rx.save"]')); check('receta sin médico: se rechaza', alerts.some(a => /médico/i.test(a)) && E('Patients.all()[0].recetas.length') === 1);
  E('closeModal()'); E("Ficha.tab('recetas')");
  click($('[data-action="rx.view"][data-id="1"]'));
  check('«Ver» muestra el detalle: diagnóstico, medicamento con su concentración y vía', /Receta Médica — N° 000001/.test(modal()) && /Gingivitis/.test(modal()) && /Ibuprofeno/.test(modal()), modal().slice(0, 200));
  opened.length = 0; click($('#modalContent [data-action="rx.print"]')); const rh = lastOpened();
  check('imprimir: documento con número, médico, medicamento y concentración; sin onclick', /000001/.test(rh) && /Dra\. Ríos/.test(rh) && /Ibuprofeno/.test(rh) && /400 mg/.test(rh) && !/onclick=/.test(rh), rh.length);
  opened.length = 0; E('Prescriptions.printRx()'); check('el nombre antiguo Prescriptions.printRx() (sin argumentos, después de «Ver») sigue funcionando', /000001/.test(lastOpened()));
  E('closeModal()'); confirmAnswer = false; confirms.length = 0; click($('[data-action="rx.delete"][data-id="1"]'));
  check('eliminar receta: el aviso muestra número y fecha y explica que el número no se reutiliza; "no" la conserva', confirms.some(c => /000001/.test(c) && /NO se reutiliza/.test(c)) && E('Patients.all()[0].recetas.length') === 1);
  confirmAnswer = true; click($('[data-action="rx.delete"][data-id="1"]')); check('al confirmar se elimina', E('Patients.all()[0].recetas.length') === 0);

  // ───────── 7. presupuestos: datos ─────────
  seed();
  const it = (n, p, q) => ({ nombre: n, precio: p, qty: q });
  const qt = (o) => Object.assign({ fecha: d, validez: '30', observaciones: '', items: [it('Resina', '33.33', '3')], descuento: '10' }, o);
  const CQ = f => JSON.parse(JSON.stringify(E(`Quotes.check(${JSON.stringify(f)})`)));
  check('presupuesto válido: 33.33 × 3 con $10 de descuento = subtotal 99.99, total 89.99 exactos', CQ(qt()).ok && CQ(qt()).clean.subtotal === 99.99 && CQ(qt()).clean.total === 89.99 && CQ(qt()).clean.validez === 30);
  check('presupuesto: precio inválido o vacío se RECHAZA con el nombre del ítem (antes pasaba a $0 en silencio)', /precio de "Resina" no es válido/.test(CQ(qt({ items: [it('Resina', 'abc', '1')] })).error) && /no es válido/.test(CQ(qt({ items: [it('Resina', '-5', '1')] })).error) && CQ(qt({ items: [it('Cortesía', '0', '1')], descuento: '' })).ok && /Falta el precio de "Cortesía"/.test(CQ(qt({ items: [it('Cortesía', '', '1')], descuento: '' })).error));
  check('presupuesto: cantidad entera 1–999, validez 1–365, fecha real, al menos un ítem', ['0', '1000', '2.5', 'x'].every(q => !CQ(qt({ items: [it('A', '5', q)] })).ok) && !CQ(qt({ validez: '0' })).ok && !CQ(qt({ validez: '400' })).ok && !CQ(qt({ fecha: '' })).ok && /al menos un ítem/.test(CQ(qt({ items: [it('', '5', '1')] })).error));
  check('presupuesto: descuento mayor al subtotal se rechaza; igual al subtotal sí, con aviso de total $0.00', /no puede ser mayor al subtotal/.test(CQ(qt({ items: [it('A', '10', '1')], descuento: '50' })).error) && CQ(qt({ items: [it('A', '10', '1')], descuento: '10' })).warnings.some(w => /\$0\.00/.test(w)) && !CQ(qt({ descuento: 'abc' })).ok);
  const q1 = E(`Quotes.add(1,${JSON.stringify(CQ(qt()).clean)})`);
  check('crear: numeración correlativa, estado borrador, sin firma', q1.id === 1 && q1.estado === 'borrador' && q1.firmaPaciente === '' && q1.fechaAprobacion === null && E('nextPresupId') === 2);
  check('aprobar valida firma y fecha (obligatoria, real y no futura)', !E(`Quotes.checkApprove({firma:'',fecha:'${d}'})`).ok && !E(`Quotes.checkApprove({firma:'Ana',fecha:''})`).ok && !E(`Quotes.checkApprove({firma:'Ana',fecha:'${future}'})`).ok && E(`Quotes.checkApprove({firma:' Ana  López ',fecha:'${d}'})`).clean.firma === 'Ana López');
  const ap = E(`Quotes.approve(1,1,{firma:'Ana',fecha:'${d}',createTreatments:true})`);
  check('aprobar crea los tratamientos con el descuento repartido: la suma = total del presupuesto ($89.99), ligados al presupuesto', ap.ok && E("Patients.all()[0].treatments.reduce((s,t)=>addM(s,t.cost),0)") === 89.99 && E('Patients.all()[0].treatments.every(t=>t.presupId===1&&t.status==="pendiente")') && E('Patients.all()[0].presupuestos[0].estado') === 'aprobado');
  const before = E('Patients.all()[0].treatments.length'), again = E(`Quotes.approve(1,1,{firma:'Otra',fecha:'${d}',createTreatments:true})`);
  check('aprobar OTRA VEZ (doble acción, o desde otro dispositivo) se rechaza: ya NO duplica tratamientos ni la deuda', again.ok === false && again.error === 'state' && E('Patients.all()[0].treatments.length') === before && E('Patients.all()[0].presupuestos[0].firmaPaciente') === 'Ana');
  check('el saldo del plan del paciente es exactamente el total aprobado ($89.99)', E('resumenCuenta(Patients.all()[0]).planPendiente') === 89.99);
  check('rechazar uno ya aprobado se impide (solo se rechaza un borrador)', E('Quotes.reject(1,1)').error === 'state' && E('Patients.all()[0].presupuestos[0].estado') === 'aprobado');
  const q2 = E(`Quotes.add(1,${JSON.stringify(CQ(qt({ items: [it('Limpieza', '20', '1')], descuento: '' })).clean)})`);
  check('rechazar un borrador sí funciona', E(`Quotes.reject(1,${q2.id})`).ok && E(`Quotes.find(Patients.all()[0],${q2.id}).estado`) === 'rechazado' && E(`Quotes.reject(1,${q2.id})`).error === 'state');
  E("Patients.all()[0].treatments.push({id:900,name:'Hecho',cost:25,status:'realizado',presupId:1,date:'" + d + "'})");
  const lk = E('Quotes.linked(Patients.all()[0],Quotes.find(Patients.all()[0],1))');
  check('linked(): distingue tratamientos pendientes ($89.99) de ya realizados (1)', lk.pendientes.length === ap.created.length && lk.realizados === 1 && lk.montoPend === 89.99);
  const rm = E('Quotes.remove(1,1,{removePending:true})');
  check('eliminar con «y sus tratamientos pendientes» quita el presupuesto y solo los pendientes; lo ya REALIZADO se conserva', rm.treatmentsRemoved === ap.created.length && E('Patients.all()[0].treatments.length') === 1 && E('Patients.all()[0].treatments[0].status') === 'realizado' && E('Patients.all()[0].presupuestos.length') === 1);

  // ───────── 8. presupuestos: pantalla ─────────
  seed({ treatments: [] }); E("servicios.length=0;servicios.push({id:1,nombre:'Resina \"x\"<b>',precio:35})"); E("Ficha.tab('presupuestos')");
  click($('[data-action="quotes.openNew"]'));
  check('«Nuevo presupuesto» abre el formulario con una fila vacía y el catálogo de servicios', modalOpen() && !!D.getElementById('pin_1') && !!$('#modalContent [data-action="quotes.addFromSvc"]'), modal().slice(0, 120));
  click($('#modalContent [data-action="quotes.addFromSvc"]'));
  const lastRow = $$('[id^="pi-"]').pop(), nameInp = lastRow && lastRow.querySelector('input[id^="pin_"]');
  check('elegir un servicio del catálogo con comillas y HTML en el nombre lo carga tal cual (antes rompía el atributo e inyectaba HTML)', nameInp && nameInp.value === 'Resina "x"<b>' && D.querySelectorAll('[onerror]').length === 0 && !D.querySelector('#modalContent b'), nameInp && nameInp.value);
  const row1 = $('[id^="pi-"]'); click($('[data-action="quotes.addBlank"]')); check('«+ Agregar ítem» agrega una fila y «✕» la quita recalculando el total', $$('[id^="pi-"]').length === 3 && (click($$('[data-action="quotes.removeItem"]').pop()), $$('[id^="pi-"]').length === 2));
  const rid = row1.id.replace('pi-', ''); input(D.getElementById('pip_' + rid), '10'); input(D.getElementById('piq_' + rid), '2');
  const rid2 = $$('[id^="pi-"]')[1].id.replace('pi-', ''); input(D.getElementById('pip_' + rid2), '35.50'); setv('f_pfdesc', '3.333'); input(D.getElementById('f_pfdesc'), '3.333');
  check('el total en pantalla se recalcula al escribir: 10×2 + 35.50 − 3.333 → $52.17 (redondeo a centavos)', D.getElementById('f_pftotal').textContent === '$52.17', D.getElementById('f_pftotal').textContent);
  check('el nombre del ítem de la fila 1 está vacío: solo cuentan las filas con nombre', true);
  input(D.getElementById('pin_' + rid), 'Limpieza'); input(D.getElementById('pin_' + rid2), 'Resina'); setv('f_pfobs', 'Obs'); setv('f_pfd', d); setv('f_pfval', '30'); setv('f_pfdesc', '5');
  alerts.length = 0; input(D.getElementById('pip_' + rid), 'abc'); click($('[data-action="quotes.save"]'));
  check('guardar con un precio inválido: aviso con el nombre del ítem y no se guarda', alerts.some(a => /precio de "Limpieza"/.test(a)) && E('Patients.all()[0].presupuestos.length') === 0, alerts.join('|'));
  input(D.getElementById('pip_' + rid), '10'); click($('[data-action="quotes.save"]'));
  const pq = E('Patients.all()[0].presupuestos[0]');
  check('guardar: presupuesto N° 1 en borrador, total $50.50 (10×2 + 35.50 − 5), y el formulario se cierra', pq && pq.id === 1 && pq.estado === 'borrador' && pq.subtotal === 55.5 && pq.descuento === 5 && pq.total === 50.5 && !modalOpen(), JSON.stringify(pq));
  check('la lista muestra el presupuesto con su número y total', /0001/.test(main()) && /\$50\.50/.test(main()));
  check('la lista ofrece «Rechazar» y «Aprobar» para un borrador', !!$('#mainContent [data-action="quotes.reject"]') && !!$('#mainContent [data-action="quotes.approve"]'));
  click($('[data-action="quotes.view"][data-id="1"]'));
  check('«Ver» muestra el detalle con los ítems, el total y las acciones de un borrador (aprobar e imprimir)', modalOpen() && /\$50\.50/.test(modal()) && !!$('#modalContent [data-action="quotes.approve"]') && !!$('#modalContent [data-action="quotes.print"]'), modal().slice(0, 200));
  opened.length = 0; click($('#modalContent [data-action="quotes.print"]')); await wait(500);
  check('imprimir envuelve el detalle visible en un documento propio', /Presupuesto Dental/.test(lastOpened()) && /\$50\.50/.test(lastOpened()) && /Limpieza/.test(lastOpened()));
  click($('#modalContent [data-action="quotes.approve"]'));
  check('«Aprobar» abre un formulario con el nombre del paciente, la fecha de hoy y la casilla de tratamientos MARCADA (antes era un cuadro de confirmación cuyo «Cancelar» aprobaba igual)', /Aprobar presupuesto/.test(modal()) && D.getElementById('f_pfirma').value === 'Ana López' && D.getElementById('f_pfecha').value === d && D.getElementById('f_ptx').checked === true);
  alerts.length = 0; setv('f_pfirma', ''); click($('[data-action="quotes.confirmApprove"]')); check('aprobar sin nombre: aviso y sigue en borrador', alerts.some(a => /nombre de quien aprueba/.test(a)) && E('Patients.all()[0].presupuestos[0].estado') === 'borrador');
  setv('f_pfirma', 'Ana López'); D.getElementById('f_ptx').checked = false; click($('[data-action="quotes.confirmApprove"]'));
  check('con la casilla desmarcada se aprueba SIN crear tratamientos', E('Patients.all()[0].presupuestos[0].estado') === 'aprobado' && E('Patients.all()[0].treatments.length') === 0 && E('Patients.all()[0].presupuestos[0].firmaPaciente') === 'Ana López');
  alerts.length = 0; E('Quotes.confirmApprove(1)'); check('confirmar la aprobación otra vez (pantalla desactualizada) avisa y no cambia nada', /ya fue aprobado o rechazado/.test(alerts.join()) && E('Patients.all()[0].treatments.length') === 0);
  E('closeModal()'); alerts.length = 0; E('Quotes.rejectUI(1)'); check('rechazar uno aprobado desde la pantalla avisa que solo se rechaza un borrador y sugiere eliminarlo', /solo se puede rechazar un borrador/.test(alerts.join()) && E('Patients.all()[0].presupuestos[0].estado') === 'aprobado');

  // eliminar con tratamientos ligados
  seed({ treatments: [{ id: 1, name: 'Resina', cost: 40, status: 'pendiente', presupId: 1, date: d }, { id: 2, name: 'Limpieza', cost: 10.5, status: 'pendiente', presupId: 1, date: d }, { id: 3, name: 'Hecho', cost: 20, status: 'realizado', presupId: 1, date: d }, { id: 4, name: 'Otro', cost: 9, status: 'pendiente', date: d }],
    presupuestos: [{ id: 1, fecha: d, validez: 30, observaciones: '', items: [{ nombre: 'x', precio: 70.5, qty: 1, subtotal: 70.5 }], descuento: 0, subtotal: 70.5, total: 70.5, estado: 'aprobado', fechaAprobacion: d, firmaPaciente: 'Ana' }] });
  E("Ficha.tab('presupuestos')"); click($('[data-action="quotes.delete"][data-id="1"]'));
  check('eliminar un presupuesto aprobado con tratamientos pendientes abre una ventana que explica cuántos y cuánto ($50.50) y ofrece 3 opciones', /2 tratamientos pendientes/.test(modal()) && /\$50\.50/.test(modal()) && /1 tratamiento\(s\) ya realizados/.test(modal()) && !!$('[data-action="quotes.deleteWithTx"]') && !!$('[data-action="quotes.deleteOnly"]'));
  click($('#modalContent [data-action="app.closeModal"]')); check('«Cancelar» no elimina nada', E('Patients.all()[0].presupuestos.length') === 1 && E('Patients.all()[0].treatments.length') === 4);
  click($('[data-action="quotes.delete"][data-id="1"]')); click($('[data-action="quotes.deleteOnly"]'));
  check('«solo el presupuesto» conserva los 4 tratamientos', E('Patients.all()[0].presupuestos.length') === 0 && E('Patients.all()[0].treatments.length') === 4);
  seed({ treatments: [{ id: 1, name: 'Resina', cost: 40, status: 'pendiente', presupId: 1, date: d }, { id: 3, name: 'Hecho', cost: 20, status: 'realizado', presupId: 1, date: d }, { id: 4, name: 'Otro', cost: 9, status: 'pendiente', date: d }],
    presupuestos: [{ id: 1, fecha: d, validez: 30, observaciones: '', items: [], descuento: 0, subtotal: 60, total: 60, estado: 'aprobado', fechaAprobacion: d, firmaPaciente: 'Ana' }] });
  E("Ficha.tab('presupuestos')"); click($('[data-action="quotes.delete"][data-id="1"]')); click($('[data-action="quotes.deleteWithTx"]'));
  check('«y sus tratamientos pendientes» quita el presupuesto y SOLO sus pendientes: el realizado y los de otros orígenes se conservan', E('Patients.all()[0].presupuestos.length') === 0 && E('Patients.all()[0].treatments.map(t=>t.id).sort().join()') === '3,4');
  seed({ presupuestos: [{ id: 1, fecha: d, validez: 30, observaciones: '', items: [], descuento: 0, subtotal: 5, total: 5, estado: 'borrador', fechaAprobacion: null, firmaPaciente: '' }] });
  E("Ficha.tab('presupuestos')"); confirmAnswer = false; confirms.length = 0; click($('[data-action="quotes.delete"][data-id="1"]'));
  check('un borrador sin tratamientos usa el aviso simple; "no" lo conserva', confirms.length === 1 && E('Patients.all()[0].presupuestos.length') === 1);
  confirmAnswer = true; click($('[data-action="quotes.delete"][data-id="1"]')); check('y al confirmar se elimina', E('Patients.all()[0].presupuestos.length') === 0);

  // ───────── 9. auditoría ─────────
  seed(); E("Ficha.tab('consentimientos')"); await w.Seguridad._flush(); const n0 = ((await E("idbGet('audit')")) || []).length;
  click($('[data-action="consents.openSelect"]')); click($$('#modalContent [data-action="consents.add"]')[0]);
  const aid = E('Patients.all()[0].consents[0].id'); E(`Consents.openSign(${aid})`); setv('f_ffirma', ''); click($('[data-action="consents.confirmSign"]'));          // inválido: no se anota
  setv('f_ffirma', d); setv('f_fnpac', 'Ana'); click($('[data-action="consents.confirmSign"]'));
  click($(`[data-action="consents.view"][data-id="${aid}"]`)); click($('#modalContent [data-action="consents.print"]'));
  E("Ficha.tab('recetas')"); click($('[data-action="rx.openNew"]')); setv('f_rdate', ''); click($('[data-action="rx.save"]'));                                             // inválido
  setv('f_rdate', d); setv('f_rmed', 'Dr. A'); input(D.getElementById('mn_1'), 'Amoxicilina'); setv('md_1', '1'); setv('mdu_1', '7 días'); setv('mqn_1', '21'); click($('[data-action="rx.save"]'));
  click($('[data-action="rx.view"][data-id="1"]')); click($('#modalContent [data-action="rx.print"]')); E('closeModal()'); click($('[data-action="rx.delete"][data-id="1"]'));
  E("Ficha.tab('presupuestos')"); E(`Quotes.add(1,${JSON.stringify(CQ(qt()).clean)})`); E("Ficha.tab('presupuestos')"); click($('[data-action="quotes.view"][data-id="1"]')); click($('#modalContent [data-action="quotes.approve"]')); click($('[data-action="quotes.confirmApprove"]'));
  E("Ficha.tab('presupuestos')"); click($('[data-action="quotes.delete"][data-id="1"]')); click($('[data-action="quotes.deleteWithTx"]')); await wait(60); await w.Seguridad._flush();
  const log = ((await E("idbGet('audit')")) || []).slice(n0), has = e => log.some(x => x.ev === e), count = e => log.filter(x => x.ev === e).length;
  check('el registro de actividad anota: consentimiento creado, firmado, impreso; receta emitida, impresa, eliminada; presupuesto aprobado y eliminado', ['Creó consentimiento', 'Registró firma de consentimiento', 'Imprimió consentimiento', 'Emitió receta', 'Imprimió receta', 'Eliminó receta', 'Aprobó presupuesto', 'Eliminó presupuesto'].every(has), JSON.stringify(log.map(x => x.ev)));
  check('lo inválido NO se anota (1 sola firma y 1 sola receta emitida)', count('Registró firma de consentimiento') === 1 && count('Emitió receta') === 1, JSON.stringify(log.map(x => x.ev)));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.slice(0, 3).join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de Clínica pasaron'); process.exit(fail ? 1 : 0);
});
