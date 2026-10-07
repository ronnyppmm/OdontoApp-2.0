/* ═══ FICHA CLÍNICA — header, pestañas, odontograma, diario, tratamientos, imágenes ═══ */
// ═══ ODONTOGRAMA ═══
const ODO_S=50,ODO_M=3,ODO_ZONES=['top','right','bottom','left','center'];
const ZONE_NAMES={top:'Vestibular',right:'Distal',bottom:'Palatino/Lingual',left:'Mesial',center:'Oclusal'};
// Orientación anatómica correcta por cuadrante (según diagrama oficial):
// Arcada superior: exterior(arriba)=Vestibular · interior(abajo)=Palatino/Lingual
// Arcada inferior: interior(arriba)=Palatino/Lingual · exterior(abajo)=Vestibular
// Hacia la línea media=Mesial · se aleja de la línea media=Distal
function zoneNamesFor(num){
  const q=Math.floor(num/10);
  const superior=(q===1||q===2||q===5||q===6);
  const izq=(q===1||q===4||q===5||q===8); // cuadrantes dibujados a la IZQUIERDA de la línea media
  return{
    top:superior?'Vestibular':'Palatino/Lingual',
    bottom:superior?'Palatino/Lingual':'Vestibular',
    left:izq?'Distal':'Mesial',
    right:izq?'Mesial':'Distal',
    center:'Oclusal'
  };
}
const ODO_GROUPS=[
  {label:'Permanente Superior',teeth:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]},
  {label:'Temporal Superior',teeth:[55,54,53,52,51,61,62,63,64,65]},
  {label:'Temporal Inferior',teeth:[85,84,83,82,81,71,72,73,74,75]},
  {label:'Permanente Inferior',teeth:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]},
];
const ODO_SURF=[{id:'caries',label:'Caries',col:'#E24B4A'},{id:'obturado',label:'Obturado',col:'#185FA5'}];
const ODO_WHOLE=[
  {id:'extraccion',label:'Extracción indicada'},{id:'perd_caries',label:'Pérdida por caries'},
  {id:'perd_otra',label:'Pérdida (otra causa)'},{id:'endo_hacer',label:'Endodoncia por realizar'},
  {id:'endo_hecha',label:'Endodoncia realizada'},{id:'corona_r',label:'Corona por realizar'},
  {id:'corona_h',label:'Corona realizada'},{id:'prot_fija',label:'Prótesis fija'},
  {id:'prot_rem',label:'Prótesis removible'},{id:'prot_tot_r',label:'Prótesis total (por realizar)'},
  {id:'prot_tot_b',label:'Prótesis total (realizada)'},{id:'sell_nec',label:'Sellante necesario'},
  {id:'sell_real',label:'Sellante realizado'},
];

function odoZP(z,s){
  const m=ODO_M,t=s-m,c=s/2;
  if(z==='top') return`M${m},${m}L${t},${m}L${c},${c}Z`;
  if(z==='right') return`M${t},${m}L${t},${t}L${c},${c}Z`;
  if(z==='bottom') return`M${t},${t}L${m},${t}L${c},${c}Z`;
  if(z==='left') return`M${m},${t}L${m},${m}L${c},${c}Z`;
  return`M${c-10},${c-10}L${c+10},${c-10}L${c+10},${c+10}L${c-10},${c+10}Z`;
}

function drawWS(id,s){
  const m=4,t=s-m,c=s/2,R='#E24B4A',B='#185FA5';
  const cross=(col)=>`<line x1="${m}" y1="${m}" x2="${t}" y2="${t}" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/><line x1="${t}" y1="${m}" x2="${m}" y2="${t}" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>`;
  switch(id){
    case'extraccion':return cross(R);
    case'perd_caries':return cross(B);
    case'perd_otra':return`<circle cx="${c}" cy="${c}" r="${c-4}" fill="none" stroke="${R}" stroke-width="2.2"/><line x1="${c-9}" y1="${c-9}" x2="${c+9}" y2="${c+9}" stroke="${R}" stroke-width="2.2" stroke-linecap="round"/><line x1="${c+9}" y1="${c-9}" x2="${c-9}" y2="${c+9}" stroke="${R}" stroke-width="2.2" stroke-linecap="round"/>`;
    case'endo_hacer':return`<polygon points="${c},${m+2} ${t-1},${t-1} ${m+1},${t-1}" fill="none" stroke="${R}" stroke-width="2"/>`;
    case'endo_hecha':return`<polygon points="${c},${m+2} ${t-1},${t-1} ${m+1},${t-1}" fill="none" stroke="${B}" stroke-width="2"/>`;
    case'corona_r':return`<rect x="${m+1}" y="${m+1}" width="${s-m*2-2}" height="${s-m*2-2}" rx="1" fill="none" stroke="${R}" stroke-width="2.5"/>`;
    case'corona_h':return`<rect x="${m+1}" y="${m+1}" width="${s-m*2-2}" height="${s-m*2-2}" rx="1" fill="none" stroke="${B}" stroke-width="2.5"/>`;
    case'prot_fija':return`<rect x="${m+2}" y="${m+2}" width="${s-m*2-4}" height="${s-m*2-4}" rx="1" fill="none" stroke="${B}" stroke-width="2" stroke-dasharray="4,2"/>`;
    case'prot_rem':return`<text x="${c-8}" y="${c+6}" font-size="20" fill="${R}" font-weight="bold">(</text><text x="${c+4}" y="${c+6}" font-size="20" fill="${R}" font-weight="bold">)</text>`;
    case'prot_tot_r':return`<line x1="${m+2}" y1="${c-5}" x2="${t-2}" y2="${c-5}" stroke="${R}" stroke-width="3"/><line x1="${m+2}" y1="${c+5}" x2="${t-2}" y2="${c+5}" stroke="${R}" stroke-width="3"/>`;
    case'prot_tot_b':return`<line x1="${m+2}" y1="${c-5}" x2="${t-2}" y2="${c-5}" stroke="${B}" stroke-width="3"/><line x1="${m+2}" y1="${c+5}" x2="${t-2}" y2="${c+5}" stroke="${B}" stroke-width="3"/>`;
    case'sell_nec':return`<text x="${c}" y="${c+8}" text-anchor="middle" font-size="28" fill="${R}" font-weight="bold">*</text>`;
    case'sell_real':return`<text x="${c}" y="${c+8}" text-anchor="middle" font-size="28" fill="${B}" font-weight="bold">*</text>`;
    default:return'';
  }
}

function buildToothSVG(num,sd,wd){
  const s=ODO_S,m=ODO_M,wo=wd[num];
  let p='';
  for(const z of ODO_ZONES){
    const sid=sd[num+'_'+z];
    let fill='#ffffff';
    if(!wo&&sid==='caries')fill='#E24B4A';
    if(!wo&&sid==='obturado')fill='#185FA5';
    p+=`<path d="${odoZP(z,s)}" fill="${fill}" stroke="#c8ccda" stroke-width="0.7" style="cursor:pointer" onclick="odoClickZone(event,${num},'${z}')"/>`;
  }
  const wov=wo?`<g style="pointer-events:none">${drawWS(wo,s)}</g>`:'';
  return`<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="display:block"><rect width="${s}" height="${s}" rx="3" fill="#fff" stroke="none"/>${p}<rect x="${m}" y="${m}" width="${s-m*2}" height="${s-m*2}" rx="2" fill="none" stroke="#a8adc0" stroke-width="0.9" style="pointer-events:none"/>${wov}</svg>`;
}

function legSVG(item,isSurf){
  const s=28,m=2;
  if(isSurf){
    const col=item.col,ps=ODO_ZONES.map(z=>`<path d="${odoZP(z,s)}" fill="${col}" stroke="rgba(255,255,255,.4)" stroke-width="0.4"/>`).join('');
    return`<svg width="28" height="28" viewBox="0 0 28 28" style="border-radius:4px;border:0.5px solid #e2e8f0;flex-shrink:0">${ps}<rect x="${m}" y="${m}" width="${s-m*2}" height="${s-m*2}" rx="1" fill="none" stroke="#a8adc0" stroke-width="0.6"/></svg>`;
  }
  return`<svg width="28" height="28" viewBox="0 0 28 28" style="border-radius:4px;border:0.5px solid #e2e8f0;flex-shrink:0;background:#fff"><rect x="${m}" y="${m}" width="${s-m*2}" height="${s-m*2}" rx="1" fill="#f8fafc" stroke="#a8adc0" stroke-width="0.6"/>${drawWS(item.id,s)}</svg>`;
}

