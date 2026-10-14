// Nube (Cloud): conexión, combinación entre dispositivos, borrado masivo y desconexión, contra un Supabase FALSO en memoria. Todo por CLIC.
require('fake-indexeddb/auto');
const { IDBFactory } = require('fake-indexeddb');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');


// ───────── Supabase falso (en memoria): suficiente para auth, membresías y la tabla sync_records con control de versión ─────────
function makeServer() {
  const S = { accounts: { 'dr@x.com': { pass: 'secret1', clinics: ['c1'] }, 'nuevo@x.com': { pass: 'secret2', clinics: [] } }, records: [], clock: 0, nClinic: 1, calls: { signIn: 0, signOut: 0, rpc: 0, created: 0 } };
  const ts = () => new Date(Date.UTC(2026, 0, 1) + (++S.clock) * 1000).toISOString();
  S.client = () => {
    let user = null; const me = () => S.accounts[user];
    const builder = (table) => {
      const q = { op: 'select', filters: [], limit: null, payload: null, head: false, count: false };
      const b = {
        select(c, o) { if (o && o.head) q.head = true; if (o && o.count) q.count = true; return b; }, eq(k, val) { q.filters.push(r => r[k] === val); return b; }, gte(k, val) { q.filters.push(r => r[k] >= val); return b; },
        order() { return b; }, limit(n) { q.limit = n; return b; }, insert(p) { q.op = 'insert'; q.payload = p; return b; }, update(p) { q.op = 'update'; q.payload = p; return b; },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      function run() {
        if (!user) return { data: null, error: { message: 'not logged in' } };
        if (table === 'clinic_members') return { data: me().clinics.map(id => ({ clinic_id: id, role: 'owner', clinics: { name: 'Clínica ' + id } })), error: null };
        if (table !== 'sync_records') return { data: null, error: { message: 'tabla desconocida' } };
        const match = r => q.filters.every(f => f(r));
        if (q.op === 'select') { let rows = S.records.filter(match).sort((a, c) => a.updated_at < c.updated_at ? -1 : 1); if (q.head) return { data: null, count: rows.length, error: null }; if (q.limit) rows = rows.slice(0, q.limit); return { data: rows.map(r => JSON.parse(JSON.stringify(r))), error: null }; }
        if (q.op === 'insert') {
          const arr = Array.isArray(q.payload) ? q.payload : [q.payload];
          for (const p of arr) if (S.records.some(r => r.clinic_id === p.clinic_id && r.kind === p.kind && r.id === p.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
          const out = arr.map(p => { const r = { clinic_id: p.clinic_id, kind: p.kind, id: p.id, data: JSON.parse(JSON.stringify(p.data)), rev: 1, deleted: false, updated_at: ts() }; S.records.push(r); return { kind: r.kind, id: r.id, rev: 1 }; });
          return { data: out, error: null };
        }
        if (q.op === 'update') { const rows = S.records.filter(match); rows.forEach(r => { Object.assign(r, JSON.parse(JSON.stringify(q.payload)), { updated_at: ts() }); }); return { data: rows.map(r => ({ rev: r.rev })), error: null }; }
      }
      return b;
    };
    return {
      auth: {
        async signInWithPassword({ email, password }) { S.calls.signIn++; const a = S.accounts[email]; if (!a || a.pass !== password) return { data: {}, error: { message: 'Invalid login credentials' } }; user = email; return { data: { session: { user: { email } } }, error: null }; },
        async signOut() { S.calls.signOut++; user = null; return { error: null }; },
        async getSession() { return { data: { session: user ? { user: { email: user } } : null } }; },
      },
      from: builder,
      async rpc(name, args) { S.calls.rpc++; if (name === 'create_clinic') { const id = 'n' + (++S.nClinic); me().clinics.push(id); S.calls.created++; return { data: id, error: null }; } return { data: null, error: { message: 'rpc?' } }; },
      _logout() { user = null; },
    };
  };
  S.alive = kind => S.records.filter(r => r.clinic_id === 'c1' && r.kind === kind && !r.deleted).length;
  return S;
}

srv.listen(0, async () => {
  console.log('\nOdontoApp — Nube (conexión, combinar dispositivos, borrado masivo, desconexión)');
  const errs = [], alerts = [], asked = []; let confirmSeq = [], confirmDefault = true;
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  const S = makeServer();
  const openApp = async () => {
    const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        w.indexedDB = new IDBFactory(); w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m));
        w.confirm = m => { asked.push(String(m)); return confirmSeq.length ? confirmSeq.shift() : confirmDefault; };
        w.supabase = { createClient: () => S.client() };
      } });
    await wait(1800); return dom.window;
  };
  const mk = w => {
    const D = w.document;
    return { w, D, E: s => w.eval(s), $: s => D.querySelector(s), $$: s => [...D.querySelectorAll(s)],
      click: el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })), setv: (id, val) => { D.getElementById(id).value = val; },
      modal: () => (D.getElementById('modalContent') || {}).textContent || '', modalOpen: () => D.getElementById('modalOverlay').classList.contains('show'),
      act: (name, sel = '') => D.querySelector(`[data-action="${name}"]${sel}`), key: (id, k) => D.getElementById(id).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true })) };
  };
  const reset = (seq = [], def = true) => { alerts.length = 0; asked.length = 0; confirmSeq = seq.slice(); confirmDefault = def; };
  const pts = (E, n, pre = 'P') => E(`Patients.all().length=0;${Array.from({ length: n }, (_, i) => `Patients.all().push(Patients.blank({id:${(pre === 'P' ? 100 : 200) + i},name:'${pre}${i}',cedula:'17${pre === 'P' ? 1 : 2}000000${i}'}))`).join(';')};saveNow()`);
  const connectForm = (A, f) => { A.E('Cloud.openSetup()'); Object.entries({ f_sburl: f.url, f_sbkey: f.key, f_sbmail: f.mail, f_sbpass: f.pass }).forEach(([k, val]) => { if (val !== undefined) A.setv(k, val); }); };
  const KEY = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.firma-de-prueba-123';
  const KEY_SERVICE = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.firma-de-prueba-123';
  const URLOK = 'https://abcdefgh.supabase.co', hostile = '<img src=x onerror=1 id=PWN>';
  const login = async (A, mail = 'dr@x.com', pass = 'secret1') => { connectForm(A, { url: URLOK, key: KEY, mail, pass }); A.click(A.act('cloud.connect')); await wait(900); };

  const A = mk(await openApp());

  // ───────── 1. estructura ─────────
  const strip = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  check('sync.js ya no contiene ningún handler inline', !/\son(click|input|change|keydown|mouseover|mouseout)\s*=/i.test(strip('js/sync.js')));
  check('index.html ya no tiene NINGÚN onclick', !/\son(click|input|change|keydown)\s*=/i.test(read('index.html')));
  check('Cloud existe y los nombres antiguos ya no son globales', A.E('typeof Cloud') === 'object' && ['openSbSetup', 'sbConectar', 'sbDesconectar', 'sbAction', 'sbSyncManual', 'syncRecuperarDeNube', 'syncConfirmarBorrado', 'openSbPanel', 'copiarSqlSync'].every(n => A.E(`typeof ${n}`) === 'undefined'));

  // ───────── 2. validación sin red ─────────
  const cc = o => A.E(`Cloud.checkConnect(${JSON.stringify({ url: URLOK, key: KEY, mail: 'dr@x.com', pass: 'secret1', ...o })})`);
  check('datos correctos: sin error', cc({}).ok === true);
  check('la URL se limpia (barra final y /rest/v1) y se avisa', cc({ url: URLOK + '/rest/v1/' }).clean.url === URLOK && cc({ url: URLOK + '/' }).clean.url === URLOK && cc({ url: URLOK + '/' }).warnings.length === 1);
  check('la dirección del panel de Supabase se rechaza con una explicación', /panel de Supabase/.test(cc({ url: 'https://supabase.com/dashboard/project/abc' }).error || ''));
  check('URL inválida (sin https, con espacios, otra cosa) se rechaza; localhost sí vale', ['http://abc.supabase.co', 'abcdefgh.supabase.co', 'https://a b.co', 'ftp://x.co', 'javascript:alert(1)'].every(u => !cc({ url: u }).ok) && cc({ url: 'http://localhost:54321' }).ok === true);
  check('SEGURIDAD: la clave «service_role» se rechaza (da acceso total a la base)', /service_role/.test(cc({ key: KEY_SERVICE }).error || '') && /SECRETA/.test(cc({ key: 'sb_secret_abcdefghijklmnopqrstuvwxyz' }).error || ''));
  check('la clave «publishable» nueva y la anon sí se aceptan; una muy corta o con espacios no', cc({ key: 'sb_publishable_abcdefghijklmnop' }).ok === true && !cc({ key: 'abc' }).ok && !cc({ key: KEY + ' x' }).ok);
  check('correo inválido y contraseña vacía se rechazan', !cc({ mail: 'drx.com' }).ok && !cc({ pass: '' }).ok);
  check('el ID de clínica anterior se normaliza (minúsculas, espacios→guion) y rechaza símbolos', cc({ legacy: ' Dr Garcia Quito ' }).clean.legacy === 'dr-garcia-quito' && !cc({ legacy: 'a;b' }).ok);

  // ───────── 3. pantalla de conexión ─────────
  A.E("sbUrl=" + JSON.stringify(hostile)); A.click(A.$('#sbBtn')); check('sin conexión, el botón de la barra abre «Conectar con Supabase»', A.modalOpen() && !!A.D.getElementById('f_sburl') && /Conectar con Supabase/.test(A.modal()));
  check('SEGURIDAD: una URL guardada con HTML no inyecta nada en el formulario', !A.$('#PWN') && A.D.getElementById('f_sburl').value === hostile); A.E("sbUrl=''"); A.click(A.$('#modalOverlay'));
  reset(); A.E('Cloud.copySql()'); await wait(100); check('«Copiar SQL» no rompe aunque no haya portapapeles', true);

  // ───────── 4. fallos al conectar ─────────
  pts(A.E, 3); reset(); connectForm(A, { url: '', key: KEY, mail: 'dr@x.com', pass: 'x' }); const calls0 = S.calls.signIn; A.click(A.act('cloud.connect'));
  check('campos vacíos: avisa y NO llama a la nube', /Completa URL/.test(alerts[0] || '') && S.calls.signIn === calls0, alerts[0]);
  reset(); connectForm(A, { url: URLOK, key: KEY_SERVICE, mail: 'dr@x.com', pass: 'secret1' }); A.click(A.act('cloud.connect')); check('clave service_role: avisa y NO llama a la nube', /service_role/.test(alerts[0] || '') && S.calls.signIn === calls0);
  reset(); connectForm(A, { url: URLOK, key: KEY, mail: 'dr@x.com', pass: 'mala' }); A.click(A.act('cloud.connect')); await wait(300);
  check('contraseña incorrecta: mensaje claro en pantalla, botón disponible de nuevo', /Correo o contraseña incorrectos/.test(A.D.getElementById('sb-status').textContent) && !A.D.getElementById('sbGo').disabled && A.modalOpen());
  const lsCfg = JSON.parse(A.w.localStorage.getItem('oa3_sb') || '{}');
  check('…y no queda nada a medio guardar (ni conexión, ni clínica, ni URL en memoria)', !lsCfg.clinicUuid && !A.E('sbClient') && A.E('sbUrl') === '' && A.E('Cloud.info().connected') === false, JSON.stringify(lsCfg));

  // ───────── 5. cuenta sin clínica ─────────
  reset([false]); const so = S.calls.signOut; connectForm(A, { url: URLOK, key: KEY, mail: 'nuevo@x.com', pass: 'secret2' }); A.click(A.act('cloud.connect')); await wait(400);
  check('cuenta sin clínica: pregunta; «no» cancela, no crea nada y cierra la sesión que abrió', /todavía no tiene una clínica/.test(asked[0] || '') && /Conexión cancelada/.test(A.D.getElementById('sb-status').textContent) && S.calls.created === 0 && S.calls.signOut === so + 1 && !A.E('sbClient'));
  reset([true]); A.click(A.act('cloud.connect')); await wait(1200);
  check('«sí» crea la clínica, conecta y muestra el panel', S.calls.created === 1 && /Sincronización en la nube/.test(A.modal()) && /nuevo@x\.com/.test(A.modal()) && A.E('Cloud.info().ready') === true, A.modal().slice(0, 120));
  reset(); A.click(A.act('cloud.disconnect')); await wait(300); A.E("Cloud.info()");

  // ───────── 6. primer dispositivo con datos ─────────
  pts(A.E, 3); reset(); await login(A);
  check('conecta (la nube estaba vacía: no hay nada que combinar) y abre el panel con el correo', asked.length === 0 && /Conectado · dr@x\.com/.test(A.modal()) && A.E('Cloud.info().ready') === true, A.modal().slice(0, 150));
  check('la primera sincronización subió los 3 pacientes y no queda nada pendiente', S.alive('patient') === 3 && A.E('SyncEngine.countPending()') === 0, S.alive('patient'));
  check('la barra lateral dice «Sincronizado»', /Sincronizado/.test(A.D.getElementById('sbBtn').textContent), A.D.getElementById('sbBtn').textContent);
  check('la URL, la clínica y el correo quedaron guardados', JSON.parse(A.w.localStorage.getItem('oa3_sb')).clinicUuid === 'c1' && JSON.parse(A.w.localStorage.getItem('oa3_sb')).email === 'dr@x.com');
  A.click(A.$('#sbBtn')); check('con conexión, el botón de la barra abre el PANEL (no el formulario)', /Sincronización en la nube/.test(A.modal()) && !A.D.getElementById('f_sburl'));

  // ───────── 7. segundo dispositivo ─────────
  const B = mk(await openApp()); pts(B.E, 1, 'B'); reset([true]); await login(B);
  check('dispositivo B (ya tiene 1 paciente y la nube 3): pregunta si COMBINAR y dice las cifras', /La nube ya tiene 3 paciente\(s\) y este dispositivo tiene 1/.test(asked[0] || ''), asked[0]);
  check('«combinar» conserva todo: B queda con 4 y la nube también', B.E('Patients.all().length') === 4 && S.alive('patient') === 4, B.E('Patients.all().length') + '/' + S.alive('patient'));
  A.click(A.act('cloud.syncNow')); await wait(900); check('«Sincronizar ahora» en A trae el paciente de B (4)', A.E('Patients.all().length') === 4 && /Sincronización en la nube/.test(A.modal()), A.E('Patients.all().length'));
  const C = mk(await openApp()); pts(C.E, 2, 'C'); reset([false, false]); await login(C);
  check('C: «no combinar» y «no reemplazar» → cancela y NO cambia nada', asked.length === 2 && /Conexión cancelada\. No se cambió nada/.test(C.D.getElementById('sb-status').textContent) && C.E('Patients.all().length') === 2 && S.alive('patient') === 4);
  reset([false, true]); C.click(C.act('cloud.connect')); await wait(1200);
  check('C: «no combinar» y «sí reemplazar» → C queda solo con lo de la nube (4) y la nube no cambia', C.E('Patients.all().length') === 4 && !C.E('Patients.all().some(p=>/^C/.test(p.name))') && S.alive('patient') === 4, C.E('Patients.all().map(p=>p.name)'));
  C.w.close();

  // ───────── 8. un intento fallido de «Cambiar cuenta» no rompe la conexión que ya funcionaba ─────────
  reset(); A.click(A.act('cloud.openSetup')); A.setv('f_sburl', 'https://otro.supabase.co'); A.setv('f_sbpass', 'mala'); A.click(A.act('cloud.connect')); await wait(300);
  check('contraseña mala en «Cambiar cuenta»: error en pantalla…', /incorrectos/.test(A.D.getElementById('sb-status').textContent));
  check('…y la conexión anterior sigue intacta (URL, clínica y sincronización) — ANTES quedaba rota hasta recargar', A.E('sbUrl') === URLOK && A.E('Cloud.info().ready') === true && A.E('SyncEngine.info().meta') !== null);
  A.E("Patients.all().push(Patients.blank({id:900,name:'Nuevo en A'}));saveNow()"); A.E('SyncEngine.syncNow()'); await wait(700); check('…y todavía sube cambios', S.alive('patient') === 5, S.alive('patient'));
  reset([false]); A.E('Cloud.openSetup()'); A.setv('f_sburl', URLOK); A.setv('f_sbkey', KEY); A.setv('f_sbmail', 'nuevo@x.com'); A.setv('f_sbpass', 'secret2'); S.accounts['nuevo@x.com'].clinics = []; A.click(A.act('cloud.connect')); await wait(500);
  check('cuenta sin clínica cancelada desde «Cambiar cuenta»: la sesión nueva se cierra y la anterior pide volver a entrar (no queda mezclada)', A.E('Cloud.info().ready') === false && A.E('sbUrl') === URLOK && A.E('SyncEngine.info().needLogin') === true, JSON.stringify(A.E('SyncEngine.info().needLogin')));
  reset(); A.E('Cloud.openPanel()'); check('el panel lo dice: «Sesión expirada»', /Sesión expirada/.test(A.modal()));
  reset(); A.click(A.act('cloud.syncNow')); check('«Sincronizar ahora» con sesión expirada avisa qué hacer', /Cambiar cuenta/.test(alerts[0] || ''), alerts[0]);
  reset(); await login(A);
  check('volver a entrar con la cuenta correcta lo deja funcionando', A.E('Cloud.info().ready') === true && /Conectado/.test(A.modal()), A.modal().slice(0, 100));

  // ───────── 9. protección contra borrado masivo ─────────
  A.E("Patients.all().length=0;saveNow()"); A.E('SyncEngine.syncNow()'); await wait(700);
  const alive0 = S.alive('patient'); A.click(A.$('#sbBtn'));
  check('borrar todo en un dispositivo NO borra la nube y el panel avisa', alive0 === 5 && /Se bloqueó un borrado masivo/.test(A.modal()) && !!A.act('cloud.recover') && !!A.act('cloud.allowDeletes'), alive0 + A.modal().slice(0, 100));
  check('la barra lateral lo marca como «Revisa un borrado masivo»', /borrado masivo/.test(A.D.getElementById('sbBtn').textContent), A.D.getElementById('sbBtn').textContent);
  reset([false]); A.click(A.act('cloud.recover')); await wait(200); check('«Recuperar desde la nube»: avisa que reemplaza; «no» no cambia nada', /SE REEMPLAZARÁN/.test(asked[0] || '') && A.E('Patients.all().length') === 0);
  reset([true]); A.click(A.act('cloud.recover')); await wait(1500);
  check('«sí» recupera los 5 pacientes y el aviso desaparece', A.E('Patients.all().length') === 5 && !/Se bloqueó/.test(A.modal()) && S.alive('patient') === 5, A.E('Patients.all().length') + '/' + S.alive('patient'));
  A.E("Patients.all().length=0;saveNow()"); A.E('SyncEngine.syncNow()'); await wait(700); A.click(A.$('#sbBtn'));
  reset([false]); A.click(A.act('cloud.allowDeletes')); await wait(300); check('«Sí, los eliminé a propósito»: pide confirmación; «no» deja la nube intacta', /BORRARÁ también en la nube/.test(asked[0] || '') && S.alive('patient') === 5);
  reset([true]); A.click(A.act('cloud.allowDeletes')); await wait(1200); check('«sí» sí propaga el borrado a la nube y quita el aviso', S.alive('patient') === 0 && !/Se bloqueó/.test(A.modal()), S.alive('patient'));
  pts(A.E, 3); A.E('SyncEngine.syncNow()'); await wait(800);

  // ───────── 10. panel: textos del usuario ─────────
  A.E(`SyncEngine.info().cfg.email=${JSON.stringify(hostile)};SyncEngine.info().meta.log.push({t:Date.now(),label:${JSON.stringify(hostile)},path:${JSON.stringify(hostile)},lost:${JSON.stringify(hostile)},won:'local'})`);
  A.click(A.$('#sbBtn')); check('SEGURIDAD: correo y cambios descartados con HTML se ven como texto en el panel', !A.$('#PWN') && !A.$('[onerror]') && A.modal().includes(hostile)); A.E("SyncEngine.info().cfg.email='dr@x.com'");
  check('el panel no usa onclick', !/\sonclick=/.test(A.D.getElementById('modalContent').innerHTML));

  // ───────── 11. desconectar ─────────
  A.E('Cloud.openPanel()'); reset([false]); A.click(A.act('cloud.disconnect')); await wait(100);
  check('desconectar: pregunta; «no» deja todo conectado', /Cerrar sesión y desconectar/.test(asked[0] || '') && A.E('Cloud.info().connected') === true);
  reset([true]); const so2 = S.calls.signOut; const nPts = A.E('Patients.all().length'); A.click(A.act('cloud.disconnect')); await wait(300);
  check('«sí»: cierra sesión, borra la configuración de la nube y NO toca los datos locales ni los de la nube', S.calls.signOut === so2 + 1 && A.E('Cloud.info().connected') === false && !JSON.parse(A.w.localStorage.getItem('oa3_sb')).clinicUuid && A.E('Patients.all().length') === nPts && S.alive('patient') === 3 && !A.modalOpen(), S.alive('patient'));
  check('la barra lateral vuelve a «Conectar Supabase»', /Conectar Supabase/.test(A.D.getElementById('sbBtn').textContent), A.D.getElementById('sbBtn').textContent);
  A.click(A.$('#sbBtn')); check('y el botón vuelve a abrir el formulario', !!A.D.getElementById('f_sburl'));

  // ───────── 12. Enter en la contraseña ─────────
  reset(); A.setv('f_sburl', URLOK); A.setv('f_sbkey', KEY); A.setv('f_sbmail', 'dr@x.com'); A.setv('f_sbpass', 'secret1'); A.key('f_sbpass', 'Enter'); await wait(1200);
  check('Enter en la contraseña conecta', A.E('Cloud.info().ready') === true && /Sincronización en la nube/.test(A.modal()));
  reset(); A.E('Cloud.openSetup()'); A.setv('f_sburl', URLOK); A.setv('f_sbkey', KEY); A.setv('f_sbmail', 'dr@x.com'); A.setv('f_sbpass', 'secret1'); const si = S.calls.signIn; A.click(A.act('cloud.connect')); A.click(A.act('cloud.connect')); await wait(1200);
  check('doble clic en «Conectar» no abre dos sesiones', S.calls.signIn === si + 1, S.calls.signIn - si);
  check('«Importar de la nube antigua» solo aparece si hay un ID anterior distinto', !A.act('cloud.importOld'));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.slice(0, 3).join(' | '));
  A.w.close(); B.w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : `\n✔ Todas las pruebas de la Nube pasaron (${results.length} comprobaciones)`); process.exit(fail ? 1 : 0);
});
