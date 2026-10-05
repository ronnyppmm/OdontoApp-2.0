// Sincronización por registros contra PostgreSQL + PostgREST REALES (RLS, versiones, lápidas, paginación).
// Requiere el stack de tests/pg/start.sh. Si no está levantado, estas pruebas se omiten.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const PGREST = process.env.PGREST_URL || 'http://127.0.0.1:3100';
const SECRET = 'super-secreto-de-prueba-de-32-caracteres-minimo!!';
const ROOT = path.resolve(__dirname, '..');
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try { const r = await fetch(PGREST + '/'); if (!r.ok) throw 0; } catch (e) { console.log('\nSincronización (PostgreSQL real) — OMITIDA: no hay PostgREST en ' + PGREST + ' (ver tests/pg/start.sh; ejecútalo con: bash tests/pg/start.sh)'); process.exit(0); }
  require('fake-indexeddb/auto');
  const { IDBFactory } = require('fake-indexeddb');
  const { JSDOM, VirtualConsole } = require('jsdom');
  const { createClient } = require('@supabase/supabase-js');
  const sql = q => execSync(`su postgres -c "psql -qAt -d odonto"`, { input: q }).toString().trim();
  const jwt = sub => { const b = o => Buffer.from(JSON.stringify(o)).toString('base64url'); const h = b({ alg: 'HS256', typ: 'JWT' }) + '.' + b({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }); return h + '.' + crypto.createHmac('sha256', SECRET).update(h).digest('base64url'); };
  const mkUser = (email) => { const id = crypto.randomUUID(); sql(`insert into auth.users(id,email) values ('${id}','${email}');`); return { id, email, jwt: jwt(id) }; };
  const rowsOf = cid => JSON.parse(sql(`select coalesce(json_agg(r),'[]') from (select kind,id,rev,deleted,data from sync_records where clinic_id='${cid}') r;`));
  const alive = (cid, kind) => rowsOf(cid).filter(r => r.kind === kind && !r.deleted);
  const totalRev = cid => +sql(`select coalesce(sum(rev),0)||'/'||count(*) from sync_records where clinic_id='${cid}';`).split('/')[0];

  // proxy: supabase-js habla con /rest/v1/*, PostgREST escucha en la raíz
  const proxy = http.createServer((q, r) => {
    const p = http.request(PGREST + q.url.replace(/^\/rest\/v1/, ''), { method: q.method, headers: q.headers }, pr => { r.writeHead(pr.statusCode, pr.headers); pr.pipe(r); });
    p.on('error', () => { r.writeHead(502); r.end(); }); q.pipe(p);
  }); await new Promise(r => proxy.listen(0, r)); const proxyUrl = 'http://127.0.0.1:' + proxy.address().port;
  const app = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[path.extname(f)] || 'text/plain';
      r.writeHead(200, { 'Content-Type': t }); r.end(u === '/' ? d.toString().replace(/<script src="https:\/\/cdn\.jsdelivr[^>]*><\/script>/, '') : d); });
  }); await new Promise(r => app.listen(0, r)); const appUrl = 'http://localhost:' + app.address().port + '/';
  const errs = [];

  async function boot(user, name) {
    const hooks = { offline: false, noSession: false, beforePatch: null, patches: 0 };
    const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/googleapis|gstatic|Not implemented|serviceWorker|jsdelivr/i.test(e.message)) errs.push(name + ': ' + e.message.slice(0, 200)); });
    const dom = await JSDOM.fromURL(appUrl, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        w.indexedDB = new IDBFactory(); w.IDBKeyRange = require('fake-indexeddb').IDBKeyRange; w.scrollTo = () => {}; w.alert = () => {}; w.confirm = () => true;
        w.supabase = { createClient: () => {
          const c = createClient(proxyUrl, 'anon-key-de-prueba', { auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: 'Bearer ' + user.jwt }, fetch: async (url, opt = {}) => {
              if (hooks.offline) throw new TypeError('Failed to fetch');
              if ((opt.method || 'GET') === 'PATCH') { hooks.patches++; if (hooks.beforePatch) { const f = hooks.beforePatch; hooks.beforePatch = null; f(); } }
              return fetch(url, opt); } } });
          c.auth.signInWithPassword = async ({ password }) => password === 'mala' ? { data: {}, error: { message: 'Invalid login credentials' } } : { data: { session: { access_token: user.jwt }, user: { id: user.id } }, error: null };
          c.auth.getSession = async () => ({ data: { session: hooks.noSession ? null : { access_token: user.jwt } } });
          c.auth.signOut = async () => ({ error: null }); return c; } };
      } });
    await wait(1800); const w = dom.window; w.__hooks = hooks; w.__dom = dom; return w;
  }
  const connect = async (w, user, pass = 'ok') => {
    w.openSbSetup(); const set = (i, v) => { w.document.getElementById(i).value = v; };
    set('f_sburl', 'https://prueba.supabase.co'); set('f_sbkey', 'anon'); set('f_sbmail', user.email); set('f_sbpass', pass);
    await w.sbConectar(); await wait(150);
  };
  const sync = async w => { await w.SyncEngine.syncNow(); await wait(30); };
  const ev = (w, s) => w.eval(s);
  const pt = (id, name, o = {}) => Object.assign({ id, name, phone: '0990000000', address: '', surfData: {}, wholeData: {}, treatments: [], payments: [], appointments: [], diary: [], images: [], consents: [], recetas: [], presupuestos: [], odoHistory: [] }, o);
  const seed = (w, list) => { w.__seed = JSON.parse(JSON.stringify(list)); ev(w, 'patients.length=0; __seed.forEach(p=>patients.push(p)); saveNow();'); };
  const P = (w, id) => ev(w, `patients.find(p=>p.id===${id})`);
  const ids = arr => arr.map(x => x.id).sort().join(',');

  console.log('\nOdontoApp — sincronización por registros (PostgreSQL + PostgREST reales)');
  const U1 = mkUser('ana@clinica.test');
  const A = await boot(U1, 'A');
  seed(A, [
    pt(1001, 'Paciente Uno', { payments: [{ id: 11, amount: 30, date: '2026-09-01' }, { id: 12, amount: 20, date: '2026-09-02' }], appointments: [{ id: 21, date: '2026-10-20', time: '09:00', status: 'pendiente', reason: 'Control' }], diary: [{ id: 31, date: '2026-09-01', title: 'Nota', body: 'x' }], recetas: [{ id: 1, fecha: '2026-09-01' }, { id: 2, fecha: '2026-09-05' }] }),
    pt(1002, 'Paciente Dos', { treatments: [{ id: 41, name: 'Resina', cost: 40, status: 'realizado' }] }),
    pt(1003, 'Paciente Tres', { images: [{ id: 51, name: 'Rx', data: 'data:image/jpeg;base64,AAAA' }] })]);

  // ── 0. contraseña incorrecta ──
  const clinicsAntes = +sql('select count(*) from clinics;');
  await connect(A, U1, 'mala');
  check('contraseña incorrecta: mensaje claro y no se crea nada', /Correo o contraseña incorrectos/.test(A.document.getElementById('sb-status').textContent) && +sql('select count(*) from clinics;') === clinicsAntes, JSON.stringify([A.document.getElementById('sb-status').textContent, sql('select count(*) from clinics;')]));

  // ── 1. A se conecta y sube ──
  await connect(A, U1);
  const cid = JSON.parse(A.localStorage.getItem('oa3_sb')).clinicUuid;
  check('A: se crea la clínica y queda conectado (estado ✓)', /^[0-9a-f-]{36}$/.test(cid) && A.SyncEngine.info().state === 'ok', A.SyncEngine.info().lastError);
  const rows = rowsOf(cid), kinds = k => rows.filter(r => r.kind === k).length;
  check('A: sube 1 registro por paciente (3), pago (2), cita, nota, receta (2), tratamiento, imagen y configuración', kinds('patient') === 3 && kinds('pay') === 2 && kinds('appt') === 1 && kinds('diary') === 1 && kinds('receta') === 2 && kinds('tx') === 1 && kinds('img') === 1 && kinds('config') === 1, JSON.stringify(rows.map(r => r.kind)));
  check('el registro del paciente NO lleva dentro sus pagos/citas (van aparte)', !('payments' in alive(cid, 'patient')[0].data) && !('appointments' in alive(cid, 'patient')[0].data));
  check('recetas antiguas reciben clave propia = su N° (receta 1 → sid "1")', alive(cid, 'receta').map(r => r.id).sort().join() === '1001/1,1001/2');
  ev(A, "patients[0].recetas.push({id:3,fecha:'2026-10-01'})"); await sync(A);
  check('una receta NUEVA recibe clave aleatoria (no su N°)', alive(cid, 'receta').length === 3 && !alive(cid, 'receta').map(r => r.id).includes('1001/3'));
  const rev0 = totalRev(cid); await sync(A);
  check('sin cambios no se escribe nada en el servidor', totalRev(cid) === rev0);

  // ── 2. B (vacío) descarga todo ──
  const B = await boot(U1, 'B'); await connect(B, U1);
  check('B (dispositivo vacío) recibe 3 pacientes con todos sus datos', ev(B, 'patients.length') === 3 && P(B, 1001).payments.length === 2 && P(B, 1001).recetas.length === 3 && P(B, 1003).images.length === 1 && P(B, 1002).treatments[0].name === 'Resina', ev(B, 'patients.length'));
  check('B: datos idénticos a los de A (comparación completa)', ['1001', '1002', '1003'].every(id => A.SyncEngine.stable(P(A, +id)) === B.SyncEngine.stable(P(B, +id))));

  // ── 3. ediciones distintas sobre el mismo paciente ──
  ev(A, "P=patients.find(p=>p.id===1001);P.payments.push({id:13,amount:25,date:'2026-10-01'});P.address='Calle A'"); ev(A, 'saveNow()');
  ev(B, "P=patients.find(p=>p.id===1001);P.appointments.push({id:22,date:'2026-10-05',time:'10:00',status:'pendiente',reason:'Nueva'});P.phone='0999999999'"); ev(B, 'saveNow()');
  await sync(A); await sync(B); await sync(A);
  const a1 = P(A, 1001), b1 = P(B, 1001);
  check('el pago de A y la cita de B se conservan en AMBOS dispositivos', ids(a1.payments) === '11,12,13' && ids(b1.payments) === '11,12,13' && ids(a1.appointments) === '21,22' && ids(b1.appointments) === '21,22', JSON.stringify([ids(a1.payments), ids(a1.appointments), ids(b1.appointments)]));
  check('campos distintos del paciente se combinan (dirección de A + teléfono de B)', a1.address === 'Calle A' && b1.address === 'Calle A' && a1.phone === '0999999999' && b1.phone === '0999999999');

  // ── 4. mismo campo en conflicto ──
  ev(A, "patients.find(p=>p.id===1002).name='Nombre A'"); ev(A, 'saveNow()'); ev(B, "patients.find(p=>p.id===1002).name='Nombre B'"); ev(B, 'saveNow()');
  await sync(A); await sync(B); await sync(A);
  const lg = B.SyncEngine.info().meta.log;
  check('mismo campo editado en los dos: gana el dispositivo que sincroniza después (B) y converge', P(A, 1002).name === 'Nombre B' && P(B, 1002).name === 'Nombre B', P(A, 1002).name);
  check('lo descartado queda anotado para poder recuperarlo ("Nombre A")', lg.some(x => x.path === '.name' && /Nombre A/.test(x.lost)), JSON.stringify(lg));

  // ── 5. borrados ──
  ev(A, "P=patients.find(p=>p.id===1001);P.payments=P.payments.filter(x=>x.id!==11);patients.splice(patients.findIndex(p=>p.id===1003),1)"); ev(A, 'saveNow()');
  await sync(A); await sync(B);
  check('borrar un pago y un paciente en A los elimina también en B (con sus hijos)', ids(P(B, 1001).payments) === '12,13' && !P(B, 1003) && alive(cid, 'img').length === 0);
  check('el servidor conserva "lápidas" (no borra filas)', rowsOf(cid).some(r => r.kind === 'patient' && r.id === '1003' && r.deleted));

  // ── 6. borrado vs edición ──
  ev(A, "P=patients.find(p=>p.id===1001);P.appointments=P.appointments.filter(x=>x.id!==21)"); ev(A, 'saveNow()');
  ev(B, "patients.find(p=>p.id===1001).appointments.find(x=>x.id===21).reason='Editada en B'"); ev(B, 'saveNow()');
  await sync(A); await sync(B); await sync(A);
  check('A borra una cita que B editó: gana la edición y vuelve a A', P(B, 1001).appointments.some(x => x.id === 21 && x.reason === 'Editada en B') && P(A, 1001).appointments.some(x => x.id === 21 && x.reason === 'Editada en B'));

  // ── 7. carrera: alguien escribe entre mi descarga y mi subida ──
  ev(B, "patients.find(p=>p.id===1002).phone='0911111111'"); ev(B, 'saveNow()');
  B.__hooks.beforePatch = () => sql(`update sync_records set rev=rev+1, data=jsonb_set(data,'{address}','"Dir remota"') where clinic_id='${cid}' and kind='patient' and id='1002';`);
  const p0 = B.__hooks.patches; await sync(B);
  const srv = alive(cid, 'patient').find(r => r.id === '1002').data;
  check('escritura sobre versión vieja: el servidor la rechaza, B descarga, fusiona y reintenta', B.__hooks.patches - p0 >= 2 && srv.phone === '0911111111' && srv.address === 'Dir remota', JSON.stringify([B.__hooks.patches - p0, srv]));
  check('B terminó con ambos cambios y A los recibe', P(B, 1002).address === 'Dir remota' && (await sync(A), P(A, 1002).phone === '0911111111' && P(A, 1002).address === 'Dir remota'));

  // ── 8. recetas con el mismo N° en dos dispositivos ──
  ev(A, "patients.find(p=>p.id===1001).recetas.push({id:50,fecha:'2026-10-10',medico:'A'})"); ev(A, 'saveNow()');
  ev(B, "patients.find(p=>p.id===1001).recetas.push({id:50,fecha:'2026-10-10',medico:'B'})"); ev(B, 'saveNow()');
  await sync(A); await sync(B); await sync(A);
  check('dos recetas con el mismo N° no se fusionan: se conservan las dos', P(A, 1001).recetas.filter(r => r.id === 50).length === 2 && P(B, 1001).recetas.filter(r => r.id === 50).length === 2);

  // ── 9. contadores ──
  ev(A, 'nextRecetaId=100;saveNow()'); await sync(A); await sync(B);
  check('el contador de recetas nunca retrocede (queda en el mayor)', ev(B, 'nextRecetaId') >= 100);

  // ── 10. objeto abierto en pantalla no se pierde ──
  ev(B, "curPt=patients.find(p=>p.id===1001)"); ev(A, "patients.find(p=>p.id===1001).phone='0988888888';saveNow()"); await sync(A); await sync(B);
  check('al recibir cambios, la ficha abierta (curPt) sigue siendo el mismo objeto y se actualiza', ev(B, "curPt===patients.find(p=>p.id===1001)") && ev(B, 'curPt.phone') === '0988888888');

  // ── 11. sin internet ──
  B.__hooks.offline = true; ev(B, "patients.find(p=>p.id===1001).name='Editado sin internet';saveNow()"); await sync(B);
  const i1 = B.SyncEngine.info();
  check('sin internet: estado de error, mensaje claro, cambio local intacto y contado como pendiente', i1.state === 'error' && /Sin conexión/.test(i1.lastError) && P(B, 1001).name === 'Editado sin internet' && i1.pendingCount >= 1, JSON.stringify([i1.state, i1.lastError, i1.pendingCount]));
  B.__hooks.offline = false; await sync(B); await sync(A);
  check('al volver internet se sube lo pendiente y A lo recibe', alive(cid, 'patient').find(r => r.id === '1001').data.name === 'Editado sin internet' && P(A, 1001).name === 'Editado sin internet' && B.SyncEngine.info().pendingCount === 0);

  // ── 12. dispositivo con copia vieja que se conecta ──
  const C = await boot(U1, 'C');
  seed(C, [pt(1001, 'Nombre VIEJO', { phone: '0900000001' }), pt(7777777777, 'Solo en C')]);
  await connect(C, U1);
  check('copia vieja al conectar: para lo que ya existe gana la nube, y lo viejo queda anotado', P(C, 1001).name === 'Editado sin internet' && C.SyncEngine.info().meta.log.some(x => /Nombre VIEJO/.test(x.lost)));
  check('lo que solo existía en C (paciente nuevo) se sube sin perderse', alive(cid, 'patient').some(r => r.id === '7777777777'));
  await sync(A); check('y llega a los demás dispositivos', !!P(A, 7777777777));

  // ── 13. borrado masivo bloqueado ──
  const U2 = mkUser('beto@clinica.test'), D = await boot(U2, 'D');
  seed(D, [1, 2, 3, 4, 5, 6].map(i => pt(2000 + i, 'Paciente ' + i, { payments: [{ id: 900 + i, amount: i, date: '2026-10-01' }] })));
  await connect(D, U2); const cidD = JSON.parse(D.localStorage.getItem('oa3_sb')).clinicUuid;
  check('D: 6 pacientes subidos', alive(cidD, 'patient').length === 6);
  ev(D, 'patients.length=0;saveNow()'); await sync(D);   // simula "los datos no cargaron"
  check('datos locales vacíos NO borran la nube: se bloquea y se avisa', alive(cidD, 'patient').length === 6 && D.SyncEngine.info().guardInfo && D.SyncEngine.info().state === 'guard', JSON.stringify(D.SyncEngine.info().guardInfo));
  await D.syncRecuperarDeNube();
  check('"Recuperar desde la nube" restaura los 6 pacientes con sus pagos', ev(D, 'patients.length') === 6 && ev(D, 'patients.reduce((s,p)=>s+p.payments.length,0)') === 6 && !D.SyncEngine.info().guardInfo);
  ev(D, 'patients.length=0;saveNow()'); await sync(D); await D.syncConfirmarBorrado();
  check('si el usuario confirma el borrado, SÍ se propaga (lápidas) y el permiso no queda abierto', alive(cidD, 'patient').length === 0 && D.SyncEngine.info().meta.allowDeletes === false);

  // ── 14. seguridad real (RLS) vía PostgREST ──
  const U3 = mkUser('intruso@otro.test');
  const cl = (token) => createClient(proxyUrl, 'anon', { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + token } } });
  const intruso = cl(U3.jwt);
  const r1 = await intruso.from('sync_records').select('id').eq('clinic_id', cid);
  check('otra cuenta: no ve ningún registro de tu clínica', !r1.error && r1.data.length === 0);
  const r2 = await intruso.from('sync_records').insert({ clinic_id: cid, kind: 'patient', id: 'HACK', data: { name: 'x' } });
  check('otra cuenta: no puede escribir en tu clínica (RLS)', !!r2.error && /row-level security/i.test(r2.error.message), JSON.stringify(r2.error));
  const r3 = await intruso.from('clinics').select('id'); check('otra cuenta: no ve tu clínica', !r3.error && r3.data.length === 0);
  const anon = cl(process.env.ANON_TEST_KEY || 'anon-sin-sesion');
  const r4 = await createClient(proxyUrl, 'x', { auth: { persistSession: false } }).from('sync_records').select('id').limit(1);
  check('sin sesión (solo la clave pública): acceso denegado', !!r4.error, JSON.stringify(r4));
  const r5 = await cl(U1.jwt).from('sync_records').delete().eq('clinic_id', cid);
  check('ni siquiera el dueño puede borrar filas en masa (solo lápidas)', !!r5.error || (r5.data || []).length === 0);
  const r6 = await cl(U1.jwt).from('sync_records').update({ rev: 999 }).eq('clinic_id', cid).eq('kind', 'patient').eq('id', '1001');
  check('el servidor rechaza saltos de versión aunque el cliente lo intente', !!r6.error && /Conflicto de versión/.test(r6.error.message), JSON.stringify(r6.error));

  // ── 15. volumen y paginación ──
  const U4 = mkUser('grande@clinica.test'), E = await boot(U4, 'E');
  seed(E, Array.from({ length: 300 }, (_, i) => pt(5000 + i, 'Paciente grande ' + i, { payments: [{ id: 100000 + i, amount: 10, date: '2026-10-01' }], appointments: [{ id: 200000 + i, date: '2026-11-01', time: '09:00', status: 'pendiente' }] })));
  const t0 = Date.now(); await connect(E, U4); const cidE = JSON.parse(E.localStorage.getItem('oa3_sb')).clinicUuid;
  check('300 pacientes + 600 registros hijos se suben en lotes (' + (Date.now() - t0) + ' ms)', alive(cidE, 'patient').length === 300 && rowsOf(cidE).length === 901, rowsOf(cidE).length);
  const rv = totalRev(cidE); await sync(E); check('segunda sincronización sin cambios: cero escrituras', totalRev(cidE) === rv);
  const F = await boot(U4, 'F'); F.SyncEngine.setPage(100); await connect(F, U4);
  check('descarga paginada (páginas de 100) trae los 901 registros sin perder ni duplicar', ev(F, 'patients.length') === 300 && ev(F, 'patients.reduce((s,p)=>s+p.payments.length+p.appointments.length,0)') === 600, ev(F, 'patients.length'));
  ev(E, "patients[5].payments.push({id:777777,amount:5,date:'2026-10-02'});saveNow()"); const rv2 = totalRev(cidE); await sync(E);
  check('un pago nuevo entre 300 pacientes sube SOLO 1 registro (no toda la clínica)', totalRev(cidE) - rv2 === 1 + 0 && alive(cidE, 'pay').length === 301, totalRev(cidE) - rv2);

  // ── 15b. lotes limitados por tamaño (miniaturas pesadas) ──
  const U5 = mkUser('imagenes@clinica.test'), G = await boot(U5, 'G'); G.SyncEngine.setBatchBytes(300000);
  seed(G, Array.from({ length: 10 }, (_, i) => pt(8000 + i, 'Con imagen ' + i, { images: [{ id: 9000 + i, name: 'Rx' + i, data: 'data:image/jpeg;base64,' + 'A'.repeat(100000) }] })));
  await connect(G, U5); const cidG = JSON.parse(G.localStorage.getItem('oa3_sb')).clinicUuid;
  check('10 imágenes de 100 KB se suben en varios lotes pequeños sin perder ninguna', alive(cidG, 'patient').length === 10 && alive(cidG, 'img').length === 10 && alive(cidG, 'img').every(r => r.data.data.length > 100000));

  // ── 16. sesión vencida ──
  A.__hooks.noSession = true; ev(A, "patients.find(p=>p.id===1001).name='Con sesión vencida';saveNow()"); await sync(A);
  check('sesión vencida: pide iniciar sesión y NO pierde ni sube nada', A.SyncEngine.info().state === 'login' && P(A, 1001).name === 'Con sesión vencida' && alive(cid, 'patient').find(r => r.id === '1001').data.name !== 'Con sesión vencida');

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.join(' | '));
  [A, B, C, D, E, F, G].forEach(w => { try { w.close(); } catch (e) {} }); proxy.close(); app.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : '\n✔ Todas las pruebas de sincronización pasaron'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR en la prueba:', e); process.exit(2); });
