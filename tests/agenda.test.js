// Módulo Agenda (Appts = datos y reglas · Agenda = pantalla): todo se hace por CLIC, como lo haría una persona.
require('fake-indexeddb/auto');
const { IDBFactory } = require('fake-indexeddb');
const http = require('http'), fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '..');
const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(f)] || 'text/plain' }); r.end(d); }); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const check = (n, ok, extra = '') => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (ok ? '' : '  ' + String(extra).slice(0, 300))); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

srv.listen(0, async () => {
  console.log('\nOdontoApp — Agenda (citas, calendario, citas rápidas, WhatsApp)');
  const errs = [], alerts = [], asked = [], opened = []; let confirmAnswer = true, popupBlocked = false;
  const vc = new VirtualConsole(); vc.on('jsdomError', e => { if (!/supabase|jsdelivr|googleapis|gstatic|Not implemented|serviceWorker/i.test(e.message)) errs.push(e.message.slice(0, 200)); });
  // abre una "ventana del navegador": idb = base propia (null = la compartida) · ls = datos previos de localStorage
  const openApp = async (idb, ls) => {
    const dom = await JSDOM.fromURL('http://localhost:' + srv.address().port + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) {
        w.indexedDB = idb || indexedDB; w.IDBKeyRange = IDBKeyRange; w.scrollTo = () => {}; w.alert = m => alerts.push(String(m)); w.confirm = m => { asked.push(String(m)); return confirmAnswer; };
        w.open = u => { opened.push(String(u)); return popupBlocked ? null : { document: { write() {}, close() {} }, print() {} }; };
        if (ls) Object.entries(ls).forEach(([k, v]) => w.localStorage.setItem(k, v));
      } });
    await wait(1800); return dom.window;
  };
  const w = await openApp(); const D = w.document, E = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const $ = s => D.querySelector(s), $$ = s => [...D.querySelectorAll(s)];
  const setv = (id, val) => { D.getElementById(id).value = val; };
  const type = (id, val) => { const el = D.getElementById(id); el.value = val; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const main = () => D.getElementById('mainContent').textContent;
  const act = (name, sel = '') => $(`[data-action="${name}"]${sel}`);
  const reset = () => { alerts.length = 0; asked.length = 0; opened.length = 0; confirmAnswer = true; popupBlocked = false; };
  const TD = E('today()'), PAST = '2024-03-10', FUT = E('daysFromNow(10)'), FUT2 = E('daysFromNow(11)');
  const hostile = '<img src=x onerror=1 id=PWN>';
  const fillQuick = (f) => { Object.entries({ f_qa_name: f.name, f_qa_phone: f.phone, f_qa_reason: f.reason, f_qa_date: f.date, f_qa_time: f.time, f_qa_notes: f.notes }).forEach(([k, val]) => { if (val !== undefined) setv(k, val); }); };

  E(`Patients.all().length=0;Appts.quick().length=0;Services.list().length=0;
     Patients.all().push(Patients.blank({id:1,name:'María Pérez',cedula:'1712345678',phone:'0991234567'}),Patients.blank({id:2,name:'Beto Sin Teléfono',cedula:'0912345678',phone:''}));saveNow();Patients.renderList();Agenda.goToday();`);

  // ───────── 1. estructura ─────────
  check('agenda.js ya no contiene ningún handler inline', !/\son(click|input|change|keydown|mouseover|mouseout|mouseenter|mouseleave)\s*=/i.test(read('js/agenda.js').replace(/\/\*[\s\S]*?\*\//g, '')));
  const pages = ['month', 'week', 'list'].map(v => { E(`Agenda.setView('${v}')`); return D.getElementById('mainContent').innerHTML; }); E("Agenda.setView('month')");
  check('ninguna de las 3 vistas del calendario genera onclick/onmouseover', pages.every(h => !/\son(click|mouseover|mouseout|input)=/i.test(h)));
  check('Appts y Agenda existen; ya no quedan nombres antiguos globales; el almacén viejo desapareció',
    E('typeof Appts') === 'object' && E('typeof Agenda') === 'object' && ['renderAgendaPage', 'renderCitas', 'openAddAppt', 'getDefaultWAMsg'].every(n => E(`typeof ${n}`) === 'undefined') && ['saveQuickAppts', 'loadQuickAppts', 'enviarWA', 'buildWAMsg'].every(n => E(`typeof ${n}`) === 'undefined'));

  // ───────── 2. navegación del calendario ─────────
  const label = () => $$('div').find(d => /^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre) \d{4}$/.test(d.textContent.trim()) || /^\d+ \w+ — \d+ \w+ \d{4}$/.test(d.textContent.trim()) || d.textContent.trim() === 'Próximas citas');
  const t0 = main(); const m0 = E('Agenda.state.month'), y0 = E('Agenda.state.year');
  click(act('agenda.next')); check('«›» avanza un mes', E('Agenda.state.month') === (m0 + 1) % 12 && E('Agenda.state.year') === (m0 === 11 ? y0 + 1 : y0));
  click(act('agenda.prev')); click(act('agenda.prev')); check('«‹» retrocede (cruza el año si hace falta)', E('Agenda.state.month') === (m0 + 11) % 12);
  click(act('agenda.today')); check('«Hoy» vuelve al mes actual', E('Agenda.state.month') === m0 && E('Agenda.state.year') === y0);
  click(act('agenda.view', '[data-view="week"]'));
  const mon = E('ymd=d=>d'); // (no-op) la semana debe contener hoy
  const weekHasToday = $$('.cal-cell.is-today').length > 0; check('Semana (desde el mes actual) muestra la semana de HOY, no la primera del mes', weekHasToday);
  click(act('agenda.next')); check('en Semana, «›» avanza 7 días', E("Agenda.state.weekStart.getTime()-0") > 0 && !$$('.cal-cell.is-today').length);
  click(act('agenda.today')); click(act('agenda.view', '[data-view="list"]')); check('Lista: sin flechas de mes (no hacían nada) y con título «Próximas citas»', !act('agenda.prev') && !act('agenda.next') && /Próximas citas/.test(main()));
  click(act('agenda.view', '[data-view="month"]')); check('Mes: vuelven las flechas', !!act('agenda.prev') && !!act('agenda.next'));

  // ───────── 3. nueva cita rápida ─────────
  click(act('agenda.openQuick')); check('«+ Nueva cita» abre el formulario con la fecha de hoy', modalOpen() && D.getElementById('f_qa_date').value === TD);
  reset(); fillQuick({ name: '', reason: 'Dolor', date: FUT, time: '09:00' }); click(act('agenda.saveQuick')); check('sin nombre: avisa y no guarda', alerts.length === 1 && /nombre/i.test(alerts[0]) && E('Appts.quick().length') === 0 && modalOpen());
  reset(); fillQuick({ name: 'Zoe', reason: '', date: FUT, time: '09:00' }); click(act('agenda.saveQuick')); check('sin motivo: avisa', /motivo/i.test(alerts[0] || '') && E('Appts.quick().length') === 0);
  reset(); fillQuick({ name: 'Zoe', reason: 'Dolor', date: '', time: '09:00' }); click(act('agenda.saveQuick')); check('ANTES se guardaba sin fecha; ahora la fecha vacía se rechaza', /fecha/i.test(alerts[0] || '') && E('Appts.quick().length') === 0, alerts[0]);
  reset(); fillQuick({ name: 'Zoe', reason: 'Dolor', date: FUT, time: '' }); click(act('agenda.saveQuick')); check('ANTES se guardaba sin hora; ahora la hora vacía se rechaza', /hora/i.test(alerts[0] || '') && E('Appts.quick().length') === 0, alerts[0]);
  reset(); fillQuick({ name: 'Zoe', phone: '0987654321', reason: 'Dolor', date: FUT, time: '09:00', notes: 'por WhatsApp' }); click(act('agenda.saveQuick'));
  check('cita rápida válida: se guarda con id «q…», el formulario se cierra y el calendario sigue en pantalla', !modalOpen() && E('Appts.quick().length') === 1 && /^q\d+$/.test(E('Appts.quick()[0].id')) && E('Appts.quick()[0].status') === 'pendiente' && E('Appts.quick()[0].type') === 'quick' && /Agenda de Citas|Hoy —/.test(main()));
  // aparece en el calendario (mes de FUT)
  const showMonthOf = d => { const [y, m] = d.split('-').map(Number); E(`Agenda.state.year=${y};Agenda.state.month=${m - 1};Agenda.show()`); };
  showMonthOf(FUT); check('la cita aparece en el día correcto del mes', $$('.cal-day').some(c => c.getAttribute('data-date') === FUT && /09:00 Zoe/.test(c.textContent)));
  // ───────── 4. persistencia ─────────
  await wait(500);
  const w2 = await openApp();
  check('ANTES la cita rápida solo vivía en localStorage; ahora sobrevive en otro equipo/navegador (solo base IndexedDB)', w2.eval('Appts.quick().length') === 1 && w2.eval('Appts.quick()[0].ptName') === 'Zoe', w2.eval('Appts.quick().length')); w2.close();
  reset(); showMonthOf(FUT); click($$('.cal-day').find(c => c.getAttribute('data-date') === FUT)); fillQuick({ name: 'Yago', reason: 'Control', time: '10:00' }); click(act('agenda.saveQuick'));
  await wait(900); const w3 = await openApp(); const cnt = await w3.eval("idbGet('state').then(b=>(b.quickAppts||[]).length)");
  check('ANTES una cita rápida nueva no llegaba a la base (ni a la nube) hasta el siguiente guardado; ahora se guarda al instante', cnt === 2, cnt); w3.close();
  // migración desde la clave antigua de localStorage
  const wl = await openApp(new IDBFactory(), { oa3_qa: JSON.stringify([{ id: 'q55', ptName: 'Antigua', phone: '', reason: 'Control', date: FUT, time: '08:00', status: 'pendiente', type: 'quick' }]) });
  await wait(500); check('citas rápidas guardadas por la versión anterior (localStorage) se adoptan una sola vez', wl.eval('Appts.quick().length') === 1 && wl.eval('Appts.quick()[0].ptName') === 'Antigua' && wl.localStorage.getItem('oa3_qa_ok') === '1');
  wl.eval("Appts.setQuick([]);save()"); await wait(500); wl.close();
  // ───────── 5. avisos: pasada y doble reserva ─────────
  reset(); E(`Agenda.openQuick()`); fillQuick({ name: 'Nico', reason: 'Limpieza', date: PAST, time: '09:00' }); confirmAnswer = false; click(act('agenda.saveQuick'));
  check('fecha pasada: avisa y, si dices no, no guarda', /ya pasó/.test(asked[0] || '') && E('Appts.quick().length') === 2 && modalOpen(), asked[0]);
  reset(); fillQuick({ name: 'Nico', reason: 'Limpieza', date: FUT, time: '09:00' }); confirmAnswer = false; click(act('agenda.saveQuick'));
  check('doble reserva (misma fecha y hora): avisa quién ya está a esa hora; «no» no guarda', /ya hay una cita/.test(asked[0] || '') && /Zoe/.test(asked[0] || '') && E('Appts.quick().length') === 2, asked[0]);
  confirmAnswer = true; click(act('agenda.saveQuick')); check('«sí» la guarda igual (a veces se atienden dos a la vez)', E('Appts.quick().length') === 3 && !modalOpen());
  // ───────── 6. paciente registrado ─────────
  reset(); E('Agenda.openQuick()'); type('f_qa_search', 'maria');
  check('buscar «maria» encuentra a «María Pérez» (sin importar tildes)', !!act('agenda.pickPatient') && /María Pérez/.test(D.getElementById('f_qa_dropdown').textContent));
  click(act('agenda.pickPatient')); check('elegirla rellena nombre y teléfono y muestra «Paciente registrado»', D.getElementById('f_qa_name').value === 'María Pérez' && D.getElementById('f_qa_phone').value === '0991234567' && D.getElementById('f_qa_selected').style.display === 'flex' && D.getElementById('f_qa_pt').value === '1');
  click(act('agenda.clearPatient')); check('«✕» limpia la selección', D.getElementById('f_qa_pt').value === '' && D.getElementById('f_qa_name').value === '');
  click(act('agenda.openQuick') || D.body); type('f_qa_search', '0991'); check('también se busca por teléfono', !!act('agenda.pickPatient'));
  click(act('agenda.pickPatient')); fillQuick({ reason: 'Revisión', date: FUT2, time: '11:00' }); click(act('agenda.saveQuick'));
  check('cita de un paciente registrado: queda en SU ficha (no como cita rápida)', E('Patients.get(1).appointments.length') === 1 && E('Patients.get(1).appointments[0].reason') === 'Revisión' && E('Appts.quick().length') === 3);
  reset(); E('Agenda.openQuick()'); fillQuick({ name: 'maría perez', reason: 'Control', date: FUT2, time: '12:00' }); confirmAnswer = true; click(act('agenda.saveQuick'));
  check('escribir el nombre de un paciente que ya tiene ficha ofrece agendar en su ficha (evita citas «sueltas»)', /Ya existe un paciente llamado «María Pérez»/.test(asked[0] || '') && E('Patients.get(1).appointments.length') === 2 && E('Appts.quick().length') === 3, asked[0]);
  reset(); E('Agenda.openQuick()'); fillQuick({ name: 'María Pérez', reason: 'Otra', date: FUT2, time: '13:00' }); confirmAnswer = false; click(act('agenda.saveQuick'));
  check('…y si prefieres «cita rápida sin ficha», se crea como rápida', E('Appts.quick().length') === 4 && E('Patients.get(1).appointments.length') === 2);
  E('Appts.quick().pop()');

  // ───────── 7. detalle de una cita ─────────
  reset(); showMonthOf(FUT); click($$('.cal-day [data-action="agenda.openDetail"]').find(c => /Zoe/.test(c.textContent)));
  check('clic en una cita del calendario abre su detalle (y no la «nueva cita» del día)', modalOpen() && /Detalle de cita/.test(modal()) && /Zoe/.test(modal()) && /por WhatsApp/.test(modal()) && /Cita rápida — sin ficha/.test(modal()));
  setv('f_ad_reason', ''); click(act('agenda.saveDetail')); check('guardar sin motivo: avisa', /motivo/i.test(alerts[0] || '') && E('Appts.quick()[0].reason') === 'Dolor');
  setv('f_ad_reason', 'Dolor fuerte'); setv('f_ad_time', '15:30'); setv('f_ad_status', 'completada'); click(act('agenda.saveDetail'));
  check('editar: cambia motivo, hora y estado; el calendario lo pinta como completada', !modalOpen() && E('Appts.quick()[0].reason') === 'Dolor fuerte' && E('Appts.quick()[0].time') === '15:30' && E('Appts.quick()[0].status') === 'completada');
  reset(); click($$('.cal-day [data-action="agenda.openDetail"]').find(c => /Zoe/.test(c.textContent))); setv('f_ad_date', PAST); setv('f_ad_status', 'pendiente'); confirmAnswer = false; click(act('agenda.saveDetail'));
  check('reprogramar una cita pendiente al pasado pregunta; «no» deja la cita como estaba', /ya pasó/.test(asked[0] || '') && E('Appts.quick()[0].date') === FUT);
  click(act('app.closeModal', '.btn-sec')); reset();
  // eliminar
  click($$('.cal-day [data-action="agenda.openDetail"]').find(c => /Zoe/.test(c.textContent))); confirmAnswer = false; click(act('agenda.deleteDetail'));
  check('eliminar: el confirm nombra la cita; «no» la conserva', E('Appts.quick().length') === 3 && /Zoe/.test(asked[0] || '') && /15:30/.test(asked[0] || ''), asked[0]);
  confirmAnswer = true; click(act('agenda.deleteDetail')); check('al confirmar se elimina y el calendario se actualiza', E('Appts.quick().length') === 2 && !modalOpen() && !/Zoe/.test(main()));
  // convertir en ficha
  showMonthOf(FUT); click($$('.cal-day [data-action="agenda.openDetail"]').find(c => /Nico/.test(c.textContent) || /Yago/.test(c.textContent))); click(act('agenda.openConvert'));
  check('«Crear ficha» abre el formulario de paciente con nombre y teléfono precargados', /Crear ficha de paciente/.test(modal()) && D.getElementById('f_name').value !== '');
  const qName = D.getElementById('f_name').value; setv('f_ced', '1799999999'); click(act('agenda.confirmConvert'));
  check('al crearla: la ficha queda abierta con la cita dentro y la cita rápida desaparece', E('Patients.current().name') === qName && E('Patients.current().appointments.length') === 1 && E('Appts.quick().length') === 1);
  // ver ficha desde una cita registrada
  showMonthOf(FUT2); click($$('.cal-day [data-action="agenda.openDetail"]').find(c => /María Pérez/.test(c.textContent))); click(act('agenda.openPatient'));
  check('«Ver ficha» abre al paciente dueño de la cita', E('Patients.current().id') === 1 && !modalOpen());

  // ───────── 8. pestaña «Citas» de la ficha ─────────
  E("Patients.select(1);Patients.get(1).appointments.length=0;Ficha.tab('citas')"); check('pestaña Citas vacía', /Sin citas programadas/.test(main()));
  click(act('ptw.addAppt')); check('el botón 📅 de la cabecera abre el formulario de cita del paciente', modalOpen() && !!D.getElementById('f_apr'));
  reset(); setv('f_apr', ''); click(act('agenda.saveAdd')); check('sin motivo: avisa', /motivo/i.test(alerts[0] || '') && E('Patients.get(1).appointments.length') === 0);
  setv('f_apr', 'Control'); setv('f_apd', FUT2); setv('f_apt', '16:00'); click(act('agenda.saveAdd')); check('cita válida: se guarda y la pestaña la muestra', E('Patients.get(1).appointments.length') === 1 && /Control/.test(main()) && !modalOpen());
  click(act('agenda.openAdd')); setv('f_apr', 'Antes'); setv('f_apd', FUT); setv('f_apt', '08:00'); click(act('agenda.saveAdd'));
  check('las pendientes se ordenan por fecha (la más próxima primero)', $$('.row-name').map(e => e.textContent).join(',') === 'Antes,Control', $$('.row-name').map(e => e.textContent).join(','));
  click(act('agenda.noShow')); check('«No asistió» marca la cita y la deja visible con esa etiqueta', E('Patients.get(1).appointments.find(a=>a.reason==="Antes").status') === 'no_asistio' && /No asistió/.test(main()));
  click(act('agenda.complete')); check('«Completar» la pasa a «Citas completadas»', E('Patients.get(1).appointments.filter(a=>a.status==="completada").length') === 1 && /Citas completadas/.test(main()));
  reset(); confirmAnswer = false; click(act('agenda.deleteOwn')); check('eliminar desde la ficha: confirm con motivo y fecha; «no» la conserva', E('Patients.get(1).appointments.length') === 2 && /Control|Antes/.test(asked[0] || ''), asked[0]);
  confirmAnswer = true; click(act('agenda.deleteOwn')); check('al confirmar se elimina', E('Patients.get(1).appointments.length') === 1);

  // ───────── 9. semana: horarios fuera de 07–19 h ─────────
  E(`Appts.quick().length=0;Patients.get(1).appointments.length=0;Appts.quick().push({id:'qn',ptName:'Noche',phone:'',reason:'Urgencia',date:today(),time:'21:30',status:'pendiente',type:'quick'},{id:'qm',ptName:'Madrugada',phone:'',reason:'Urgencia',date:today(),time:'06:15',status:'no_asistio',type:'quick'});Agenda.goToday();Agenda.setView('week')`);
  const grid = () => $$('.cal-cell').map(c => c.textContent).join(' | ');
  check('ANTES las citas a las 21:30 y 06:15 no se veían en Semana; ahora aparecen (la rejilla se amplía)', /21:30 Noche/.test(grid()) && /06:15 Madrugada/.test(grid()), grid().slice(0, 100));
  check('la cita «no asistió» se pinta en rojo también en Semana', $$('.cal-cell [data-action="agenda.openDetail"]').some(c => /Madrugada/.test(c.textContent) && /rgb\(254, 226, 226\)|#fee2e2/i.test(c.style.background || c.getAttribute('style'))));
  click($$('.cal-cell').find(c => c.getAttribute('data-time') === '09:00' && c.classList.contains('is-today'))); check('clic en una hora vacía abre «Nueva cita» con esa fecha y hora', modalOpen() && D.getElementById('f_qa_date').value === TD && D.getElementById('f_qa_time').value === '09:00'); click(act('app.closeModal', '.btn-sec'));

  // ───────── 10. robustez ─────────
  E(`Appts.quick().push({id:'qx',ptName:'Sin hora'},{id:'qy',ptName:null,reason:null,date:null,time:null});Patients.get(1).appointments.push({id:77,reason:'x'});`);
  let crash = ''; ['month', 'week', 'list'].forEach(v => { try { E(`Agenda.setView('${v}')`); } catch (e) { crash += v + ':' + e.message + ' '; } }); E("Agenda.setView('month')");
  check('citas con datos incompletos (sin hora, sin fecha, nulos) ya no tumban la pantalla de Agenda en ninguna vista', crash === '' && errs.length === 0, crash + errs.join('|'));
  E("Appts.setQuick(Appts.quick().filter(a=>a.id==='qn'||a.id==='qm'));Patients.get(1).appointments.length=0");

  // ───────── 11. seguridad ─────────
  E(`Appts.quick().length=0;Appts.quick().push({id:'q1"><i id=PWN1>',ptName:${JSON.stringify(hostile)},phone:${JSON.stringify(hostile)},reason:${JSON.stringify(hostile)},notes:${JSON.stringify(hostile)},date:today(),time:'10:00',status:'pendiente',type:'quick'});Patients.get(1).appointments.push({id:5,reason:${JSON.stringify(hostile)},date:today(),time:'11:00',status:'pendiente',notes:${JSON.stringify(hostile)}});`);
  ['month', 'week', 'list'].forEach(v => E(`Agenda.setView('${v}')`)); E("Agenda.setView('month')");
  check('SEGURIDAD: nombre, teléfono, motivo y notas con HTML se ven como texto en las 3 vistas y el panel (y el id hostil no rompe los atributos)', !D.getElementById('PWN') && !D.getElementById('PWN1') && main().includes(hostile));
  click($$('[data-action="agenda.openDetail"]').find(c => c.getAttribute('data-type') === 'quick')); check('SEGURIDAD: el detalle también', !D.getElementById('PWN') && !D.getElementById('PWN1') && modal().includes(hostile));
  click(act('app.closeModal', '.btn-sec')); E("Patients.select(1);Ficha.tab('citas')"); check('SEGURIDAD: la pestaña Citas de la ficha también', !D.getElementById('PWN') && main().includes(hostile));
  E("Appts.quick().length=0;Patients.get(1).appointments.length=0");

  // ───────── 12. WhatsApp ─────────
  E(`Patients.get(1).phone='0991234567';Patients.get(1).appointments.push({id:9,reason:'Control',date:today(),time:'10:00',status:'pendiente'});Appts.quick().push({id:'qw',ptName:'Sin Cel',phone:'',reason:'x',date:today(),time:'11:00',status:'pendiente',type:'quick'});Agenda.goToday()`);
  reset(); click($$('[data-action="agenda.sendWA"]')[0]);
  const u = opened[0] || ''; const msg = decodeURIComponent(u.split('text=')[1] || '');
  check('«Enviar recordatorio» abre wa.me con el 09… convertido a 593… y el mensaje con nombre, hora y motivo', u.indexOf('https://wa.me/593991234567?text=') === 0 && /María Pérez/.test(msg) && /10:00/.test(msg) && /Control/.test(msg) && !/{nombre}|{hora}/.test(msg), u.slice(0, 80));
  check('queda marcado como «recordado», el botón cambia y el recordatorio sale de «pendientes»', E('Patients.get(1).appointments[0].recordado') === TD && /reenviar/.test(main()) && !/Recordatorios pendientes/.test(main()));
  const num = p => E(`JSON.stringify(Appts.waNumber(${JSON.stringify(p)}))`);
  check('números: 09… y 02… → 593…; +34… y 0034… → internacional; letras y puntos se quitan; muy corto, vacío o sin números → error',
    JSON.parse(num('0991234567')).number === '593991234567' && JSON.parse(num('02 234-5678')).number === '59322345678' && JSON.parse(num('+34 612 345 678')).number === '34612345678' && JSON.parse(num('0034612345678')).number === '34612345678' &&
    JSON.parse(num('09 91-23.4567x')).number === '593991234567' && JSON.parse(num('593991234567')).number === '593991234567' && !JSON.parse(num('12')).ok && !JSON.parse(num('')).ok && !JSON.parse(num('abc')).ok, [num('09 91-23.4567x'), num('12')].join(' '));
  check('ANTES un nombre con «$&» rompía el mensaje; ahora sale tal cual', E(`Appts.waMessage({date:today(),time:'10:00',reason:'r'},'Ana $& Pérez')`).indexOf('Hola Ana $& Pérez') === 0);
  reset(); E("Agenda.goToday()"); const noPhone = $$('[data-action="agenda.openDetail"]'); E(`Agenda.sendWAUI('qw','quick','')`); check('sin teléfono: avisa y no abre nada', /no tiene número/.test(alerts[0] || '') && opened.length === 0, alerts[0]);
  reset(); E("Patients.get(1).phone='12'"); E(`Agenda.sendWAUI(9,'registered',1)`); check('teléfono inválido: avisa y no abre nada', /no parece válido/.test(alerts[0] || '') && opened.length === 0, alerts[0]);
  reset(); E("Patients.get(1).phone='0991234567';delete Patients.get(1).appointments[0].recordado"); popupBlocked = true; E(`Agenda.sendWAUI(9,'registered',1)`);
  check('ventana bloqueada por el navegador: avisa y NO marca el recordatorio como hecho', /bloque/i.test(alerts[0] || '') && !E('Patients.get(1).appointments[0].recordado'), alerts[0]);

  // ───────── 13. auditoría ─────────
  check('las acciones de la agenda no producen errores de JavaScript (auditoría incluida)', errs.length === 0, errs.join('|'));
  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.slice(0, 3).join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : `\n✔ Todas las pruebas de la Agenda pasaron (${results.length} comprobaciones)`); process.exit(fail ? 1 : 0);
});