// Abrir cita desde la barra superior
function openApptFromPt(){
  if(!curPt) return;
  openModal(`<div class="modal-title">📅 Agendar cita para ${esc(curPt.name)}</div>
    <div class="form-row"><div class="form-group"><label>Fecha *</label><input id="f_ad" type="date" value="${today()}"></div><div class="form-group"><label>Hora *</label><input id="f_at" type="time" value="09:00"></div></div>
    <div class="form-row form-full"><div class="form-group"><label>Motivo / Procedimiento</label><input id="f_ar" placeholder="Ej: Restauración, Control..."></div></div>
    <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveApptFromPt()">💾 Agendar</button></div>`);
}

function saveApptFromPt(){
  const date = v('f_ad'), time = v('f_at'), reason = v('f_ar').trim();
  if(!date || !time){ alert('Fecha y hora son obligatorios'); return; }
  curPt.appointments = curPt.appointments || [];
  curPt.appointments.push({id:uid(), date, time, reason, status: 'pendiente', notes: ''});
  save();
  closeModal();
  alert('✅ Cita agendada para ' + curPt.name);
  switchTab('citas');
}

// Abrir pago desde la barra superior
// Abrir receta desde la barra superior
function openRecetaFromPt(){
  if(!curPt){
    alert('No hay paciente seleccionado');
    return;
  }
  
  // Intentar múltiples nombres de función que pueda tener tu app
  if(typeof openReceta === 'function'){
    openReceta();
  } else if(typeof crearReceta === 'function'){
    crearReceta();
  } else if(typeof newReceta === 'function'){
    newReceta();
  } else {
    // Si ninguna existe, cambiar a la pestaña de recetas directamente
    console.log('Abriendo pestaña de recetas directamente...');
    switchTab('recetas');
  }
}

function switchTab(tab,el){
  curTab=tab;
  const tabs=Array.from(document.querySelectorAll('.tab'));
  tabs.forEach(t=>t.classList.remove('active'));
  // varias llamadas (guardar pago, cita o receta) no pasan el elemento: se busca la pestaña por su nombre
  if(!el)el=tabs.find(t=>(t.getAttribute('onclick')||'').indexOf("'"+tab+"'")>-1);
  if(el)el.classList.add('active');
  renderTab();
}

function renderTab(){
  const fns={datos:renderDatos,diario:renderDiario,odontograma:renderOdontograma,tratamientos:renderTratamientos,pagos:renderPagos,citas:renderCitas,imagenes:renderImagenes,consentimientos:renderConsentimientos,recetas:renderRecetas,presupuestos:renderPresupuestos};
  document.getElementById('mainContent').innerHTML=(fns[curTab]||renderDatos)();
}
// ═══ PATIENT TABS ═══
function renderDatos(){
  const p=curPt;
  const cta=resumenCuenta(p),deuda=cta.planPendiente;
  
  return`
  <div class="grid3" style="margin-bottom:14px">
    <div class="kpi"><div class="kpi-label">Tratamientos realizados</div><div class="kpi-val" style="color:var(--accent)">${p.treatments.filter(t=>t.status==='realizado').length}</div></div>
    <div class="kpi"><div class="kpi-label">Pendientes</div><div class="kpi-val" style="color:var(--amber)">${p.treatments.filter(t=>t.status==='pendiente').length}</div></div>
    <div class="kpi"><div class="kpi-label">Saldo pendiente</div><div class="kpi-val" style="color:${deuda>0?'var(--red)':'var(--green)'}">${money(deuda)}</div>${subSaldoHtml(cta)}</div>
  </div>
  
  <div class="card">
    <div class="card-title">Información personal</div>
    <div class="grid2">
      <div><div class="fl">Nombre completo</div><div class="fv">${esc(p.name)}</div></div>
      <div><div class="fl">Cédula / ID</div><div class="fv">${esc(p.cedula)}</div></div>
      <div><div class="fl">Edad</div><div class="fv">${calcAge(p.birthdate)} años</div></div>
      <div><div class="fl">Fecha de nacimiento</div><div class="fv">${fmtDate(p.birthdate)}</div></div>
      <div><div class="fl">Teléfono</div><div class="fv">${esc(p.phone)}</div></div>
      <div><div class="fl">Email</div><div class="fv">${esc(p.email||'—')}</div></div>
    </div>
  </div>
  
  <div class="card">
    <div class="card-title">Historia clínica</div>
    <div style="margin-bottom:12px"><div class="fl">Alergias</div><div class="fv">${esc(p.alergias||'Ninguna')}</div></div>
    <div><div class="fl">Antecedentes médicos</div><div class="fv">${esc(p.antecedentes||'Sin antecedentes')}</div></div>
  </div>`;
}

function renderDiario(){
  const notes=[...(curPt.diary||[])].reverse();
  return`<div class="card">
    <div class="action-row"><div class="card-title" style="margin:0">Diario clínico</div><button class="btn-primary" onclick="openAddDiary()">+ Nueva nota</button></div>
    ${notes.length?notes.map(n=>`<div class="diary-item">
      <div class="diary-date">${fmtDate(n.date)} · ${esc(n.time||'')}${n.doctor?' · '+n.doctor:''}</div>
      <div class="diary-title">${esc(n.title)}</div>
      <div class="diary-body">${esc(n.body)}</div>
      ${n.alert?`<div class="diary-alert">⏰ ${esc(n.alert)}</div>`:''}
      <div style="margin-top:8px;display:flex;gap:6px">
        <button class="btn-sm" style="font-size:11px;padding:4px 10px" onclick="openEditDiary(${n.id})">✏️ Editar</button>
        <button class="del-btn" onclick="delDiary(${n.id})">Eliminar nota</button>
      </div>
    </div>`).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin notas clínicas registradas.</div>`}
  </div>`;
}

function openAddDiary(){
  const now=localDate(new Date());
  const hh=String(now.getHours()).padStart(2,'0');
  const mm=String(now.getMinutes()).padStart(2,'0');
  const profesional=document.getElementById('logoProfesional').textContent;
  openModal(`<div class="modal-title">Nueva nota clínica</div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_dd" type="date" value="${today()}"></div><div class="form-group"><label>Hora</label><input id="f_dt" type="time" value="${hh}:${mm}"></div></div>
  <div class="form-row"><div class="form-group"><label>Título / Procedimiento *</label><input id="f_dtitle" placeholder="Consulta inicial, Extracción..."></div><div class="form-group"><label>Doctor</label><input id="f_ddoc" value="${esc(profesional)}" placeholder="Dr. Nombre"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Descripción clínica *</label><textarea id="f_dbody" placeholder="Describe el procedimiento, observaciones, materiales usados..."></textarea></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Alerta de seguimiento</label><input id="f_dalert" placeholder="Ej: Llamar para control en 7 días"></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveDiary()">Guardar nota</button></div>`);
}
function saveDiary(){
  const title=v('f_dtitle').trim(),body=v('f_dbody').trim();if(!title||!body){alert('Completa título y descripción');return;}
  if(!curPt.diary)curPt.diary=[];
  curPt.diary.push({id:uid(),date:v('f_dd'),time:v('f_dt'),doctor:v('f_ddoc'),title,body,alert:v('f_dalert')});
  save();closeModal();renderTab();
}

function openEditDiary(id){
  const n=curPt.diary.find(x=>x.id===id);if(!n)return;
  openModal(`<div class="modal-title">✏️ Editar nota clínica</div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_dd" type="date" value="${esc(n.date)}"></div><div class="form-group"><label>Hora</label><input id="f_dt" type="time" value="${esc(n.time||'')}"></div></div>
  <div class="form-row"><div class="form-group"><label>Título / Procedimiento *</label><input id="f_dtitle" value="${esc(n.title)}"></div><div class="form-group"><label>Doctor</label><input id="f_ddoc" value="${esc(n.doctor||'')}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Descripción clínica *</label><textarea id="f_dbody" style="min-height:100px">${esc(n.body)}</textarea></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Alerta de seguimiento</label><input id="f_dalert" value="${esc(n.alert||'')}"></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveEditDiary(${id})">Guardar cambios</button></div>`);
}

function saveEditDiary(id){
  const n=curPt.diary.find(x=>x.id===id);if(!n)return;
  const title=v('f_dtitle').trim(),body=v('f_dbody').trim();
  if(!title||!body){alert('Completa título y descripción');return;}
  n.date=v('f_dd');n.time=v('f_dt');n.doctor=v('f_ddoc');n.title=title;n.body=body;n.alert=v('f_dalert');
  n.editado=new Date().toISOString();
  save();closeModal();renderTab();
}

