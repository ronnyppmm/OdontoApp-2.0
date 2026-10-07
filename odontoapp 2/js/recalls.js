/* ═══ RECORDATORIOS A PACIENTES (recalls) — a quién contactar y por qué ═══
   Reglas (todas con "sin cita futura agendada"):
   • Tratamiento sin terminar : tiene tratamientos pendientes y pasaron ≥ N días desde su última visita (por defecto 14)
   • Control vencido          : pasaron ≥ N meses desde su última visita (por defecto 6)
   • Inactivo                 : pasaron ≥ N meses (por defecto 12)
   "Última visita" = la fecha más reciente entre citas completadas y tratamientos realizados.
   Un paciente aparece en UNA sola categoría (tratamiento > inactivo > control).
   Respeta: "Contactado" y "Posponer" lo ocultan por un tiempo; "No contactar" lo saca de la lista (consentimiento). */

var RC_DEF={meses:6,inactivoMeses:12,diasTx:14,snoozeDias:30};
var _rcTab='todos',_rcEnviado={};

function recallCfg(){
  var c;try{c=JSON.parse(localStorage.getItem('oa3_recall_cfg')||'{}');}catch(e){c={};}
  var o={};Object.keys(RC_DEF).forEach(function(k){var n=parseInt(c[k],10);o[k]=n>0?n:RC_DEF[k];});
  if(o.inactivoMeses<=o.meses)o.inactivoMeses=o.meses+1;
  return o;
}
function setRecallCfg(k,v){
  var c;try{c=JSON.parse(localStorage.getItem('oa3_recall_cfg')||'{}');}catch(e){c={};}
  c[k]=parseInt(v,10);localStorage.setItem('oa3_recall_cfg',JSON.stringify(c));
  actualizarBadgeRecalls();renderRecallPage();
}

/* ── fechas "YYYY-MM-DD" sin husos horarios ── */
function _ymd(s){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s||'');return m?{y:+m[1],m:+m[2],d:+m[3]}:null;}
function diasEntre(a,b){var x=_ymd(a),y=_ymd(b);if(!x||!y)return null;return Math.round((Date.UTC(y.y,y.m-1,y.d)-Date.UTC(x.y,x.m-1,x.d))/86400000);}
function mesesEntre(a,b){var x=_ymd(a),y=_ymd(b);if(!x||!y)return null;return (y.y-x.y)*12+(y.m-x.m)-(y.d<x.d?1:0);}
function sumarDias(s,n){var x=_ymd(s);return new Date(Date.UTC(x.y,x.m-1,x.d+n)).toISOString().slice(0,10);}

/* ── el cálculo (función pura: se puede probar con cualquier fecha) ── */
function calcularRecalls(lista,cfg,hoy){
  cfg=cfg||recallCfg();hoy=hoy||today();
  var out={tx:[],control:[],inactivo:[],pospuestos:[],noContactar:[]};
  (lista||[]).forEach(function(p){
    if(p.noRecall){out.noContactar.push({p:p});return;}
    var citas=p.appointments||[],tx=p.treatments||[];
    var fechas=[];
    citas.forEach(function(a){if(a.status==='completada'&&a.date)fechas.push(a.date);});
    tx.forEach(function(t){if(t.status==='realizado'&&t.date)fechas.push(t.date);});
    var ultima=fechas.sort().pop()||null;
    var citaFutura=citas.some(function(a){return a.status!=='completada'&&a.date&&a.date>=hoy;});
    if(!ultima||citaFutura)return;
    var dias=diasEntre(ultima,hoy),meses=mesesEntre(ultima,hoy);
    if(dias===null||dias<0)return;
    var pend=tx.filter(function(t){return t.status!=='realizado';});
    var item={p:p,ultima:ultima,dias:dias,meses:meses,pendientes:pend.length,
      montoPend:r2(pend.reduce(function(s,t){return s+(Number(t.cost)||0);},0)),
      ultimoContacto:(p.recall&&p.recall.ultimo)||''};
    var cat=null;
    if(pend.length&&dias>=cfg.diasTx)cat='tx';
    else if(meses>=cfg.inactivoMeses)cat='inactivo';
    else if(meses>=cfg.meses)cat='control';
    if(!cat)return;
    if(p.recall&&p.recall.hasta&&p.recall.hasta>hoy){item.hasta=p.recall.hasta;out.pospuestos.push(item);return;}
    item.cat=cat;out[cat].push(item);
  });
  ['tx','control','inactivo','pospuestos'].forEach(function(k){out[k].sort(function(a,b){return b.dias-a.dias;});});
  return out;
}
function recallsPendientes(){var r=calcularRecalls(patients);return r.tx.length+r.control.length+r.inactivo.length;}

