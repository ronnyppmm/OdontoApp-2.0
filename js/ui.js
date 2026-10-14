/* ═══ UI BASE — navegación, modales, dashboard, configuración, logo/tema ═══
   Dashboard  = cálculo y pantalla de inicio          Settings = datos de la clínica, tema, WhatsApp, página de Configuración
   Services   = catálogo de servicios                 Meds     = medicamentos sugeridos en recetas
   Logo       = imagen y color de acento              Nav      = showPage / openModal / closeModal
   Todo se maneja por data-action (ver js/app.js); ningún texto del usuario viaja dentro de código JavaScript. */

/* ── pequeñas utilidades de almacenamiento (el navegador puede negarlas) ── */
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,val){try{localStorage.setItem(k,val);return true;}catch(e){return false;}}
function lsDel(k){try{localStorage.removeItem(k);}catch(e){}}

/* ═══════════════ NAVEGACIÓN Y MODALES ═══════════════ */
var Nav=(function(){
  var TITLES={dashboard:'Dashboard',agenda:'Agenda de Citas',estadisticas:'Estadísticas',recordatorios:'Recordatorios de pacientes',configuracion:'⚙️ Configuración'};
  function show(page){
    if(!TITLES[page])page='dashboard';
    curPage=page;Patients.setCurrent(null);
    document.querySelectorAll('.sb-item').forEach(function(i){i.classList.remove('active');});
    var el=document.getElementById('nav-'+page);if(el)el.classList.add('active');
    document.getElementById('ptBadge').style.display='none';
    document.getElementById('topActions').innerHTML='';
    document.getElementById('tabsBar').style.display='none';
    document.body.classList.remove('pt-open');
    document.getElementById('ptWinHeader').innerHTML='';
    Patients.renderList();
    document.getElementById('ptTitle').textContent=TITLES[page];
    var fns={dashboard:function(){return Dashboard.render();},agenda:function(){return Agenda.renderPage();},estadisticas:function(){return Finance.renderStats();},recordatorios:function(){return renderRecordatorios();},configuracion:function(){return renderConfiguracion();}};
    document.getElementById('mainContent').innerHTML=fns[page]();
    if(page==='configuracion'){setTimeout(function(){try{pintarMedidor();}catch(e){}},150);Settings.startClock();}
  }
  function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modalOverlay').classList.add('show');}
  function closeModal(){document.getElementById('modalOverlay').classList.remove('show');factItemCount=0;}
  return {show:show,openModal:openModal,closeModal:closeModal,TITLES:TITLES};
})();

