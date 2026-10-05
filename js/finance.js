/* ═══ FINANZAS — pagos, egresos, facturas, cierre de mes, estadísticas ═══ */
// ═══ ESTADÍSTICAS ═══
function renderEstadisticas(){
  const now=localDate(new Date());
  const curY=now.getFullYear();
  const months=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const m=d.getMonth(),y=d.getFullYear();
    const inc=patients.reduce((s,p)=>s+p.payments.filter(py=>{const pd=new Date(py.date+'T12:00');return pd.getMonth()===m&&pd.getFullYear()===y&&!py.archivado;}).reduce((a,py)=>addM(a,py.amount),0),0);
    const eg=egresos.filter(e=>{const ed=new Date(e.fecha+'T12:00');return ed.getMonth()===m&&ed.getFullYear()===y&&!e.archivado;}).reduce((s,e)=>addM(s,e.monto),0);
    months.push({label:MONTHS[m],inc,eg,util:inc-eg});
  }
  const maxVal=Math.max(...months.map(m=>Math.max(m.inc,m.eg)),1);
  const cartera=carteraTotal(patients),totalDebt=cartera.plan;
  // Current month totals — only non-archived (reset when month is closed)
  const curM=now.getMonth(),curYr=now.getFullYear();
  const mInc=patients.reduce((s,p)=>s+p.payments.filter(py=>{const d=new Date(py.date+'T12:00');return d.getMonth()===curM&&d.getFullYear()===curYr&&!py.archivado;}).reduce((a,py)=>addM(a,py.amount),0),0);
  const mEg=egresos.filter(e=>{const d=new Date(e.fecha+'T12:00');return d.getMonth()===curM&&d.getFullYear()===curYr&&!e.archivado;}).reduce((s,e)=>addM(s,e.monto),0);
  const curMonthName=MONTHS_FULL[now.getMonth()];

  // Build yearly archive summary for current year
  const archYear=archivosContables.filter(a=>a.anio===curY).sort((a,b)=>a.mes-b.mes);
  const archTotalInc=archYear.reduce((s,a)=>addM(s,a.totalIngresos),0);
  const archTotalEg=archYear.reduce((s,a)=>addM(s,a.totalEgresos),0);

  // Live months not yet archived
  const liveInc=patients.reduce((s,p)=>s+p.payments.filter(py=>{const d=new Date(py.date+'T12:00');return d.getFullYear()===curY&&!py.archivado;}).reduce((a,py)=>addM(a,py.amount),0),0);
  const liveEg=egresos.filter(e=>new Date(e.fecha+'T12:00').getFullYear()===curY&&!e.archivado).reduce((s,e)=>addM(s,e.monto),0);
  const yearTotalInc=archTotalInc+liveInc;
  const yearTotalEg=archTotalEg+liveEg;

  return`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="font-size:16px;font-weight:700;color:var(--text)">Estadísticas financieras</div>
    <div style="display:flex;gap:8px">
      <button class="btn-sm" onclick="descargarInformeMensual()" style="background:var(--green);color:#fff;border-color:var(--green)">📥 Informe ${curMonthName}</button>
      <button class="btn-sm" onclick="abrirResetMes()" style="color:var(--red);border-color:#fca5a5">🗂 Cerrar mes</button>
    </div>
  </div>

  <div class="grid4" style="margin-bottom:16px">
    <div class="kpi"><div class="kpi-label">Ingresos ${curMonthName}</div><div class="kpi-val" style="color:var(--green)">$${mInc.toFixed(2)}</div><div class="kpi-sub">Se reinicia al cerrar mes</div></div>
    <div class="kpi"><div class="kpi-label">Egresos ${curMonthName}</div><div class="kpi-val" style="color:var(--red)">$${mEg.toFixed(2)}</div><div class="kpi-sub">Se reinicia al cerrar mes</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad ${curMonthName}</div><div class="kpi-val" style="color:${mInc-mEg>=0?'var(--green)':'var(--red)'}">$${(mInc-mEg).toFixed(2)}</div><div class="kpi-sub">Se reinicia al cerrar mes</div></div>
    <div class="kpi"><div class="kpi-label">Cartera pendiente</div><div class="kpi-val" style="color:var(--amber)">$${totalDebt.toFixed(2)}</div><div class="kpi-sub">Saldo del plan · Exigible hoy: ${money(cartera.exigible)} (${cartera.conSaldo} paciente${cartera.conSaldo===1?'':'s'})</div></div>
  </div>

  ${archYear.length>0?`
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="card-title" style="margin:0">📊 Resumen anual ${curY} — meses cerrados</div>
      <button class="btn-sm" onclick="descargarInformeAnual(${curY})" style="background:var(--accent);color:#fff;border-color:var(--accent)">📥 Informe anual</button>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:var(--bg)">
            <th style="padding:8px 12px;text-align:left;font-weight:700;color:var(--text2);font-size:10px;text-transform:uppercase">Mes</th>
            <th style="padding:8px 12px;text-align:right;font-weight:700;color:var(--green);font-size:10px;text-transform:uppercase">Ingresos</th>
            <th style="padding:8px 12px;text-align:right;font-weight:700;color:var(--red);font-size:10px;text-transform:uppercase">Egresos</th>
            <th style="padding:8px 12px;text-align:right;font-weight:700;color:var(--text2);font-size:10px;text-transform:uppercase">Utilidad</th>
            <th style="padding:8px 12px;text-align:center;font-weight:700;color:var(--text2);font-size:10px;text-transform:uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${archYear.map(a=>`
            <tr style="border-top:1px solid var(--border)">
              <td style="padding:10px 12px;font-weight:600;color:var(--text)">${a.label}</td>
              <td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:600">$${a.totalIngresos.toFixed(2)}</td>
              <td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:600">$${a.totalEgresos.toFixed(2)}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;color:${a.utilidad>=0?'var(--green)':'var(--red)'}">${a.utilidad>=0?'+':''}$${a.utilidad.toFixed(2)}</td>
              <td style="padding:10px 12px;text-align:center;display:flex;gap:6px;justify-content:center">
                <button class="btn-sm" style="font-size:10px;padding:3px 8px" onclick="verArchivoMes(${a.id})">👁 Ver</button>
                <button class="btn-sm" style="font-size:10px;padding:3px 8px;color:var(--green)" onclick="descargarArchivoMes(${a.id})">📥</button>
                <button class="del-btn" style="font-size:10px;padding:3px 8px" onclick="eliminarArchivoMes(${a.id})">✕</button>
              </td>
            </tr>`).join('')}
          <tr style="border-top:2px solid var(--text);background:var(--bg)">
            <td style="padding:10px 12px;font-weight:700;color:var(--text)">TOTAL ARCHIVADO</td>
            <td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:700">$${archTotalInc.toFixed(2)}</td>
            <td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:700">$${archTotalEg.toFixed(2)}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:${archTotalInc-archTotalEg>=0?'var(--green)':'var(--red)'}">$${(archTotalInc-archTotalEg).toFixed(2)}</td>
            <td></td>
          </tr>
          <tr style="background:#dbeafe">
            <td style="padding:10px 12px;font-weight:700;color:#1e40af">TOTAL AÑO ${curY}</td>
            <td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:700">$${yearTotalInc.toFixed(2)}</td>
            <td style="padding:10px 12px;text-align:right;color:var(--red);font-weight:700">$${yearTotalEg.toFixed(2)}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:${yearTotalInc-yearTotalEg>=0?'var(--green)':'var(--red)'}">$${(yearTotalInc-yearTotalEg).toFixed(2)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`:''}

  <div class="grid2">
    <div class="card">
      <div class="action-row"><div class="card-title" style="margin:0">Egresos registrados</div><button class="btn-primary" onclick="openAddEgreso()">+ Agregar egreso</button></div>
      ${egresos.filter(e=>!e.archivado).slice().reverse().slice(0,10).map(e=>`
        <div class="row-item">
          <div style="flex:1"><div class="row-name">${esc(e.concepto)}</div><div class="row-meta">${esc(e.categoria)} · ${fmtDate(e.fecha)}${e.proveedor?' · '+e.proveedor:''}</div></div>
          <div class="pay-egreso">-${money(e.monto)}</div>
          <button class="del-btn" style="margin-left:8px" onclick="delEgreso(${e.id})">✕</button>
        </div>`).join('')}
      ${egresos.length===0?'<div style="font-size:13px;color:var(--text3)">Sin egresos registrados</div>':''}
    </div>
    <div class="card">
      <div class="card-title">Egresos por categoría</div>
      ${(() => {
        const cats={};
        egresos.filter(e=>!e.archivado).forEach(e=>cats[e.categoria]=addM(cats[e.categoria]||0,e.monto));
        const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
        return sorted.length?sorted.map(([cat,total])=>`
          <div class="row-item">
            <div style="flex:1"><div class="row-name">${cat}</div></div>
            <div style="font-size:14px;font-weight:700;color:var(--red)">${money(total)}</div>
          </div>`).join(''):'<div style="font-size:13px;color:var(--text3)">Sin datos</div>';
      })()}
    </div>
  </div>

  <div class="card">
    <div class="card-title">Resumen por paciente</div>
    ${patients.map(p=>({p,c:resumenCuenta(p)})).sort((a,b)=>b.c.exigible-a.c.exigible||b.c.planPendiente-a.c.planPendiente).map(({p,c})=>{
      const paid=c.pagado; // incluye archivados — correcto para cartera
      return`<div class="row-item">
        <div class="sb-av" style="background:${ptColor(p.id)};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initials(p.name)}</div>
        <div style="flex:1"><div class="row-name">${esc(p.name)}</div><div class="row-meta">${p.treatments.length} tratamientos</div></div>
        <div style="text-align:right">
          <div style="font-size:12px;font-weight:600;color:var(--green)">Pagado: ${money(paid)}</div>
          ${c.exigible>0?`<div style="font-size:11px;color:var(--red)">Exigible hoy: ${money(c.exigible)}</div>`:''}
          ${c.planPendiente>0?`<div style="font-size:10px;color:var(--text3)">Saldo del plan: ${money(c.planPendiente)}</div>`:''}
          ${c.aFavor>0?`<div style="font-size:11px;color:var(--green)">A favor: ${money(c.aFavor)}</div>`:''}
        </div>
        ${c.exigible>0?`<button class="btn-sm" title="Enviar recordatorio de cobro por WhatsApp" aria-label="Cobrar por WhatsApp" style="font-size:11px;padding:4px 8px;margin-left:10px" onclick="enviarCobroWA(${p.id})">💬</button>`:''}
        <button class="btn-sm" style="font-size:11px;padding:4px 10px;margin-left:${c.exigible>0?'6':'10'}px" onclick="selectPt(${p.id})">Ver</button>
      </div>`;
    }).join('')}
  </div>`;
}

function abrirResetMes(){
  const now=localDate(new Date());
  const opts=[];
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const m=d.getMonth(),y=d.getFullYear();
    const yaArchivado=archivosContables.some(a=>a.mes===m&&a.anio===y);
    const inc=patients.reduce((s,p)=>s+p.payments.filter(py=>{const pd=new Date(py.date+'T12:00');return pd.getMonth()===m&&pd.getFullYear()===y&&!py.archivado;}).reduce((a,py)=>addM(a,py.amount),0),0);
    const eg=egresos.filter(e=>{const ed=new Date(e.fecha+'T12:00');return ed.getMonth()===m&&ed.getFullYear()===y&&!e.archivado;}).reduce((s,e)=>addM(s,e.monto),0);
    opts.push({m,y,label:`${MONTHS_FULL[m]} ${y}`,inc,eg,yaArchivado});
  }
  openModal(`<div class="modal-title">🗂 Cerrar y archivar mes</div>
  <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">
    <strong>¿Cómo funciona?</strong> Al cerrar un mes, se guarda un snapshot con todos los ingresos y egresos de ese período. Luego puedes eliminar esos datos del sistema activo sin perder el historial. Al final del año verás el resumen completo mes a mes.
  </div>
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Selecciona el mes a cerrar</div>
  <div style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
    ${opts.map(o=>`
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid ${o.yaArchivado?'#86efac':'var(--border)'};border-radius:10px;background:${o.yaArchivado?'#f0fdf4':'var(--bg)'}">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${o.label}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">
            Ingresos: <span style="color:var(--green);font-weight:600">$${o.inc.toFixed(2)}</span> ·
            Egresos: <span style="color:var(--red);font-weight:600">$${o.eg.toFixed(2)}</span> ·
            Utilidad: <span style="font-weight:600;color:${o.inc-o.eg>=0?'var(--green)':'var(--red)'}">$${(o.inc-o.eg).toFixed(2)}</span>
          </div>
        </div>
        ${o.yaArchivado
          ?`<span style="font-size:11px;font-weight:600;color:#15803d;background:#d1fae5;padding:3px 10px;border-radius:20px">✓ Archivado</span>`
          :(o.inc>0||o.eg>0)
            ?`<button onclick="cerrarMes(${o.m},${o.y})" style="padding:7px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">🗂 Cerrar mes</button>`
            :`<span style="font-size:11px;color:var(--text3)">Sin movimientos</span>`
        }
      </div>`).join('')}
  </div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cerrar</button></div>`);
  document.querySelector('.modal').style.width='580px';
}

function cerrarMes(m, y) {
  const mesNombre = `${MONTHS_FULL[m]} ${y}`;
  
  // 1. SEGURIDAD: Verificar si el mes YA fue archivado (Evita duplicados y corrupción)
  const yaArchivado = archivosContables.some(a => a.mes === m && a.anio === y);
  if (yaArchivado) {
    alert(`⚠️ El mes de ${mesNombre} ya fue cerrado y archivado anteriormente.\nLos datos están seguros en el "Resumen Anual".`);
    return;
  }

  const pagos = [];
  patients.forEach(p => {
    p.payments.filter(py => {
      const d = new Date(py.date + 'T12:00');
      return d.getMonth() === m && d.getFullYear() === y && !py.archivado;
    }).forEach(py => pagos.push({
      paciente: p.name,
      cedula: p.cedula,
      concepto: py.concept,
      monto: py.amount,
      fecha: py.date,
      tipo: py.type,
      ptId: p.id,
      pagoId: py.id
    }));
  });

  const egresosM = egresos.filter(e => {
    const d = new Date(e.fecha + 'T12:00');
    return d.getMonth() === m && d.getFullYear() === y && !e.archivado;
  });

  const totalIngresos = pagos.reduce((s,p)=>addM(s,p.monto), 0);
  const totalEgresos = egresosM.reduce((s,e)=>addM(s,e.monto), 0);

  if (!totalIngresos && !totalEgresos) {
    alert('No hay movimientos activos en este mes para cerrar.');
    return;
  }

  if (!confirm(`¿Cerrar y archivar ${mesNombre}?\n\n📊 Resumen:\n• Ingresos: $${totalIngresos.toFixed(2)}\n• Egresos: $${totalEgresos.toFixed(2)}\n• Utilidad: $${(totalIngresos - totalEgresos).toFixed(2)}\n\n⚠️ Los contadores del mes actual se reiniciarán a cero.\n✅ Los registros NO se borran, se marcan como "archivados" y la cartera pendiente se mantiene intacta.`)) return;

  // 2. GUARDAR SNAPSHOT DEL HISTÓRICO
  archivosContables.push({
    id:uid(),
    mes: m,
    anio: y,
    label: mesNombre,
    fechaCierre: today(),
    pagos: pagos,
    egresos: egresosM,
    totalIngresos: totalIngresos,
    totalEgresos: totalEgresos,
    utilidad: totalIngresos - totalEgresos,
    pacientesAtendidos: [...new Set(pagos.map(p => p.paciente))].length
  });

  // 3. MARCAR COMO ARCHIVADO (NO SE BORRA, solo se oculta de los contadores del mes actual)
  patients.forEach(p => {
    p.payments.forEach(py => {
      const d = new Date(py.date + 'T12:00');
      if (d.getMonth() === m && d.getFullYear() === y) {
        py.archivado = true;
      }
    });
  });

  egresos.forEach(e => {
    const d = new Date(e.fecha + 'T12:00');
    if (d.getMonth() === m && d.getFullYear() === y) {
      e.archivado = true;
    }
  });

  // 4. GUARDAR LOCALMENTE
  save();

  // 5. SINCRONIZAR CON SUPABASE (CRUCIAL para que no se pierda al cambiar de navegador)
  // Nota: Si tu función de guardado en Supabase tiene otro nombre (ej: sbSaveData, syncSupabase), cámbialo aquí.
  if (typeof sincronizarConSupabase === 'function') {
    sincronizarConSupabase(); 
  } else if (typeof sbSaveData === 'function') {
    sbSaveData(); 
  }

  closeModal();
  
  // 6. RECARGA LIMPIA: Garantiza que la interfaz muestre los contadores en 0 y el mes en el historial
  setTimeout(() => {
    alert(`✅ ¡${mesNombre} cerrado y archivado correctamente!\n\nLos datos históricos están seguros.\nPuedes verlos en la sección "Resumen Anual".`);
    reloadSeguro();
  }, 300);
}

function verArchivoMes(id){
  const a=archivosContables.find(x=>x.id===id);if(!a)return;
  openModal(`<div class="modal-title">📊 ${a.label} — Detalle archivado</div>
  <div class="grid3" style="margin-bottom:14px;gap:10px">
    <div class="kpi" style="padding:12px"><div class="kpi-label">Ingresos</div><div class="kpi-val" style="font-size:20px;color:var(--green)">$${a.totalIngresos.toFixed(2)}</div></div>
    <div class="kpi" style="padding:12px"><div class="kpi-label">Egresos</div><div class="kpi-val" style="font-size:20px;color:var(--red)">$${a.totalEgresos.toFixed(2)}</div></div>
    <div class="kpi" style="padding:12px"><div class="kpi-label">Utilidad</div><div class="kpi-val" style="font-size:20px;color:${a.utilidad>=0?'var(--green)':'var(--red)'}">$${a.utilidad.toFixed(2)}</div></div>
  </div>
  <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Ingresos (${a.pagos.length})</div>
  <div style="max-height:180px;overflow-y:auto;margin-bottom:12px">
    ${a.pagos.map(p=>`<div class="row-item"><div style="flex:1"><div class="row-name">${esc(p.paciente)}</div><div class="row-meta">${esc(p.concepto)} · ${fmtDate(p.fecha)} · ${p.tipo}</div></div><div class="pay-amount">$${p.monto.toFixed(2)}</div></div>`).join('')}
  </div>
  <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">Egresos (${a.egresos.length})</div>
  <div style="max-height:140px;overflow-y:auto">
    ${a.egresos.map(e=>`<div class="row-item"><div style="flex:1"><div class="row-name">${esc(e.concepto)}</div><div class="row-meta">${esc(e.categoria)} · ${fmtDate(e.fecha)}</div></div><div class="pay-egreso">-$${e.monto.toFixed(2)}</div></div>`).join('')}
  </div>
  <div class="modal-footer">
    <button class="btn-sec" onclick="closeModal()">Cerrar</button>
    <button class="btn-primary" onclick="descargarArchivoMes(${id});closeModal()">📥 Descargar informe</button>
  </div>`);
  document.querySelector('.modal').style.width='580px';
}

function eliminarArchivoMes(id){
  if(!confirm('¿Eliminar este archivo mensual del historial? Esta acción no se puede deshacer.'))return;
  archivosContables=archivosContables.filter(x=>x.id!==id);
  save();showPage('estadisticas');
}

function descargarArchivoMes(id){
  const a=archivosContables.find(x=>x.id===id);if(!a)return;
  _generarInformeHTML(a.label,a.pagos,a.egresos,a.totalIngresos,a.totalEgresos,a.utilidad,a.pacientesAtendidos,a.fechaCierre);
}

function descargarInformeAnual(anio){
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
  ${arch.map(a=>`<tr><td>${a.label}</td><td style="text-align:right" class="green">$${a.totalIngresos.toFixed(2)}</td><td style="text-align:right" class="red">$${a.totalEgresos.toFixed(2)}</td><td style="text-align:right;font-weight:600;color:${a.utilidad>=0?'#10b981':'#ef4444'}">${a.utilidad>=0?'+':''}$${a.utilidad.toFixed(2)}</td><td style="text-align:right">${a.pacientesAtendidos}</td></tr>`).join('')}
  <tr class="grand"><td>TOTAL AÑO ${anio}</td><td style="text-align:right" class="green">$${totalInc.toFixed(2)}</td><td style="text-align:right" class="red">$${totalEg.toFixed(2)}</td><td style="text-align:right;font-weight:700;color:${totalInc-totalEg>=0?'#10b981':'#ef4444'}">${totalInc-totalEg>=0?'+':''}$${(totalInc-totalEg).toFixed(2)}</td><td></td></tr>
  </tbody></table>
  <div class="footer">Informe generado por OdontoApp · ${esc(clinicaNombre)} · Año ${anio}</div></bo${'dy></html>'}`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a2=document.createElement('a');
  a2.href=url;a2.download=`Informe_Anual_${anio}_${clinicaNombre.replace(/\s+/g,'_')}.html`;
  a2.click();URL.revokeObjectURL(url);
}

