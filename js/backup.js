/* ═══ RESPALDOS — archivo, copias automáticas de este equipo, historial en la nube y restauración ═══
   Backup.normalize(raw)  lee CUALQUIER formato de respaldo (archivo, nube antigua, historial, copia diaria), lo valida y lo deja en un solo formato.
   Backup.replaceAll(raw) es el ÚNICO camino que reemplaza los datos: valida → guarda una copia de lo actual → aplica.
   Todo lo demás (archivo, nube, copias locales, «deshacer») solo decide de dónde sale el respaldo y pregunta antes. */
var Backup=(function(){
  'use strict';
  var MAX_FILE=300*1024*1024,LIST=['egresos','facturas','servicios','archivosContables','quickAppts'];
  var $=function(id){return document.getElementById(id);};
  function isObj(x){return Object.prototype.toString.call(x)==='[object Object]';}
  function str(x,max){return String(x==null?'':x).replace(/\s+/g,' ').trim().slice(0,max);}
  function num(x){var n=Number(x);return isFinite(n)&&n>0?Math.floor(n):0;}
  /* ids «de contador» (1, 2, 3…): los ids grandes de uid() no cuentan */
  function maxSmall(list,key){var m=0;(list||[]).forEach(function(x){var n=Number(x&&x[key]);if(isFinite(n)&&n>m&&n<1e9)m=n;});return m;}
  function fmtFecha(iso){try{return new Date(iso).toLocaleString('es-EC');}catch(e){return '—';}}
  function lsGetSafe(k){try{return localStorage.getItem(k);}catch(e){return null;}}

  /* ═══ 1. LEER Y VALIDAR ═══ */
  /* → {ok, error} | {ok:true, data, warnings, summary} */
  function normalize(raw){
    if(!isObj(raw))return {ok:false,error:'El archivo no es un respaldo de OdontoApp (su contenido no se pudo reconocer).'};
    if(!Array.isArray(raw.patients))return {ok:false,error:'El archivo no es un respaldo de OdontoApp (no tiene la lista de pacientes).'};
    var warnings=[],dropped=0,dupIds=0,noName=0,seen={},pts=[];
    raw.patients.forEach(function(p){
      if(!isObj(p)){dropped++;return;}
      if(p.id==null||(typeof p.id!=='number'&&typeof p.id!=='string')||p.id===''){p.id=uid();}
      else if(seen[String(p.id)]){p.id=uid();dupIds++;}
      seen[String(p.id)]=1;
      if(!str(p.name,120)){p.name='(sin nombre)';noName++;}
      pts.push(p);
    });
    var out={v:1,patients:pts};
    for(var i=0;i<LIST.length;i++){
      var k=LIST[i],a=raw[k];
      if(a===undefined||a===null){out[k]=[];continue;}
      if(!Array.isArray(a))return {ok:false,error:'La sección «'+k+'» del respaldo está dañada.'};
      out[k]=a.filter(function(x){if(isObj(x))return true;dropped++;return false;});
      out[k].forEach(function(x){if(x.id==null)x.id=uid();});
    }
    if(dropped)warnings.push(dropped+' registro(s) dañado(s) se omitieron.');
    if(dupIds)warnings.push(dupIds+' paciente(s) tenían un id repetido y se les dio uno nuevo.');
    if(noName)warnings.push(noName+' paciente(s) sin nombre quedaron como «(sin nombre)».');
    out=migrateBundle(out);   // listas siempre presentes y montos con 2 decimales (igual que al abrir la app)
    var recMax=0,preMax=0;
    out.patients.forEach(function(p){recMax=Math.max(recMax,maxSmall(p.recetas,'id'));preMax=Math.max(preMax,maxSmall(p.presupuestos,'id'));
      ['surfData','wholeData'].forEach(function(k){if(!isObj(p[k]))p[k]={};});});
    // los contadores nunca pueden quedar por debajo de lo que ya existe (si no, se repetirían números de receta, de factura…)
    var counters={
      nextId:Math.max(num(raw.nextId)||1,maxSmall(out.patients,'id')+1),
      nextEgId:Math.max(num(raw.nextEgId)||1,maxSmall(out.egresos,'id')+1),
      nextFactId:Math.max(num(raw.nextFactId)||1,maxSmall(out.facturas,'id')+1),
      nextRecetaId:Math.max(num(raw.nextRecetaId)||1,recMax+1),
      nextPresupId:Math.max(num(raw.nextPresupId)||1,preMax+1)
    };
    var c=isObj(raw.clinica)?raw.clinica:{},l=isObj(raw.logo)?raw.logo:{},hasClinic=isObj(raw.clinica)||isObj(raw.logo);
    var color=c.logoColor||l.color,img=c.logoImg||l.img;
    var clinic=hasClinic?{
      nombre:str(c.clinicaNombre||c.nombre||l.text,80)||'OdontoApp',
      profesional:str(c.profesional||l.prof,80)||'Dr. Profesional',
      ruc:str(c.ruc||l.ruc,20),direccion:str(c.direccion||l.dir,200),telefono:str(c.telefono||l.tel,40),
      color:Logo.isColor(color)?color:null,img:Logo.isSafeSrc(img)?img:null
    }:null;
    if(clinic&&img&&!clinic.img)warnings.push('El logo del respaldo no es una imagen válida y se ignoró.');
    var meds=null;
    if(Array.isArray(raw.meds)){var seenM={};meds=[];raw.meds.forEach(function(m){var s=str(m,120);if(s&&!seenM[s.toLowerCase()]&&meds.length<500){seenM[s.toLowerCase()]=1;meds.push(s);}});if(!meds.length)meds=null;}
    var fecha=raw.fechaExportacion||raw.guardado||(raw.t?new Date(raw.t).toISOString():null);
    return {ok:true,warnings:warnings,
      data:{patients:out.patients,egresos:out.egresos,facturas:out.facturas,servicios:out.servicios,archivosContables:out.archivosContables,quickAppts:out.quickAppts,counters:counters,clinic:clinic,meds:meds},
      summary:{pacientes:out.patients.length,egresos:out.egresos.length,facturas:out.facturas.length,servicios:out.servicios.length,fecha:fecha}};
  }

  /* ═══ 2. FOTO DE LO ACTUAL (formato de archivo) ═══ */
  function snapshot(){
    return {
      version:'OdontoApp_v3',fechaExportacion:new Date().toISOString(),
      clinica:{clinicaNombre:$('logoText').textContent,profesional:$('logoProfesional').textContent,ruc:clinicaRUC,direccion:clinicaDireccion,telefono:clinicaTelefono,logoColor:logoColor,logoImg:logoImg},
      totalPacientes:Patients.all().length,totalFacturas:facturas.length,totalEgresos:egresos.length,
      patients:Patients.all(),egresos:egresos,facturas:facturas,servicios:servicios,archivosContables:archivosContables,quickAppts:quickAppts,
      meds:MEDICAMENTOS_COMUNES,nextId:nextId,nextEgId:nextEgId,nextFactId:nextFactId,nextRecetaId:nextRecetaId,nextPresupId:nextPresupId
    };
  }

  /* ═══ 3. REEMPLAZAR LOS DATOS ═══ */
  async function saveSafety(motivo){
    try{return await idbSet('pre_restore',{t:Date.now(),motivo:motivo||'',pacientes:Patients.all().length,data:snapshot()});}catch(e){return false;}
  }
  function apply(d){
    Patients.setAll(d.patients);egresos=d.egresos;facturas=d.facturas;servicios=d.servicios;archivosContables=d.archivosContables;quickAppts=d.quickAppts;
    nextId=d.counters.nextId;nextEgId=d.counters.nextEgId;nextFactId=d.counters.nextFactId;nextRecetaId=d.counters.nextRecetaId;nextPresupId=d.counters.nextPresupId;
    if(d.clinic){
      $('logoText').textContent=d.clinic.nombre;$('logoProfesional').textContent=d.clinic.profesional;
      clinicaRUC=d.clinic.ruc;clinicaDireccion=d.clinic.direccion;clinicaTelefono=d.clinic.telefono;
      if(d.clinic.color)Logo.applyColor(d.clinic.color);
      if(d.clinic.img)Logo.applyImg(d.clinic.img);
    }
    if(d.meds){MEDICAMENTOS_COMUNES=d.meds;try{saveMeds();}catch(e){}}
    Patients.setCurrent(null);
    save();Patients.renderList();showPage('dashboard');
  }
  /* valida → guarda copia de lo actual → aplica. → {ok, summary, warnings, safety} | {ok:false, error} */
  async function replaceAll(raw,motivo){
    var n=normalize(raw);if(!n.ok)return n;
    var safety=await saveSafety(motivo||'Antes de reemplazar los datos');
    apply(n.data);
    return {ok:true,summary:n.summary,warnings:n.warnings,safety:safety};
  }
  /* aviso extra cuando hay nube: lo que no esté en el respaldo se borrará también allá */
  function cloudNote(){try{return Cloud.info().connected?'\n\n☁️ Con la nube conectada, lo que no esté en este respaldo también se eliminará en la nube al sincronizar.':'';}catch(e){return '';}}
  function warnText(w){return w&&w.length?'\n\n⚠️ '+w.join('\n⚠️ '):'';}

  /* ═══ 4. ARCHIVO ═══ */
  function download(blob,name){
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},10000);   // revocar al instante cancela la descarga en algunos navegadores
  }
  function exportFile(){
    var name='OdontoApp_backup_'+today()+'.json';
    download(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),name);
    try{localStorage.setItem('oa3_last_export',new Date().toISOString());}catch(e){}
    return name;
  }
  /* lee un File, lo valida y pregunta; → {ok,...} | {ok:false,error} | {ok:false,cancelled:true} */
  async function importFile(file){
    if(!file)return {ok:false,error:'No se eligió ningún archivo.'};
    if(file.size>MAX_FILE)return {ok:false,error:'El archivo pesa más de 300 MB: no parece un respaldo de OdontoApp.'};
    var text;try{text=await new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=function(){rej(new Error('No se pudo leer el archivo.'));};r.readAsText(file);});}
    catch(e){return {ok:false,error:e.message};}
    var raw;try{raw=JSON.parse(text);}catch(e){return {ok:false,error:'El archivo no es un respaldo válido (no es JSON).'};}
    var n=normalize(raw);if(!n.ok)return n;
    var s=n.summary;
    if(!confirm('¿Importar el respaldo del '+(s.fecha?fmtFecha(s.fecha):'—')+'?\n\nTiene '+s.pacientes+' paciente(s), '+s.egresos+' egreso(s) y '+s.facturas+' factura(s).\n\nSe REEMPLAZARÁN los datos actuales ('+Patients.all().length+' paciente(s)). Antes se guarda una copia de lo actual para poder deshacerlo.'+cloudNote()+warnText(n.warnings)))return {ok:false,cancelled:true};
    var r=await replaceAll(raw,'Antes de importar un archivo');
    if(r.ok)alert('✓ Importación exitosa.\n'+r.summary.pacientes+' paciente(s) restaurados.'+(r.safety?'\n\nPuedes deshacerlo desde «⬇ Backup» → «Deshacer última restauración».':'\n\n⚠️ No se pudo guardar la copia previa: no podrás deshacer.'));
    return r;
  }
  function importUI(){
    var input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async function(e){
      var f=e.target.files&&e.target.files[0];if(!f)return;
      var r=await Backup.importFile(f);
      if(!r.ok&&!r.cancelled)alert('Error al importar: '+r.error);
    };
    input.click();
  }

  /* ═══ 5. COPIAS AUTOMÁTICAS DE ESTE EQUIPO ═══ */
  async function localList(){return ((await idbGet('daily_backups'))||[]).map(function(x){return {fecha:x.fecha,pacientes:x.pacientes,t:x.t};}).reverse();}
  async function localFind(fecha){return ((await idbGet('daily_backups'))||[]).filter(function(b){return b.fecha===fecha;})[0]||null;}
  async function downloadLocal(fecha){
    var x=await localFind(fecha);if(!x){alert('No hay copia de '+fecha);return false;}
    download(new Blob([JSON.stringify(x.data)],{type:'application/json'}),'OdontoApp_copia_local_'+fecha+'.json');return true;
  }
  async function restoreLocal(fecha){
    var x=await localFind(fecha);if(!x){alert('No hay copia de '+fecha);return {ok:false,error:'Esa copia ya no existe.'};}
    var n=normalize(x.data);if(!n.ok){alert('Esa copia está dañada: '+n.error);return n;}
    if(!confirm('¿Restaurar la copia automática del '+fecha+'?\n\nTiene '+n.summary.pacientes+' paciente(s). Se REEMPLAZARÁN los datos actuales ('+Patients.all().length+'). Antes se guarda una copia de lo actual para poder deshacerlo.'+cloudNote()+warnText(n.warnings)))return {ok:false,cancelled:true};
    var r=await replaceAll(x.data,'Antes de restaurar la copia del '+fecha);
    if(r.ok){closeModal();alert('✓ Copia del '+fecha+' restaurada ('+r.summary.pacientes+' paciente(s)).');}
    return r;
  }
  async function undoInfo(){var x=await idbGet('pre_restore');return x&&x.data?{t:x.t,motivo:x.motivo,pacientes:x.pacientes}:null;}
  async function undoLast(){
    var x=await idbGet('pre_restore');if(!x||!x.data){alert('No hay nada que deshacer.');return {ok:false,error:'Sin copia previa.'};}
    var n=normalize(x.data);if(!n.ok){alert('La copia previa está dañada: '+n.error);return n;}
    if(!confirm('¿Volver al estado anterior?\n\nSe recuperarán los '+n.summary.pacientes+' paciente(s) que había el '+fmtFecha(x.t)+' ('+(x.motivo||'antes de restaurar')+').\nLo que hay ahora se guarda por si quieres volver a cambiar de opinión.'+cloudNote()))return {ok:false,cancelled:true};
    var r=await replaceAll(x.data,'Antes de deshacer la restauración');
    if(r.ok){closeModal();alert('✓ Se recuperó el estado anterior ('+r.summary.pacientes+' paciente(s)).');}
    return r;
  }
  /* al «restablecer de fábrica» también se borran las copias de este equipo (si no, los datos del paciente seguían guardados) */
  async function wipeCopies(){
    try{await idbSet('daily_backups',[]);await idbSet('pre_restore',null);}catch(e){}
    try{var db=await openImgDB();await new Promise(function(res){var tx=db.transaction('images','readwrite');tx.objectStore('images').clear();tx.oncomplete=res;tx.onerror=res;});}catch(e){}
    try{localStorage.removeItem('oa3_lastbackup');localStorage.removeItem('oa3_last_export');}catch(e){}
  }

  /* ═══ 6. PANTALLA «RESPALDO» (ex «Enviar respaldo por correo») ═══ */
  function resumenText(){
    var fecha=today();
    var ing=Patients.all().reduce(function(s,p){return addM(s,(p.payments||[]).reduce(function(a,py){return addM(a,py.amount);},0));},0);
    var egr=egresos.reduce(function(s,e){return addM(s,e.monto);},0);
    var pend=Patients.all().reduce(function(s,p){return s+(p.treatments||[]).filter(function(t){return t.status==='pendiente';}).length;},0);
    return 'RESUMEN OdontoApp — '+fecha+'\nClínica: '+$('logoText').textContent+'\nProfesional: '+$('logoProfesional').textContent+'\nRUC: '+(clinicaRUC||'—')+
      '\n\nPACIENTES: '+Patients.all().length+' registrados\nTRATAMIENTOS PENDIENTES: '+pend+'\nINGRESOS TOTALES: '+money(ing)+'\nEGRESOS TOTALES: '+money(egr)+'\nUTILIDAD: '+money(ing-egr)+'\nFACTURAS EMITIDAS: '+facturas.length+'\n\nExportado desde OdontoApp el '+fecha;
  }
  function openMain(){
    var last=lsGetSafe('oa3_last_export');
    openModal('<div class="modal-title">💾 Respaldo de tus datos</div>'+
    '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:16px"><div style="font-size:12px;font-weight:600;color:#15803d;margin-bottom:6px">✓ ¿Cómo funciona?</div>'+
    '<div style="font-size:12px;color:#166534;line-height:1.7">1. Haz clic en <strong>«Descargar backup»</strong> para guardar el archivo JSON con todos tus datos.<br>2. Haz clic en <strong>«Abrir correo»</strong> para abrir tu cliente de email con el asunto ya llenado.<br>3. Adjunta manualmente el archivo descargado al correo y envíalo.</div>'+
    '<div style="font-size:11px;color:#166534;margin-top:8px">'+(last?'Último respaldo en archivo: <b>'+esc(fmtFecha(last))+'</b>':'<b>Todavía no has descargado ningún respaldo en archivo.</b>')+'</div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Tu correo electrónico</label><input id="f_email_backup" type="email" placeholder="tuemail@gmail.com" data-on-keydown="backup.mailKey"></div></div>'+
    '<div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px;font-family:monospace;font-size:11px;white-space:pre;overflow-x:auto;color:var(--text2)">'+esc(resumenText())+'</div>'+
    '<div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:6px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">🕑 Copias automáticas de este equipo</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">Se guarda una por día (las últimas 5) sin necesitar internet.</div><div id="bk-local" style="font-size:12px;color:var(--text3)">Buscando…</div></div>'+
    '<div id="bk-undo"></div>'+
    '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button>'+
    '<button class="btn-primary" style="background:var(--green)" data-action="backup.download">⬇ Descargar backup</button>'+
    '<button class="btn-primary" data-action="backup.mailto">📧 Abrir correo</button></div>');
    fillLocal();
  }
  async function fillLocal(){
    var box=$('bk-local'),un=$('bk-undo');if(!box)return;
    var list=await localList(),u=await undoInfo();
    if(!$('bk-local'))return;   // se cerró mientras buscaba
    box.innerHTML=list.length?list.map(function(b){
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"><div style="flex:1;color:var(--text)">📅 '+esc(b.fecha)+' · '+esc(b.pacientes)+' paciente(s)</div>'+
        '<button class="btn-sm" data-action="backup.downloadLocal" data-fecha="'+esc(b.fecha)+'">Descargar</button>'+
        '<button class="btn-sm" style="background:var(--amber);color:#fff" data-action="backup.restoreLocal" data-fecha="'+esc(b.fecha)+'">Restaurar</button></div>';
    }).join(''):'Aún no hay copias automáticas (se crean al abrir la app con pacientes registrados).';
    if(un)un.innerHTML=u?'<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:#78350f;display:flex;align-items:center;gap:10px"><div style="flex:1">↩ Antes de la última restauración había <b>'+esc(u.pacientes)+'</b> paciente(s) ('+esc(fmtFecha(u.t))+').</div><button class="btn-sm" data-action="backup.undo">Deshacer última restauración</button></div>':'';
  }
  function checkEmail(e){e=String(e==null?'':e).trim();if(!e)return {ok:true,clean:''};if(!/^[^\s@,;?&=<>"]+@[^\s@,;?&=<>"]+\.[^\s@,;?&=<>"]+$/.test(e))return {ok:false,error:'Ese correo no parece válido.'};return {ok:true,clean:e};}
  function mailto(){
    var c=checkEmail(v('f_email_backup'));if(!c.ok){alert(c.error);return false;}
    var nombre=$('logoText').textContent,fecha=today();
    var asunto=encodeURIComponent('Backup OdontoApp — '+nombre+' — '+fecha);
    var cuerpo=encodeURIComponent('Adjunto el archivo de respaldo de OdontoApp correspondiente al '+fecha+'.\n\nClinica: '+nombre+'\n\nPor favor conservar este archivo en lugar seguro.\n\n---\nEnviado desde OdontoApp');
    window.open('mailto:'+c.clean+'?subject='+asunto+'&body='+cuerpo);
    exportFile();return true;
  }

  /* ═══ 7. HISTORIAL EN LA NUBE (Supabase, tabla clinica_backups) ═══ */
  var cloudRows=[];
  function cloudReady(){if(typeof sbClient==='undefined'||!sbClient||!sbClinicaId){alert('⚠️ Primero debes conectar Supabase.');return false;}return true;}
  function btnState(txt,dis){var b=$('btnCrearBackup');if(b){b.textContent=txt;b.disabled=!!dis;}}
  function checkNote(n){n=str(n==null?'Respaldo manual':n,80);return n||'Respaldo manual';}
  async function createCloud(nota){
    if(!cloudReady())return false;
    nota=checkNote(nota);
    try{
      var bundle=snapshot(),sizeBytes=new Blob([JSON.stringify(bundle)]).size,version=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
      btnState('⏳ Guardando...',true);
      var r=await sbClient.from('clinica_backups').insert({clinica_id:sbClinicaId,version:version,nota:nota,backup_data:bundle,size_bytes:sizeBytes});
      if(r.error)throw r.error;
      await pruneCloud();
      try{localStorage.setItem('oa3_last_auto_backup',String(Date.now()));}catch(e){}
      btnState('✅ Respaldo creado',true);setTimeout(function(){btnState('💾 Crear punto de restauración',false);},2000);
      alert('✅ ¡Respaldo histórico creado!\n\n📅 Fecha: '+new Date().toLocaleString('es-EC')+'\n📝 Nota: '+nota+'\nTamaño: '+(sizeBytes/1024).toFixed(1)+' KB');
      return true;
    }catch(e){
      console.error('Error al crear backup histórico:',e);
      alert('❌ Error al guardar en la nube: '+((e&&e.message)||e));
      btnState('Error',true);setTimeout(function(){btnState('💾 Crear punto de restauración',false);},2000);
      return false;
    }
  }
  async function pruneCloud(){
    try{
      var r=await sbClient.from('clinica_backups').select('id').eq('clinica_id',sbClinicaId).order('created_at',{ascending:false});
      if(r.error)throw r.error;
      if(r.data&&r.data.length>15){var del=r.data.slice(15).map(function(d){return d.id;});var d2=await sbClient.from('clinica_backups').delete().in('id',del);if(d2.error)console.warn('No se pudieron borrar respaldos antiguos:',d2.error);}
    }catch(e){console.warn('No se pudo limpiar respaldos antiguos:',e);}
  }
  async function openHistory(){
    if(!cloudReady())return;
    openModal('<div class="modal-title">📜 Cargando historial...</div><div style="text-align:center;padding:40px"><div style="font-size:40px">⏳</div></div>');
    try{
      var r=await sbClient.from('clinica_backups').select('id, version, nota, size_bytes, created_at').eq('clinica_id',sbClinicaId).order('created_at',{ascending:false});
      if(r.error)throw r.error;
      cloudRows=r.data||[];
      if(!cloudRows.length){
        openModal('<div class="modal-title">📜 Historial de Respaldos</div><div style="text-align:center;padding:40px"><div style="font-size:15px;font-weight:600;color:var(--text)">Aún no hay respaldos históricos</div><div style="font-size:13px;color:var(--text3);margin-top:8px">Crea tu primer punto de restauración para empezar.</div></div><div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button></div>');
        return;
      }
      openModal('<div class="modal-title">📜 Historial de Respaldos en la Nube</div>'+
      '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:12px;margin-bottom:14px;font-size:12px;color:#0c4a6e"><strong>💡 ¿Cómo funciona?</strong> Cada respaldo es una «foto» de tus datos en un momento específico. Si algo se borra o se daña, puedes volver a cualquier punto del historial.<br><br>Se mantienen automáticamente los <strong>últimos 15 respaldos</strong>. Antes de restaurar se guarda una copia de lo actual, para poder deshacerlo.</div>'+
      '<div style="max-height:400px;overflow-y:auto;">'+cloudRows.map(function(b,i){
        var f=new Date(b.created_at).toLocaleString('es-EC',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}),mb=((Number(b.size_bytes)||0)/1048576).toFixed(2);
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border);'+(i===0?'background:#f0fdf4;':'')+'"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'+
          (i===0?'<span style="background:#10b981;color:white;font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700">MÁS RECIENTE</span>':'')+'<div style="font-weight:600;font-size:13px;color:var(--text)">'+esc(b.nota||'Backup automático')+'</div></div>'+
          '<div style="font-size:11px;color:var(--text3);margin-bottom:3px">📅 '+esc(f)+'</div><div style="font-size:10px;color:var(--accent);font-family:monospace">💾 '+esc(mb)+' MB · ID: '+esc(b.version)+'</div></div>'+
          '<button class="btn-sm" style="background:var(--amber);color:white;margin-left:10px;white-space:nowrap" data-action="backup.restoreCloud" data-id="'+esc(b.id)+'">Restaurar</button></div>';
      }).join('')+'</div><div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button></div>');
    }catch(e){
      openModal('<div class="modal-title">📜 Historial de Respaldos</div><div style="text-align:center;padding:28px 20px"><div style="font-size:40px;margin-bottom:12px">⚠️</div><div style="font-size:14px;font-weight:600;color:var(--text)">No se pudo cargar el historial</div><div style="font-size:12px;color:var(--text3);margin-top:8px">'+esc((e&&e.message)||e)+'</div></div><div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button></div>');
    }
  }
  async function restoreCloud(id){
    if(!cloudReady())return {ok:false,error:'Sin nube.'};
    var row=cloudRows.filter(function(b){return String(b.id)===String(id);})[0]||{},fecha=row.created_at?fmtFecha(row.created_at):String(id);
    try{
      var r=await sbClient.from('clinica_backups').select('backup_data').eq('id',id).single();
      if(r.error||!r.data)throw new Error('No se encontró el respaldo');
      var n=normalize(r.data.backup_data);if(!n.ok)throw new Error('Ese respaldo está dañado: '+n.error);
      if(!confirm('⚠️ ¿Restaurar la versión del '+fecha+'?\n\nNota: '+(row.nota||'—')+'\nTiene '+n.summary.pacientes+' paciente(s).\n\nEsto REEMPLAZARÁ los datos actuales de este dispositivo ('+Patients.all().length+' paciente(s)). Antes se guarda una copia de lo actual para poder deshacerlo.'+cloudNote()+warnText(n.warnings)))return {ok:false,cancelled:true};
      var res=await replaceAll(r.data.backup_data,'Antes de restaurar el respaldo de la nube del '+fecha);
      if(res.ok){closeModal();alert('✅ Datos restaurados correctamente desde:\n\n📅 '+fecha+'\n📝 '+(row.nota||'—'));}
      return res;
    }catch(e){alert('Error al restaurar: '+((e&&e.message)||e));return {ok:false,error:String((e&&e.message)||e)};}
  }
  /* datos de la nube ANTIGUA (un solo registro en clinica_data) */
  async function importOldCloud(){
    if(typeof sbClient==='undefined'||!sbClient||!sbClinicaId)return {ok:false,error:'Sin nube.'};
    var status=$('sb-status');
    if(status){status.style.color='var(--text2)';status.textContent='⏳ Cargando desde Supabase...';}
    try{
      var r=await sbClient.from('clinica_data').select('data,updated_at').eq('id',sbClinicaId).single();
      if(r.error)throw r.error;
      if(!r.data||!r.data.data)throw new Error('No se encontraron datos en la nube');
      var n=normalize(r.data.data);if(!n.ok)throw new Error(n.error);
      closeModal();
      if(!confirm('¿Cargar datos del '+new Date(r.data.updated_at).toLocaleString('es-EC')+'?\n\n'+n.summary.pacientes+' paciente(s), '+n.summary.facturas+' factura(s).\n\n⚠️ Los datos locales no sincronizados se reemplazarán. Antes se guarda una copia de lo actual para poder deshacerlo.'+warnText(n.warnings)))return {ok:false,cancelled:true};
      var res=await replaceAll(r.data.data,'Antes de cargar la nube antigua');
      if(res.ok){try{localStorage.setItem('oa3_sb_lastsync',new Date().toISOString());}catch(e){}updateSbBtn('✓ Supabase conectado','#3ecf8e');alert('✓ Datos cargados correctamente desde la nube.');}
      return res;
    }catch(e){if(status){status.style.color='#ef4444';status.textContent='✗ Error: '+((e&&e.message)||e);}return {ok:false,error:String((e&&e.message)||e)};}
  }

  return {normalize:normalize,snapshot:snapshot,replaceAll:replaceAll,exportFile:exportFile,importFile:importFile,importUI:importUI,
    localList:localList,downloadLocal:downloadLocal,restoreLocal:restoreLocal,undoInfo:undoInfo,undoLast:undoLast,wipeCopies:wipeCopies,
    openMain:openMain,checkEmail:checkEmail,mailto:mailto,createCloud:createCloud,openHistory:openHistory,restoreCloud:restoreCloud,importOldCloud:importOldCloud,checkNote:checkNote};
})();

/* ═══ ACCIONES ═══ */
App.actions({
  'backup.email':function(){Backup.openMain();},
  'backup.import':function(){Backup.importUI();},
  'backup.download':function(){Backup.exportFile();},
  'backup.mailto':function(){Backup.mailto();},
  'backup.mailKey':function(c){if(c.event.key==='Enter')Backup.mailto();},
  'backup.downloadLocal':function(c){Backup.downloadLocal(c.data.fecha);},
  'backup.restoreLocal':function(c){Backup.restoreLocal(c.data.fecha);},
  'backup.undo':function(){Backup.undoLast();},
  'backup.restoreCloud':function(c){Backup.restoreCloud(c.id);}
});
