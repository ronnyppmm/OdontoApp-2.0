/* ═══ FINANZAS — pagos, egresos, cierre de mes, informes y estadísticas ═══
   • Un solo lugar calcula "qué entró y salió en un mes" (monthData); estadísticas, cierre e informes lo comparten.
   • Todo pago/egreso se valida al guardar (monto, fecha real, textos limpios): ningún movimiento queda "invisible" en los meses.
   • Cerrar un mes guarda un resumen y marca sus movimientos como archivados; reabrirlo lo deshace por completo.
   • El HTML no lleva onclick: usa data-action (ver app.js). Los nombres antiguos (savePay, cerrarMes…) siguen como alias. */
const Finance=(function(){
  'use strict';
  var TYPES=['Efectivo','Transferencia','Tarjeta de crédito','Tarjeta de débito','Cheque'];
  var CATS=['Materiales','Arriendo','Servicios','Sueldos','Equipos','Marketing','Impuestos','Otro'];
  var MIN_YEAR=1990,MAX_YEAR=2100;

  /* ═══ datos ═══ */
  function fm(n){return n<0?'-'+money(-n):money(n);}                         // dinero con signo: -$5.00 (money() daría $-5.00)
  function sumM(list,field){return (list||[]).reduce(function(s,x){return addM(s,x&&x[field]);},0);}
  function ym(s){                                                             // 'YYYY-MM-DD' → {y, m(0-11)} o null si no es una fecha real
    var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s||''));if(!m)return null;
    var y=+m[1],mo=+m[2]-1,d=+m[3];if(mo<0||mo>11||d<1||d>31)return null;
    return {y:y,m:mo};
  }
  function validDate(s){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));if(!m)return false;
    var y=+m[1],mo=+m[2],d=+m[3];if(y<MIN_YEAR||y>MAX_YEAR)return false;
    var dt=new Date(Date.UTC(y,mo-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d;
  }
  function closedMonth(m,y){for(var i=0;i<archivosContables.length;i++){var a=archivosContables[i];if(a.mes===m&&a.anio===y)return a;}return null;}
  function findPayment(id){
    for(var i=0;i<patients.length;i++){var ps=patients[i].payments||[];for(var j=0;j<ps.length;j++){if(String(ps[j].id)===String(id))return {p:patients[i],py:ps[j]};}}
    return null;
  }
  // Lo que entró y salió en un mes. includeArchived=true para informes del mes completo.
  function monthData(m,y,opts){
    var all=!!(opts&&opts.includeArchived),pagos=[],eg=[],ids={};
    patients.forEach(function(p){
      (p.payments||[]).forEach(function(py){
        var k=ym(py.date);
        if(k&&k.m===m&&k.y===y&&(all||!py.archivado)){pagos.push({paciente:p.name,cedula:p.cedula,concepto:py.concept,monto:py.amount,fecha:py.date,tipo:py.type,ptId:p.id,pagoId:py.id});ids[p.id]=1;}
      });
    });
    egresos.forEach(function(e){var k=ym(e.fecha);if(k&&k.m===m&&k.y===y&&(all||!e.archivado))eg.push(e);});
    var ti=sumM(pagos,'monto'),te=sumM(eg,'monto');
    return {m:m,y:y,pagos:pagos,egresos:eg,totalIngresos:ti,totalEgresos:te,utilidad:subM(ti,te),pacientes:Object.keys(ids).length};
  }
  function yearLive(y){                                                       // movimientos del año que aún no se han cerrado
    var ing=0,eg=0;
    patients.forEach(function(p){(p.payments||[]).forEach(function(py){var k=ym(py.date);if(k&&k.y===y&&!py.archivado)ing=addM(ing,py.amount);});});
    egresos.forEach(function(e){var k=ym(e.fecha);if(k&&k.y===y&&!e.archivado)eg=addM(eg,e.monto);});
    return {ingresos:ing,egresos:eg};
  }
  // Movimientos sin fecha válida: suman en el saldo del paciente pero no aparecen en ningún mes.
  function dataIssues(){
    var pagos=[],eg=[];
    patients.forEach(function(p){(p.payments||[]).forEach(function(py){if(!ym(py.date))pagos.push({p:p,py:py});});});
    egresos.forEach(function(e){if(!ym(e.fecha))eg.push(e);});
    return {pagos:pagos,egresos:eg,total:pagos.length+eg.length,monto:addM(sumM(pagos.map(function(x){return x.py;}),'amount'),sumM(eg,'monto'))};
  }

  /* ═══ validación ═══ */
  function clean(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max);}
  function checkPayment(f){
    f=f||{};var amt=parseMonto(f.monto);
    if(!(amt>0))return {ok:false,error:'Monto inválido'};
    var fecha=String(f.fecha||'').trim();
    if(!validDate(fecha))return {ok:false,error:'La fecha del pago no es válida'};
    return {ok:true,clean:{amount:amt,date:fecha,type:clean(f.tipo,40)||'Efectivo',concept:clean(f.concepto,120)||'Pago'}};
  }
  function checkExpense(f){
    f=f||{};var c=clean(f.concepto,200);
    if(!c)return {ok:false,error:'El concepto es obligatorio'};
    if(c.length>120)return {ok:false,error:'El concepto es demasiado largo (máximo 120 caracteres)'};
    var m=parseMonto(f.monto);if(!(m>0))return {ok:false,error:'Monto inválido'};
    var fecha=String(f.fecha||'').trim();
    if(!validDate(fecha))return {ok:false,error:'La fecha del egreso no es válida'};
    return {ok:true,clean:{concepto:c,categoria:clean(f.categoria,40)||'Otro',monto:m,fecha:fecha,proveedor:clean(f.proveedor,80)}};
  }
  function warningsFor(fecha,what){                                          // avisos que el usuario puede aceptar
    var w=[],k=ym(fecha),a=k?closedMonth(k.m,k.y):null;
    if(a)w.push('El mes de '+a.label+' ya está cerrado y archivado. Este '+what+' NO se sumará a ese cierre (solo aparecerá en el total del año).');
    if(fecha>today())w.push('La fecha es futura ('+fmtDate(fecha)+').');
    return w;
  }
  function confirmWarnings(fecha,what){var w=warningsFor(fecha,what);return !w.length||confirm(w.join('\n\n')+'\n\n¿Registrarlo de todos modos?');}

  /* ═══ operaciones (sin pantallas) ═══ */
  function addPayment(ptId,c){
    var p=Patients.get(ptId);if(!p)return null;
    var pago={id:uid(),concept:c.concept,amount:c.amount,date:c.date,type:c.type,factPendiente:true};
    (p.payments=p.payments||[]).push(pago);save();return pago;
  }
  function removePayment(ptId,payId){
    var p=Patients.get(ptId);if(!p)return null;
    var ps=p.payments||[];
    for(var i=0;i<ps.length;i++){if(String(ps[i].id)===String(payId)){var r=ps.splice(i,1)[0];save();return r;}}
    return null;
  }
  function markInvoiced(payId){var f=findPayment(payId);if(!f)return false;f.py.factPendiente=false;save();return true;}
  function addExpense(c){var e={id:uid(),concepto:c.concepto,categoria:c.categoria,monto:c.monto,fecha:c.fecha,proveedor:c.proveedor};egresos.push(e);save();return e;}
  function removeExpense(id){
    for(var i=0;i<egresos.length;i++){if(String(egresos[i].id)===String(id)){var r=egresos.splice(i,1)[0];save();return r;}}
    return null;
  }
  function closeMonth(m,y){
    if(closedMonth(m,y))return {ok:false,error:'closed'};
    var d=monthData(m,y);
    if(!d.totalIngresos&&!d.totalEgresos)return {ok:false,error:'empty'};
    var archive={id:uid(),mes:m,anio:y,label:MONTHS_FULL[m]+' '+y,fechaCierre:today(),pagos:d.pagos,egresos:JSON.parse(JSON.stringify(d.egresos)),   // copia: el resumen no depende de los egresos vivos
      totalIngresos:d.totalIngresos,totalEgresos:d.totalEgresos,utilidad:d.utilidad,pacientesAtendidos:d.pacientes};
    archivosContables.push(archive);
    patients.forEach(function(p){(p.payments||[]).forEach(function(py){var k=ym(py.date);if(k&&k.m===m&&k.y===y)py.archivado=true;});});
    egresos.forEach(function(e){var k=ym(e.fecha);if(k&&k.m===m&&k.y===y)e.archivado=true;});
    save();return {ok:true,archive:archive};
  }
  function archivedCount(a){
    var np=0,ne=0;
    patients.forEach(function(p){(p.payments||[]).forEach(function(py){var k=ym(py.date);if(py.archivado&&k&&k.m===a.mes&&k.y===a.anio)np++;});});
    egresos.forEach(function(e){var k=ym(e.fecha);if(e.archivado&&k&&k.m===a.mes&&k.y===a.anio)ne++;});
    return {pagos:np,egresos:ne};
  }
  // Deshace un cierre: sus movimientos vuelven a contarse y el resumen se elimina (antes el resumen se borraba y los movimientos quedaban "archivados" para siempre)
  function reopenMonth(id){
    var idx=-1;for(var i=0;i<archivosContables.length;i++){if(String(archivosContables[i].id)===String(id)){idx=i;break;}}
    if(idx<0)return null;
    var a=archivosContables[idx],n=archivedCount(a);
    patients.forEach(function(p){(p.payments||[]).forEach(function(py){var k=ym(py.date);if(py.archivado&&k&&k.m===a.mes&&k.y===a.anio)delete py.archivado;});});
    egresos.forEach(function(e){var k=ym(e.fecha);if(e.archivado&&k&&k.m===a.mes&&k.y===a.anio)delete e.archivado;});
    archivosContables.splice(idx,1);save();return n;
  }

  /* ═══ pantallas ═══ */
  function kpi(label,val,color,sub){return '<div class="kpi"><div class="kpi-label">'+label+'</div><div class="kpi-val" style="color:'+color+'">'+val+'</div><div class="kpi-sub">'+sub+'</div></div>';}
  var TH='padding:8px 12px;font-weight:700;font-size:10px;text-transform:uppercase;';
  function renderStats(){
    var now=localDate(new Date()),curY=now.getFullYear(),curM=now.getMonth(),mName=MONTHS_FULL[curM];
    var cur=monthData(curM,curY),cartera=carteraTotal(patients),issues=dataIssues();
    var archYear=archivosContables.filter(function(a){return a.anio===curY;}).sort(function(a,b){return a.mes-b.mes;});
    var archInc=sumM(archYear,'totalIngresos'),archEg=sumM(archYear,'totalEgresos'),live=yearLive(curY);
    var yearInc=addM(archInc,live.ingresos),yearEg=addM(archEg,live.egresos);
    var green='var(--green)',red='var(--red)',sign=function(n){return n>=0?green:red;};
    var activos=egresos.filter(function(e){return !e.archivado;});
    var cats={};activos.forEach(function(e){cats[e.categoria]=addM(cats[e.categoria]||0,e.monto);});
    var catRows=Object.keys(cats).map(function(k){return [k,cats[k]];}).sort(function(a,b){return b[1]-a[1];});
    var btn='style="font-size:10px;padding:3px 8px';
    return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px"><div style="font-size:16px;font-weight:700;color:var(--text)">Estadísticas financieras</div>'+
      '<div style="display:flex;gap:8px"><button class="btn-sm" data-action="finance.downloadMonthly" style="background:var(--green);color:#fff;border-color:var(--green)">📥 Informe '+mName+'</button>'+
      '<button class="btn-sm" data-action="finance.openCloseMonth" style="color:var(--red);border-color:#fca5a5">🗂 Cerrar mes</button></div></div>'+
      (issues.total?'<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#78350f"><b>⚠️ '+issues.total+' movimiento'+(issues.total>1?'s':'')+' sin fecha válida ('+money(issues.monto)+')</b> no se cuenta'+(issues.total>1?'n':'')+' en ningún mes. Corrígelos o elimínalos:'+
        issues.pagos.slice(0,5).map(function(x){return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="flex:1">Pago de '+money(x.py.amount)+' · '+esc(x.p.name)+' · '+esc(x.py.concept)+'</span><button class="btn-sm" '+btn+'" data-action="patients.select" data-id="'+esc(x.p.id)+'">Ver paciente</button></div>';}).join('')+
        issues.egresos.slice(0,5).map(function(e){return '<div style="display:flex;align-items:center;gap:8px;margin-top:6px"><span style="flex:1">Egreso de '+money(e.monto)+' · '+esc(e.concepto)+'</span><button class="btn-sm" '+btn+'" data-action="finance.deleteExpense" data-id="'+esc(e.id)+'">Eliminar</button></div>';}).join('')+'</div>':'')+
      '<div class="grid4" style="margin-bottom:16px">'+
        kpi('Ingresos '+mName,money(cur.totalIngresos),green,'Se reinicia al cerrar mes')+kpi('Egresos '+mName,money(cur.totalEgresos),red,'Se reinicia al cerrar mes')+
        kpi('Utilidad '+mName,fm(cur.utilidad),sign(cur.utilidad),'Se reinicia al cerrar mes')+
        kpi('Cartera pendiente',money(cartera.plan),'var(--amber)','Saldo del plan · Exigible hoy: '+money(cartera.exigible)+' ('+cartera.conSaldo+' paciente'+(cartera.conSaldo===1?'':'s')+')')+'</div>'+
      (archYear.length?'<div class="card" style="margin-bottom:14px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div class="card-title" style="margin:0">📊 Resumen anual '+curY+' — meses cerrados</div>'+
        '<button class="btn-sm" data-action="finance.downloadAnnual" data-y="'+curY+'" style="background:var(--accent);color:#fff;border-color:var(--accent)">📥 Informe anual</button></div>'+
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg)">'+
        '<th style="'+TH+'text-align:left;color:var(--text2)">Mes</th><th style="'+TH+'text-align:right;color:var(--green)">Ingresos</th><th style="'+TH+'text-align:right;color:var(--red)">Egresos</th><th style="'+TH+'text-align:right;color:var(--text2)">Utilidad</th><th style="'+TH+'text-align:center;color:var(--text2)">Acciones</th></tr></thead><tbody>'+
        archYear.map(function(a){return '<tr style="border-top:1px solid var(--border)"><td style="padding:10px 12px;font-weight:600;color:var(--text)">'+esc(a.label)+'</td>'+
          '<td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:600">'+money(a.totalIngresos)+'</td><td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:600">'+money(a.totalEgresos)+'</td>'+
          '<td style="padding:10px 12px;text-align:right;font-weight:700;color:'+sign(a.utilidad)+'">'+(a.utilidad>=0?'+':'')+fm(a.utilidad)+'</td>'+
          '<td style="padding:10px 12px;text-align:center;display:flex;gap:6px;justify-content:center"><button class="btn-sm" '+btn+'" data-action="finance.viewArchive" data-id="'+esc(a.id)+'">👁 Ver</button>'+
          '<button class="btn-sm" '+btn+';color:var(--green)" data-action="finance.downloadArchive" data-id="'+esc(a.id)+'">📥</button>'+
          '<button class="del-btn" '+btn+'" title="Reabrir el mes y eliminar este resumen" aria-label="Reabrir mes" data-action="finance.reopenMonth" data-id="'+esc(a.id)+'">✕</button></td></tr>';}).join('')+
        '<tr style="border-top:2px solid var(--text);background:var(--bg)"><td style="padding:10px 12px;font-weight:700;color:var(--text)">TOTAL ARCHIVADO</td><td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:700">'+money(archInc)+'</td><td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:700">'+money(archEg)+'</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:'+sign(subM(archInc,archEg))+'">'+fm(subM(archInc,archEg))+'</td><td></td></tr>'+
        '<tr style="background:#dbeafe"><td style="padding:10px 12px;font-weight:700;color:#1e40af">TOTAL AÑO '+curY+'</td><td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:700">'+money(yearInc)+'</td><td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:700">'+money(yearEg)+'</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:'+sign(subM(yearInc,yearEg))+'">'+fm(subM(yearInc,yearEg))+'</td><td></td></tr></tbody></table></div></div>':'')+
      '<div class="grid2"><div class="card"><div class="action-row"><div class="card-title" style="margin:0">Egresos registrados</div><button class="btn-primary" data-action="finance.openAddExpense">+ Agregar egreso</button></div>'+
        activos.slice().reverse().slice(0,10).map(function(e){return '<div class="row-item"><div style="flex:1"><div class="row-name">'+esc(e.concepto)+'</div><div class="row-meta">'+esc(e.categoria)+' · '+fmtDate(e.fecha)+(e.proveedor?' · '+esc(e.proveedor):'')+'</div></div>'+
          '<div class="pay-egreso">-'+money(e.monto)+'</div><button class="del-btn" style="margin-left:8px" aria-label="Eliminar egreso" data-action="finance.deleteExpense" data-id="'+esc(e.id)+'">✕</button></div>';}).join('')+
        (egresos.length===0?'<div style="font-size:13px;color:var(--text3)">Sin egresos registrados</div>':'')+'</div>'+
        '<div class="card"><div class="card-title">Egresos por categoría</div>'+
        (catRows.length?catRows.map(function(r){return '<div class="row-item"><div style="flex:1"><div class="row-name">'+esc(r[0])+'</div></div><div style="font-size:14px;font-weight:700;color:var(--red)">'+money(r[1])+'</div></div>';}).join(''):'<div style="font-size:13px;color:var(--text3)">Sin datos</div>')+'</div></div>'+
      '<div class="card"><div class="card-title">Resumen por paciente</div>'+
      patients.map(function(p){return {p:p,c:resumenCuenta(p)};}).sort(function(a,b){return b.c.exigible-a.c.exigible||b.c.planPendiente-a.c.planPendiente;}).map(function(x){
        var p=x.p,c=x.c;
        return '<div class="row-item"><div class="sb-av" style="background:'+ptColor(p.id)+';width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">'+esc(initials(p.name||'?'))+'</div>'+
        '<div style="flex:1"><div class="row-name">'+esc(p.name)+'</div><div class="row-meta">'+(p.treatments||[]).length+' tratamientos</div></div>'+
        '<div style="text-align:right"><div style="font-size:12px;font-weight:600;color:var(--green)">Pagado: '+money(c.pagado)+'</div>'+
        (c.exigible>0?'<div style="font-size:11px;color:var(--red)">Exigible hoy: '+money(c.exigible)+'</div>':'')+
        (c.planPendiente>0?'<div style="font-size:10px;color:var(--text3)">Saldo del plan: '+money(c.planPendiente)+'</div>':'')+
        (c.aFavor>0?'<div style="font-size:11px;color:var(--green)">A favor: '+money(c.aFavor)+'</div>':'')+'</div>'+
        (c.exigible>0?'<button class="btn-sm" title="Enviar recordatorio de cobro por WhatsApp" aria-label="Cobrar por WhatsApp" style="font-size:11px;padding:4px 8px;margin-left:10px" data-action="balance.cobroWA" data-id="'+esc(p.id)+'">💬</button>':'')+
        '<button class="btn-sm" style="font-size:11px;padding:4px 10px;margin-left:'+(c.exigible>0?'6':'10')+'px" data-action="patients.select" data-id="'+esc(p.id)+'">Ver</button></div>';}).join('')+'</div>';
  }

  function openCloseMonth(){
    var now=localDate(new Date()),opts=[];
    for(var i=0;i<12;i++){var d=new Date(now.getFullYear(),now.getMonth()-i,1),m=d.getMonth(),y=d.getFullYear(),md=monthData(m,y);opts.push({m:m,y:y,label:MONTHS_FULL[m]+' '+y,inc:md.totalIngresos,eg:md.totalEgresos,util:md.utilidad,yaArchivado:!!closedMonth(m,y)});}
    openModal('<div class="modal-title">🗂 Cerrar y archivar mes</div>'+
      '<div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#1e40af"><strong>¿Cómo funciona?</strong> Al cerrar un mes se guarda un resumen con todos sus ingresos y egresos y esos movimientos se marcan como archivados (no se borran; la cartera pendiente no cambia). Puedes <b>reabrir</b> un mes con la ✕ de su resumen.</div>'+
      '<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Selecciona el mes a cerrar</div>'+
      '<div style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">'+opts.map(function(o){
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid '+(o.yaArchivado?'#86efac':'var(--border)')+';border-radius:10px;background:'+(o.yaArchivado?'#f0fdf4':'var(--card)')+'"><div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--text)">'+o.label+'</div>'+
          '<div style="font-size:11px;color:var(--text3);margin-top:2px">Ingresos: <span style="color:var(--green);font-weight:600">'+money(o.inc)+'</span> · Egresos: <span style="color:var(--red);font-weight:600">'+money(o.eg)+'</span> · Utilidad: <span style="font-weight:600;color:'+(o.util>=0?'var(--green)':'var(--red)')+'">'+fm(o.util)+'</span></div></div>'+
          (o.yaArchivado?'<span style="font-size:11px;font-weight:600;color:#15803d;background:#d1fae5;padding:3px 10px;border-radius:20px">✓ Archivado</span>':
            (o.inc>0||o.eg>0)?'<button class="btn-accent-sm" data-action="finance.closeMonth" data-m="'+o.m+'" data-y="'+o.y+'" style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">Cerrar mes</button>':
            '<span style="font-size:11px;color:var(--text3)">Sin movimientos</span>')+'</div>';}).join('')+'</div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button></div>');
    var mo=document.querySelector('.modal');if(mo)mo.style.width='580px';
  }
  function closeMonthUI(m,y){
    var label=MONTHS_FULL[m]+' '+y;
    if(closedMonth(m,y)){alert('⚠️ El mes de '+label+' ya fue cerrado y archivado anteriormente.\nLos datos están seguros en el "Resumen Anual".');return;}
    var d=monthData(m,y);
    if(!d.totalIngresos&&!d.totalEgresos){alert('No hay movimientos activos en este mes para cerrar.');return;}
    if(!confirm('¿Cerrar y archivar '+label+'?\n\n📊 Resumen:\n• Ingresos: '+money(d.totalIngresos)+'\n• Egresos: '+money(d.totalEgresos)+'\n• Utilidad: '+fm(d.utilidad)+'\n\n⚠️ Los contadores del mes actual se reiniciarán a cero.\n✅ Los registros NO se borran, se marcan como "archivados" y la cartera pendiente se mantiene intacta.\n↩️ Puedes reabrir el mes cuando quieras.'))return;
    var r=api.closeMonth(m,y);if(!r.ok)return;
    closeModal();
    alert('✅ ¡'+label+' cerrado y archivado correctamente!\n\nPuedes verlo en la sección "Resumen Anual".');
    showPage('estadisticas');
  }
  function viewArchive(id){
    var a=null;for(var i=0;i<archivosContables.length;i++){if(String(archivosContables[i].id)===String(id)){a=archivosContables[i];break;}}
    if(!a)return;
    var kp=function(l,v,c){return '<div class="kpi" style="padding:12px"><div class="kpi-label">'+l+'</div><div class="kpi-val" style="font-size:20px;color:'+c+'">'+v+'</div></div>';};
    var h='font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em';
    openModal('<div class="modal-title">📊 '+esc(a.label)+' — Detalle archivado</div><div class="grid3" style="margin-bottom:14px;gap:10px">'+kp('Ingresos',money(a.totalIngresos),'var(--green)')+kp('Egresos',money(a.totalEgresos),'var(--red)')+kp('Utilidad',fm(a.utilidad),a.utilidad>=0?'var(--green)':'var(--red)')+'</div>'+
      '<div style="'+h+'">Ingresos ('+(a.pagos||[]).length+')</div><div style="max-height:180px;overflow-y:auto;margin-bottom:12px">'+(a.pagos||[]).map(function(p){return '<div class="row-item"><div style="flex:1"><div class="row-name">'+esc(p.paciente)+'</div><div class="row-meta">'+esc(p.concepto)+' · '+fmtDate(p.fecha)+' · '+esc(p.tipo)+'</div></div><div class="pay-amount">+'+money(p.monto)+'</div></div>';}).join('')+'</div>'+
      '<div style="'+h+'">Egresos ('+(a.egresos||[]).length+')</div><div style="max-height:140px;overflow-y:auto">'+(a.egresos||[]).map(function(e){return '<div class="row-item"><div style="flex:1"><div class="row-name">'+esc(e.concepto)+'</div><div class="row-meta">'+esc(e.categoria)+' · '+fmtDate(e.fecha)+'</div></div><div class="pay-egreso">-'+money(e.monto)+'</div></div>';}).join('')+'</div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cerrar</button><button class="btn-primary" data-action="finance.downloadArchive" data-id="'+esc(a.id)+'" data-close="1">📥 Descargar informe</button></div>');
    var mo=document.querySelector('.modal');if(mo)mo.style.width='580px';
  }
  function reopenUI(id){
    var a=null;for(var i=0;i<archivosContables.length;i++){if(String(archivosContables[i].id)===String(id)){a=archivosContables[i];break;}}
    if(!a)return;
    var n=archivedCount(a);
    if(!confirm('¿Reabrir '+a.label+'?\n\nSe eliminará su resumen archivado y sus movimientos ('+n.pagos+' pago'+(n.pagos===1?'':'s')+' y '+n.egresos+' egreso'+(n.egresos===1?'':'s')+') volverán a contarse en las estadísticas.\n\nPodrás cerrarlo de nuevo cuando quieras.'))return;
    api.reopenMonth(a.id);showPage('estadisticas');
  }

  /* ── egresos ── */
  function openAddExpense(){
    openModal('<div class="modal-title">Registrar egreso</div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Concepto *</label><input id="f_ec" placeholder="Arriendo, materiales, servicios..."></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Categoría</label><select id="f_ecat">'+CATS.map(function(c){return '<option>'+c+'</option>';}).join('')+'</select></div><div class="form-group"><label>Monto ($) *</label><input id="f_em" type="number" min="0" step="0.01"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ef" type="date" value="'+today()+'"></div><div class="form-group"><label>Proveedor</label><input id="f_ep" placeholder="Nombre del proveedor"></div></div>'+
    '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="finance.saveExpense">Guardar</button></div>');
  }
  function saveExpense(){
    var r=checkExpense({concepto:v('f_ec'),categoria:v('f_ecat'),monto:v('f_em'),fecha:v('f_ef'),proveedor:v('f_ep')});
    if(!r.ok){alert(r.error);return;}
    if(!confirmWarnings(r.clean.fecha,'egreso'))return;
    api.addExpense(r.clean);closeModal();showPage('estadisticas');
  }
  function deleteExpense(id){
    var e=null;for(var i=0;i<egresos.length;i++){if(String(egresos[i].id)===String(id)){e=egresos[i];break;}}
    if(!e)return;
    if(!confirm('¿Eliminar este egreso?\n\n'+e.concepto+' — '+money(e.monto)+(e.archivado?'\n\n⚠️ Pertenece a un mes ya cerrado: su resumen archivado NO cambiará.':'')))return;
    api.removeExpense(id);showPage('estadisticas');
  }

  /* ── pagos del paciente ── */
  function badgeFact(py){
    var s='font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;';
    if(py.factPendiente)return '<span style="'+s+'background:#f0e7d8;color:#6b4a2f;border:1px solid #dcc39c">⚠ Sin facturar</span>';
    if(py.archivado)return '<span style="'+s+'background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0">📦 Archivado</span>';
    return '<span style="'+s+'background:#d1fae5;color:#065f46">✓ Facturado</span>';
  }
  function renderPayments(){
    var p=curPt,cta=resumenCuenta(p),txT=r2(cta.realizado+cta.porRealizar),paid=cta.pagado,deuda=cta.planPendiente;
    var pend=(p.payments||[]).filter(function(py){return py.factPendiente;});
    var small='padding:5px 8px;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600';
    return (pend.length?'<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:12px"><div style="font-size:24px">⚠️</div><div style="flex:1">'+
        '<div style="font-size:13px;font-weight:700;color:#6b4a2f">Tienes '+pend.length+' pago'+(pend.length>1?'s':'')+' sin facturar en el SRI</div>'+
        '<div style="font-size:11px;color:#8a6a4a;margin-top:2px">Total pendiente de facturar: <strong>'+money(sumM(pend,'amount'))+'</strong></div></div>'+
        '<a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank" rel="noopener" style="padding:8px 14px;background:#b98a4e;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap">🌐 Ir al SRI</a></div>':'')+
      '<div class="grid3" style="margin-bottom:14px"><div class="kpi"><div class="kpi-label">Total tratamientos</div><div class="kpi-val">'+money(txT)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Total pagado</div><div class="kpi-val" style="color:var(--green)">'+money(paid)+'</div></div>'+
        '<div class="kpi"><div class="kpi-label">Saldo del plan</div><div class="kpi-val" style="color:'+(deuda>0?'var(--red)':'var(--green)')+'">'+money(deuda)+'</div>'+subSaldoHtml(cta)+'</div></div>'+
      '<div class="card"><div class="action-row"><div class="card-title" style="margin:0">Historial de pagos</div><button class="btn-primary" data-action="finance.openAddPay">+ Registrar pago</button></div>'+
      ((p.payments||[]).length?(p.payments).slice().reverse().map(function(py){
        return '<div class="row-item" style="'+(py.archivado?'opacity:.55':'')+'"><div style="flex:1"><div style="display:flex;align-items:center;gap:6px"><div class="row-name">'+esc(py.concept)+'</div>'+badgeFact(py)+'</div>'+
          '<div class="row-meta">'+fmtDate(py.date)+' · '+esc(py.type)+'</div></div><div class="pay-amount">+'+money(py.amount)+'</div>'+
          '<button title="Imprimir comprobante" aria-label="Imprimir comprobante" style="'+small+';background:#dbeafe;color:#1e40af;margin-left:4px" data-action="finance.printReceipt" data-id="'+esc(py.id)+'">🖨️</button>'+
          (py.factPendiente?'<button title="Marcar como facturado" aria-label="Marcar como facturado" style="'+small+';background:#b98a4e;color:#fff" data-action="finance.markInvoiced" data-id="'+esc(py.id)+'">✓ Facturado</button>':'')+
          '<button class="del-btn" style="margin-left:4px" aria-label="Eliminar pago" data-action="finance.deletePayment" data-id="'+esc(py.id)+'">✕</button></div>';}).join(''):'<div style="font-size:13px;color:var(--text3)">Sin pagos registrados</div>')+
      '<div class="total-bar'+(deuda>0?' debt':'')+'"><div class="total-lbl'+(deuda>0?' debt':'')+'">'+(deuda>0?'Saldo pendiente del plan':(cta.aFavor>0?'Anticipo a favor':'Al día ✓'))+'</div><div class="total-val'+(deuda>0?' debt':'')+'">'+money(deuda>0?deuda:(cta.aFavor>0?cta.aFavor:paid))+'</div></div></div>';
  }
  function openAddPay(){
    if(!curPt)return;
    var chips=servicios.length?'<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">⚡ Seleccionar del catálogo</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+
      servicios.map(function(s){return '<button class="svc-chip" data-action="finance.pickService" data-nombre="'+esc(s.nombre)+'" data-precio="'+esc(s.precio)+'">'+esc(s.nombre)+' <span style="font-weight:700;color:var(--green)">'+money(s.precio)+'</span></button>';}).join('')+
      '</div><div style="border-top:1px solid var(--border);margin:12px 0 10px"></div></div>':'';
    openModal('<div class="modal-title">Registrar pago</div>'+chips+
      '<div class="form-row form-full"><div class="form-group"><label>Concepto</label><input id="f_pyc" placeholder="Abono, pago total, nombre del servicio..."></div></div>'+
      '<div class="form-row"><div class="form-group"><label>Monto ($) *</label><input id="f_pya" type="number" min="0" step="0.01"></div><div class="form-group"><label>Fecha</label><input id="f_pyd" type="date" value="'+today()+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Forma de pago</label><select id="f_pyt">'+TYPES.map(function(t){return '<option>'+t+'</option>';}).join('')+'</select></div></div>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="finance.savePay">Guardar pago</button></div>');
  }
  function pickService(nombre,precio){
    var c=document.getElementById('f_pyc'),a=document.getElementById('f_pya');
    if(c)c.value=nombre;
    if(a){var n=parseMonto(precio);a.value=isNaN(n)?'':n.toFixed(2);a.focus();}
  }
  function savePay(){
    var p=curPt;if(!p)return;
    var r=checkPayment({monto:v('f_pya'),fecha:v('f_pyd'),tipo:v('f_pyt'),concepto:v('f_pyc')});
    if(!r.ok){alert(r.error);return;}
    if(!confirmWarnings(r.clean.date,'pago'))return;
    var pago=api.addPayment(p.id,r.clean);
    closeModal();renderTab();api.invoiceReminder(pago.id);
  }
  function deletePayment(id){
    var p=curPt,f=p&&findPayment(id);if(!f||f.p!==p)return;
    var py=f.py;
    if(!confirm('¿Eliminar este pago?\n\n'+py.concept+' — '+money(py.amount)+' — '+fmtDate(py.date)+(py.archivado?'\n\n⚠️ Pertenece a un mes ya cerrado: su resumen archivado NO cambiará.':'')))return;
    api.removePayment(p.id,id);renderTab();
  }
  function markInvoicedUI(payId){if(api.markInvoiced(payId)){closeModal();if(curPt)renderTab();else showPage('dashboard');}}
  function invoiceReminder(ref){
    var f=findPayment(typeof ref==='object'&&ref?ref.id:ref);if(!f)return;
    var p=f.p,pago=f.py;
    openModal('<div class="modal-title">🧾 Recordatorio de factura</div>'+
    '<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start"><div style="font-size:28px">⚠️</div><div><div style="font-size:14px;font-weight:700;color:#6b4a2f;margin-bottom:4px">¡No olvides emitir la factura en el SRI!</div>'+
    '<div style="font-size:12px;color:#8a6a4a;line-height:1.6">Se registró un pago de <strong>'+money(pago.amount)+'</strong> de <strong>'+esc(p.name)+'</strong>. Recuerda emitir la factura electrónica en el portal del SRI.</div></div></div>'+
    '<div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px"><div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Datos para tu factura en el SRI</div><div class="grid2" style="gap:10px">'+
    '<div><div class="fl">Paciente / Cliente</div><div class="fv">'+esc(p.name)+'</div></div><div><div class="fl">Cédula / RUC</div><div class="fv">'+esc(p.cedula||'—')+'</div></div>'+
    '<div><div class="fl">Concepto</div><div class="fv">'+esc(pago.concept)+'</div></div><div><div class="fl">Forma de pago</div><div class="fv">'+esc(pago.type)+'</div></div>'+
    '<div><div class="fl">Monto</div><div class="fv" style="color:var(--green);font-weight:700">'+money(pago.amount)+'</div></div><div><div class="fl">Fecha</div><div class="fv">'+fmtDate(pago.date)+'</div></div></div>'+
    '<div style="margin-top:12px;padding:10px;background:#d1fae5;border-radius:8px;border:1px solid #6ee7b7"><div style="font-size:11px;font-weight:600;color:#065f46">✓ Servicio odontológico — IVA 0%</div><div style="font-size:11px;color:#047857">Art. 56 Ley de Régimen Tributario Interno del Ecuador</div></div></div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank" rel="noopener" style="flex:1;padding:10px;background:var(--accent);color:#fff;border-radius:9px;font-size:12px;font-weight:600;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">🌐 Abrir portal SRI</a>'+
    '<button data-action="finance.markInvoiced" data-id="'+esc(pago.id)+'" style="flex:1;padding:10px;background:var(--green);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer">✓ Ya la hice en el SRI</button></div>'+
    '<div class="modal-footer" style="padding-top:10px"><div style="font-size:11px;color:var(--text3)">Quedará en "Pendientes" hasta que la marques como realizada.</div><button class="btn-sec" data-action="app.closeModal">Cerrar — la haré luego</button></div>');
    var mo=document.querySelector('.modal');if(mo)mo.style.width='540px';
  }

  /* ═══ documentos (generan el HTML; abrir/descargar va aparte para poder probarlos) ═══ */
  function _receiptHtml(py,pt){
    const clinica=esc(document.getElementById('logoText').textContent);
    const prof=esc(document.getElementById('logoProfesional').textContent);
    const cta=resumenCuenta(pt),txTotal=r2(cta.realizado+cta.porRealizar),totalPagado=cta.pagado;
    const saldo=cta.planPendiente;
    const numComp=String(py.id).slice(-8).padStart(8,'0');
    const logoHtml=logoImg?`<img src="${esc(logoImg)}" style="height:60px;object-fit:contain">`
      :`<div style="width:60px;height:60px;background:#0ea5e9;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px">🦷</div>`;

    const html=`<!DOCTYPE html>
  <html lang="es"><head><meta charset="UTF-8">
  <title>Comprobante de Pago — ${clinica}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',Georgia,serif;color:#0f172a;background:#fff}
    .page{width:210mm;min-height:148mm;margin:0 auto;padding:18mm 18mm 14mm}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #0f172a;padding-bottom:12px;margin-bottom:14px}
    .clinic-name{font-size:20px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.05em}
    .clinic-sub{font-size:11px;color:#475569;margin-top:3px;line-height:1.6}
    .comp-box{text-align:right}
    .comp-title{font-size:18px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.08em}
    .comp-num{font-size:14px;font-weight:700;color:#0ea5e9;margin-top:4px;font-family:'Courier New',monospace}
    .comp-date{font-size:11px;color:#475569;margin-top:2px}
    .section{margin-bottom:14px}
    .section-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin-bottom:8px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px}
    .info-item label{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:2px}
    .info-item span{font-size:12px;color:#0f172a;font-weight:500;border-bottom:1px solid #e2e8f0;display:block;padding-bottom:3px}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px}
    th{background:#0f172a;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    td{padding:8px 10px;border-bottom:1px solid #e2e8f0}
    .total-section{background:#f8fafc;border:2px solid #0f172a;border-radius:4px;padding:10px 14px;margin-bottom:14px}
    .total-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;color:#475569}
    .total-final{display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f172a;border-top:1px solid #0f172a;padding-top:6px;margin-top:6px}
    .saldo-verde{color:#10b981;font-weight:700}
    .saldo-rojo{color:#ef4444;font-weight:700}
    .terms{background:#fafafa;border:1px solid #e2e8f0;border-radius:4px;padding:10px 14px;margin-bottom:14px}
    .terms-title{font-size:10px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
    .terms ul{list-style:none;padding-left:0}
    .terms li{font-size:10px;color:#475569;line-height:1.7;margin-bottom:2px}
    .terms li strong{color:#0f172a}
    .footer{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:16px;padding-top:12px;border-top:2px solid #0f172a}
    .sign-box{text-align:center}
    .sign-line{border-top:1px solid #0f172a;padding-top:5px;margin-top:36px}
    .sign-name{font-size:11px;font-weight:700;color:#0f172a}
    .sign-role{font-size:10px;color:#64748b}
    .stamp-area{text-align:center;font-size:10px;color:#94a3b8;border:1px dashed #cbd5e1;border-radius:4px;padding:12px;margin-top:8px}
    .watermark{color:#0ea5e9;font-weight:700;font-size:11px}
    @media print{
      body{margin:0}
      .page{padding:12mm 14mm 10mm}
      .no-print{display:none}
    }
  </style></head><body>
  <div style="text-align:right;padding:8px 18mm;background:#f8fafc;border-bottom:1px solid #e2e8f0" class="no-print">
    <button id="btnPrint" style="padding:8px 20px;background:#0f172a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin-right:8px">🖨️ Imprimir</button>
    <button id="btnClose" style="padding:8px 16px;background:#e2e8f0;color:#0f172a;border:none;border-radius:6px;font-size:13px;cursor:pointer">✕ Cerrar</button>
  </div>
  <div class="page">

    <!-- HEADER -->
    <div class="header">
      <div style="display:flex;align-items:center;gap:14px">
        ${logoHtml}
        <div>
          <div class="clinic-name">${clinica}</div>
          <div class="clinic-sub">
            ${prof}<br>
            ${clinicaRUC?'RUC: '+esc(clinicaRUC)+'<br>':''}
            ${clinicaDireccion?esc(clinicaDireccion)+'<br>':''}
            ${clinicaTelefono?'Tel: '+esc(clinicaTelefono):''}
          </div>
        </div>
      </div>
      <div class="comp-box">
        <div class="comp-title">Comprobante<br>de Pago</div>
        <div class="comp-date">Fecha de emisión: ${fmtDate(today())}</div>
      </div>
    </div>

    <!-- PACIENTE -->
    <div class="section">
      <div class="section-title">Datos del paciente</div>
      <div class="info-grid">
        <div class="info-item"><label>Nombre completo</label><span>${esc(pt.name)}</span></div>
        <div class="info-item"><label>Cédula de identidad</label><span>${esc(pt.cedula||'—')}</span></div>
        <div class="info-item"><label>Teléfono</label><span>${esc(pt.phone||'—')}</span></div>
        <div class="info-item"><label>Email</label><span>${esc(pt.email||'—')}</span></div>
      </div>
    </div>

    <!-- DETALLE DEL PAGO -->
    <div class="section">
      <div class="section-title">Detalle del pago</div>
      <table>
        <thead><tr>
          <th>Descripción / Concepto</th>
          <th style="text-align:center">Fecha pago</th>
          <th style="text-align:center">Forma de pago</th>
          <th style="text-align:right">Valor</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>${esc(py.concept)}</td>
            <td style="text-align:center">${fmtDate(py.date)}</td>
            <td style="text-align:center">${esc(py.type)}</td>
            <td style="text-align:right;font-weight:700;color:#10b981">${money(py.amount)}</td>
          </tr>
          ${pt.treatments.length?`
          <tr style="background:#f8fafc">
            <td colspan="3" style="font-size:11px;color:#64748b;font-style:italic">Tratamientos en curso: ${pt.treatments.filter(t=>t.status==='pendiente').map(t=>esc(t.name)).join(', ')||'Según historial clínico'}</td>
            <td></td>
          </tr>`:''}
        </tbody>
      </table>
    </div>

    <!-- RESUMEN FINANCIERO -->
    <div class="total-section">
      <div class="total-row"><span>Total del tratamiento:</span><span>${money(txTotal)}</span></div>
      <div class="total-row"><span>Total abonado (incluye este pago):</span><span style="color:#10b981">${money(totalPagado)}</span></div>
      <div class="total-final">
        <span>SALDO PENDIENTE:</span>
        <span class="${saldo>0?'saldo-rojo':'saldo-verde'}">${saldo>0?money(saldo):'AL DÍA ✓'}</span>
      </div>
    </div>

    <!-- TÉRMINOS Y CONDICIONES -->
    <div class="terms">
      <div class="terms-title">⚖️ Términos y Condiciones — Conserve este comprobante</div>
      <ul>
        <li style="margin-bottom:6px;padding-left:10px;border-left:2px solid #0ea5e9"><strong>No reembolso por inasistencia:</strong> Los pagos y abonos realizados <strong>no son reembolsables</strong> en caso de inasistencia injustificada a las citas programadas, cancelaciones con menos de 24 horas de anticipación o abandono del tratamiento por decisión del paciente.</li>
        <li style="margin-bottom:6px;padding-left:10px;border-left:2px solid #0ea5e9"><strong>Trabajos de laboratorio:</strong> Los tratamientos que requieren elaboración en laboratorio dental (coronas, prótesis, carillas, puentes, placas, entre otros) <strong>no admiten devolución</strong> una vez iniciado el proceso de fabricación, dado que son confeccionados a medida y personalizados para cada paciente.</li>
        <li style="margin-bottom:6px;padding-left:10px;border-left:2px solid #0ea5e9"><strong>Compromisos del paciente:</strong> El paciente se compromete a asistir puntualmente a las citas programadas y a seguir las indicaciones del profesional. El incumplimiento reiterado puede afectar el resultado del tratamiento, sin que ello genere derecho a reembolso.</li>
        <li style="margin-bottom:6px;padding-left:10px;border-left:2px solid #0ea5e9"><strong>Validez de abonos y presupuesto:</strong> Los abonos realizados tendrán una <strong>validez máxima de 30 días calendario</strong> a partir de la fecha de este comprobante. Transcurrido dicho plazo sin que el paciente haya continuado o completado el tratamiento, <strong>no procederá devolución alguna</strong> del dinero abonado. De igual forma, el presupuesto presentado tiene una <strong>vigencia de 30 días</strong>; pasado este tiempo los precios podrán variar sin previo aviso.</li>
        <li style="margin-bottom:6px;padding-left:10px;border-left:2px solid #0ea5e9"><strong>Abonos y planes de pago:</strong> Los abonos parciales se imputarán al tratamiento indicado en este comprobante. El saldo restante deberá cancelarse según el cronograma acordado con el profesional. El no pago del saldo pendiente puede suspender la continuación del tratamiento.</li>
        <li style="padding-left:10px;border-left:2px solid #0ea5e9"><strong>Confidencialidad:</strong> La información clínica y financiera del paciente es confidencial y está protegida bajo las normas de ética profesional y la legislación vigente del Ecuador.</li>
      </ul>
    </div>

    <!-- FIRMAS -->
    <div class="footer">
      <div class="sign-box">
        <div class="sign-line">
          <div class="sign-name">${esc(pt.name)}</div>
          <div class="sign-role">Firma del paciente · C.I. ${esc(pt.cedula||'—')}</div>
        </div>
      </div>
      <div class="sign-box">
        <div class="stamp-area">Sello del consultorio</div>
        <div class="sign-line" style="margin-top:6px">
          <div class="sign-name">${prof}</div>
          <div class="sign-role">Firma del profesional</div>
          ${clinicaRUC?`<div class="sign-role">RUC: ${esc(clinicaRUC)}</div>`:''}
        </div>
      </div>
    </div>

    <div style="text-align:center;margin-top:12px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px">
  <span class="watermark">DOCUMENTO VÁLIDO SOLO CON FIRMA Y SELLO DEL PROFESIONAL</span><br>
  Comprobante de Pago · Emitido por ${clinica} · ${fmtDate(today())} · Generado por OdontoApp
  </div>
  </div>
  <script>document.getElementById('btnPrint').addEventListener('click',function(){window.print();});document.getElementById('btnClose').addEventListener('click',function(){window.close();});</script>
  </bo${'dy></html>'}`;

    return html;
  }
  function _monthlyReportHtml(titulo,pagos,egresosD,totalInc,totalEg,utilidad,pacientes,fechaCierre){
    const clinicaNombre=document.getElementById('logoText').textContent;
    const profesional=document.getElementById('logoProfesional').textContent;
    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe ${esc(titulo)}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#0f172a;font-size:12px}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}.sub{font-size:13px;color:#64748b;margin-bottom:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0f172a}
    .kpi-row{display:flex;gap:16px;margin-bottom:24px}.kpi{flex:1;padding:14px;border:1px solid #e2e8f0;border-radius:10px}
    .kpi-label{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
    .kpi-val{font-size:22px;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}
    td{padding:8px 12px;border-bottom:1px solid #e2e8f0}
    .total-row td{font-weight:700;background:#f8fafc}
    .green{color:#10b981}.red{color:#ef4444}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
    @media print{body{padding:10px}}</style></head><body>
    <div class="header"><div><h1>${esc(clinicaNombre)}</h1><div class="sub">${esc(profesional)} · RUC: ${esc(clinicaRUC||'—')}</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:700">INFORME MENSUAL</div><div style="font-size:14px;color:#64748b;margin-top:4px">${esc(titulo)}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">Cerrado: ${fmtDate(fechaCierre)}</div></div></div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-val green">${money(totalInc)}</div></div>
      <div class="kpi"><div class="kpi-label">Egresos</div><div class="kpi-val red">${money(totalEg)}</div></div>
      <div class="kpi"><div class="kpi-label">Utilidad</div><div class="kpi-val" style="color:${utilidad>=0?'#10b981':'#ef4444'}">${utilidad>=0?'+':''}${fm(utilidad)}</div></div>
      <div class="kpi"><div class="kpi-label">Pacientes</div><div class="kpi-val" style="color:#0ea5e9">${pacientes}</div></div>
    </div>
    <div style="font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">💰 Ingresos (${pagos.length})</div>
    <table><thead><tr><th>Fecha</th><th>Paciente</th><th>Concepto</th><th>Forma de pago</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${pagos.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).map(p=>`<tr><td>${fmtDate(p.fecha)}</td><td>${esc(p.paciente)}</td><td>${esc(p.concepto)}</td><td>${esc(p.tipo)}</td><td style="text-align:right" class="green">${money(p.monto)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL:</td><td style="text-align:right" class="green">${money(totalInc)}</td></tr></tbody></table>
    <div style="font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">📤 Egresos (${egresosD.length})</div>
    <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Proveedor</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${egresosD.slice().sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).map(e=>`<tr><td>${fmtDate(e.fecha)}</td><td>${esc(e.concepto)}</td><td>${esc(e.categoria)}</td><td>${esc(e.proveedor||'—')}</td><td style="text-align:right" class="red">${money(e.monto)}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL:</td><td style="text-align:right" class="red">${money(totalEg)}</td></tr></tbody></table>
   <div class="footer">Informe generado por OdontoApp · ${esc(clinicaNombre)} · ${esc(titulo)}</div></bo${'dy></html>'}`;
    return html;
  }
  function _annualReportHtml(anio){
    const arch=archivosContables.filter(a=>a.anio===anio).sort((a,b)=>a.mes-b.mes);
    const clinicaNombre=document.getElementById('logoText').textContent;
    const profesional=document.getElementById('logoProfesional').textContent;
    const totalInc=arch.reduce((s,a)=>addM(s,a.totalIngresos),0);
    const totalEg=arch.reduce((s,a)=>addM(s,a.totalEgresos),0);
    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe Anual ${anio}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;color:#0f172a;font-size:12px}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}.sub{font-size:13px;color:#64748b;margin-bottom:24px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0f172a}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#f1f5f9;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}
    td{padding:9px 12px;border-bottom:1px solid #e2e8f0}
    .total{font-weight:700;background:#f8fafc}.grand{font-weight:700;background:#dbeafe}
    .green{color:#10b981}.red{color:#ef4444}.footer{margin-top:24px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
    @media print{body{padding:16px}}</style></head><body>
    <div class="header"><div><h1>${esc(clinicaNombre)}</h1><div class="sub">${esc(profesional)} · Informe Anual ${anio}</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:700">RESUMEN ANUAL ${anio}</div><div style="font-size:12px;color:#64748b;margin-top:4px">Generado: ${new Date().toLocaleString('es-EC')}</div></div></div>
    <table><thead><tr><th>Mes</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Egresos</th><th style="text-align:right">Utilidad</th><th style="text-align:right">Pacientes</th></tr></thead>
    <tbody>
    ${arch.map(a=>`<tr><td>${esc(a.label)}</td><td style="text-align:right" class="green">${money(a.totalIngresos)}</td><td style="text-align:right" class="red">${money(a.totalEgresos)}</td><td style="text-align:right;font-weight:600;color:${a.utilidad>=0?'#10b981':'#ef4444'}">${a.utilidad>=0?'+':''}${fm(a.utilidad)}</td><td style="text-align:right">${a.pacientesAtendidos}</td></tr>`).join('')}
    <tr class="grand"><td>TOTAL AÑO ${anio}</td><td style="text-align:right" class="green">${money(totalInc)}</td><td style="text-align:right" class="red">${money(totalEg)}</td><td style="text-align:right;font-weight:700;color:${totalInc-totalEg>=0?'#10b981':'#ef4444'}">${totalInc-totalEg>=0?'+':''}${money(subM(totalInc,totalEg))}</td><td></td></tr>
    </tbody></table>
    <div class="footer">Informe generado por OdontoApp · ${esc(clinicaNombre)} · Año ${anio}</div></bo${'dy></html>'}`;
    return html;
  }
  function safeName(s){return String(s||'').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_');}
  function downloadHtml(filename,html){
    var blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  }
  function printReceipt(payId){
    var f=findPayment(payId);if(!f)return;
    var w=safeOpen('','_blank','width=900,height=780');
    w.document.write(_receiptHtml(f.py,f.p));w.document.close();
  }
  function downloadMonthly(){
    var now=localDate(new Date()),m=now.getMonth(),y=now.getFullYear(),d=monthData(m,y,{includeArchived:true}),t=MONTHS_FULL[m]+' '+y;   // informe del mes completo (incluye lo ya archivado)
    downloadHtml('Informe_'+safeName(t)+'.html',_monthlyReportHtml(t,d.pagos,d.egresos,d.totalIngresos,d.totalEgresos,d.utilidad,d.pacientes,today()));
  }
  function downloadArchive(id,close){
    var a=null;for(var i=0;i<archivosContables.length;i++){if(String(archivosContables[i].id)===String(id)){a=archivosContables[i];break;}}
    if(!a)return;
    downloadHtml('Informe_'+safeName(a.label)+'.html',_monthlyReportHtml(a.label,a.pagos||[],a.egresos||[],a.totalIngresos,a.totalEgresos,a.utilidad,a.pacientesAtendidos,a.fechaCierre));
    if(close)closeModal();
  }
  function downloadAnnual(anio){
    downloadHtml('Informe_Anual_'+anio+'_'+safeName(document.getElementById('logoText').textContent)+'.html',_annualReportHtml(anio));
  }

  var api={TYPES:TYPES,CATS:CATS,fm:fm,sumM:sumM,ym:ym,validDate:validDate,closedMonth:closedMonth,findPayment:findPayment,
    monthData:monthData,yearLive:yearLive,dataIssues:dataIssues,checkPayment:checkPayment,checkExpense:checkExpense,warningsFor:warningsFor,
    addPayment:addPayment,removePayment:removePayment,markInvoiced:markInvoiced,addExpense:addExpense,removeExpense:removeExpense,
    closeMonth:closeMonth,reopenMonth:reopenMonth,archivedCount:archivedCount,
    renderStats:renderStats,renderPayments:renderPayments,openAddPay:openAddPay,pickService:pickService,savePay:savePay,deletePayment:deletePayment,markInvoicedUI:markInvoicedUI,invoiceReminder:invoiceReminder,
    openAddExpense:openAddExpense,saveExpense:saveExpense,deleteExpense:deleteExpense,openCloseMonth:openCloseMonth,closeMonthUI:closeMonthUI,viewArchive:viewArchive,reopenUI:reopenUI,
    printReceipt:printReceipt,downloadMonthly:downloadMonthly,downloadArchive:downloadArchive,downloadAnnual:downloadAnnual,
    receiptHtml:_receiptHtml,monthlyReportHtml:_monthlyReportHtml,annualReportHtml:_annualReportHtml};
  return api;
})();

/* ═══ Acciones del módulo (reemplazan los onclick del HTML) ═══ */
App.actions({
  'finance.openAddPay':function(){Finance.openAddPay();},
  'finance.pickService':function(c){Finance.pickService(c.data.nombre,c.data.precio);},
  'finance.savePay':function(){Finance.savePay();},
  'finance.deletePayment':function(c){Finance.deletePayment(c.id);},
  'finance.markInvoiced':function(c){Finance.markInvoicedUI(c.id);},
  'finance.printReceipt':function(c){Finance.printReceipt(c.id);},
  'finance.openAddExpense':function(){Finance.openAddExpense();},
  'finance.saveExpense':function(){Finance.saveExpense();},
  'finance.deleteExpense':function(c){Finance.deleteExpense(c.id);},
  'finance.openCloseMonth':function(){Finance.openCloseMonth();},
  'finance.closeMonth':function(c){Finance.closeMonthUI(Number(c.data.m),Number(c.data.y));},
  'finance.viewArchive':function(c){Finance.viewArchive(c.id);},
  'finance.downloadArchive':function(c){Finance.downloadArchive(c.id,c.data.close==='1');},
  'finance.reopenMonth':function(c){Finance.reopenUI(c.id);},
  'finance.downloadMonthly':function(){Finance.downloadMonthly();},
  'finance.downloadAnnual':function(c){Finance.downloadAnnual(Number(c.data.y));},
  'balance.cobroWA':function(c){enviarCobroWA(c.id);}   // puente: el cobro por WhatsApp vive en balance.js (módulo aún no migrado)
});

/* ═══ Nombres antiguos (los usan módulos que todavía no se migraron). Llaman a Finance.* en el momento de usarse,
       así las auditorías del PIN que envuelven Finance.* funcionan por cualquiera de los dos caminos. ═══ */
(function(){
  var L={renderEstadisticas:'renderStats',renderPagos:'renderPayments',openAddPay:'openAddPay',savePay:'savePay',seleccionarServicioPay:'pickService',delPay:'deletePayment',
    marcarFacturada:'markInvoicedUI',recordatorioFactura:'invoiceReminder',imprimirComprobante:'printReceipt',openAddEgreso:'openAddExpense',saveEgreso:'saveExpense',delEgreso:'deleteExpense',
    abrirResetMes:'openCloseMonth',cerrarMes:'closeMonthUI',verArchivoMes:'viewArchive',eliminarArchivoMes:'reopenUI',descargarArchivoMes:'downloadArchive',
    descargarInformeAnual:'downloadAnnual',descargarInformeMensual:'downloadMonthly'};
  Object.keys(L).forEach(function(name){window[name]=function(){return Finance[L[name]].apply(Finance,arguments);};});
})();
