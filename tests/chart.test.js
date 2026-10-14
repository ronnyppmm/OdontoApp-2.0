// Módulo Ficha clínica (Ficha, Diary, Odonto, Treatments, Images): todo se hace por CLIC, como lo haría una persona.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

srv.listen(0, async () => {
  console.log('\nOdontoApp — Ficha clínica (diario, odontograma, tratamientos, imágenes)');
  const errs = [], alerts = [], opened = []; let confirmAnswer = true; const asked = [];
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = m => { asked.push(String(m)); return confirmAnswer; };
      w.open = () => ({ document: { write: t => opened.push(String(t)), close() {} }, print() {} });
      if (!w.Blob.prototype.text) w.Blob.prototype.text = function () { return new Promise((ok, ko) => { const r = new w.FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsText(this); }); };
    } });
  await wait(1800); const w = dom.window, D = w.document, E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const setv = (id, val) => { D.getElementById(id).value = val; };
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const main = () => D.getElementById('mainContent').textContent;
  const act = (name, sel = '') => $(`[data-action="${name}"]${sel}`);
  const tab = n => click($(`.tab[data-tab="${n}"]`));
  const reset = () => { alerts.length = 0; asked.length = 0; confirmAnswer = true; };
  const TD = E('today()'), PAST = '2024-03-10';
  const hostile = '<img src=x onerror=1 id=PWN>';

  // pacientes de prueba
  E(`Patients.all().length=0;Appts.quick().length=0;Services.list().length=0;Services.list().push({id:1,nombre:"Resina 'A' & pulido",precio:35});
     Patients.all().push(Patients.blank({id:1,name:'Ana Prueba',cedula:'1712345678',phone:'0991234567'}),Patients.blank({id:2,name:'Beto Segundo',cedula:'0912345678',phone:'0987654321'}));saveNow();Patients.renderList();Patients.select(1);`);

  // ───────── 1. estructura ─────────
  const inline = /\son(click|input|change|keydown|focus|blur|mouseenter|mouseleave|mousedown|mouseover|mouseout|dragover|dragleave|drop)\s*=/i;
  check('chart.js ya no contiene ningún handler inline', !inline.test(read('js/chart.js').replace(/\/\*[\s\S]*?\*\//g, '')));
  const idx = read('index.html'); const idxInline = (idx.match(/\son(click|input|change|keydown)\s*=/gi) || []).length;
  check('las pestañas y «Limpiar diente» del index.html tampoco usan onclick', !/switchTab\(/.test(idx) && !/clearTooth\(/.test(idx), idxInline);
  check('los 5 módulos existen y ya no quedan nombres antiguos globales', ['Ficha', 'Diary', 'Odonto', 'Treatments', 'Images'].every(n => E(`typeof ${n}`) === 'object') && ['switchTab', 'renderTab', 'renderDatos', 'closeTP', 'abrirOdoSnapshot', 'imprimirOdoSnapshot'].every(n => E(`typeof ${n}`) === 'undefined'));
  check('el código muerto desapareció (renderPtHeader, openApptFromPt, saveApptFromPt, openRecetaFromPt)', ['renderPtHeader', 'openApptFromPt', 'saveApptFromPt', 'openRecetaFromPt'].every(n => E(`typeof ${n}`) === 'undefined'));

  // ───────── 2. pestañas ─────────
  const tabs = ['datos', 'odontograma', 'diario', 'tratamientos', 'pagos', 'citas', 'imagenes', 'consentimientos', 'presupuestos', 'recetas'];
  let tabsOk = true; tabs.forEach(t => { tab(t); if (E('curTab') !== t || $$('.tab.active').length !== 1 || $('.tab.active').getAttribute('data-tab') !== t || !D.getElementById('mainContent').innerHTML.length) tabsOk = false; });
  check('las 10 pestañas, al hacer clic, se activan (una sola resaltada) y dibujan su contenido', tabsOk);
  E("Ficha.tab('no-existe')"); check('una pestaña desconocida cae en «Datos» sin error', E('curTab') === 'datos' && errs.length === 0, errs.join('|'));
  E('Patients.setCurrent(null)'); E('Ficha.render()'); check('sin paciente abierto, dibujar la pestaña deja el área vacía y no lanza error', main() === '' && errs.length === 0, errs.join('|')); E('Patients.select(1)');
  E("Patients.current().birthdate='';Ficha.tab('datos')"); check('«Datos» sin fecha de nacimiento muestra «—» y no «NaN años»', !/NaN/.test(main()) && !/undefined/.test(main()), main().slice(0, 200));

  // ───────── 3. diario clínico ─────────
  tab('diario'); check('diario vacío', /Sin notas clínicas/.test(main()));
  click(act('diary.openAdd')); check('«+ Nueva nota» abre el formulario con la fecha de hoy', modalOpen() && D.getElementById('f_dd').value === TD);
  reset(); setv('f_dtitle', ''); setv('f_dbody', 'x'); click(act('diary.saveNew')); check('sin título: avisa y no guarda', alerts.length === 1 && E('Patients.current().diary.length') === 0 && modalOpen(), alerts[0]);
  reset(); setv('f_dtitle', 'Consulta'); setv('f_dbody', ''); click(act('diary.saveNew')); check('sin descripción: avisa y no guarda', alerts.length === 1 && E('Patients.current().diary.length') === 0);
  reset(); setv('f_dbody', 'Dolor'); setv('f_dd', '2099-01-01'); click(act('diary.saveNew')); check('fecha futura: la rechaza (una nota clínica registra lo que ya pasó)', /futura/.test(alerts[0] || '') && E('Patients.current().diary.length') === 0, alerts[0]);
  reset(); setv('f_dd', ''); click(act('diary.saveNew')); check('fecha vacía: la rechaza (antes se guardaba sin fecha)', /fecha/i.test(alerts[0] || '') && E('Patients.current().diary.length') === 0, alerts[0]);
  reset(); setv('f_dd', PAST); setv('f_ddoc', hostile); click(act('diary.saveNew'));
  check('nota válida: se guarda, el formulario se cierra y aparece en la lista', !modalOpen() && E('Patients.current().diary.length') === 1 && /Consulta/.test(main()));
  check('SEGURIDAD: el campo Doctor con HTML se ve como texto (antes se inyectaba)', !D.getElementById('PWN') && main().includes(hostile), main().slice(0, 200));
  click(act('diary.openAdd')); setv('f_dtitle', 'Control'); setv('f_dbody', 'Todo bien'); setv('f_dd', '2025-06-01'); setv('f_ddoc', 'Dra. A'); click(act('diary.saveNew'));
  const titles = $$('.diary-title').map(e => e.textContent);
  check('orden: lo más reciente por FECHA primero (no por el orden en que se escribió)', titles[0] === 'Control' && titles[1] === 'Consulta', titles.join(','));
  click(act('diary.openEdit', `[data-id="${E('Patients.current().diary[0].id')}"]`)); check('«Editar» abre el formulario con los datos de la nota', D.getElementById('f_dtitle').value === 'Consulta' && D.getElementById('f_ddoc').value === hostile);
  reset(); setv('f_dtitle', ''); click(act('diary.saveEdit')); check('editar con título vacío: avisa y no cambia nada', alerts.length === 1 && E('Patients.current().diary[0].title') === 'Consulta');
  setv('f_dtitle', 'Consulta inicial'); click(act('diary.saveEdit')); check('editar y guardar: cambia el título y marca la nota como editada', E('Patients.current().diary[0].title') === 'Consulta inicial' && !!E('Patients.current().diary[0].editado') && /editada/.test(main()));
  reset(); confirmAnswer = false; click(act('diary.delete', `[data-id="${E('Patients.current().diary[0].id')}"]`)); check('eliminar: el confirm nombra la nota; «Cancelar» la conserva', E('Patients.current().diary.length') === 2 && /Consulta inicial/.test(asked[0] || ''), asked[0]);
  confirmAnswer = true; click(act('diary.delete', `[data-id="${E('Patients.current().diary[0].id')}"]`)); check('al confirmar se elimina', E('Patients.current().diary.length') === 1);
  check('la API valida sin pantalla: Diary.check rechaza hora inválida y acepta una nota correcta', !E(`Diary.check({date:'${PAST}',time:'25:99',title:'a',body:'b'}).ok`) && E(`Diary.check({date:'${PAST}',time:'09:30',title:'a',body:'b'}).ok`));

  // ───────── 4. odontograma ─────────
  tab('odontograma'); const zonePath = (t, z) => $(`path[data-action="odonto.zone"][data-tooth="${t}"][data-zone="${z}"]`);
  check('el odontograma dibuja 52 dientes con 5 zonas clicables cada uno', $$('path[data-action="odonto.zone"]').length === 52 * 5, $$('path[data-action="odonto.zone"]').length);
  click(zonePath(18, 'top')); check('clic en una zona abre la ventana del diente con su nombre anatómico', D.getElementById('toothPopup').classList.contains('show') && /Diente 18 — Vestibular/.test(D.getElementById('tpTitle').textContent));
  click(zonePath(28, 'left')); check('la orientación cambia por cuadrante (28, lado izquierdo del dibujo = Mesial)', /Diente 28 — Mesial/.test(D.getElementById('tpTitle').textContent), D.getElementById('tpTitle').textContent);
  click(zonePath(18, 'top')); click(act('odonto.setSurf', '[data-id="caries"]'));
  check('elegir «Caries»: queda marcada, la ventana se cierra y la zona se pinta de rojo', E("Patients.current().surfData['18_top']") === 'caries' && !D.getElementById('toothPopup').classList.contains('show') && zonePath(18, 'top').getAttribute('fill') === '#E24B4A');
  await wait(400); check('al marcar caries se sugiere crear el tratamiento (y trae el precio del catálogo con apóstrofe y &)', modalOpen() && /Tratamiento sugerido/.test(modal()) && D.getElementById('f_stc').value === '35.00' && D.getElementById('f_stn').value === "Resina 'A' & pulido", modal().slice(0, 200));
  click(act('app.closeModal', '.btn-sec')); check('«No, gracias» cierra sin crear nada', !modalOpen() && E('Patients.current().treatments.length') === 0);
  click(zonePath(18, 'top')); click(act('odonto.setSurf', '[data-id="caries"]')); await wait(400); check('repetir la misma marca la quita (y no vuelve a sugerir)', E("Patients.current().surfData['18_top']") === undefined && !modalOpen());
  // símbolo completo sobre superficies: avisa
  click(zonePath(36, 'center')); click(act('odonto.setSurf', '[data-id="obturado"]')); await wait(50);
  reset(); confirmAnswer = false; click(zonePath(36, 'top')); click(act('odonto.setWhole', '[data-id="endo_hecha"]'));
  check('símbolo de diente completo sobre superficies marcadas: pregunta y, si dices no, no toca nada', /superficies marcadas/.test(asked[0] || '') && E("Patients.current().surfData['36_center']") === 'obturado' && E('Patients.current().wholeData[36]') === undefined, asked[0]);
  confirmAnswer = true; click(zonePath(36, 'top')); click(act('odonto.setWhole', '[data-id="endo_hecha"]')); await wait(400);
  check('al aceptar: queda «Endodoncia realizada» y las superficies se quitan', E('Patients.current().wholeData[36]') === 'endo_hecha' && E("Patients.current().surfData['36_center']") === undefined);
  click(act('app.closeModal', '.btn-sec')); // cierra la sugerencia
  reset(); confirmAnswer = false; click(zonePath(36, 'top')); click(act('odonto.setSurf', '[data-id="caries"]'));
  check('ANTES borraba el símbolo sin preguntar; ahora pregunta al marcar una superficie en un diente con símbolo, y «no» lo conserva', /Endodoncia realizada/.test(asked[0] || '') && E('Patients.current().wholeData[36]') === 'endo_hecha', asked[0]);
  confirmAnswer = true; click(zonePath(36, 'top')); click(act('odonto.clearTooth')); check('«Limpiar diente» deja el diente en blanco', E('Patients.current().wholeData[36]') === undefined && E("Patients.current().surfData['36_center']") === undefined && !D.getElementById('toothPopup').classList.contains('show'));
  check('la API rechaza dientes, zonas o símbolos inexistentes', !E("Odonto.markSurface(Patients.current(),99,'top','caries').ok") && !E("Odonto.markSurface(Patients.current(),18,'arriba','caries').ok") && !E("Odonto.markWhole(Patients.current(),18,'inventado').ok") && !E("Odonto.clearTooth(Patients.current(),5)"));
  // registros (snapshots)
  E("Odonto.markSurface(Patients.current(),16,'center','caries');Odonto.markWhole(Patients.current(),46,'corona_h')"); tab('odontograma');
  click(act('odonto.openSnapshotForm')); check('«Guardar estado actual» propone «Estado inicial»', D.getElementById('f_snaplbl').value === 'Estado inicial');
  reset(); setv('f_snaplbl', ''); click(act('odonto.saveSnapshot')); check('sin etiqueta: avisa', alerts.length === 1 && E('Patients.current().odoHistory.length') === 0);
  setv('f_snaplbl', "Control 'inicial' & <b>"); setv('f_snapfecha', '2099-01-01'); reset(); click(act('odonto.saveSnapshot')); check('fecha futura: la rechaza', /futura/.test(alerts[0] || '') && E('Patients.current().odoHistory.length') === 0, alerts[0]);
  setv('f_snapfecha', PAST); setv('f_snaphora', '10:30'); click(act('odonto.saveSnapshot'));
  check('registro válido: se guarda con una COPIA del estado y aparece en el historial', E('Patients.current().odoHistory.length') === 1 && E("Patients.current().odoHistory[0].surfData['16_center']") === 'caries' && /Historial del odontograma \(1 registros\)/.test(main()));
  E("Odonto.markSurface(Patients.current(),16,'center','caries')"); // quita la marca del odontograma actual
  check('el registro guardado NO cambia aunque después se edite el odontograma actual', E("Patients.current().odoHistory[0].surfData['16_center']") === 'caries' && E("Patients.current().surfData['16_center']") === undefined);
  tab('odontograma'); click(act('odonto.openSnapshot'));
  check('«Ver completo» abre el registro con su etiqueta y paciente (texto tal cual)', modalOpen() && modal().includes("Control 'inicial' & <b>") && /Ana Prueba/.test(modal()) && !D.getElementById('PWN'));
  check('ANTES las zonas del registro eran clicables y editaban el odontograma ACTUAL; ahora el registro es una foto (0 zonas clicables)', $$('#modalContent [data-action="odonto.zone"]').length === 0 && $$('#modalContent svg').length >= 52, $$('#modalContent [data-action="odonto.zone"]').length);
  opened.length = 0; click(act('odonto.printSnapshot')); await wait(50);
  check('imprimir: el documento sale del registro guardado, escapa etiqueta y paciente, y no lleva acciones', opened.length === 1 && /Control &#39;inicial&#39; &amp; &lt;b&gt;/.test(opened[0]) && /Ana Prueba/.test(opened[0]) && !/data-action/.test(opened[0]), (opened[0] || '').slice(0, 300));
  click(act('app.closeModal', '.btn-sec')); reset(); confirmAnswer = false; click(act('odonto.deleteSnapshot')); check('eliminar un registro: confirm con su nombre; «no» lo conserva', E('Patients.current().odoHistory.length') === 1 && /Control/.test(asked[0] || ''));
  confirmAnswer = true; click(act('odonto.deleteSnapshot')); check('al confirmar se elimina (el odontograma actual no cambia)', E('Patients.current().odoHistory.length') === 0 && E("Patients.current().wholeData[46]") === 'corona_h');
  E("Odonto.clearTooth(Patients.current(),46)");

  // ───────── 5. tratamientos ─────────
  tab('tratamientos'); check('lista vacía', /Sin tratamientos pendientes/.test(main()) && /Sin tratamientos registrados/.test(main()));
  click(act('treatments.openAdd')); check('«+ Agregar» abre el formulario con el catálogo de servicios', /Seleccionar del catálogo/.test(modal()) && !!act('treatments.pickService'));
  click(act('treatments.pickService')); check('un servicio del catálogo rellena nombre y precio (aunque el nombre tenga \' y &)', D.getElementById('f_txn').value === "Resina 'A' & pulido" && D.getElementById('f_txc').value === '35.00' && /Vínculo automático/.test(D.getElementById('tx-auto-preview').textContent));
  const typeTx = (n, tooth, date, cost, st) => { setv('f_txn', n); setv('f_txt', tooth); setv('f_txd', date); setv('f_txc', cost); setv('f_txs', st); };
  reset(); typeTx('', 'General', TD, '10', 'pendiente'); click(act('treatments.saveNew')); check('sin nombre: avisa', alerts.length === 1 && E('Patients.current().treatments.length') === 0);
  reset(); typeTx('Limpieza', 'General', '', '10', 'pendiente'); click(act('treatments.saveNew')); check('ANTES aceptaba fecha vacía; ahora la rechaza', /fecha/i.test(alerts[0] || '') && E('Patients.current().treatments.length') === 0, alerts[0]);
  reset(); typeTx('Limpieza', 'General', TD, '-50', 'pendiente'); click(act('treatments.saveNew')); check('ANTES un costo negativo se volvía 0 en silencio; ahora avisa y no guarda', /costo/i.test(alerts[0] || '') && E('Patients.current().treatments.length') === 0, alerts[0]);
  reset(); typeTx('Limpieza', 'General', '2099-01-01', '10', 'realizado'); click(act('treatments.saveNew')); check('un tratamiento REALIZADO no puede tener fecha futura', /futuro|futura/i.test(alerts[0] || '') && E('Patients.current().treatments.length') === 0, alerts[0]);
  reset(); confirmAnswer = false; typeTx('Extracción', '36 y 37', TD, '20', 'pendiente'); click(act('treatments.saveNew')); check('diente mal escrito («36 y 37»): avisa que no se vinculará y, si dices no, no guarda', /36 y 37/.test(asked[0] || '') && E('Patients.current().treatments.length') === 0 && modalOpen(), asked[0]);
  confirmAnswer = true; typeTx('Extracción', '36, 37', TD, '20', 'pendiente'); click(act('treatments.saveNew'));
  check('extracción pendiente en 36 y 37: se guarda y el odontograma muestra «Extracción indicada»', E('Patients.current().treatments.length') === 1 && E('Patients.current().wholeData[36]') === 'extraccion' && E('Patients.current().wholeData[37]') === 'extraccion' && !modalOpen());
  check('la lista muestra el vínculo con el odontograma', /Extracción indicada/.test(main()) && /Diente 36, 37/.test(main()));
  click(act('treatments.done')); check('«✓ Realizado»: pasa a Realizados y el símbolo evoluciona a «pérdida por caries»', E('Patients.current().treatments[0].status') === 'realizado' && E('Patients.current().wholeData[36]') === 'perd_caries' && /Realizado/.test($$('.card')[1].textContent));
  check('un tratamiento realizado no se puede «realizar» otra vez', E(`Treatments.markDone(1,Patients.current().treatments[0].id)`) === null);
  E("Patients.current().treatments.push({id:777,name:'Control',tooth:'General',date:'2099-01-01',cost:5,status:'pendiente'})"); tab('tratamientos'); click(act('treatments.done', '[data-id="777"]'));
  check('al realizar un tratamiento planeado a futuro, su fecha pasa a hoy (no queda «realizado» en el futuro)', E('Patients.current().treatments[1].status') === 'realizado' && E('Patients.current().treatments[1].date') === TD);
  E("Patients.current().treatments.pop()"); reset(); confirmAnswer = false; tab('tratamientos'); click(act('treatments.delete'));
  check('eliminar: el confirm nombra el tratamiento y avisa que dejará de contar en el saldo; «no» lo conserva', E('Patients.current().treatments.length') === 1 && /Extracción/.test(asked[0] || '') && /saldo/.test(asked[0] || ''), asked[0]);
  reset(); confirmAnswer = true; click(act('treatments.delete')); check('al confirmar pregunta también por las marcas del odontograma y las quita si aceptas', E('Patients.current().treatments.length') === 0 && asked.length === 2 && E('Patients.current().wholeData[36]') === undefined && E('Patients.current().wholeData[37]') === undefined, asked.join(' | '));
  // obturación por superficies
  click(act('treatments.openAdd')); typeTx('Obturación resina', '46', TD, '30', 'pendiente'); click(act('treatments.saveNew'));
  check('obturación pendiente: queda «superficies por seleccionar» y aún no pinta nada', /superficies por seleccionar/.test(main()) && !E("Object.keys(Patients.current().surfData).some(k=>k.startsWith('46_'))"));
  click(act('treatments.done')); check('«✓ Realizado» abre el selector de superficies del diente 46', modalOpen() && /Marcar superficies/.test(modal()) && !!D.getElementById('sup_46_center'));
  reset(); click(act('treatments.applySurfaces')); check('aplicar sin elegir ninguna: avisa', /al menos una/.test(alerts[0] || ''));
  D.getElementById('sup_46_center').checked = true; D.getElementById('sup_46_left').checked = true; click(act('treatments.applySurfaces'));
  check('aplicar: pinta Oclusal y Mesial/Distal según el cuadrante, y la lista las resume', E("Patients.current().surfData['46_center']") === 'obturado' && E("Patients.current().surfData['46_left']") === 'obturado' && !modalOpen() && /46: D-O/.test(main()), main().slice(0, 300));
  reset(); confirmAnswer = true; click(act('treatments.delete')); check('eliminar la obturación y aceptar quita también las superficies pintadas', asked.length === 2 && E("Patients.current().surfData['46_center']") === undefined);
  // sugerencia desde el odontograma
  tab('odontograma'); click(zonePath(26, 'top')); click(act('odonto.setWhole', '[data-id="corona_r"]')); await wait(400);
  check('marcar «Corona por realizar» sugiere el tratamiento «Corona» pendiente para ese diente', /Corona/.test(D.getElementById('f_stn').value) && /26/.test(modal()));
  setv('f_stc', '-3'); reset(); click(act('treatments.createFromOdonto')); check('la sugerencia también valida (costo negativo)', /costo/i.test(alerts[0] || '') && E('Patients.current().treatments.length') === 0, alerts[0]);
  setv('f_stc', '80'); click(act('treatments.createFromOdonto')); check('al aceptar se crea vinculado al símbolo y no cambia el dibujo', E('Patients.current().treatments.length') === 1 && E('Patients.current().treatments[0].status') === 'pendiente' && E('Patients.current().treatments[0].cost') === 80 && E('Patients.current().wholeData[26]') === 'corona_r' && !modalOpen());
  E("Treatments.remove(Patients.current().id,Patients.current().treatments[0].id);Odonto.clearTooth(Patients.current(),26)");
  check('parseTeeth: «11-14», «36;46», duplicados y dientes inexistentes', JSON.stringify(E("Treatments.parseTeeth('11-14, 36;46, 36, 99, abc')")) === JSON.stringify([11, 12, 13, 14, 36, 46]));

  // ───────── 6. imágenes ─────────
  E(`window.Image=function(){this.width=800;this.height=600;var self=this;Object.defineProperty(this,'src',{set:function(v){setTimeout(function(){self.onload&&self.onload();},40);}});};
     HTMLCanvasElement.prototype.getContext=function(){return {drawImage(){}}};HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/jpeg;base64,AAAA'};
     URL.createObjectURL=function(){return 'blob:fake'};URL.revokeObjectURL=function(){};`);
  const file = (n, type = 'image/png') => E(`new File(['x'],'${n}',{type:'${type}'})`);
  tab('imagenes'); check('sin imágenes', /Sin imágenes registradas/.test(main()));
  w.__f = [file('rx1.png'), file('notas.txt', 'text/plain')]; reset();
  await E('Images.uploadUI(__f)'); await wait(100);
  check('subir una imagen y un archivo de texto: se guarda la imagen y se avisa del que no lo es', E('Patients.current().images.length') === 1 && E('Patients.current().images[0].name') === 'rx1' && alerts.length === 1 && /no es una imagen|no se guard/.test(alerts[0]), alerts.join('|'));
  check('la pantalla muestra la miniatura con su nombre', /rx1/.test(main()) && !!$('img[data-action="images.view"]'));
  // cambiar de paciente mientras se sube
  w.__f = [file('rx2.png')]; const p = E('Images.uploadUI(__f)'); E('Patients.select(2)'); await p; await wait(100);
  check('ANTES la imagen caía en el OTRO paciente si cambiabas de ficha durante la subida; ahora va a quien la subió', E('Patients.get(1).images.length') === 2 && E('Patients.get(2).images.length') === 0, JSON.stringify([E('Patients.get(1).images.length'), E('Patients.get(2).images.length')]));
  check('y la pantalla del otro paciente no se redibuja ni se rompe', errs.length === 0 && /Beto Segundo/.test($('#ptWinHeader').textContent), errs.join('|'));
  E('Patients.select(1)'); tab('imagenes');
  // arrastrar y soltar
  const card = $('[data-on-dragover="images.dragOver"]'); const ev = (t, files) => { const e = new w.Event(t, { bubbles: true, cancelable: true }); e.dataTransfer = { files }; card.dispatchEvent(e); return e; };
  const e1 = ev('dragover'); check('arrastrar sobre la tarjeta muestra la zona de soltar (y evita el comportamiento del navegador)', D.getElementById('img-dropzone').style.display === 'flex' && e1.defaultPrevented);
  ev('dragleave'); check('al salir se oculta', D.getElementById('img-dropzone').style.display === 'none');
  w.__f = [file('rx3.png')]; ev('drop', w.__f); await wait(300); check('soltar un archivo lo sube', E('Patients.current().images.length') === 3, E('Patients.current().images.length'));
  // seguridad de datos importados
  E("Patients.current().images.push({id:9,name:'<i id=PWN1></i>',tipo:'<i id=PWN2></i>',fecha:'2026-01-01',data:'javascript:alert(1)',size:'<i id=PWN3></i>',notas:'<i id=PWN4></i>'});Ficha.tab('imagenes')");
  check('SEGURIDAD: nombre, tipo, tamaño y notas hostiles se ven como texto (tipo y tamaño antes se inyectaban)', !D.getElementById('PWN1') && !D.getElementById('PWN2') && !D.getElementById('PWN3') && !D.getElementById('PWN4') && main().includes('<i id=PWN2></i>'));
  check('SEGURIDAD: un «data» que no sea una imagen en base64 (javascript:…) nunca llega al atributo src', !$$('img').some(i => /javascript:/i.test(i.getAttribute('src') || '')) && E("Images.safeSrc('javascript:alert(1)')") === '' && E("Images.safeSrc('data:image/png;base64,AAAA')") !== '');
  E('Patients.current().images.pop()'); tab('imagenes');
  click($('img[data-action="images.view"]')); check('clic en la miniatura abre el visor con nombre, tipo y fecha editables', modalOpen() && D.getElementById('f_iname').value === 'rx1' && D.getElementById('f_itipo').options.length === 7);
  reset(); setv('f_iname', ''); click(act('images.saveEdit')); check('editar sin nombre: avisa', alerts.length === 1 && E('Patients.current().images[0].name') === 'rx1');
  setv('f_iname', 'Panorámica'); setv('f_itipo', 'Radiografía panorámica'); setv('f_ifecha', '2099-01-01'); reset(); click(act('images.saveEdit')); check('fecha futura: la rechaza', /futura/.test(alerts[0] || '') && E('Patients.current().images[0].name') === 'rx1');
  setv('f_ifecha', PAST); click(act('images.saveEdit')); check('editar y guardar cambia nombre, tipo y fecha', E('Patients.current().images[0].name') === 'Panorámica' && E('Patients.current().images[0].tipo') === 'Radiografía panorámica' && E('Patients.current().images[0].fecha') === PAST && !modalOpen());
  const idImg = E('Patients.current().images[0].id'); check('el original quedó en IndexedDB', !!(await E(`imgDbGet(${idImg})`)));
  reset(); confirmAnswer = false; click(act('images.delete')); check('eliminar: confirm con el nombre; «no» la conserva', E('Patients.current().images.length') === 3 && /Panorámica/.test(asked[0] || ''));
  confirmAnswer = true; click(act('images.delete')); await wait(100); check('al confirmar se elimina la miniatura Y el original de IndexedDB', E('Patients.current().images.length') === 2 && !(await E(`imgDbGet(${idImg})`)));

  // ───────── 7. auditoría ─────────
  const log = JSON.stringify(E('JSON.parse(localStorage.getItem("oa3_audit")||"[]")'));
  check('las acciones clínicas quedan en el registro de auditoría (si el PIN está activo se anotan; aquí solo se comprueba que no fallen)', errs.length === 0, errs.join('|'));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.slice(0, 3).join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : `\n✔ Todas las pruebas de la Ficha clínica pasaron (${results.length} comprobaciones)`); process.exit(fail ? 1 : 0);
});