function delDiary(id){if(!confirm('¿Eliminar esta nota?'))return;curPt.diary=curPt.diary.filter(n=>n.id!==id);save();renderTab();}

function renderOdontograma(){
  const p=curPt;
  if(!p.odoHistory)p.odoHistory=[];
  const groups=ODO_GROUPS.map(g=>`<div class="odo-sec-lbl">${g.label}</div><div class="odo-sec-card"><div class="teeth-row">${g.teeth.map(n=>`<div class="tooth-col"><div class="tooth-num">${n}</div>${buildToothSVG(n,p.surfData,p.wholeData)}</div>`).join('')}</div></div>`).join('');
  const legend=`<div class="odo-legend">
    <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Simbología oficial</div>
    <div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:6px">Por superficie</div>
    <div class="odo-legend-grid">${ODO_SURF.map(c=>`<div class="leg-item">${legSVG(c,true)}<span>${c.label}</span></div>`).join('')}</div>
    <div style="font-size:10px;color:var(--text3);font-weight:600;margin:8px 0 6px;padding-top:8px;border-top:1px solid var(--border)">Diente completo</div>
    <div class="odo-legend-grid">${ODO_WHOLE.map(c=>`<div class="leg-item">${legSVG(c,false)}<span>${c.label}</span></div>`).join('')}</div>
  </div>`;

  // Save snapshot button
  const saveBtn=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div style="font-size:13px;color:var(--text2)">Registra un snapshot del estado actual para llevar historial de la evolución del paciente.</div>
    <button class="btn-primary" onclick="saveOdoSnapshot()" style="flex-shrink:0;margin-left:14px">📸 Guardar estado actual</button>
  </div>`;

  // History section
  const histHtml=p.odoHistory.length===0?`<div class="card"><div class="card-title">Historial del odontograma</div><div style="font-size:13px;color:var(--text3);padding:8px 0">Sin snapshots guardados. Haz clic en "Guardar estado actual" para registrar el estado inicial del paciente.</div></div>`:`
  <div class="card">
    <div class="action-row"><div class="card-title" style="margin:0">Historial del odontograma (${p.odoHistory.length} registros)</div></div>
    ${[...p.odoHistory].reverse().map(snap=>`
      <div data-snapid="${snap.id}" style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--text)">${esc(snap.label)}</div>
            <div style="font-size:11px;color:var(--text3)">${fmtDate(snap.fecha)}${snap.hora?' · '+esc(snap.hora):''}${snap.notas?' · '+esc(snap.notas):''}</div>
          </div>
          <button class="btn-sm" style="font-size:11px;padding:4px 12px" onclick="abrirOdoSnapshot(${snap.id})">🔍 Ver completo</button>
          <button class="del-btn" onclick="delOdoSnapshot(${snap.id})">✕</button>
        </div>
        <div style="overflow-x:auto;padding-bottom:4px">
          ${ODO_GROUPS.map(g=>`
            <div style="font-size:8px;font-weight:600;color:var(--text3);text-align:center;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px">${g.label}</div>
            <div style="display:flex;justify-content:center;gap:3px;margin-bottom:8px">
              ${g.teeth.map(n=>`
                <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
                  <span style="font-size:7px;color:#4338ca;font-weight:600">${n}</span>
                  ${buildToothSVGSmall(n,snap.surfData,snap.wholeData)}
                </div>`).join('')}
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;

  return saveBtn+groups+legend+histHtml;
}

function odoClickZone(e,tooth,zone){
  e.stopPropagation();selOdoTooth=tooth;selOdoZone=zone;
  document.getElementById('tpTitle').textContent=`Diente ${tooth} — ${zoneNamesFor(tooth)[zone]}`;
  const curS=curPt.surfData[tooth+'_'+zone],curW=curPt.wholeData[tooth];
  document.getElementById('tpOpts').innerHTML=`
    <div class="tp-section">Por superficie</div>
    ${ODO_SURF.map(c=>`<div class="tp-opt${curS===c.id?' active':''}" onclick="odoSetSurf('${c.id}')">${legSVG(c,true)} ${c.label}</div>`).join('')}
    <div class="tp-section">Diente completo</div>
    ${ODO_WHOLE.map(c=>`<div class="tp-opt${curW===c.id?' active':''}" onclick="odoSetWhole('${c.id}')">${legSVG(c,false)} ${c.label}</div>`).join('')}`;
  const popup=document.getElementById('toothPopup');
  popup.classList.add('show'); // show first so we can measure height
  const popupH=popup.offsetHeight||340;
  const popupW=popup.offsetWidth||215;
  const rect=e.target.closest('svg').getBoundingClientRect();
  const spaceBelow=window.innerHeight-rect.bottom;
  const spaceAbove=rect.top;
  // Position horizontally — prefer right of tooth, fallback left
  let left=rect.right+8;
  if(left+popupW>window.innerWidth-8) left=rect.left-popupW-8;
  if(left<8) left=8;
  // Position vertically — appear above if not enough space below
  let top;
  if(spaceBelow>=popupH+16){
    top=rect.top-10; // enough room below → align with tooth top
  } else if(spaceAbove>=popupH+16){
    top=rect.bottom-popupH+10; // not enough below → align bottom of popup with tooth bottom
  } else {
    // Neither side has enough room → center in viewport
    top=Math.max(8,(window.innerHeight-popupH)/2);
  }
  top=Math.max(8,Math.min(top,window.innerHeight-popupH-8));
  popup.style.left=left+'px';
  popup.style.top=top+'px';
}
function odoSetSurf(id){
  const tooth=selOdoTooth,zone=selOdoZone;
  delete curPt.wholeData[tooth];
  const key=tooth+'_'+zone;
  const quitando=curPt.surfData[key]===id;
  if(quitando)delete curPt.surfData[key];else curPt.surfData[key]=id;
  save();closeTP();renderTab();
  if(!quitando&&id==='caries')setTimeout(()=>sugerirTxDesdeCaries(tooth,zone),250);
}
function odoSetWhole(id){
  const tooth=selOdoTooth;
  ODO_ZONES.forEach(z=>delete curPt.surfData[tooth+'_'+z]);
  const quitando=curPt.wholeData[tooth]===id;
  if(quitando)delete curPt.wholeData[tooth];else curPt.wholeData[tooth]=id;
  save();closeTP();renderTab();
  if(!quitando&&typeof ODO_TX_MAP!=='undefined'&&ODO_TX_MAP[id])setTimeout(()=>sugerirTxDesdeOdonto(tooth,id),250);
}
function clearTooth(){ODO_ZONES.forEach(z=>delete curPt.surfData[selOdoTooth+'_'+z]);delete curPt.wholeData[selOdoTooth];save();closeTP();renderTab();}
function closeTP(){document.getElementById('toothPopup').classList.remove('show')}

function saveOdoSnapshot(){
  openModal(`<div class="modal-title">📸 Guardar estado del odontograma</div>
  <div class="form-row form-full"><div class="form-group"><label>Etiqueta *</label>
    <input id="f_snaplbl" placeholder="Ej: Estado inicial, Post extracción, Sesión 2..." value="${curPt.odoHistory&&curPt.odoHistory.length===0?'Estado inicial':'Sesión '+(((curPt.odoHistory||[]).length)+1)}">
  </div></div>
  <div class="form-row"><div class="form-group"><label>Fecha</label>
    <input id="f_snapfecha" type="date" value="${today()}">
  </div><div class="form-group"><label>Hora</label>
    <input id="f_snaphora" type="time" value="${new Date().toTimeString().slice(0,5)}">
  </div></div>
  <div class="form-row form-full"><div class="form-group"><label>Notas de la sesión</label>
    <input id="f_snapnotas" placeholder="Ej: Consulta inicial, tratamiento de conducto diente 36...">
  </div></div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="confirmSaveSnapshot()">💾 Guardar snapshot</button>
  </div>`);
}

function confirmSaveSnapshot(){
  const label=v('f_snaplbl').trim();
  if(!label){alert('Escribe una etiqueta para identificar este estado');return;}
  if(!curPt.odoHistory)curPt.odoHistory=[];
  curPt.odoHistory.push({
    id:uid(),
    label,
    fecha:v('f_snapfecha'),
    hora:v('f_snaphora'),
    notas:v('f_snapnotas'),
    surfData:JSON.parse(JSON.stringify(curPt.surfData||{})),
    wholeData:JSON.parse(JSON.stringify(curPt.wholeData||{}))
  });
  save();closeModal();renderTab();
}

function delOdoSnapshot(id){
  if(!confirm('¿Eliminar este registro del historial?'))return;
  curPt.odoHistory=curPt.odoHistory.filter(x=>x.id!==id);
  save();renderTab();
}

function buildToothSVGSmall(n,surfData,wholeData){
  // Reuse the full buildToothSVG but at 28px size
  const S=28,M=2,wo=wholeData[n];
  let p='';
  for(const z of ODO_ZONES){
    const sid=surfData[n+'_'+z];
    let fill='#ffffff';
    if(!wo&&sid==='caries')fill='#E24B4A';
    if(!wo&&sid==='obturado')fill='#185FA5';
    // Compute zone path at size S
    const t=S-M,c=S/2;
    let d='';
    if(z==='top')    d=`M${M},${M}L${t},${M}L${c},${c}Z`;
    else if(z==='right')  d=`M${t},${M}L${t},${t}L${c},${c}Z`;
    else if(z==='bottom') d=`M${t},${t}L${M},${t}L${c},${c}Z`;
    else if(z==='left')   d=`M${M},${t}L${M},${M}L${c},${c}Z`;
    else d=`M${c-7},${c-7}L${c+7},${c-7}L${c+7},${c+7}L${c-7},${c+7}Z`;
    p+=`<path d="${d}" fill="${fill}" stroke="#c8ccda" stroke-width="0.5"/>`;
  }
  const wov=wo?`<g style="pointer-events:none">${drawWS(wo,S)}</g>`:'';
  return`<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" style="display:block"><rect width="${S}" height="${S}" rx="2" fill="#fff"/>${p}<rect x="${M}" y="${M}" width="${S-M*2}" height="${S-M*2}" rx="1" fill="none" stroke="#a8adc0" stroke-width="0.7" style="pointer-events:none"/>${wov}</svg>`;
}

// Store current snapshot being viewed for the modal
let _snapViewId=null;

function abrirOdoSnapshot(snapId){
  const snap=curPt.odoHistory.find(x=>x.id===snapId);
  if(!snap)return;
  _snapViewId=snapId;

  const groups=ODO_GROUPS.map(g=>`
    <div style="font-size:9px;font-weight:700;color:#64748b;text-align:center;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${g.label}</div>
    <div style="display:flex;justify-content:center;gap:4px;margin-bottom:12px;flex-wrap:wrap">
      ${g.teeth.map(n=>`
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
          <span style="font-size:9px;font-weight:600;color:#4338ca">${n}</span>
          ${buildToothSVG(n,snap.surfData,snap.wholeData)}
        </div>`).join('')}
    </div>`).join('');

  const legendHtml=`
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
      ${ODO_SURF.map(c=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text2)">${legSVG(c,true)}<span>${c.label}</span></div>`).join('')}
      ${ODO_WHOLE.slice(0,8).map(c=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text2)">${legSVG(c,false)}<span>${c.label}</span></div>`).join('')}
    </div>`;

  openModal(`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div>
        <div class="modal-title" style="margin:0">🦷 ${esc(snap.label)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">
          Paciente: <strong>${esc(curPt.name)}</strong> · ${fmtDate(snap.fecha)}${snap.hora?' · '+esc(snap.hora):''}${snap.notas?' · '+esc(snap.notas):''}
        </div>
      </div>
      <button onclick="imprimirOdoSnapshot(${snapId})" class="btn-primary" style="flex-shrink:0;padding:7px 14px;font-size:12px">🖨️ Imprimir</button>
    </div>
    <div id="odo-snap-print" style="overflow-x:auto">${groups}</div>
    ${legendHtml}
    <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>`);
  document.querySelector('.modal').style.width='740px';
}

function imprimirOdoSnapshot(snapId){
  const snap=curPt.odoHistory.find(x=>x.id===snapId);
  if(!snap)return;

  const clinicaNombre=document.getElementById('logoText').textContent;
  const area=document.getElementById('odo-snap-print');
  if(!area)return;

  const w=safeOpen('','_blank','width=900,height=700');

  const cierreBody='</bo'+'dy></html>';

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Odontograma — ${esc(snap.label)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;padding:24px;color:#0f172a}
    h2{font-size:18px;font-weight:700;margin-bottom:4px}
    .sub{font-size:12px;color:#64748b;margin-bottom:20px}
    @media print{body{padding:10px}}
  </style></head><body>
  <h2>${esc(clinicaNombre)} — Odontograma: ${esc(snap.label)}</h2>
  <div class="sub">Paciente: ${esc(curPt.name)} · ${fmtDate(snap.fecha)}${snap.hora?' · '+esc(snap.hora):''}${snap.notas?' · '+esc(snap.notas):''}</div>
  ${area.innerHTML}
  ${cierreBody}`);

  w.document.close();
  setTimeout(()=>{w.print();},500);
}

function renderTratamientos(){
  const p=curPt,pend=p.treatments.filter(t=>t.status==='pendiente'),done=p.treatments.filter(t=>t.status==='realizado');
  return`<div class="card">
  <div class="action-row"><div class="card-title" style="margin:0">Pendientes</div><button class="btn-primary" onclick="openAddTx()">+ Agregar</button></div>
  ${pend.length?pend.map(t=>`<div class="row-item"><div class="row-dot" style="background:var(--amber)"></div><div style="flex:1"><div class="row-name">${esc(t.name)}${badgeOdo(t)}</div><div class="row-meta">Diente ${esc(t.tooth)} · ${fmtDate(t.date)}${superficiesTx(t)}</div></div><div class="row-price">${money(t.cost)}</div><button class="done-btn" onclick="markDone(${t.id})">✓ Realizado</button><button class="del-btn" style="margin-left:6px" onclick="delTx(${t.id})">✕</button></div>`).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin tratamientos pendientes</div>`}
  </div>
  <div class="card"><div class="card-title">Realizados</div>
  ${done.length?done.map(t=>`<div class="row-item"><div class="row-dot" style="background:var(--green)"></div><div style="flex:1"><div class="row-name">${esc(t.name)}${badgeOdo(t)}</div><div class="row-meta">Diente ${esc(t.tooth)} · ${fmtDate(t.date)}${superficiesTx(t)}</div></div><div class="row-price">${money(t.cost)}</div><span class="badge badge-green">Realizado</span><button class="del-btn" style="margin-left:8px" onclick="delTx(${t.id})">✕</button></div>`).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin tratamientos registrados</div>`}
  </div>`;
}
function markDone(id){
  const t=curPt.treatments.find(x=>x.id===id);
  if(!t)return;
  t.status='realizado';
  save();renderTab();
  try{evolucionarAutoOdo(t);}catch(e){console.error('Error evolución:',e);}
}
function delTx(id){
  if(!confirm('¿Eliminar?'))return;
  const t=curPt.treatments.find(x=>x.id===id);
  try{
    if(t&&t.autoOdo){
      const desc=describirAutoOdo(t.autoOdo);
      if(desc&&confirm('Este tratamiento marcó automáticamente el odontograma:\n\n'+desc+'\n\n¿Quitar también esas marcas?\n(Aceptar = quitar · Cancelar = conservar)'))limpiarAutoOdo(t.autoOdo);
    }
  }catch(e){console.error(e);}
  curPt.treatments=curPt.treatments.filter(x=>x.id!==id);
  save();renderTab();
}
function openAddTx(){
  const svcHtml=servicios.length?`
  <div style="margin-bottom:12px">
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">⚡ Seleccionar del catálogo</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px">
  ${servicios.map(s=>`<button onclick="seleccionarServicioTx('${jsq(s.nombre)}',${s.precio})" style="padding:6px 12px;border:1px solid var(--border);border-radius:20px;background:var(--bg);font-size:12px;cursor:pointer;color:var(--text);transition:all .15s" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text)'">${esc(s.nombre)} <span style="font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</span></button>`).join('')}
  </div>
  <div style="border-top:1px solid var(--border);margin:12px 0 10px"></div>
  </div>`:'';
  openModal(`<div class="modal-title">Agregar tratamiento</div>
  ${svcHtml}
  <div class="form-row form-full"><div class="form-group"><label>Tratamiento *</label><input id="f_txn" placeholder="Obturación resina, Extracción, Endodoncia, Corona..." oninput="previewAutoTx()"></div></div>
  <div id="tx-auto-preview" style="font-size:11px;background:var(--bg);border:1px dashed var(--border);border-radius:8px;padding:8px 10px;margin-bottom:12px;color:var(--text3);line-height:1.6">💡 Escribe el nombre del tratamiento para ver su vínculo con el odontograma.</div>
  <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:4px">🦷 Diente(s) — haz clic para seleccionar</div>
  <div id="tx-dientes-picker" style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;max-height:200px;overflow-y:auto;overflow-x:auto">${renderDientesPickerHtml('')}</div>
  <div class="form-row"><div class="form-group"><label>Seleccionados / escribir manual</label><input id="f_txt" placeholder="36, 37 o General" oninput="refreshDientesPicker()"></div><div class="form-group"><label>Fecha</label><input id="f_txd" type="date" value="${today()}"></div></div>
  <div class="form-row"><div class="form-group"><label>Costo ($)</label><input id="f_txc" type="number" min="0" step="0.01"></div><div class="form-group"><label>Estado</label><select id="f_txs"><option value="pendiente">Pendiente</option><option value="realizado">Realizado</option></select></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveTx()">Guardar</button></div>`);
  document.querySelector('.modal').style.width='620px';
}

