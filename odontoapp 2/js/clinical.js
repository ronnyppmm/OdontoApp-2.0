/* ═══ CLÍNICA — recetas, consentimientos, CIE-10, presupuestos ═══ */
// ═══ CONSENTIMIENTOS INFORMADOS ═══
const CONSENT_TEMPLATES=[
  {id:'extraccion',titulo:'Extracción Dental',icono:'🦷',
   texto:`CONSENTIMIENTO INFORMADO PARA EXTRACCIÓN DENTAL\n\nYo, el/la paciente o su representante legal, declaro que el/la profesional odontólogo/a me ha informado de manera clara y comprensible sobre:\n\n1. PROCEDIMIENTO: La extracción dental consiste en la remoción quirúrgica del diente o sus fragmentos del alvéolo dental.\n\n2. ALTERNATIVAS: El profesional me ha explicado otras opciones terapéuticas posibles antes de tomar la decisión de extraer la pieza.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Dolor e inflamación postoperatoria\n   • Sangrado prolongado\n   • Infección del alvéolo (alveolitis)\n   • Lesión de nervios adyacentes (parestesia temporal o permanente)\n   • Apertura al seno maxilar (en extracciones superiores)\n   • Fractura de raíces o del hueso alveolar\n   • Trismus (dificultad para abrir la boca)\n\n4. CUIDADOS POSTOPERATORIOS: Me han sido explicados los cuidados necesarios tras el procedimiento.\n\n5. ANESTESIA LOCAL: Se utilizará anestesia local, con los riesgos inherentes a la misma.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para que se realice el procedimiento indicado.`},

  {id:'endodoncia',titulo:'Endodoncia / Tratamiento de Conductos',icono:'⚕️',
   texto:`CONSENTIMIENTO INFORMADO PARA ENDODONCIA\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento endodóntico (tratamiento de conductos) consiste en la eliminación del tejido pulpar infectado o necrótico del interior del diente, la limpieza, conformación y obturación del sistema de conductos radiculares.\n\n2. OBJETIVO: Conservar el diente en boca, eliminando la infección y previniendo su propagación.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Fractura de instrumentos endodónticos en el interior del conducto\n   • Perforación radicular o de la cámara pulpar\n   • Sobreobturación del material de relleno\n   • Fractura vertical de la raíz\n   • Fallo del tratamiento que requiera retratamiento o extracción\n   • Dolor e inflamación temporal después del procedimiento\n   • Reacción alérgica a los materiales utilizados\n\n4. SESIONES: El tratamiento puede requerir una o varias sesiones clínicas.\n\n5. RESTAURACIÓN POSTERIOR: Tras la endodoncia, el diente requiere una restauración adecuada (corona u obturación) para protegerlo.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la realización del tratamiento endodóntico.`},

  {id:'anestesia',titulo:'Anestesia Local',icono:'💉',
   texto:`CONSENTIMIENTO INFORMADO PARA ANESTESIA LOCAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre la administración de anestesia local en el ámbito odontológico:\n\n1. PROCEDIMIENTO: La anestesia local consiste en la inyección de un fármaco anestésico (generalmente articaína o lidocaína con vasoconstrictor) para bloquear temporalmente la sensibilidad en el área de trabajo.\n\n2. EFECTOS ESPERADOS: Adormecimiento de la zona tratada durante el procedimiento, que puede extenderse varias horas después.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Hematoma en el sitio de punción\n   • Lesión temporal del nervio (parestesia)\n   • Reacción alérgica o tóxica al anestésico\n   • Taquicardia o palpitaciones por el vasoconstrictor\n   • Síncope vasovagal (desmayo)\n   • Trismus temporal\n   • Necrosis isquémica (muy rara)\n\n4. PRECAUCIONES ESPECIALES: He informado al profesional sobre mis antecedentes médicos, alergias, medicamentos actuales, enfermedades cardiovasculares, diabetes, embarazo u otras condiciones relevantes.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la administración de anestesia local.`},

  {id:'implante',titulo:'Implante Dental',icono:'🔩',
   texto:`CONSENTIMIENTO INFORMADO PARA IMPLANTE DENTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El implante dental es un dispositivo de titanio que se inserta quirúrgicamente en el hueso maxilar o mandibular para reemplazar la raíz de un diente perdido.\n\n2. FASES:\n   • Fase quirúrgica: colocación del implante en el hueso\n   • Período de oseointegración (3-6 meses)\n   • Fase protésica: colocación de la corona sobre el implante\n\n3. RIESGOS Y COMPLICACIONES:\n   • Infección postquirúrgica\n   • Fracaso de la oseointegración\n   • Lesión de nervios (parestesia)\n   • Perforación del seno maxilar\n   • Fractura del implante\n   • Periimplantitis (infección crónica)\n   • Rechazo del implante\n\n4. CONTRAINDICACIONES: He informado al profesional sobre diabetes, osteoporosis, tratamientos con bifosfonatos, radioterapia, tabaquismo u otras condiciones que puedan afectar el resultado.\n\n5. CUIDADOS: El éxito del implante depende en gran medida de una higiene oral estricta y controles periódicos.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la colocación del implante dental.`},

  {id:'blanqueamiento',titulo:'Blanqueamiento Dental',icono:'✨',
   texto:`CONSENTIMIENTO INFORMADO PARA BLANQUEAMIENTO DENTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El blanqueamiento dental consiste en la aplicación de agentes oxidantes (peróxido de hidrógeno o carbamida) sobre la superficie dental para aclarar el tono del esmalte.\n\n2. RESULTADOS: Los resultados varían según el tipo y causa de la tinción. No se garantiza un resultado específico ni permanente.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Sensibilidad dental temporal (durante o después del tratamiento)\n   • Irritación gingival\n   • Irregularidad del color entre dientes naturales y restauraciones\n   • Reabsorción cervical externa (muy rara, en blanqueamiento interno)\n\n4. DURACIÓN: Los resultados son temporales y dependen de los hábitos de alimentación, tabaquismo e higiene del paciente.\n\n5. CONTRAINDICACIONES: No se recomienda en embarazadas, lactantes, menores de 18 años, ni en pacientes con caries activas o enfermedad periodontal sin tratar.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el blanqueamiento dental.`},

  {id:'cirugia',titulo:'Cirugía Oral / Periodontal',icono:'🏥',
   texto:`CONSENTIMIENTO INFORMADO PARA CIRUGÍA ORAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre el procedimiento quirúrgico indicado:\n\n1. PROCEDIMIENTO: Cirugía oral (puede incluir: exodoncia quirúrgica, frenectomía, apicectomía, cirugía periodontal, quistectomía, entre otros).\n\n2. ANESTESIA: Se utilizará anestesia local. En casos especiales, puede requerirse sedación o anestesia general.\n\n3. RIESGOS GENERALES DE CIRUGÍA:\n   • Sangrado e inflamación postoperatoria\n   • Infección de la herida quirúrgica\n   • Dehiscencia de suturas\n   • Lesión de estructuras anatómicas adyacentes (nervios, vasos, seno maxilar)\n   • Trismus temporal\n   • Cicatrización deficiente\n\n4. MEDICACIÓN POSTOPERATORIA: Se prescribirán analgésicos, antiinflamatorios y/o antibióticos según el caso.\n\n5. CUIDADOS: Seguiré estrictamente las indicaciones postoperatorias para favorecer la correcta cicatrización.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la realización del procedimiento quirúrgico indicado.`},

  {id:'ortodoncia',titulo:'Ortodoncia',icono:'😁',
   texto:`CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE ORTODONCIA\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento ortodóntico tiene como objetivo corregir la posición de los dientes y las relaciones oclusales mediante el uso de aparatos (brackets, alineadores u otros dispositivos).\n\n2. DURACIÓN: El tiempo de tratamiento varía según la complejidad del caso (generalmente entre 12 y 36 meses).\n\n3. RIESGOS Y COMPLICACIONES:\n   • Caries y descalcificaciones por deficiente higiene durante el tratamiento\n   • Reabsorción radicular\n   • Recidiva (retorno de los dientes a su posición original) si no se usan los retenedores\n   • Molestias y dolor durante los primeros días de cada activación\n   • Lesiones en mucosa oral por los aparatos\n   • Enfermedad periodontal si no se mantiene una higiene adecuada\n\n4. COLABORACIÓN: El éxito del tratamiento depende en gran parte de la colaboración del paciente (uso de elásticos, asistencia a controles, higiene oral).\n\n5. RETENCIÓN: Una vez finalizado el tratamiento activo, es obligatorio el uso de retenedores indefinidamente.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el tratamiento de ortodoncia.`},

  {id:'periodoncia',titulo:'Tratamiento Periodontal',icono:'🦠',
   texto:`CONSENTIMIENTO INFORMADO PARA TRATAMIENTO PERIODONTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento periodontal comprende procedimientos para tratar la enfermedad de las encías y el hueso de soporte dental (raspado y alisado radicular, cirugía periodontal, etc.).\n\n2. OBJETIVO: Eliminar la placa bacteriana y el cálculo dental subgingival, controlar la infección y estabilizar la enfermedad periodontal.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Sensibilidad dental por exposición de cuellos dentales\n   • Aumento aparente de los espacios entre dientes\n   • Recesión gingival\n   • Inflamación y molestias temporales\n   • Necesidad de cirugía adicional si la respuesta no es satisfactoria\n\n4. MANTENIMIENTO: El tratamiento periodontal requiere controles periódicos y mantenimiento profesional cada 3-6 meses.\n\n5. FACTORES DE RIESGO: He informado sobre tabaquismo, diabetes u otras condiciones sistémicas que afectan la respuesta al tratamiento.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el tratamiento periodontal.`},
];