/* ── mensajes de WhatsApp (sin datos clínicos: no se nombra el tratamiento) ── */
function mensajeRecall(p,cat,item){
  var clinica=(document.getElementById('logoText')||{}).textContent||'nuestra clínica';
  var nombre=String(p.name||'').trim().split(/\s+/)[0]||'';
  if(cat==='tx')return 'Hola '+nombre+', le saludamos de '+clinica+'. Tiene un tratamiento pendiente por continuar; es importante para su salud bucal. ¿Le gustaría que le agendemos una cita?';
  if(cat==='inactivo')return 'Hola '+nombre+', en '+clinica+' nos acordamos de usted. Ha pasado más de un año desde su última visita y queremos saber cómo está. ¿Desea agendar una revisión?';
  return 'Hola '+nombre+', le saludamos de '+clinica+'. Han pasado '+item.meses+' meses desde su última visita y es buen momento para su control y limpieza dental. ¿Le gustaría agendar una cita?';
}
function _recallItem(id){
  var r=calcularRecalls(patients),all=[].concat(r.tx,r.control,r.inactivo,r.pospuestos);
  return all.find(function(x){return x.p.id===id;});
}
function enviarRecallWA(id){
  var it=_recallItem(id);if(!it){return;}
  var num=telefonoWA(it.p.phone);
  if(!num){alert(it.p.name+' no tiene número de teléfono registrado.\nAgrégalo en su ficha para enviar WhatsApp.');return;}
  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(mensajeRecall(it.p,it.cat||(it.pendientes?'tx':'control'),it)),'_blank');
  _rcEnviado[id]=true;renderRecallPage();
}
function _recallLog(p,accion){
  p.recall=p.recall||{};p.recall.log=(p.recall.log||[]).concat([{f:today(),a:accion}]).slice(-10);
}
function marcarContactado(id){
  var p=patients.find(function(x){return x.id===id;});if(!p)return;
  _recallLog(p,'contactado');p.recall.ultimo=today();p.recall.hasta=sumarDias(today(),recallCfg().snoozeDias);
  delete _rcEnviado[id];save();actualizarBadgeRecalls();renderRecallPage();
}
function posponerRecall(id,dias){
  var p=patients.find(function(x){return x.id===id;});if(!p)return;
  dias=parseInt(dias,10)||recallCfg().snoozeDias;
  _recallLog(p,'pospuesto '+dias+' días');p.recall.hasta=sumarDias(today(),dias);
  save();actualizarBadgeRecalls();renderRecallPage();
}
function noContactarRecall(id){
  var p=patients.find(function(x){return x.id===id;});if(!p)return;
  if(!confirm('¿Marcar a '+p.name+' como "no contactar"?\n\nDejará de aparecer en los recordatorios hasta que lo reactives.'))return;
  p.noRecall=true;_recallLog(p,'no contactar');save();actualizarBadgeRecalls();renderRecallPage();
}
function reactivarRecall(id){
  var p=patients.find(function(x){return x.id===id;});if(!p)return;
  delete p.noRecall;_recallLog(p,'reactivado');save();actualizarBadgeRecalls();renderRecallPage();
}
function setRecallTab(t){_rcTab=t;renderRecallPage();}