function seleccionarServicioTx(nombre,precio){
  const n=document.getElementById('f_txn');
  const c=document.getElementById('f_txc');
  if(n)n.value=nombre;
  if(c)c.value=precio.toFixed(2);
  n?.focus();
}
function saveTx(){
  const name=v('f_txn').trim();
  if(!name){alert('Escribe el nombre del tratamiento');return;}
  const tx={id:uid(),name,tooth:v('f_txt').trim()||'General',date:v('f_txd'),cost:parseMonto(v('f_txc'))||0,status:v('f_txs')};
  curPt.treatments.push(tx);
  save();closeModal();renderTab();
  try{autoMarcarTx(tx);}catch(e){console.error('Error auto-marcado:',e);}
}

function renderImagenes(){
  const p=curPt;
  if(!p.images)p.images=[];
  const cats=['Radiografía periapical','Radiografía panorámica','Radiografía bitewing','Fotografía clínica','Fotografía extraoral','Fotografía intraoral','Otro'];
  return`
<div class="card" style="position:relative" ondragover="imgDragOver(event)" ondragleave="imgDragLeave(event)" ondrop="imgDrop(event)">
<div id="img-dropzone" style="display:none;position:absolute;inset:0;z-index:50;background:rgba(14,165,233,.12);border:3px dashed var(--accent);border-radius:14px;align-items:center;justify-content:center;flex-direction:column;gap:8px;pointer-events:none">
<div style="font-size:34px">📥</div>
<div style="font-size:14px;font-weight:700;color:var(--accent)">Suelta las imágenes aquí</div>
<div style="font-size:11px;color:var(--text2)">Se guardan en su calidad original, sin límite de peso</div>
</div>
<div class="action-row">
<div class="card-title" style="margin:0">Imágenes del paciente</div>
      <div style="display:flex;gap:8px">
        <label style="padding:7px 16px;background:var(--accent);color:#fff;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">
          📷 Subir imágenes
          <input type="file" accept="image/*" multiple style="display:none" onchange="handleImgUpload(event)">
        </label>
      </div>
    </div>
    ${p.images.length===0?`
      <div style="text-align:center;padding:40px 20px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">🦷📷</div>
        <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin imágenes registradas</div>
        <div style="font-size:12px">Sube radiografías o fotografías clínicas del paciente</div>
      </div>`:
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:4px">
      ${p.images.map(img=>`
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;position:relative">
          <img src="${img.data}" alt="${esc(img.name)}" style="width:100%;height:150px;object-fit:cover;display:block;cursor:pointer" onclick="viewImg(${img.id})">
          <div style="padding:10px">
            <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px">${esc(img.name)}</div>
            <div style="font-size:10px;color:var(--text3)">${img.tipo||'Imagen'} · ${fmtDate(img.fecha)}${img.size?' · '+img.size:''}</div>
            ${img.notas?`<div style="font-size:11px;color:var(--text2);margin-top:4px">${esc(img.notas)}</div>`:''}
          </div>
          <button onclick="delImg(${img.id})" style="position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(0,0,0,.5);border:none;border-radius:50%;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>`).join('')}
    </div>`}
  </div>
  <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px">💡</div>
    <div style="font-size:12px;color:#1e40af">Arrastra y suelta radiografías o fotografías directamente sobre esta tarjeta, o usa el botón 📷. Los archivos se guardan en su calidad original en tu computadora (IndexedDB), sin límite de peso.</div>
  </div>`;
}
function processImageFiles(files){
const list=Array.from(files||[]);
if(!list.length)return;
if(!curPt.images)curPt.images=[];
let pending=list.length,errors=0;
const done=()=>{pending--;if(pending===0){renderTab();}};
list.forEach(file=>{
if(!file.type.startsWith('image/')){errors++;done();if(pending===0)alert('Algunos archivos no son imágenes válidas.');return;}
const reader=new FileReader();
reader.onload=function(ev){
const img=new Image();
img.onload=function(){
// Miniatura pequeña para la cuadrícula (carga rápida)
const T=400;let w=img.width,h=img.height;
if(w>T||h>T){if(w>h){h=Math.round(h*(T/w));w=T;}else{w=Math.round(w*(T/h));h=T;}}
const c=document.createElement('canvas');c.width=w;c.height=h;
c.getContext('2d').drawImage(img,0,0,w,h);
const thumb=c.toDataURL('image/jpeg',0.8);
const id=uid();
const rec={id,name:file.name.replace(/\.[^.]+$/,''),tipo:'Radiografía periapical',fecha:today(),data:thumb,notas:'',size:fmtBytes(file.size),full:true};
curPt.images.push(rec);
// Original (pesado) → IndexedDB, sin límite de tamaño
imgDbPut(id,file).then(()=>{try{save();}catch(e){}done();}).catch(()=>{
rec.full=false; // sin IndexedDB: solo miniatura
try{save();}catch(e){}
done();
});
};
img.onerror=function(){errors++;done();};
img.src=ev.target.result;
};
reader.onerror=function(){errors++;done();};
reader.readAsDataURL(file);
});
}
function handleImgUpload(e){processImageFiles(e.target.files);e.target.value='';}
// ── Arrastrar y soltar ──
function imgDragOver(e){e.preventDefault();e.stopPropagation();const dz=document.getElementById('img-dropzone');if(dz)dz.style.display='flex';}
function imgDragLeave(e){e.preventDefault();e.stopPropagation();const dz=document.getElementById('img-dropzone');if(dz)dz.style.display='none';}
function imgDrop(e){e.preventDefault();e.stopPropagation();const dz=document.getElementById('img-dropzone');if(dz)dz.style.display='none';processImageFiles(e.dataTransfer.files);}

