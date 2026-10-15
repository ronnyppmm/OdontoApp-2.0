// Módulo UI (Nav, Dashboard, Settings, Services, Meds, Logo): todo se hace por CLIC, como lo haría una persona.
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
  console.log('\nOdontoApp — UI (navegación, dashboard, configuración, logo, Services.list(), medicamentos)');
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
  const modal = () => (D.getElementById('modalContent') || {}).textContent || '';
  const modalOpen = () => D.getElementById('modalOverlay').classList.contains('show');
  const main = () => D.getElementById('mainContent').textContent;
  const html = () => D.getElementById('mainContent').innerHTML;
  const act = (name, sel = '') => $(`[data-action="${name}"]${sel}`);
  const reset = () => { alerts.length = 0; asked.length = 0; opened.length = 0; confirmAnswer = true; };
  const key = (id, k) => D.getElementById(id).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const TD = E('today()'), FUT = E('daysFromNow(3)'), PAST = '2024-03-10', hostile = '<img src=x onerror=1 id=PWN>';
  const go = p => click($(`#nav-${p}`));
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3, 253, 227, 85, 242, 156, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  const pickFile = async (file) => { const inp = D.getElementById('logoFileInput'); Object.defineProperty(inp, 'files', { value: [file], configurable: true }); inp.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(200); };

  // ───────── 1. estructura ─────────
  const strip = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');
  check('ui.js ya no contiene ningún handler inline', !/\son(click|input|change|keydown|mouseover|mouseout)\s*=/i.test(strip('js/ui.js')));
  check('index.html: menú lateral, logo, modo oscuro y fondo del modal ya no usan onclick', !/onclick="(showPage|openLogoEdit|toggleDarkMode|if\(event)/.test(read('index.html')));
  check('los módulos existen y solo quedan los atajos del armazón (showPage, openModal, closeModal, renderConfiguracion)', ['Nav', 'Dashboard', 'Settings', 'Services', 'Meds', 'Logo'].every(n => E(`typeof ${n}`) === 'object') && ['showPage', 'openModal', 'closeModal', 'renderConfiguracion'].every(n => E(`typeof ${n}`) === 'function') && ['renderDashboard', 'toggleDarkMode', 'openLogoEdit', 'applyColor', 'applyLogoImg'].every(n => E(`typeof ${n}`) === 'undefined') && ['agregarMed', 'eliminarMed', 'agregarServicio', 'guardarClinica', 'saveLogo', 'handleLogoUpload', 'pickColor'].every(n => E(`typeof ${n}`) === 'undefined'));

  // ───────── 2. navegación ─────────
  go('agenda'); check('clic en «Agenda» abre la agenda, marca el menú y pone el título', E('curPage') === 'agenda' && $('#nav-agenda').classList.contains('active') && D.getElementById('ptTitle').textContent === 'Agenda de Citas');
  go('configuracion'); check('clic en «Configuración» abre la página', /Datos de la clínica/.test(main()) && E('curPage') === 'configuracion');
  go('dashboard'); click($('.sb-logo')); check('clic en el logo/nombre de la clínica abre la Configuración (ya no un cuadro duplicado)', /Datos de la clínica/.test(main()) && !modalOpen());
  E("showPage('no-existe')"); check('una página desconocida cae en el Dashboard', E('curPage') === 'dashboard');
  E("openModal('<b>hola</b>')"); check('openModal muestra el cuadro', modalOpen()); click($('#modalOverlay .modal') || D.getElementById('modalContent')); check('clic DENTRO del cuadro no lo cierra', modalOpen());
  click(D.getElementById('modalOverlay')); check('clic en el fondo oscuro lo cierra', !modalOpen());
  E("openModal('x')"); D.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); check('la tecla Escape lo cierra', !modalOpen());

  // ───────── 3. dashboard ─────────
  const ym = TD.slice(0, 7), md = TD.slice(5);
  E(`Patients.all().length=0;Finance.expenses().length=0;Appts.quick().length=0;Services.list().length=0;
   Patients.all().push(Patients.blank({id:1,name:'Ana Torres',cedula:'1712345678',birthdate:'1990-${md}',appointments:[
     {id:11,date:'${TD}',time:'15:00',reason:'Control',status:'pendiente'},
     {id:12,date:'${TD}',time:'08:30',reason:'Limpieza',status:'pendiente'},
     {id:13,date:'${TD}',time:'10:00',reason:'Ya atendida',status:'completada'},
     {id:14,date:'${TD}',time:'11:00',reason:'No vino',status:'no_asistio'},
     {id:15,date:'${TD}',reason:'Sin hora',status:'pendiente'},
     {id:16,date:'${FUT}',time:'09:00',reason:'Ortodoncia',status:'pendiente'}],
     payments:[{id:21,date:'${TD}',amount:100,concept:'Resina',factPendiente:true},{id:22,date:'${TD}',concept:'Sin monto'}]}),
   Patients.blank({id:2,name:'Beto Ruiz',birthdate:'1985-${md}'}));
   delete Patients.all()[1].appointments;delete Patients.all()[1].payments;
   Finance.expenses().push({id:1,fecha:'${TD}',monto:30,categoria:'Luz'});
   Appts.quick().push({id:'q1',type:'quick',ptName:'Zoe Rápida',phone:'0987654321',reason:'Dolor',date:'${TD}',time:'12:00',status:'pendiente'},{id:'q2',type:'quick',ptName:'Hecha',reason:'x',date:'${TD}',time:'13:00',status:'completada'});`);
  go('dashboard'); const dash = main(), dh = html();
  check('el dashboard se dibuja aunque haya una cita SIN hora, un pago sin monto y un paciente sin listas (ANTES podía romperse según el orden de las citas)', /Citas de hoy/.test(dash) && !errs.length, errs.join('|'));
  check('«Citas de hoy» muestra solo las pendientes (3 del paciente + 1 rápida); no la completada ni la que no asistió', /4 citas hoy/.test(dash) && /Control/.test(dash) && /Limpieza/.test(dash) && /Sin hora/.test(dash) && !/Ya atendida/.test(dash) && !/No vino/.test(dash));
  check('ANTES las citas rápidas de hoy no aparecían en el inicio; ahora sí', /Zoe Rápida/.test(dash) && /Dolor/.test(dash) && !/Hecha/.test(dash));
  const times = $$('.today-appt .time-badge').map(e => e.textContent);
  check('ordenadas por hora (las que no tienen hora al principio)', JSON.stringify(times) === JSON.stringify(['—', '08:30', '12:00', '15:00']), JSON.stringify(times));
  check('«Próximas citas» lista la de dentro de 3 días', /Ortodoncia/.test(dash));
  check('cumpleaños de hoy: se muestran los dos (ANTES solo el primero)', /Ana Torres cumple años hoy/.test(dash) && /Beto Ruiz cumple años hoy/.test(dash));
  check('factura pendiente: contador y total', /1 factura pendiente de emitir/.test(dash) && /Total: \$100\.00/.test(dash));
  check('KPIs: ingresos $100.00, egresos $30.00 y utilidad $70.00', /Ingresosmes\$100\.00/.test(dash.replace(/\s/g, '')) && /Egresos: \$30\.00/.test(dash) && /Utilidadmes\$70\.00/.test(dash.replace(/\s/g, '')));
  check('el dashboard no usa onclick', !/\sonclick=/.test(dh));
  click(act('patients.select', '[data-id="1"]')); check('«Ver» abre la ficha del paciente', E('Patients.current() && Patients.current().id') === 1); go('dashboard');
  click(act('agenda.openDetail', '[data-id="q1"]')); check('«Ver cita» de una cita rápida abre su detalle', modalOpen() && /Zoe Rápida/.test(modal())); click(D.getElementById('modalOverlay'));
  E(`Patients.all()[0].name=${JSON.stringify(hostile)};Patients.all()[0].payments[0].concept=${JSON.stringify(hostile)};Patients.all()[1].name=${JSON.stringify(hostile)};Appts.quick()[0].ptName=${JSON.stringify(hostile)};Appts.quick()[0].reason=${JSON.stringify(hostile)}`);
  go('dashboard'); check('SEGURIDAD: nombres, motivos y conceptos con HTML se ven como texto', !$('#PWN') && !$('[onerror]') && main().includes(hostile));
  E(`Patients.all()[0].name='Ana Torres';Patients.all()[1].name='Beto Ruiz'`);
  E(`Patients.all()[0].payments[0].amount='abc';Patients.all()[0].appointments[0].time=null;Patients.all()[0].appointments.push({id:99},{date:'${TD}'})`); go('dashboard'); check('datos corruptos (monto «abc», hora nula, citas vacías) no tumban la pantalla', /Citas de hoy/.test(main()) && !errs.length, errs.join('|'));

  // ───────── 4. configuración: reloj y estructura ─────────
  go('configuracion'); await wait(200);
  const clock = D.getElementById('cfg_localtime').textContent;
  check('ANTES el reloj de la zona horaria quedaba vacío; ahora muestra fecha y hora', clock.length > 10, clock);
  const sel = D.getElementById('cfg_tz'); sel.value = '9'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(50);
  check('al cambiar de zona el reloj se actualiza al momento', D.getElementById('cfg_localtime').textContent !== clock);
  sel.value = '-5'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));

  // ───────── 5. datos de la clínica ─────────
  const fillClinic = f => Object.entries(f).forEach(([k, val]) => setv(k, val));
  reset(); fillClinic({ cfg_ln: '', cfg_lprof: 'Dr. R', cfg_ruc: '', cfg_tel: '', cfg_dir: '', cfg_recnum: '1' }); click(act('settings.saveClinic'));
  check('nombre vacío: avisa y no guarda (ANTES lo ignoraba en silencio)', /nombre del consultorio/i.test(alerts[0] || '') && D.getElementById('logoText').textContent !== '');
  reset(); fillClinic({ cfg_ln: 'Clínica Sonrisa', cfg_ruc: '17123', cfg_recnum: '1' }); click(act('settings.saveClinic')); check('RUC con menos de 13 números: error y no guarda', /13 números/.test(alerts[0] || '') && E('clinicaRUC') === '', alerts[0]);
  reset(); fillClinic({ cfg_ruc: '1712345678abc' }); click(act('settings.saveClinic')); check('RUC con letras: error', /13 números/.test(alerts[0] || ''));
  reset(); fillClinic({ cfg_ruc: '1712345678001', cfg_recnum: '0' }); click(act('settings.saveClinic')); check('N° de receta 0 o negativo: error', /N° de receta/.test(alerts[0] || ''));
  reset(); fillClinic({ cfg_recnum: '2.5' }); click(act('settings.saveClinic')); check('N° de receta con decimales: error', /N° de receta/.test(alerts[0] || ''));
  reset(); fillClinic({ cfg_ruc: '1712345678002', cfg_recnum: '1' }); click(act('settings.saveClinic')); check('RUC que no termina en 001: avisa y pregunta', asked.length === 1 && /001/.test(asked[0]) && E('clinicaRUC') === '1712345678002');
  reset(); confirmAnswer = false; fillClinic({ cfg_ruc: '1790012345001', cfg_dir: 'No guardar' }); E("clinicaRUC='1712345678002'"); fillClinic({ cfg_ruc: '1712345678003' }); click(act('settings.saveClinic')); check('si dices «no» al aviso, no se guarda nada', asked.length === 1 && E('clinicaRUC') === '1712345678002' && E('clinicaDireccion') !== 'No guardar');
  reset(); E("Patients.all()[0].recetas=[{id:850}]"); fillClinic({ cfg_ruc: '1790012345001', cfg_recnum: '800' }); confirmAnswer = false; click(act('settings.saveClinic')); check('N° de receta menor que una ya emitida: avisa que se repetirían números', /receta N° 850/.test(asked[0] || '') && E("Counters.get('nextRecetaId')") !== 800, asked[0]);
  reset(); fillClinic({ cfg_ln: "Clínica O'Neil & Hijos", cfg_lprof: 'Dra. Ana', cfg_ruc: '1790012345001', cfg_tel: '02-2345678', cfg_dir: 'Av. 6 de Dic.', cfg_recnum: '851', cfg_tz: '-5' }); click(act('settings.saveClinic'));
  check('datos válidos: se guardan, el menú lateral cambia y el botón dice «Guardado»', E('clinicaRUC') === '1790012345001' && E('clinicaTelefono') === '02-2345678' && E("Counters.get('nextRecetaId')") === 851 && D.getElementById('logoText').textContent === "Clínica O'Neil & Hijos" && D.getElementById('logoProfesional').textContent === 'Dra. Ana' && /Guardado/.test(D.getElementById('cfg_saveclinic').textContent) && alerts.length === 0 && asked.length === 0, JSON.stringify([alerts, asked]));
  reset(); fillClinic({ cfg_ruc: '1790 012-345 001' }); click(act('settings.saveClinic')); check('el RUC se limpia (espacios y guiones) antes de guardarlo', E('clinicaRUC') === '1790012345001');

  // ───────── 6. tema y color ─────────
  click(act('settings.theme', '[data-theme="dark"]')); check('«Oscuro» activa el modo oscuro, lo recuerda y la página se vuelve a dibujar', D.body.classList.contains('dark-mode') && w.localStorage.getItem('oa3_dark') === '1' && D.getElementById('darkToggle').textContent === '☀️' && /Configuración|Datos de la clínica/.test(main()));
  click(act('settings.theme', '[data-theme="light"]')); check('«Claro» lo desactiva', !D.body.classList.contains('dark-mode') && w.localStorage.getItem('oa3_dark') === '0');
  click(D.getElementById('darkToggle')); check('el botón 🌙 de la barra superior alterna el modo', D.body.classList.contains('dark-mode')); click(D.getElementById('darkToggle')); check('…y vuelve', !D.body.classList.contains('dark-mode'));
  click(act('settings.color', '[data-color="#8b5cf6"]')); check('un color de acento: se aplica, se marca y se guarda', E('logoColor') === '#8b5cf6' && w.document.documentElement.style.getPropertyValue('--accent') === '#8b5cf6' && $('.cs.sel').getAttribute('data-color') === '#8b5cf6');
  check('un color inválido (de un respaldo manipulado) se ignora', E("Logo.setColor('red;background:url(x)')") === false && E("Logo.setColor('#xyz123')") === false && E('logoColor') === '#8b5cf6');

  // ───────── 7. logo ─────────
  reset(); await pickFile(new w.File(['hola'], 'x.txt', { type: 'text/plain' })); check('un archivo que no es imagen: avisa y no cambia nada', /PNG, JPG/.test(alerts[0] || '') && !E('logoImg'), alerts[0]);
  reset(); await pickFile(new w.File([new Uint8Array(2.5 * 1024 * 1024)], 'grande.png', { type: 'image/png' })); check('una imagen de más de 2 MB: avisa (ANTES se aceptaba y engordaba cada respaldo)', /2 MB/.test(alerts[0] || '') && !E('logoImg'), alerts[0]);
  reset(); await pickFile(new w.File([png], 'logo.png', { type: 'image/png' }));
  check('un PNG válido: se guarda, aparece en el menú lateral y en la página', /^data:image\/png;base64,/.test(E('logoImg') || '') && !!$('#logoIcon img') && !!$('.upload-area img') && alerts.length === 0, alerts[0]);
  check('el menú lateral usa un <img> real (no se arma con texto)', $('#logoIcon img').getAttribute('src') === E('logoImg'));
  E(`logoImg=${JSON.stringify('data:image/png;base64,AAAA" onerror="window.PWN=1')}`); E('Settings.refresh()'); check('SEGURIDAD: un logo manipulado no se pinta ni inyecta atributos', !$('.upload-area img') && !$('[onerror]') && !E('window.PWN'));
  check('Logo.applyImg rechaza lo que no sea una imagen incrustada', E(`Logo.applyImg('javascript:alert(1)')`) === false && E(`Logo.applyImg('https://x.com/a.png')`) === false && E('logoImg') === null);
  reset(); await pickFile(new w.File([png], 'logo.png', { type: 'image/png' })); await wait(500);
  const w2 = await openApp(); check('el logo sobrevive en otro navegador (viene de la base)', /^data:image\/png/.test(w2.eval('logoImg') || '') && !!w2.document.querySelector('#logoIcon img') && w2.eval('clinicaRUC') === '1790012345001' && w2.eval('logoColor') === '#8b5cf6', w2.eval('logoColor') + w2.eval('clinicaRUC')); w2.close();
  click(act('settings.clearLogo')); check('«Quitar logo» vuelve al ícono por defecto', !E('logoImg') && !$('#logoIcon img') && !!$('#logoIcon svg'));

  // ───────── 8. Services.list() ─────────
  const svcs = () => E('Services.list().map(s=>s.nombre+"|"+s.precio+"|"+s.categoria)');
  reset(); click(act('settings.svcAdd')); check('servicio sin nombre: avisa', /nombre del servicio/.test(alerts[0] || '') && E('Services.list().length') === 0);
  reset(); setv('cfg_svcnombre', 'Limpieza'); setv('cfg_svcprecio', '-5'); click(act('settings.svcAdd')); check('precio negativo: error', /negativo/.test(alerts[0] || '') && E('Services.list().length') === 0, alerts[0]);
  check('precio «abc» (llegue por donde llegue): error (ANTES se guardaba como $0.00)', E("Services.check({nombre:'Limpieza',precio:'abc'}).ok") === false && /número válido/.test(E("Services.check({nombre:'Limpieza',precio:'abc'}).error")) && E("Services.check({nombre:'L',precio:'99999999'}).ok") === false && E('Services.list().length') === 0);
  reset(); setv('cfg_svcnombre', 'x'.repeat(81)); click(act('settings.svcAdd')); check('nombre de más de 80 letras: error', /demasiado largo/.test(alerts[0] || ''));
  reset(); setv('cfg_svcnombre', '  Limpieza   dental '); setv('cfg_svcprecio', '25.5'); setv('cfg_svccategoria', 'Prevención'); click(act('settings.svcAdd'));
  check('servicio válido: se guarda limpio (espacios, decimales) con id', JSON.stringify(svcs()) === JSON.stringify(['Limpieza dental|25.5|Prevención']) && E('Services.list()[0].id') > 0 && alerts.length === 0 && asked.length === 0, JSON.stringify(svcs()));
  check('…aparece en la lista y los campos quedan vacíos para el siguiente', /Limpieza dental/.test(main()) && /\$25\.50/.test(main()) && D.getElementById('cfg_svcnombre').value === '');
  reset(); confirmAnswer = false; setv('cfg_svcnombre', 'limpieza DENTAL'); setv('cfg_svcprecio', '30'); click(act('settings.svcAdd')); check('nombre repetido (sin importar mayúsculas): avisa; «no» no lo agrega', /Ya existe/.test(asked[0] || '') && E('Services.list().length') === 1);
  reset(); setv('cfg_svcnombre', 'limpieza DENTAL'); setv('cfg_svcprecio', '30'); click(act('settings.svcAdd')); check('…y «sí» lo agrega igual', E('Services.list().length') === 2);
  reset(); setv('cfg_svcnombre', 'Gratis'); setv('cfg_svcprecio', ''); confirmAnswer = false; click(act('settings.svcAdd')); check('precio vacío o $0: avisa antes de guardar', /\$0\.00/.test(asked[0] || '') && E('Services.list().length') === 2);
  reset(); setv('cfg_svcnombre', 'Resina'); setv('cfg_svcprecio', '40'); key('cfg_svcnombre', 'Enter'); check('Enter en el nombre agrega el servicio', E('Services.list().length') === 3);
  // los campos que ya estaban escritos en otra tarjeta no se pierden
  setv('cfg_ln', 'Nombre a medio escribir'); setv('cfg_svcnombre', 'Otro'); setv('cfg_svcprecio', '12'); click(act('settings.svcAdd'));
  check('ANTES agregar un servicio borraba lo que estabas escribiendo en «Datos de la clínica»; ahora se conserva', D.getElementById('cfg_ln').value === 'Nombre a medio escribir' && E('Services.list().length') === 4);
  setv('cfg_ln', "Clínica O'Neil & Hijos");
  const sid = E('Services.list()[0].id'); reset(); click(act('settings.svcEdit', `[data-id="${sid}"]`));
  check('«Editar» abre el cuadro con los valores del servicio', modalOpen() && D.getElementById('f_esvnombre').value === 'Limpieza dental' && D.getElementById('f_esvprecio').value === '25.50' && D.getElementById('f_esvcategoria').value === 'Prevención');
  setv('f_esvnombre', ''); click(act('settings.svcSave')); check('guardar sin nombre: avisa y el cuadro sigue abierto', /nombre/.test(alerts[0] || '') && modalOpen());
  reset(); setv('f_esvnombre', 'Profilaxis'); setv('f_esvprecio', '35'); setv('f_esvcategoria', 'Periodoncia'); click(act('settings.svcSave'));
  check('guardar cambios: se actualiza ESE servicio, el cuadro se cierra y la lista cambia', !modalOpen() && E('Services.list()[0].nombre') === 'Profilaxis' && E('Services.list()[0].precio') === 35 && E('Services.list()[0].categoria') === 'Periodoncia' && E('Services.list()[0].id') === sid && /Profilaxis/.test(main()));
  reset(); E(`Services.list()[1].nombre=${JSON.stringify(hostile)};Services.list()[1].categoria=${JSON.stringify(hostile)}`); E('Settings.refresh()'); click(act('settings.svcEdit', `[data-id="${E('Services.list()[1].id')}"]`));
  check('SEGURIDAD: nombre y categoría con HTML se ven como texto en la lista y en el cuadro de edición', !$('#PWN') && !$('[onerror]') && main().includes(hostile) && D.getElementById('f_esvnombre').value === hostile); click(D.getElementById('modalOverlay'));
  E("Services.list()[1].nombre='Resina grande';Services.list()[1].categoria='General'"); E('Settings.refresh()');
  reset(); confirmAnswer = false; click(act('settings.svcDelete', `[data-id="${sid}"]`)); check('eliminar: el aviso nombra el servicio; «no» lo conserva', /Profilaxis/.test(asked[0] || '') && E('Services.list().length') === 4);
  reset(); const idxBefore = E('Services.list().map(s=>s.id)'); click(act('settings.svcDelete', `[data-id="${sid}"]`)); check('«sí» elimina justo ese servicio (por id, no por posición)', E('Services.list().length') === 3 && !E('Services.list()').some(s => s.id === sid));
  // Services.list() antiguos sin id
  E("Services.list().forEach(s=>delete s.id)"); E('Settings.refresh()'); check('servicios antiguos sin id reciben uno y se pueden editar', E('Services.list().every(s=>s.id!=null)') && !!act('settings.svcEdit'));

  // ───────── 9. medicamentos ─────────
  const meds = () => E('MEDICAMENTOS_COMUNES.slice()');
  reset(); setv('cfg_newmed', ''); click(act('settings.medAdd')); check('medicamento vacío: avisa', /nombre del medicamento/.test(alerts[0] || ''));
  reset(); setv('cfg_newmed', 'paracetamol 500MG'); click(act('settings.medAdd')); check('repetido (sin importar mayúsculas): avisa y no lo agrega', /ya está en la lista/.test(alerts[0] || '') && meds().filter(m => /paracetamol 500/i.test(m)).length === 1, alerts[0]);
  reset(); setv('cfg_newmed', '  Amoxicilina   875mg '); click(act('settings.medAdd')); check('medicamento válido: se agrega limpio, aparece y el campo se vacía', meds().includes('Amoxicilina 875mg') && /Amoxicilina 875mg/.test(main()) && D.getElementById('cfg_newmed').value === '');
  reset(); setv('cfg_newmed', hostile); click(act('settings.medAdd')); check('ANTES un medicamento con HTML se pintaba SIN escapar en el cuadro de configuración (inyección real); ahora es texto', !$('#PWN') && !$('[onerror]') && main().includes(hostile) && meds().includes(hostile));
  reset(); setv('cfg_newmed', "Ibuprofeno 'forte' & \"extra\""); key('cfg_newmed', 'Enter'); check('Enter agrega; comillas y & se conservan', meds().includes("Ibuprofeno 'forte' & \"extra\""));
  reset(); confirmAnswer = false; click(act('settings.medDelete', '[data-name="Amoxicilina 875mg"]')); check('quitar: el aviso nombra el medicamento; «no» lo conserva', /Amoxicilina 875mg/.test(asked[0] || '') && meds().includes('Amoxicilina 875mg'));
  reset(); click(act('settings.medDelete', '[data-name="Amoxicilina 875mg"]')); check('«sí» lo quita', !meds().includes('Amoxicilina 875mg'));
  reset(); const hb = $$('[data-action="settings.medDelete"]').find(b => b.getAttribute('data-name') === hostile); click(hb); check('un nombre con comillas/HTML también se puede quitar (viaja en data-name escapado)', !meds().includes(hostile));
  const tricky = $$('[data-action="settings.medDelete"]').find(b => b.getAttribute('data-name').startsWith('Ibuprofeno \'forte\'')); click(tricky); check('…y el de comillas simples y dobles', !meds().some(m => m.startsWith("Ibuprofeno 'forte'")));
  setv('cfg_newmed', 'Solo en base'); click(act('settings.medAdd')); await wait(500);
  const w3 = await openApp(); check('ANTES los medicamentos solo vivían en localStorage; ahora sobreviven en la base (navegador sin localStorage)', w3.eval('MEDICAMENTOS_COMUNES').includes('Solo en base'), w3.eval('MEDICAMENTOS_COMUNES.length')); w3.close();
  E("MEDICAMENTOS_COMUNES=MEDICAMENTOS_COMUNES.filter(m=>m!=='Solo en base')");

  // ───────── 10. mensaje de WhatsApp ─────────
  reset(); setv('cfg_wamsg', 'Hola {nombre}, te esperamos el {fecha} a las {hora} en {clinica}. Motivo: {motivo}'); click(act('settings.saveWA')); check('mensaje con variables válidas: se guarda sin avisos', w.localStorage.getItem('oa3_wamsg').startsWith('Hola {nombre}') && asked.length === 0 && /Guardado/.test(D.getElementById('cfg_savewa').textContent));
  reset(); confirmAnswer = false; setv('cfg_wamsg', 'Hola {nombr}, cita {fehca}'); click(act('settings.saveWA')); check('variables mal escritas ({nombr}, {fehca}): avisa y «no» no guarda', /\{nombr\}/.test(asked[0] || '') && /\{fehca\}/.test(asked[0] || '') && w.localStorage.getItem('oa3_wamsg').startsWith('Hola {nombre}'), asked[0]);
  reset(); setv('cfg_wamsg', 'x'.repeat(1001)); click(act('settings.saveWA')); check('más de 1000 letras: error', /demasiado largo/.test(alerts[0] || ''));
  reset(); setv('cfg_wamsg', '   '); click(act('settings.saveWA')); check('ANTES no había forma de volver al mensaje original; ahora vacío = restablecer', w.localStorage.getItem('oa3_wamsg') === null && D.getElementById('cfg_wamsg').value === E('Appts.defaultWAMsg()'));
  E("localStorage.setItem('oa3_wamsg',"+JSON.stringify(hostile)+")"); E("Settings.refresh(['cfg_wamsg'])"); check('SEGURIDAD: un mensaje guardado con HTML se ve como texto', !$('#PWN') && D.getElementById('cfg_wamsg').value === hostile); E("localStorage.removeItem('oa3_wamsg')");

  // ───────── 11. zona de peligro, CIE-10 y auditoría ─────────
  reset(); confirmAnswer = false; click(act('settings.reset')); check('«Restablecer» pregunta y, si dices no, no borra nada', asked.length === 1 && E('Patients.all().length') === 2);
  check('el botón de CIE-10 y el medidor de almacenamiento siguen en la página', !!act('settings.cie10') && !!D.getElementById('storage-meter'));

  check('sin errores de JavaScript durante toda la prueba', errs.length === 0, errs.slice(0, 3).join(' | '));
  w.close(); srv.close();
  const fail = results.filter(x => !x).length;
  console.log(fail ? `\n✘ ${fail} prueba(s) fallaron` : `\n✔ Todas las pruebas de la UI pasaron (${results.length} comprobaciones)`); process.exit(fail ? 1 : 0);
});
