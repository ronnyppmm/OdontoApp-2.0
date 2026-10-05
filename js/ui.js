/* ═══ UI BASE — navegación, modales, dashboard, configuración, logo/tema ═══ */
// ═══ NAVIGATION ═══
function showPage(page){
  curPage=page;curPt=null;
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  const el=document.getElementById('nav-'+page);if(el)el.classList.add('active');
  document.getElementById('ptBadge').style.display='none';
document.getElementById('topActions').innerHTML='';
document.getElementById('tabsBar').style.display='none';
document.body.classList.remove('pt-open');
document.getElementById('ptWinHeader').innerHTML='';
  renderSidebar();
  const titles={dashboard:'Dashboard',agenda:'Agenda de Citas',estadisticas:'Estadísticas',recordatorios:'Recordatorios de pacientes',configuracion:'⚙️ Configuración'};
  document.getElementById('ptTitle').textContent=titles[page]||'Dashboard';
  const fns={dashboard:renderDashboard,agenda:renderAgendaPage,estadisticas:renderEstadisticas,recordatorios:renderRecordatorios,configuracion:renderConfiguracion};
if(fns[page]) document.getElementById('mainContent').innerHTML=fns[page]();
if(page==='configuracion')setTimeout(pintarMedidor,150);
}

// ═══ DASHBOARD ═══
function renderDashboard(){
  const now=new Date(),todayStr=today(),h=now.getHours();
  const greeting=h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
  const todayAppts=[];
  patients.forEach(p=>p.appointments.filter(a=>a.date===todayStr&&a.status!=='completada').forEach(a=>todayAppts.push({...a,ptName:p.name,ptId:p.id})));
  todayAppts.sort((a,b)=>a.time.localeCompare(b.time));
  const upcoming=[];
  patients.forEach(p=>p.appointments.filter(a=>a.date>todayStr&&a.status!=='completada').forEach(a=>upcoming.push({...a,ptName:p.name,ptId:p.id})));
  upcoming.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const bdToday=patients.filter(p=>{if(!p.birthdate)return false;const b=p.birthdate.split('-');return b[1]===String(now.getMonth()+1).padStart(2,'0')&&b[2]===String(now.getDate()).padStart(2,'0');});
  const mIncome=patients.reduce((s,p)=>s+p.payments.filter(py=>{const d=new Date(py.date+'T12:00');return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&!py.archivado;}).reduce((a,py)=>addM(a,py.amount),0),0);
  const mEgresos=egresos.filter(e=>{const d=new Date(e.fecha+'T12:00');return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()&&!e.archivado;}).reduce((s,e)=>addM(s,e.monto),0);
  const pendTx=patients.reduce((s,p)=>s+p.treatments.filter(t=>t.status==='pendiente').length,0);
  // Collect all pending invoices across patients
  const factPend=[];
  patients.forEach(p=>p.payments.filter(py=>py.factPendiente).forEach(py=>factPend.push({...py,ptName:p.name,ptId:p.id,cedula:p.cedula})));
  factPend.sort((a,b)=>b.date.localeCompare(a.date));

  return`
  <div class="dash-greeting">${greeting} 👋</div>
  <div class="dash-sub">${now.toLocaleDateString('es-EC',{weekday:'long',day:'numeric',month:'long'})} · ${todayAppts.length} cita${todayAppts.length!==1?'s':''} hoy</div>
<div class="dash-frase">"${fraseDelDia()}"</div>
  ${bdToday.length?`<div class="bday-card"><div style="font-size:28px">🎂</div><div style="flex:1"><div style="font-size:14px;font-weight:700;color:#063154">¡${bdToday[0].name} cumple años hoy!</div><div style="font-size:12px;color:#2f7d74">${calcAge(bdToday[0].birthdate)} años</div></div><button class="btn-sm" onclick="selectPt(${bdToday[0].id})">Ver ficha</button></div>`:''}
  ${factPend.length?`<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:14px;padding:16px;margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">🧾</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#6b4a2f">${factPend.length} factura${factPend.length>1?'s':''} pendiente${factPend.length>1?'s':''} de emitir en el SRI</div>
          <div style="font-size:12px;color:#8a6a4a">Total: <strong>$${factPend.reduce((s,p)=>addM(s,p.amount),0).toFixed(2)}</strong></div>
        </div>
      </div>
      <a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank"
        style="padding:8px 14px;background:#b98a4e;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0">
        🌐 Ir al SRI
      </a>
    </div>
    ${factPend.slice(0,5).map(py=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,.6);border-radius:8px;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:#6b4a2f">${esc(py.ptName)}</div>
          <div style="font-size:11px;color:#8a6a4a">${esc(py.concept)} · ${fmtDate(py.date)} · CI: ${esc(py.cedula||'—')}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:#6b4a2f">$${py.amount.toFixed(2)}</div>
        <button onclick="selectPt(${py.ptId})" style="padding:4px 10px;font-size:11px;background:rgba(255,255,255,.8);border:1px solid #dcc39c;border-radius:6px;cursor:pointer;color:#6b4a2f">Ver</button>
      </div>`).join('')}
    ${factPend.length>5?`<div style="font-size:11px;color:#8a6a4a;text-align:center;margin-top:4px">+${factPend.length-5} más pendientes</div>`:''}
  </div>`:''}
  ${recallCardHtml()}
  <div class="grid4" style="margin-bottom:16px">
    <div class="kpi"><div class="kpi-label">Pacientes</div><div class="kpi-val" style="color:var(--accent)">${patients.length}</div></div>
    <div class="kpi"><div class="kpi-label">Citas hoy</div><div class="kpi-val" style="color:var(--green)">${todayAppts.length}</div></div>
    <div class="kpi"><div class="kpi-label">Ingresos mes</div><div class="kpi-val" style="color:var(--green)">${money(mIncome)}</div><div class="kpi-sub" style="color:var(--red)">Egresos: ${money(mEgresos)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad mes</div><div class="kpi-val" style="color:${mIncome-mEgresos>=0?'var(--green)':'var(--red)'}">${money(mIncome-mEgresos)}</div></div>
  </div>
  <div class="grid2">
    <div class="card"><div class="card-title">Citas de hoy</div>
      ${todayAppts.length?todayAppts.map(a=>`<div class="today-appt"><div class="time-badge">${a.time}</div><div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(a.ptName)}</div><div style="font-size:11px;color:var(--text2)">${esc(a.reason)}</div></div><button class="btn-sm" style="font-size:11px;padding:4px 10px" onclick="selectPt(${a.ptId})">Ver</button></div>`).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin citas para hoy</div>`}
    </div>
    <div class="card"><div class="card-title">Próximas citas</div>
      ${upcoming.slice(0,5).length?upcoming.slice(0,5).map(a=>`<div class="today-appt"><div style="width:60px;flex-shrink:0"><div style="font-size:12px;font-weight:700">${fmtDate(a.date)}</div><div style="font-size:10px;color:var(--text3)">${a.time}</div></div><div style="flex:1"><div style="font-size:13px;font-weight:500">${esc(a.ptName)}</div><div style="font-size:11px;color:var(--text2)">${esc(a.reason)}</div></div></div>`).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin próximas citas</div>`}
    </div>
  </div>`;
}

// ═══ DARK MODE ═══
function toggleDarkMode(){
  const dark=document.body.classList.toggle('dark-mode');
  localStorage.setItem('oa3_dark',dark?'1':'0');
  document.getElementById('darkToggle').textContent=dark?'☀️':'🌙';
}

// ═══ CONFIGURACIÓN (página completa) ═══
function renderConfiguracion(){
  const cieN=CIE10_FULL?CIE10_FULL.length:0;
  const COLS=['#2f9d94','#025f67','#063154','#10b981','#b98a4e','#ef4444','#8b5cf6','#0f172a'];
  const dark=document.body.classList.contains('dark-mode');
  return`
  <div style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:16px">

    <div class="card">
      <div class="card-title">🏥 Datos de la clínica</div>
      <div class="form-row form-full"><div class="form-group"><label>Nombre del consultorio</label><input id="cfg_ln" value="${document.getElementById('logoText').textContent}"></div></div>
      <div class="form-row form-full"><div class="form-group"><label>Profesional a cargo</label><input id="cfg_lprof" value="${document.getElementById('logoProfesional').textContent}" placeholder="Dr. Nombre Apellido"></div></div>
      <div class="form-row"><div class="form-group"><label>RUC</label><input id="cfg_ruc" value="${clinicaRUC}" placeholder="1712345678001"></div><div class="form-group"><label>Teléfono</label><input id="cfg_tel" value="${clinicaTelefono}" placeholder="02-234-5678"></div></div>
      <div class="form-row form-full"><div class="form-group"><label>Dirección</label><input id="cfg_dir" value="${clinicaDireccion}" placeholder="Av. Principal 123, Quito"></div></div>
      <div class="form-row"><div class="form-group"><label>🔢 Próximo N° de receta</label><input id="cfg_recnum" type="number" min="1" value="${nextRecetaId}"><div style="font-size:10px;color:var(--text3);margin-top:3px">La próxima receta llevará este número y las siguientes continuarán la secuencia. Ej: si tu última receta física fue la 850, escribe 851.</div></div></div>
      <div class="form-row form-full"><div class="form-group">
        <label>🌐 Zona horaria</label>
        <select id="cfg_tz">
          ${[
            ['-12','(UTC-12) Línea de fecha internacional'],
            ['-11','(UTC-11) Samoa'],
            ['-10','(UTC-10) Hawaii'],
            ['-9','(UTC-9) Alaska'],
            ['-8','(UTC-8) Los Ángeles, Vancouver'],
            ['-7','(UTC-7) Ciudad de México, Denver'],
            ['-6','(UTC-6) Guatemala, Costa Rica'],
            ['-5','(UTC-5) Ecuador, Colombia, Perú, Bogotá, Lima ✓'],
            ['-4','(UTC-4) Venezuela, Bolivia, Chile'],
            ['-3','(UTC-3) Argentina, Brasil, Uruguay'],
            ['-2','(UTC-2) Georgia del Sur'],
            ['-1','(UTC-1) Azores'],
            ['0','(UTC+0) Londres, Dublín'],
            ['1','(UTC+1) Madrid, París, Berlín'],
            ['2','(UTC+2) Atenas, Cairo'],
            ['3','(UTC+3) Moscú, Nairobi'],
            ['4','(UTC+4) Dubai'],
            ['5','(UTC+5) Islamabad'],
            ['5.5','(UTC+5:30) India'],
            ['6','(UTC+6) Dhaka'],
            ['7','(UTC+7) Bangkok, Jakarta'],
            ['8','(UTC+8) China, Singapur'],
            ['9','(UTC+9) Tokio, Corea'],
            ['10','(UTC+10) Sídney'],
            ['11','(UTC+11) Islas Salomón'],
            ['12','(UTC+12) Nueva Zelanda']
          ].map(([v,l])=>`<option value="${v}"${String(getTzOffset())===v?' selected':''}>${l}</option>`).join('')}
        </select>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">Fecha/hora local actual: <strong id="cfg_localtime"></strong></div>
      </div></div>
      <div style="display:flex;justify-content:flex-end;margin-top:4px"><button class="btn-primary" onclick="guardarClinica(event)">💾 Guardar datos</button></div>
    </div>

    <div class="card">
      <div class="card-title"> Logo y apariencia</div>
      <div class="form-row">
        <div class="form-group">
          <label>Logo del consultorio</label>
          <div class="upload-area" onclick="document.getElementById('logoFileInput').click()" style="padding:14px;text-align:center">
            ${logoImg?`<img src="${logoImg}" style="height:50px;object-fit:contain;border-radius:6px;display:block;margin:0 auto 6px"><div style="font-size:11px;color:var(--text2)">Clic para cambiar</div>`:`<div style="font-size:28px;margin-bottom:4px">🖼️</div><div style="font-size:12px;color:var(--text2)">Subir logo (PNG, JPG)</div>`}
          </div>
          <input type="file" id="logoFileInput" accept="image/*" style="display:none" onchange="handleLogoUpload(event);setTimeout(()=>showPage('configuracion'),200)">
          ${logoImg?`<button onclick="clearLogo();showPage('configuracion')" style="margin-top:6px;font-size:11px;color:var(--red);background:none;border:none;cursor:pointer">✕ Quitar logo</button>`:''}
        </div>
        <div class="form-group">
          <label>Color de acento</label>
          <div class="color-swatches">${COLS.map(c=>`<div class="cs${c===logoColor?' sel':''}" style="background:${c}" onclick="applyColor('${c}');save();showPage('configuracion')"></div>`).join('')}</div>
          <label style="margin-top:14px;display:block">Modo de visualización</label>
          <div style="display:flex;gap:10px;margin-top:6px">
            <button onclick="if(!document.body.classList.contains('dark-mode')){toggleDarkMode();showPage('configuracion')}" style="flex:1;padding:10px;border-radius:10px;border:2px solid ${dark?'var(--accent)':'var(--border)'};background:${dark?'var(--accent)':'var(--card)'};color:${dark?'#fff':'var(--text2)'};cursor:pointer;font-size:13px;font-weight:600">🌙 Oscuro</button>
            <button onclick="if(document.body.classList.contains('dark-mode')){toggleDarkMode();showPage('configuracion')}" style="flex:1;padding:10px;border-radius:10px;border:2px solid ${!dark?'var(--accent)':'var(--border)'};background:${!dark?'var(--accent)':'var(--card)'};color:${!dark?'#fff':'var(--text2)'};cursor:pointer;font-size:13px;font-weight:600">☀️ Claro</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🦷 Catálogo de servicios</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Aparecen como atajo al registrar tratamientos y pagos.</div>
      <div style="max-height:220px;overflow-y:auto;margin-bottom:12px">
        ${servicios.length===0?`<div style="font-size:12px;color:var(--text3);padding:12px;text-align:center;border:1px dashed var(--border);border-radius:8px">Sin servicios configurados</div>`
        :servicios.map((s,i)=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-size:13px;color:var(--text);font-weight:500">${esc(s.nombre)}</div>
              <div style="font-size:10px;color:var(--text3)">${esc(s.categoria)}</div>
            </div>
            <div style="font-size:14px;font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</div>
            <button onclick="editarServicioCfg(${i})" style="padding:4px 10px;font-size:11px;background:#dbeafe;color:#1e40af;border:none;border-radius:6px;cursor:pointer;font-weight:600">✏️ Editar</button>
            <button onclick="eliminarServicioCfg(${i})" style="padding:4px 10px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:6px;cursor:pointer;font-weight:600">✕</button>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end">
        <div class="form-group" style="margin:0"><label>Nombre</label><input type="text" id="cfg_svcnombre" placeholder="Obturación resina..." onkeydown="if(event.key==='Enter')agregarServicioCfg()"></div>
        <div class="form-group" style="margin:0"><label>Precio ($)</label><input type="number" id="cfg_svcprecio" min="0" step="0.01" placeholder="0.00"></div>
        <div class="form-group" style="margin:0"><label>Categoría</label><select id="cfg_svccategoria"><option>Prevención</option><option>Operatoria</option><option>Endodoncia</option><option>Cirugía</option><option>Ortodoncia</option><option>Prótesis</option><option>Periodoncia</option><option>Estética</option><option>Radiología</option><option>General</option></select></div>
        <button onclick="agregarServicioCfg()" class="btn-primary" style="padding:9px 14px;margin-bottom:1px">+</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">💊 Medicamentos en recetas</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Sugerencias al crear una receta médica.</div>
      <div style="max-height:180px;overflow-y:auto;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px">
        ${MEDICAMENTOS_COMUNES.map((m,i)=>`
          <div style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text)">
            💊 ${m}
            <button onclick="eliminarMedCfg(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;line-height:1;padding:0 2px">×</button>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="cfg_newmed" placeholder="Ej: Amoxicilina 875mg" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;font-family:inherit;background:var(--card);color:var(--text)" onkeydown="if(event.key==='Enter')agregarMedCfg()">
        <button onclick="agregarMedCfg()" class="btn-primary">+ Agregar</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"> CIE-10 completo</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Carga el CSV oficial CIE-10 para buscar cualquier enfermedad. ${cieN?`<strong style="color:var(--green)">✓ ${cieN} códigos cargados.</strong>`:'Aún sin CSV (usando lista odontológica). '}</div>
      <button class="btn-primary" onclick="cie10Cargar()">📥 Cargar CSV CIE-10</button>
    </div>

    <div class="card">
      <div class="card-title">📱 Mensaje recordatorio WhatsApp</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:8px">Variables: <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{nombre}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{fecha}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{hora}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{motivo}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{clinica}</code></div>
      <textarea id="cfg_wamsg" style="width:100%;min-height:120px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;font-family:inherit;line-height:1.6;background:var(--card);color:var(--text)">${localStorage.getItem('oa3_wamsg')||getDefaultWAMsg()}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn-primary" onclick="guardarWAMsg(event)">💾 Guardar mensaje</button></div>
    </div>

    <div class="card">
      <div class="card-title">💾 Medidor de almacenamiento</div>
      <div id="storage-meter" style="font-size:12px;color:var(--text3)">Midiendo…</div>
    </div>

    <div class="card" style="border:1px solid #fca5a5">
      <div class="card-title" style="color:var(--red)">⚠️ Zona de peligro</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Esta acción es irreversible. Descarga un backup antes de proceder.</div>
      <button onclick="factoryReset()" style="padding:12px 24px;background:#ef4444;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">🗑 Restablecer app a valores de fábrica</button>
    </div>

  </div>`;
}
function guardarClinica(e){
  const n=document.getElementById('cfg_ln')?.value?.trim();
  const prof=document.getElementById('cfg_lprof')?.value?.trim();
  if(n)document.getElementById('logoText').textContent=n;
  if(prof)document.getElementById('logoProfesional').textContent=prof;
  clinicaRUC=document.getElementById('cfg_ruc')?.value||'';
  clinicaTelefono=document.getElementById('cfg_tel')?.value||'';
  clinicaDireccion=document.getElementById('cfg_dir')?.value||'';
  const tz=document.getElementById('cfg_tz')?.value;
if(tz)localStorage.setItem('oa3_tz',tz);
const rn=parseInt(document.getElementById('cfg_recnum')?.value);if(rn>=1)nextRecetaId=rn;
  save();renderSidebar();
  const btn=e.target;btn.textContent='✓ Guardado';btn.style.background='var(--green)';
  setTimeout(()=>{btn.textContent='💾 Guardar datos';btn.style.background='';},2000);
}

// Live clock updater for config page
function startCfgClock(){
  const el=document.getElementById('cfg_localtime');
  if(!el)return;
  const tz=parseFloat(document.getElementById('cfg_tz')?.value||getTzOffset());
  const utc=new Date().getTime()+(new Date().getTimezoneOffset()*60000);
  const local=new Date(utc+(tz*3600000));
  el.textContent=local.toLocaleString('es-EC',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  setTimeout(startCfgClock,5000);
}
setTimeout(startCfgClock,100);

function guardarWAMsg(e){
  const msg=document.getElementById('cfg_wamsg')?.value?.trim();
  if(msg)localStorage.setItem('oa3_wamsg',msg);
  const btn=e.target;btn.textContent='✓ Guardado';btn.style.background='var(--green)';
  setTimeout(()=>{btn.textContent='💾 Guardar mensaje';btn.style.background='';},2000);
}

function agregarServicioCfg(){
  const nombre=document.getElementById('cfg_svcnombre')?.value?.trim();
  const precio=parseMonto(document.getElementById('cfg_svcprecio')?.value)||0;
  const categoria=document.getElementById('cfg_svccategoria')?.value||'General';
  if(!nombre){alert('Escribe el nombre del servicio');return;}
  servicios.push({id:uid(),nombre,precio,categoria});
  save();showPage('configuracion');
}

function eliminarServicioCfg(idx){
  if(!confirm(`¿Eliminar "${servicios[idx]?.nombre}"?`))return;
  servicios.splice(idx,1);save();showPage('configuracion');
}

function editarServicioCfg(idx){
  const s=servicios[idx];if(!s)return;
  openModal(`<div class="modal-title">✏️ Editar servicio</div>
  <div class="form-row form-full"><div class="form-group"><label>Nombre del servicio *</label><input id="f_esvnombre" value="${esc(s.nombre)}"></div></div>
  <div class="form-row"><div class="form-group"><label>Precio ($)</label><input id="f_esvprecio" type="number" min="0" step="0.01" value="${s.precio.toFixed(2)}"></div>
  <div class="form-group"><label>Categoría</label><select id="f_esvcategoria">
    ${['Prevención','Operatoria','Endodoncia','Cirugía','Ortodoncia','Prótesis','Periodoncia','Estética','Radiología','General'].map(c=>`<option${c===s.categoria?' selected':''}>${c}</option>`).join('')}
  </select></div></div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="guardarEdicionServicio(${idx})">💾 Guardar cambios</button>
  </div>`);
}

function guardarEdicionServicio(idx){
  const nombre=v('f_esvnombre')?.trim();
  const precio=parseMonto(v('f_esvprecio'))||0;
  const categoria=v('f_esvcategoria');
  if(!nombre){alert('El nombre no puede estar vacío');return;}
  servicios[idx]={...servicios[idx],nombre,precio,categoria};
  save();closeModal();showPage('configuracion');
}

function agregarMedCfg(){
  const input=document.getElementById('cfg_newmed');
  const nombre=input?.value?.trim();
  if(!nombre){alert('Escribe el nombre del medicamento');return;}
  if(MEDICAMENTOS_COMUNES.includes(nombre)){alert('Ya existe en la lista');return;}
  MEDICAMENTOS_COMUNES.push(nombre);saveMeds();showPage('configuracion');
}

function eliminarMedCfg(idx){
  if(!confirm(`¿Eliminar "${MEDICAMENTOS_COMUNES[idx]}"?`))return;
  MEDICAMENTOS_COMUNES.splice(idx,1);saveMeds();showPage('configuracion');
}

// ═══ LOGO / PERSONALIZACIÓN ═══
function applyColor(col){
  logoColor=col;
  const icon=document.getElementById('logoIcon');
  if(!logoImg)icon.style.background=col;
  document.documentElement.style.setProperty('--sbactive',col);
  document.documentElement.style.setProperty('--accent',col);
  document.documentElement.style.setProperty('--accent2',col+'cc');
}

function applyLogoImg(src){
  logoImg=src;
  const icon=document.getElementById('logoIcon');
  icon.innerHTML=`<img src="${src}" style="width:100%;height:100%;object-fit:cover">`;
  icon.style.background='transparent';
}

function openLogoEdit(){
  const COLS=['#2f9d94','#025f67','#063154','#10b981','#b98a4e','#ef4444','#8b5cf6','#0f172a'];
  openModal(`<div class="modal-title">⚙️ Configuración</div>

  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">🏥 Datos de la clínica</div>
  <div class="form-row form-full"><div class="form-group"><label>Nombre de la clínica / Consultorio</label><input id="f_ln" value="${document.getElementById('logoText').textContent}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Profesional a cargo</label><input id="f_lprof" value="${document.getElementById('logoProfesional').textContent}" placeholder="Dr. / Dra. Nombre Apellido"></div></div>
  <div class="form-row"><div class="form-group"><label>RUC de la clínica</label><input id="f_lruc" value="${clinicaRUC}" placeholder="1712345678001"></div><div class="form-group"><label>Teléfono</label><input id="f_ltel" value="${clinicaTelefono}" placeholder="02-234-5678"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Dirección</label><input id="f_ldir" value="${clinicaDireccion}" placeholder="Av. Principal 123, Quito"></div></div>

  <div class="form-row form-full"><div class="form-group"><label>Logo del consultorio</label>
    <div class="upload-area" onclick="document.getElementById('logoFileInput').click()">
      ${logoImg?`<img src="${logoImg}" style="height:60px;object-fit:contain;border-radius:6px;margin-bottom:6px"><br>`:''}
      <div style="font-size:12px;color:var(--text2)">Haz clic para subir tu logo (PNG, JPG)</div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">Recomendado: fondo transparente, mínimo 200×200px</div>
    </div>
    <input type="file" id="logoFileInput" accept="image/*" style="display:none" onchange="handleLogoUpload(event)">
    ${logoImg?`<button onclick="clearLogo()" style="margin-top:6px;font-size:11px;color:var(--red);background:none;border:none;cursor:pointer">✕ Quitar logo</button>`:''}
  </div></div>

  <div class="form-row form-full"><div class="form-group"><label>Color de acento</label>
    <div class="color-swatches">${COLS.map(c=>`<div class="cs${c===logoColor?' sel':''}" style="background:${c}" onclick="pickColor('${c}',this)"></div>`).join('')}</div>
  </div></div>

  <div style="border-top:1px solid var(--border);margin:16px 0 12px"></div>
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">💊 Medicamentos en recetas</div>
  <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Estos medicamentos aparecen como sugerencias al crear una receta. Puedes agregar los que más usas en tu práctica.</div>
  <div id="meds-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;margin-bottom:10px;background:var(--bg)">
    ${MEDICAMENTOS_COMUNES.map((m,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)">
        <div style="font-size:13px;flex:1;color:var(--text)">💊 ${m}</div>
        <button onclick="eliminarMed(${i})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>
      </div>`).join('')}
  </div>
  <div style="display:flex;gap:8px">
    <input type="text" id="f_new_med" placeholder="Ej: Ibuprofeno 800mg" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;font-family:inherit" onkeydown="if(event.key==='Enter')agregarMed()">
    <button onclick="agregarMed()" class="btn-primary" style="padding:8px 16px">+ Agregar</button>
  </div>

  <div style="border-top:1px solid var(--border);margin:16px 0 12px"></div>
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">🦷 Catálogo de servicios</div>
  <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Define tus servicios con precio base. Aparecerán como atajo al registrar tratamientos y pagos.</div>
  <div id="svc-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;padding:8px;margin-bottom:10px;background:var(--bg)">
    ${servicios.length===0?`<div style="font-size:12px;color:var(--text3);padding:8px;text-align:center">Sin servicios — agrega el primero abajo</div>`
    :servicios.map((s,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)">
        <div style="flex:1">
          <div style="font-size:13px;color:var(--text);font-weight:500">${esc(s.nombre)}</div>
          <div style="font-size:10px;color:var(--text3)">${esc(s.categoria||'General')}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</div>
        <button onclick="eliminarServicio(${i})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>
      </div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:6px">
    <div class="form-group" style="margin:0"><label>Nombre del servicio</label><input type="text" id="f_svcnombre" placeholder="Obturación resina, Extracción..."></div>
    <div class="form-group" style="margin:0"><label>Precio ($)</label><input type="number" id="f_svcprecio" min="0" step="0.01" placeholder="0.00"></div>
    <div class="form-group" style="margin:0"><label>Categoría</label><select id="f_svccategoria"><option>Prevención</option><option>Operatoria</option><option>Endodoncia</option><option>Cirugía</option><option>Ortodoncia</option><option>Prótesis</option><option>Periodoncia</option><option>Estética</option><option>Radiología</option><option>General</option></select></div>
    <button onclick="agregarServicio()" class="btn-primary" style="padding:8px 14px;margin-bottom:1px">+ Agregar</button>
  </div>
  <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Usa estas variables en el mensaje: <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{nombre}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{fecha}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{hora}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{motivo}</code> <code style="background:var(--bg);padding:2px 6px;border-radius:4px">{clinica}</code></div>
  <div class="form-group">
    <textarea id="f_wamsg" style="min-height:110px;font-size:13px;line-height:1.6">${localStorage.getItem('oa3_wamsg')||getDefaultWAMsg()}</textarea>
  </div>
  <div style="font-size:10px;color:var(--text3);margin-top:4px">💡 Al hacer clic en el botón WhatsApp de cada cita, se abrirá WhatsApp con este mensaje personalizado listo para enviar.</div>

  <div class="modal-footer">
    <button class="btn-primary" style="background:#ef4444;margin-right:auto" onclick="factoryReset()">🗑 Restablecer app</button>
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveLogo()">Guardar configuración</button>
  </div>`);
  document.querySelector('.modal').style.width='560px';
}

function handleLogoUpload(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(ev){
    applyLogoImg(ev.target.result);
    const area=document.querySelector('.upload-area');
    if(area)area.innerHTML=`<img src="${ev.target.result}" style="height:60px;object-fit:contain;border-radius:6px"><br><div style="font-size:12px;color:var(--green);margin-top:6px">✓ Logo cargado correctamente</div>`;
  };
  reader.readAsDataURL(file);
}

function clearLogo(){
  logoImg=null;
  const icon=document.getElementById('logoIcon');
  icon.style.background=logoColor;
  icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C9.2 2 7 4.2 7 7c0 2 1 4 2.2 5.2L10.5 21c.2.8.8 1 1.5 1s1.3-.2 1.5-1l1.3-8.8C16 11 17 9 17 7c0-2.8-2.2-5-5-5z"/></svg>`;
  openLogoEdit();
}

let pendingCol=null;
function pickColor(c,el){pendingCol=c;document.querySelectorAll('.cs').forEach(s=>s.classList.remove('sel'));el.classList.add('sel');}
function saveLogo(){
  const n=v('f_ln').trim(),prof=v('f_lprof').trim();
  if(n)document.getElementById('logoText').textContent=n;
  if(prof)document.getElementById('logoProfesional').textContent=prof;
  clinicaRUC=v('f_lruc');clinicaDireccion=v('f_ldir');clinicaTelefono=v('f_ltel');
  if(pendingCol){applyColor(pendingCol);pendingCol=null;}
  const wamsg=document.getElementById('f_wamsg')?.value?.trim();
  if(wamsg)localStorage.setItem('oa3_wamsg',wamsg);
  save();closeModal();
}

function agregarServicio(){
  const nombre=document.getElementById('f_svcnombre')?.value?.trim();
  const precio=parseMonto(document.getElementById('f_svcprecio')?.value)||0;
  const categoria=document.getElementById('f_svccategoria')?.value||'General';
  if(!nombre){alert('Escribe el nombre del servicio');return;}
  servicios.push({id:uid(),nombre,precio,categoria});
  save();
  // Refresh list in modal
  const list=document.getElementById('svc-list');
  if(list) list.innerHTML=servicios.map((s,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)">
      <div style="flex:1"><div style="font-size:13px;color:var(--text);font-weight:500">${esc(s.nombre)}</div><div style="font-size:10px;color:var(--text3)">${esc(s.categoria)}</div></div>
      <div style="font-size:13px;font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</div>
      <button onclick="eliminarServicio(${i})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>
    </div>`).join('');
  document.getElementById('f_svcnombre').value='';
  document.getElementById('f_svcprecio').value='';
  document.getElementById('f_svcnombre').focus();
}

function eliminarServicio(idx){
  if(!confirm(`¿Eliminar "${servicios[idx]?.nombre}" del catálogo?`))return;
  servicios.splice(idx,1);
  save();
  const list=document.getElementById('svc-list');
  if(list) list.innerHTML=servicios.length===0?`<div style="font-size:12px;color:var(--text3);padding:8px;text-align:center">Sin servicios</div>`
    :servicios.map((s,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)">
        <div style="flex:1"><div style="font-size:13px;color:var(--text);font-weight:500">${esc(s.nombre)}</div><div style="font-size:10px;color:var(--text3)">${esc(s.categoria)}</div></div>
        <div style="font-size:13px;font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</div>
        <button onclick="eliminarServicio(${i})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>
      </div>`).join('');
}

function agregarMed(){
  const input=document.getElementById('f_new_med');
  const nombre=input?.value?.trim();
  if(!nombre){alert('Escribe el nombre del medicamento');return;}
  if(MEDICAMENTOS_COMUNES.includes(nombre)){alert('Este medicamento ya existe en la lista');return;}
  MEDICAMENTOS_COMUNES.push(nombre);
  saveMeds();
  const list=document.getElementById('meds-list');
  if(list){
    const div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)';
    const idx=MEDICAMENTOS_COMUNES.length-1;
    div.innerHTML=`<div style="font-size:13px;flex:1;color:var(--text)">💊 ${nombre}</div>
      <button onclick="eliminarMed(${idx})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>`;
    list.appendChild(div);
    list.scrollTop=list.scrollHeight;
  }
  input.value='';input.focus();
}

function eliminarMed(idx){
  if(!confirm(`¿Eliminar "${MEDICAMENTOS_COMUNES[idx]}" de la lista?`))return;
  MEDICAMENTOS_COMUNES.splice(idx,1);
  saveMeds();
  // Refresh modal medication list
  const list=document.getElementById('meds-list');
  if(list){
    list.innerHTML=MEDICAMENTOS_COMUNES.map((m,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--card);border-radius:7px;margin-bottom:4px;border:1px solid var(--border)">
        <div style="font-size:13px;flex:1;color:var(--text)">💊 ${m}</div>
        <button onclick="eliminarMed(${i})" style="padding:3px 8px;font-size:11px;background:#fee2e2;color:var(--red);border:none;border-radius:5px;cursor:pointer;font-weight:600">✕</button>
      </div>`).join('');
  }
}

// ═══ MODAL / EVENTS ═══
function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modalOverlay').classList.add('show');}
function closeModal(){document.getElementById('modalOverlay').classList.remove('show');factItemCount=0;}
document.addEventListener('click',function(e){if(!e.target.closest('#toothPopup')&&!e.target.closest('path')&&!e.target.closest('.tooth-col'))closeTP();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();closeTP();}});