function viewImg(id){
const img=curPt.images.find(x=>x.id===id);if(!img)return;
const cats=['Radiografía periapical','Radiografía panorámica','Radiografía bitewing','Fotografía clínica','Fotografía extraoral','Fotografía intraoral','Otro'];
openModal(`<div class="modal-title">Imagen — ${esc(img.name)}</div>
<img id="fullimg-${id}" src="${img.data}" style="width:100%;max-height:360px;object-fit:contain;border-radius:10px;background:#0f172a;margin-bottom:14px">
${img.full?`<div style="font-size:10px;color:var(--text3);margin:-8px 0 10px">🔍 Calidad original · ${img.size||''}</div>`:''}
<div class="form-row"><div class="form-group"><label>Nombre</label><input id="f_iname" value="${esc(img.name)}"></div><div class="form-group"><label>Tipo</label><select id="f_itipo">${cats.map(c=>`<option${c===img.tipo?' selected':''}>${c}</option>`).join('')}</select></div></div>
<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ifecha" type="date" value="${esc(img.fecha)}"></div><div class="form-group"><label>Notas</label><input id="f_inotas" value="${esc(img.notas||'')}"></div></div>
<div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button><button class="btn-primary" onclick="saveImgEdit(${id})">Guardar cambios</button></div>`);
document.querySelector('.modal').style.width='640px';
if(img.full){
imgDbGet(id).then(blob=>{
if(blob){
const url=URL.createObjectURL(blob);
const el=document.getElementById('fullimg-'+id);
if(el)el.src=url;
}
}).catch(()=>{});
}
}

function saveImgEdit(id){
  const img=curPt.images.find(x=>x.id===id);if(!img)return;
  img.name=v('f_iname');img.tipo=v('f_itipo');img.fecha=v('f_ifecha');img.notas=v('f_inotas');
  save();closeModal();renderTab();
}

function delImg(id){
if(!confirm('¿Eliminar esta imagen?'))return;
curPt.images=curPt.images.filter(x=>x.id!==id);
imgDbDel(id).catch(()=>{});
save();renderTab();
}

// ═══ MOTOR TRATAMIENTO ↔ ODONTOGRAMA v2 ═══
let _txSupActivo=null;

