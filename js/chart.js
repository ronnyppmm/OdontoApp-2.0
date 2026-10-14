/* ═══ FICHA CLÍNICA — pestañas, diario, odontograma, tratamientos e imágenes ═══
   Cinco módulos con API propia (sin onclick; ver app.js y LEEME-MODULOS.md):
     Ficha        pestañas de la ficha + pestaña «Datos» + validación de fechas
     Diary        diario clínico
     Odonto       odontograma: dibujo, marcas por superficie/diente, ventana emergente y registros (snapshots) guardados
     Treatments   tratamientos + vínculo automático tratamiento ↔ odontograma
     Images       radiografías y fotografías (miniatura en la ficha, original en IndexedDB)
   La cabecera de la ficha (nombre, alertas, botones) vive en Patients.renderHeader. */

/* ═══════════════════════════ FICHA (pestañas) ═══════════════════════════ */
const Ficha=(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  function pad(n){return String(n).padStart(2,'0');}
  // Fecha real AAAA-MM-DD (rechaza 2026-02-31 y años absurdos). Por defecto no puede ser futura.
  function isDate(s,o){
    o=o||{};s=String(s==null?'':s);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    var d=new Date(s+'T12:00:00');
    if(isNaN(d.getTime())||d.getFullYear()<1900)return false;
    if(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())!==s)return false;
    return o.future?true:s<=today();
  }
  function isTime(s){return !s||/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));}
  function clean(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max||200);}

  // cada pestaña dibuja con la función de su módulo
  var TABS={
    datos:function(){return api.renderDatos();},
    diario:function(){return Diary.render();},
    odontograma:function(){return Odonto.render();},
    tratamientos:function(){return Treatments.render();},
    pagos:function(){return Finance.renderPayments();},citas:function(){return Agenda.renderPatientTab();},
    imagenes:function(){return Images.render();},
    consentimientos:function(){return Consents.render();},recetas:function(){return Prescriptions.renderList();},presupuestos:function(){return Quotes.renderList();}
  };
  function render(){
    var box=$('mainContent');if(!box)return;
    if(!Patients.current()){box.innerHTML='';return;}
    box.innerHTML=(TABS[curTab]||TABS.datos)();
  }
  function tab(name){
    curTab=TABS[name]?name:'datos';
    document.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t.getAttribute('data-tab')===curTab);});
    api.render();
  }
  function renderDatos(){
    var p=Patients.current(),cta=resumenCuenta(p),deuda=cta.planPendiente,age=p.birthdate?calcAge(p.birthdate):'—';
    var n=function(st){return (p.treatments||[]).filter(function(t){return t.status===st;}).length;};
    return '<div class="grid3" style="margin-bottom:14px">'+
      '<div class="kpi"><div class="kpi-label">Tratamientos realizados</div><div class="kpi-val" style="color:var(--accent)">'+n('realizado')+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Pendientes</div><div class="kpi-val" style="color:var(--amber)">'+n('pendiente')+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Saldo pendiente</div><div class="kpi-val" style="color:'+(deuda>0?'var(--red)':'var(--green)')+'">'+money(deuda)+'</div>'+subSaldoHtml(cta)+'</div></div>'+
      '<div class="card"><div class="card-title">Información personal</div><div class="grid2">'+
        '<div><div class="fl">Nombre completo</div><div class="fv">'+esc(p.name)+'</div></div>'+
        '<div><div class="fl">Cédula / ID</div><div class="fv">'+esc(p.cedula)+'</div></div>'+
        '<div><div class="fl">Edad</div><div class="fv">'+esc(age)+(typeof age==='number'?' años':'')+'</div></div>'+
        '<div><div class="fl">Fecha de nacimiento</div><div class="fv">'+esc(fmtDate(p.birthdate))+'</div></div>'+
        '<div><div class="fl">Teléfono</div><div class="fv">'+esc(p.phone)+'</div></div>'+
        '<div><div class="fl">Email</div><div class="fv">'+esc(p.email||'—')+'</div></div></div></div>'+
      '<div class="card"><div class="card-title">Historia clínica</div>'+
        '<div style="margin-bottom:12px"><div class="fl">Alergias</div><div class="fv">'+esc(p.alergias||'Ninguna')+'</div></div>'+
        '<div><div class="fl">Antecedentes médicos</div><div class="fv">'+esc(p.antecedentes||'Sin antecedentes')+'</div></div></div>';
  }
  var api={isDate:isDate,isTime:isTime,clean:clean,tab:tab,render:render,renderDatos:renderDatos,TABS:TABS};
  return api;
})();

/* ═══════════════════════════ DIARIO CLÍNICO ═══════════════════════════ */
const Diary=(function(){
  'use strict';
  function list(p){return p.diary||(p.diary=[]);}
  function get(p,id){return list(p).find(function(n){return String(n.id)===String(id);})||null;}
  // Valida y limpia una nota. La fecha debe ser real y no futura: es un registro de lo que YA pasó.
  function check(f){
    f=f||{};
    var c={date:String(f.date||'').trim(),time:String(f.time||'').trim(),doctor:Ficha.clean(f.doctor,120),title:Ficha.clean(f.title,150),
      body:String(f.body==null?'':f.body).trim().slice(0,5000),alert:Ficha.clean(f.alert,200)};
    if(!c.title)return {ok:false,error:'Escribe el título o procedimiento'};
    if(!c.body)return {ok:false,error:'Escribe la descripción clínica'};
    if(!Ficha.isDate(c.date))return {ok:false,error:Ficha.isDate(c.date,{future:true})?'La fecha de una nota clínica no puede ser futura':'La fecha no es válida'};
    if(!Ficha.isTime(c.time))return {ok:false,error:'La hora no es válida (usa el formato HH:MM)'};
    return {ok:true,clean:c};
  }
  function add(pid,c){var p=Patients.get(pid);if(!p)return null;var n=Object.assign({id:uid()},c);list(p).push(n);save();return n;}
  function update(pid,id,c){var p=Patients.get(pid),n=p&&get(p,id);if(!n)return null;Object.assign(n,c,{editado:new Date().toISOString()});save();return n;}
  function remove(pid,id){var p=Patients.get(pid);if(!p||!get(p,id))return false;p.diary=list(p).filter(function(n){return String(n.id)!==String(id);});save();return true;}
  function readForm(){return {date:v('f_dd'),time:v('f_dt'),doctor:v('f_ddoc'),title:v('f_dtitle'),body:v('f_dbody'),alert:v('f_dalert')};}

  function sorted(p){   // lo más reciente primero (por fecha y hora, no por el orden en que se escribió)
    return list(p).map(function(n,i){return {n:n,i:i};}).sort(function(a,b){
      var ka=(a.n.date||'')+' '+(a.n.time||''),kb=(b.n.date||'')+' '+(b.n.time||'');
      return ka<kb?1:ka>kb?-1:b.i-a.i;}).map(function(x){return x.n;});
  }
  function renderNote(n){
    return '<div class="diary-item"><div class="diary-date">'+esc(fmtDate(n.date))+' · '+esc(n.time||'')+(n.doctor?' · '+esc(n.doctor):'')+(n.editado?' · <em>editada</em>':'')+'</div>'+
      '<div class="diary-title">'+esc(n.title)+'</div><div class="diary-body">'+esc(n.body)+'</div>'+
      (n.alert?'<div class="diary-alert">⏰ '+esc(n.alert)+'</div>':'')+
      '<div style="margin-top:8px;display:flex;gap:6px"><button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="diary.openEdit" data-id="'+esc(n.id)+'">✏️ Editar</button>'+
      '<button class="del-btn" data-action="diary.delete" data-id="'+esc(n.id)+'">Eliminar nota</button></div></div>';
  }
  function render(){
    var notes=sorted(Patients.current());
    return '<div class="card"><div class="action-row"><div class="card-title" style="margin:0">Diario clínico</div><button class="btn-primary" data-action="diary.openAdd">+ Nueva nota</button></div>'+
      (notes.length?notes.map(renderNote).join(''):'<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin notas clínicas registradas.</div>')+'</div>';
  }
  function formHtml(n,saveAct,saveLbl,title){
    var val=function(k){return esc(n[k]==null?'':n[k]);};
    return '<div class="modal-title">'+title+'</div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_dd" type="date" max="'+today()+'" value="'+val('date')+'"></div><div class="form-group"><label>Hora</label><input id="f_dt" type="time" value="'+val('time')+'"></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Título / Procedimiento *</label><input id="f_dtitle" value="'+val('title')+'" placeholder="Consulta inicial, Extracción..."></div><div class="form-group"><label>Doctor</label><input id="f_ddoc" value="'+val('doctor')+'" placeholder="Dr. Nombre"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Descripción clínica *</label><textarea id="f_dbody" style="min-height:100px" placeholder="Describe el procedimiento, observaciones, materiales usados...">'+val('body')+'</textarea></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Alerta de seguimiento</label><input id="f_dalert" value="'+val('alert')+'" placeholder="Ej: Llamar para control en 7 días"></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="'+saveAct+'"'+(saveAct==='diary.saveEdit'?' data-id="'+esc(n.id)+'"':'')+'>'+saveLbl+'</button></div>';
  }
  function openAdd(){
    if(!Patients.current())return;
    var now=localDate(new Date()),prof=document.getElementById('logoProfesional');
    openModal(formHtml({date:today(),time:String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),doctor:prof?prof.textContent:''},'diary.saveNew','Guardar nota','Nueva nota clínica'));
  }
  function saveNew(){
    var p=Patients.current();if(!p)return;
    var r=check(readForm());if(!r.ok){alert(r.error);return;}
    api.add(p.id,r.clean);closeModal();Ficha.render();
  }
  function openEdit(id){
    var p=Patients.current(),n=p&&get(p,id);if(!n)return;
    openModal(formHtml(n,'diary.saveEdit','Guardar cambios','✏️ Editar nota clínica'));
  }
  function saveEdit(id){
    var p=Patients.current();if(!p||!get(p,id))return;
    var r=check(readForm());if(!r.ok){alert(r.error);return;}
    api.update(p.id,id,r.clean);closeModal();Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),n=p&&get(p,id);if(!n)return;
    if(!confirm('¿Eliminar la nota «'+n.title+'» del '+fmtDate(n.date)+'?\nEsta acción no se puede deshacer.'))return;
    api.remove(p.id,id);Ficha.render();
  }
  var api={check:check,add:add,update:update,remove:remove,get:get,sorted:sorted,render:render,openAdd:openAdd,saveNew:saveNew,openEdit:openEdit,saveEdit:saveEdit,deleteUI:deleteUI};
  return api;
})();