/* ═══════════════ DASHBOARD ═══════════════ */
var Dashboard=(function(){
  function hourNow(){var d=new Date(),off=getTzOffset();return new Date(d.getTime()+(d.getTimezoneOffset()+off*60)*60000).getHours();}
  function isPending(a){return !a.status||a.status==='pendiente';}
  function byTime(a,b){return String(a.time||'').localeCompare(String(b.time||''));}
  function arr(x){return Array.isArray(x)?x:[];}

  /* Calcula todo lo que muestra el inicio, sin dibujar nada. Tolera citas sin hora, pagos sin monto, pacientes sin listas. */
  function compute(){
    var td=today(),ym=td.slice(0,7),md=td.slice(5);
    var todayAppts=[],upcoming=[],factPend=[],birthdays=[],mIncome=0,mEgresos=0;
    Patients.all().forEach(function(p){
      arr(p.appointments).forEach(function(a){
        if(!a||!a.date||!isPending(a))return;
        var row={id:a.id,date:a.date,time:a.time||'',reason:a.reason||'',ptName:p.name,ptId:p.id,type:'patient'};
        if(a.date===td)todayAppts.push(row);else if(a.date>td)upcoming.push(row);
      });
      arr(p.payments).forEach(function(py){
        if(!py)return;
        if(py.factPendiente)factPend.push({id:py.id,date:py.date||'',concept:py.concept||'',amount:Number(py.amount)||0,ptName:p.name,ptId:p.id,cedula:p.cedula});
        if(!py.archivado&&String(py.date||'').slice(0,7)===ym)mIncome=addM(mIncome,py.amount);
      });
      if(p.birthdate&&String(p.birthdate).slice(5)===md)birthdays.push(p);
    });
    quickAppts.forEach(function(a){
      if(!a||!a.date||!isPending(a))return;
      var row={id:a.id,date:a.date,time:a.time||'',reason:a.reason||'',ptName:a.ptName||'',ptId:null,type:'quick'};
      if(a.date===td)todayAppts.push(row);else if(a.date>td)upcoming.push(row);
    });
    egresos.forEach(function(e){if(e&&!e.archivado&&String(e.fecha||'').slice(0,7)===ym)mEgresos=addM(mEgresos,e.monto);});
    todayAppts.sort(byTime);
    upcoming.sort(function(a,b){return a.date.localeCompare(b.date)||byTime(a,b);});
    factPend.sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
    return {todayStr:td,todayAppts:todayAppts,upcoming:upcoming,factPend:factPend,birthdays:birthdays,
      mIncome:mIncome,mEgresos:mEgresos,utilidad:r2(mIncome-mEgresos),totalPacientes:Patients.all().length};
  }

  /* botón de una cita: ficha del paciente o detalle de la cita rápida */
  function apptBtn(a){
    return a.type==='quick'
      ?'<button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="agenda.openDetail" data-id="'+esc(a.id)+'" data-type="quick" data-pt="">Ver cita</button>'
      :'<button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="patients.select" data-id="'+esc(a.ptId)+'">Ver</button>';
  }
  function nameOf(a){return a.ptName?esc(a.ptName):'<i>(sin nombre)</i>';}

  function render(){
    var d=compute(),now=new Date(),h=hourNow();
    var greeting=h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
    var n=d.todayAppts.length;
    var bday=d.birthdays.map(function(p){
      return '<div class="bday-card"><div style="font-size:28px">🎂</div><div style="flex:1"><div style="font-size:14px;font-weight:700;color:#063154">¡'+esc(p.name)+' cumple años hoy!</div><div style="font-size:12px;color:#2f7d74">'+esc(calcAge(p.birthdate))+' años</div></div><button class="btn-sm" data-action="patients.select" data-id="'+esc(p.id)+'">Ver ficha</button></div>';
    }).join('');
    var fp=d.factPend,totFact=fp.reduce(function(s,p){return addM(s,p.amount);},0);
    var factHtml=fp.length?'<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:14px;padding:16px;margin-bottom:16px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:24px">🧾</div><div>'+
      '<div style="font-size:14px;font-weight:700;color:#6b4a2f">'+fp.length+' factura'+(fp.length>1?'s':'')+' pendiente'+(fp.length>1?'s':'')+' de emitir en el SRI</div>'+
      '<div style="font-size:12px;color:#8a6a4a">Total: <strong>'+money(totFact)+'</strong></div></div></div>'+
      '<a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank" rel="noopener" style="padding:8px 14px;background:#b98a4e;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0">🌐 Ir al SRI</a></div>'+
      fp.slice(0,5).map(function(py){
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,.6);border-radius:8px;margin-bottom:6px"><div style="flex:1">'+
          '<div style="font-size:12px;font-weight:600;color:#6b4a2f">'+esc(py.ptName)+'</div>'+
          '<div style="font-size:11px;color:#8a6a4a">'+esc(py.concept)+' · '+fmtDate(py.date)+' · CI: '+esc(py.cedula||'—')+'</div></div>'+
          '<div style="font-size:13px;font-weight:700;color:#6b4a2f">'+money(py.amount)+'</div>'+
          '<button data-action="patients.select" data-id="'+esc(py.ptId)+'" style="padding:4px 10px;font-size:11px;background:rgba(255,255,255,.8);border:1px solid #dcc39c;border-radius:6px;cursor:pointer;color:#6b4a2f">Ver</button></div>';
      }).join('')+
      (fp.length>5?'<div style="font-size:11px;color:#8a6a4a;text-align:center;margin-top:4px">+'+(fp.length-5)+' más pendientes</div>':'')+'</div>':'';
    var todayHtml=n?d.todayAppts.map(function(a){
      return '<div class="today-appt"><div class="time-badge">'+esc(a.time||'—')+'</div><div style="flex:1"><div style="font-size:13px;font-weight:600">'+nameOf(a)+'</div><div style="font-size:11px;color:var(--text2)">'+esc(a.reason)+'</div></div>'+apptBtn(a)+'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin citas para hoy</div>';
    var up=d.upcoming.slice(0,5);
    var upHtml=up.length?up.map(function(a){
      return '<div class="today-appt"><div style="width:60px;flex-shrink:0"><div style="font-size:12px;font-weight:700">'+fmtDate(a.date)+'</div><div style="font-size:10px;color:var(--text3)">'+esc(a.time||'—')+'</div></div><div style="flex:1"><div style="font-size:13px;font-weight:500">'+nameOf(a)+'</div><div style="font-size:11px;color:var(--text2)">'+esc(a.reason)+'</div></div>'+apptBtn(a)+'</div>';
    }).join(''):'<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin próximas citas</div>';
    return '<div class="dash-greeting">'+greeting+' 👋</div>'+
      '<div class="dash-sub">'+esc(now.toLocaleDateString('es-EC',{weekday:'long',day:'numeric',month:'long'}))+' · '+n+' cita'+(n!==1?'s':'')+' hoy</div>'+
      '<div class="dash-frase">"'+esc(fraseDelDia())+'"</div>'+bday+factHtml+recallCardHtml()+
      '<div class="grid4" style="margin-bottom:16px">'+
      '<div class="kpi"><div class="kpi-label">Pacientes</div><div class="kpi-val" style="color:var(--accent)">'+d.totalPacientes+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Citas hoy</div><div class="kpi-val" style="color:var(--green)">'+n+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Ingresos mes</div><div class="kpi-val" style="color:var(--green)">'+money(d.mIncome)+'</div><div class="kpi-sub" style="color:var(--red)">Egresos: '+money(d.mEgresos)+'</div></div>'+
      '<div class="kpi"><div class="kpi-label">Utilidad mes</div><div class="kpi-val" style="color:'+(d.utilidad>=0?'var(--green)':'var(--red)')+'">'+money(d.utilidad)+'</div></div></div>'+
      '<div class="grid2"><div class="card"><div class="card-title">Citas de hoy</div>'+todayHtml+'</div><div class="card"><div class="card-title">Próximas citas</div>'+upHtml+'</div></div>';
  }
  return {compute:compute,render:render};
})();

/* ═══════════════ LOGO Y COLOR ═══════════════ */
var Logo=(function(){
  var MAX_BYTES=2*1024*1024,TYPES=['image/png','image/jpeg','image/webp','image/gif'];
  var DEFAULT_COLOR='#2f9d94',COLORS=['#2f9d94','#025f67','#063154','#10b981','#b98a4e','#ef4444','#8b5cf6','#0f172a'];
  var SVG='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 2C9.2 2 7 4.2 7 7c0 2 1 4 2.2 5.2L10.5 21c.2.8.8 1 1.5 1s1.3-.2 1.5-1l1.3-8.8C16 11 17 9 17 7c0-2.8-2.2-5-5-5z"/></svg>';
  /* solo imágenes incrustadas (data:image/png|jpeg|webp|gif;base64,…): nada que pueda cerrar un atributo ni ejecutar código */
  function isSafeSrc(s){return typeof s==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(s);}
  function isColor(c){return typeof c==='string'&&/^#[0-9a-fA-F]{6}$/.test(c);}
  function applyColor(col){
    if(!isColor(col))col=DEFAULT_COLOR;
    logoColor=col;
    var icon=document.getElementById('logoIcon');
    if(!logoImg&&icon)icon.style.background=col;
    var r=document.documentElement.style;
    r.setProperty('--sbactive',col);r.setProperty('--accent',col);r.setProperty('--accent2',col+'cc');
  }
  function paintImg(src){
    var icon=document.getElementById('logoIcon');if(!icon)return;
    icon.innerHTML='';
    var im=document.createElement('img');im.src=src;im.alt='';im.style.cssText='width:100%;height:100%;object-fit:cover';
    icon.appendChild(im);icon.style.background='transparent';
  }
  function applyImg(src){
    if(!isSafeSrc(src)){logoImg=null;paintDefault();return false;}
    logoImg=src;paintImg(src);return true;
  }
  function paintDefault(){var icon=document.getElementById('logoIcon');if(!icon)return;icon.style.background=logoColor||DEFAULT_COLOR;icon.innerHTML=SVG;}
  function clear(){logoImg=null;paintDefault();save();}
  /* valida el archivo (tipo y tamaño) antes de leerlo */
  function checkFile(f){
    if(!f)return {ok:false,error:'No se eligió ningún archivo.'};
    if(TYPES.indexOf(f.type)<0)return {ok:false,error:'El logo debe ser una imagen PNG, JPG, WEBP o GIF.'};
    if(f.size>MAX_BYTES)return {ok:false,error:'La imagen pesa '+(f.size/1048576).toFixed(1)+' MB; el máximo es 2 MB (el logo se guarda en cada respaldo).'};
    return {ok:true};
  }
  function setFromFile(f){
    var c=checkFile(f);
    if(!c.ok)return Promise.resolve(c);
    return new Promise(function(res){
      var rd=new FileReader();
      rd.onload=function(){
        var data=rd.result;
        if(!applyImg(data)){res({ok:false,error:'No se pudo leer la imagen.'});return;}
        save();res({ok:true});
      };
      rd.onerror=function(){res({ok:false,error:'No se pudo leer el archivo.'});};
      rd.readAsDataURL(f);
    });
  }
  function setColor(col){if(!isColor(col))return false;applyColor(col);save();return true;}
  return {COLORS:COLORS,isSafeSrc:isSafeSrc,isColor:isColor,applyColor:applyColor,applyImg:applyImg,clear:clear,checkFile:checkFile,setFromFile:setFromFile,setColor:setColor};
})();

/* ═══════════════ CATÁLOGO DE SERVICIOS ═══════════════ */
var Services=(function(){
  var CATS=['Prevención','Operatoria','Endodoncia','Cirugía','Ortodoncia','Prótesis','Periodoncia','Estética','Radiología','General'];
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function ensureIds(){servicios.forEach(function(s){if(s&&s.id==null)s.id=uid();});}
  function list(){ensureIds();return servicios;}
  function get(id){ensureIds();for(var i=0;i<servicios.length;i++){if(String(servicios[i].id)===String(id))return servicios[i];}return null;}
  /* check → {ok, clean, error, warnings}; exceptId = el servicio que se está editando */
  function check(f,exceptId){
    f=f||{};var warnings=[];
    var nombre=String(f.nombre==null?'':f.nombre).replace(/\s+/g,' ').trim();
    if(!nombre)return {ok:false,error:'Escribe el nombre del servicio.'};
    if(nombre.length>80)return {ok:false,error:'El nombre es demasiado largo (máximo 80 letras).'};
    var raw=String(f.precio==null?'':f.precio).trim(),precio=raw===''?0:parseMonto(raw);
    if(/^\s*-/.test(raw))return {ok:false,error:'El precio no puede ser negativo.'};
    if(isNaN(precio))return {ok:false,error:'El precio no es un número válido (ejemplo: 25 o 25.50).'};
    if(precio>100000)return {ok:false,error:'El precio es demasiado alto (máximo $100000).'};
    var categoria=CATS.indexOf(f.categoria)>-1?f.categoria:'General';
    ensureIds();
    var dup=servicios.filter(function(s){return String(s.id)!==String(exceptId)&&norm(s.nombre)===norm(nombre);})[0];
    if(dup)warnings.push('Ya existe un servicio llamado «'+dup.nombre+'» ('+money(dup.precio)+').');
    if(precio===0)warnings.push('El precio es $0.00.');
    return {ok:true,clean:{nombre:nombre,precio:r2(precio),categoria:categoria},warnings:warnings};
  }
  function add(f){var c=check(f);if(!c.ok)return c;var s={id:uid(),nombre:c.clean.nombre,precio:c.clean.precio,categoria:c.clean.categoria};servicios.push(s);save();return {ok:true,service:s,warnings:c.warnings};}
  function update(id,f){var s=get(id);if(!s)return {ok:false,error:'Ese servicio ya no existe.'};var c=check(f,id);if(!c.ok)return c;s.nombre=c.clean.nombre;s.precio=c.clean.precio;s.categoria=c.clean.categoria;save();return {ok:true,service:s,warnings:c.warnings};}
  function remove(id){ensureIds();var n=servicios.length;for(var i=servicios.length-1;i>=0;i--){if(String(servicios[i].id)===String(id))servicios.splice(i,1);}if(servicios.length===n)return false;save();return true;}
  return {CATS:CATS,list:list,get:get,check:check,add:add,update:update,remove:remove};
})();

/* ═══════════════ MEDICAMENTOS SUGERIDOS ═══════════════ */
var Meds=(function(){
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  function persist(){try{saveMeds();}catch(e){}save();}   // save() lo lleva también a la base y a la nube
  function check(name){
    var n=String(name==null?'':name).replace(/\s+/g,' ').trim();
    if(!n)return {ok:false,error:'Escribe el nombre del medicamento.'};
    if(n.length>120)return {ok:false,error:'El nombre es demasiado largo (máximo 120 letras).'};
    for(var i=0;i<MEDICAMENTOS_COMUNES.length;i++){if(norm(MEDICAMENTOS_COMUNES[i])===norm(n))return {ok:false,error:'«'+MEDICAMENTOS_COMUNES[i]+'» ya está en la lista.'};}
    return {ok:true,clean:n};
  }
  function add(name){var c=check(name);if(!c.ok)return c;MEDICAMENTOS_COMUNES.push(c.clean);persist();return {ok:true,name:c.clean};}
  function remove(name){var i=MEDICAMENTOS_COMUNES.indexOf(name);if(i<0)return false;MEDICAMENTOS_COMUNES.splice(i,1);persist();return true;}
  return {check:check,add:add,remove:remove};
})();

/* ═══════════════ CONFIGURACIÓN ═══════════════ */
var Settings=(function(){
  var TZ=[['-12','(UTC-12) Línea de fecha internacional'],['-11','(UTC-11) Samoa'],['-10','(UTC-10) Hawaii'],['-9','(UTC-9) Alaska'],['-8','(UTC-8) Los Ángeles, Vancouver'],['-7','(UTC-7) Ciudad de México, Denver'],['-6','(UTC-6) Guatemala, Costa Rica'],['-5','(UTC-5) Ecuador, Colombia, Perú, Bogotá, Lima ✓'],['-4','(UTC-4) Venezuela, Bolivia, Chile'],['-3','(UTC-3) Argentina, Brasil, Uruguay'],['-2','(UTC-2) Georgia del Sur'],['-1','(UTC-1) Azores'],['0','(UTC+0) Londres, Dublín'],['1','(UTC+1) Madrid, París, Berlín'],['2','(UTC+2) Atenas, Cairo'],['3','(UTC+3) Moscú, Nairobi'],['4','(UTC+4) Dubai'],['5','(UTC+5) Islamabad'],['5.5','(UTC+5:30) India'],['6','(UTC+6) Dhaka'],['7','(UTC+7) Bangkok, Jakarta'],['8','(UTC+8) China, Singapur'],['9','(UTC+9) Tokio, Corea'],['10','(UTC+10) Sídney'],['11','(UTC+11) Islas Salomón'],['12','(UTC+12) Nueva Zelanda']];
  var WA_VARS=['nombre','fecha','hora','motivo','clinica'];
  var $=function(id){return document.getElementById(id);};

  /* ── datos de la clínica ── */
  function clinic(){return {nombre:$('logoText').textContent,profesional:$('logoProfesional').textContent,ruc:clinicaRUC,telefono:clinicaTelefono,direccion:clinicaDireccion,nextReceta:nextRecetaId,tz:String(getTzOffset())};}
  function maxRecetaUsada(){var m=0;Patients.all().forEach(function(p){(p.recetas||[]).forEach(function(r){var n=Number(r&&r.id);if(n>m)m=n;});});return m;}
  function checkClinic(f){
    f=f||{};var warnings=[],sp=function(s){return String(s==null?'':s).replace(/\s+/g,' ').trim();};
    var nombre=sp(f.nombre),prof=sp(f.profesional),tel=sp(f.telefono),dir=sp(f.direccion);
    var ruc=String(f.ruc==null?'':f.ruc).replace(/[\s.\-]/g,'');
    if(!nombre)return {ok:false,error:'El nombre del consultorio no puede quedar vacío.'};
    if(nombre.length>80)return {ok:false,error:'El nombre del consultorio es demasiado largo (máximo 80 letras).'};
    if(prof.length>80)return {ok:false,error:'El nombre del profesional es demasiado largo (máximo 80 letras).'};
    if(ruc){
      if(!/^\d{13}$/.test(ruc))return {ok:false,error:'El RUC debe tener 13 números (ejemplo: 1712345678001).'};
      if(ruc.slice(10)!=='001')warnings.push('El RUC no termina en 001 (suele ser el establecimiento matriz).');
    }
    if(tel.length>40)return {ok:false,error:'El teléfono es demasiado largo.'};
    if(dir.length>200)return {ok:false,error:'La dirección es demasiado larga (máximo 200 letras).'};
    var rn=f.nextReceta===undefined||f.nextReceta===''||f.nextReceta===null?nextRecetaId:Number(f.nextReceta);
    if(!Number.isInteger(rn)||rn<1||rn>999999999)return {ok:false,error:'El próximo N° de receta debe ser un número entero desde 1.'};
    var usada=maxRecetaUsada();
    if(rn<=usada)warnings.push('Ya existe la receta N° '+usada+': con el N° '+rn+' se repetirían números de receta.');
    var tz=String(f.tz==null?getTzOffset():f.tz);
    if(!TZ.some(function(z){return z[0]===tz;}))return {ok:false,error:'Zona horaria no válida.'};
    return {ok:true,clean:{nombre:nombre,profesional:prof,ruc:ruc,telefono:tel,direccion:dir,nextReceta:rn,tz:tz},warnings:warnings};
  }
  function saveClinic(f){
    var c=checkClinic(f);if(!c.ok)return c;var k=c.clean;
    $('logoText').textContent=k.nombre;
    if(k.profesional)$('logoProfesional').textContent=k.profesional;
    clinicaRUC=k.ruc;clinicaTelefono=k.telefono;clinicaDireccion=k.direccion;nextRecetaId=k.nextReceta;
    lsSet('oa3_tz',k.tz);
    save();Patients.renderList();
    return {ok:true,warnings:c.warnings};
  }

  /* ── mensaje de WhatsApp ── */
  function waMessage(){return lsGet('oa3_wamsg')||Appts.defaultWAMsg();}
  function checkWA(text){
    var t=String(text==null?'':text).trim(),warnings=[];
    if(t.length>1000)return {ok:false,error:'El mensaje es demasiado largo (máximo 1000 letras).'};
    var bad=[];(t.match(/\{[^{}\s]*\}/g)||[]).forEach(function(m){var k=m.slice(1,-1).toLowerCase();if(WA_VARS.indexOf(k)<0&&bad.indexOf(m)<0)bad.push(m);});
    if(bad.length)warnings.push('Estas variables no existen y saldrán tal cual en el mensaje: '+bad.join(' ')+'. Las válidas son: '+WA_VARS.map(function(x){return '{'+x+'}';}).join(' ')+'.');
    return {ok:true,clean:t,warnings:warnings};
  }
  function saveWA(text){
    var c=checkWA(text);if(!c.ok)return c;
    if(!c.clean){lsDel('oa3_wamsg');return {ok:true,reset:true,warnings:[]};}   // vacío = volver al mensaje original
    lsSet('oa3_wamsg',c.clean);return {ok:true,warnings:c.warnings};
  }

  /* ── tema ── */
  function setTheme(mode){
    var dark=mode==='dark';
    document.body.classList.toggle('dark-mode',dark);
    lsSet('oa3_dark',dark?'1':'0');
    var b=$('darkToggle');if(b)b.textContent=dark?'☀️':'🌙';
  }
  function toggleTheme(){setTheme(document.body.classList.contains('dark-mode')?'light':'dark');}

  /* ── reloj de la zona horaria (solo corre mientras la página está abierta) ── */
  var clockT=null;
  function paintClock(){
    var el=$('cfg_localtime');
    if(!el){clockT=null;return;}
    var tz=parseFloat(($('cfg_tz')||{}).value);if(isNaN(tz))tz=getTzOffset();
    var d=new Date(),local=new Date(d.getTime()+d.getTimezoneOffset()*60000+tz*3600000);
    el.textContent=local.toLocaleString('es-EC',{weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    clearTimeout(clockT);clockT=setTimeout(paintClock,5000);
  }
  function startClock(){clearTimeout(clockT);setTimeout(paintClock,0);}

  /* ── pantalla ── */
  var BTN='padding:4px 10px;font-size:11px;border:none;border-radius:6px;cursor:pointer;font-weight:600';
  function svcRow(s){
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)"><div style="flex:1">'+
      '<div style="font-size:13px;color:var(--text);font-weight:500">'+esc(s.nombre)+'</div><div style="font-size:10px;color:var(--text3)">'+esc(s.categoria||'General')+'</div></div>'+
      '<div style="font-size:14px;font-weight:700;color:var(--green)">'+money(s.precio)+'</div>'+
      '<button data-action="settings.svcEdit" data-id="'+esc(s.id)+'" style="'+BTN+';background:#dbeafe;color:#1e40af">✏️ Editar</button>'+
      '<button data-action="settings.svcDelete" data-id="'+esc(s.id)+'" aria-label="Eliminar servicio" style="'+BTN+';background:#fee2e2;color:var(--red)">✕</button></div>';
  }
  function catOptions(sel){return Services.CATS.map(function(c){return '<option'+(c===sel?' selected':'')+'>'+esc(c)+'</option>';}).join('');}
  var CODE='background:var(--bg);padding:2px 6px;border-radius:4px';

  function render(){
    var cieN=CIE10_FULL?CIE10_FULL.length:0,dark=document.body.classList.contains('dark-mode'),svcs=Services.list();
    var modeBtn=function(mode,label,on){return '<button data-action="settings.theme" data-theme="'+mode+'" style="flex:1;padding:10px;border-radius:10px;border:2px solid '+(on?'var(--accent)':'var(--border)')+';background:'+(on?'var(--accent)':'var(--card)')+';color:'+(on?'#fff':'var(--text2)')+';cursor:pointer;font-size:13px;font-weight:600">'+label+'</button>';};
    var logoBox=logoImg&&Logo.isSafeSrc(logoImg)
      ?'<img src="'+esc(logoImg)+'" alt="" style="height:50px;object-fit:contain;border-radius:6px;display:block;margin:0 auto 6px"><div style="font-size:11px;color:var(--text2)">Clic para cambiar</div>'
      :'<div style="font-size:28px;margin-bottom:4px">🖼️</div><div style="font-size:12px;color:var(--text2)">Subir logo (PNG, JPG · máx. 2 MB)</div>';
    return '<div style="max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:16px">'+

    '<div class="card"><div class="card-title">🏥 Datos de la clínica</div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Nombre del consultorio</label><input id="cfg_ln" value="'+esc($('logoText').textContent)+'"></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Profesional a cargo</label><input id="cfg_lprof" value="'+esc($('logoProfesional').textContent)+'" placeholder="Dr. Nombre Apellido"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>RUC</label><input id="cfg_ruc" value="'+esc(clinicaRUC)+'" placeholder="1712345678001"></div><div class="form-group"><label>Teléfono</label><input id="cfg_tel" value="'+esc(clinicaTelefono)+'" placeholder="02-234-5678"></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Dirección</label><input id="cfg_dir" value="'+esc(clinicaDireccion)+'" placeholder="Av. Principal 123, Quito"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>🔢 Próximo N° de receta</label><input id="cfg_recnum" type="number" min="1" value="'+esc(nextRecetaId)+'"><div style="font-size:10px;color:var(--text3);margin-top:3px">La próxima receta llevará este número y las siguientes continuarán la secuencia. Ej: si tu última receta física fue la 850, escribe 851.</div></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>🌐 Zona horaria</label><select id="cfg_tz" data-on-change="settings.tz">'+
    TZ.map(function(z){return '<option value="'+z[0]+'"'+(String(getTzOffset())===z[0]?' selected':'')+'>'+esc(z[1])+'</option>';}).join('')+'</select>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:4px">Fecha/hora local actual: <strong id="cfg_localtime"></strong></div></div></div>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:4px"><button class="btn-primary" id="cfg_saveclinic" data-action="settings.saveClinic">💾 Guardar datos</button></div></div>'+

    '<div class="card"><div class="card-title"> Logo y apariencia</div><div class="form-row"><div class="form-group"><label>Logo del consultorio</label>'+
    '<div class="upload-area" data-action="settings.pickLogo" style="padding:14px;text-align:center">'+logoBox+'</div>'+
    '<input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none" data-on-change="settings.logoFile">'+
    (logoImg?'<button data-action="settings.clearLogo" style="margin-top:6px;font-size:11px;color:var(--red);background:none;border:none;cursor:pointer">✕ Quitar logo</button>':'')+'</div>'+
    '<div class="form-group"><label>Color de acento</label><div class="color-swatches">'+
    Logo.COLORS.map(function(c){return '<div class="cs'+(c===logoColor?' sel':'')+'" role="button" aria-label="Color '+c+'" style="background:'+c+'" data-action="settings.color" data-color="'+c+'"></div>';}).join('')+'</div>'+
    '<label style="margin-top:14px;display:block">Modo de visualización</label><div style="display:flex;gap:10px;margin-top:6px">'+modeBtn('dark','🌙 Oscuro',dark)+modeBtn('light','☀️ Claro',!dark)+'</div></div></div></div>'+

    '<div class="card"><div class="card-title">🦷 Catálogo de servicios</div><div style="font-size:12px;color:var(--text3);margin-bottom:10px">Aparecen como atajo al registrar tratamientos y pagos.</div>'+
    '<div style="max-height:220px;overflow-y:auto;margin-bottom:12px">'+(svcs.length?svcs.map(svcRow).join(''):'<div style="font-size:12px;color:var(--text3);padding:12px;text-align:center;border:1px dashed var(--border);border-radius:8px">Sin servicios configurados</div>')+'</div>'+
    '<div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end">'+
    '<div class="form-group" style="margin:0"><label>Nombre</label><input type="text" id="cfg_svcnombre" placeholder="Obturación resina..." data-on-keydown="settings.svcKey"></div>'+
    '<div class="form-group" style="margin:0"><label>Precio ($)</label><input type="number" id="cfg_svcprecio" min="0" step="0.01" placeholder="0.00" data-on-keydown="settings.svcKey"></div>'+
    '<div class="form-group" style="margin:0"><label>Categoría</label><select id="cfg_svccategoria">'+catOptions('')+'</select></div>'+
    '<button data-action="settings.svcAdd" class="btn-primary" aria-label="Agregar servicio" style="padding:9px 14px;margin-bottom:1px">+</button></div></div>'+

    '<div class="card"><div class="card-title">💊 Medicamentos en recetas</div><div style="font-size:12px;color:var(--text3);margin-bottom:10px">Sugerencias al crear una receta médica.</div>'+
    '<div style="max-height:180px;overflow-y:auto;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:6px">'+
    MEDICAMENTOS_COMUNES.map(function(m){return '<div style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text)">💊 '+esc(m)+
      '<button data-action="settings.medDelete" data-name="'+esc(m)+'" aria-label="Quitar medicamento" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;line-height:1;padding:0 2px">×</button></div>';}).join('')+'</div>'+
    '<div style="display:flex;gap:8px"><input type="text" id="cfg_newmed" placeholder="Ej: Amoxicilina 875mg" data-on-keydown="settings.medKey" style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;font-family:inherit;background:var(--card);color:var(--text)">'+
    '<button data-action="settings.medAdd" class="btn-primary">+ Agregar</button></div></div>'+

    '<div class="card"><div class="card-title"> CIE-10 completo</div><div style="font-size:12px;color:var(--text3);margin-bottom:10px">Carga el CSV oficial CIE-10 para buscar cualquier enfermedad. '+(cieN?'<strong style="color:var(--green)">✓ '+cieN+' códigos cargados.</strong>':'Aún sin CSV (usando lista odontológica). ')+'</div>'+
    '<button class="btn-primary" data-action="settings.cie10">📥 Cargar CSV CIE-10</button></div>'+

    '<div class="card"><div class="card-title">📱 Mensaje recordatorio WhatsApp</div>'+
    '<div style="font-size:12px;color:var(--text3);margin-bottom:8px">Variables: '+WA_VARS.map(function(x){return '<code style="'+CODE+'">{'+x+'}</code>';}).join(' ')+'. Si lo dejas vacío se usa el mensaje original.</div>'+
    '<textarea id="cfg_wamsg" style="width:100%;min-height:120px;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:13px;outline:none;font-family:inherit;line-height:1.6;background:var(--card);color:var(--text)">'+esc(waMessage())+'</textarea>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn-primary" id="cfg_savewa" data-action="settings.saveWA">💾 Guardar mensaje</button></div></div>'+

    '<div class="card"><div class="card-title">💾 Medidor de almacenamiento</div><div id="storage-meter" style="font-size:12px;color:var(--text3)">Midiendo…</div></div>'+

    '<div class="card" style="border:1px solid #fca5a5"><div class="card-title" style="color:var(--red)">⚠️ Zona de peligro</div>'+
    '<div style="font-size:13px;color:var(--text2);margin-bottom:14px">Esta acción es irreversible. Descarga un backup antes de proceder.</div>'+
    '<button data-action="settings.reset" style="padding:12px 24px;background:#ef4444;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">🗑 Restablecer app a valores de fábrica</button></div>'+
    '</div>';
  }

  /* vuelve a dibujar la página SIN perder lo que la persona estaba escribiendo en otras tarjetas ni su posición */
  var FIELDS=['cfg_ln','cfg_lprof','cfg_ruc','cfg_tel','cfg_dir','cfg_recnum','cfg_tz','cfg_svcnombre','cfg_svcprecio','cfg_svccategoria','cfg_newmed','cfg_wamsg'];
  function refresh(clear){
    var m=$('mainContent');if(!m||curPage!=='configuracion')return;
    var keep={};FIELDS.forEach(function(id){var e=$(id);if(e&&(clear||[]).indexOf(id)<0)keep[id]=e.value;});
    var top=m.scrollTop;
    m.innerHTML=renderConfiguracion();   // pasa por la versión envuelta (tarjeta de Seguridad)
    FIELDS.forEach(function(id){var e=$(id);if(e&&keep[id]!==undefined)e.value=keep[id];});
    m.scrollTop=top;
    try{pintarMedidor();}catch(e){}
    startClock();
  }

  /* ── pantallas con formulario: leen los campos, llaman a la API y avisan ── */
  function readClinic(){return {nombre:v('cfg_ln'),profesional:v('cfg_lprof'),ruc:v('cfg_ruc'),telefono:v('cfg_tel'),direccion:v('cfg_dir'),nextReceta:v('cfg_recnum'),tz:v('cfg_tz')};}
  function flash(btn,okText,back){if(!btn)return;btn.textContent=okText;btn.style.background='var(--green)';setTimeout(function(){btn.textContent=back;btn.style.background='';},2000);}
  function confirmWarnings(w){return !w||!w.length||confirm('⚠️ '+w.join('\n⚠️ ')+'\n\n¿Guardar de todos modos?');}
  function saveClinicUI(btn){
    var f=readClinic(),c=checkClinic(f);
    if(!c.ok){alert(c.error);return c;}
    if(!confirmWarnings(c.warnings))return {ok:false,cancelled:true};
    var r=saveClinic(f);if(r.ok)flash(btn||$('cfg_saveclinic'),'✓ Guardado','💾 Guardar datos');
    return r;
  }
  function saveWAUI(btn){
    var c=checkWA(v('cfg_wamsg'));
    if(!c.ok){alert(c.error);return c;}
    if(!confirmWarnings(c.warnings))return {ok:false,cancelled:true};
    var r=saveWA(v('cfg_wamsg'));
    if(r.reset&&$('cfg_wamsg'))$('cfg_wamsg').value=Appts.defaultWAMsg();
    if(r.ok)flash(btn||$('cfg_savewa'),'✓ Guardado','💾 Guardar mensaje');
    return r;
  }
  function readSvc(p){return {nombre:v(p+'nombre'),precio:v(p+'precio'),categoria:v(p+'categoria')};}
  function addServiceUI(){
    var f=readSvc('cfg_svc'),c=Services.check(f);
    if(!c.ok){alert(c.error);return c;}
    if(!confirmWarnings(c.warnings))return {ok:false,cancelled:true};
    var r=Services.add(f);refresh(['cfg_svcnombre','cfg_svcprecio']);
    var n=$('cfg_svcnombre');if(n)n.focus();
    return r;
  }
  function deleteServiceUI(id){
    var s=Services.get(id);if(!s)return false;
    if(!confirm('¿Eliminar "'+s.nombre+'" del catálogo?'))return false;
    var r=Services.remove(id);refresh();return r;
  }
  function editServiceUI(id){
    var s=Services.get(id);if(!s)return;
    openModal('<div class="modal-title">✏️ Editar servicio</div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Nombre del servicio *</label><input id="f_esvnombre" value="'+esc(s.nombre)+'"></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Precio ($)</label><input id="f_esvprecio" type="number" min="0" step="0.01" value="'+esc(r2(s.precio).toFixed(2))+'"></div>'+
      '<div class="form-group"><label>Categoría</label><select id="f_esvcategoria">'+catOptions(s.categoria)+'</select></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button>'+
      '<button class="btn-primary" data-action="settings.svcSave" data-id="'+esc(s.id)+'">💾 Guardar cambios</button></div>');
  }
  function saveServiceUI(id){
    var f=readSvc('f_esv'),c=Services.check(f,id);
    if(!c.ok){alert(c.error);return c;}
    if(!confirmWarnings(c.warnings))return {ok:false,cancelled:true};
    var r=Services.update(id,f);if(r.ok){closeModal();refresh();}
    return r;
  }
  function addMedUI(){
    var r=Meds.add(v('cfg_newmed'));
    if(!r.ok){alert(r.error);return r;}
    refresh(['cfg_newmed']);var n=$('cfg_newmed');if(n)n.focus();return r;
  }
  function deleteMedUI(name){
    if(!confirm('¿Eliminar "'+name+'" de la lista?'))return false;
    var r=Meds.remove(name);refresh();return r;
  }
  function setThemeUI(mode){setTheme(mode);refresh();}
  function setColorUI(c){if(Logo.setColor(c))refresh();}
  function clearLogoUI(){Logo.clear();refresh();}
  function pickLogoUI(){var i=$('logoFileInput');if(i)i.click();}
  function logoFileUI(input){
    var f=input&&input.files&&input.files[0];if(!f)return Promise.resolve({ok:false});
    return Logo.setFromFile(f).then(function(r){if(!r.ok)alert(r.error);if(input)input.value='';refresh();return r;});
  }
  function resetUI(){return factoryReset();}

  return {TZ:TZ,WA_VARS:WA_VARS,clinic:clinic,checkClinic:checkClinic,saveClinic:saveClinic,saveClinicUI:saveClinicUI,
    waMessage:waMessage,checkWA:checkWA,saveWA:saveWA,saveWAUI:saveWAUI,setTheme:setTheme,toggleTheme:toggleTheme,
    render:render,refresh:refresh,startClock:startClock,
    addServiceUI:addServiceUI,deleteServiceUI:deleteServiceUI,editServiceUI:editServiceUI,saveServiceUI:saveServiceUI,
    addMedUI:addMedUI,deleteMedUI:deleteMedUI,setThemeUI:setThemeUI,setColorUI:setColorUI,clearLogoUI:clearLogoUI,pickLogoUI:pickLogoUI,logoFileUI:logoFileUI,resetUI:resetUI};
})();

/* ═══════════════ ACCIONES (data-action) ═══════════════ */
App.actions({
  'app.overlayClick':function(c){if(c.event.target===c.el)closeModal();},
  'settings.saveClinic':function(c){Settings.saveClinicUI(c.el);},
  'settings.saveWA':function(c){Settings.saveWAUI(c.el);},
  'settings.tz':function(){Settings.startClock();},
  'settings.theme':function(c){Settings.setThemeUI(c.data.theme);},
  'settings.toggleTheme':function(){Settings.toggleTheme();},
  'settings.color':function(c){Settings.setColorUI(c.data.color);},
  'settings.pickLogo':function(){Settings.pickLogoUI();},
  'settings.logoFile':function(c){Settings.logoFileUI(c.el);},
  'settings.clearLogo':function(){Settings.clearLogoUI();},
  'settings.svcAdd':function(){Settings.addServiceUI();},
  'settings.svcKey':function(c){if(c.event.key==='Enter')Settings.addServiceUI();},
  'settings.svcEdit':function(c){Settings.editServiceUI(c.id);},
  'settings.svcSave':function(c){Settings.saveServiceUI(c.id);},
  'settings.svcDelete':function(c){Settings.deleteServiceUI(c.id);},
  'settings.medAdd':function(){Settings.addMedUI();},
  'settings.medKey':function(c){if(c.event.key==='Enter')Settings.addMedUI();},
  'settings.medDelete':function(c){Settings.deleteMedUI(c.data.name);},
  'settings.cie10':function(){Cie10.pickFile();},
  'settings.reset':function(){Settings.resetUI();}
});

/* ═══════════════ ATAJOS DEL ARMAZÓN (showPage/openModal/closeModal/renderConfiguracion los usan todos los módulos; el PIN extiende renderConfiguracion) ═══════════════ */
function showPage(p){return Nav.show(p);}
function openModal(h){return Nav.openModal(h);}
function closeModal(){return Nav.closeModal();}
function renderConfiguracion(){return Settings.render();}
document.addEventListener('click',function(e){if(!e.target.closest('#toothPopup')&&!e.target.closest('path')&&!e.target.closest('.tooth-col'))Odonto.closePopup();});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();Odonto.closePopup();}});