const TX_ODO_MAP=[
  {re:/extracci|exodoncia/i,tipo:'whole',pend:'extraccion',done:'perd_caries',etiqueta:'Extracción'},
  {re:/endodoncia|conducto/i,tipo:'whole',pend:'endo_hacer',done:'endo_hecha',etiqueta:'Endodoncia'},
  {re:/corona|funda/i,tipo:'whole',pend:'corona_r',done:'corona_h',etiqueta:'Corona'},
  {re:/sellante|sellado/i,tipo:'whole',pend:'sell_nec',done:'sell_real',etiqueta:'Sellante'},
  {re:/pr[oó]tesis\s+(total|completa)/i,tipo:'whole',pend:'prot_tot_r',done:'prot_tot_b',etiqueta:'Prótesis total'},
  {re:/puente|pr[oó]tesis\s+fija/i,tipo:'whole',pend:null,done:'prot_fija',etiqueta:'Prótesis fija'},
  {re:/pr[oó]tesis\s+removible|parcial/i,tipo:'whole',pend:null,done:'prot_rem',etiqueta:'Prótesis removible'},
  {re:/obturaci|resina|amalgama|restauraci|empaste|calza/i,tipo:'surface',superficie:'obturado',etiqueta:'Obturación'},
  {re:/implante|ortodoncia|brackets|alineador|limpieza|profilaxis|detartraje|fl[uú]or|blanqueamiento|control|consulta|revisi[oó]n|anestesia|radiograf/i,tipo:'none'}
];
const ODO_TX_MAP={
  extraccion:{name:'Extracción dental',status:'pendiente'},
  perd_caries:{name:'Extracción dental',status:'realizado'},
  perd_otra:{name:'Extracción dental',status:'realizado'},
  endo_hacer:{name:'Endodoncia',status:'pendiente'},
  endo_hecha:{name:'Endodoncia',status:'realizado'},
  corona_r:{name:'Corona',status:'pendiente'},
  corona_h:{name:'Corona',status:'realizado'},
  sell_nec:{name:'Sellante',status:'pendiente'},
  sell_real:{name:'Sellante',status:'realizado'},
  prot_fija:{name:'Prótesis fija',status:'realizado'},
  prot_rem:{name:'Prótesis removible',status:'realizado'},
  prot_tot_r:{name:'Prótesis total',status:'pendiente'},
  prot_tot_b:{name:'Prótesis total',status:'realizado'}
};
function detectarTipoTx(nombre){
  if(!nombre)return null;
  for(const r of TX_ODO_MAP){if(r.re.test(nombre))return r;}
  return null;
}
function parseDientesTx(str){
  if(!str)return[];
  const validos=new Set(ODO_GROUPS.flatMap(g=>g.teeth));
  const nums=[];
  String(str).split(/[,;]+/).forEach(part=>{
    part=part.trim();
    const rango=part.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
    if(rango){let a=parseInt(rango[1]),b=parseInt(rango[2]);if(a>b){const tmp=a;a=b;b=tmp;}for(let i=a;i<=b;i++)nums.push(i);}
    else if(/^\d{1,2}$/.test(part))nums.push(parseInt(part));
  });
  return[...new Set(nums)].filter(n=>validos.has(n));
}
function renderDientesPickerHtml(val){
  const sel=parseDientesTx(val||'');
  return ODO_GROUPS.map(g=>`
  <div style="margin-bottom:8px">
    <div style="font-size:8px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;text-align:center">${g.label}</div>
    <div style="display:flex;flex-wrap:nowrap;gap:3px;justify-content:center">
    ${g.teeth.map(n=>{
      const on=sel.includes(n);
      return`<button type="button" onclick="toggleDienteTx(${n})" style="width:28px;height:24px;font-size:10px;font-weight:${on?'700':'500'};border-radius:6px;cursor:pointer;border:1px solid ${on?'var(--accent)':'var(--border)'};background:${on?'var(--accent)':'var(--card)'};color:${on?'#fff':'var(--text2)'};font-family:inherit;padding:0;flex-shrink:0">${n}</button>`;
    }).join('')}
    </div>
  </div>`).join('');
}
function refreshDientesPicker(){
  const box=document.getElementById('tx-dientes-picker');
  if(box)box.innerHTML=renderDientesPickerHtml(v('f_txt'));
}
function toggleDienteTx(n){
  const sel=parseDientesTx(v('f_txt'));
  const i=sel.indexOf(n);
  if(i>=0)sel.splice(i,1);else sel.push(n);
  sel.sort((a,b)=>a-b);
  const inp=document.getElementById('f_txt');
  if(inp)inp.value=sel.join(', ');
  refreshDientesPicker();
}
function previewAutoTx(){
  const el=document.getElementById('tx-auto-preview');
  if(!el)return;
  const nombre=v('f_txn').trim();
  if(!nombre){el.innerHTML='💡 Escribe el nombre del tratamiento para ver su vínculo con el odontograma.';return;}
  const det=detectarTipoTx(nombre);
  if(!det||det.tipo==='none'){el.innerHTML='ℹ️ Este tratamiento <b>no se vincula</b> automáticamente al odontograma (se registrará igual).';return;}
  if(det.tipo==='surface'){el.innerHTML=`🦷 <b>Vínculo automático — ${det.etiqueta}:</b> al marcarlo ✓ Realizado seleccionarás las superficies (Vestibular, Distal, Palatino/Lingual, Mesial, Oclusal) y se pintarán de azul (Obturado).`;return;}
  const pend=det.pend?ODO_WHOLE.find(w=>w.id===det.pend):null;
  const done=det.done?ODO_WHOLE.find(w=>w.id===det.done):null;
  el.innerHTML=`🦷 <b>Vínculo automático — ${det.etiqueta}</b><br>
  <span style="display:inline-flex;align-items:center;gap:5px;margin-top:4px">Pendiente: ${pend?legSVG(pend,false)+' '+pend.label:'—'}</span><br>
  <span style="display:inline-flex;align-items:center;gap:5px;margin-top:2px">Realizado: ${done?legSVG(done,false)+' '+done.label:'—'}</span>`;
}
function badgeOdo(t){
  if(!t.autoOdo)return'';
  let lbl='🦷 Vinculado';
  if(t.autoOdo.tipo==='whole'){
    const sid=t.status==='realizado'?(t.autoOdo.simboloDone||t.autoOdo.simboloPend):(t.autoOdo.simboloPend||t.autoOdo.simboloDone);
    const w=ODO_WHOLE.find(x=>x.id===sid);
    if(w)lbl='🦷 '+w.label;
  }else lbl='🦷 Superficies (al realizar)';
  return`<span title="Vinculado al odontograma" style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;margin-left:6px;white-space:nowrap">${lbl}</span>`;
}
function superficiesTx(t){
  const a=t.autoOdo;
  if(!a||a.tipo!=='surface')return'';
  const zs=a.zonas||{};
  const keys=Object.keys(zs);
  const corto={'Vestibular':'V','Distal':'D','Palatino/Lingual':'P/L','Mesial':'M','Oclusal':'O'};
  const nom=(n,z)=>{
    const full=(typeof zoneNamesFor==='function')?zoneNamesFor(parseInt(n))[z]:(ZONE_NAMES[z]||z);
    return corto[full]||full;
  };
  if(!keys.length)return' · ⬜ superficies por seleccionar';
  return' · 🔵 '+keys.map(n=>`${n}: ${zs[n].map(z=>nom(n,z)).join('-')}`).join(' · ');
}
function aplicarWholeAuto(dientes,simbolo){
  const conflictos=[];
  dientes.forEach(n=>{
    const w=curPt.wholeData[n];
    const tieneSup=ODO_ZONES.some(z=>curPt.surfData[n+'_'+z]);
    if(w&&w!==simbolo)conflictos.push(`Diente ${n}: ya tiene "${ODO_WHOLE.find(x=>x.id===w)?.label||w}"`);
    else if(!w&&tieneSup)conflictos.push(`Diente ${n}: tiene superficies marcadas (se limpiarán)`);
  });
  if(conflictos.length&&!confirm('⚠️ Marcas previas en el odontograma:\n\n• '+conflictos.join('\n• ')+'\n\n¿Sobrescribir con el nuevo símbolo?'))return false;
  dientes.forEach(n=>{
    ODO_ZONES.forEach(z=>delete curPt.surfData[n+'_'+z]);
    curPt.wholeData[n]=simbolo;
  });
  return true;
}
function autoMarcarTx(tx){
  const det=detectarTipoTx(tx.name);
  if(!det||det.tipo==='none')return;
  const dientes=parseDientesTx(tx.tooth);
  if(!dientes.length)return;
  if(det.tipo==='whole'){
    tx.autoOdo={tipo:'whole',dientes,simboloPend:det.pend,simboloDone:det.done};
    const simbolo=tx.status==='realizado'?det.done:det.pend;
    if(!simbolo){save();notifyOdo(`🦷 "${det.etiqueta}" registrada. Al marcarla ✓ Realizado se dibujará en el odontograma.`);return;}
    if(aplicarWholeAuto(dientes,simbolo)){
      save();
      notifyOdo(`🦷 Odontograma actualizado: ${det.etiqueta} ${tx.status==='realizado'?'REALIZADA':'PENDIENTE'} · Diente(s) ${dientes.join(', ')}`);
    }else save();
  }else if(det.tipo==='surface'){
    tx.autoOdo={tipo:'surface',dientes,zonas:{}};
    save();
    if(tx.status==='realizado')abrirSelectorSuperficies(dientes,tx);
    else notifyOdo(`🦷 "${det.etiqueta}" pendiente: al marcarla ✓ Realizado elegirás las superficies.`);
  }
}
function evolucionarAutoOdo(t){
  const a=t.autoOdo;
  if(a&&a.tipo==='whole'&&a.simboloDone){
    const dientes=a.dientes||[];
    if(!dientes.length)return;
    const conflictos=[];
    dientes.forEach(n=>{
      const w=curPt.wholeData[n];
      if(w&&w!==a.simboloPend&&w!==a.simboloDone)conflictos.push(`Diente ${n}: tiene "${ODO_WHOLE.find(x=>x.id===w)?.label||w}"`);
    });
    if(conflictos.length&&!confirm('⚠️ Evolución pendiente → realizada.\nSímbolos distintos encontrados:\n\n• '+conflictos.join('\n• ')+'\n\n¿Sobrescribir igualmente?'))return;
    dientes.forEach(n=>{
      const w=curPt.wholeData[n];
      if(!w||w===a.simboloPend||w===a.simboloDone){
        ODO_ZONES.forEach(z=>delete curPt.surfData[n+'_'+z]);
        curPt.wholeData[n]=a.simboloDone;
      }
    });
    save();
    notifyOdo(`✅ Evolución aplicada: símbolo de REALIZADO en diente(s) ${dientes.join(', ')}`);
  }else if(a&&a.tipo==='surface'){
    abrirSelectorSuperficies(a.dientes&&a.dientes.length?a.dientes:parseDientesTx(t.tooth),t);
  }else if(!a){
    const det=detectarTipoTx(t.name);
    if(!det||det.tipo==='none')return;
    const dientes=parseDientesTx(t.tooth);
    if(!dientes.length)return;
    if(det.tipo==='whole'&&det.done){
      if(!confirm(`¿Marcar en el odontograma "${det.etiqueta}" como REALIZADA en diente(s) ${dientes.join(', ')}?`))return;
      if(aplicarWholeAuto(dientes,det.done)){
        t.autoOdo={tipo:'whole',dientes,simboloPend:det.pend,simboloDone:det.done};
        save();
        notifyOdo(`🦷 Odontograma actualizado: ${det.etiqueta} realizada · Diente(s) ${dientes.join(', ')}`);
      }
    }else if(det.tipo==='surface'){
      t.autoOdo={tipo:'surface',dientes,zonas:{}};
      save();
      abrirSelectorSuperficies(dientes,t);
    }
  }
}
function abrirSelectorSuperficies(dientes,tx){
  if(!dientes.length){notifyOdo('⚠️ No hay dientes válidos para marcar');return;}
  _txSupActivo=tx.id;
  let html=`<div class="modal-title">🦷 Marcar superficies — ${esc(tx.name)}</div>
  <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">
  Selecciona las superficies obturadas en cada diente. Se aplicará el símbolo oficial <strong>Obturado</strong> (azul).
  </div>`;
  dientes.forEach(n=>{
    html+=`<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">Diente ${n}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
    ${ODO_ZONES.map(z=>{
      const existente=curPt.surfData[n+'_'+z];
      const lbl=ODO_SURF.find(s=>s.id===existente)?.label;
      return`<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;background:var(--bg)">
        <input type="checkbox" id="sup_${n}_${z}" style="width:15px;height:15px;accent-color:var(--accent)">
        <span style="flex:1">${zoneNamesFor(n)[z]}</span>
        ${existente?`<span style="font-size:10px;color:var(--amber);font-weight:600">⚠ ${lbl}</span>`:''}
      </label>`;
    }).join('')}
    </div></div>`;
  });
  html+=`<div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Ahora no</button>
    <button class="btn-primary" onclick="aplicarSuperficiesTx()">Aplicar al odontograma</button>
  </div>`;
  openModal(html);
  document.querySelector('.modal').style.width='520px';
}
function aplicarSuperficiesTx(){
  const tx=curPt.treatments.find(x=>x.id===_txSupActivo);
  const dientes=(tx&&tx.autoOdo&&tx.autoOdo.dientes)||[];
  const zonas={};const conflictos=[];
  dientes.forEach(n=>{
    const marcadas=[];let conflictoWhole=false;
    ODO_ZONES.forEach(z=>{
      const chk=document.getElementById(`sup_${n}_${z}`);
      if(chk&&chk.checked){
        marcadas.push(z);
        const ex=curPt.surfData[n+'_'+z];
        if(ex&&ex!=='obturado')conflictos.push(`Diente ${n} · ${zoneNamesFor(n)[z]}: tiene "${ODO_SURF.find(s=>s.id===ex)?.label}"`);
        if(curPt.wholeData[n]&&!conflictoWhole){conflictos.push(`Diente ${n}: tiene símbolo completo "${ODO_WHOLE.find(x=>x.id===curPt.wholeData[n])?.label||''}" (se quitará)`);conflictoWhole=true;}
      }
    });
    if(marcadas.length)zonas[n]=marcadas;
  });
  if(!Object.keys(zonas).length){alert('Selecciona al menos una superficie');return;}
  if(conflictos.length&&!confirm('⚠️ Marcas previas encontradas:\n\n• '+conflictos.join('\n• ')+'\n\n¿Sobrescribir?'))return;
  Object.entries(zonas).forEach(([n,zs])=>{
    delete curPt.wholeData[n];
    zs.forEach(z=>curPt.surfData[n+'_'+z]='obturado');
  });
  if(tx)tx.autoOdo={tipo:'surface',dientes,zonas};
  save();closeModal();renderTab();
  notifyOdo('🦷 Odontograma actualizado: '+Object.entries(zonas).map(([n,zs])=>`diente ${n} (${zs.map(z=>zoneNamesFor(n)[z]).join(', ')})`).join(' · '));
}
function sugerirTxDesdeOdonto(tooth,odoId){
  const info=ODO_TX_MAP[odoId];if(!info)return;
  const odoLbl=ODO_WHOLE.find(w=>w.id===odoId)?.label||odoId;
  const svc=servicios.find(s=>s.nombre.toLowerCase().includes(info.name.toLowerCase()));
  openModal(`<div class="modal-title">💡 Tratamiento sugerido</div>
  <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#1e40af">
  Marcaste <strong>"${odoLbl}"</strong> en el diente <strong>${tooth}</strong>. ¿Registrar el tratamiento <strong>${esc(info.name)}</strong> como <strong>${info.status}</strong>?
  </div>
  <div class="form-row form-full"><div class="form-group"><label>Tratamiento *</label><input id="f_stn" value="${svc?svc.nombre:info.name}"></div></div>
  <div class="form-row">
    <div class="form-group"><label>Costo ($)</label><input id="f_stc" type="number" min="0" step="0.01" value="${svc?svc.precio.toFixed(2):''}"></div>
    <div class="form-group"><label>Fecha</label><input id="f_std" type="date" value="${today()}"></div>
  </div>
  <div style="font-size:11px;color:var(--text3);margin-bottom:10px">🦷 Diente: <b>${tooth}</b> · El tratamiento quedará vinculado al símbolo del odontograma.</div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">No, gracias</button>
    <button class="btn-primary" onclick="crearTxDesdeOdonto(${tooth},'${odoId}')">+ Crear tratamiento</button>
  </div>`);
}
function crearTxDesdeOdonto(tooth,odoId){
  const name=v('f_stn').trim();if(!name)return;
  const info=ODO_TX_MAP[odoId];
  const det=detectarTipoTx(name);
  const tx={id:uid(),name,tooth:String(tooth),date:v('f_std'),cost:parseMonto(v('f_stc'))||0,status:info.status};
  if(det&&det.tipo==='whole')tx.autoOdo={tipo:'whole',dientes:[tooth],simboloPend:det.pend,simboloDone:det.done,origen:'odontograma'};
  else tx.autoOdo={tipo:'whole',dientes:[tooth],simboloPend:odoId,simboloDone:odoId,origen:'odontograma'};
  curPt.treatments.push(tx);
  save();closeModal();
  if(curTab==='odontograma')renderTab();
  notifyOdo(`✅ Tratamiento "${name}" creado (${info.status}) y vinculado al diente ${tooth}`);
}
function sugerirTxDesdeCaries(tooth,zone){
  const svc=servicios.find(s=>/obturaci|resina/i.test(s.nombre));
  openModal(`<div class="modal-title">💡 Tratamiento sugerido</div>
  <div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#6b4a2f">
  Se marcó <strong>caries</strong> en el diente <strong>${tooth}</strong> (${zoneNamesFor(tooth)[zone]}). ¿Registrar el tratamiento pendiente correspondiente?
  </div>
  <div class="form-row form-full"><div class="form-group"><label>Tratamiento *</label><input id="f_stn" value="${svc?svc.nombre:'Obturación resina'}"></div></div>
  <div class="form-row">
    <div class="form-group"><label>Costo ($)</label><input id="f_stc" type="number" min="0" step="0.01" value="${svc?svc.precio.toFixed(2):''}"></div>
    <div class="form-group"><label>Fecha</label><input id="f_std" type="date" value="${today()}"></div>
  </div>
  ${svc?`<div style="font-size:11px;color:var(--text3);margin-bottom:10px">⚡ Precio tomado del catálogo de servicios.</div>`:''}
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">No, gracias</button>
    <button class="btn-primary" onclick="crearTxDesdeCaries(${tooth})">+ Crear tratamiento pendiente</button>
  </div>`);
}
function crearTxDesdeCaries(tooth){
  const name=v('f_stn').trim();if(!name)return;
  const tx={id:uid(),name,tooth:String(tooth),date:v('f_std'),cost:parseMonto(v('f_stc'))||0,status:'pendiente'};
  tx.autoOdo={tipo:'surface',dientes:[tooth],zonas:{},origen:'odontograma'};
  curPt.treatments.push(tx);
  save();closeModal();
  if(curTab==='odontograma')renderTab();
  notifyOdo(`✅ Tratamiento "${name}" creado como pendiente para el diente ${tooth}`);
}
function describirAutoOdo(a){
  if(!a)return'';
  if(a.tipo==='whole')return`Símbolo de diente completo en: ${a.dientes.join(', ')}`;
  if(a.tipo==='surface'){
    const zs=Object.entries(a.zonas||{});
    if(!zs.length)return`Dientes reservados para superficies: ${a.dientes.join(', ')}`;
    return'Obturación marcada en: '+zs.map(([n,z])=>`diente ${n} (${z.map(x=>zoneNamesFor(n)[x]).join(', ')})`).join(' · ');
  }
  return'';
}
function limpiarAutoOdo(a){
  if(a.tipo==='whole'){
    a.dientes.forEach(n=>{
      const w=curPt.wholeData[n];
      if(w===a.simboloPend||w===a.simboloDone)delete curPt.wholeData[n];
    });
  }else if(a.tipo==='surface'){
    Object.entries(a.zonas||{}).forEach(([n,zs])=>{
      zs.forEach(z=>{if(curPt.surfData[n+'_'+z]==='obturado')delete curPt.surfData[n+'_'+z];});
    });
  }
}
function notifyOdo(msg){
  let el=document.getElementById('odoNotify');
  if(!el){
    el=document.createElement('div');
    el.id='odoNotify';
    el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:#0f172a;color:#fff;padding:11px 18px;border-radius:10px;font-size:12.5px;box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:10000;opacity:0;transition:all .3s;max-width:82vw;text-align:center;line-height:1.5';
    document.body.appendChild(el);
  }
  el.textContent=msg;
  el.style.opacity='1';
  el.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(el._t);
  el._t=setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(-50%) translateY(20px)';},4200);
}