/* ── pantalla ── */
function _fd(s){return typeof fmtDate==='function'?fmtDate(s):s;}
function _hace(it){return it.meses>=2?'hace '+it.meses+' meses':'hace '+it.dias+' días';}
var RC_META={tx:{ico:'🦷',tit:'Tratamiento sin terminar',color:'var(--red)'},control:{ico:'🗓️',tit:'Control vencido',color:'var(--amber)'},inactivo:{ico:'💤',tit:'Inactivo',color:'var(--text3)'}};
function _filaRecall(it,cat){
  var p=it.p,m=RC_META[cat]||RC_META.control,enviado=!!_rcEnviado[p.id],tel=!!telefonoWA(p.phone);
  var det=['Última visita: '+_fd(it.ultima)+' ('+_hace(it)+')'];
  if(it.pendientes)det.push(it.pendientes+' tratamiento'+(it.pendientes>1?'s':'')+' pendiente'+(it.pendientes>1?'s':'')+(it.montoPend>0?' · '+money(it.montoPend):''));
  if(it.ultimoContacto)det.push('Último contacto: '+_fd(it.ultimoContacto));
  if(it.hasta)det.push('Oculto hasta '+_fd(it.hasta));
  var btn='font-size:11px;padding:4px 9px';
  return '<div class="row" style="align-items:center;gap:10px;flex-wrap:wrap">'+
    '<div style="flex:1;min-width:200px"><div class="row-name" style="font-weight:700">'+esc(p.name)+(tel?'':' <span style="font-size:10px;color:var(--red);font-weight:600">· sin teléfono</span>')+'</div>'+
    '<div style="font-size:11px;color:var(--text3)">'+det.map(esc).join(' · ')+'</div></div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+
    (cat&&!it.hasta?'<button class="btn-sm" title="Enviar mensaje por WhatsApp" aria-label="WhatsApp" style="'+btn+'" onclick="enviarRecallWA('+p.id+')">💬 WhatsApp</button>':'')+
    (enviado&&!it.hasta?'<button class="btn-primary" style="'+btn+'" onclick="marcarContactado('+p.id+')">✔ Ya lo envié</button>':
      (!it.hasta?'<button class="btn-sm" title="Marcar como contactado" style="'+btn+'" onclick="marcarContactado('+p.id+')">✔ Contactado</button>':''))+
    (!it.hasta?'<button class="btn-sm" title="Ocultar por más días" style="'+btn+'" onclick="posponerRecall('+p.id+',60)">⏰ 60 días</button>':'')+
    '<button class="btn-sm" title="No contactar a este paciente" style="'+btn+'" onclick="noContactarRecall('+p.id+')">🚫</button>'+
    '<button class="btn-sm" style="'+btn+'" onclick="selectPt('+p.id+')">Ver</button></div></div>';
}
function _selCfg(k,opts,sufijo,val){return '<select onchange="setRecallCfg(\''+k+'\',this.value)" style="padding:4px 6px;font-size:12px">'+opts.map(function(o){return '<option value="'+o+'"'+(o===val?' selected':'')+'>'+o+' '+sufijo+'</option>';}).join('')+'</select>';}
function renderRecordatorios(){
  var cfg=recallCfg(),r=calcularRecalls(patients,cfg),tabs=[['todos','Todos',r.tx.length+r.control.length+r.inactivo.length],['tx','Tratamientos',r.tx.length],['control','Controles',r.control.length],['inactivo','Inactivos',r.inactivo.length],['pospuestos','Pospuestos',r.pospuestos.length],['noContactar','No contactar',r.noContactar.length]];
  var listas={tx:r.tx,control:r.control,inactivo:r.inactivo};
  var filas='';
  if(_rcTab==='todos'){['tx','control','inactivo'].forEach(function(c){if(listas[c].length)filas+='<div class="section-title" style="margin:16px 0 8px;font-size:12px;font-weight:700;color:'+RC_META[c].color+'">'+RC_META[c].ico+' '+RC_META[c].tit+' ('+listas[c].length+')</div>'+listas[c].map(function(i){return _filaRecall(i,c);}).join('');});}
  else if(listas[_rcTab])filas=listas[_rcTab].map(function(i){return _filaRecall(i,_rcTab);}).join('');
  else if(_rcTab==='pospuestos')filas=r.pospuestos.map(function(i){return _filaRecall(i,i.pendientes?'tx':'control');}).join('');
  else filas=r.noContactar.map(function(i){return '<div class="row" style="align-items:center;gap:10px"><div style="flex:1"><div class="row-name" style="font-weight:700">'+esc(i.p.name)+'</div><div style="font-size:11px;color:var(--text3)">No recibe recordatorios</div></div><button class="btn-sm" style="font-size:11px;padding:4px 9px" onclick="reactivarRecall('+i.p.id+')">Reactivar</button></div>';}).join('');
  if(!filas)filas='<div style="padding:28px;text-align:center;color:var(--text3);font-size:13px">'+(_rcTab==='todos'?'🎉 No hay pacientes por contactar ahora mismo.':'Nada en esta lista.')+'</div>';
  return '<div class="grid4" style="margin-bottom:16px">'+
    '<div class="kpi"><div class="kpi-label">Tratamientos sin terminar</div><div class="kpi-val" style="color:var(--red)">'+r.tx.length+'</div><div class="kpi-sub">Sin cita desde hace '+cfg.diasTx+'+ días</div></div>'+
    '<div class="kpi"><div class="kpi-label">Controles vencidos</div><div class="kpi-val" style="color:var(--amber)">'+r.control.length+'</div><div class="kpi-sub">'+cfg.meses+'+ meses sin visita</div></div>'+
    '<div class="kpi"><div class="kpi-label">Inactivos</div><div class="kpi-val">'+r.inactivo.length+'</div><div class="kpi-sub">'+cfg.inactivoMeses+'+ meses sin visita</div></div>'+
    '<div class="kpi"><div class="kpi-label">Pospuestos</div><div class="kpi-val" style="color:var(--text3)">'+r.pospuestos.length+'</div><div class="kpi-sub">Ocultos temporalmente</div></div></div>'+
    '<div class="card"><div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+
    tabs.map(function(t){return '<button class="'+(_rcTab===t[0]?'btn-primary':'btn-sec')+'" style="font-size:12px;padding:5px 12px" onclick="setRecallTab(\''+t[0]+'\')">'+t[1]+' ('+t[2]+')</button>';}).join('')+'</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:12px;color:var(--text2);padding:8px 10px;background:var(--bg);border-radius:8px;margin-bottom:10px">'+
    '<span>Control a los '+_selCfg('meses',[3,4,6,9,12],'meses',cfg.meses)+'</span>'+
    '<span>Inactivo tras '+_selCfg('inactivoMeses',[12,18,24,36],'meses',cfg.inactivoMeses)+'</span>'+
    '<span>Tratamiento sin cita tras '+_selCfg('diasTx',[7,14,21,30],'días',cfg.diasTx)+'</span>'+
    '<span>Al contactar, ocultar '+_selCfg('snoozeDias',[15,30,60,90],'días',cfg.snoozeDias)+'</span></div>'+
    filas+'</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.5">Solo aparecen pacientes sin una cita futura agendada. Los mensajes no mencionan el tratamiento. Usa «No contactar» con quien no desee recibir recordatorios.</div>';
}
function renderRecallPage(){
  if(typeof curPage!=='undefined'&&curPage!=='recordatorios')return;
  var mc=document.getElementById('mainContent');if(mc)mc.innerHTML=renderRecordatorios();
}

