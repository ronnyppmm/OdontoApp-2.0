/* ═══ AGENDA — citas (registradas y rápidas), calendario, recordatorios por WhatsApp ═══
   Dos módulos (sin onclick; ver app.js y LEEME-MODULOS.md):
     Appts    datos y reglas, sin pantalla: validar, buscar conflictos de horario, agregar/editar/eliminar, convertir, WhatsApp
     Agenda   pantalla: calendario (mes/semana/lista), formularios, pestaña «Citas» de la ficha
   Una cita de un paciente vive en  paciente.appointments  (type 'registered');  una cita rápida (sin ficha) en  quickAppts  (type 'quick').
   Las dos se guardan con save(): van a la base local (IndexedDB) y a la nube igual que todo lo demás. */

/* ═══════════════════════════ CITAS (datos) ═══════════════════════════ */
const Appts=(function(){
  'use strict';
  var STATUS={pendiente:'Pendiente',completada:'Completada',no_asistio:'No asistió'};
  var S=function(x){return x==null?'':String(x);};
  var TIME_RE=/^([01]\d|2[0-3]):[0-5]\d$/;
  function quick(){return quickAppts||(quickAppts=[]);}

  /* ── lectura ── */
  // Todas las citas, normalizadas (un dato importado sin hora o sin motivo no rompe la pantalla)
  function all(){
    var out=[];
    Patients.all().forEach(function(p){(p.appointments||[]).forEach(function(a){
      out.push(Object.assign({},a,{date:S(a.date),time:S(a.time),reason:S(a.reason),status:STATUS[a.status]?a.status:'pendiente',ptName:S(p.name),ptId:p.id,type:'registered'}));});});
    quick().forEach(function(a){out.push(Object.assign({},a,{date:S(a.date),time:S(a.time),reason:S(a.reason),status:STATUS[a.status]?a.status:'pendiente',ptName:S(a.ptName),type:'quick'}));});
    return out;
  }
  function sortByTime(list){return list.slice().sort(function(a,b){return a.date.localeCompare(b.date)||a.time.localeCompare(b.time);});}
  function phoneOf(a){return S(a.phone)||(a.ptId!=null?S((Patients.get(a.ptId)||{}).phone):'');}
  // ref = {id, type:'quick'|'registered', ptId}
  function find(ref){
    if(!ref)return null;
    if(ref.type==='quick'){var q=quick().find(function(a){return String(a.id)===String(ref.id);});return q?{appt:q,owner:null,type:'quick'}:null;}
    var p=Patients.get(ref.ptId);if(!p)return null;
    var a=(p.appointments||[]).find(function(x){return String(x.id)===String(ref.id);});
    return a?{appt:a,owner:p,type:'registered'}:null;
  }
  function describe(ref){var f=find(ref);if(!f)return null;return Object.assign({},f.appt,{ptName:f.owner?f.owner.name:f.appt.ptName,ptId:f.owner?f.owner.id:undefined,type:f.type});}
  function same(a,ref){return !!ref&&String(a.id)===String(ref.id)&&(a.type==='quick')===(ref.type==='quick');}
  // Otras citas PENDIENTES a la misma fecha y hora (doble reserva)
  function conflicts(date,time,exceptRef){
    return all().filter(function(a){return a.status==='pendiente'&&a.date===date&&a.time===time&&!same(a,exceptRef);});
  }

  /* ── validación ── */
  // opts: {quick:true} exige nombre · {exceptRef} excluye esa cita al buscar conflictos
  function check(f,opts){
    opts=opts||{};f=f||{};
    var c={reason:Ficha.clean(f.reason,150),date:S(f.date).trim(),time:S(f.time).trim(),notes:Ficha.clean(f.notes,300),status:f.status||'pendiente'};
    if(opts.quick){c.ptName=Ficha.clean(f.name,120);c.phone=Ficha.clean(f.phone,30);if(!c.ptName)return {ok:false,error:'El nombre es obligatorio'};}
    if(!c.reason)return {ok:false,error:'El motivo es obligatorio'};
    if(!Ficha.isDate(c.date,{future:true})||c.date>'2100-12-31')return {ok:false,error:'La fecha no es válida'};
    if(!TIME_RE.test(c.time))return {ok:false,error:'La hora no es válida (usa el formato HH:MM)'};
    if(!STATUS[c.status])return {ok:false,error:'El estado no es válido'};
    var warnings=[];
    if(c.status==='pendiente'){
      if(c.date<today())warnings.push('La fecha ('+fmtDate(c.date)+') ya pasó.');
      var cf=conflicts(c.date,c.time,opts.exceptRef);
      if(cf.length)warnings.push('A las '+c.time+' ya hay '+(cf.length===1?'una cita':cf.length+' citas')+': '+cf.map(function(a){return a.ptName+' ('+(a.reason||'sin motivo')+')';}).join(', ')+'.');
    }
    return {ok:true,clean:c,warnings:warnings};
  }

  /* ── cambios ── */
  function addToPatient(pid,c){
    var p=Patients.get(pid);if(!p)return null;
    var a={id:uid(),reason:c.reason,date:c.date,time:c.time,status:c.status||'pendiente',notes:c.notes||''};
    (p.appointments||(p.appointments=[])).push(a);save();return a;
  }
  function addQuick(c){
    var a={id:'q'+uid(),ptName:c.ptName,phone:c.phone||'',reason:c.reason,date:c.date,time:c.time,status:c.status||'pendiente',notes:c.notes||'',type:'quick'};
    quick().push(a);save();return a;
  }
  function update(ref,c){
    var f=find(ref);if(!f)return null;
    f.appt.date=c.date;f.appt.time=c.time;f.appt.reason=c.reason;f.appt.status=c.status;
    if(c.notes!==undefined)f.appt.notes=c.notes;
    save();return f.appt;
  }
  function setStatus(ref,status){var f=find(ref);if(!f||!STATUS[status])return false;f.appt.status=status;save();return true;}
  function remove(ref){
    var f=find(ref);if(!f)return false;
    if(f.type==='quick')quickAppts=quick().filter(function(a){return String(a.id)!==String(ref.id);});
    else f.owner.appointments=(f.owner.appointments||[]).filter(function(a){return String(a.id)!==String(ref.id);});
    save();return true;
  }
  function markReminder(ref){var f=find(ref);if(!f)return false;f.appt.recordado=today();save();return true;}

  /* ── almacenamiento ── */
  // Antes las citas rápidas vivían solo en localStorage ('oa3_qa'): no llegaban a la base ni a la nube y se perdían al limpiar el navegador.
  // Una sola vez se pasan a la base normal; la clave vieja se conserva como copia (marcada) hasta que el usuario limpie los datos del navegador.
  function adoptLegacy(){
    var raw=null,done=null;
    try{raw=localStorage.getItem('oa3_qa');done=localStorage.getItem('oa3_qa_ok');}catch(e){return false;}
    if(raw===null||done)return false;
    var list;try{list=JSON.parse(raw);}catch(e){return false;}
    if(!Array.isArray(list))return false;
    quickAppts=list;save();
    try{localStorage.setItem('oa3_qa_ok','1');}catch(e){}
    return true;
  }

  /* ── WhatsApp ── */
  function defaultWAMsg(){
    // Escapes Unicode para que los emojis no se dañen al guardarse
    var wave='👋',cal='📅',clock='🕐',tooth='🦷',hosp='🏥',smile='😊';
    return 'Hola {nombre} '+wave+'\n\nLe recordamos que tiene una cita dental programada:\n\n'+cal+' Fecha: {fecha}\n'+clock+' Hora: {hora}\n'+tooth+' Motivo: {motivo}\n'+hosp+' {clinica}\n\nPor favor confirme su asistencia o avisenos con anticipacion si necesita reagendar.\n\n!Le esperamos! '+smile;
  }
  // Se reemplaza con funciones: un nombre como «Ana $& Pérez» no debe interpretarse como patrón de reemplazo
  function waMessage(appt,name){
    var lt=document.getElementById('logoText'),clinica=lt?lt.textContent:'';
    var tpl;try{tpl=localStorage.getItem('oa3_wamsg');}catch(e){}
    return (tpl||defaultWAMsg())
      .replace(/{nombre}/g,function(){return S(name);}).replace(/{fecha}/g,function(){return fmtDate(appt.date);})
      .replace(/{hora}/g,function(){return S(appt.time);}).replace(/{motivo}/g,function(){return appt.reason||'Consulta dental';})
      .replace(/{clinica}/g,function(){return clinica;});
  }
  // Teléfono ecuatoriano (09…, 02…, 593…) o internacional (+34…, 0034…) → solo dígitos con código de país
  function waNumber(phone){
    var raw=S(phone).trim();if(!raw)return {ok:false,error:'sin teléfono'};
    var plus=raw.charAt(0)==='+',d=raw.replace(/\D/g,'');
    if(!d)return {ok:false,error:'el teléfono no tiene números'};
    if(plus){}
    else if(d.indexOf('00')===0)d=d.slice(2);
    else if(d.charAt(0)==='0')d='593'+d.slice(1);
    else if(d.indexOf('593')!==0)d='593'+d;
    if(d.length<10||d.length>15)return {ok:false,error:'el teléfono «'+raw+'» no parece válido'};
    return {ok:true,number:d};
  }
  function waLink(phone,appt,name){
    var n=waNumber(phone);if(!n.ok)return n;
    return {ok:true,url:'https://wa.me/'+n.number+'?text='+encodeURIComponent(waMessage(appt,name))};
  }

  return {STATUS:STATUS,all:all,sortByTime:sortByTime,phoneOf:phoneOf,find:find,describe:describe,conflicts:conflicts,check:check,
    addToPatient:addToPatient,addQuick:addQuick,update:update,setStatus:setStatus,remove:remove,markReminder:markReminder,adoptLegacy:adoptLegacy,
    defaultWAMsg:defaultWAMsg,waMessage:waMessage,waNumber:waNumber,waLink:waLink};
})();