// ═══ CABECERA DE VENTANA DEL PACIENTE (solo estética) ═══
function esNegativo(txt){
if(!txt)return true;
const t=String(txt).trim().toLowerCase().replace(/[.\s]+$/,'');
if(!t)return true;
const negs=['no','no refiere','no refiere nada','nada','ninguna','ninguno','niega','sin alergias','sin alergias conocidas','sin antecedentes','sin antecedentes conocidos','sin','negativo','no conocido','no padece','sano','sana'];
return negs.some(n=>t===n||t.startsWith(n+' '));
}
function showPtAlertTip(ev,key){
const d=window._ptAlerts||{};
const txt=key==='alergia'?d.alergia:d.antec;
if(!txt||esNegativo(txt))return;
let tip=document.getElementById('ptAlertTip');
if(!tip){tip=document.createElement('div');tip.id='ptAlertTip';document.body.appendChild(tip);}
tip.innerHTML=key==='alergia'?`<strong>⚠️ ALERGIA:</strong> ${escHtml(txt)}`:`<strong>🩺 ANTECEDENTES:</strong> ${escHtml(txt)}`;
tip.style.display='block';
const r=ev.currentTarget.getBoundingClientRect();
tip.style.left=Math.max(8,Math.min(r.left,window.innerWidth-328))+'px';
tip.style.top=(r.bottom+10)+'px';
}
function hidePtAlertTip(){const tip=document.getElementById('ptAlertTip');if(tip)tip.style.display='none';}