function renderConsentimientos(){
  const p=curPt;
  if(!p.consents)p.consents=[];
  return`
  <div class="card">
    <div class="action-row">
      <div class="card-title" style="margin:0">Consentimientos informados</div>
      <button class="btn-primary" onclick="openSelectConsent()">+ Agregar consentimiento</button>
    </div>
    ${p.consents.length===0?`
      <div style="text-align:center;padding:40px 20px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">📋</div>
        <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin consentimientos registrados</div>
        <div style="font-size:12px">Agrega los consentimientos informados firmados por el paciente antes de cada procedimiento</div>
      </div>`:
    p.consents.map(c=>`
      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="font-size:22px">${CONSENT_TEMPLATES.find(t=>t.id===c.templateId)?.icono||'📋'}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(c.titulo)}</div>
            <div style="font-size:11px;color:var(--text3)">Fecha: ${fmtDate(c.fecha)} · ${c.firmado?'<span style="color:var(--green);font-weight:600">✓ Firmado</span>':'<span style="color:var(--amber);font-weight:600">⏳ Pendiente de firma</span>'}</div>
          </div>
          <div style="display:flex;gap:6px">
            ${!c.firmado?`<button class="done-btn" onclick="firmarConsent(${c.id})">✓ Marcar firmado</button>`:''}
            <button class="btn-sm" style="font-size:11px;padding:4px 10px" onclick="verConsent(${c.id})">Ver</button>
            <button class="del-btn" onclick="delConsent(${c.id})">✕</button>
          </div>
        </div>
        ${c.firmado?`<div style="display:flex;gap:16px;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:11px;color:var(--text2)">
          <span>👤 Paciente: <strong>${esc(c.nombrePaciente||p.name)}</strong></span>
          ${c.nombreRepresentante?`<span>👤 Representante: <strong>${esc(c.nombreRepresentante)}</strong></span>`:''}
          <span>📅 Firmado: <strong>${fmtDate(c.fechaFirma)}</strong></span>
        </div>`:''}
      </div>`).join('')}
  </div>
  <div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px">⚖️</div>
    <div style="font-size:12px;color:#6b4a2f">Los consentimientos informados son un requisito legal y ético. Deben obtenerse antes de cada procedimiento. Se recomienda imprimir, firmar físicamente y archivar el documento original.</div>
  </div>`;
}

function openSelectConsent(){
  openModal(`<div class="modal-title">Seleccionar consentimiento informado</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    ${CONSENT_TEMPLATES.map(t=>`
      <div onclick="addConsent('${t.id}')" style="display:flex;align-items:center;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-size:24px">${t.icono}</div>
        <div style="font-size:13px;font-weight:500;color:var(--text)">${esc(t.titulo)}</div>
      </div>`).join('')}
    <div onclick="addConsentCustom()" style="display:flex;align-items:center;gap:10px;padding:12px;border:1.5px dashed var(--border);border-radius:10px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="font-size:24px">✏️</div>
      <div style="font-size:13px;font-weight:500;color:var(--text2)">Personalizado</div>
    </div>
  </div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button></div>`);
  document.querySelector('.modal').style.width='620px';
}

function addConsent(templateId){
  const tmpl=CONSENT_TEMPLATES.find(t=>t.id===templateId);if(!tmpl)return;
  if(!curPt.consents)curPt.consents=[];
  curPt.consents.push({id:uid(),templateId,titulo:tmpl.titulo,texto:tmpl.texto,fecha:today(),firmado:false,fechaFirma:null,nombrePaciente:curPt.name,nombreRepresentante:''});
  save();closeModal();renderTab();
}

function addConsentCustom(){
  closeModal();
  openModal(`<div class="modal-title">Consentimiento personalizado</div>
  <div class="form-row form-full"><div class="form-group"><label>Título del consentimiento *</label><input id="f_ctit" placeholder="Ej: Blanqueamiento con láser, Implante cigomático..."></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Texto del consentimiento *</label><textarea id="f_ctxt" style="min-height:200px" placeholder="Escribe el texto completo del consentimiento informado..."></textarea></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveConsentCustom()">Agregar</button></div>`);
}

function saveConsentCustom(){
  const titulo=v('f_ctit').trim(),texto=v('f_ctxt').trim();
  if(!titulo||!texto){alert('Completa el título y el texto');return;}
  if(!curPt.consents)curPt.consents=[];
  curPt.consents.push({id:uid(),templateId:'custom',titulo,texto,fecha:today(),firmado:false,fechaFirma:null,nombrePaciente:curPt.name,nombreRepresentante:''});
  save();closeModal();renderTab();
}

function verConsent(id){
  const c=curPt.consents.find(x=>x.id===id);if(!c)return;
  const clinicaNombre=document.getElementById('logoText').textContent;
  const profesional=document.getElementById('logoProfesional').textContent;
  const tmpl=CONSENT_TEMPLATES.find(t=>t.id===c.templateId);
  openModal(`<div class="modal-title">${tmpl?.icono||'📋'} ${esc(c.titulo)}</div>
  <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--text)">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(clinicaNombre)}</div>
        <div style="font-size:11px;color:var(--text2)">${esc(profesional)}</div>
        <div style="font-size:11px;color:var(--text2)">RUC: ${esc(clinicaRUC||'—')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase">Consentimiento Informado</div>
        <div style="font-size:11px;color:var(--text2)">Fecha: ${fmtDate(c.fecha)}</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text);line-height:1.8;white-space:pre-line;margin-bottom:20px">${esc(c.texto)}</div>
    <div style="border-top:1px solid var(--border);padding-top:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px">
        <div style="border-top:1px solid var(--text);padding-top:6px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">${c.firmado&&c.nombrePaciente?esc(c.nombrePaciente):'Firma del paciente / representante'}</div>
          ${c.firmado?`<div style="font-size:10px;color:var(--green);margin-top:2px">✓ Firmado el ${fmtDate(c.fechaFirma)}</div>`:''}
        </div>
        <div style="border-top:1px solid var(--text);padding-top:6px;text-align:center">
          <div style="font-size:11px;color:var(--text2)">${esc(profesional)}</div>
          <div style="font-size:10px;color:var(--text3)">Firma del profesional</div>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cerrar</button>
    ${!c.firmado?`<button class="btn-primary" style="background:var(--green)" onclick="firmarConsent(${c.id});closeModal()">✓ Marcar como firmado</button>`:''}
    <button class="btn-primary" onclick="window.print()">🖨️ Imprimir</button>
  </div>`);
  document.querySelector('.modal').style.width='680px';
}

function firmarConsent(id){
  const c=curPt.consents.find(x=>x.id===id);if(!c)return;
  openModal(`<div class="modal-title">Registrar firma del consentimiento</div>
  <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Confirma que el paciente o su representante legal ha firmado físicamente el documento <strong>${esc(c.titulo)}</strong>.</p>
  <div class="form-row form-full"><div class="form-group"><label>Nombre del paciente / firmante</label><input id="f_fnpac" value="${esc(c.nombrePaciente||curPt.name)}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Nombre del representante (si aplica)</label><input id="f_fnrep" placeholder="Solo si el firmante no es el paciente"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Fecha de firma</label><input id="f_ffirma" type="date" value="${today()}"></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" style="background:var(--green)" onclick="confirmarFirma(${id})">✓ Confirmar firma</button></div>`);
}

function confirmarFirma(id){
  const c=curPt.consents.find(x=>x.id===id);if(!c)return;
  c.firmado=true;c.fechaFirma=v('f_ffirma');c.nombrePaciente=v('f_fnpac');c.nombreRepresentante=v('f_fnrep');
  save();closeModal();renderTab();
}

function delConsent(id){
  if(!confirm('¿Eliminar este consentimiento?'))return;
  curPt.consents=curPt.consents.filter(x=>x.id!==id);
  save();renderTab();
}