/* ── tarjeta en el dashboard + insignia en el menú ── */
function recallCardHtml(){
  var r=calcularRecalls(patients),n=r.tx.length+r.control.length+r.inactivo.length;
  if(!n)return '';
  var top=[].concat(r.tx,r.control,r.inactivo).slice(0,3).map(function(i){return esc(i.p.name);}).join(', ');
  return '<div style="background:var(--card);border:1px solid var(--border);border-left:4px solid var(--amber);border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'+
    '<div style="font-size:24px">📞</div><div style="flex:1;min-width:200px"><div style="font-size:14px;font-weight:700">'+n+' paciente'+(n>1?'s':'')+' por contactar</div>'+
    '<div style="font-size:12px;color:var(--text3)">'+r.tx.length+' con tratamiento sin terminar · '+r.control.length+' con control vencido · '+r.inactivo.length+' inactivos'+(top?' — '+top+(n>3?'…':''):'')+'</div></div>'+
    '<button class="btn-primary" style="font-size:12px;padding:7px 14px" onclick="showPage(\'recordatorios\')">Ver recordatorios</button></div>';
}
function actualizarBadgeRecalls(){
  var item=document.getElementById('nav-recordatorios');if(!item)return;
  var n=0;try{n=recallsPendientes();}catch(e){}
  var b=document.getElementById('recallBadge');
  if(!n){if(b)b.remove();return;}
  if(!b){b=document.createElement('span');b.id='recallBadge';b.className='sb-badge';item.appendChild(b);}
  b.textContent=n>99?'99+':String(n);b.setAttribute('aria-label',n+' pacientes por contactar');
}
setInterval(actualizarBadgeRecalls,30000);
setTimeout(actualizarBadgeRecalls,2500);
(function(){var _sp=window.showPage;if(typeof _sp==='function')window.showPage=function(){var r=_sp.apply(this,arguments);try{actualizarBadgeRecalls();}catch(e){}return r;};})();