function _generarInformeHTML(titulo,pagos,egresosD,totalInc,totalEg,utilidad,pacientes,fechaCierre){
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
  <div class="header"><div><h1>${esc(clinicaNombre)}</h1><div class="sub">${esc(profesional)} · RUC: ${clinicaRUC||'—'}</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:700">INFORME MENSUAL</div><div style="font-size:14px;color:#64748b;margin-top:4px">${esc(titulo)}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">Cerrado: ${fmtDate(fechaCierre)}</div></div></div>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Ingresos</div><div class="kpi-val green">$${totalInc.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Egresos</div><div class="kpi-val red">$${totalEg.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Utilidad</div><div class="kpi-val" style="color:${utilidad>=0?'#10b981':'#ef4444'}">${utilidad>=0?'+':''}$${utilidad.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Pacientes</div><div class="kpi-val" style="color:#0ea5e9">${pacientes}</div></div>
  </div>
  <div style="font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">💰 Ingresos (${pagos.length})</div>
  <table><thead><tr><th>Fecha</th><th>Paciente</th><th>Concepto</th><th>Forma de pago</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${pagos.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(p=>`<tr><td>${fmtDate(p.fecha)}</td><td>${esc(p.paciente)}</td><td>${esc(p.concepto)}</td><td>${p.tipo}</td><td style="text-align:right" class="green">$${p.monto.toFixed(2)}</td></tr>`).join('')}
  <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL:</td><td style="text-align:right" class="green">$${totalInc.toFixed(2)}</td></tr></tbody></table>
  <div style="font-size:14px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0">📤 Egresos (${egresosD.length})</div>
  <table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Proveedor</th><th style="text-align:right">Monto</th></tr></thead>
  <tbody>${egresosD.sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')).map(e=>`<tr><td>${fmtDate(e.fecha)}</td><td>${esc(e.concepto)}</td><td>${esc(e.categoria)}</td><td>${esc(e.proveedor||'—')}</td><td style="text-align:right" class="red">$${e.monto.toFixed(2)}</td></tr>`).join('')}
  <tr class="total-row"><td colspan="4" style="text-align:right">TOTAL:</td><td style="text-align:right" class="red">$${totalEg.toFixed(2)}</td></tr></tbody></table>
 <div class="footer">Informe generado por OdontoApp · ${esc(clinicaNombre)} · ${esc(titulo)}</div></bo${'dy></html>'}`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`Informe_${titulo.replace(/\s+/g,'_')}.html`;
  a.click();URL.revokeObjectURL(url);
}

function descargarInformeMensual(){
  const now=localDate(new Date());
  const m=now.getMonth(),y=now.getFullYear();
  const mesNombre=`${MONTHS_FULL[m]} ${y}`;
  const pagos=[];
  patients.forEach(p=>{
    p.payments.filter(py=>{const d=new Date(py.date+'T12:00');return d.getMonth()===m&&d.getFullYear()===y;})
      .forEach(py=>pagos.push({paciente:p.name,cedula:p.cedula,concepto:py.concept,monto:py.amount,fecha:py.date,tipo:py.type}));
  });
  const egresosM=egresos.filter(e=>{const d=new Date(e.fecha+'T12:00');return d.getMonth()===m&&d.getFullYear()===y;});
  const totalInc=pagos.reduce((s,p)=>addM(s,p.monto),0);
  const totalEg=egresosM.reduce((s,e)=>addM(s,e.monto),0);
  const pacientes=[...new Set(pagos.map(p=>p.paciente))].length;
  _generarInformeHTML(mesNombre,pagos,egresosM,totalInc,totalEg,totalInc-totalEg,pacientes,today());
}

function openAddEgreso(){
  openModal(`<div class="modal-title">Registrar egreso</div>
  <div class="form-row form-full"><div class="form-group"><label>Concepto *</label><input id="f_ec" placeholder="Arriendo, materiales, servicios..."></div></div>
  <div class="form-row"><div class="form-group"><label>Categoría</label><select id="f_ecat"><option>Materiales</option><option>Arriendo</option><option>Servicios</option><option>Sueldos</option><option>Equipos</option><option>Marketing</option><option>Impuestos</option><option>Otro</option></select></div><div class="form-group"><label>Monto ($) *</label><input id="f_em" type="number" min="0" step="0.01"></div></div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ef" type="date" value="${today()}"></div><div class="form-group"><label>Proveedor</label><input id="f_ep" placeholder="Nombre del proveedor"></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveEgreso()">Guardar</button></div>`);
}
function saveEgreso(){
  const c=v('f_ec').trim();if(!c)return;
  const m=parseMonto(v('f_em'));if(!m||m<=0){alert('Monto inválido');return;}
  egresos.push({id:uid(),concepto:c,categoria:v('f_ecat'),monto:m,fecha:v('f_ef'),proveedor:v('f_ep')});
  save();closeModal();showPage('estadisticas');
}
function delEgreso(id){if(!confirm('¿Eliminar este egreso?'))return;egresos=egresos.filter(e=>e.id!==id);save();showPage('estadisticas');}

function renderPagos(){
  const p=curPt,cta=resumenCuenta(p),txT=r2(cta.realizado+cta.porRealizar),paid=cta.pagado,deuda=cta.planPendiente;
  const pendFact=p.payments.filter(py=>py.factPendiente);
  return`
  ${pendFact.length?`<div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
    <div style="font-size:24px">⚠️</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;color:#6b4a2f">Tienes ${pendFact.length} pago${pendFact.length>1?'s':''} sin facturar en el SRI</div>
      <div style="font-size:11px;color:#8a6a4a;margin-top:2px">Total pendiente de facturar: <strong>$${pendFact.reduce((s,p)=>addM(s,p.amount),0).toFixed(2)}</strong></div>
    </div>
    <a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank"
      style="padding:8px 14px;background:#b98a4e;color:#fff;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap">
      🌐 Ir al SRI
    </a>
  </div>`:''}
  <div class="grid3" style="margin-bottom:14px">
    <div class="kpi"><div class="kpi-label">Total tratamientos</div><div class="kpi-val">${money(txT)}</div></div>
    <div class="kpi"><div class="kpi-label">Total pagado</div><div class="kpi-val" style="color:var(--green)">${money(paid)}</div></div>
    <div class="kpi"><div class="kpi-label">Saldo del plan</div><div class="kpi-val" style="color:${deuda>0?'var(--red)':'var(--green)'}">${money(deuda)}</div>${subSaldoHtml(cta)}</div>
  </div>
  <div class="card">
    <div class="action-row"><div class="card-title" style="margin:0">Historial de pagos</div><button class="btn-primary" onclick="openAddPay()">+ Registrar pago</button></div>
    ${p.payments.length?p.payments.slice().reverse().map(py=>`
      <div class="row-item" style="${py.archivado?'opacity:.55':''}">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <div class="row-name">${esc(py.concept)}</div>
            ${py.archivado&&py.factPendiente?`<span style="font-size:9px;font-weight:700;padding:2px 7px;background:#f0e7d8;color:#6b4a2f;border-radius:10px;border:1px solid #dcc39c">⚠ Sin facturar</span>`
              :py.archivado?`<span style="font-size:9px;font-weight:700;padding:2px 7px;background:#f1f5f9;color:#64748b;border-radius:10px;border:1px solid #e2e8f0">📦 Archivado</span>`
              :py.factPendiente?`<span style="font-size:9px;font-weight:700;padding:2px 7px;background:#f0e7d8;color:#6b4a2f;border-radius:10px;border:1px solid #dcc39c">⚠ Sin facturar</span>`
              :`<span style="font-size:9px;font-weight:700;padding:2px 7px;background:#d1fae5;color:#065f46;border-radius:10px">✓ Facturado</span>`}
          </div>
          <div class="row-meta">${fmtDate(py.date)} · ${py.type}</div>
        </div>
        <div class="pay-amount">+$${py.amount.toFixed(2)}</div>
        <button onclick="imprimirComprobante(${py.id})" title="Imprimir comprobante" style="padding:5px 8px;background:#dbeafe;color:#1e40af;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;margin-left:4px">🖨️</button>
        ${py.factPendiente?`<button onclick="marcarFacturada(${py.id})" title="Marcar como facturado" style="padding:5px 8px;background:#b98a4e;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;margin-left:4px">🧾 Facturar</button>`:!py.archivado?`<button onclick="marcarFacturada(${py.id})" title="Marcar como pendiente" style="padding:5px 8px;background:var(--bg);color:var(--text3);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;margin-left:4px">✓</button>`:''}
        <button class="del-btn" style="margin-left:4px" onclick="delPay(${py.id})">✕</button>
      </div>`).join(''):`<div style="font-size:13px;color:var(--text3)">Sin pagos registrados</div>`}
    <div class="total-bar${deuda>0?' debt':''}"><div class="total-lbl${deuda>0?' debt':''}">${deuda>0?'Saldo pendiente del plan':(cta.aFavor>0?'Anticipo a favor':'Al día ✓')}</div><div class="total-val${deuda>0?' debt':''}">${money(deuda>0?deuda:(cta.aFavor>0?cta.aFavor:paid))}</div></div>
  </div>`;
}
function delPay(id){if(!confirm('¿Eliminar?'))return;curPt.payments=curPt.payments.filter(x=>x.id!==id);save();renderTab();}

function imprimirComprobante(pagoId){
  const py=curPt.payments.find(x=>x.id===pagoId);
  if(!py)return;
  const clinica=document.getElementById('logoText').textContent;
  const prof=document.getElementById('logoProfesional').textContent;
  const cta=resumenCuenta(curPt),txTotal=r2(cta.realizado+cta.porRealizar),totalPagado=cta.pagado;
  const saldo=cta.planPendiente;
  const numComp=String(py.id).slice(-8).padStart(8,'0');
  const logoHtml=logoImg?`<img src="${logoImg}" style="height:60px;object-fit:contain">`
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
  <button onclick="window.print()" style="padding:8px 20px;background:#0f172a;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;margin-right:8px">🖨️ Imprimir</button>
  <button onclick="window.close()" style="padding:8px 16px;background:#e2e8f0;color:#0f172a;border:none;border-radius:6px;font-size:13px;cursor:pointer">✕ Cerrar</button>
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
          ${clinicaRUC?'RUC: '+clinicaRUC+'<br>':''}
          ${clinicaDireccion?clinicaDireccion+'<br>':''}
          ${clinicaTelefono?'Tel: '+clinicaTelefono:''}
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
      <div class="info-item"><label>Nombre completo</label><span>${esc(curPt.name)}</span></div>
      <div class="info-item"><label>Cédula de identidad</label><span>${esc(curPt.cedula||'—')}</span></div>
      <div class="info-item"><label>Teléfono</label><span>${esc(curPt.phone||'—')}</span></div>
      <div class="info-item"><label>Email</label><span>${esc(curPt.email||'—')}</span></div>
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
          <td style="text-align:center">${py.type}</td>
          <td style="text-align:right;font-weight:700;color:#10b981">$${py.amount.toFixed(2)}</td>
        </tr>
        ${curPt.treatments.length?`
        <tr style="background:#f8fafc">
          <td colspan="3" style="font-size:11px;color:#64748b;font-style:italic">Tratamientos en curso: ${curPt.treatments.filter(t=>t.status==='pendiente').map(t=>t.name).join(', ')||'Según historial clínico'}</td>
          <td></td>
        </tr>`:''}
      </tbody>
    </table>
  </div>

  <!-- RESUMEN FINANCIERO -->
  <div class="total-section">
    <div class="total-row"><span>Total del tratamiento:</span><span>$${txTotal.toFixed(2)}</span></div>
    <div class="total-row"><span>Total abonado (incluye este pago):</span><span style="color:#10b981">$${totalPagado.toFixed(2)}</span></div>
    <div class="total-final">
      <span>SALDO PENDIENTE:</span>
      <span class="${saldo>0?'saldo-rojo':'saldo-verde'}">${saldo>0?'$'+saldo.toFixed(2):'AL DÍA ✓'}</span>
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
        <div class="sign-name">${esc(curPt.name)}</div>
        <div class="sign-role">Firma del paciente · C.I. ${esc(curPt.cedula||'—')}</div>
      </div>
    </div>
    <div class="sign-box">
      <div class="stamp-area">Sello del consultorio</div>
      <div class="sign-line" style="margin-top:6px">
        <div class="sign-name">${prof}</div>
        <div class="sign-role">Firma del profesional</div>
        ${clinicaRUC?`<div class="sign-role">RUC: ${clinicaRUC}</div>`:''}
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-top:12px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px">
<span class="watermark">DOCUMENTO VÁLIDO SOLO CON FIRMA Y SELLO DEL PROFESIONAL</span><br>
Comprobante de Pago · Emitido por ${clinica} · ${fmtDate(today())} · Generado por OdontoApp
</div>
</div>
</bo${'dy></html>'}`;

  const w=safeOpen('','_blank','width=900,height=780');
  w.document.write(html);
  w.document.close();
}
function openAddPay(){
  const svcHtml=servicios.length?`
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">⚡ Seleccionar del catálogo</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${servicios.map(s=>`<button onclick="seleccionarServicioPay('${jsq(s.nombre)}',${s.precio})" style="padding:6px 12px;border:1px solid var(--border);border-radius:20px;background:var(--bg);font-size:12px;cursor:pointer;color:var(--text);transition:all .15s" onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text)'">${esc(s.nombre)} <span style="font-weight:700;color:var(--green)">$${s.precio.toFixed(2)}</span></button>`).join('')}
      </div>
      <div style="border-top:1px solid var(--border);margin:12px 0 10px"></div>
    </div>`:'';
  openModal(`<div class="modal-title">Registrar pago</div>
  ${svcHtml}
  <div class="form-row form-full"><div class="form-group"><label>Concepto</label><input id="f_pyc" placeholder="Abono, pago total, nombre del servicio..."></div></div>
  <div class="form-row"><div class="form-group"><label>Monto ($) *</label><input id="f_pya" type="number" min="0" step="0.01"></div><div class="form-group"><label>Fecha</label><input id="f_pyd" type="date" value="${today()}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Forma de pago</label><select id="f_pyt"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta de crédito</option><option>Tarjeta de débito</option><option>Cheque</option></select></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="savePay()">Guardar pago</button></div>`);
}