/* ═══════════════════════════ ODONTOGRAMA ═══════════════════════════ */
const Odonto=(function(){
  'use strict';
  var S=50,M=3,ZONES=['top','right','bottom','left','center'];
  var ZONE_NAMES={top:'Vestibular',right:'Distal',bottom:'Palatino/Lingual',left:'Mesial',center:'Oclusal'};
  var GROUPS=[
    {label:'Permanente Superior',teeth:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]},
    {label:'Temporal Superior',teeth:[55,54,53,52,51,61,62,63,64,65]},
    {label:'Temporal Inferior',teeth:[85,84,83,82,81,71,72,73,74,75]},
    {label:'Permanente Inferior',teeth:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]}
  ];
  var VALID=new Set([].concat.apply([],GROUPS.map(function(g){return g.teeth;})));
  var SURF=[{id:'caries',label:'Caries',col:'#E24B4A'},{id:'obturado',label:'Obturado',col:'#185FA5'}];
  var WHOLE=[
    {id:'extraccion',label:'Extracción indicada'},{id:'perd_caries',label:'Pérdida por caries'},
    {id:'perd_otra',label:'Pérdida (otra causa)'},{id:'endo_hacer',label:'Endodoncia por realizar'},
    {id:'endo_hecha',label:'Endodoncia realizada'},{id:'corona_r',label:'Corona por realizar'},
    {id:'corona_h',label:'Corona realizada'},{id:'prot_fija',label:'Prótesis fija'},
    {id:'prot_rem',label:'Prótesis removible'},{id:'prot_tot_r',label:'Prótesis total (por realizar)'},
    {id:'prot_tot_b',label:'Prótesis total (realizada)'},{id:'sell_nec',label:'Sellante necesario'},
    {id:'sell_real',label:'Sellante realizado'}
  ];
  var sel={tooth:null,zone:null};

  /* ── orientación anatómica por cuadrante ── */
  function zoneNamesFor(num){
    var q=Math.floor(num/10),sup=(q===1||q===2||q===5||q===6),izq=(q===1||q===4||q===5||q===8);   // izq: cuadrantes dibujados a la izquierda de la línea media
    return {top:sup?'Vestibular':'Palatino/Lingual',bottom:sup?'Palatino/Lingual':'Vestibular',left:izq?'Distal':'Mesial',right:izq?'Mesial':'Distal',center:'Oclusal'};
  }
  function wholeLabel(id){var w=WHOLE.find(function(x){return x.id===id;});return w?w.label:String(id);}

  /* ── dibujo ── */
  function zonePath(z,s){
    var m=M,t=s-m,c=s/2;
    if(z==='top')return 'M'+m+','+m+'L'+t+','+m+'L'+c+','+c+'Z';
    if(z==='right')return 'M'+t+','+m+'L'+t+','+t+'L'+c+','+c+'Z';
    if(z==='bottom')return 'M'+t+','+t+'L'+m+','+t+'L'+c+','+c+'Z';
    if(z==='left')return 'M'+m+','+t+'L'+m+','+m+'L'+c+','+c+'Z';
    return 'M'+(c-10)+','+(c-10)+'L'+(c+10)+','+(c-10)+'L'+(c+10)+','+(c+10)+'L'+(c-10)+','+(c+10)+'Z';
  }
  function drawWhole(id,s){
    var m=4,t=s-m,c=s/2,R='#E24B4A',B='#185FA5';
    var cross=function(col){return '<line x1="'+m+'" y1="'+m+'" x2="'+t+'" y2="'+t+'" stroke="'+col+'" stroke-width="2.8" stroke-linecap="round"/><line x1="'+t+'" y1="'+m+'" x2="'+m+'" y2="'+t+'" stroke="'+col+'" stroke-width="2.8" stroke-linecap="round"/>';};
    var tri=function(col){return '<polygon points="'+c+','+(m+2)+' '+(t-1)+','+(t-1)+' '+(m+1)+','+(t-1)+'" fill="none" stroke="'+col+'" stroke-width="2"/>';};
    var box=function(col){return '<rect x="'+(m+1)+'" y="'+(m+1)+'" width="'+(s-m*2-2)+'" height="'+(s-m*2-2)+'" rx="1" fill="none" stroke="'+col+'" stroke-width="2.5"/>';};
    var bars=function(col){return '<line x1="'+(m+2)+'" y1="'+(c-5)+'" x2="'+(t-2)+'" y2="'+(c-5)+'" stroke="'+col+'" stroke-width="3"/><line x1="'+(m+2)+'" y1="'+(c+5)+'" x2="'+(t-2)+'" y2="'+(c+5)+'" stroke="'+col+'" stroke-width="3"/>';};
    var star=function(col){return '<text x="'+c+'" y="'+(c+8)+'" text-anchor="middle" font-size="28" fill="'+col+'" font-weight="bold">*</text>';};
    switch(id){
      case 'extraccion':return cross(R);
      case 'perd_caries':return cross(B);
      case 'perd_otra':return '<circle cx="'+c+'" cy="'+c+'" r="'+(c-4)+'" fill="none" stroke="'+R+'" stroke-width="2.2"/><line x1="'+(c-9)+'" y1="'+(c-9)+'" x2="'+(c+9)+'" y2="'+(c+9)+'" stroke="'+R+'" stroke-width="2.2" stroke-linecap="round"/><line x1="'+(c+9)+'" y1="'+(c-9)+'" x2="'+(c-9)+'" y2="'+(c+9)+'" stroke="'+R+'" stroke-width="2.2" stroke-linecap="round"/>';
      case 'endo_hacer':return tri(R);
      case 'endo_hecha':return tri(B);
      case 'corona_r':return box(R);
      case 'corona_h':return box(B);
      case 'prot_fija':return '<rect x="'+(m+2)+'" y="'+(m+2)+'" width="'+(s-m*2-4)+'" height="'+(s-m*2-4)+'" rx="1" fill="none" stroke="'+B+'" stroke-width="2" stroke-dasharray="4,2"/>';
      case 'prot_rem':return '<text x="'+(c-8)+'" y="'+(c+6)+'" font-size="20" fill="'+R+'" font-weight="bold">(</text><text x="'+(c+4)+'" y="'+(c+6)+'" font-size="20" fill="'+R+'" font-weight="bold">)</text>';
      case 'prot_tot_r':return bars(R);
      case 'prot_tot_b':return bars(B);
      case 'sell_nec':return star(R);
      case 'sell_real':return star(B);
      default:return '';
    }
  }
  // Un diente. Solo el odontograma ACTUAL es interactivo; los registros guardados (snapshots) son una foto y no se pueden clicar.
  function toothSvg(num,sd,wd,interactive){
    var wo=(wd||{})[num],p='';
    ZONES.forEach(function(z){
      var sid=(sd||{})[num+'_'+z],fill='#ffffff';
      if(!wo&&sid==='caries')fill='#E24B4A';
      if(!wo&&sid==='obturado')fill='#185FA5';
      p+='<path d="'+zonePath(z,S)+'" fill="'+fill+'" stroke="#c8ccda" stroke-width="0.7"'+(interactive?' style="cursor:pointer" data-action="odonto.zone" data-tooth="'+num+'" data-zone="'+z+'"':'')+'/>';
    });
    var wov=wo?'<g style="pointer-events:none">'+drawWhole(wo,S)+'</g>':'';
    return '<svg width="'+S+'" height="'+S+'" viewBox="0 0 '+S+' '+S+'" style="display:block"><rect width="'+S+'" height="'+S+'" rx="3" fill="#fff" stroke="none"/>'+p+
      '<rect x="'+M+'" y="'+M+'" width="'+(S-M*2)+'" height="'+(S-M*2)+'" rx="2" fill="none" stroke="#a8adc0" stroke-width="0.9" style="pointer-events:none"/>'+wov+'</svg>';
  }
  function toothSvgSmall(n,sd,wd){
    var s=28,m=2,wo=(wd||{})[n],t=s-m,c=s/2,p='';
    ZONES.forEach(function(z){
      var sid=(sd||{})[n+'_'+z],fill='#ffffff',d;
      if(!wo&&sid==='caries')fill='#E24B4A';
      if(!wo&&sid==='obturado')fill='#185FA5';
      if(z==='top')d='M'+m+','+m+'L'+t+','+m+'L'+c+','+c+'Z';
      else if(z==='right')d='M'+t+','+m+'L'+t+','+t+'L'+c+','+c+'Z';
      else if(z==='bottom')d='M'+t+','+t+'L'+m+','+t+'L'+c+','+c+'Z';
      else if(z==='left')d='M'+m+','+t+'L'+m+','+m+'L'+c+','+c+'Z';
      else d='M'+(c-7)+','+(c-7)+'L'+(c+7)+','+(c-7)+'L'+(c+7)+','+(c+7)+'L'+(c-7)+','+(c+7)+'Z';
      p+='<path d="'+d+'" fill="'+fill+'" stroke="#c8ccda" stroke-width="0.5"/>';
    });
    var wov=wo?'<g style="pointer-events:none">'+drawWhole(wo,s)+'</g>':'';
    return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 '+s+' '+s+'" style="display:block"><rect width="'+s+'" height="'+s+'" rx="2" fill="#fff"/>'+p+
      '<rect x="'+m+'" y="'+m+'" width="'+(s-m*2)+'" height="'+(s-m*2)+'" rx="1" fill="none" stroke="#a8adc0" stroke-width="0.7" style="pointer-events:none"/>'+wov+'</svg>';
  }
  function legSvg(item,isSurf){
    var s=28,m=2;
    if(isSurf){
      var ps=ZONES.map(function(z){return '<path d="'+zonePath(z,s)+'" fill="'+item.col+'" stroke="rgba(255,255,255,.4)" stroke-width="0.4"/>';}).join('');
      return '<svg width="28" height="28" viewBox="0 0 28 28" style="border-radius:4px;border:0.5px solid #e2e8f0;flex-shrink:0">'+ps+'<rect x="'+m+'" y="'+m+'" width="'+(s-m*2)+'" height="'+(s-m*2)+'" rx="1" fill="none" stroke="#a8adc0" stroke-width="0.6"/></svg>';
    }
    return '<svg width="28" height="28" viewBox="0 0 28 28" style="border-radius:4px;border:0.5px solid #e2e8f0;flex-shrink:0;background:#fff"><rect x="'+m+'" y="'+m+'" width="'+(s-m*2)+'" height="'+(s-m*2)+'" rx="1" fill="#f8fafc" stroke="#a8adc0" stroke-width="0.6"/>'+drawWhole(item.id,s)+'</svg>';
  }

  /* ── datos (sin pantalla) ── */
  function data(p){if(!p.surfData)p.surfData={};if(!p.wholeData)p.wholeData={};if(!p.odoHistory)p.odoHistory=[];return p;}
  function surfacesOf(p,tooth){return ZONES.filter(function(z){return (p.surfData||{})[tooth+'_'+z];});}
  // Marca (o quita, si ya estaba igual) una superficie. Un diente con símbolo completo pierde ese símbolo.
  function markSurface(p,tooth,zone,id){
    tooth=Number(tooth);
    if(!VALID.has(tooth)||ZONES.indexOf(zone)<0||!SURF.some(function(s){return s.id===id;}))return {ok:false};
    data(p);delete p.wholeData[tooth];
    var key=tooth+'_'+zone,removed=p.surfData[key]===id;
    if(removed)delete p.surfData[key];else p.surfData[key]=id;
    save();return {ok:true,removed:removed};
  }
  function markWhole(p,tooth,id){
    tooth=Number(tooth);
    if(!VALID.has(tooth)||!WHOLE.some(function(w){return w.id===id;}))return {ok:false};
    data(p);ZONES.forEach(function(z){delete p.surfData[tooth+'_'+z];});
    var removed=p.wholeData[tooth]===id;
    if(removed)delete p.wholeData[tooth];else p.wholeData[tooth]=id;
    save();return {ok:true,removed:removed};
  }
  function clearTooth(p,tooth){
    tooth=Number(tooth);if(!VALID.has(tooth))return false;
    data(p);ZONES.forEach(function(z){delete p.surfData[tooth+'_'+z];});delete p.wholeData[tooth];save();return true;
  }
  function checkSnapshot(f){
    f=f||{};
    var c={label:Ficha.clean(f.label,80),fecha:String(f.fecha||'').trim(),hora:String(f.hora||'').trim(),notas:Ficha.clean(f.notas,200)};
    if(!c.label)return {ok:false,error:'Escribe una etiqueta para identificar este estado'};
    if(!Ficha.isDate(c.fecha))return {ok:false,error:Ficha.isDate(c.fecha,{future:true})?'La fecha del registro no puede ser futura':'La fecha no es válida'};
    if(!Ficha.isTime(c.hora))return {ok:false,error:'La hora no es válida (usa el formato HH:MM)'};
    return {ok:true,clean:c};
  }
  function addSnapshot(pid,c){
    var p=Patients.get(pid);if(!p)return null;data(p);
    var s=Object.assign({id:uid()},c,{surfData:JSON.parse(JSON.stringify(p.surfData)),wholeData:JSON.parse(JSON.stringify(p.wholeData))});
    p.odoHistory.push(s);save();return s;
  }
  function removeSnapshot(pid,id){
    var p=Patients.get(pid);if(!p||!(p.odoHistory||[]).some(function(x){return String(x.id)===String(id);}))return false;
    p.odoHistory=p.odoHistory.filter(function(x){return String(x.id)!==String(id);});save();return true;
  }
  function getSnapshot(p,id){return (p.odoHistory||[]).find(function(x){return String(x.id)===String(id);})||null;}

  /* ── pantalla ── */
  function legendItems(list,isSurf){return list.map(function(c){return '<div class="leg-item">'+legSvg(c,isSurf)+'<span>'+esc(c.label)+'</span></div>';}).join('');}
  function render(){
    var p=data(Patients.current());
    var groups=GROUPS.map(function(g){
      return '<div class="odo-sec-lbl">'+esc(g.label)+'</div><div class="odo-sec-card"><div class="teeth-row">'+
        g.teeth.map(function(n){return '<div class="tooth-col"><div class="tooth-num">'+n+'</div>'+toothSvg(n,p.surfData,p.wholeData,true)+'</div>';}).join('')+'</div></div>';
    }).join('');
    var legend='<div class="odo-legend"><div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Simbología oficial</div>'+
      '<div style="font-size:10px;color:var(--text3);font-weight:600;margin-bottom:6px">Por superficie</div><div class="odo-legend-grid">'+legendItems(SURF,true)+'</div>'+
      '<div style="font-size:10px;color:var(--text3);font-weight:600;margin:8px 0 6px;padding-top:8px;border-top:1px solid var(--border)">Diente completo</div><div class="odo-legend-grid">'+legendItems(WHOLE,false)+'</div></div>';
    var saveBtn='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div style="font-size:13px;color:var(--text2)">Registra un snapshot del estado actual para llevar historial de la evolución del paciente.</div>'+
      '<button class="btn-primary" data-action="odonto.openSnapshotForm" style="flex-shrink:0;margin-left:14px">📸 Guardar estado actual</button></div>';
    var hist=p.odoHistory.length===0
      ?'<div class="card"><div class="card-title">Historial del odontograma</div><div style="font-size:13px;color:var(--text3);padding:8px 0">Sin snapshots guardados. Haz clic en "Guardar estado actual" para registrar el estado inicial del paciente.</div></div>'
      :'<div class="card"><div class="action-row"><div class="card-title" style="margin:0">Historial del odontograma ('+p.odoHistory.length+' registros)</div></div>'+
        p.odoHistory.slice().reverse().map(function(snap){
          return '<div data-snapid="'+esc(snap.id)+'" style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div style="flex:1">'+
            '<div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(snap.label)+'</div><div style="font-size:11px;color:var(--text3)">'+esc(fmtDate(snap.fecha))+(snap.hora?' · '+esc(snap.hora):'')+(snap.notas?' · '+esc(snap.notas):'')+'</div></div>'+
            '<button class="btn-sm" style="font-size:11px;padding:4px 12px" data-action="odonto.openSnapshot" data-id="'+esc(snap.id)+'">🔍 Ver completo</button>'+
            '<button class="del-btn" data-action="odonto.deleteSnapshot" data-id="'+esc(snap.id)+'">✕</button></div>'+
            '<div style="overflow-x:auto;padding-bottom:4px">'+GROUPS.map(function(g){
              return '<div style="font-size:8px;font-weight:600;color:var(--text3);text-align:center;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px">'+esc(g.label)+'</div><div style="display:flex;justify-content:center;gap:3px;margin-bottom:8px">'+
                g.teeth.map(function(n){return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px"><span style="font-size:7px;color:#4338ca;font-weight:600">'+n+'</span>'+toothSvgSmall(n,snap.surfData,snap.wholeData)+'</div>';}).join('')+'</div>';
            }).join('')+'</div></div>';
        }).join('')+'</div>';
    return saveBtn+groups+legend+hist;
  }

  /* ── ventana emergente de un diente ── */
  function closePopup(){var el=document.getElementById('toothPopup');if(el)el.classList.remove('show');}
  function openZone(tooth,zone,anchor){
    var p=Patients.current();if(!p||!VALID.has(Number(tooth)))return;
    data(p);sel.tooth=Number(tooth);sel.zone=zone;
    document.getElementById('tpTitle').textContent='Diente '+tooth+' — '+(zoneNamesFor(tooth)[zone]||'');
    var curS=p.surfData[tooth+'_'+zone],curW=p.wholeData[tooth];
    document.getElementById('tpOpts').innerHTML='<div class="tp-section">Por superficie</div>'+
      SURF.map(function(c){return '<div class="tp-opt'+(curS===c.id?' active':'')+'" data-action="odonto.setSurf" data-id="'+c.id+'">'+legSvg(c,true)+' '+esc(c.label)+'</div>';}).join('')+
      '<div class="tp-section">Diente completo</div>'+
      WHOLE.map(function(c){return '<div class="tp-opt'+(curW===c.id?' active':'')+'" data-action="odonto.setWhole" data-id="'+c.id+'">'+legSvg(c,false)+' '+esc(c.label)+'</div>';}).join('');
    var popup=document.getElementById('toothPopup');
    popup.classList.add('show');   // se muestra primero para poder medirlo
    var ph=popup.offsetHeight||340,pw=popup.offsetWidth||215;
    var svg=anchor&&anchor.closest?anchor.closest('svg'):null,rect=svg?svg.getBoundingClientRect():{left:8,right:8,top:8,bottom:8};
    var below=window.innerHeight-rect.bottom,above=rect.top,left=rect.right+8,top;
    if(left+pw>window.innerWidth-8)left=rect.left-pw-8;
    if(left<8)left=8;
    if(below>=ph+16)top=rect.top-10;
    else if(above>=ph+16)top=rect.bottom-ph+10;
    else top=Math.max(8,(window.innerHeight-ph)/2);
    top=Math.max(8,Math.min(top,window.innerHeight-ph-8));
    popup.style.left=left+'px';popup.style.top=top+'px';
  }
  function setSurface(id){
    var p=Patients.current(),tooth=sel.tooth,zone=sel.zone;if(!p||tooth==null)return;
    var w=data(p).wholeData[tooth];
    if(w&&!confirm('El diente '+tooth+' tiene el símbolo «'+wholeLabel(w)+'».\nAl marcar una superficie se quitará ese símbolo.\n\n¿Continuar?'))return;
    var r=api.markSurface(p,tooth,zone,id);if(!r.ok)return;
    closePopup();Ficha.render();
    if(!r.removed&&id==='caries')setTimeout(function(){Treatments.openSuggestFromCaries(tooth,zone);},250);
  }
  function setWhole(id){
    var p=Patients.current(),tooth=sel.tooth;if(!p||tooth==null)return;
    var sup=surfacesOf(data(p),tooth);
    if(sup.length&&!confirm('El diente '+tooth+' tiene superficies marcadas ('+sup.map(function(z){return zoneNamesFor(tooth)[z];}).join(', ')+').\nAl marcar el diente completo se quitarán.\n\n¿Continuar?'))return;
    var r=api.markWhole(p,tooth,id);if(!r.ok)return;
    closePopup();Ficha.render();
    if(!r.removed&&Treatments.TX_FOR[id])setTimeout(function(){Treatments.openSuggestFromOdonto(tooth,id);},250);
  }
  function clearSelected(){var p=Patients.current();if(p&&sel.tooth!=null)api.clearTooth(p,sel.tooth);closePopup();Ficha.render();}

  /* ── registros (snapshots) ── */
  function openSnapshotForm(){
    var p=Patients.current();if(!p)return;data(p);
    openModal('<div class="modal-title">📸 Guardar estado del odontograma</div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Etiqueta *</label><input id="f_snaplbl" placeholder="Ej: Estado inicial, Post extracción, Sesión 2..." value="'+esc(p.odoHistory.length===0?'Estado inicial':'Sesión '+(p.odoHistory.length+1))+'"></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_snapfecha" type="date" max="'+today()+'" value="'+today()+'"></div><div class="form-group"><label>Hora</label><input id="f_snaphora" type="time" value="'+new Date().toTimeString().slice(0,5)+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Notas de la sesión</label><input id="f_snapnotas" placeholder="Ej: Consulta inicial, tratamiento de conducto diente 36..."></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="odonto.saveSnapshot">💾 Guardar snapshot</button></div>');
  }
  function saveSnapshot(){
    var p=Patients.current();if(!p)return;
    var r=checkSnapshot({label:v('f_snaplbl'),fecha:v('f_snapfecha'),hora:v('f_snaphora'),notas:v('f_snapnotas')});
    if(!r.ok){alert(r.error);return;}
    api.addSnapshot(p.id,r.clean);closeModal();Ficha.render();
  }
  function deleteSnapshotUI(id){
    var p=Patients.current(),s=p&&getSnapshot(p,id);if(!s)return;
    if(!confirm('¿Eliminar el registro «'+s.label+'» ('+fmtDate(s.fecha)+') del historial?\nEl odontograma actual no se modifica.'))return;
    api.removeSnapshot(p.id,id);Ficha.render();
  }
  function snapshotGroups(snap,big){
    return GROUPS.map(function(g){
      return '<div style="font-size:9px;font-weight:700;color:#64748b;text-align:center;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">'+esc(g.label)+'</div>'+
        '<div style="display:flex;justify-content:center;gap:4px;margin-bottom:12px;flex-wrap:wrap">'+
        g.teeth.map(function(n){return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><span style="font-size:9px;font-weight:600;color:#4338ca">'+n+'</span>'+toothSvg(n,snap.surfData,snap.wholeData,false)+'</div>';}).join('')+'</div>';
    }).join('');
  }
  function snapshotLegend(){
    var it=function(c,s){return '<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:#475569">'+legSvg(c,s)+'<span>'+esc(c.label)+'</span></div>';};
    return '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0">'+SURF.map(function(c){return it(c,true);}).join('')+WHOLE.slice(0,8).map(function(c){return it(c,false);}).join('')+'</div>';
  }
  function openSnapshot(id){
    var p=Patients.current(),snap=p&&getSnapshot(p,id);if(!snap)return;
    openModal('<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px"><div><div class="modal-title" style="margin:0">🦷 '+esc(snap.label)+'</div>'+
      '<div style="font-size:12px;color:var(--text3);margin-top:4px">Paciente: <strong>'+esc(p.name)+'</strong> · '+esc(fmtDate(snap.fecha))+(snap.hora?' · '+esc(snap.hora):'')+(snap.notas?' · '+esc(snap.notas):'')+'</div></div>'+
      '<button class="btn-primary" data-action="odonto.printSnapshot" data-id="'+esc(snap.id)+'" style="flex-shrink:0;padding:7px 14px;font-size:12px">🖨️ Imprimir</button></div>'+
      '<div style="overflow-x:auto">'+snapshotGroups(snap)+'</div>'+snapshotLegend()+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button></div>');
    var m=document.querySelector('.modal');if(m)m.style.width='740px';
  }
  // El documento impreso se arma a partir del registro guardado (no del HTML de la pantalla): se puede probar sin abrir ventanas.
  function printHtml(snap,patientName,clinicName){
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Odontograma — '+esc(snap.label)+'</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:\'Segoe UI\',sans-serif;padding:24px;color:#0f172a}h2{font-size:18px;font-weight:700;margin-bottom:4px}.sub{font-size:12px;color:#64748b;margin-bottom:20px}@media print{body{padding:10px}}</style></head><body>'+
      '<h2>'+esc(clinicName)+' — Odontograma: '+esc(snap.label)+'</h2><div class="sub">Paciente: '+esc(patientName)+' · '+esc(fmtDate(snap.fecha))+(snap.hora?' · '+esc(snap.hora):'')+(snap.notas?' · '+esc(snap.notas):'')+'</div>'+
      snapshotGroups(snap)+snapshotLegend()+'</body></html>';
  }
  function printSnapshot(id){
    var p=Patients.current(),snap=p&&getSnapshot(p,id);if(!snap)return;
    var lt=document.getElementById('logoText'),w=safeOpen('','_blank','width=900,height=700');
    w.document.write(api.printHtml(snap,p.name,lt?lt.textContent:''));w.document.close();
    setTimeout(function(){try{w.print();}catch(e){}},500);
  }

  /* ── aviso flotante ── */
  function notify(msg){
    var el=document.getElementById('odoNotify');
    if(!el){el=document.createElement('div');el.id='odoNotify';
      el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(20px);background:#0f172a;color:#fff;padding:11px 18px;border-radius:10px;font-size:12.5px;box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:10000;opacity:0;transition:all .3s;max-width:82vw;text-align:center;line-height:1.5';
      document.body.appendChild(el);}
    el.textContent=msg;el.style.opacity='1';el.style.transform='translateX(-50%) translateY(0)';
    clearTimeout(el._t);el._t=setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(-50%) translateY(20px)';},4200);
  }

  var api={ZONES:ZONES,ZONE_NAMES:ZONE_NAMES,GROUPS:GROUPS,SURF:SURF,WHOLE:WHOLE,VALID:VALID,zoneNamesFor:zoneNamesFor,wholeLabel:wholeLabel,
    toothSvg:toothSvg,legSvg:legSvg,markSurface:markSurface,markWhole:markWhole,clearTooth:clearTooth,surfacesOf:surfacesOf,
    checkSnapshot:checkSnapshot,addSnapshot:addSnapshot,removeSnapshot:removeSnapshot,getSnapshot:getSnapshot,
    render:render,openZone:openZone,closePopup:closePopup,setSurface:setSurface,setWhole:setWhole,clearSelected:clearSelected,
    openSnapshotForm:openSnapshotForm,saveSnapshot:saveSnapshot,deleteSnapshotUI:deleteSnapshotUI,openSnapshot:openSnapshot,printHtml:printHtml,printSnapshot:printSnapshot,notify:notify};
  return api;
})();

/* ═══════════════════════════ TRATAMIENTOS + vínculo con el odontograma ═══════════════════════════ */
const Treatments=(function(){
  'use strict';
  var O=Odonto,supTx=null;
  // palabra clave del nombre → qué dibujar en el odontograma al registrar / al realizar el tratamiento
  var RULES=[
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
  // símbolo marcado en el odontograma → tratamiento que se sugiere registrar
  var TX_FOR={
    extraccion:{name:'Extracción dental',status:'pendiente'},perd_caries:{name:'Extracción dental',status:'realizado'},perd_otra:{name:'Extracción dental',status:'realizado'},
    endo_hacer:{name:'Endodoncia',status:'pendiente'},endo_hecha:{name:'Endodoncia',status:'realizado'},
    corona_r:{name:'Corona',status:'pendiente'},corona_h:{name:'Corona',status:'realizado'},
    sell_nec:{name:'Sellante',status:'pendiente'},sell_real:{name:'Sellante',status:'realizado'},
    prot_fija:{name:'Prótesis fija',status:'realizado'},prot_rem:{name:'Prótesis removible',status:'realizado'},
    prot_tot_r:{name:'Prótesis total',status:'pendiente'},prot_tot_b:{name:'Prótesis total',status:'realizado'}
  };
  var GENERAL=['general','todos','toda la boca','boca completa','arcada superior','arcada inferior','superior','inferior'];

  function list(p){return p.treatments||(p.treatments=[]);}
  function get(p,id){return list(p).find(function(t){return String(t.id)===String(id);})||null;}
  function detect(name){if(!name)return null;for(var i=0;i<RULES.length;i++){if(RULES[i].re.test(name))return RULES[i];}return null;}
  // "36, 37" · "11-14" · "36;46" → [36,37] (solo dientes que existen en el odontograma)
  function parseTeeth(str){
    if(!str)return [];var nums=[];
    String(str).split(/[,;]+/).forEach(function(part){
      part=part.trim();var r=part.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
      if(r){var a=parseInt(r[1],10),b=parseInt(r[2],10);if(a>b){var t=a;a=b;b=t;}for(var i=a;i<=b;i++)nums.push(i);}
      else if(/^\d{1,2}$/.test(part))nums.push(parseInt(part,10));
    });
    return Array.from(new Set(nums)).filter(function(n){return O.VALID.has(n);});
  }
  // partes del texto que no son un diente ni «General»: sin avisar, el tratamiento quedaría sin vínculo con el odontograma
  function unrecognized(str){
    var bad=[];
    String(str||'').split(/[,;]+/).forEach(function(part){
      part=part.trim();if(!part)return;
      var low=part.toLowerCase();
      if(GENERAL.indexOf(low)>-1)return;
      if(parseTeeth(part).length&&/^\d{1,2}(\s*[-–]\s*\d{1,2})?$/.test(part))return;
      bad.push(part);
    });
    return bad;
  }

  /* ── datos ── */
  function check(f){
    f=f||{};
    var c={name:Ficha.clean(f.name,120),tooth:Ficha.clean(f.tooth,60)||'General',date:String(f.date||'').trim(),status:String(f.status||'pendiente'),cost:0};
    if(!c.name)return {ok:false,error:'Escribe el nombre del tratamiento'};
    if(c.status!=='pendiente'&&c.status!=='realizado')return {ok:false,error:'El estado debe ser pendiente o realizado'};
    if(!Ficha.isDate(c.date,{future:c.status==='pendiente'}))return {ok:false,error:Ficha.isDate(c.date,{future:true})?'Un tratamiento realizado no puede tener fecha futura':'La fecha no es válida'};
    var raw=String(f.cost==null?'':f.cost).trim();
    if(raw){var m=parseMonto(raw);if(isNaN(m))return {ok:false,error:'El costo no es válido: usa un número mayor o igual a 0 (por ejemplo 25 o 25.50)'};c.cost=m;}
    return {ok:true,clean:c,warnings:unrecognized(c.tooth)};
  }
  function add(pid,c){var p=Patients.get(pid);if(!p)return null;var t=Object.assign({id:uid()},c);list(p).push(t);save();return t;}
  function markDone(pid,id){
    var p=Patients.get(pid),t=p&&get(p,id);
    if(!t||t.status==='realizado')return null;            // solo un tratamiento pendiente se puede realizar (y una sola vez)
    t.status='realizado';if(t.date>today())t.date=today();  // no puede quedar «realizado» con fecha futura
    save();return t;
  }
  function remove(pid,id,opts){
    var p=Patients.get(pid),t=p&&get(p,id);if(!t)return false;
    if(opts&&opts.clearOdo&&t.autoOdo)clearAuto(p,t.autoOdo);
    p.treatments=list(p).filter(function(x){return String(x.id)!==String(id);});save();return true;
  }

  /* ── pantalla ── */
  function badgeOdo(t){
    var a=t.autoOdo;if(!a)return '';
    var lbl='🦷 Vinculado';
    if(a.tipo==='whole'){
      var sid=t.status==='realizado'?(a.simboloDone||a.simboloPend):(a.simboloPend||a.simboloDone);
      if(sid)lbl='🦷 '+O.wholeLabel(sid);
    }else lbl='🦷 Superficies (al realizar)';
    return '<span title="Vinculado al odontograma" style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;margin-left:6px;white-space:nowrap">'+esc(lbl)+'</span>';
  }
  function surfacesText(t){
    var a=t.autoOdo;if(!a||a.tipo!=='surface')return '';
    var zs=a.zonas||{},keys=Object.keys(zs),short={'Vestibular':'V','Distal':'D','Palatino/Lingual':'P/L','Mesial':'M','Oclusal':'O'};
    if(!keys.length)return ' · ⬜ superficies por seleccionar';
    return ' · 🔵 '+keys.map(function(n){return n+': '+zs[n].map(function(z){var full=O.zoneNamesFor(parseInt(n,10))[z];return short[full]||full||z;}).join('-');}).join(' · ');
  }
  function row(t,pend){
    return '<div class="row-item"><div class="row-dot" style="background:var(--'+(pend?'amber':'green')+')"></div><div style="flex:1"><div class="row-name">'+esc(t.name)+badgeOdo(t)+'</div>'+
      '<div class="row-meta">Diente '+esc(t.tooth)+' · '+esc(fmtDate(t.date))+esc(surfacesText(t))+'</div></div><div class="row-price">'+money(t.cost)+'</div>'+
      (pend?'<button class="done-btn" data-action="treatments.done" data-id="'+esc(t.id)+'">✓ Realizado</button>':'<span class="badge badge-green">Realizado</span>')+
      '<button class="del-btn" style="margin-left:'+(pend?6:8)+'px" data-action="treatments.delete" data-id="'+esc(t.id)+'">✕</button></div>';
  }
  function render(){
    var all=list(Patients.current()),pend=all.filter(function(t){return t.status==='pendiente';}),done=all.filter(function(t){return t.status==='realizado';});
    var empty=function(m){return '<div style="font-size:13px;color:var(--text3);padding:8px 0">'+m+'</div>';};
    return '<div class="card"><div class="action-row"><div class="card-title" style="margin:0">Pendientes</div><button class="btn-primary" data-action="treatments.openAdd">+ Agregar</button></div>'+
      (pend.length?pend.map(function(t){return row(t,true);}).join(''):empty('Sin tratamientos pendientes'))+'</div>'+
      '<div class="card"><div class="card-title">Realizados</div>'+(done.length?done.map(function(t){return row(t,false);}).join(''):empty('Sin tratamientos registrados'))+'</div>';
  }
  function renderTeethPicker(val){
    var sel=parseTeeth(val||'');
    return O.GROUPS.map(function(g){
      return '<div style="margin-bottom:8px"><div style="font-size:8px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;text-align:center">'+esc(g.label)+'</div>'+
        '<div style="display:flex;flex-wrap:nowrap;gap:3px;justify-content:center">'+g.teeth.map(function(n){
          var on=sel.indexOf(n)>-1;
          return '<button type="button" data-action="treatments.toggleTooth" data-n="'+n+'" style="width:28px;height:24px;font-size:10px;font-weight:'+(on?'700':'500')+';border-radius:6px;cursor:pointer;border:1px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'var(--card)')+';color:'+(on?'#fff':'var(--text2)')+';font-family:inherit;padding:0;flex-shrink:0">'+n+'</button>';
        }).join('')+'</div></div>';
    }).join('');
  }
  function refreshPicker(){var b=document.getElementById('tx-dientes-picker');if(b)b.innerHTML=renderTeethPicker(v('f_txt'));}
  function toggleTooth(n){
    var s=parseTeeth(v('f_txt')),i=s.indexOf(n);
    if(i>=0)s.splice(i,1);else s.push(n);
    s.sort(function(a,b){return a-b;});
    var inp=document.getElementById('f_txt');if(inp)inp.value=s.join(', ');
    api.refreshPicker();
  }
  function preview(){
    var el=document.getElementById('tx-auto-preview');if(!el)return;
    var nombre=v('f_txn').trim();
    if(!nombre){el.innerHTML='💡 Escribe el nombre del tratamiento para ver su vínculo con el odontograma.';return;}
    var det=detect(nombre);
    if(!det||det.tipo==='none'){el.innerHTML='ℹ️ Este tratamiento <b>no se vincula</b> automáticamente al odontograma (se registrará igual).';return;}
    if(det.tipo==='surface'){el.innerHTML='🦷 <b>Vínculo automático — '+esc(det.etiqueta)+':</b> al marcarlo ✓ Realizado seleccionarás las superficies (Vestibular, Distal, Palatino/Lingual, Mesial, Oclusal) y se pintarán de azul (Obturado).';return;}
    var pend=det.pend&&O.WHOLE.find(function(w){return w.id===det.pend;}),done=det.done&&O.WHOLE.find(function(w){return w.id===det.done;});
    el.innerHTML='🦷 <b>Vínculo automático — '+esc(det.etiqueta)+'</b><br><span style="display:inline-flex;align-items:center;gap:5px;margin-top:4px">Pendiente: '+(pend?O.legSvg(pend,false)+' '+esc(pend.label):'—')+
      '</span><br><span style="display:inline-flex;align-items:center;gap:5px;margin-top:2px">Realizado: '+(done?O.legSvg(done,false)+' '+esc(done.label):'—')+'</span>';
  }
  function openAdd(){
    if(!Patients.current())return;
    var svc=(servicios||[]).length?'<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">⚡ Seleccionar del catálogo</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+
      servicios.map(function(s){return '<button class="svc-chip" data-action="treatments.pickService" data-nombre="'+esc(s.nombre)+'" data-precio="'+esc(s.precio)+'">'+esc(s.nombre)+' <span style="font-weight:700;color:var(--green)">'+money(s.precio)+'</span></button>';}).join('')+
      '</div><div style="border-top:1px solid var(--border);margin:12px 0 10px"></div></div>':'';
    openModal('<div class="modal-title">Agregar tratamiento</div>'+svc+
      '<div class="form-row form-full"><div class="form-group"><label>Tratamiento *</label><input id="f_txn" placeholder="Obturación resina, Extracción, Endodoncia, Corona..." data-on-input="treatments.preview"></div></div>'+
      '<div id="tx-auto-preview" style="font-size:11px;background:var(--bg);border:1px dashed var(--border);border-radius:8px;padding:8px 10px;margin-bottom:12px;color:var(--text3);line-height:1.6">💡 Escribe el nombre del tratamiento para ver su vínculo con el odontograma.</div>'+
      '<div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:4px">🦷 Diente(s) — haz clic para seleccionar</div>'+
      '<div id="tx-dientes-picker" style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;max-height:200px;overflow-y:auto;overflow-x:auto">'+renderTeethPicker('')+'</div>'+
      '<div class="form-row"><div class="form-group"><label>Seleccionados / escribir manual</label><input id="f_txt" placeholder="36, 37 o General" data-on-input="treatments.refreshPicker"></div><div class="form-group"><label>Fecha</label><input id="f_txd" type="date" value="'+today()+'"></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Costo ($)</label><input id="f_txc" type="number" min="0" step="0.01"></div><div class="form-group"><label>Estado</label><select id="f_txs"><option value="pendiente">Pendiente</option><option value="realizado">Realizado</option></select></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="treatments.saveNew">Guardar</button></div>');
    var m=document.querySelector('.modal');if(m)m.style.width='620px';
  }
  function pickService(nombre,precio){
    var n=document.getElementById('f_txn'),c=document.getElementById('f_txc');
    if(n)n.value=nombre;if(c)c.value=(Number(precio)||0).toFixed(2);
    if(n){n.focus();api.preview();}
  }
  function saveNew(){
    var p=Patients.current();if(!p)return;
    var r=check({name:v('f_txn'),tooth:v('f_txt'),date:v('f_txd'),cost:v('f_txc'),status:v('f_txs')});
    if(!r.ok){alert(r.error);return;}
    if(r.warnings.length&&!confirm('No reconozco como diente: '+r.warnings.map(function(w){return '«'+w+'»';}).join(', ')+'.\nEscribe los números separados por comas (36, 37), un rango (11-14) o «General».\n\nSi guardas así, el tratamiento no se vinculará con el odontograma.\n¿Guardar de todos modos?'))return;
    var tx=api.add(p.id,r.clean);closeModal();
    try{autoMark(p,tx);}catch(e){console.error('Error auto-marcado:',e);}   // primero se vincula con el odontograma…
    Ficha.render();                                                          // …y después se dibuja, para que la lista ya muestre el vínculo
  }
  function doneUI(id){
    var p=Patients.current(),t=p&&get(p,id);if(!t)return;
    var r=api.markDone(p.id,id);if(!r)return;
    try{evolve(p,r);}catch(e){console.error('Error evolución:',e);}
    Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),t=p&&get(p,id);if(!t)return;
    if(!confirm('¿Eliminar el tratamiento «'+t.name+'» (diente '+t.tooth+', '+money(t.cost)+')?'+(t.status==='realizado'?'\nYa está realizado: dejará de contar en el saldo del paciente.':'')))return;
    var clear=false;
    try{var d=t.autoOdo&&describeAuto(t.autoOdo);
      if(d)clear=confirm('Este tratamiento marcó automáticamente el odontograma:\n\n'+d+'\n\n¿Quitar también esas marcas?\n(Aceptar = quitar · Cancelar = conservar)');}catch(e){console.error(e);}
    api.remove(p.id,id,{clearOdo:clear});Ficha.render();
  }

  /* ── motor tratamiento ↔ odontograma ── */
  function wholeConflicts(p,teeth,symbol){
    var out=[];
    teeth.forEach(function(n){
      var w=p.wholeData[n],hasSup=O.surfacesOf(p,n).length>0;
      if(w&&w!==symbol)out.push('Diente '+n+': ya tiene "'+O.wholeLabel(w)+'"');
      else if(!w&&hasSup)out.push('Diente '+n+': tiene superficies marcadas (se limpiarán)');
    });
    return out;
  }
  function applyWhole(p,teeth,symbol){
    var c=wholeConflicts(p,teeth,symbol);
    if(c.length&&!confirm('⚠️ Marcas previas en el odontograma:\n\n• '+c.join('\n• ')+'\n\n¿Sobrescribir con el nuevo símbolo?'))return false;
    teeth.forEach(function(n){O.ZONES.forEach(function(z){delete p.surfData[n+'_'+z];});p.wholeData[n]=symbol;});
    return true;
  }
  function autoMark(p,tx){
    var det=detect(tx.name);if(!det||det.tipo==='none')return;
    var teeth=parseTeeth(tx.tooth);if(!teeth.length)return;
    p.surfData=p.surfData||{};p.wholeData=p.wholeData||{};
    if(det.tipo==='whole'){
      tx.autoOdo={tipo:'whole',dientes:teeth,simboloPend:det.pend,simboloDone:det.done};
      var sym=tx.status==='realizado'?det.done:det.pend;
      if(!sym){save();O.notify('🦷 "'+det.etiqueta+'" registrada. Al marcarla ✓ Realizado se dibujará en el odontograma.');return;}
      if(applyWhole(p,teeth,sym)){save();O.notify('🦷 Odontograma actualizado: '+det.etiqueta+' '+(tx.status==='realizado'?'REALIZADA':'PENDIENTE')+' · Diente(s) '+teeth.join(', '));}
      else save();
    }else if(det.tipo==='surface'){
      tx.autoOdo={tipo:'surface',dientes:teeth,zonas:{}};save();
      if(tx.status==='realizado')api.openSurfaces(teeth,tx);
      else O.notify('🦷 "'+det.etiqueta+'" pendiente: al marcarla ✓ Realizado elegirás las superficies.');
    }
  }
  function evolve(p,t){
    var a=t.autoOdo;p.surfData=p.surfData||{};p.wholeData=p.wholeData||{};
    if(a&&a.tipo==='whole'&&a.simboloDone){
      var teeth=a.dientes||[];if(!teeth.length)return;
      var c=[];teeth.forEach(function(n){var w=p.wholeData[n];if(w&&w!==a.simboloPend&&w!==a.simboloDone)c.push('Diente '+n+': tiene "'+O.wholeLabel(w)+'"');});
      if(c.length&&!confirm('⚠️ Evolución pendiente → realizada.\nSímbolos distintos encontrados:\n\n• '+c.join('\n• ')+'\n\n¿Sobrescribir igualmente?'))return;
      teeth.forEach(function(n){var w=p.wholeData[n];if(!w||w===a.simboloPend||w===a.simboloDone){O.ZONES.forEach(function(z){delete p.surfData[n+'_'+z];});p.wholeData[n]=a.simboloDone;}});
      save();O.notify('✅ Evolución aplicada: símbolo de REALIZADO en diente(s) '+teeth.join(', '));
    }else if(a&&a.tipo==='surface'){
      api.openSurfaces(a.dientes&&a.dientes.length?a.dientes:parseTeeth(t.tooth),t);
    }else if(!a){
      var det=detect(t.name);if(!det||det.tipo==='none')return;
      var ts=parseTeeth(t.tooth);if(!ts.length)return;
      if(det.tipo==='whole'&&det.done){
        if(!confirm('¿Marcar en el odontograma "'+det.etiqueta+'" como REALIZADA en diente(s) '+ts.join(', ')+'?'))return;
        if(applyWhole(p,ts,det.done)){t.autoOdo={tipo:'whole',dientes:ts,simboloPend:det.pend,simboloDone:det.done};save();O.notify('🦷 Odontograma actualizado: '+det.etiqueta+' realizada · Diente(s) '+ts.join(', '));}
      }else if(det.tipo==='surface'){
        t.autoOdo={tipo:'surface',dientes:ts,zonas:{}};save();api.openSurfaces(ts,t);
      }
    }
  }
  function openSurfaces(teeth,tx){
    if(!teeth.length){O.notify('⚠️ No hay dientes válidos para marcar');return;}
    var p=Patients.current();if(!p)return;supTx=tx.id;
    var html='<div class="modal-title">🦷 Marcar superficies — '+esc(tx.name)+'</div><div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">Selecciona las superficies obturadas en cada diente. Se aplicará el símbolo oficial <strong>Obturado</strong> (azul).</div>';
    teeth.forEach(function(n){
      html+='<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px"><div style="font-size:13px;font-weight:700;margin-bottom:8px">Diente '+n+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'+
        O.ZONES.map(function(z){
          var ex=(p.surfData||{})[n+'_'+z],s=ex&&O.SURF.find(function(x){return x.id===ex;});
          return '<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;background:var(--bg)"><input type="checkbox" id="sup_'+n+'_'+z+'" style="width:15px;height:15px;accent-color:var(--accent)"><span style="flex:1">'+esc(O.zoneNamesFor(n)[z])+'</span>'+(ex?'<span style="font-size:10px;color:var(--amber);font-weight:600">⚠ '+esc(s?s.label:ex)+'</span>':'')+'</label>';
        }).join('')+'</div></div>';
    });
    html+='<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Ahora no</button><button class="btn-primary" data-action="treatments.applySurfaces">Aplicar al odontograma</button></div>';
    openModal(html);var m=document.querySelector('.modal');if(m)m.style.width='520px';
  }
  function applySurfaces(){
    var p=Patients.current(),tx=p&&get(p,supTx);if(!p)return;
    var teeth=(tx&&tx.autoOdo&&tx.autoOdo.dientes)||[],zonas={},c=[];
    p.surfData=p.surfData||{};p.wholeData=p.wholeData||{};
    teeth.forEach(function(n){
      var marked=[],whole=false;
      O.ZONES.forEach(function(z){
        var chk=document.getElementById('sup_'+n+'_'+z);
        if(chk&&chk.checked){
          marked.push(z);var ex=p.surfData[n+'_'+z];
          if(ex&&ex!=='obturado')c.push('Diente '+n+' · '+O.zoneNamesFor(n)[z]+': tiene "'+((O.SURF.find(function(s){return s.id===ex;})||{}).label||ex)+'"');
          if(p.wholeData[n]&&!whole){c.push('Diente '+n+': tiene símbolo completo "'+O.wholeLabel(p.wholeData[n])+'" (se quitará)');whole=true;}
        }
      });
      if(marked.length)zonas[n]=marked;
    });
    if(!Object.keys(zonas).length){alert('Selecciona al menos una superficie');return;}
    if(c.length&&!confirm('⚠️ Marcas previas encontradas:\n\n• '+c.join('\n• ')+'\n\n¿Sobrescribir?'))return;
    Object.keys(zonas).forEach(function(n){delete p.wholeData[n];zonas[n].forEach(function(z){p.surfData[n+'_'+z]='obturado';});});
    if(tx)tx.autoOdo={tipo:'surface',dientes:teeth,zonas:zonas};
    save();closeModal();Ficha.render();
    O.notify('🦷 Odontograma actualizado: '+Object.keys(zonas).map(function(n){return 'diente '+n+' ('+zonas[n].map(function(z){return O.zoneNamesFor(n)[z];}).join(', ')+')';}).join(' · '));
  }
  function suggestForm(title,boxStyle,msgHtml,name,price,extraHtml,okAct,okLbl,attrs){
    return '<div class="modal-title">💡 '+title+'</div><div style="'+boxStyle+';border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12.5px">'+msgHtml+'</div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Tratamiento *</label><input id="f_stn" value="'+esc(name)+'"></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Costo ($)</label><input id="f_stc" type="number" min="0" step="0.01" value="'+esc(price)+'"></div><div class="form-group"><label>Fecha</label><input id="f_std" type="date" value="'+today()+'"></div></div>'+extraHtml+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">No, gracias</button><button class="btn-primary" data-action="'+okAct+'" '+attrs+'>'+okLbl+'</button></div>';
  }
  function priceOf(s){return s?(Number(s.precio)||0).toFixed(2):'';}
  function openSuggestFromOdonto(tooth,odoId){
    var info=TX_FOR[odoId];if(!info||!Patients.current())return;
    var svc=(servicios||[]).find(function(s){return String(s.nombre).toLowerCase().indexOf(info.name.toLowerCase())>-1;});
    openModal(suggestForm('Tratamiento sugerido','background:#dbeafe;border:1px solid #93c5fd;color:#1e40af',
      'Marcaste <strong>"'+esc(O.wholeLabel(odoId))+'"</strong> en el diente <strong>'+esc(tooth)+'</strong>. ¿Registrar el tratamiento <strong>'+esc(info.name)+'</strong> como <strong>'+esc(info.status)+'</strong>?',
      svc?svc.nombre:info.name,priceOf(svc),'<div style="font-size:11px;color:var(--text3);margin-bottom:10px">🦷 Diente: <b>'+esc(tooth)+'</b> · El tratamiento quedará vinculado al símbolo del odontograma.</div>',
      'treatments.createFromOdonto','+ Crear tratamiento','data-tooth="'+esc(tooth)+'" data-odo="'+esc(odoId)+'"'));
  }
  function createFromOdonto(tooth,odoId){
    var p=Patients.current(),info=TX_FOR[odoId];if(!p||!info)return;
    var r=check({name:v('f_stn'),tooth:String(tooth),date:v('f_std'),cost:v('f_stc'),status:info.status});
    if(!r.ok){alert(r.error);return;}
    var det=detect(r.clean.name),tx=api.add(p.id,r.clean);
    tx.autoOdo=(det&&det.tipo==='whole')?{tipo:'whole',dientes:[Number(tooth)],simboloPend:det.pend,simboloDone:det.done,origen:'odontograma'}
      :{tipo:'whole',dientes:[Number(tooth)],simboloPend:odoId,simboloDone:odoId,origen:'odontograma'};
    save();closeModal();if(curTab==='odontograma')Ficha.render();
    O.notify('✅ Tratamiento "'+r.clean.name+'" creado ('+info.status+') y vinculado al diente '+tooth);
  }
  function openSuggestFromCaries(tooth,zone){
    if(!Patients.current())return;
    var svc=(servicios||[]).find(function(s){return /obturaci|resina/i.test(s.nombre);});
    openModal(suggestForm('Tratamiento sugerido','background:#f0e7d8;border:1px solid #dcc39c;color:#6b4a2f',
      'Se marcó <strong>caries</strong> en el diente <strong>'+esc(tooth)+'</strong> ('+esc(O.zoneNamesFor(tooth)[zone])+'). ¿Registrar el tratamiento pendiente correspondiente?',
      svc?svc.nombre:'Obturación resina',priceOf(svc),svc?'<div style="font-size:11px;color:var(--text3);margin-bottom:10px">⚡ Precio tomado del catálogo de servicios.</div>':'',
      'treatments.createFromCaries','+ Crear tratamiento pendiente','data-tooth="'+esc(tooth)+'"'));
  }
  function createFromCaries(tooth){
    var p=Patients.current();if(!p)return;
    var r=check({name:v('f_stn'),tooth:String(tooth),date:v('f_std'),cost:v('f_stc'),status:'pendiente'});
    if(!r.ok){alert(r.error);return;}
    var tx=api.add(p.id,r.clean);tx.autoOdo={tipo:'surface',dientes:[Number(tooth)],zonas:{},origen:'odontograma'};
    save();closeModal();if(curTab==='odontograma')Ficha.render();
    O.notify('✅ Tratamiento "'+r.clean.name+'" creado como pendiente para el diente '+tooth);
  }
  function describeAuto(a){
    if(!a)return '';
    if(a.tipo==='whole')return 'Símbolo de diente completo en: '+(a.dientes||[]).join(', ');
    if(a.tipo==='surface'){
      var zs=Object.keys(a.zonas||{});
      if(!zs.length)return 'Dientes reservados para superficies: '+(a.dientes||[]).join(', ');
      return 'Obturación marcada en: '+zs.map(function(n){return 'diente '+n+' ('+a.zonas[n].map(function(x){return O.zoneNamesFor(n)[x];}).join(', ')+')';}).join(' · ');
    }
    return '';
  }
  function clearAuto(p,a){
    if(a.tipo==='whole'){(a.dientes||[]).forEach(function(n){var w=p.wholeData[n];if(w===a.simboloPend||w===a.simboloDone)delete p.wholeData[n];});}
    else if(a.tipo==='surface'){Object.keys(a.zonas||{}).forEach(function(n){a.zonas[n].forEach(function(z){if(p.surfData[n+'_'+z]==='obturado')delete p.surfData[n+'_'+z];});});}
  }

  var api={TX_FOR:TX_FOR,detect:detect,parseTeeth:parseTeeth,unrecognized:unrecognized,check:check,add:add,markDone:markDone,remove:remove,get:get,
    autoMark:autoMark,evolve:evolve,describeAuto:describeAuto,clearAuto:clearAuto,
    render:render,renderTeethPicker:renderTeethPicker,refreshPicker:refreshPicker,toggleTooth:toggleTooth,preview:preview,openAdd:openAdd,pickService:pickService,saveNew:saveNew,doneUI:doneUI,deleteUI:deleteUI,
    openSurfaces:openSurfaces,applySurfaces:applySurfaces,openSuggestFromOdonto:openSuggestFromOdonto,createFromOdonto:createFromOdonto,openSuggestFromCaries:openSuggestFromCaries,createFromCaries:createFromCaries};
  return api;
})();

/* ═══════════════════════════ IMÁGENES ═══════════════════════════ */
const Images=(function(){
  'use strict';
  var CATS=['Radiografía periapical','Radiografía panorámica','Radiografía bitewing','Fotografía clínica','Fotografía extraoral','Fotografía intraoral','Otro'];
  var fullUrl=null;
  function list(p){return p.images||(p.images=[]);}
  function get(p,id){return list(p).find(function(x){return String(x.id)===String(id);})||null;}
  // solo se pinta como imagen lo que realmente es una imagen en base64 (un respaldo manipulado no puede meter otra cosa en src)
  function safeSrc(s){return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[A-Za-z0-9+\/=]*$/i.test(String(s||''))?String(s):'';}

  function check(f){
    f=f||{};
    var c={name:Ficha.clean(f.name,120),tipo:CATS.indexOf(f.tipo)>-1?f.tipo:'Otro',fecha:String(f.fecha||'').trim(),notas:Ficha.clean(f.notas,300)};
    if(!c.name)return {ok:false,error:'Escribe un nombre para la imagen'};
    if(!Ficha.isDate(c.fecha))return {ok:false,error:Ficha.isDate(c.fecha,{future:true})?'La fecha de la imagen no puede ser futura':'La fecha no es válida'};
    return {ok:true,clean:c};
  }
  function update(pid,id,c){var p=Patients.get(pid),im=p&&get(p,id);if(!im)return null;Object.assign(im,c);save();return im;}
  function remove(pid,id){
    var p=Patients.get(pid);if(!p||!get(p,id))return false;
    p.images=list(p).filter(function(x){return String(x.id)!==String(id);});
    imgDbDel(id).catch(function(){});save();return true;
  }
  // Carga el archivo en un <img>. El paciente se fija ANTES de empezar: si el usuario cambia de ficha mientras se sube, nada se mezcla.
  function load(file){
    return new Promise(function(ok,ko){
      var im=new Image();im.onerror=function(){ko(new Error('imagen'));};im.onload=function(){ok(im);};
      var done=false;
      try{if(window.URL&&URL.createObjectURL){im.src=URL.createObjectURL(file);done=true;}}catch(e){}
      if(done)return;
      var r=new FileReader();r.onerror=function(){ko(new Error('lectura'));};r.onload=function(){im.src=r.result;};r.readAsDataURL(file);
    });
  }
  function thumb(im){
    var T=400,w=im.width,h=im.height;
    if(w>T||h>T){if(w>h){h=Math.round(h*(T/w));w=T;}else{w=Math.round(w*(T/h));h=T;}}
    var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
    return c.toDataURL('image/jpeg',0.8);
  }
  function upload(files,p){
    files=Array.from(files||[]);
    var res={added:0,failed:0};
    if(!p||!files.length)return Promise.resolve(res);
    var chain=Promise.resolve();
    files.forEach(function(file){
      chain=chain.then(function(){
        if(!/^image\//.test(file.type)){res.failed++;return;}
        return load(file).then(function(im){
          var id=uid(),rec={id:id,name:Ficha.clean(String(file.name).replace(/\.[^.]+$/,''),120)||'Imagen',tipo:'Radiografía periapical',fecha:today(),data:thumb(im),notas:'',size:fmtBytes(file.size),full:true};
          return imgDbPut(id,file).catch(function(){rec.full=false;}).then(function(){list(p).push(rec);res.added++;});   // sin IndexedDB: solo queda la miniatura
        }).catch(function(){res.failed++;});
      });
    });
    return chain.then(function(){if(res.added){try{save();}catch(e){}}return res;});
  }
  function uploadUI(files){
    var p=Patients.current();if(!p)return Promise.resolve({added:0,failed:0});
    return api.upload(files,p).then(function(r){
      if(r.failed)alert(r.failed===1?'Un archivo no se guardó: no es una imagen válida o no se pudo leer.':r.failed+' archivos no se guardaron: no son imágenes válidas o no se pudieron leer.');
      if(Patients.current()===p&&curTab==='imagenes')Ficha.render();
      return r;
    });
  }

  function render(){
    var p=Patients.current(),imgs=list(p);
    return '<div class="card" style="position:relative" data-on-dragover="images.dragOver" data-on-dragleave="images.dragLeave" data-on-drop="images.drop">'+
      '<div id="img-dropzone" style="display:none;position:absolute;inset:0;z-index:50;background:rgba(14,165,233,.12);border:3px dashed var(--accent);border-radius:14px;align-items:center;justify-content:center;flex-direction:column;gap:8px;pointer-events:none"><div style="font-size:34px">📥</div><div style="font-size:14px;font-weight:700;color:var(--accent)">Suelta las imágenes aquí</div><div style="font-size:11px;color:var(--text2)">Se guardan en su calidad original, sin límite de peso</div></div>'+
      '<div class="action-row"><div class="card-title" style="margin:0">Imágenes del paciente</div><div style="display:flex;gap:8px"><label style="padding:7px 16px;background:var(--accent);color:#fff;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px">📷 Subir imágenes<input type="file" accept="image/*" multiple style="display:none" data-on-change="images.upload"></label></div></div>'+
      (imgs.length===0?'<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:40px;margin-bottom:12px">🦷📷</div><div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin imágenes registradas</div><div style="font-size:12px">Sube radiografías o fotografías clínicas del paciente</div></div>'
      :'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:4px">'+imgs.map(function(img){
        return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;overflow:hidden;position:relative"><img src="'+esc(safeSrc(img.data))+'" alt="'+esc(img.name)+'" style="width:100%;height:150px;object-fit:cover;display:block;cursor:pointer" data-action="images.view" data-id="'+esc(img.id)+'">'+
          '<div style="padding:10px"><div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px">'+esc(img.name)+'</div><div style="font-size:10px;color:var(--text3)">'+esc(img.tipo||'Imagen')+' · '+esc(fmtDate(img.fecha))+(img.size?' · '+esc(img.size):'')+'</div>'+
          (img.notas?'<div style="font-size:11px;color:var(--text2);margin-top:4px">'+esc(img.notas)+'</div>':'')+'</div>'+
          '<button data-action="images.delete" data-id="'+esc(img.id)+'" aria-label="Eliminar imagen" style="position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(0,0,0,.5);border:none;border-radius:50%;color:#fff;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button></div>';
      }).join('')+'</div>')+'</div>'+
      '<div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px"><div style="font-size:18px">💡</div><div style="font-size:12px;color:#1e40af">Arrastra y suelta radiografías o fotografías directamente sobre esta tarjeta, o usa el botón 📷. Los archivos se guardan en su calidad original en tu computadora (IndexedDB), sin límite de peso.</div></div>';
  }
  function view(id){
    var p=Patients.current(),img=p&&get(p,id);if(!img)return;
    openModal('<div class="modal-title">Imagen — '+esc(img.name)+'</div>'+
      '<img id="fullimg-'+esc(img.id)+'" src="'+esc(safeSrc(img.data))+'" alt="'+esc(img.name)+'" style="width:100%;max-height:360px;object-fit:contain;border-radius:10px;background:#0f172a;margin-bottom:14px">'+
      (img.full?'<div style="font-size:10px;color:var(--text3);margin:-8px 0 10px">🔍 Calidad original · '+esc(img.size||'')+'</div>':'')+
      '<div class="form-row"><div class="form-group"><label>Nombre</label><input id="f_iname" value="'+esc(img.name)+'"></div><div class="form-group"><label>Tipo</label><select id="f_itipo">'+CATS.map(function(c){return '<option'+(c===img.tipo?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ifecha" type="date" max="'+today()+'" value="'+esc(img.fecha)+'"></div><div class="form-group"><label>Notas</label><input id="f_inotas" value="'+esc(img.notas||'')+'"></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button><button class="btn-primary" data-action="images.saveEdit" data-id="'+esc(img.id)+'">Guardar cambios</button></div>');
    var m=document.querySelector('.modal');if(m)m.style.width='640px';
    if(img.full){
      imgDbGet(img.id).then(function(blob){
        if(!blob||!window.URL||!URL.createObjectURL)return;
        var el=document.getElementById('fullimg-'+img.id);if(!el)return;       // la ventana ya se cerró
        if(fullUrl)try{URL.revokeObjectURL(fullUrl);}catch(e){}
        fullUrl=URL.createObjectURL(blob);el.src=fullUrl;
      }).catch(function(){});
    }
  }
  function saveEdit(id){
    var p=Patients.current();if(!p||!get(p,id))return;
    var r=check({name:v('f_iname'),tipo:v('f_itipo'),fecha:v('f_ifecha'),notas:v('f_inotas')});
    if(!r.ok){alert(r.error);return;}
    api.update(p.id,id,r.clean);closeModal();Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),img=p&&get(p,id);if(!img)return;
    if(!confirm('¿Eliminar la imagen «'+img.name+'»?\nSe borra también el archivo original guardado en este equipo y no se puede recuperar.'))return;
    api.remove(p.id,id);Ficha.render();
  }
  var api={CATS:CATS,safeSrc:safeSrc,check:check,update:update,remove:remove,get:get,upload:upload,uploadUI:uploadUI,render:render,view:view,saveEdit:saveEdit,deleteUI:deleteUI};
  return api;
})();

/* ═══ Acciones del módulo (reemplazan los onclick del HTML) ═══ */
App.actions({
  'ficha.tab':function(c){Ficha.tab(c.data.tab);},
  'diary.openAdd':function(){Diary.openAdd();},'diary.saveNew':function(){Diary.saveNew();},
  'diary.openEdit':function(c){Diary.openEdit(c.id);},'diary.saveEdit':function(c){Diary.saveEdit(c.id);},'diary.delete':function(c){Diary.deleteUI(c.id);},
  'odonto.zone':function(c){c.event.stopPropagation();Odonto.openZone(c.data.tooth,c.data.zone,c.el);},
  'odonto.setSurf':function(c){Odonto.setSurface(c.data.id);},'odonto.setWhole':function(c){Odonto.setWhole(c.data.id);},
  'odonto.clearTooth':function(){Odonto.clearSelected();},
  'odonto.openSnapshotForm':function(){Odonto.openSnapshotForm();},'odonto.saveSnapshot':function(){Odonto.saveSnapshot();},
  'odonto.openSnapshot':function(c){Odonto.openSnapshot(c.id);},'odonto.printSnapshot':function(c){Odonto.printSnapshot(c.id);},'odonto.deleteSnapshot':function(c){Odonto.deleteSnapshotUI(c.id);},
  'treatments.openAdd':function(){Treatments.openAdd();},'treatments.saveNew':function(){Treatments.saveNew();},
  'treatments.pickService':function(c){Treatments.pickService(c.data.nombre,c.data.precio);},
  'treatments.preview':function(){Treatments.preview();},'treatments.refreshPicker':function(){Treatments.refreshPicker();},
  'treatments.toggleTooth':function(c){Treatments.toggleTooth(Number(c.data.n));},
  'treatments.done':function(c){Treatments.doneUI(c.id);},'treatments.delete':function(c){Treatments.deleteUI(c.id);},
  'treatments.applySurfaces':function(){Treatments.applySurfaces();},
  'treatments.createFromOdonto':function(c){Treatments.createFromOdonto(Number(c.data.tooth),c.data.odo);},
  'treatments.createFromCaries':function(c){Treatments.createFromCaries(Number(c.data.tooth));},
  'images.upload':function(c){var f=Array.from(c.el.files||[]);c.el.value='';Images.uploadUI(f);},
  'images.dragOver':function(c){c.event.preventDefault();var d=document.getElementById('img-dropzone');if(d)d.style.display='flex';},
  'images.dragLeave':function(c){c.event.preventDefault();var d=document.getElementById('img-dropzone');if(d)d.style.display='none';},
  'images.drop':function(c){c.event.preventDefault();var d=document.getElementById('img-dropzone');if(d)d.style.display='none';Images.uploadUI(Array.from((c.event.dataTransfer&&c.event.dataTransfer.files)||[]));},
  'images.view':function(c){Images.view(c.id);},'images.saveEdit':function(c){Images.saveEdit(c.id);},'images.delete':function(c){Images.deleteUI(c.id);}
});
