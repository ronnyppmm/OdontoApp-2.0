// Módulo Pacientes: API propia, validación, eventos por data-action (sin onclick), búsqueda global y seguridad.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 260))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

srv.listen(0, async () => {
  console.log('\nOdontoApp — módulo Pacientes');
  const errs = [], alerts = [], consoleErr = []; let confirmAnswer = true;
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); }); vc.on('error', m => consoleErr.push(String(m)));
  const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = () => confirmAnswer; } });
  await wait(1800); const w = dom.window, D = w.document, E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const setv = (id, val) => { D.getElementById(id).value = val; };
  const type = (id, val) => { const el = D.getElementById(id); el.value = val; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const seed = list => { w.__s = JSON.parse(JSON.stringify(list)); E('patients.length=0;curPt=null;__s.forEach(p=>patients.push(Patients.blank(p)));saveNow();Patients.renderList()'); };
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const BIG = 1759500000123456;   // IDs de 16 dígitos como los que genera uid()

  // ───────── 1. HTML sin onclick ─────────
  const inline = /\son(click|input|change|keydown|focus|blur|mouseenter|mouseleave|mousedown|mouseover|mouseout)\s*=/i;
  check('patients.js ya no contiene ningún handler inline (onclick, oninput, onmouseenter…)', !inline.test(read('js/patients.js')));
  const idx = read('index.html').split('\n').filter(l => /id="searchInput"|id="globalSearch"|class="sb-add"/.test(l));
  check('el buscador, el filtro y «+ Nuevo Paciente» del index.html tampoco', idx.length === 3 && !idx.some(l => inline.test(l)), idx.length);
  check('agenda ya no arma pacientes a mano (usa Patients)', !/surfData\s*:\s*\{\}/.test(read('js/agenda.js')) && /Patients\.addFromForm/.test(read('js/agenda.js')));
  const legacy = ['renderSidebar', 'filterPts', 'selectPt', 'openNewPt', 'saveNewPt', 'editPt', 'saveEditPt', 'openDeletePt', 'confirmDeletePt', 'runSearch', 'showResults', 'hideResults', 'searchGo', 'searchKeyNav'];
  check('los 14 nombres antiguos siguen existiendo (los usan módulos aún no migrados)', legacy.every(n => E(`typeof ${n}`) === 'function'));

  // ───────── 2. despachador de eventos ─────────
  let got = null, others = 0; w.__got = c => { got = c; };
  E("App.actions({'t.echo':c=>__got(c),'t.boom':()=>{throw new Error('falla a propósito')},'t.other':()=>{window.__others=(window.__others||0)+1}})");
  const mk = (attrs, html = '') => { const d = D.createElement('div'); Object.entries(attrs).forEach(([k, v]) => d.setAttribute(k, v)); d.innerHTML = html; D.body.appendChild(d); return d; };
  click(mk({ 'data-action': 't.echo', 'data-id': String(BIG), 'data-x': 'hola' }));
  check('el id de 16 dígitos llega como número exacto y el resto de data-* como texto', got && got.id === BIG && typeof got.id === 'number' && got.data.x === 'hola', JSON.stringify(got && got.id));
  click(mk({ 'data-action': 't.echo', 'data-id': 'q123' })); check('un id no numérico (cita rápida "q123") llega como texto', got.id === 'q123');
  click(mk({ 'data-action': 't.echo', 'data-id': '99999999999999999999' })); check('un número demasiado grande para JavaScript no se corrompe: llega como texto', got.id === '99999999999999999999');
  const nBefore = consoleErr.length; click(mk({ 'data-action': 't.boom' })); click(mk({ 'data-action': 't.other' }));
  check('una acción que falla no rompe a las demás (se registra el error y la siguiente funciona)', E('window.__others') === 1 && consoleErr.length > nBefore);
  click(mk({ 'data-action': 'no.existe' })); check('una acción inexistente solo avisa, no lanza error', errs.length === 0, errs.join('|'));
  const inp = mk({ 'data-on-input': 't.echo' }, '<input id="t_in">'); const ti = D.getElementById('t_in'); ti.value = 'texto'; ti.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('eventos input: el valor del campo llega en ctx.value', got.value === 'texto');
  let enters = 0; w.__enter = () => { enters++; }; E("App.actions({'t.enter':()=>__enter()})");
  const hov = mk({ 'data-on-mouseover': 't.enter' }, '<span id="t_a">a</span><span id="t_b">b</span>'); const A = D.getElementById('t_a'), B = D.getElementById('t_b');
  A.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true, relatedTarget: D.body })); B.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true, relatedTarget: A }));
  check('mouseover/out se comportan como enter/leave: moverse dentro del mismo elemento no repite la acción', enters === 1, enters);
  const echoBtn = mk({ 'data-action': 't.echo' }, '<b id="t_child">dentro</b>'); got = null; click(D.getElementById('t_child'));
  check('un clic en un hijo del botón dispara la acción del botón', !!got);
  $$('body > div[data-action^="t."], body > div[data-on-input="t.echo"], body > div[data-on-mouseover="t.enter"]').forEach(e => e.remove());

  // ───────── 3. API: datos ─────────
  seed([]);
  const b = E('Patients.blank({name:"X"})');
  check('Patients.blank(): una sola definición de cómo es un paciente (id único + las 9 listas vacías)', typeof b.id === 'number' && E('Patients.ARRAYS').every(k => Array.isArray(b[k]) && b[k].length === 0) && b.surfData && b.wholeData && E('Patients.ARRAYS.length') === 9);
  const p1 = E('Patients.add({name:"María Pérez",cedula:"1712345678",phone:"0991-234-567"})');
  check('Patients.add: crea, guarda y devuelve el paciente (ids distintos en cada alta)', E('Patients.all().length') === 1 && p1.name === 'María Pérez' && E('Patients.add({name:"Otro"}).id') !== p1.id);
  check('Patients.get acepta el id como número o como texto', E(`Patients.get(${p1.id}).name`) === 'María Pérez' && E(`Patients.get("${p1.id}").name`) === 'María Pérez' && E('Patients.get(123)') === null);
  E(`Patients.update(${p1.id},{phone:"0900000000"})`); check('Patients.update cambia solo lo indicado', E(`Patients.get(${p1.id}).phone`) === '0900000000' && E(`Patients.get(${p1.id}).name`) === 'María Pérez');
  E(`curPt=Patients.get(${p1.id})`); E(`Patients.remove(${p1.id})`);
  check('Patients.remove elimina y limpia curPt si era el abierto', E('Patients.all().length') === 1 && E('curPt') === null && E('Patients.remove(1)') === false);

  // ───────── 4. API: validación ─────────
  seed([{ id: 1, name: 'Ana López', cedula: '0912345678' }, { id: 2, name: 'Luis Soto', cedula: '1700000001' }]);
  const C = (f, o) => JSON.parse(JSON.stringify(E(`Patients.check(${JSON.stringify(f)},${JSON.stringify(o || {})})`)));
  check('validación: nombre obligatorio, se limpian espacios dobles y bordes', !C({ name: '   ' }).ok && C({ name: '  Ana   María   Ruiz ' }).clean.name === 'Ana María Ruiz');
  check('validación: máximo 120 caracteres en el nombre', !C({ name: 'x'.repeat(121) }).ok && C({ name: 'x'.repeat(120) }).ok);
  check('validación: correo con formato válido (acepta vacío)', !C({ name: 'A', email: 'sin-arroba' }).ok && !C({ name: 'A', email: 'a@b' }).ok && C({ name: 'A', email: 'a@b.com' }).ok && C({ name: 'A', email: '' }).ok);
  check('validación: fecha de nacimiento real y no futura', !C({ name: 'A', birthdate: '2026-13-45' }).ok && !C({ name: 'A', birthdate: '2999-01-01' }).ok && !C({ name: 'A', birthdate: 'ayer' }).ok && C({ name: 'A', birthdate: '1990-05-17' }).ok);
  check('cédula repetida: se detecta sin importar espacios ni mayúsculas, y se ignora al editar el mismo paciente', C({ name: 'Otra', cedula: ' 0912345678 ' }).duplicate.name === 'Ana López' && C({ name: 'Ana López', cedula: '0912345678' }, { excludeId: 1 }).duplicate === null && C({ name: 'N', cedula: '' }).duplicate === null);

  // ───────── 5. nuevo paciente por clics ─────────
  seed([]);
  click($('.sb-add'));
  check('clic en «+ Nuevo Paciente» abre el formulario (data-action, sin onclick)', /Nuevo paciente/.test(modal()) && !!D.getElementById('f_name'));
  const fill = (o) => { setv('f_name', o.name ?? ''); setv('f_ced', o.ced ?? ''); setv('f_birth', o.birth ?? ''); setv('f_phone', o.phone ?? ''); setv('f_email', o.email ?? ''); setv('f_al', o.al ?? ''); setv('f_ant', o.ant ?? ''); };
  const save1 = () => click($('[data-action="patients.saveNew"]'));
  alerts.length = 0; fill({ name: '  ' }); save1();
  check('guardar sin nombre: aviso y no se crea nada', alerts.some(a => /nombre es obligatorio/i.test(a)) && E('patients.length') === 0);
  alerts.length = 0; fill({ name: 'Ana', email: 'mal' }); save1(); check('correo inválido: aviso y no se crea', alerts.some(a => /correo/i.test(a)) && E('patients.length') === 0);
  alerts.length = 0; fill({ name: 'Ana', birth: '2999-01-01' }); save1(); check('fecha de nacimiento futura: aviso y no se crea', alerts.some(a => /futura/i.test(a)) && E('patients.length') === 0);
  fill({ name: "  O'Brien  \"El\"  <b>Bold</b>  ", ced: '1712345678', birth: '1990-05-17', phone: '0991-234-567', email: 'ob@x.com', al: 'Penicilina', ant: 'Hipertensión' }); save1();
  const created = E('patients[0]');
  check('guardar con datos válidos: crea el paciente con los datos limpios (nombre con comillas y HTML se conserva como texto)', E('patients.length') === 1 && created.name === 'O\'Brien "El" <b>Bold</b>' && created.alergias === 'Penicilina' && created.birthdate === '1990-05-17', JSON.stringify(created.name));
  check('tras crear queda abierto: ficha, cabecera con su nombre, pestaña Datos activa, y modal cerrado', E('curPt.id') === created.id && /O'Brien/.test($('#ptWinHeader').textContent) && !!$('.tab.active') && $('.tab.active').getAttribute('onclick').includes("'datos'") && !modalOpen());
  check('el HTML del nombre se muestra como texto, no como etiquetas', !$('#ptWinHeader b') && !$('#ptList b') && /<b>Bold<\/b>/.test($('#ptWinHeader').textContent));
  const item = $(`#ptList [data-action="patients.select"]`); check('el ítem de la lista lleva el id en data-id (sin código JavaScript en el atributo)', item && item.getAttribute('data-id') === String(created.id) && !item.getAttribute('data-action').includes('('));

  // cédula repetida
  click($('.sb-add')); fill({ name: 'Otro Paciente', ced: '1712345678' }); confirmAnswer = false; save1();
  check('cédula repetida y el usuario dice "no": no se crea', E('patients.length') === 1);
  confirmAnswer = true; save1(); check('cédula repetida y el usuario confirma: se crea', E('patients.length') === 2);
  E('closeModal()');

  // ───────── 6. abrir paciente / pestañas / lista ─────────
  seed([{ id: BIG, name: 'María Pérez', cedula: '1712345678', phone: '0991-234-567', alergias: 'Penicilina', antecedentes: 'Diabetes', payments: [{ id: 1, amount: 40, date: '2026-10-01' }] }, { id: BIG + 7, name: 'José Núñez', cedula: '0102030405' }]);
  click($(`#ptList [data-id="${BIG}"]`));
  check('clic en un paciente de la lista con id de 16 dígitos lo abre', E('curPt && curPt.id') === BIG && /María Pérez/.test($('#ptWinHeader').textContent));
  E("switchTab('pagos',[...document.querySelectorAll('.tab')].find(t=>(t.getAttribute('onclick')||'').includes(\"'pagos'\")))"); click($(`#ptList [data-id="${BIG + 7}"]`));
  check('al abrir otro paciente, la pestaña resaltada vuelve a ser Datos (antes quedaba resaltada la anterior)', E('curTab') === 'datos' && $('.tab.active').getAttribute('onclick').includes("'datos'") && $$('.tab.active').length === 1);
  check('el paciente abierto aparece resaltado en la lista', $('#ptList .sb-pt.active') && $('#ptList .sb-pt.active').getAttribute('data-id') === String(BIG + 7));
  type('searchInput', 'maria'); check('filtro de la lista lateral sin acentos: "maria" encuentra a "María"', $$('#ptList .sb-pt').length === 1);
  type('searchInput', 'nunez'); check('… y "nunez" encuentra a "Núñez"', $$('#ptList .sb-pt').length === 1 && /José/.test($('#ptList').textContent));
  type('searchInput', '1712'); check('… y también por cédula', $$('#ptList .sb-pt').length === 1);
  type('searchInput', 'zzz'); check('un filtro sin coincidencias deja la lista vacía sin errores', $$('#ptList .sb-pt').length === 0 && errs.length === 0);
  type('searchInput', '');

  // ───────── 7. tooltips de alergias ─────────
  click($(`#ptList [data-id="${BIG}"]`));
  const al = $('#ptWinHeader [data-tip="alergia"]'), an = $('#ptWinHeader [data-tip="antec"]');
  check('la cabecera muestra los avisos de alergia y antecedentes cuando existen', !!al && !!an);
  al.dispatchEvent(new w.MouseEvent('mouseover', { bubbles: true, relatedTarget: D.body }));
  const tip = D.getElementById('ptAlertTip'); check('pasar el ratón por ALERGIA muestra el tooltip con el texto', tip && tip.style.display === 'block' && /Penicilina/.test(tip.textContent), tip && tip.outerHTML);
  al.dispatchEvent(new w.MouseEvent('mouseout', { bubbles: true, relatedTarget: D.body })); check('al salir, el tooltip se oculta', tip.style.display === 'none');

  // ───────── 8. editar ─────────
  click($('[data-action="patients.openEdit"]'));
  check('el formulario de editar muestra los datos actuales', D.getElementById('f_name').value === 'María Pérez' && D.getElementById('f_ced').value === '1712345678' && D.getElementById('f_al').value === 'Penicilina');
  alerts.length = 0; setv('f_name', '   '); click($('[data-action="patients.saveEdit"]'));
  check('editar con nombre vacío se rechaza (antes se aceptaba y dejaba la ficha sin nombre)', alerts.some(a => /nombre es obligatorio/i.test(a)) && E('curPt.name') === 'María Pérez');
  setv('f_name', '  María   José Pérez '); setv('f_phone', '0999-999-999'); click($('[data-action="patients.saveEdit"]'));
  check('editar guarda, limpia el nombre y refresca la cabecera', E('curPt.name') === 'María José Pérez' && E('curPt.phone') === '0999-999-999' && /María José Pérez/.test($('#ptWinHeader').textContent) && !modalOpen());
  click($('[data-action="patients.openEdit"]')); setv('f_ced', '0102030405'); confirmAnswer = false; click($('[data-action="patients.saveEdit"]'));
  check('editar con la cédula de OTRO paciente avisa y, si el usuario dice "no", no guarda', E('curPt.cedula') === '1712345678'); confirmAnswer = true; E('closeModal()');
  click($('[data-action="patients.openEdit"]')); click($('[data-action="patients.saveEdit"]')); check('guardar la edición sin cambios no marca la cédula propia como repetida', E('curPt.cedula') === '1712345678' && !modalOpen());

  // ───────── 9. eliminar ─────────
  click($('[data-action="patients.openDelete"]'));
  check('el aviso de eliminar muestra qué se perderá (pagos) y su monto', /pagos: 1/.test(modal()) && /\$40\.00 en pagos/.test(modal()), modal());
  click($('[data-action="app.closeModal"]')); check('Cancelar no elimina nada', E('patients.length') === 2 && !!E('curPt'));
  click($('[data-action="patients.openDelete"]')); const delBtn = $('[data-action="patients.confirmDelete"]'); click(delBtn);
  check('confirmar elimina, deja curPt vacío y vuelve al inicio', E('patients.length') === 1 && E('curPt') === null && E('curPage') === 'dashboard' && $$('#ptList .sb-pt').length === 1);
  const eb = errs.length; delBtn.isConnected && click(delBtn); try { E('Patients.confirmDelete()'); } catch (e) { errs.push(e.message); }
  check('confirmar dos veces seguidas (doble clic) ya no lanza error', errs.length === eb, errs.slice(eb).join('|'));

  // ───────── 10. datos hostiles y buscador ─────────
  const EVIL = '<img src=x onerror=window.__xss=1> O\'Brien "q"';
  seed([{ id: BIG, name: EVIL, cedula: '1712345678', phone: '0991-234-567', diary: [{ id: 1, title: EVIL, body: 'dolor' }, { id: 2, title: 'Nota sin cuerpo' }], treatments: [{ id: 1, name: 'Endodoncia ' + EVIL, cost: 50, status: 'pendiente', date: '2026-10-01' }], appointments: [{ id: 1, reason: 'Control ' + EVIL, date: '2026-10-05', time: '09:00', status: 'pendiente' }] },
    { id: BIG + 7, name: 'José Núñez', cedula: '0102030405', recetas: [{ id: 12, diagnostico: 'Caries', medico: 'Dra. Ríos', fecha: '2026-10-01' }] }]);
  E("quickAppts=[{id:'q1',ptName:'Rápida <b>x</b>',reason:'limpieza',date:'2026-10-09',time:'10:00'}]");
  check('la lista lateral con nombre hostil no inyecta elementos y el clic funciona', !$('#ptList img') && (click($(`#ptList [data-id="${BIG}"]`)), E('curPt.id') === BIG));
  type('globalSearch', 'img'); const box = $('#searchResults');
  check('SEGURIDAD: el buscador muestra los nombres/títulos como texto (antes inyectaba HTML)', box.classList.contains('open') && D.querySelectorAll('#searchResults [onerror]').length === 0 && D.querySelectorAll('#searchResults img').length === 0 && /<img src=x/.test(box.textContent));
  check('el buscador agrupa por tipo (paciente, diario, tratamiento, cita)', ['Pacientes', 'Diario clínico', 'Tratamientos', 'Citas'].every(g => box.textContent.includes(g)));
  type('globalSearch', 'zzz<b>x</b>'); check('SEGURIDAD: «Sin resultados» no inyecta lo que escribió el usuario', /Sin resultados/.test($('#searchResults').textContent) && !$('#searchResults b b') && $('#searchResults strong').textContent === 'zzz<b>x</b>');
  let ok1 = true; try { type('globalSearch', 'qqqq'); } catch (e) { ok1 = false; }
  check('buscar con una nota sin cuerpo ya no se cae (antes lanzaba error)', ok1 && errs.length === 0, errs.join('|'));
  type('globalSearch', 'jose'); check('el buscador ignora acentos ("jose" → José Núñez)', /José Núñez/.test($('#searchResults').textContent));
  type('globalSearch', '0991234'); check('encuentra por teléfono aunque tenga guiones', /<img|Buscar|CI:/.test($('#searchResults').textContent) && $$('#searchResults .sr-item').length >= 1);
  type('globalSearch', 'caries'); check('encuentra recetas por diagnóstico', /Receta N° 000012/.test($('#searchResults').textContent));
  type('globalSearch', 'limpieza'); check('encuentra citas rápidas', /Cita rápida/.test($('#searchResults').textContent) && !$('#searchResults b'));

  // clic y teclado
  type('globalSearch', 'nota sin'); const it = $('#searchResults .sr-item'); it.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
  check('elegir un resultado del diario abre al paciente directamente en la pestaña Diario (sin esperas de 100 ms)', E('curPt.id') === BIG && E('curTab') === 'diario' && $('.tab.active').getAttribute('onclick').includes("'diario'") && D.getElementById('globalSearch').value === '' && !$('#searchResults').classList.contains('open'));
  type('globalSearch', 'jose'); const gs = D.getElementById('globalSearch'); key(gs, 'ArrowDown');
  check('flecha abajo resalta el primer resultado', $$('#searchResults .sr-item')[0].classList.contains('sr-active'));
  key(gs, 'Enter'); check('Enter abre el resultado resaltado', E('curPt.id') === BIG + 7);
  type('globalSearch', 'jose'); key(gs, 'Escape'); check('Escape cierra los resultados', !$('#searchResults').classList.contains('open'));
  gs.blur(); const ck = new w.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }); D.dispatchEvent(ck);
  check('Ctrl+K enfoca el buscador', D.activeElement === gs && ck.defaultPrevented);

  // ───────── 11. cita rápida → paciente (agenda usa la API) ─────────
  seed([{ id: 5, name: 'Ya existe', cedula: '1111111111' }]);
  E("quickAppts=[{id:'q9',ptName:'Rosa <i>Vera</i>',phone:'0988-111-222',reason:'Dolor',date:'2026-10-20',time:'11:00',status:'pendiente',notes:'n'}]; convertToPatient('q9')");
  check('convertir cita rápida usa el formulario estándar, con nombre y teléfono precargados y escapados', D.getElementById('f_name').value === 'Rosa <i>Vera</i>' && D.getElementById('f_phone').value === '0988-111-222' && !D.querySelector('#modalContent i'));
  setv('f_ced', '1111111111'); confirmAnswer = false; E("confirmConvert('q9')");
  check('convertir con una cédula ya registrada pide confirmación; si dice "no", no crea ni borra la cita rápida', E('patients.length') === 1 && E('quickAppts.length') === 1);
  confirmAnswer = true; setv('f_ced', '2222222222'); E("confirmConvert('q9')");
  const rosa = E("patients.find(p=>p.cedula==='2222222222')");
  check('al convertir: paciente creado con la cita asociada, cita rápida eliminada y ficha abierta', rosa && rosa.appointments.length === 1 && rosa.appointments[0].reason === 'Dolor' && E('quickAppts.length') === 0 && E('curPt.id') === rosa.id && Array.isArray(rosa.odoHistory));
  alerts.length = 0; E("quickAppts=[{id:'q10',ptName:'X'}]; convertToPatient('q10')"); setv('f_name', ''); E("confirmConvert('q10')");
  check('convertir sin nombre: aviso y la cita rápida se conserva', alerts.some(a => /nombre es obligatorio/i.test(a)) && E('quickAppts.length') === 1);
  E('closeModal()');

  // ───────── 12. auditoría del PIN sigue funcionando por el camino nuevo ─────────
  seed([{ id: 77, name: 'Auditada', cedula: '' }]);
  click($('#ptList [data-id="77"]')); click($('.sb-add')); fill({ name: 'Creada por clic' }); save1();
  click($('[data-action="patients.openDelete"]')); click($('[data-action="patients.confirmDelete"]')); await wait(100);
  await w.Seguridad._flush(); const log = (await E("idbGet('audit')")) || [];
  check('el registro de actividad anota abrir, crear y eliminar hechos con clics (no solo por llamadas directas)', log.some(x => x.ev === 'Abrió ficha' && x.det === 'Auditada') && log.some(x => x.ev === 'Creó paciente' && x.det === 'Creada por clic') && log.some(x => x.ev === 'Eliminó paciente'), JSON.stringify(log.slice(-6)));
  alerts.length = 0; const nCreate = log.filter(x => x.ev === 'Creó paciente').length; click($('.sb-add')); fill({ name: '' }); save1(); await w.Seguridad._flush();
  check('un intento de crear con datos inválidos NO queda registrado como creación', ((await E("idbGet('audit')")) || []).filter(x => x.ev === 'Creó paciente').length === nCreate);
  E('closeModal()');

  // abrir dos veces el mismo paciente seguido se anota una vez, con su nombre; abrir otro distinto sí se anota
  seed([{ id: 301, name: 'Paciente Uno' }, { id: 302, name: 'Paciente Dos' }]); await wait(1700); await w.Seguridad._flush();
  const n0 = ((await E("idbGet('audit')")) || []).filter(x => x.ev === 'Abrió ficha').length;
  click($('#ptList [data-id="301"]')); click($('#ptList [data-id="301"]')); click($('#ptList [data-id="302"]')); await w.Seguridad._flush();
  const ab = ((await E("idbGet('audit')")) || []).filter(x => x.ev === 'Abrió ficha').slice(n0);
  check('auditoría: abrir el mismo paciente dos veces seguidas se anota una sola vez y siempre con nombre', ab.length === 2 && ab[0].det === 'Paciente Uno' && ab[1].det === 'Paciente Dos', JSON.stringify(ab));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de Pacientes pasaron'); process.exit(fail ? 1 : 0);
});