// ═══ BASE DE DATOS CIE-10 ODONTOLOGÍA ═══
const CIE10_ODO=[
  ['A422','ACTINOMICOSIS CERVICOFACIAL'],['B002','GINGIVOESTOMATITIS Y FARINGOAMIGDALITIS HERPETICA'],
  ['B009','INFECCION DEBIDA AL VIRUS DEL HERPES, NO ESPECIFICADA'],['B084','ESTOMATITIS VESICULAR ENTEROVIRAL CON EXANTEMA'],
  ['B370','ESTOMATITIS CANDIDIASICA'],['B378','CANDIDIASIS DE OTROS SITIOS'],['B99','OTRAS ENFERMEDADES INFECCIOSAS Y LAS NO ESPECIFICADAS'],
  ['C000','TUMOR MALIGNO DEL LABIO SUPERIOR, CARA EXTERNA'],['C001','TUMOR MALIGNO DEL LABIO INFERIOR, CARA EXTERNA'],
  ['C002','TUMOR MALIGNO DEL LABIO, CARA EXTERNA, SIN OTRA ESPECIFICACION'],['C003','TUMOR MALIGNO DEL LABIO SUPERIOR, CARA INTERNA'],
  ['C004','TUMOR MALIGNO DEL LABIO INFERIOR, CARA INTERNA'],['C005','TUMOR MALIGNO DEL LABIO, CARA INTERNA, SIN OTRA ESPECIFICACION'],
  ['C006','TUMOR MALIGNO DE LA COMISURA LABIAL'],['C008','LESION DE SITIOS CONTIGUOS DEL LABIO'],
  ['C009','TUMOR MALIGNO DEL LABIO, PARTE NO ESPECIFICADA'],['C01','TUMOR MALIGNO DE LA BASE DE LA LENGUA'],
  ['C020','TUMOR MALIGNO DE LA CARA DORSAL DE LA LENGUA'],['C021','TUMOR MALIGNO DEL BORDE DE LA LENGUA'],
  ['C022','TUMOR MALIGNO DE LA CARA VENTRAL DE LA LENGUA'],['C024','TUMOR MALIGNO DE LA AMIGDALA LINGUAL'],
  ['C029','TUMOR MALIGNO DE LA LENGUA, PARTE NO ESPECIFICADA'],['C030','TUMOR MALIGNO DE LA ENCIA SUPERIOR'],
  ['C031','TUMOR MALIGNO DE LA ENCIA INFERIOR'],['C039','TUMOR MALIGNO DE LA ENCIA, PARTE NO ESPECIFICADA'],
  ['C040','TUMOR MALIGNO DE LA PARTE ANTERIOR DEL PISO DE LA BOCA'],['C041','TUMOR MALIGNO DE LA PARTE LATERAL DEL PISO DE LA BOCA'],
  ['C049','TUMOR MALIGNO DEL PISO DE LA BOCA, PARTE NO ESPECIFICADA'],['C050','TUMOR MALIGNO DEL PALADAR DURO'],
  ['C051','TUMOR MALIGNO DEL PALADAR BLANDO'],['C052','TUMOR MALIGNO DE LA UVULA'],
  ['C059','TUMOR MALIGNO DEL PALADAR, PARTE NO ESPECIFICADA'],['C060','TUMOR MALIGNO DE LA MUCOSA DE LA MEJILLA'],
  ['C061','TUMOR MALIGNO DEL VESTIBULO DE LA BOCA'],['C062','TUMOR MALIGNO DEL AREA RETROMOLAR'],
  ['C069','TUMOR MALIGNO DE LA BOCA, PARTE NO ESPECIFICADA'],['C07','TUMOR MALIGNO DE LA GLANDULA PAROTIDA'],
  ['C080','TUMOR MALIGNO DE LA GLANDULA SUBMAXILAR'],['C081','TUMOR MALIGNO DE LA GLANDULA SUBLINGUAL'],
  ['C089','TUMOR MALIGNO DE GLANDULA SALIVAL MAYOR, NO ESPECIFICADA'],['C310','TUMOR MALIGNO DEL SENO MAXILAR'],
  ['C410','TUMOR MALIGNO DE LOS HUESOS DEL CRANEO Y DE LA CARA'],['C411','TUMOR MALIGNO DEL HUESO DEL MAXILAR INFERIOR'],
  ['C430','MELANOMA MALIGNO DEL LABIO'],['C440','TUMOR MALIGNO DE LA PIEL DEL LABIO'],
  ['C462','SARCOMA DE KAPOSI DEL PALADAR'],['C760','TUMOR MALIGNO DE LA CABEZA, CARA Y CUELLO'],
  ['D100','TUMOR BENIGNO DEL LABIO'],['D101','TUMOR BENIGNO DE LA LENGUA'],['D102','TUMOR BENIGNO DEL PISO DE LA BOCA'],
  ['D103','TUMOR BENIGNO DE OTRAS PARTES DE LA BOCA'],['D164','TUMOR BENIGNO DE LOS HUESOS DEL CRANEO Y DE LA CARA'],
  ['D165','TUMOR BENIGNO DEL MAXILAR INFERIOR'],
  ['G500','NEURALGIA DEL TRIGEMINO'],['G501','DOLOR FACIAL ATIPICO'],['G508','OTROS TRASTORNOS DEL TRIGEMINO'],
  ['G510','PARALISIS DE BELL'],['G513','ESPASMO HEMIFACIAL CLONICO'],['G518','OTROS TRASTORNOS DEL NERVIO FACIAL'],
  ['J320','SINUSITIS MAXILAR CRONICA'],
  ['K000','ANODONCIA'],['K001','DIENTES SUPERNUMERARIOS'],['K002','ANOMALIAS DEL TAMAÑO Y DE LA FORMA DEL DIENTE'],
  ['K003','DIENTES MOTEADOS'],['K004','ALTERACIONES EN LA FORMACION DENTARIA'],
  ['K005','ALTERACIONES HEREDITARIAS DE LA ESTRUCTURA DENTARIA'],['K006','ALTERACIONES EN LA ERUPCION DENTARIA'],
  ['K007','SINDROME DE LA ERUPCION DENTARIA'],['K008','OTROS TRASTORNOS DEL DESARROLLO DE LOS DIENTES'],
  ['K009','TRASTORNO DEL DESARROLLO DE LOS DIENTES, NO ESPECIFICADO'],
  ['K010','DIENTES INCLUIDOS'],['K011','DIENTES IMPACTADOS'],
  ['K020','CARIES LIMITADA AL ESMALTE'],['K021','CARIES DE LA DENTINA'],['K022','CARIES DEL CEMENTO'],
  ['K023','CARIES DENTARIA DETENIDA'],['K024','ODONTOCLASIA'],['K028','OTRAS CARIES DENTALES'],['K029','CARIES DENTAL, NO ESPECIFICADA'],
  ['K030','ATRICION EXCESIVA DE LOS DIENTES'],['K031','ABRASION DE LOS DIENTES'],['K032','EROSION DE LOS DIENTES'],
  ['K033','REABSORCION PATOLOGICA DE LOS DIENTES'],['K034','HIPERCEMENTOSIS'],['K035','ANQUILOSIS DENTAL'],
  ['K036','DEPOSITOS EN LOS DIENTES'],['K037','CAMBIOS POSTERUPTIVOS DEL COLOR DE LOS TEJIDOS DENTALES DUROS'],
  ['K040','PULPITIS'],['K041','NECROSIS DE LA PULPA'],['K042','DEGENERACION DE LA PULPA'],
  ['K043','FORMACION ANORMAL DE TEJIDO DURO EN LA PULPA'],
  ['K044','PERIODONTITIS APICAL AGUDA ORIGINADA EN LA PULPA'],['K045','PERIODONTITIS APICAL CRONICA'],
  ['K046','ABSCESO PERIAPICAL CON FISTULA'],['K047','ABSCESO PERIAPICAL SIN FISTULA'],['K048','QUISTE RADICULAR'],
  ['K049','OTRAS ENFERMEDADES DE LA PULPA Y DEL TEJIDO PERIAPICAL'],
  ['K050','GINGIVITIS AGUDA'],['K051','GINGIVITIS CRONICA'],['K052','PERIODONTITIS AGUDA'],['K053','PERIODONTITIS CRONICA'],
  ['K054','PERIODONTOSIS'],['K055','OTRAS ENFERMEDADES PERIODONTALES'],['K056','ENFERMEDAD DE PERIODONTO, NO ESPECIFICADA'],
  ['K060','RETRACCION GINGIVAL'],['K061','HIPERPLASIA GINGIVAL'],
  ['K062','LESIONES DE LA ENCIA Y DE LA ZONA EDENTULA ASOCIADAS CON TRAUMATISMO'],
  ['K068','OTROS TRASTORNOS DE LA ENCIA Y DE LA ZONA EDENTULA'],
  ['K070','ANOMALIAS EVIDENTES DEL TAMAÑO DE LOS MAXILARES'],['K071','ANOMALIAS DE LA RELACION MAXILOBASILAR'],
  ['K072','ANOMALIAS DE LA RELACION ENTRE LOS ARCOS DENTARIOS'],['K073','ANOMALIAS DE LA POSICION DEL DIENTE'],
  ['K074','MALOCLUSION DE TIPO NO ESPECIFICADO'],['K075','ANOMALIAS DENTOFACIALES FUNCIONALES'],
  ['K076','TRASTORNOS DE LA ARTICULACION TEMPOROMAXILAR'],['K078','OTRAS ANOMALIAS DENTOFACIALES'],
  ['K079','ANOMALIA DENTOFACIAL, NO ESPECIFICADA'],
  ['K080','EXFOLIACION DE LOS DIENTES DEBIDA A CAUSAS SISTEMICAS'],
  ['K081','PERDIDA DE DIENTES DEBIDA A ACCIDENTE, EXTRACCION O ENFERMEDAD PERIODONTAL LOCAL'],
  ['K082','ATROFIA DE REBORDE ALVEOLAR DESDENTADO'],['K083','RAIZ DENTAL RETENIDA'],
  ['K088','OTRAS AFECCIONES DE LOS DIENTES Y DE SUS ESTRUCTURAS DE SOSTEN'],
  ['K090','QUISTES ORIGINADOS POR EL DESARROLLO DE LOS DIENTES'],['K091','QUISTES DE LAS FISURAS'],
  ['K092','OTROS QUISTES DE LOS MAXILARES'],['K098','OTROS QUISTES DE LA REGION BUCAL'],
  ['K100','TRASTORNOS DEL DESARROLLO DE LOS MAXILARES'],['K101','GRANULOMA CENTRAL DE CELULAS GIGANTES'],
  ['K102','AFECCIONES INFLAMATORIAS DE LOS MAXILARES'],['K103','ALVEOLITIS DEL MAXILAR'],
  ['K108','OTRAS ENFERMEDADES ESPECIFICADAS DE LOS MAXILARES'],
  ['K110','ATROFIA DE GLANDULA SALIVAL'],['K111','HIPERTROFIA DE GLANDULA SALIVAL'],['K112','SIALADENITIS'],
  ['K113','ABSCESO DE GLANDULA SALIVAL'],['K114','FISTULA DE GLANDULA SALIVAL'],['K115','SIALOLITIASIS'],
  ['K116','MUCOCELE DE GLANDULA SALIVAL'],['K117','ALTERACIONES DE LA SECRECION SALIVAL'],
  ['K118','OTRAS ENFERMEDADES DE LAS GLANDULAS SALIVALES'],
  ['K120','ESTOMATITIS AFTOSA RECURRENTE'],['K121','OTRAS FORMAS DE ESTOMATITIS'],['K122','CELULITIS Y ABSCESO DE BOCA'],
  ['K130','ENFERMEDADES DE LOS LABIOS'],['K131','MORDEDURA DEL LABIO Y DE LA MEJILLA'],
  ['K132','LEUCOPLASIA Y OTRAS ALTERACIONES DEL EPITELIO BUCAL'],['K133','LEUCOPLASIA PILOSA'],
  ['K134','GRANULOMA Y LESIONES SEMEJANTES DE LA MUCOSA BUCAL'],['K135','FIBROSIS DE LA SUBMUCOSA BUCAL'],
  ['K136','HIPERPLASIA IRRITATIVA DE LA MUCOSA BUCAL'],['K137','OTRAS LESIONES DE LA MUCOSA BUCAL'],
  ['K140','GLOSITIS'],['K141','LENGUA GEOGRAFICA'],['K142','GLOSITIS ROMBOIDEA MEDIANA'],
  ['K143','HIPERTROFIA DE LAS PAPILAS LINGUALES'],['K144','ATROFIA DE LAS PAPILAS LINGUALES'],
  ['K145','LENGUA PLEGADA'],['K146','GLOSODINIA'],['K148','OTRAS ENFERMEDADES DE LA LENGUA'],
  ['Q351','FISURA DEL PALADAR DURO'],['Q353','FISURA DEL PALADAR BLANDO'],['Q355','FISURA DEL PALADAR DURO Y BLANDO'],
  ['Q360','LABIO LEPORINO, BILATERAL'],['Q361','LABIO LEPORINO, LINEA MEDIA'],['Q369','LABIO LEPORINO, UNILATERAL'],
  ['Q381','ANQUILOGLOSIA'],['Q382','MACROGLOSIA'],['Q383','OTRAS MALFORMACIONES CONGENITAS DE LA LENGUA'],
  ['Q384','MALFORMACIONES CONGENITAS DE LAS GLANDULAS SALIVALES'],
  ['S014','HERIDA DE LA MEJILLA Y DE LA REGION TEMPOROMANDIBULAR'],['S015','HERIDA DEL LABIO Y DE LA CAVIDAD BUCAL'],
  ['S023','FRACTURA DEL SUELO DE LA ORBITA'],['S024','FRACTURA DEL MALAR Y DEL HUESO MAXILAR SUPERIOR'],
  ['S025','FRACTURA DE LOS DIENTES'],['S026','FRACTURA DEL MAXILAR INFERIOR'],
  ['S030','LUXACION DEL MAXILAR'],['S032','LUXACION DE DIENTE'],
  ['T784','ALERGIA NO ESPECIFICADA'],['T882','CHOQUE DEBIDA A ANESTESIA'],
  ['T885','OTRAS COMPLICACIONES DE LA ANESTESIA'],
  ['T886','CHOQUE ANAFILACTICO DEBIDO A EFECTO ADVERSO DE DROGA O MEDICAMENTO'],
  ['Z012','EXAMEN ODONTOLOGICO'],['Z463','PRUEBA Y AJUSTE DE PROTESIS DENTAL'],
  ['Z464','PRUEBA Y AJUSTE DE DISPOSITIVO ORTODONCICO'],['Z965','PRESENCIA DE IMPLANTES DENTALES'],
];
let CIE10_FULL=null;
function parseCSVLine(line){const out=[];let cur='';let inQ=false;
for(let i=0;i<line.length;i++){const ch=line[i];
if(inQ){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else inQ=false;}else cur+=ch;}
else{if(ch==='"')inQ=true;else if(ch===','){out.push(cur);cur='';}else cur+=ch;}}
out.push(cur);return out;}
function importarCIE10(){
const input=document.createElement('input');input.type='file';input.accept='.csv,.txt,.json';
input.onchange=e=>{const file=e.target.files[0];if(!file)return;
const reader=new FileReader();
reader.onload=ev=>{try{
const lines=String(ev.target.result).split(/\r?\n/);const list=[];
for(const line of lines){const t=line.trim();if(!t||t.startsWith('code,code_0'))continue;
const c=parseCSVLine(t);const code=(c[0]||'').trim().toUpperCase();const desc=(c[6]||'').trim();
if(!code||code.includes('-')||!desc)continue;list.push([code,desc]);}
if(!list.length){alert('No se encontraron códigos válidos.');return;}
openMainDB().then(db=>new Promise(res=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(list,'cie10full');tx.oncomplete=()=>res(true);tx.onerror=()=>res(false);})).then(ok=>{
if(ok){CIE10_FULL=list;const el=document.getElementById('cie10count');if(el)el.textContent='✓ '+list.length.toLocaleString()+' códigos cargados';
alert('✓ CIE-10 completo importado: '+list.length.toLocaleString()+' códigos listos para autocompletar (sin conexión).');}
else alert('No se pudo guardar en IndexedDB.');});
}catch(err){alert('Error al leer el archivo: '+err.message);}};
reader.readAsText(file);};
input.click();}
async function loadCIE10Full(){try{const db=await openMainDB();
const data=await new Promise(res=>{const rq=db.transaction('kv','readonly').objectStore('kv').get('cie10full');rq.onsuccess=()=>res(rq.result||null);rq.onerror=()=>res(null);});
if(data&&data.length){CIE10_FULL=data;const el=document.getElementById('cie10count');if(el)el.textContent='✓ '+data.length.toLocaleString()+' códigos cargados';}}catch(e){}}

