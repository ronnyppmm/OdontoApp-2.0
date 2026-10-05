/* ═══ SALDOS Y COBRANZA — una sola fuente de verdad para "cuánto debe" cada paciente ═══
   Reglas (se usan en TODAS las pantallas):
   • Realizado    = tratamientos con estado 'realizado'      → trabajo ya hecho
   • Por realizar = tratamientos pendientes
   • Pagado       = todos los pagos (incluye los archivados por cierre de mes)
   • Exigible hoy = Realizado − Pagado         (si es negativo → anticipo / saldo a favor)
   • Saldo del plan = Realizado + Por realizar − Pagado   (lo que falta cobrar si se completa todo)
   • Presupuesto aprobado = suma de presupuestos 'aprobado' (los borradores y rechazados NO cuentan)
   Los presupuestos y los tratamientos nunca se suman entre sí (evita contar dos veces lo mismo). */

function r2(n){                       // redondeo a centavos exacto (1.005 → 1.01, 0.1+0.2 → 0.3), mitad hacia arriba
  n=Number(n);if(!isFinite(n))return 0;
  var x=Math.abs(n);if(x<1e-9)return 0;
  var r=Math.round(Number((x*100).toPrecision(15)))/100;return n<0?-r:r;
}
function addM(a,b){return r2((Number(a)||0)+(Number(b)||0));}
function subM(a,b){return r2((Number(a)||0)-(Number(b)||0));}
function mulM(precio,cant){return r2((Number(precio)||0)*(Number(cant)||0));}
var MONTO_MAX=9999999.99;
// Texto de un campo → monto con 2 decimales, o NaN si no es válido (vacío, negativo, letras, absurdamente grande)
function parseMonto(raw){
  if(raw===null||raw===undefined)return NaN;
  var s=String(raw).trim().replace(/[$\s]/g,'');
  if(!s)return NaN;
  if(/^\d{1,3}(\.\d{3})+,\d+$/.test(s))s=s.replace(/\./g,'').replace(',','.');      // 1.234,56
  else if(/^\d+,\d{1,2}$/.test(s))s=s.replace(',','.');                                // 12,50
  else if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s))s=s.replace(/,/g,'');                 // 1,234.56
  if(!/^\d+(\.\d+)?$/.test(s))return NaN;
  var n=Number(s);if(!isFinite(n)||n<0||n>MONTO_MAX)return NaN;
  return r2(n);
}
function money(n){return '$'+r2(n).toFixed(2);}
function sumaPor(lista,f){return r2((lista||[]).reduce(function(s,x){return s+(Number(f(x))||0);},0));}

function resumenCuenta(p){
  p=p||{};
  var tx=p.treatments||[],pays=p.payments||[],pres=p.presupuestos||[];
  var realizado=sumaPor(tx.filter(function(t){return t.status==='realizado';}),function(t){return t.cost;});
  var porRealizar=sumaPor(tx.filter(function(t){return t.status!=='realizado';}),function(t){return t.cost;});
  var pagado=sumaPor(pays,function(x){return x.amount;});
  var aprobado=sumaPor(pres.filter(function(x){return x.estado==='aprobado';}),function(x){return x.total;});
  var borrador=sumaPor(pres.filter(function(x){return x.estado==='borrador';}),function(x){return x.total;});
  var saldo=r2(realizado-pagado),saldoPlan=r2(realizado+porRealizar-pagado);
  var ultimo=pays.reduce(function(m,x){return x.date&&x.date>m?x.date:m;},'');
  return {
    realizado:realizado,porRealizar:porRealizar,pagado:pagado,
    exigible:Math.max(0,saldo),aFavor:Math.max(0,-saldo),
    planPendiente:Math.max(0,saldoPlan),
    aprobado:aprobado,borrador:borrador,aprobadoPendiente:Math.max(0,r2(aprobado-pagado)),
    ultimoPago:ultimo
  };
}

function carteraTotal(lista){
  var t={plan:0,exigible:0,aFavor:0,conSaldo:0};
  (lista||[]).forEach(function(p){
    var c=resumenCuenta(p);
    t.plan=r2(t.plan+c.planPendiente);t.exigible=r2(t.exigible+c.exigible);t.aFavor=r2(t.aFavor+c.aFavor);
    if(c.exigible>0)t.conSaldo++;
  });
  return t;
}

// Texto corto para mostrar bajo el saldo: "Exigible hoy: $70.00" o "A favor: $20.00"
function subSaldoHtml(c){
  if(c.aFavor>0)return '<div class="kpi-sub" style="color:var(--green)">Anticipo a favor: '+money(c.aFavor)+'</div>';
  if(c.exigible>0)return '<div class="kpi-sub">Exigible hoy (trabajo realizado): '+money(c.exigible)+'</div>';
  return '';
}

function telefonoWA(phone){
  var num=String(phone||'').replace(/[\s\-\(\)]/g,'');
  if(!num)return '';
  if(num.indexOf('0')===0)num='593'+num.slice(1);
  else if(num.indexOf('+')!==0&&num.indexOf('593')!==0)num='593'+num;
  return num.replace('+','');
}

function mensajeCobro(p,c){
  var clinica=(document.getElementById('logoText')||{}).textContent||'nuestra clínica';
  return 'Hola '+p.name+', le saludamos de '+clinica+'. Le recordamos que tiene un saldo pendiente de '+money(c.exigible)+
    ' por los tratamientos realizados. Puede cancelarlo en efectivo o por transferencia. ¡Gracias por su confianza!';
}

function enviarCobroWA(id){
  var p=patients.find(function(x){return x.id===id;});if(!p)return;
  var c=resumenCuenta(p);
  if(c.exigible<=0){alert(p.name+' no tiene saldo exigible.');return;}
  var num=telefonoWA(p.phone);
  if(!num){alert(p.name+' no tiene número de teléfono registrado.\nAgrégalo en su ficha para enviar WhatsApp.');return;}
  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(mensajeCobro(p,c)),'_blank');
}