function renderPtHeader(){
  const p=curPt;
  if(!p)return;
  
  document.body.classList.add('pt-open');
  const el=document.getElementById('ptWinHeader');
  if(!el)return;
  
  // Iniciales para avatar
  const iniciales = p.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  
  // Calcular edad
  const edad = p.birthdate ? calcAge(p.birthdate) : '—';
  
  // Verificar si tiene alergias/antecedentes REALES (no "no refiere")
  const tieneAlergiasReales = p.alergias && !esNegativo(p.alergias);
  const tieneAntecedentesReales = p.antecedentes && !esNegativo(p.antecedentes);
  
  // Guardar para tooltips
  window._ptAlerts={alergia:p.alergias||'',antec:p.antecedentes||''};
  
  // Construir badges SOLO si hay información real
  let badgesHtml = '';
  
  if (tieneAlergiasReales) {
    badgesHtml += `<button class="ptw-alert-btn amber" 
      onmouseenter="showPtAlertTip(event,'alergia')" 
      onmouseleave="hidePtAlertTip()"
      style="cursor:default">
      ⚠️ ALERGIA
    </button>`;
  }
  
  if (tieneAntecedentesReales) {
    badgesHtml += `<button class="ptw-alert-btn amber" 
      onmouseenter="showPtAlertTip(event,'antec')" 
      onmouseleave="hidePtAlertTip()"
      style="cursor:default">
      🩺 ANTECEDENTES
    </button>`;
  }
  
  // Header completo
  el.innerHTML=`
    <div class="ptw-card">
      <div class="ptw-info">
        <div class="ptw-av">${iniciales}</div>
        <div style="min-width:0">
          <div class="ptw-name">${esc(p.name)}</div>
          <div class="ptw-meta">
            <span>🪪 ${esc(p.cedula || 'Sin cédula')}</span>
            <span>·</span>
            <span>📞 ${esc(p.phone || 'Sin teléfono')}</span>
            <span>·</span>
            <span>🎂 ${edad} años</span>
          </div>
        </div>
      </div>
      <div class="ptw-alerts">
        ${badgesHtml}
      </div>
      <div class="ptw-actions">
        <button class="ptw-btn" title="Editar paciente" onclick="editPt()">️</button>
        <button class="ptw-btn" title="Nueva cita" onclick="openAddAppt()">📅</button>
        <button class="ptw-btn" title="Registrar pago" onclick="openAddPay()">💳</button>
        <button class="ptw-btn" title="Nueva receta" onclick="openNuevaReceta()">💊</button>
        <button class="ptw-btn" title="Eliminar paciente" onclick="openDeletePt()">🗑️</button>
        <button class="ptw-btn" title="Cerrar ficha" onclick="showPage('dashboard')">✕</button>
      </div>
    </div>
  `;
  
  // Mostrar tabs
  const tabsBar = document.getElementById('tabsBar');
  if(tabsBar) tabsBar.style.display = 'flex';
  
  // Renderizar contenido
  if(typeof renderTab === 'function') renderTab();
}