function seleccionarServicioPay(nombre,precio){
  const c=document.getElementById('f_pyc');
  const a=document.getElementById('f_pya');
  if(c)c.value=nombre;
  if(a)a.value=precio.toFixed(2);
  a?.focus();
}
function savePay(){
  const amt=parseMonto(v('f_pya'));
  if(!amt||amt<=0){alert('Monto inválido');return;}
  const pago={id:uid(),concept:v('f_pyc')||'Pago',amount:amt,date:v('f_pyd'),type:v('f_pyt'),factPendiente:true};
  curPt.payments.push(pago);
  save();
  closeModal();
  renderTab();
  // Auto-show invoice reminder
  setTimeout(()=>recordatorioFactura(pago),300);
}

function recordatorioFactura(pago){
  if(typeof pago === 'number'){
    // Called from button with id - find the payment
    pago = curPt.payments.find(x=>x.id===pago);
    if(!pago) return;
  }
  openModal(`<div class="modal-title">🧾 Recordatorio de factura</div>
  <div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start">
    <div style="font-size:28px">⚠️</div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#6b4a2f;margin-bottom:4px">¡No olvides emitir la factura en el SRI!</div>
      <div style="font-size:12px;color:#8a6a4a;line-height:1.6">Se registró un pago de <strong>$${pago.amount.toFixed(2)}</strong> de <strong>${esc(curPt.name)}</strong>. Recuerda emitir la factura electrónica en el portal del SRI.</div>
    </div>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Datos para tu factura en el SRI</div>
    <div class="grid2" style="gap:10px">
      <div><div class="fl">Paciente / Cliente</div><div class="fv">${esc(curPt.name)}</div></div>
      <div><div class="fl">Cédula / RUC</div><div class="fv">${esc(curPt.cedula||'—')}</div></div>
      <div><div class="fl">Concepto</div><div class="fv">${esc(pago.concept)}</div></div>
      <div><div class="fl">Forma de pago</div><div class="fv">${pago.type}</div></div>
      <div><div class="fl">Monto</div><div class="fv" style="color:var(--green);font-weight:700">$${pago.amount.toFixed(2)}</div></div>
      <div><div class="fl">Fecha</div><div class="fv">${fmtDate(pago.date)}</div></div>
    </div>
    <div style="margin-top:12px;padding:10px;background:#d1fae5;border-radius:8px;border:1px solid #6ee7b7">
      <div style="font-size:11px;font-weight:600;color:#065f46">✓ Servicio odontológico — IVA 0%</div>
      <div style="font-size:11px;color:#047857">Art. 56 Ley de Régimen Tributario Interno del Ecuador</div>
    </div>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <a href="https://facturadorsri.sri.gob.ec/portal-facturadorsri-internet/pages/comprobantes/factura/Factura.html" target="_blank"
      style="flex:1;padding:10px;background:var(--accent);color:#fff;border-radius:9px;font-size:12px;font-weight:600;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px">
      🌐 Abrir portal SRI
    </a>
    <button onclick="marcarFacturada(${pago.id})" style="flex:1;padding:10px;background:var(--green);color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer">
      ✓ Ya la hice en el SRI
    </button>
  </div>
  <div class="modal-footer" style="padding-top:10px">
    <div style="font-size:11px;color:var(--text3)">Quedará en "Pendientes" hasta que la marques como realizada.</div>
    <button class="btn-sec" onclick="closeModal()">Cerrar — la haré luego</button>
  </div>`);
  document.querySelector('.modal').style.width='540px';
}

function marcarFacturada(pagoId){
  // Search across all patients
  let found=false;
  patients.forEach(p=>{
    const pago=p.payments.find(x=>x.id===pagoId);
    if(pago){pago.factPendiente=false;found=true;}
  });
  if(found){save();if(curPt)renderTab();else showPage('dashboard');}
}
