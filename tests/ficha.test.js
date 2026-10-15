// N.° de ficha: número corto y secuencial, migración de pacientes antiguos, duplicados entre dispositivos, búsqueda y registro de actividad.
require('fake-indexeddb/auto');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const errs = [], alerts = []; let confirmAns = true, lastBlob = null, lastInput = null;
srv.listen(0, async () => {
  const url = `http://localhost:${srv.address().port}/index.html`;
  console.log('\nOdontoApp — N.° de ficha (secuencial, migración, duplicados, búsqueda, registro)');
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const dom = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) { w.indexedDB = indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = () => confirmAns;
      w.URL.createObjectURL = b => { lastBlob = b; return 'blob:x'; }; w.URL.revokeObjectURL = () => {};
      const oc = w.HTMLInputElement.prototype.click; w.HTMLInputElement.prototype.click = function () { if (this.type === 'file') lastInput = this; else oc.call(this); }; } });
  const w = dom.window, D = w.document, E = s => w.eval(s); await wait(2200);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const act = (name, sel = '') => D.querySelector(`[data-action="${name}"]${sel}`);
  const txt = () => D.getElementById('mainContent').textContent;
  const pt = (id, name, extra = {}) => Object.assign({ id, name }, extra);
  const set = list => { w.__L = JSON.parse(JSON.stringify(list)); E('Patients.setAll(__L.map(p=>Object.assign(p)))'); };
  const fichas = () => E('Patients.all().map(p=>p.ficha)');

  // ───────── 1. asignación ─────────
  E("Counters.set('nextId',1)"); set([pt(1, 'Uno'), pt(2, 'Dos'), pt(3, 'Tres')]);
  check('pacientes con id pequeño conservan su número como ficha', JSON.stringify(fichas()) === '[1,2,3]', fichas());
  const BIG = 1792000000000000;
  E("Counters.set('nextId',1)"); set([pt(BIG + 5, 'C'), pt(BIG + 1, 'A'), pt(BIG + 3, 'B')]);
  check('ids largos reciben 1, 2, 3 por ORDEN DE CREACIÓN (id menor = más antiguo)', E('Patients.get(' + (BIG + 1) + ').ficha') === 1 && E('Patients.get(' + (BIG + 3) + ').ficha') === 2 && E('Patients.get(' + (BIG + 5) + ').ficha') === 3);
  E("Counters.set('nextId',1)"); set([pt(1, 'A'), pt(BIG, 'B'), pt(2, 'C'), pt(BIG + 1, 'D')]);
  check('mezcla: los antiguos conservan su número y los nuevos siguen después', E('Patients.get(1).ficha') === 1 && E('Patients.get(2).ficha') === 2 && E(`Patients.get(${BIG}).ficha`) === 3 && E(`Patients.get(${BIG + 1}).ficha`) === 4, fichas());
  E("Counters.set('nextId',1)"); set([pt(10, 'A', { ficha: 5 }), pt(11, 'B', { ficha: 5 }), pt(12, 'C', { ficha: 6 })]);
  check('fichas repetidas: se queda la del paciente más antiguo y el otro recibe un número nuevo', E('Patients.get(10).ficha') === 5 && E('Patients.get(12).ficha') === 6 && E('Patients.get(11).ficha') > 6 && new Set(fichas()).size === 3, fichas());
  E("Counters.set('nextId',1)"); set([pt(20, 'A', { ficha: 0 }), pt(21, 'B', { ficha: -3 }), pt(22, 'C', { ficha: '4' }), pt(23, 'D', { ficha: 1.5 }), pt(24, 'E', { ficha: 1e12 }), pt(25, 'F', { ficha: null }), pt(26, 'G', { ficha: NaN })]);
  check('fichas inválidas (0, negativa, texto, decimal, enorme, nula) se reemplazan por números válidos y únicos', fichas().every(f => Number.isInteger(f) && f > 0 && f < 1e9) && new Set(fichas()).size === 7, fichas());
  // determinista: mismo resultado sin importar el orden en que llegan
  const base = [pt(BIG + 9, 'X', { ficha: 7 }), pt(BIG + 2, 'Y', { ficha: 7 }), pt(BIG + 4, 'Z')];
  E("Counters.set('nextId',1)"); set(base); const a1 = JSON.stringify(E('Patients.all().map(p=>[p.id,p.ficha]).sort((a,b)=>a[0]-b[0])'));
  E("Counters.set('nextId',1)"); set(base.slice().reverse()); const a2 = JSON.stringify(E('Patients.all().map(p=>[p.id,p.ficha]).sort((a,b)=>a[0]-b[0])'));
  check('el resultado NO depende del orden de llegada (dos dispositivos llegan a lo mismo)', a1 === a2, a1 + ' vs ' + a2);
  check('ejecutarlo de nuevo no cambia nada (estable)', E('Patients.assignFichas()') === 0);
  check('setAll con datos sin ficha los numera Y guarda (para que la migración quede)', (() => { E("Counters.set('nextId',1)"); set([pt(1, 'A'), pt(2, 'B')]); return true; })() && (E('Patients.all().every(p=>p.ficha>0)')));

  // ───────── 2. nuevos pacientes ─────────
  E("Counters.set('nextId',1)"); set([pt(1, 'A'), pt(2, 'B'), pt(3, 'C')]);
  E("Patients.setCurrent(null)"); E("Patients.openNew()"); D.getElementById('f_name').value = 'Nuevo Cuarto'; click(act('patients.saveNew')); await wait(150);
  check('un paciente creado por el formulario recibe el siguiente número (4)', E('Patients.current().ficha') === 4, E('Patients.current().ficha'));
  E(`Patients.remove(${E('Patients.current().id')})`);
  E("Patients.openNew()"); D.getElementById('f_name').value = 'Nuevo Quinto'; click(act('patients.saveNew')); await wait(150);
  check('el número de uno ELIMINADO no se reutiliza (el registro seguiría apuntando a otra persona)', E('Patients.current().ficha') === 5, E('Patients.current().ficha'));
  E("quickAppts=undefined"); // no existe: no debe afectar
  check('el número también viaja en la copia/sincronización (campo del paciente)', JSON.parse(JSON.stringify(E('Patients.current()'))).ficha === 5);

  // ───────── 3. pantalla y búsqueda ─────────
  E("showPage('dashboard')"); await wait(100);
  check('la lista lateral muestra «N° x» de cada paciente', /N° 1 · /.test(D.getElementById('ptList').textContent) && /N° 5 · /.test(D.getElementById('ptList').textContent));
  click(act('patients.select', `[data-id="${E('Patients.all()[1].id')}"]`)); await wait(100);
  check('la cabecera de la ficha muestra «📁 N° 2»', /📁 N° 2/.test(D.getElementById('ptWinHeader').textContent));
  check('«Información personal» incluye «N° de ficha»', /N° de ficha/.test(txt()));
  const inp = D.getElementById('searchInput');
  const filt = q => { inp.value = q; E('Patients.renderList()'); return [...D.querySelectorAll('#ptList .sb-pt-name')].map(e => e.textContent); };
  check('escribir «3» en el filtro lateral encuentra la ficha 3', filt('3').includes('C'), filt('3'));
  check('«#3», «ficha 3» y «N° 3» también', ['#3', 'ficha 3', 'N° 3', 'n3'].every(q => filt(q).includes('C')) || ['#3', 'ficha 3', 'N° 3'].every(q => filt(q).includes('C')), JSON.stringify(['#3', 'ficha 3', 'N° 3', 'n3'].map(filt)));
  check('«33» no encuentra la ficha 3', !filt('33').includes('C'));
  inp.value = ''; E('Patients.renderList()');
  E("Search.run('#2')"); await wait(60);
  check('el buscador global encuentra la ficha por número y muestra «Ficha N° 2»', /Ficha N° 2/.test(D.getElementById('searchResults').textContent) && /B/.test(D.getElementById('searchResults').textContent), D.getElementById('searchResults').textContent.slice(0, 100));
  E("Search.hide()");

  // ───────── 4. registro de actividad ─────────
  E("Counters.set('nextId',1)"); set([pt(BIG + 1, 'Ana Privada'), pt(BIG + 2, 'Beto Privado')]);
  await E("idbSet('audit', [])"); E("localStorage.removeItem('oa3_audit_fichas');localStorage.removeItem('oa3_audit_fichas2')");
  E('Patients.renderList()'); E(`Patients.select(${BIG + 2})`); await wait(200); await w.eval('Seguridad')._flush();
  let log = (await E("idbGet('audit')")) || [];
  check('al abrir una ficha se anota el N.° CORTO (2), no el id largo ni el nombre', log.some(x => x.ev === 'Abrió ficha' && x.det === 'Ficha N° 2') && !JSON.stringify(log).includes(String(BIG)) && !/Privad/.test(JSON.stringify(log)), JSON.stringify(log));
  await E(`idbSet('audit', [
    {t:1,ev:'Abrió ficha',det:'Ana Privada'},{t:2,ev:'Abrió ficha',det:'Ficha N° ${BIG + 2}'},{t:3,ev:'Completó cita',det:'Ficha N° ${BIG + 1} · id 9'},
    {t:4,ev:'Abrió ficha',det:'Ficha N° 77'},{t:5,ev:'Abrió ficha',det:'Ficha N° ${BIG + 99}'},{t:6,ev:'Agregó servicio al catálogo',det:'Limpieza'}])`);
  E("localStorage.removeItem('oa3_audit_fichas');localStorage.removeItem('oa3_audit_fichas2')");
  E("Seguridad.verRegistro()"); await wait(500);
  log = (await E("idbGet('audit')")) || [];
  const by = (ev, t) => log.find(x => x.t === t).det;
  check('registros antiguos: el nombre → ficha corta', by('', 1) === 'Ficha N° 1', by('', 1));
  check('…el id largo (v20–v21) → ficha corta, conservando el «· id 9»', by('', 2) === 'Ficha N° 2' && by('', 3) === 'Ficha N° 1 · id 9', by('', 2) + ' / ' + by('', 3));
  check('…una ficha corta ya correcta no se toca; un id largo que ya no existe se deja como está', by('', 4) === 'Ficha N° 77' && by('', 5) === 'Ficha N° ' + (BIG + 99) && by('', 6) === 'Limpieza');
  check('…y la limpieza no se repite', w.localStorage.getItem('oa3_audit_fichas') === '1' && w.localStorage.getItem('oa3_audit_fichas2') === '1' && (await E('Seguridad._limpiarNombres()')) === 0);
  E("closeModal()");

  // ───────── 5. respaldos ─────────
  E("Counters.set('nextId',1)"); set([pt(BIG + 1, 'A'), pt(BIG + 2, 'B')]);
  E('Backup.exportFile()'); await wait(150);
  const exp = JSON.parse(await new Promise(ok => { const r = new w.FileReader(); r.onload = () => ok(r.result); r.readAsText(lastBlob); }));
  check('el archivo de respaldo incluye la ficha de cada paciente', exp.patients.map(p => p.ficha).join() === '1,2', exp.patients.map(p => p.ficha));
  const r1 = await E(`Backup.replaceAll({patients:[{id:${BIG + 7},name:'Sin ficha'},{id:${BIG + 8},name:'Ficha repetida',ficha:3},{id:${BIG + 6},name:'Ficha 3',ficha:3}]},'t')`);
  check('al restaurar un respaldo sin fichas o con repetidas, quedan todas únicas y válidas', r1.ok && E('Patients.all().every(p=>p.ficha>0)') && new Set(fichas()).size === 3, fichas());
  const r2 = await E(`Backup.replaceAll({patients:[{id:5,name:'Antiguo'}]},'t')`);
  check('un respaldo antiguo (ids pequeños) conserva el número = id', r2.ok && E('Patients.all()[0].ficha') === 5);
  check('el contador nextId queda por encima de la mayor ficha', E("Counters.get('nextId')") > 5);
  check('sin errores de JavaScript', errs.length === 0, errs.join(' | '));
  const bad = results.filter(x => !x).length; console.log(bad ? `\n✘ ${bad} comprobación(es) fallaron` : `\n✔ Todas las pruebas de N.° de ficha pasaron (${results.length} comprobaciones)`);
  w.close(); srv.close(); process.exit(bad ? 1 : 0);
});