/* ═══════════════════════════ AGENDA (pantalla) ═══════════════════════════ */
const Agenda=(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);};
  var pad=function(n){return String(n).padStart(2,'0');};
  var ymd=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  var DAYS=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  var WA_PATH='<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>';
  var waIcon=function(n){return '<svg width="'+n+'" height="'+n+'" viewBox="0 0 24 24" fill="white">'+WA_PATH+'</svg>';};

  /* ── estado del calendario ── */
  function mondayOf(d){var m=new Date(d);m.setDate(d.getDate()-(d.getDay()+6)%7);m.setHours(0,0,0,0);return m;}
  function todayDate(){var p=today().split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
  var st={year:0,month:0,view:'month',weekStart:null};
  function reset(){var t=todayDate();st.year=t.getFullYear();st.month=t.getMonth();st.weekStart=mondayOf(t);}
  reset();
  function show(){showPage('agenda');}
  function setView(v){
    st.view=(v==='week'||v==='list')?v:'month';
    if(st.view==='week'){   // semana: la actual si miras el mes actual; si no, la primera del mes que miras
      var t=todayDate();
      st.weekStart=(st.year===t.getFullYear()&&st.month===t.getMonth())?mondayOf(t):mondayOf(new Date(st.year,st.month,1));
    }
    api.show();
  }
  function move(dir){
    if(st.view==='week'){st.weekStart=new Date(st.weekStart);st.weekStart.setDate(st.weekStart.getDate()+7*dir);st.year=st.weekStart.getFullYear();st.month=st.weekStart.getMonth();}
    else{st.month+=dir;if(st.month<0){st.month=11;st.year--;}if(st.month>11){st.month=0;st.year++;}}
    api.show();
  }
  function goToday(){reset();api.show();}

  /* ── piezas de dibujo ── */
  function tone(a){
    if(a.status==='completada')return {bg:'#d1fae5',border:'#6ee7b7',tc:'#065f46'};
    if(a.status==='no_asistio')return {bg:'#fee2e2',border:'#fca5a5',tc:'#991b1b'};
    if(a.type==='quick')return {bg:'#f0e7d8',border:'#dcc39c',tc:'#6b4a2f'};
    return {bg:'#dbeafe',border:'#93c5fd',tc:'#1e40af'};
  }
  var refAttrs=function(a){return 'data-id="'+esc(a.id)+'" data-type="'+esc(a.type)+'" data-pt="'+esc(a.ptId==null?'':a.ptId)+'"';};
  function waButton(a,compact){
    if(!Appts.phoneOf(a))return '';
    var sent=a.recordado?' <span style="opacity:.85">✓</span>':'';
    if(compact)return '<button data-action="agenda.sendWA" '+refAttrs(a)+' title="Enviar recordatorio WhatsApp'+(a.recordado?' (ya se preparó el '+esc(fmtDate(a.recordado))+')':'')+'" style="width:30px;height:30px;background:#25d366;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+waIcon(15)+'</button>';
    return '<button data-action="agenda.sendWA" '+refAttrs(a)+' style="width:100%;margin-top:6px;padding:5px;background:#25d366;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">'+waIcon(12)+(a.recordado?'Recordatorio enviado · reenviar':'Enviar recordatorio WhatsApp')+sent+'</button>';
  }
  function miniCard(a){
    var t=tone(a);
    return '<div style="padding:8px;border-radius:8px;background:'+t.bg+';border:1px solid '+t.border+';margin-bottom:6px"><div style="display:flex;align-items:center;gap:8px">'+
      '<div style="font-size:11px;font-weight:700;color:var(--text);min-width:40px">'+esc(a.time)+'</div><div style="flex:1;min-width:0">'+
      '<div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(a.ptName)+'</div>'+
      '<div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(a.reason)+'</div></div>'+
      '<button data-action="agenda.openDetail" '+refAttrs(a)+' aria-label="Ver detalle" style="width:22px;height:22px;border:none;background:rgba(0,0,0,.08);border-radius:5px;cursor:pointer;font-size:11px;flex-shrink:0">⋯</button></div>'+
      (a.status==='pendiente'?waButton(a,false):'')+'</div>';
  }
  function chip(a,big){
    var t=tone(a);
    return '<div data-action="agenda.openDetail" '+refAttrs(a)+' style="font-size:10px;padding:'+(big?'3px 5px':'2px 4px')+';border-radius:'+(big?5:4)+'px;background:'+t.bg+';color:'+t.tc+';margin-bottom:2px;'+(big?'font-weight:500;':'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;')+'cursor:pointer">'+
      esc(a.time)+' '+esc(a.ptName)+(big?'<br><span style="font-weight:400;opacity:.8">'+esc(a.reason)+'</span>':'')+'</div>';
  }
  function renderMonth(list,todayStr){
    var first=new Date(st.year,st.month,1),total=new Date(st.year,st.month+1,0).getDate(),startDow=(first.getDay()+6)%7;
    var html='<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--border);border-radius:10px;overflow:hidden">';
    DAYS.forEach(function(d){html+='<div style="padding:8px 4px;text-align:center;font-size:11px;font-weight:700;color:var(--text2);background:var(--bg)">'+d+'</div>';});
    for(var i=0;i<startDow;i++)html+='<div style="background:var(--card);min-height:90px"></div>';
    for(var day=1;day<=total;day++){
      var ds=st.year+'-'+pad(st.month+1)+'-'+pad(day),isToday=ds===todayStr,dow=(startDow+day-1)%7;
      var dayAppts=Appts.sortByTime(list.filter(function(a){return a.date===ds;}));
      html+='<div class="cal-day'+(isToday?' is-today':dow>=5?' is-weekend':'')+'" data-action="agenda.openQuick" data-date="'+ds+'">'+
        '<div style="font-size:13px;font-weight:'+(isToday?700:500)+';color:'+(isToday?'#fff':'var(--text)')+';width:22px;height:22px;border-radius:50%;background:'+(isToday?'var(--accent)':'transparent')+';display:flex;align-items:center;justify-content:center;margin-bottom:3px">'+day+'</div>'+
        dayAppts.slice(0,3).map(function(a){return chip(a,false);}).join('')+
        (dayAppts.length>3?'<div style="font-size:10px;color:var(--text3);padding:1px 2px">+'+(dayAppts.length-3)+'</div>':'')+'</div>';
    }
    var rem=(startDow+total)%7===0?0:7-((startDow+total)%7);
    for(var j=0;j<rem;j++)html+='<div style="background:var(--card);min-height:90px"></div>';
    return html+'</div>';
  }
  function renderWeek(list,todayStr){
    var days=[];for(var i=0;i<7;i++){var d=new Date(st.weekStart);d.setDate(d.getDate()+i);days.push(d);}
    var ds=days.map(ymd),inWeek=list.filter(function(a){return ds.indexOf(a.date)>-1&&/^\d{2}:/.test(a.time);});
    // 07:00–19:00 por defecto; si hay citas fuera de ese horario, se agregan las filas necesarias (antes esas citas no se veían)
    var hs=inWeek.map(function(a){return parseInt(a.time.slice(0,2),10);}),from=Math.min.apply(null,[7].concat(hs)),to=Math.max.apply(null,[19].concat(hs));
    var html='<div style="display:grid;grid-template-columns:48px repeat(7,1fr);gap:1px;background:var(--border);border-radius:10px;overflow:hidden;max-height:520px;overflow-y:auto"><div style="background:var(--bg);padding:8px 4px"></div>';
    days.forEach(function(d,i){var isT=ds[i]===todayStr;
      html+='<div style="background:'+(isT?'var(--cal-today-header, #eff6ff)':'var(--bg)')+';padding:8px 4px;text-align:center"><div style="font-size:10px;font-weight:600;color:var(--text2)">'+DAYS[i]+'</div><div style="font-size:15px;font-weight:700;color:'+(isT?'var(--accent)':'var(--text)')+'">'+d.getDate()+'</div></div>';});
    for(var h=from;h<=to;h++){
      var hh=pad(h),hr=hh+':00';
      html+='<div style="background:var(--card);padding:4px 6px;font-size:10px;color:var(--text3);text-align:right;border-top:1px solid var(--border)">'+hr+'</div>';
      ds.forEach(function(day){
        var cell=Appts.sortByTime(inWeek.filter(function(a){return a.date===day&&a.time.slice(0,2)===hh;}));
        html+='<div class="cal-cell'+(day===todayStr?' is-today':'')+'" data-action="agenda.openQuick" data-date="'+day+'" data-time="'+hr+'">'+cell.map(function(a){return chip(a,true);}).join('')+'</div>';
      });
    }
    return html+'</div>';
  }
  function listRow(a){
    var t=tone(a),phone=Appts.phoneOf(a);
    return '<div style="padding:10px 12px;border-radius:10px;background:var(--card);border:1px solid var(--border);margin-bottom:6px"><div style="display:flex;align-items:center;gap:10px">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);min-width:44px">'+esc(a.time)+'</div><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">'+esc(a.ptName)+'</div>'+
      '<div style="font-size:11px;color:var(--text2)">'+esc(a.reason)+(phone?' · 📞 '+esc(phone):'')+'</div></div>'+
      '<span style="padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;background:'+t.bg+';color:'+t.tc+'">'+esc(Appts.STATUS[a.status])+'</span>'+
      (a.status==='pendiente'?waButton(a,true):'')+
      '<button data-action="agenda.openDetail" '+refAttrs(a)+' aria-label="Ver detalle" style="padding:5px 10px;font-size:11px;border:1px solid var(--border);border-radius:7px;background:var(--card);cursor:pointer;color:var(--text2)">⋯</button></div></div>';
  }
  function renderList(list,todayStr){
    var future=Appts.sortByTime(list.filter(function(a){return a.date>=todayStr&&a.status==='pendiente';}));
    var past=list.filter(function(a){return a.date<todayStr||a.status!=='pendiente';}).sort(function(a,b){return b.date.localeCompare(a.date)||b.time.localeCompare(a.time);}).slice(0,20);
    if(!future.length&&!past.length)return '<div style="text-align:center;padding:40px;color:var(--text3)">Sin citas registradas. Haz clic en el calendario para agregar una.</div>';
    var html='<div style="max-height:520px;overflow-y:auto">',last='';
    future.forEach(function(a){
      if(a.date!==last){last=a.date;var isT=a.date===todayStr;html+='<div style="font-size:11px;font-weight:700;color:'+(isT?'var(--accent)':'var(--text2)')+';padding:10px 0 4px;text-transform:uppercase;letter-spacing:.05em">'+(isT?'HOY — ':'')+' '+esc(fmtDate(a.date))+'</div>';}
      html+=listRow(a);
    });
    if(past.length){html+='<div style="font-size:11px;font-weight:700;color:var(--text3);padding:14px 0 4px;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid var(--border);margin-top:8px">Historial</div>';past.forEach(function(a){html+=listRow(a);});}
    return html+'</div>';
  }
  function renderPage(){
    var list=Appts.all(),todayStr=today();
    var label=MONTHS_FULL[st.month]+' '+st.year;
    if(st.view==='week'){var e=new Date(st.weekStart);e.setDate(e.getDate()+6);label=st.weekStart.getDate()+' '+MONTHS_FULL[st.weekStart.getMonth()]+' — '+e.getDate()+' '+MONTHS_FULL[e.getMonth()]+' '+e.getFullYear();}
    if(st.view==='list')label='Próximas citas';
    var vb=function(v,l){var on=st.view===v;return '<button data-action="agenda.view" data-view="'+v+'" style="padding:6px 12px;font-size:12px;font-weight:500;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:'+(on?'var(--accent)':'var(--card)')+';color:'+(on?'#fff':'var(--text2)')+'">'+l+'</button>';};
    var arrow=function(act,t){return '<button data-action="'+act+'" aria-label="'+(act==='agenda.prev'?'Anterior':'Siguiente')+'" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--card);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">'+t+'</button>';};
    var nav='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px"><div style="display:flex;align-items:center;gap:10px">'+
      (st.view==='list'?'':arrow('agenda.prev','‹'))+'<div style="font-size:17px;font-weight:700;color:var(--text);min-width:180px;text-align:center">'+esc(label)+'</div>'+(st.view==='list'?'':arrow('agenda.next','›'))+
      '<button data-action="agenda.today" style="padding:6px 12px;font-size:12px;border-radius:7px;border:1px solid var(--border);background:var(--card);color:var(--text2);cursor:pointer">Hoy</button></div>'+
      '<div style="display:flex;gap:8px;align-items:center"><div style="display:flex;gap:4px">'+vb('month','Mes')+vb('week','Semana')+vb('list','Lista')+'</div>'+
      '<button class="btn-primary" data-action="agenda.openQuick" style="padding:7px 14px;font-size:12px">+ Nueva cita</button></div></div>';
    var cal=st.view==='month'?renderMonth(list,todayStr):st.view==='week'?renderWeek(list,todayStr):renderList(list,todayStr);
    var todays=Appts.sortByTime(list.filter(function(a){return a.date===todayStr;}));
    var t=todayDate(),d3=daysFromNow(3);
    var next3=Appts.sortByTime(list.filter(function(a){return a.date>=todayStr&&a.date<=d3&&a.status==='pendiente'&&!a.recordado&&Appts.phoneOf(a);}));
    var reminders=next3.length?'<div class="card" style="padding:14px"><div class="card-title" style="margin-bottom:6px">📱 Recordatorios pendientes</div><div style="font-size:11px;color:var(--text3);margin-bottom:10px">Próximos 3 días — clic para enviar por WhatsApp</div>'+
      next3.map(function(a){return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(a.ptName)+'</div><div style="font-size:10px;color:var(--text3)">'+esc(fmtDate(a.date))+' · '+esc(a.time)+'</div></div>'+
        '<button data-action="agenda.sendWA" '+refAttrs(a)+' style="padding:5px 8px;background:#25d366;border:none;border-radius:7px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px;font-size:10px;color:#fff;font-weight:600">'+waIcon(12)+'Enviar</button></div>';}).join('')+'</div>':'';
    return '<div style="display:flex;gap:14px;align-items:flex-start"><div style="flex:1;min-width:0"><div class="card" style="padding:16px">'+nav+cal+'</div></div><div style="width:280px;flex-shrink:0">'+
      '<div class="card" style="padding:14px;margin-bottom:12px"><div class="card-title" style="margin-bottom:10px">📅 Hoy — '+t.getDate()+' de '+esc(MONTHS_FULL[t.getMonth()])+'</div>'+
      (todays.length?todays.map(miniCard).join(''):'<div style="font-size:12px;color:var(--text3);padding:8px 0;text-align:center">Sin citas hoy</div>')+
      '<button data-action="agenda.openQuick" data-date="'+todayStr+'" style="width:100%;margin-top:10px;padding:8px;font-size:12px;background:var(--bg);border:1.5px dashed var(--border);border-radius:8px;cursor:pointer;color:var(--text2);font-weight:500">+ Agregar cita hoy</button></div>'+
      '<div class="card" style="padding:14px"><div class="card-title" style="margin-bottom:10px">📋 Leyenda</div><div style="display:flex;flex-direction:column;gap:6px;font-size:11px">'+
      [['#dbeafe','#93c5fd','Paciente registrado'],['#f0e7d8','#dcc39c','Cita rápida / sin ficha'],['#d1fae5','#6ee7b7','Completada'],['#fee2e2','#fca5a5','No asistió']]
        .map(function(l){return '<div style="display:flex;align-items:center;gap:7px"><div style="width:12px;height:12px;border-radius:3px;background:'+l[0]+';border:1px solid '+l[1]+'"></div>'+l[2]+'</div>';}).join('')+'</div></div>'+reminders+'</div></div>';
  }

  /* ── nueva cita (rápida o de un paciente) ── */
  function openQuick(date,time){
    openModal('<div class="modal-title">📅 Nueva cita</div>'+
      '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af"><strong>💬 Cita rápida:</strong> Si el paciente te escribió por mensaje pero no tiene ficha, completa solo los datos básicos. Luego podrás crear su ficha completa.</div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Buscar paciente registrado (opcional)</label><div style="position:relative">'+
        '<input id="f_qa_search" placeholder="Escribe el nombre del paciente..." autocomplete="off" data-on-input="agenda.filterPatients" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;outline:none;font-family:inherit;background:var(--card);color:var(--text)">'+
        '<div id="f_qa_dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:0 0 10px 10px;z-index:600;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div></div>'+
        '<input type="hidden" id="f_qa_pt" value="">'+
        '<div id="f_qa_selected" style="display:none;margin-top:6px;padding:8px 12px;background:#d1fae5;border-radius:8px;font-size:12px;color:#065f46;align-items:center;justify-content:space-between"><span id="f_qa_selected_name"></span><button data-action="agenda.clearPatient" aria-label="Quitar paciente" style="background:none;border:none;color:#065f46;cursor:pointer;font-size:14px">✕</button></div></div></div>'+
      '<div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Datos del paciente</div>'+
        '<div class="form-row"><div class="form-group"><label>Nombre *</label><input id="f_qa_name" placeholder="Nombre del paciente"></div><div class="form-group"><label>Teléfono</label><input id="f_qa_phone" placeholder="0987-654-321"></div></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha *</label><input id="f_qa_date" type="date" value="'+esc(date||today())+'"></div><div class="form-group"><label>Hora *</label><input id="f_qa_time" type="time" value="'+esc(time||'09:00')+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Motivo de la cita *</label><input id="f_qa_reason" placeholder="Consulta, limpieza, dolor, extracción..."></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Notas adicionales</label><input id="f_qa_notes" placeholder="Canal de agendamiento, observaciones..."></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="agenda.saveQuick">Guardar cita</button></div>');
  }
  function filterPatients(q){
    var dd=$('f_qa_dropdown');if(!dd)return;
    var nq=Patients.norm(q),dq=nq.replace(/\D/g,'');
    if(!nq){dd.style.display='none';return;}
    var m=Patients.all().filter(function(p){return Patients.norm(p.name).indexOf(nq)>-1||Patients.norm(p.cedula).indexOf(nq)>-1||(dq.length>=3&&String(p.phone||'').replace(/\D/g,'').indexOf(dq)>-1);}).slice(0,8);
    if(!m.length){dd.style.display='none';return;}
    dd.innerHTML=m.map(function(p){
      return '<div class="dd-item" data-action="agenda.pickPatient" data-id="'+esc(p.id)+'"><div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+esc(initials(p.name||'?'))+'</div>'+
        '<div><div style="font-weight:600">'+esc(p.name)+'</div><div style="font-size:10px;color:var(--text3)">'+esc(p.cedula||'')+' '+(p.phone?'· '+esc(p.phone):'')+'</div></div></div>';}).join('');
    dd.style.display='block';
  }
  function pickPatient(id){
    var p=Patients.get(id);if(!p)return;
    $('f_qa_pt').value=p.id;$('f_qa_name').value=p.name;$('f_qa_phone').value=p.phone||'';$('f_qa_search').value=p.name;$('f_qa_dropdown').style.display='none';
    $('f_qa_selected_name').textContent='✓ Paciente registrado: '+p.name;$('f_qa_selected').style.display='flex';
  }
  function clearPatient(){
    ['f_qa_pt','f_qa_name','f_qa_phone','f_qa_search'].forEach(function(i){$(i).value='';});$('f_qa_selected').style.display='none';
  }
  function askWarnings(w){return !w.length||confirm(w.join('\n')+'\n\n¿Agendar de todos modos?');}
  function saveQuick(){
    var ptId=v('f_qa_pt'),p=ptId?Patients.get(ptId):null;
    if(ptId&&!p){alert('El paciente elegido ya no existe. Quítalo y vuelve a buscarlo.');return;}
    var f={name:v('f_qa_name'),phone:v('f_qa_phone'),reason:v('f_qa_reason'),date:v('f_qa_date'),time:v('f_qa_time'),notes:v('f_qa_notes')};
    var r=Appts.check(f,{quick:!p});if(!r.ok){alert(r.error);return;}
    if(!p){   // el nombre coincide con una ficha existente: evita citas «sueltas» de pacientes que ya tienen ficha
      var nn=Patients.norm(r.clean.ptName),h=Patients.all().find(function(x){return Patients.norm(x.name)===nn;});
      if(h&&confirm('Ya existe un paciente llamado «'+h.name+'».\n\nAceptar = agendar la cita en su ficha\nCancelar = crear una cita rápida sin ficha'))p=h;
    }
    if(!askWarnings(r.warnings))return;
    if(p)Appts.addToPatient(p.id,r.clean);else Appts.addQuick(r.clean);
    closeModal();api.show();
  }

  /* ── detalle de una cita ── */
  function refOf(id,type,ptId){return {id:id,type:type==='quick'?'quick':'registered',ptId:ptId};}
  function openDetail(id,type,ptId){
    var ref=refOf(id,type,ptId),a=Appts.describe(ref);if(!a)return;
    var opts=Object.keys(Appts.STATUS).map(function(s){return '<option value="'+s+'"'+(a.status===s?' selected':'')+'>'+Appts.STATUS[s]+'</option>';}).join('');
    var at=refAttrs(Object.assign({},a,{type:ref.type}));
    openModal('<div class="modal-title">Detalle de cita</div><div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px">'+
      '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">'+esc(a.ptName)+'</div>'+(a.phone?'<div style="font-size:12px;color:var(--text2);margin-bottom:2px">📞 '+esc(a.phone)+'</div>':'')+
      '<div style="font-size:13px;color:var(--text2)">📅 '+esc(fmtDate(a.date))+' — '+esc(a.time)+'</div><div style="font-size:13px;color:var(--text2);margin-top:4px">🦷 '+esc(a.reason)+'</div>'+
      (a.notes?'<div style="font-size:12px;color:var(--text3);margin-top:4px">📝 '+esc(a.notes)+'</div>':'')+
      (a.recordado?'<div style="font-size:11px;color:var(--text3);margin-top:4px">📱 Recordatorio preparado el '+esc(fmtDate(a.recordado))+'</div>':'')+
      (ref.type==='quick'?'<div style="margin-top:8px;padding:6px 10px;background:#f0e7d8;border-radius:7px;font-size:11px;color:#6b4a2f">💬 Cita rápida — sin ficha de paciente</div>':'')+'</div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ad_date" type="date" value="'+esc(a.date)+'"></div><div class="form-group"><label>Hora</label><input id="f_ad_time" type="time" value="'+esc(a.time)+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Motivo</label><input id="f_ad_reason" value="'+esc(a.reason)+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Estado</label><select id="f_ad_status">'+opts+'</select></div></div>'+
      '<div class="modal-footer" style="justify-content:space-between"><div style="display:flex;gap:8px"><button class="btn-sec" style="color:var(--red);border-color:#fca5a5" data-action="agenda.deleteDetail" '+at+'>Eliminar</button>'+
      (ref.type==='quick'?'<button class="btn-sec" data-action="agenda.openConvert" data-id="'+esc(a.id)+'">Crear ficha</button>':'<button class="btn-sec" data-action="agenda.openPatient" data-id="'+esc(a.ptId)+'">Ver ficha</button>')+'</div>'+
      '<div style="display:flex;gap:8px"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="agenda.saveDetail" '+at+'>Guardar</button></div></div>');
  }
  function saveDetail(id,type,ptId){
    var ref=refOf(id,type,ptId),a=Appts.describe(ref);if(!a)return;
    var r=Appts.check({reason:v('f_ad_reason'),date:v('f_ad_date'),time:v('f_ad_time'),status:v('f_ad_status')},{exceptRef:ref});
    if(!r.ok){alert(r.error);return;}
    if(!askWarnings(r.warnings))return;
    Appts.update(ref,r.clean);closeModal();api.show();
  }
  function deleteDetailUI(id,type,ptId){
    var ref=refOf(id,type,ptId),a=Appts.describe(ref);if(!a)return;
    if(!confirm('¿Eliminar la cita de '+a.ptName+' del '+fmtDate(a.date)+' a las '+a.time+'?\nEsta acción no se puede deshacer.'))return;
    Appts.remove(ref);closeModal();api.show();
  }
  function openPatient(id){closeModal();Patients.select(id);}
  // Cita rápida → ficha completa (la cita pasa a la ficha)
  function openConvert(qId){
    var qa=Appts.describe({id:qId,type:'quick'});if(!qa)return;
    closeModal();
    openModal('<div class="modal-title">Crear ficha de paciente</div><p style="font-size:13px;color:var(--text2);margin-bottom:14px">Se creará una ficha completa para <strong>'+esc(qa.ptName)+'</strong> y la cita quedará asociada a ella.</p>'+
      Patients.formHtml({name:qa.ptName,phone:qa.phone||''})+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="agenda.confirmConvert" data-id="'+esc(qa.id)+'">Crear ficha y asociar cita</button></div>');
  }
  function confirmConvert(qId){
    var qa=Appts.describe({id:qId,type:'quick'});if(!qa)return;
    var np=Patients.addFromForm({appointments:[{id:uid(),reason:qa.reason,date:qa.date,time:qa.time,status:qa.status,notes:qa.notes||'',recordado:qa.recordado}]});
    if(!np)return;
    Appts.remove({id:qId,type:'quick'});
    closeModal();Patients.renderList();Patients.select(np.id);
  }

  /* ── pestaña «Citas» de la ficha ── */
  function dateBox(a){
    var d=new Date(a.date+'T12:00'),ok=!isNaN(d.getTime());
    return '<div class="appt-date-box"><div class="appt-day">'+(ok?d.getDate():'—')+'</div><div class="appt-mon">'+(ok?esc(MONTHS[d.getMonth()]):'')+'</div></div>';
  }
  function renderPatientTab(){
    var p=Patients.current(),todayStr=today(),mine=Appts.all().filter(function(a){return a.type==='registered'&&String(a.ptId)===String(p.id);});
    var pend=Appts.sortByTime(mine.filter(function(a){return a.status!=='completada';}));
    var done=mine.filter(function(a){return a.status==='completada';}).sort(function(a,b){return b.date.localeCompare(a.date)||b.time.localeCompare(a.time);});
    var row=function(a){
      var isPend=a.status!=='completada';
      return '<div class="row-item">'+dateBox(a)+'<div style="flex:1"><div class="row-name">'+esc(a.reason)+'</div><div class="row-meta">'+esc(a.time)+(a.date===todayStr?' · <b style="color:var(--accent)">HOY</b>':'')+
        (a.status==='no_asistio'?' · <b style="color:var(--red)">No asistió</b>':'')+'</div></div>'+
        (isPend?'<button class="comp-btn" data-action="agenda.complete" data-id="'+esc(a.id)+'">Completar</button>'+(a.status==='pendiente'?'<button class="btn-sm" style="margin-left:6px;font-size:11px;padding:4px 10px" data-action="agenda.noShow" data-id="'+esc(a.id)+'">No asistió</button>':''):'<span class="badge badge-green">Completada</span>')+
        '<button class="del-btn" style="margin-left:'+(isPend?6:8)+'px" data-action="agenda.deleteOwn" data-id="'+esc(a.id)+'" aria-label="Eliminar cita">✕</button></div>';};
    return '<div class="card"><div class="action-row"><div class="card-title" style="margin:0">Citas programadas</div><button class="btn-primary" data-action="agenda.openAdd">+ Nueva cita</button></div>'+
      (pend.length?pend.map(row).join(''):'<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin citas programadas</div>')+'</div>'+
      (done.length?'<div class="card"><div class="card-title">Citas completadas</div>'+done.map(row).join('')+'</div>':'');
  }
  function openAdd(){
    if(!Patients.current())return;
    openModal('<div class="modal-title">Nueva cita</div><div class="form-row form-full"><div class="form-group"><label>Motivo *</label><input id="f_apr" placeholder="Control, limpieza, extracción..."></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_apd" type="date" value="'+today()+'"></div><div class="form-group"><label>Hora</label><input id="f_apt" type="time" value="09:00"></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="agenda.saveAdd">Guardar</button></div>');
  }
  function saveAdd(){
    var p=Patients.current();if(!p)return;
    var r=Appts.check({reason:v('f_apr'),date:v('f_apd'),time:v('f_apt')});if(!r.ok){alert(r.error);return;}
    if(!askWarnings(r.warnings))return;
    Appts.addToPatient(p.id,r.clean);closeModal();Ficha.render();
  }
  function ownRef(id){return {id:id,type:'registered',ptId:Patients.current()&&Patients.current().id};}
  function completeUI(id){if(Patients.current()&&Appts.setStatus(ownRef(id),'completada'))Ficha.render();}
  function noShowUI(id){if(Patients.current()&&Appts.setStatus(ownRef(id),'no_asistio'))Ficha.render();}
  function deleteUI(id){
    var a=Patients.current()&&Appts.describe(ownRef(id));if(!a)return;
    if(!confirm('¿Eliminar la cita «'+a.reason+'» del '+fmtDate(a.date)+' a las '+a.time+'?'))return;
    Appts.remove(ownRef(id));Ficha.render();
  }

  /* ── WhatsApp ── */
  function sendWAUI(id,type,ptId){
    var ref=refOf(id,type,ptId),a=Appts.describe(ref);if(!a)return;
    var phone=Appts.phoneOf(a);
    if(!phone.trim()){alert(a.ptName+' no tiene número de teléfono registrado.\nAgrégalo en su ficha para poder enviar WhatsApp.');return;}
    var l=Appts.waLink(phone,a,a.ptName);
    if(!l.ok){alert('No se puede enviar WhatsApp: '+l.error+'.');return;}
    var w=null;try{w=window.open(l.url,'_blank');}catch(e){}
    if(!w){alert('El navegador bloqueó la ventana de WhatsApp.\nPermite las ventanas emergentes para este sitio e inténtalo de nuevo.');return;}
    Appts.markReminder(ref);
    if(curPage==='agenda')api.show();
  }

  var api={state:st,show:show,setView:setView,move:move,goToday:goToday,renderPage:renderPage,renderMonth:renderMonth,renderWeek:renderWeek,renderList:renderList,
    openQuick:openQuick,filterPatients:filterPatients,pickPatient:pickPatient,clearPatient:clearPatient,saveQuick:saveQuick,
    openDetail:openDetail,saveDetail:saveDetail,deleteDetailUI:deleteDetailUI,openPatient:openPatient,openConvert:openConvert,confirmConvert:confirmConvert,
    renderPatientTab:renderPatientTab,openAdd:openAdd,saveAdd:saveAdd,completeUI:completeUI,noShowUI:noShowUI,deleteUI:deleteUI,sendWAUI:sendWAUI};
  return api;
})();

/* ═══ Acciones del módulo (reemplazan los onclick del HTML) ═══ */
App.actions({
  'agenda.view':function(c){Agenda.setView(c.data.view);},'agenda.prev':function(){Agenda.move(-1);},'agenda.next':function(){Agenda.move(1);},'agenda.today':function(){Agenda.goToday();},
  'agenda.openQuick':function(c){Agenda.openQuick(c.data.date,c.data.time);},
  'agenda.filterPatients':function(c){Agenda.filterPatients(c.value);},'agenda.pickPatient':function(c){Agenda.pickPatient(c.id);},'agenda.clearPatient':function(){Agenda.clearPatient();},
  'agenda.saveQuick':function(){Agenda.saveQuick();},
  'agenda.openDetail':function(c){Agenda.openDetail(c.id,c.data.type,c.data.pt);},
  'agenda.saveDetail':function(c){Agenda.saveDetail(c.id,c.data.type,c.data.pt);},
  'agenda.deleteDetail':function(c){Agenda.deleteDetailUI(c.id,c.data.type,c.data.pt);},
  'agenda.openPatient':function(c){Agenda.openPatient(c.id);},
  'agenda.openConvert':function(c){Agenda.openConvert(c.id);},'agenda.confirmConvert':function(c){Agenda.confirmConvert(c.id);},
  'agenda.openAdd':function(){Agenda.openAdd();},'agenda.saveAdd':function(){Agenda.saveAdd();},
  'agenda.complete':function(c){Agenda.completeUI(c.id);},'agenda.noShow':function(c){Agenda.noShowUI(c.id);},'agenda.deleteOwn':function(c){Agenda.deleteUI(c.id);},
  'agenda.sendWA':function(c){Agenda.sendWAUI(c.id,c.data.type,c.data.pt);}
});