function buscarCIE10(query){
if(!query||query.length<2)return[];
const q=query.toUpperCase().trim();
const base=(CIE10_FULL&&CIE10_FULL.length)?CIE10_FULL:CIE10_ODO;
const byCode=base.filter(([cod])=>cod.startsWith(q));
const byDesc=base.filter(([cod,desc])=>!cod.startsWith(q)&&desc.toUpperCase().includes(q));
return [...byCode,...byDesc].slice(0,8);
}

let diagItemCount=0;
let activeDiagId=null;

function addDiagItem(){
diagItemCount++;
const id=diagItemCount;
const div=document.createElement('div');
div.id=`diag-item-${id}`;
div.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:9px;padding:10px;margin-bottom:8px;position:relative';
div.innerHTML=`
<div style="display:flex;gap:8px;align-items:flex-start">
<div style="flex:0 0 110px">
<div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px">Código CIE-10</div>
<input id="dcie_${id}" type="text" placeholder="K021..." autocomplete="off"
oninput="diagCieInput(event,${id})" onfocus="diagCieInput(event,${id})"
style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-family:monospace;font-weight:700;text-transform:uppercase;color:var(--accent);outline:none;background:#f8fafc">
</div>
<div style="flex:1;position:relative">
<div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px">Descripción / Diagnóstico</div>
<input id="ddesc_${id}" type="text" placeholder="Escribe o busca por nombre..." autocomplete="off"
oninput="diagDescInput(event,${id})" onfocus="diagDescInput(event,${id})"
style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text);outline:none;background:#f8fafc;font-family:inherit">
<div id="diag-results-${id}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:0 0 10px 10px;z-index:600;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div>
</div>
<button onclick="removeDiagItem(${id})" style="margin-top:18px;width:32px;height:32px;border:1px solid #fca5a5;border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;font-size:13px;flex-shrink:0">✕</button>
</div>`;
document.getElementById('diag-items').appendChild(div);
}

function removeDiagItem(id){
  const el=document.getElementById(`diag-item-${id}`);
  if(el)el.remove();
}

function diagCieInput(e,id){
  activeDiagId=id;
  const q=e.target.value;
  const results=buscarCIE10(q);
  showDiagResults(id,results,true);
}

function diagDescInput(e,id){
  activeDiagId=id;
  const q=e.target.value;
  const results=buscarCIE10(q);
  showDiagResults(id,results,false);
}

function showDiagResults(id,results,fromCode){
  const box=document.getElementById(`diag-results-${id}`);
  if(!box)return;
  if(!results.length){box.style.display='none';return;}
  box.style.display='block';
  box.innerHTML=results.map(([cod,desc])=>`
    <div onclick="selectDiag(${id},'${cod}','${jsq(desc)}','${fromCode}')"
      style="padding:8px 12px;cursor:pointer;font-size:11px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;background:var(--card)"
      onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--card)'">
      <span style="font-weight:700;color:var(--accent);min-width:44px;font-family:monospace;font-size:12px">${cod}</span>
      <span style="color:var(--text)">${desc}</span>
    </div>`).join('');
}

function selectDiag(id,cod,desc){
  const cieEl=document.getElementById(`dcie_${id}`);
  const descEl=document.getElementById(`ddesc_${id}`);
  const box=document.getElementById(`diag-results-${id}`);
  if(cieEl)cieEl.value=cod;
  if(descEl)descEl.value=desc;
  if(box)box.style.display='none';
}

// Close dropdowns when clicking outside
document.addEventListener('click',function(e){
  document.querySelectorAll('[id^="diag-results-"]').forEach(box=>{
    if(!e.target.closest(`#${box.id}`)&&!e.target.closest('input'))box.style.display='none';
  });
});
// ═══ CIE-10 COMPLETO (carga desde CSV) ═══
function cie10Init(){
try{const s=localStorage.getItem('oa3_cie10full');if(s)CIE10_FULL=JSON.parse(s);}catch(e){}
}
function cie10Cargar(){
const input=document.createElement('input');
input.type='file';input.accept='.csv,.txt';
input.onchange=e=>{
const f=e.target.files[0];if(!f)return;
const reader=new FileReader();
reader.onload=ev=>{
const rows=parseCSV_CIE10(String(ev.target.result));
if(!rows.length){alert('No se encontraron códigos válidos en el CSV.');return;}
CIE10_FULL=rows;
try{localStorage.setItem('oa3_cie10full',JSON.stringify(rows));}catch(e){/*si no cabe, queda en memoria*/}
alert('✓ CIE-10 cargado: '+rows.length+' códigos listos para buscar.');
showPage('configuracion');
};
reader.readAsText(f);
};
input.click();
}
function splitCSVLine(line,delim){
const out=[];let cur='';let inQ=false;
for(let i=0;i<line.length;i++){const ch=line[i];
if(inQ){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else inQ=false;}else cur+=ch;}
else{if(ch==='"')inQ=true;else if(ch===delim){out.push(cur);cur='';}else cur+=ch;}}
out.push(cur);return out;
}
function parseCSV_CIE10(text){
const lines=text.split(/\r?\n/).filter(l=>l.trim());
const out=[];
for(const line of lines){
let delim=',';if(line.includes(';'))delim=';';else if(line.includes('\t'))delim='\t';
const p=splitCSVLine(line,delim);
if(p.length<2)continue;
let cod=p[0].trim().toUpperCase().replace(/"/g,'');
let desc=p[1].trim().replace(/"/g,'');
if(!cod||!desc)continue;
if(/c[oó]digo/i.test(cod)&&/descripci/i.test(desc))continue; // salta encabezado
out.push([cod,desc]);
}
return out;
}

// ═══ RECETAS MSP ECUADOR ═══
let MEDICAMENTOS_COMUNES=[
  'Amoxicilina 500mg','Amoxicilina + Ácido Clavulánico 875/125mg','Azitromicina 500mg',
  'Clindamicina 300mg','Metronidazol 500mg','Ibuprofeno 400mg','Ibuprofeno 600mg',
  'Paracetamol 500mg','Naproxeno 500mg','Ketorolaco 10mg','Diclofenaco 50mg',
  'Dexametasona 4mg','Prednisona 5mg','Cloruro de Sodio 0.9% (Suero Fisiológico)',
  'Clorhexidina 0.12% enjuague bucal','Gel de Clorhexidina 1%','Clorfenamina 4mg',
  'Loratadina 10mg','Omeprazol 20mg'
];
// ═══ CATÁLOGO CON POSOLOGÍA ESTÁNDAR (Receta en 1 toque) ═══
const CATALOGO_MEDS=[
{nombre:'Amoxicilina 500mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21,indicacion:'Tomar con alimentos'},
{nombre:'Amoxicilina + Ácido Clavulánico 875/125mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'7 días',cantidad:14,indicacion:'Tomar con alimentos'},
{nombre:'Ibuprofeno 400mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15,indicacion:'Tomar después de los alimentos'},
{nombre:'Ibuprofeno 600mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15,indicacion:'Tomar después de los alimentos'},
{nombre:'Paracetamol 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15},
{nombre:'Naproxeno 550mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'5 días',cantidad:10},
{nombre:'Ketorolaco 10mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 6 horas',duracion:'3 días',cantidad:12,indicacion:'Máximo 3 días por riesgo gástrico'},
{nombre:'Dexametasona 4mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'3 días',cantidad:3,indicacion:'Por la mañana con alimentos'},
{nombre:'Metronidazol 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21,indicacion:'No consumir alcohol'},
{nombre:'Clindamicina 300mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21},
{nombre:'Azitromicina 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'3 días',cantidad:3},
{nombre:'Clorhexidina 0.12% enjuague',forma:'Enjuague bucal',via:'Tópica',dosis:'15 ml',frecuencia:'2 veces al día',duracion:'7 días',cantidad:1,indicacion:'Enjuagar 1 min, no ingerir'},
{nombre:'Nistatina suspensión 100.000 UI/ml',forma:'Suspensión oral',via:'Oral',dosis:'5 ml',frecuencia:'4 veces al día',duracion:'7 días',cantidad:1,indicacion:'Retener en boca antes de tragar'},
{nombre:'Omeprazol 20mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 24 horas',duracion:'7 días',cantidad:7,indicacion:'En ayunas'},
{nombre:'Diclofenaco 50mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'5 días',cantidad:10},
{nombre:'Loratadina 10mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'7 días',cantidad:7}
];

function saveMeds(){
  localStorage.setItem('oa3_meds',JSON.stringify(MEDICAMENTOS_COMUNES));
}
function loadMeds(){
  const m=localStorage.getItem('oa3_meds');
  if(m)MEDICAMENTOS_COMUNES=JSON.parse(m);
}

function renderRecetas(){
  const p=curPt;
  if(!p.recetas)p.recetas=[];
  return`
  <div class="card">
    <div class="action-row">
      <div class="card-title" style="margin:0">Recetas médicas</div>
      <button class="btn-primary" onclick="openNuevaReceta()">+ Nueva receta</button>
    </div>
    ${p.recetas.length===0?`
      <div style="text-align:center;padding:40px 20px;color:var(--text3)">
        <div style="font-size:40px;margin-bottom:12px">💊</div>
        <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin recetas registradas</div>
        <div style="font-size:12px">Crea recetas médicas siguiendo el formato del Ministerio de Salud del Ecuador</div>
      </div>`
    :p.recetas.slice().reverse().map(r=>`
      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:40px;height:40px;background:#dbeafe;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">💊</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--text)">Receta N° ${String(r.id).padStart(6,'0')}</div>
            <div style="font-size:11px;color:var(--text3)">${fmtDate(r.fecha)} · ${r.medicamentos.length} medicamento${r.medicamentos.length!==1?'s':''} · Dr. ${esc(r.medico)}</div>
            ${(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod,desc:r.diagnostico}]).filter(d=>d.cod||d.desc).map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;margin-top:3px;margin-right:4px">${d.cod?`<span style="font-family:monospace;font-weight:700;color:var(--accent);font-size:10px;background:#e8f0fe;padding:1px 6px;border-radius:4px">${esc(d.cod)}</span>`:''}<span style="font-size:10px;color:var(--text2)">${esc(d.desc||'')}</span></span>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-sm" style="font-size:11px;padding:4px 10px" onclick="verReceta(${r.id})">Ver / Imprimir</button>
            <button class="del-btn" onclick="delReceta(${r.id})">✕</button>
          </div>
        </div>
        <div style="margin-top:10px;padding:8px 12px;background:var(--bg);border-radius:8px">
          ${r.medicamentos.map((m,i)=>`<div style="font-size:11px;color:var(--text2);padding:2px 0"><strong>${i+1}.</strong> ${esc(m.nombre)} ${esc(m.dosis)} — ${esc(m.frecuencia)} por ${esc(m.duracion)}</div>`).join('')}
        </div>
      </div>`).join('')}
  </div>
  <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
    <div style="font-size:18px">⚕️</div>
    <div style="font-size:12px;color:#1e40af">Las recetas siguen el formato oficial del Ministerio de Salud Pública del Ecuador. Solo pueden ser emitidas por profesionales de salud habilitados.</div>
  </div>`;
}

function openNuevaReceta(){
  const profesional=document.getElementById('logoProfesional').textContent;
  openModal(`<div class="modal-title">💊 Nueva Receta — Formato MSP Ecuador</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    <div class="form-group"><label>Fecha</label><input id="f_rdate" type="date" value="${today()}"></div>
    <div class="form-group"><label>Tipo</label><select id="f_rtipo"><option value="agudo">AGUDA</option><option value="cronico">CRÓNICA</option></select></div>
    <div class="form-group"><label>Médico prescriptor</label><input id="f_rmed" value="${esc(profesional)}"></div>
    <div class="form-group"><label>Especialidad</label><input id="f_resp" value="Odontología General"></div>
    <div class="form-group"><label>Reg. SENESCYT</label><input id="f_rreg" placeholder="N° registro"></div>
    <div class="form-group"><label>N° Historia Clínica</label><input id="f_rhc" placeholder="H.C."></div>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Diagnósticos (CIE-10)</div>
</div>
    <div id="diag-items"></div>
    <button onclick="addDiagItem()" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar diagnóstico</button>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:10px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Rp/ Medicamentos</div>
<button onclick="addMedItem()" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar medicamento</button>
</div>
<div id="med-items"></div>
</div>
  <div class="form-group" style="margin-bottom:10px"><label>Indicaciones para el paciente</label>
    <textarea id="f_rind" style="min-height:60px" placeholder="Tomar con alimentos, completar el tratamiento, no mezclar con alcohol..."></textarea></div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" onclick="saveReceta()">Emitir receta</button>
  </div>`);
  document.querySelector('.modal').style.width='650px';
  addDiagItem(); addMedItem();
}

function numToLetras(n){
  const u=['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  const d=['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  n=parseInt(n)||0;
  if(n<=20)return u[n];
  if(n<30)return'VEINTI'+u[n-20];
  if(n<100)return d[Math.floor(n/10)]+(n%10?' Y '+u[n%10]:'');
  if(n===100)return'CIEN';
  if(n<200)return('CIENTO '+numToLetras(n-100)).trim();
  const c=['','','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  if(n<1000)return(c[Math.floor(n/100)]+' '+numToLetras(n%100)).trim();
  return String(n);
}

let medItemCount=0;let factItemCount=0;
function addMedItem(catIdx){
medItemCount++;
const id=medItemCount;
const c=(typeof catIdx==='number')?CATALOGO_MEDS[catIdx]:null;
const dl=`<datalist id="med-dl-${id}">${MEDICAMENTOS_COMUNES.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>`;
const div=document.createElement('div');
div.id=`med-item-${id}`;
div.style.cssText='background:var(--card);border:1px solid '+(c?'var(--accent)':'var(--border)')+';border-radius:10px;padding:12px;margin-bottom:10px';
div.innerHTML=dl+`
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
<div style="font-size:12px;font-weight:700;color:var(--accent)">Medicamento ${id}${c?' · ⚡ posología auto':''}</div>
<button onclick="document.getElementById('med-item-${id}').remove()" style="padding:2px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fee2e2;color:#991b1b;cursor:pointer;font-size:11px">Eliminar</button>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;margin-bottom:8px">
<div class="form-group" style="margin:0"><label>Nombre genérico DCI (sin abreviaturas) *</label>
<input list="med-dl-${id}" id="mn_${id}" value="${c?c.nombre:''}" style="font-weight:600"></div>
<div class="form-group" style="margin:0"><label>Forma farmacéutica</label>
<select id="mff_${id}">${['Tableta','Cápsula','Jarabe','Suspensión oral','Solución inyectable','Gel tópico','Crema','Gotas','Enjuague bucal','Comprimido'].map(f=>`<option${c&&c.forma===f?' selected':''}>${f}</option>`).join('')}</select></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
<div class="form-group" style="margin:0"><label>Vía de administración</label>
<select id="mv_${id}">${['Oral','Tópica','Sublingual','Inyectable IM','Inyectable IV','Ótica','Rectal'].map(f=>`<option${c&&c.via===f?' selected':''}>${f}</option>`).join('')}</select></div>
<div class="form-group" style="margin:0"><label>Cantidad (números)</label>
<input id="mqn_${id}" type="number" min="1" value="${c?c.cantidad:''}" oninput="document.getElementById('mql_${id}').value=numToLetras(this.value)"></div>
<div class="form-group" style="margin:0"><label>Cantidad en letras (auto)</label>
<input id="mql_${id}" value="${c?numToLetras(c.cantidad):''}" style="text-transform:uppercase;font-size:11px"></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
<div class="form-group" style="margin:0"><label>Dosis por toma</label><input id="md_${id}" value="${c?c.dosis:''}"></div>
<div class="form-group" style="margin:0"><label>Frecuencia</label>
<select id="mf_${id}">${['Cada 6 horas','Cada 8 horas','Cada 12 horas','Cada 24 horas','2 veces al día','3 veces al día','4 veces al día','Según dolor','En caso necesario'].map(f=>`<option${c&&c.frecuencia===f?' selected':''}>${f}</option>`).join('')}</select></div>
</div>
<div class="form-group" style="margin:0"><label>Duración del tratamiento</label>
<input id="mdu_${id}" value="${c?c.duracion:''}"></div>
${c&&c.indicacion?`<div style="margin-top:8px;font-size:11px;color:var(--text2);background:var(--bg);border-radius:6px;padding:6px 8px">💡 ${esc(c.indicacion)}</div>`:''}`;
document.getElementById('med-items').appendChild(div);
}

function saveReceta(){
const diagnosticos=[];
document.querySelectorAll('#diag-items > div').forEach(row=>{
const ci=row.querySelector('input[id^="dcie_"]');
const di=row.querySelector('input[id^="ddesc_"]');
const cod=(ci&&ci.value?ci.value.trim().toUpperCase():'');
const desc=(di&&di.value?di.value.trim():'');
if(cod||desc)diagnosticos.push({cod:cod,desc:desc});
});
const meds=[];
document.querySelectorAll('#med-items > div').forEach(row=>{
const nombre=(row.querySelector('input[id^="mn_"]')?.value||'').trim();
if(!nombre)return;
meds.push({nombre,formaFarmaceutica:row.querySelector('select[id^="mff_"]')?.value||'',concentracion:row.querySelector('input[id^="mc_"]')?.value||'',via:row.querySelector('select[id^="mv_"]')?.value||'Oral',cantidadNum:row.querySelector('input[id^="mqn_"]')?.value||'',cantidadLetras:row.querySelector('input[id^="mql_"]')?.value||'',dosis:row.querySelector('input[id^="md_"]')?.value||'',frecuencia:row.querySelector('select[id^="mf_"]')?.value||'',duracion:row.querySelector('input[id^="mdu_"]')?.value||''});
});
if(!meds.length){alert('Agrega al menos un medicamento');return;}
if(!curPt.recetas)curPt.recetas=[];
curPt.recetas.push({id:nextRecetaId++,fecha:v('f_rdate'),tipo:v('f_rtipo')||'agudo',medico:v('f_rmed'),especialidad:v('f_resp'),registro:v('f_rreg'),hc:v('f_rhc'),diagnosticos,cie10cod:diagnosticos[0]?.cod||'',diagnostico:diagnosticos[0]?.desc||'',indicaciones:v('f_rind'),medicamentos:meds,paciente:curPt.name,cedula:curPt.cedula,edad:calcAge(curPt.birthdate)});
save();closeModal();medItemCount=0;diagItemCount=0;renderTab();
}

function verReceta(id){
  const r=curPt.recetas.find(x=>x.id===id);if(!r)return;
  _currentReceta=r;
  const diags=(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod||'',desc:r.diagnostico||''}]).filter(d=>d.cod||d.desc);
  const tipoLabel=(r.tipo==='cronico')?'CRÓNICA':'AGUDA';
  openModal(`<div class="modal-title">💊 Receta Médica — N° ${String(r.id).padStart(6,'0')}</div>
  <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(r.paciente)}</div>
        <div style="font-size:11px;color:var(--text3)">${fmtDate(r.fecha)} · Dr. ${esc(r.medico)} · ${esc(r.especialidad)}</div>
      </div>
      <span style="font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;background:${r.tipo==='cronico'?'#dbeafe':'#dcfce7'};color:${r.tipo==='cronico'?'#1e40af':'#166534'}">${tipoLabel}</span>
    </div>
    ${diags.length?`<div style="font-size:11px;color:var(--text2);margin-bottom:10px">📋 <strong>Diagnóstico:</strong> ${diags.map(d=>`${d.cod?esc(d.cod)+' — ':''}${esc(d.desc)}`).join(' | ')}</div>`:''}
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Rp/ Medicamentos</div>
    ${r.medicamentos.map((m,i)=>`
      <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
        <div style="font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase">${i+1}. ${esc(m.nombre)} ${m.concentracion?esc(m.concentracion):''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${esc(m.formaFarmaceutica||m.forma||'')} · Vía ${esc(m.via||'Oral')}</div>
        <div style="display:flex;gap:16px;margin-top:6px;font-size:11px;color:var(--text2)">
          <span>💉 ${esc(m.dosis||'—')}</span>
          <span>⏰ ${esc(m.frecuencia||'—')}</span>
          <span>📅 ${esc(m.duracion||'—')}</span>
          ${m.cantidadNum?`<span>📦 ${esc(m.cantidadNum)} und. (${esc(m.cantidadLetras||'')})</span>`:''}
        </div>
      </div>`).join('')}
    ${r.indicaciones?`<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px;font-size:12px;color:#0369a1;margin-top:4px"><strong>Indicaciones:</strong> ${esc(r.indicaciones)}</div>`:''}
  </div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cerrar</button>
    <button class="btn-primary" onclick="imprimirReceta()">🖨️ Imprimir receta A4</button>
  </div>`);
  document.querySelector('.modal').style.width='580px';
}


function imprimirReceta(){

  function horarioPaciente(freq){
if(!freq)return'—';
if(freq.includes('6'))return'Cada 6 horas · Mañana · Mediodía · Tarde · Noche';
if(freq.includes('8'))return'Cada 8 horas · Mañana · Tarde · Noche';
if(freq.includes('12'))return'Cada 12 horas · Mañana · Noche';
if(freq.includes('24')||/1 vez/i.test(freq))return'Cada 24 horas · Una vez al día';
if(/2 veces/i.test(freq))return'2 veces al día · Mañana · Noche';
if(/3 veces/i.test(freq))return'3 veces al día · Mañana · Tarde · Noche';
return esc(freq);
}

const r=_currentReceta;
if(!r)return;
const clinica=esc(document.getElementById('logoText').textContent);
const logoHtml=logoImg?`<img src="${esc(logoImg)}" style="width:100%;height:100%;object-fit:contain">`:`<div style="width:100%;height:100%;background:#1e3a5f;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">🦷</div>`;
const numStr=String(r.id).padStart(6,'0');
const dia=esc(String(r.fecha.split('-')[2]).padStart(2,'0'));
const mes=esc(r.fecha.split('-')[1]);
const anio=esc(r.fecha.split('-')[0]);
const edadAnios=r.edad||'—';
const tipoLabel=(r.tipo==='cronico')?'CRÓNICA':'AGUDA';
const diags=(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod||'',desc:r.diagnostico||''}]).filter(d=>d.cod||d.desc);
const compact=r.medicamentos.length>3;
const medsHtml=r.medicamentos.map((m,i)=>`
<tr>
<td style="text-align:center;font-weight:700;color:#1e3a5f">${i+1}</td>
<td><strong style="text-transform:uppercase">${esc(m.nombre)}</strong>${m.concentracion?' · '+esc(m.concentracion):''}<br><span style="color:#64748b">${esc(m.formaFarmaceutica||m.forma||'Tableta')}</span></td>
<td style="text-align:center">${esc(m.via||'Oral')}</td>
<td style="text-align:center">${esc(m.dosis||m.concentracion||'—')}</td>
<td style="text-align:center">${esc(m.frecuencia||'—')}</td>
<td style="text-align:center">${esc(m.duracion||'—')}</td>
<td style="text-align:center">${esc(m.cantidadNum||'—')}${m.cantidadLetras?` (${esc(m.cantidadLetras)})`:''}</td>
</tr>`).join('');
const pautaHtml=r.medicamentos.map((m,i)=>`<div style="margin-bottom:3px;font-size:8.5px;line-height:1.35"><strong style="color:#1e3a5f">${i+1}. ${esc(m.nombre)}:</strong> ${esc(m.dosis||'—')} · ${esc(m.frecuencia||'—')} · ${esc(m.duracion||'—')}</div>`).join('');
const instrHtml=r.medicamentos.map((m,i)=>`
<tr>
<td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:600">${esc(m.nombre)} ${esc(m.concentracion||'')}</td>
<td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${esc(m.dosis||'—')}</td>
<td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${horarioPaciente(m.frecuencia)}</td>
<td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${esc(m.duracion||'—')}</td>
</tr>`).join('');
const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Receta Médica — ${clinica}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:#fff;font-size:10px}
.page{width:210mm;margin:0 auto;padding:8mm 10mm 6mm}
.header{display:flex;align-items:center;gap:10px;padding-bottom:6px;border-bottom:2px solid #1e3a5f;margin-bottom:7px}
.logo-box{width:42px;height:42px;flex-shrink:0;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0}
.clinic-name{font-size:13px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.04em}
.clinic-sub{font-size:8.5px;color:#64748b;margin-top:1px;line-height:1.4}
.header-right{margin-left:auto;text-align:right}
.header-title{font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em}
.tipo-badge{display:inline-block;font-size:8.5px;font-weight:700;padding:1px 8px;border-radius:20px;margin-top:2px;letter-spacing:.04em;background:${r.tipo==='cronico'?'#dbeafe':'#dcfce7'};color:${r.tipo==='cronico'?'#1e40af':'#166534'}}
.fecha-txt{font-size:8.5px;color:#64748b;margin-top:2px}
.sec-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:#1e3a5f;padding:3px 8px}
.pt-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1e3a5f;border-top:none;overflow:hidden;margin-bottom:7px}
.pt-cell{padding:3px 8px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;font-size:9.5px}
.pt-cell:nth-child(even){border-right:none}
.pt-cell:last-child,.pt-cell:nth-last-child(2){border-bottom:none}
.pt-label{font-size:7.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:1px}
.pt-val{font-weight:600;color:#0f172a}
.rp-title{font-size:14px;font-weight:800;color:#1e3a5f;font-style:italic;margin:3px 0}
.rp-note{font-size:8px;color:#64748b;font-style:italic;margin-top:3px}
table.meds{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:7px}
.meds th{background:#1e3a5f;color:#fff;padding:3px 5px;font-size:7.5px;text-transform:uppercase;letter-spacing:.03em;text-align:left}
.meds td{padding:3px 5px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.two-col{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;margin-bottom:7px}
.prescriptor{padding:7px 8px;border-right:1px solid #1e3a5f}
.pauta{padding:7px 8px}
.col-title{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:#1e3a5f;padding:2px 6px;margin:-7px -8px 6px}
.sign-space{height:24px}
.sign-line{border-top:1px solid #0f172a;padding-top:3px;font-size:8px;color:#64748b}
.ind-box{border:1px solid #1e3a5f;border-radius:4px;padding:5px 8px;margin-bottom:7px}
.ind-title{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.06em;margin-bottom:2px}
.ind-txt{font-size:9px;line-height:1.5}
.footer-note{font-size:7.5px;color:#94a3b8;text-align:center;margin-bottom:6px}
.cut-line{border:none;border-top:1.5px dashed #94a3b8;margin:6px 0;position:relative}
.cut-label{position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;padding:0 8px;font-size:8px;color:#94a3b8;white-space:nowrap}
.patient-box{border:1px solid #0ea5e9;border-radius:6px;padding:7px 8px}
.patient-title{font-size:11px;font-weight:800;color:#0ea5e9;margin-bottom:2px}
.patient-sub{font-size:8px;color:#0369a1;margin-bottom:5px}
table.ptab{width:100%;border-collapse:collapse;font-size:8.5px}
.ptab th{background:#0ea5e9;color:#fff;padding:3px 6px;font-size:7.5px;font-weight:700;text-transform:uppercase;text-align:left}
.ptab td{padding:3px 6px;border:1px solid #cbd5e1;vertical-align:top}
.patient-foot{font-size:7.5px;color:#64748b;margin-top:4px;text-align:center}
.imp-box{margin-top:5px;padding:4px 6px;background:#f0f9ff;border-radius:4px;border:1px solid #bae6fd;font-size:8.5px;line-height:1.4}
.page.compact .meds td{padding:2px 4px}
.page.compact .ptab td{padding:2px 4px}
.page.compact .sign-space{height:18px}
@media print{body{margin:0}.page{padding:6mm 8mm 5mm}}
</style></head><body>
<div class="page${compact?' compact':''}">
<div class="header">
<div class="logo-box">${logoHtml}</div>
<div>
<div class="clinic-name">${clinica}</div>
<div class="clinic-sub">${esc(clinicaDireccion||'')} ${clinicaTelefono?'· Tel: '+esc(clinicaTelefono):''}${clinicaRUC?' · RUC: '+esc(clinicaRUC):''}</div>
</div>
<div class="header-right">
<div class="header-title">Receta Médica<br>Ministerio de Salud Pública</div>
<div><span class="tipo-badge">PRESCRIPCIÓN ${tipoLabel}</span></div>
<div class="fecha-txt">Fecha: ${dia}/${mes}/${anio}</div>
<div style="font-size:12px;font-weight:800;color:#1e3a5f;font-family:'Courier New',monospace;margin-top:4px">N° ${String(r.id).padStart(6,'0')}</div>
</div>
</div>
<div class="sec-title">Datos del Paciente</div>
<div class="pt-grid">
<div class="pt-cell" style="grid-column:1/-1"><span class="pt-label">Nombres y Apellidos</span><span class="pt-val" style="font-size:11px">${esc(r.paciente)}</span></div>
<div class="pt-cell"><span class="pt-label">Documento de Identidad</span><span class="pt-val">${esc(r.cedula||'—')}</span></div>
<div class="pt-cell"><span class="pt-label">Historia Clínica</span><span class="pt-val">${esc(r.hc||'—')}</span></div>
<div class="pt-cell"><span class="pt-label">Edad</span><span class="pt-val">${edadAnios} años</span></div>
<div class="pt-cell"><span class="pt-label">Diagnóstico CIE-10</span><span class="pt-val">${diags.map(d=>`${d.cod?esc(d.cod)+' - ':''}${esc(d.desc)}`).join(' | ')||'—'}</span></div>
</div>
<div class="sec-title">Datos del Medicamento — Prescripción ${tipoLabel}</div>
<div class="rp-note">Nombre genérico o DCI, concentración, forma farmacéutica, cantidad en números y letras. Prohibido el uso de abreviaturas.</div>
<div class="rp-title">Rp/</div>
<table class="meds">
<thead><tr><th style="width:14px">#</th><th>Medicamento</th><th>Vía</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Cantidad</th></tr></thead>
<tbody>${medsHtml}</tbody>
</table>
<div class="two-col">
<div class="prescriptor">
<div class="col-title">Datos del Prescriptor</div>
<div style="font-size:10px;font-weight:700">${esc(r.medico)}</div>
<div style="font-size:8.5px;color:#475569">${esc(r.especialidad)}</div>
${r.registro?`<div style="font-size:8.5px;color:#475569">Reg. SENESCYT: ${esc(r.registro)}</div>`:''}
<div class="sign-space"></div>
<div class="sign-line">Firma y sello del prescriptor</div>
</div>
<div class="pauta">
<div class="col-title">Pauta de Administración</div>
${pautaHtml}
</div>
</div>
${r.indicaciones?`<div class="ind-box"><div class="ind-title">Indicaciones generales</div><div class="ind-txt">${esc(r.indicaciones)}</div></div>`:''}
<div class="footer-note">Receta válida por 30 días · Servicio odontológico IVA 0% (Art. 56 LRTI Ecuador) · ${clinica}</div>
<div class="cut-line"><span class="cut-label">✂ Recortar y entregar al paciente</span></div>
<div class="patient-box">
<div class="patient-title">📋 Mis medicamentos — ${esc(r.paciente)}</div>
<div class="patient-sub">Receta N° ${String(r.id).padStart(6,'0')} · Fecha: ${dia}/${mes}/${anio} · Dr. ${esc(r.medico)} · ${esc(r.especialidad)}</div>
<table class="ptab">
<thead><tr><th>Medicamento</th><th style="text-align:center">Cantidad por toma</th><th style="text-align:center">Horario</th><th style="text-align:center">Por cuánto tiempo</th></tr></thead>
<tbody>${instrHtml}</tbody>
</table>
${r.indicaciones?`<div class="imp-box"><strong>⚠️ IMPORTANTE:</strong> ${esc(r.indicaciones)}</div>`:''}
<div class="patient-foot">Conserve este comprobante · Para dudas llame a: ${clinicaTelefono?esc(clinicaTelefono):clinica}</div>
</div>
</div>
<script>window.onload=function(){window.print()}<\/script>
${'</bo'+'dy></html>'}`;
const w=safeOpen('','_blank','width=900,height=950');
if(!w)return;
w.document.write(html);
w.document.close();
}

let _currentReceta=null;

function delReceta(id){
  if(!confirm('¿Eliminar esta receta?'))return;
  curPt.recetas=curPt.recetas.filter(x=>x.id!==id);
  save();renderTab();
}

// ═══ PRESUPUESTOS ═══
function renderPresupuestos(){
  const p=curPt;
  if(!p.presupuestos)p.presupuestos=[];
  const cta=resumenCuenta(p),totalPresup=cta.aprobado,totalPagado=cta.pagado;
  return`
  ${p.presupuestos.length?`
  <div class="grid3" style="margin-bottom:14px">
    <div class="kpi"><div class="kpi-label">Presupuesto aprobado</div><div class="kpi-val" style="color:var(--accent)">${money(totalPresup)}</div>${cta.borrador>0?`<div class="kpi-sub">Borradores sin aprobar: ${money(cta.borrador)} (no incluidos)</div>`:''}</div>
    <div class="kpi"><div class="kpi-label">Total pagado</div><div class="kpi-val" style="color:var(--green)">${money(totalPagado)}</div></div>
    <div class="kpi"><div class="kpi-label">Saldo del presupuesto aprobado</div><div class="kpi-val" style="color:${cta.aprobadoPendiente>0?'var(--red)':'var(--green)'}">${money(cta.aprobadoPendiente)}</div></div>
  </div>`:''}
  <div class="card">
    <div class="action-row">
      <div class="card-title" style="margin:0">Presupuestos</div>
      <button class="btn-primary" onclick="openNuevoPresupuesto()">+ Nuevo presupuesto</button>
    </div>
    ${p.presupuestos.length===0?`
      <div style="text-align:center;padding:32px 20px;color:var(--text3)">
        <div style="font-size:36px;margin-bottom:10px">💰</div>
        <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:4px">Sin presupuestos</div>
        <div style="font-size:12px">Crea un presupuesto formal para presentar al paciente antes del tratamiento</div>
      </div>`
    :p.presupuestos.slice().reverse().map(pr=>{
      const pct=pr.total>0?Math.min(100,Math.round((totalPagado/pr.total)*100)):0;
      const statusColor={borrador:'#64748b',aprobado:'#10b981',rechazado:'#ef4444'}[pr.estado]||'#64748b';
      const statusBg={borrador:'#f1f5f9',aprobado:'#d1fae5',rechazado:'#fee2e2'}[pr.estado]||'#f1f5f9';
      const statusLabel={borrador:'Borrador',aprobado:'✓ Aprobado',rechazado:'✕ Rechazado'}[pr.estado]||'Borrador';
      return`
      <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-size:13px;font-weight:700;color:var(--text)">Presupuesto N° ${String(pr.id).padStart(4,'0')}</div>
              <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:${statusBg};color:${statusColor}">${statusLabel}</span>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">${fmtDate(pr.fecha)} · ${pr.items.length} ítem${pr.items.length!==1?'s':''} · Total: <strong>$${pr.total.toFixed(2)}</strong></div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn-sm" style="font-size:11px;padding:4px 10px" onclick="verPresupuesto(${pr.id})">👁 Ver</button>
            ${pr.estado==='borrador'?`
              <button class="btn-sm" style="font-size:11px;padding:4px 10px;background:#d1fae5;color:#065f46;border-color:#6ee7b7" onclick="aprobarPresupuesto(${pr.id})">✓ Aprobar</button>
              <button class="btn-sm" style="font-size:11px;padding:4px 10px;background:#fee2e2;color:#991b1b;border-color:#fca5a5" onclick="rechazarPresupuesto(${pr.id})">✕ Rechazar</button>`:''}
            <button class="del-btn" onclick="eliminarPresupuesto(${pr.id})">✕</button>
          </div>
        </div>
        ${pr.estado==='aprobado'?`
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:4px">
            <span>Progreso de pago</span>
            <span><strong>$${totalPagado.toFixed(2)}</strong> de $${pr.total.toFixed(2)} (${pct}%)</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${pct>=100?'var(--green)':'var(--accent)'};border-radius:4px;transition:width .3s"></div>
          </div>
        </div>`:''}
        <div style="font-size:11px;color:var(--text3)">${pr.items.slice(0,3).map(it=>`${esc(it.nombre)} (${it.qty})`).join(' · ')}${pr.items.length>3?` · +${pr.items.length-3} más`:''}</div>
      </div>`;
    }).join('')}
  </div>`;
}

let presupItemCount=0;
function openNuevoPresupuesto(){
  presupItemCount=0;
  openModal(`<div class="modal-title">💰 Nuevo presupuesto</div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_pfd" type="date" value="${today()}"></div><div class="form-group"><label>Validez</label><select id="f_pfval"><option value="15">15 días</option><option value="30" selected>30 días</option><option value="60">60 días</option><option value="90">90 días</option></select></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Observaciones / Plan de tratamiento</label><input id="f_pfobs" placeholder="Descripción del plan, condiciones, acuerdos..."></div></div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Ítems del presupuesto</div>
      <button onclick="addPresupItem()" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar ítem</button>
    </div>
    <div id="presup-items"></div>
    ${servicios.length?`<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
      <div style="font-size:10px;color:var(--text3);margin-bottom:6px">⚡ Del catálogo:</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">
        ${servicios.map(s=>`<button onclick="addPresupItemFromSvc('${jsq(s.nombre)}',${s.precio})" style="padding:4px 10px;border:1px solid var(--border);border-radius:16px;background:var(--card);font-size:11px;cursor:pointer;color:var(--text)">${esc(s.nombre)} <span style="color:var(--green);font-weight:600">$${s.precio.toFixed(2)}</span></button>`).join('')}
      </div></div>`:''}
  </div>
  <div class="form-row"><div class="form-group"><label>Descuento ($)</label><input id="f_pfdesc" type="number" min="0" step="0.01" value="0" oninput="recalcPresup()"></div><div class="form-group"><label>Total</label><div id="f_pftotal" style="font-size:22px;font-weight:700;color:var(--accent);padding:8px 0">$0.00</div></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="savePresupuesto()">Crear presupuesto</button></div>`);
  document.querySelector('.modal').style.width='640px';
  addPresupItem();
}

function addPresupItem(nombre='',precio=0,qty=1){
  presupItemCount++;
  const id=presupItemCount;
  const div=document.createElement('div');
  div.id=`pi-${id}`;
  div.style.cssText='display:grid;grid-template-columns:2fr 1fr 70px auto;gap:8px;align-items:end;margin-bottom:8px';
  div.innerHTML=`
    <div class="form-group" style="margin:0"><label style="font-size:10px">Servicio / Descripción *</label><input id="pin_${id}" value="${nombre}" placeholder="Obturación, extracción..." oninput="recalcPresup()"></div>
    <div class="form-group" style="margin:0"><label style="font-size:10px">Precio unitario</label><input id="pip_${id}" type="number" min="0" step="0.01" value="${precio}" oninput="recalcPresup()"></div>
    <div class="form-group" style="margin:0"><label style="font-size:10px">Cant.</label><input id="piq_${id}" type="number" min="1" value="${qty}" oninput="recalcPresup()"></div>
    <button onclick="document.getElementById('pi-${id}').remove();recalcPresup()" style="height:36px;padding:0 10px;border:1px solid #fca5a5;border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;margin-bottom:1px">✕</button>`;
  document.getElementById('presup-items').appendChild(div);
  recalcPresup();
}

function addPresupItemFromSvc(nombre,precio){ addPresupItem(nombre,precio,1); }

function recalcPresup(){
  let sub=0;
  document.querySelectorAll('[id^="pi-"]').forEach(row=>{
    const id=row.id.replace('pi-','');
    const p=parseMonto(document.getElementById(`pip_${id}`)?.value)||0;
    const q=parseInt(document.getElementById(`piq_${id}`)?.value)||1;
    sub=addM(sub,mulM(p,q));
  });
  const desc=Math.min(parseMonto(document.getElementById('f_pfdesc')?.value)||0,sub);
  const el=document.getElementById('f_pftotal');
  if(el)el.textContent=money(subM(sub,desc));
}

function savePresupuesto(){
  const items=[];
  document.querySelectorAll('[id^="pi-"]').forEach(row=>{
    const id=row.id.replace('pi-','');
    const nombre=document.getElementById(`pin_${id}`)?.value?.trim();
    if(!nombre)return;
    const precio=parseMonto(document.getElementById(`pip_${id}`)?.value)||0;
    const qty=parseInt(document.getElementById(`piq_${id}`)?.value)||1;
    items.push({nombre,precio,qty,subtotal:mulM(precio,qty)});
  });
  if(!items.length){alert('Agrega al menos un ítem al presupuesto');return;}
  const sub=items.reduce((s,i)=>addM(s,i.subtotal),0);
  const desc=Math.min(parseMonto(v('f_pfdesc'))||0,sub);
  if(!curPt.presupuestos)curPt.presupuestos=[];
  curPt.presupuestos.push({id:nextPresupId++,fecha:v('f_pfd'),validez:parseInt(v('f_pfval'))||30,observaciones:v('f_pfobs'),items,descuento:desc,subtotal:sub,total:subM(sub,desc),estado:'borrador',fechaAprobacion:null,firmaPaciente:''});
  save();closeModal();presupItemCount=0;renderTab();
}

function verPresupuesto(id){
  const pr=curPt.presupuestos.find(x=>x.id===id);if(!pr)return;
  const clinicaNombre=document.getElementById('logoText').textContent;
  const profesional=document.getElementById('logoProfesional').textContent;
  const totalPagado=curPt.payments.reduce((s,py)=>addM(s,py.amount),0);
  const pct=pr.total>0?Math.min(100,Math.round((totalPagado/pr.total)*100)):0;
  const statusColor={borrador:'#64748b',aprobado:'#10b981',rechazado:'#ef4444'}[pr.estado];
  const statusLabel={borrador:'BORRADOR',aprobado:'APROBADO ✓',rechazado:'RECHAZADO'}[pr.estado];
  openModal(`<div class="modal-title">💰 Presupuesto N° ${String(pr.id).padStart(4,'0')}</div>
  <div id="presup-print-area" style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;color:#0f172a;font-size:12px;font-family:Arial,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0f172a">
      <div>
        <div style="font-size:16px;font-weight:700">${esc(clinicaNombre)}</div>
        <div style="font-size:11px;color:#64748b">${esc(profesional)} · RUC: ${esc(clinicaRUC||'—')}</div>
        <div style="font-size:11px;color:#64748b">${esc(clinicaDireccion||'')} ${clinicaTelefono?'· Tel: '+esc(clinicaTelefono):''}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700">PRESUPUESTO DENTAL</div>
        <div style="font-size:13px;font-weight:700;color:${statusColor};margin-top:2px">${statusLabel}</div>
        <div style="font-size:11px;color:#64748b">N° ${String(pr.id).padStart(4,'0')} · ${fmtDate(pr.fecha)}</div>
        <div style="font-size:11px;color:#64748b">Válido por ${esc(pr.validez)} días</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;padding:10px;background:#f8fafc;border-radius:8px">
      <div><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Paciente</div><div style="font-size:13px;font-weight:600">${esc(curPt.name)}</div></div>
      <div><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Cédula</div><div style="font-size:13px;font-weight:600">${esc(curPt.cedula||'—')}</div></div>
      ${pr.observaciones?`<div style="grid-column:1/-1"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Plan de tratamiento</div><div style="font-size:12px">${esc(pr.observaciones)}</div></div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
      <thead><tr style="background:#f1f5f9">
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Descripción</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Cant.</th>
        <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">P. Unitario</th>
        <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Total</th>
      </tr></thead>
      <tbody>
        ${pr.items.map(it=>`<tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:9px 10px">${esc(it.nombre)}</td>
          <td style="padding:9px 10px;text-align:center">${it.qty}</td>
          <td style="padding:9px 10px;text-align:right">$${it.precio.toFixed(2)}</td>
          <td style="padding:9px 10px;text-align:right;font-weight:600">$${it.subtotal.toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="text-align:right;margin-bottom:14px;padding:10px;background:#f8fafc;border-radius:8px;display:inline-block;min-width:220px;float:right">
      <div style="font-size:12px;color:#64748b;margin-bottom:3px">Subtotal: $${pr.subtotal.toFixed(2)}</div>
      ${pr.descuento?`<div style="font-size:12px;color:#10b981;margin-bottom:4px">Descuento: -$${pr.descuento.toFixed(2)}</div>`:''}
      <div style="font-size:20px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;padding-top:6px">TOTAL: $${pr.total.toFixed(2)}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">IVA 0% — Servicio de salud (Art. 56 LRTI Ecuador)</div>
    </div>
    <div style="clear:both"></div>
    ${pr.estado==='aprobado'?`
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin-bottom:14px;font-size:11px;color:#15803d">
      ✓ Aprobado el ${fmtDate(pr.fechaAprobacion)}${pr.firmaPaciente?' · Firmado por: '+esc(pr.firmaPaciente):''}
    </div>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px">
        <span>Progreso de pago</span><span>$${totalPagado.toFixed(2)} de $${pr.total.toFixed(2)} (${pct}%)</span>
      </div>
      <div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>=100?'#10b981':'#0ea5e9'};border-radius:5px"></div>
      </div>
    </div>`:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
      <div style="text-align:center"><div style="height:44px"></div><div style="border-top:1px solid #0f172a;padding-top:6px">
        <div style="font-size:12px;font-weight:700">${esc(curPt.name)}</div>
        <div style="font-size:10px;color:#64748b">Firma del paciente · C.I. ${esc(curPt.cedula||'—')}</div>
      </div></div>
      <div style="text-align:center"><div style="height:44px"></div><div style="border-top:1px solid #0f172a;padding-top:6px">
        <div style="font-size:12px;font-weight:700">${esc(profesional)}</div>
        <div style="font-size:10px;color:#64748b">Firma del profesional</div>
      </div></div>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cerrar</button>
    ${pr.estado==='borrador'?`<button class="btn-primary" style="background:var(--green)" onclick="closeModal();aprobarPresupuesto(${pr.id})">✓ Aprobar</button>`:''}
    <button class="btn-primary" onclick="imprimirPresupuesto()">🖨️ Imprimir</button>
  </div>`);
  document.querySelector('.modal').style.width='700px';
}

function imprimirPresupuesto(){
  const area=document.getElementById('presup-print-area');
  if(!area)return;

  const w=safeOpen('','_blank','width=820,height=900');

  const cierreBody='</bo'+'dy></html>';

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Presupuesto Dental</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:28px;color:#0f172a}
    @media print{body{padding:12px}}
  </style>
  </head><body>${area.innerHTML}${cierreBody}`);

  w.document.close();
  setTimeout(()=>w.print(),400);
}

function aprobarPresupuesto(id){
  const pr=curPt.presupuestos.find(x=>x.id===id);if(!pr)return;
  openModal(`<div class="modal-title">✓ Aprobar presupuesto</div>
  <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Confirma que <strong>${esc(curPt.name)}</strong> aprobó el presupuesto N° ${String(pr.id).padStart(4,'0')} por <strong>$${pr.total.toFixed(2)}</strong>.</p>
  <div class="form-row form-full"><div class="form-group"><label>Nombre del paciente / representante que firma</label><input id="f_pfirma" value="${esc(curPt.name)}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Fecha de aprobación</label><input id="f_pfecha" type="date" value="${today()}"></div></div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cancelar</button>
    <button class="btn-primary" style="background:var(--green)" onclick="confirmarAprobacion(${id})">✓ Confirmar</button>
  </div>`);
}

function confirmarAprobacion(id){
  const pr=curPt.presupuestos.find(x=>x.id===id);if(!pr)return;
  pr.estado='aprobado';pr.fechaAprobacion=v('f_pfecha');pr.firmaPaciente=v('f_pfirma');
  if(confirm('¿Agregar los ítems del presupuesto como tratamientos pendientes automáticamente?')){
    const factor=pr.subtotal>0?pr.total/pr.subtotal:1;let acum=0;
    pr.items.forEach((it,i)=>{
      let costo=r2(it.subtotal*factor);
      if(i===pr.items.length-1)costo=r2(pr.total-acum); // el último ajusta centavos: la suma = total del presupuesto
      acum=r2(acum+costo);
      curPt.treatments.push({id:uid(),name:it.nombre,tooth:'Según presupuesto',date:today(),cost:costo,status:'pendiente',presupId:pr.id});
    });
  }
  save();closeModal();renderTab();
}

function rechazarPresupuesto(id){
  if(!confirm('¿Marcar este presupuesto como rechazado?'))return;
  const pr=curPt.presupuestos.find(x=>x.id===id);
  if(pr){pr.estado='rechazado';save();renderTab();}
}

function eliminarPresupuesto(id){
  if(!confirm('¿Eliminar este presupuesto?'))return;
  curPt.presupuestos=curPt.presupuestos.filter(x=>x.id!==id);
  save();renderTab();
}
