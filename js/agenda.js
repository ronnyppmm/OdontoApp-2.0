/* ═══ AGENDA — calendario, citas rápidas, recordatorios WhatsApp ═══ */
// ═══ AGENDA — CALENDARIO COMPLETO ═══
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calView = 'month'; // 'month' | 'week' | 'list'
// Track current week Monday for week view
let calWeekStart = (()=>{
  const n=new Date(); const dow=(n.getDay()+6)%7;
  const m=new Date(n); m.setDate(n.getDate()-dow); m.setHours(0,0,0,0); return m;
})();

function renderAgendaPage(){
  // Build all appointments (registered patients + quick appointments)
  const allAppts = buildAllAppts();
  const todayStr = today();

  // Calendar header nav
  const monthName = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][calMonth];
  let headerLabel = `${monthName} ${calYear}`;
  if(calView==='week'){
    const wEnd=new Date(calWeekStart); wEnd.setDate(calWeekStart.getDate()+6);
    headerLabel=`${calWeekStart.getDate()} ${MONTHS_FULL[calWeekStart.getMonth()]} — ${wEnd.getDate()} ${MONTHS_FULL[wEnd.getMonth()]} ${wEnd.getFullYear()}`;
  }

  const viewButtons = `
    <div style="display:flex;gap:4px">
      <button onclick="setCalView('month')" style="padding:6px 12px;font-size:12px;font-weight:500;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:${calView==='month'?'var(--accent)':'var(--card)'};color:${calView==='month'?'#fff':'var(--text2)'}">Mes</button>
      <button onclick="setCalView('week')" style="padding:6px 12px;font-size:12px;font-weight:500;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:${calView==='week'?'var(--accent)':'var(--card)'};color:${calView==='week'?'#fff':'var(--text2)'}">Semana</button>
      <button onclick="setCalView('list')" style="padding:6px 12px;font-size:12px;font-weight:500;border-radius:7px;border:1px solid var(--border);cursor:pointer;background:${calView==='list'?'var(--accent)':'var(--card)'};color:${calView==='list'?'#fff':'var(--text2)'}">Lista</button>
    </div>`;

  const navBar = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div style="display:flex;align-items:center;gap:10px">
      <button onclick="calPrev()" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--card);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">‹</button>
      <div style="font-size:17px;font-weight:700;color:var(--text);min-width:180px;text-align:center">${headerLabel}</div>
      <button onclick="calNext()" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:var(--card);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">›</button>
      <button onclick="calGoToday()" style="padding:6px 12px;font-size:12px;border-radius:7px;border:1px solid var(--border);background:var(--card);color:var(--text2);cursor:pointer">Hoy</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      ${viewButtons}
      <button class="btn-primary" onclick="openQuickAppt('')" style="padding:7px 14px;font-size:12px">+ Nueva cita</button>
    </div>
  </div>`;

  let calHtml = '';
  if(calView==='month') calHtml = renderMonthView(allAppts, todayStr);
  else if(calView==='week') calHtml = renderWeekView(allAppts, todayStr);
  else calHtml = renderListView(allAppts, todayStr);

  // Today's summary
  const todayAppts = allAppts.filter(a=>a.date===todayStr).sort((a,b)=>a.time.localeCompare(b.time));

  return`
  <div style="display:flex;gap:14px;align-items:flex-start">
    <div style="flex:1;min-width:0">
      <div class="card" style="padding:16px">
        ${navBar}
        ${calHtml}
      </div>
    </div>
    <div style="width:280px;flex-shrink:0">
      <div class="card" style="padding:14px;margin-bottom:12px">
        <div class="card-title" style="margin-bottom:10px">📅 Hoy — ${new Date().toLocaleDateString('es-EC',{day:'numeric',month:'long'})}</div>
        ${todayAppts.length?todayAppts.map(a=>apptMiniCard(a,todayStr)).join(''):`<div style="font-size:12px;color:var(--text3);padding:8px 0;text-align:center">Sin citas hoy</div>`}
        <button onclick="openQuickAppt('${todayStr}')" style="width:100%;margin-top:10px;padding:8px;font-size:12px;background:var(--bg);border:1.5px dashed var(--border);border-radius:8px;cursor:pointer;color:var(--text2);font-weight:500">+ Agregar cita hoy</button>
      </div>
      <div class="card" style="padding:14px">
        <div class="card-title" style="margin-bottom:10px">📋 Leyenda</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:11px">
          <div style="display:flex;align-items:center;gap:7px"><div style="width:12px;height:12px;border-radius:3px;background:#dbeafe;border:1px solid #93c5fd"></div>Paciente registrado</div>
          <div style="display:flex;align-items:center;gap:7px"><div style="width:12px;height:12px;border-radius:3px;background:#f0e7d8;border:1px solid #dcc39c"></div>Cita rápida / sin ficha</div>
          <div style="display:flex;align-items:center;gap:7px"><div style="width:12px;height:12px;border-radius:3px;background:#d1fae5;border:1px solid #6ee7b7"></div>Completada</div>
          <div style="display:flex;align-items:center;gap:7px"><div style="width:12px;height:12px;border-radius:3px;background:#fee2e2;border:1px solid #fca5a5"></div>No asistió</div>
        </div>
      </div>
      ${(() => {
        // Upcoming appointments in next 3 days with phone
        const next3=[];
        const hoy=today();
        const d3=daysFromNow(3);
        allAppts.filter(a=>a.date>=hoy&&a.date<=d3&&a.status!=='completada').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).forEach(a=>{
          const phone=a.phone||(a.ptId?patients.find(p=>p.id===a.ptId)?.phone:'');
          if(phone) next3.push({...a,phone});
        });
        if(!next3.length) return '';
        return `<div class="card" style="padding:14px">
          <div class="card-title" style="margin-bottom:6px">📱 Recordatorios pendientes</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:10px">Próximos 3 días — clic para enviar por WhatsApp</div>
          ${next3.map(a=>`
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.ptName)}</div>
                <div style="font-size:10px;color:var(--text3)">${fmtDate(a.date)} · ${a.time}</div>
              </div>
              <button onclick="enviarWA('${jsq(a.phone)}',{date:'${a.date}',time:'${a.time}',reason:'${jsq((a.reason||''))}'},'${jsq(a.ptName)}')
                " style="padding:5px 8px;background:#25d366;border:none;border-radius:7px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px;font-size:10px;color:#fff;font-weight:600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar
              </button>
            </div>`).join('')}
        </div>`;
      })()}
    </div>
  </div>`;
}

function buildAllAppts(){
  const all=[];
  patients.forEach(p=>p.appointments.forEach(a=>all.push({...a,ptName:p.name,ptId:p.id,type:'registered'})));
  (quickAppts||[]).forEach(a=>all.push({...a,type:'quick'}));
  return all;
}

function apptMiniCard(a, todayStr){
  const bg = a.status==='completada'?'#d1fae5':a.status==='no_asistio'?'#fee2e2':a.type==='quick'?'#f0e7d8':'#dbeafe';
  const border = a.status==='completada'?'#6ee7b7':a.status==='no_asistio'?'#fca5a5':a.type==='quick'?'#dcc39c':'#93c5fd';
  const phone=a.phone||(a.ptId?patients.find(p=>p.id===a.ptId)?.phone:'');
  return`<div style="padding:8px;border-radius:8px;background:${bg};border:1px solid ${border};margin-bottom:6px">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:11px;font-weight:700;color:var(--text);min-width:40px">${a.time}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.ptName)}</div>
        <div style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.reason)}</div>
      </div>
      <button onclick="openApptDetail('${a.id}','${a.type}','${a.ptId||''}')" style="width:22px;height:22px;border:none;background:rgba(0,0,0,.08);border-radius:5px;cursor:pointer;font-size:11px;flex-shrink:0">⋯</button>
    </div>
    ${phone?`<button onclick="enviarWA('${jsq(phone)}',{date:'${a.date}',time:'${a.time}',reason:'${jsq((a.reason||''))}'},'${jsq(a.ptName)}')
      " style="width:100%;margin-top:6px;padding:5px;background:#25d366;color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Enviar recordatorio WhatsApp
    </button>`:''}
  </div>`;
}

function renderMonthView(allAppts, todayStr){
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay  = new Date(calYear, calMonth+1, 0);
  const startDow = (firstDay.getDay()+6)%7; // Monday=0
  const totalDays = lastDay.getDate();
  const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  let html = `<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;background:var(--border);border-radius:10px;overflow:hidden">`;
  // Header
  DAYS.forEach(d=>{ html+=`<div style="padding:8px 4px;text-align:center;font-size:11px;font-weight:700;color:var(--text2);background:var(--bg)">${d}</div>`; });

  // Empty cells before month starts
  for(let i=0;i<startDow;i++) html+=`<div style="background:var(--card);min-height:90px"></div>`;

  for(let day=1;day<=totalDays;day++){
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const isToday=dateStr===todayStr;
    const dayAppts=allAppts.filter(a=>a.date===dateStr).sort((a,b)=>a.time.localeCompare(b.time));
    const dow=(startDow+day-1)%7;
    const isWeekend=dow===5||dow===6;
    html+=`<div onclick="openQuickAppt('${dateStr}')" style="background:${isToday?'var(--cal-today, #eff6ff)':isWeekend?'var(--cal-weekend, #fafafa)':'var(--card)'};min-height:90px;padding:6px;cursor:pointer;transition:background .1s;overflow:hidden;min-width:0" onmouseover="this.style.background='var(--cal-hover, #f0f9ff)'" onmouseout="this.style.background='${isToday?'var(--cal-today, #eff6ff)':isWeekend?'var(--cal-weekend, #fafafa)':'var(--card)'}'">
      <div style="font-size:13px;font-weight:${isToday?'700':'500'};color:${isToday?'#fff':'var(--text)'};width:22px;height:22px;border-radius:50%;background:${isToday?'var(--accent)':'transparent'};display:flex;align-items:center;justify-content:center;margin-bottom:3px">${day}</div>
      ${dayAppts.slice(0,3).map(a=>{
        const bg=a.status==='completada'?'#d1fae5':a.status==='no_asistio'?'#fee2e2':a.type==='quick'?'#f0e7d8':'#dbeafe';
        const tc=a.status==='completada'?'#065f46':a.status==='no_asistio'?'#991b1b':a.type==='quick'?'#6b4a2f':'#1e40af';
        return`<div onclick="event.stopPropagation();openApptDetail('${a.id}','${a.type}','${a.ptId||''}')" style="font-size:10px;padding:2px 4px;border-radius:4px;background:${bg};color:${tc};margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;max-width:100%">${a.time} ${esc(a.ptName)}</div>`;
      }).join('')}
      ${dayAppts.length>3?`<div style="font-size:10px;color:var(--text3);padding:1px 2px">+${dayAppts.length-3}</div>`:''}
    </div>`;
  }
  // Fill remaining cells
  const total=startDow+totalDays;
  const rem=total%7===0?0:7-(total%7);
  for(let i=0;i<rem;i++) html+=`<div style="background:var(--card);min-height:90px"></div>`;
  html+=`</div>`;
  return html;
}

function renderWeekView(allAppts, todayStr){
  // Use calWeekStart to always show the correct week
  const monday=new Date(calWeekStart);
  const days=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);days.push(d);}
  const DNAMES=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const hours=['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

  let html=`<div style="display:grid;grid-template-columns:48px repeat(7,1fr);gap:1px;background:var(--border);border-radius:10px;overflow:hidden;max-height:520px;overflow-y:auto">`;
  // Header row
  html+=`<div style="background:var(--bg);padding:8px 4px"></div>`;
  days.forEach((d,i)=>{
    const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isT=ds===todayStr;
    html+=`<div style="background:${isT?'var(--cal-today-header, #eff6ff)':'var(--bg)'};padding:8px 4px;text-align:center">
      <div style="font-size:10px;font-weight:600;color:var(--text2)">${DNAMES[i]}</div>
      <div style="font-size:15px;font-weight:700;color:${isT?'var(--accent)':'var(--text)'}">${d.getDate()}</div>
    </div>`;
  });
  // Hour rows
  hours.forEach(hr=>{
    html+=`<div style="background:var(--card);padding:4px 6px;font-size:10px;color:var(--text3);text-align:right;border-top:1px solid var(--border)">${hr}</div>`;
    days.forEach(d=>{
      const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const hrAppts=allAppts.filter(a=>a.date===ds&&a.time.startsWith(hr.split(':')[0]));
      const isT=ds===todayStr;
      html+=`<div onclick="openQuickAppt('${ds}','${hr}')" style="background:${isT?'var(--cal-today-cell, #fafeff)':'var(--card)'};min-height:52px;padding:3px;border-top:1px solid var(--border);cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--cal-hover, #f0f9ff)'" onmouseout="this.style.background='${isT?'var(--cal-today-cell, #fafeff)':'var(--card)'}'">
        ${hrAppts.map(a=>{
          const bg=a.status==='completada'?'#d1fae5':a.type==='quick'?'#f0e7d8':'#dbeafe';
          const tc=a.status==='completada'?'#065f46':a.type==='quick'?'#6b4a2f':'#1e40af';
          return`<div onclick="event.stopPropagation();openApptDetail('${a.id}','${a.type}','${a.ptId||''}')" style="font-size:10px;padding:3px 5px;border-radius:5px;background:${bg};color:${tc};margin-bottom:2px;cursor:pointer;font-weight:500">${a.time} ${esc(a.ptName)}<br><span style="font-weight:400;opacity:.8">${esc(a.reason)}</span></div>`;
        }).join('')}
      </div>`;
    });
  });
  html+=`</div>`;
  return html;
}

function renderListView(allAppts, todayStr){
  const future=allAppts.filter(a=>a.date>=todayStr&&a.status!=='completada').sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const past=allAppts.filter(a=>a.date<todayStr||a.status==='completada').sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).slice(0,20);

  if(future.length===0&&past.length===0) return`<div style="text-align:center;padding:40px;color:var(--text3)">Sin citas registradas. Haz clic en el calendario para agregar una.</div>`;

  let lastDate='';
  let html=`<div style="max-height:520px;overflow-y:auto">`;
  future.forEach(a=>{
    if(a.date!==lastDate){
      lastDate=a.date;
      const isToday=a.date===todayStr;
      html+=`<div style="font-size:11px;font-weight:700;color:${isToday?'var(--accent)':'var(--text2)'};padding:10px 0 4px;text-transform:uppercase;letter-spacing:.05em">${isToday?'HOY — ':''} ${fmtDate(a.date)}</div>`;
    }
    html+=listApptRow(a);
  });
  if(past.length){
    html+=`<div style="font-size:11px;font-weight:700;color:var(--text3);padding:14px 0 4px;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid var(--border);margin-top:8px">Historial</div>`;
    past.forEach(a=>{ html+=listApptRow(a); });
  }
  html+=`</div>`;
  return html;
}

function listApptRow(a){
  const bg=a.status==='completada'?'#d1fae5':a.status==='no_asistio'?'#fee2e2':a.type==='quick'?'#f0e7d8':'#dbeafe';
  const tc=a.status==='completada'?'#065f46':a.status==='no_asistio'?'#991b1b':a.type==='quick'?'#6b4a2f':'#1e40af';
  const statusLabel=a.status==='completada'?'Completada':a.status==='no_asistio'?'No asistió':'Pendiente';
  const phone=a.phone||(a.ptId?patients.find(p=>p.id===a.ptId)?.phone:'');
  return`<div style="padding:10px 12px;border-radius:10px;background:var(--card);border:1px solid var(--border);margin-bottom:6px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:12px;font-weight:700;color:var(--text);min-width:44px">${a.time}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(a.ptName)}</div>
        <div style="font-size:11px;color:var(--text2)">${esc(a.reason)}${phone?` · 📞 ${phone}`:''}</div>
      </div>
      <span style="padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;background:${bg};color:${tc}">${statusLabel}</span>
      ${phone?`<button onclick="enviarWA('${jsq(phone)}',{date:'${a.date}',time:'${a.time}',reason:'${jsq((a.reason||''))}'},'${jsq(a.ptName)}')
        " title="Enviar recordatorio WhatsApp" style="width:30px;height:30px;background:#25d366;border:none;border-radius:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </button>`:''}
      <button onclick="openApptDetail('${a.id}','${a.type}','${a.ptId||''}')" style="padding:5px 10px;font-size:11px;border:1px solid var(--border);border-radius:7px;background:var(--card);cursor:pointer;color:var(--text2)">⋯</button>
    </div>
  </div>`;
}

function setCalView(v){
  calView=v;
  if(v==='week'){
    // Set calWeekStart to the Monday of the currently viewed month
    const ref=new Date(calYear,calMonth,1);
    const dow=(ref.getDay()+6)%7;
    calWeekStart=new Date(ref);
    calWeekStart.setDate(ref.getDate()-dow);
    calWeekStart.setHours(0,0,0,0);
  }
  showPage('agenda');
}
function calPrev(){
  if(calView==='week'){
    calWeekStart=new Date(calWeekStart);
    calWeekStart.setDate(calWeekStart.getDate()-7);
    calYear=calWeekStart.getFullYear();
    calMonth=calWeekStart.getMonth();
  } else {
    calMonth--; if(calMonth<0){calMonth=11;calYear--;}
  }
  showPage('agenda');
}
function calNext(){
  if(calView==='week'){
    calWeekStart=new Date(calWeekStart);
    calWeekStart.setDate(calWeekStart.getDate()+7);
    calYear=calWeekStart.getFullYear();
    calMonth=calWeekStart.getMonth();
  } else {
    calMonth++; if(calMonth>11){calMonth=0;calYear++;}
  }
  showPage('agenda');
}
function calGoToday(){
  const n=new Date();
  calYear=n.getFullYear(); calMonth=n.getMonth();
  const dow=(n.getDay()+6)%7;
  calWeekStart=new Date(n); calWeekStart.setDate(n.getDate()-dow); calWeekStart.setHours(0,0,0,0);
  showPage('agenda');
}

// Quick appointment (for patients who message to schedule)
function openQuickAppt(dateStr, timeStr){
  openModal(`<div class="modal-title">📅 Nueva cita</div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af">
    <strong>💬 Cita rápida:</strong> Si el paciente te escribió por mensaje pero no tiene ficha, completa solo los datos básicos. Luego podrás crear su ficha completa.
  </div>
  <div class="form-row form-full">
    <div class="form-group">
      <label>Buscar paciente registrado (opcional)</label>
      <div style="position:relative">
        <input id="f_qa_search" placeholder="Escribe el nombre del paciente..." autocomplete="off"
          oninput="filtrarPacientesAppt(this.value)"
          style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:9px;font-size:13px;outline:none;font-family:inherit;background:var(--card);color:var(--text)">
        <div id="f_qa_dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:0 0 10px 10px;z-index:600;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div>
      </div>
      <input type="hidden" id="f_qa_pt" value="">
      <div id="f_qa_selected" style="display:none;margin-top:6px;padding:8px 12px;background:#d1fae5;border-radius:8px;font-size:12px;color:#065f46;align-items:center;justify-content:space-between">
        <span id="f_qa_selected_name"></span>
        <button onclick="limpiarPacienteAppt()" style="background:none;border:none;color:#065f46;cursor:pointer;font-size:14px">✕</button>
      </div>
    </div>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em">Datos del paciente</div>
    <div class="form-row"><div class="form-group"><label>Nombre *</label><input id="f_qa_name" placeholder="Nombre del paciente"></div><div class="form-group"><label>Teléfono</label><input id="f_qa_phone" placeholder="0987-654-321"></div></div>
  </div>
  <div class="form-row"><div class="form-group"><label>Fecha *</label><input id="f_qa_date" type="date" value="${dateStr||today()}"></div><div class="form-group"><label>Hora *</label><input id="f_qa_time" type="time" value="${timeStr||'09:00'}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Motivo de la cita *</label><input id="f_qa_reason" placeholder="Consulta, limpieza, dolor, extracción..."></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Notas adicionales</label><input id="f_qa_notes" placeholder="Canal de agendamiento, observaciones..."></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveQuickAppt()">Guardar cita</button></div>`);
}

function filtrarPacientesAppt(q){
  const dd=document.getElementById('f_qa_dropdown');
  if(!q||q.trim().length<1){dd.style.display='none';return;}
  const ql=q.toLowerCase();
  const matches=patients.filter(p=>p.name.toLowerCase().includes(ql)||p.cedula?.includes(q)||p.phone?.includes(q)).slice(0,8);
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map(p=>`
    <div onclick="seleccionarPacienteAppt(${p.id},'${jsq(p.name)}','${jsq(p.phone)}')"
      style="padding:10px 14px;cursor:pointer;font-size:13px;color:var(--text);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px"
      onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='var(--card)'">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${p.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
      <div><div style="font-weight:600">${esc(p.name)}</div><div style="font-size:10px;color:var(--text3)">${esc(p.cedula||'')} ${p.phone?'· '+p.phone:''}</div></div>
    </div>`).join('');
  dd.style.display='block';
}

function seleccionarPacienteAppt(id, nombre, telefono){
  document.getElementById('f_qa_pt').value=id;
  document.getElementById('f_qa_name').value=nombre;
  document.getElementById('f_qa_phone').value=telefono||'';
  document.getElementById('f_qa_search').value=nombre;
  document.getElementById('f_qa_dropdown').style.display='none';
  const sel=document.getElementById('f_qa_selected');
  document.getElementById('f_qa_selected_name').textContent='✓ Paciente registrado: '+nombre;
  sel.style.display='flex';
}

function limpiarPacienteAppt(){
  document.getElementById('f_qa_pt').value='';
  document.getElementById('f_qa_name').value='';
  document.getElementById('f_qa_phone').value='';
  document.getElementById('f_qa_search').value='';
  document.getElementById('f_qa_selected').style.display='none';
}

function fillQuickApptFromPt(){
  const ptId=parseInt(v('f_qa_pt'));
  if(!ptId){document.getElementById('f_qa_name').value='';document.getElementById('f_qa_phone').value='';return;}
  const p=patients.find(x=>x.id===ptId);if(!p)return;
  document.getElementById('f_qa_name').value=p.name;
  document.getElementById('f_qa_phone').value=p.phone;
}

function saveQuickAppt(){
  const name=v('f_qa_name').trim();if(!name){alert('El nombre es obligatorio');return;}
  const reason=v('f_qa_reason').trim();if(!reason){alert('El motivo es obligatorio');return;}
  const ptId=parseInt(v('f_qa_pt'));
  const date=v('f_qa_date'), time=v('f_qa_time');

  if(ptId){
    // Save to registered patient's appointments
    const p=patients.find(x=>x.id===ptId);
    if(p){
      p.appointments.push({id:uid(),reason,date,time,status:'pendiente',notes:v('f_qa_notes')});
      save();closeModal();showPage('agenda');return;
    }
  }
  // Quick appointment (no patient file)
  if(!quickAppts) quickAppts=[];
  quickAppts.push({id:'q'+uid(),ptName:name,phone:v('f_qa_phone'),reason,date,time,status:'pendiente',notes:v('f_qa_notes'),type:'quick'});
  saveQuickAppts();closeModal();showPage('agenda');
}

function openApptDetail(id, type, ptId){
  let appt=null;
  if(type==='registered'){
    const p=patients.find(x=>x.id===parseInt(ptId));
    if(p) appt=p.appointments.find(a=>String(a.id)===String(id));
    if(appt) appt={...appt,ptName:p.name,ptId:p.id,type:'registered'};
  } else {
    appt=(quickAppts||[]).find(a=>String(a.id)===String(id));
  }
  if(!appt)return;

  const statusOpts=['pendiente','completada','no_asistio'].map(s=>`<option value="${s}"${appt.status===s?' selected':''}>${s==='pendiente'?'Pendiente':s==='completada'?'Completada':'No asistió'}</option>`).join('');
  openModal(`<div class="modal-title">Detalle de cita</div>
  <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:14px">
    <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">${esc(appt.ptName)}</div>
    ${appt.phone?`<div style="font-size:12px;color:var(--text2);margin-bottom:2px">📞 ${esc(appt.phone)}</div>`:''}
    <div style="font-size:13px;color:var(--text2)">📅 ${fmtDate(appt.date)} — ${appt.time}</div>
    <div style="font-size:13px;color:var(--text2);margin-top:4px">🦷 ${esc(appt.reason)}</div>
    ${appt.notes?`<div style="font-size:12px;color:var(--text3);margin-top:4px">📝 ${esc(appt.notes)}</div>`:''}
    ${appt.type==='quick'?`<div style="margin-top:8px;padding:6px 10px;background:#f0e7d8;border-radius:7px;font-size:11px;color:#6b4a2f">💬 Cita rápida — sin ficha de paciente</div>`:''}
  </div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_ad_date" type="date" value="${appt.date}"></div><div class="form-group"><label>Hora</label><input id="f_ad_time" type="time" value="${appt.time}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Motivo</label><input id="f_ad_reason" value="${esc(appt.reason)}"></div></div>
  <div class="form-row form-full"><div class="form-group"><label>Estado</label><select id="f_ad_status">${statusOpts}</select></div></div>
  <div class="modal-footer" style="justify-content:space-between">
    <div style="display:flex;gap:8px">
      <button class="btn-sec" style="color:var(--red);border-color:#fca5a5" onclick="deleteApptDetail('${id}','${type}','${ptId}')">Eliminar</button>
      ${type==='quick'?`<button class="btn-sec" onclick="convertToPatient('${id}')">Crear ficha</button>`:`<button class="btn-sec" onclick="closeModal();selectPt(${ptId})">Ver ficha</button>`}
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-sec" onclick="closeModal()">Cancelar</button>
      <button class="btn-primary" onclick="saveApptDetail('${id}','${type}','${ptId}')">Guardar</button>
    </div>
  </div>`);
}

function saveApptDetail(id,type,ptId){
  if(type==='registered'){
    const p=patients.find(x=>x.id===parseInt(ptId));
    const a=p?.appointments.find(a=>String(a.id)===String(id));
    if(a){a.date=v('f_ad_date');a.time=v('f_ad_time');a.reason=v('f_ad_reason');a.status=v('f_ad_status');save();}
  } else {
    const a=(quickAppts||[]).find(a=>String(a.id)===String(id));
    if(a){a.date=v('f_ad_date');a.time=v('f_ad_time');a.reason=v('f_ad_reason');a.status=v('f_ad_status');saveQuickAppts();}
  }
  closeModal();showPage('agenda');
}

function deleteApptDetail(id,type,ptId){
  if(!confirm('¿Eliminar esta cita?'))return;
  if(type==='registered'){
    const p=patients.find(x=>x.id===parseInt(ptId));
    if(p){p.appointments=p.appointments.filter(a=>String(a.id)!==String(id));save();}
  } else {
    quickAppts=(quickAppts||[]).filter(a=>String(a.id)!==String(id));saveQuickAppts();
  }
  closeModal();showPage('agenda');
}

function convertToPatient(qId){
  const qa=(quickAppts||[]).find(a=>String(a.id)===String(qId));if(!qa)return;
  closeModal();
  openModal(`<div class="modal-title">Crear ficha de paciente</div>
  <p style="font-size:13px;color:var(--text2);margin-bottom:14px">Se creará una ficha completa para <strong>${esc(qa.ptName)}</strong> y la cita quedará asociada a ella.</p>
  ${Patients.formHtml({name:qa.ptName,phone:qa.phone||''})}
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="confirmConvert('${qId}')">Crear ficha y asociar cita</button></div>`);
}

function confirmConvert(qId){
  const qa=(quickAppts||[]).find(a=>String(a.id)===String(qId));
  if(!qa) return;
  const newPt=Patients.addFromForm({appointments:[{id:uid(),reason:qa.reason,date:qa.date,time:qa.time,status:qa.status,notes:qa.notes}]});
  if(!newPt) return;
  quickAppts=(quickAppts||[]).filter(a=>String(a.id)!==String(qId));
  saveQuickAppts();
  closeModal();
  renderSidebar();
  selectPt(newPt.id);
}

function saveQuickAppts(){ localStorage.setItem('oa3_qa', JSON.stringify(quickAppts||[])); }
function loadQuickAppts(){ const d=localStorage.getItem('oa3_qa'); quickAppts=d?JSON.parse(d):[]; }

function renderCitas(){
  const p=curPt,todayStr=today(),pend=p.appointments.filter(a=>a.status!=='completada'),done=p.appointments.filter(a=>a.status==='completada');
  return`<div class="card">
    <div class="action-row"><div class="card-title" style="margin:0">Citas programadas</div><button class="btn-primary" onclick="openAddAppt()">+ Nueva cita</button></div>
    ${pend.length?pend.map(a=>{const d=new Date(a.date+'T12:00');return`<div class="row-item"><div class="appt-date-box"><div class="appt-day">${d.getDate()}</div><div class="appt-mon">${MONTHS[d.getMonth()]}</div></div><div style="flex:1"><div class="row-name">${esc(a.reason)}</div><div class="row-meta">${a.time}${a.date===todayStr?' · <b style="color:var(--accent)">HOY</b>':''}</div></div><button class="comp-btn" onclick="compAppt(${a.id})">Completar</button><button class="del-btn" style="margin-left:6px" onclick="delAppt(${a.id})">✕</button></div>`;}).join(''):`<div style="font-size:13px;color:var(--text3);padding:8px 0">Sin citas programadas</div>`}
  </div>
  ${done.length?`<div class="card"><div class="card-title">Citas completadas</div>${done.slice().reverse().map(a=>{const d=new Date(a.date+'T12:00');return`<div class="row-item"><div class="appt-date-box"><div class="appt-day">${d.getDate()}</div><div class="appt-mon">${MONTHS[d.getMonth()]}</div></div><div style="flex:1"><div class="row-name">${esc(a.reason)}</div><div class="row-meta">${a.time}</div></div><span class="badge badge-green">Completada</span><button class="del-btn" style="margin-left:8px" onclick="delAppt(${a.id})">✕</button></div>`;}).join('')}</div>`:''}`;
}
function compAppt(id){const a=curPt.appointments.find(x=>x.id===id);if(a){a.status='completada';save();renderTab();}}
function delAppt(id){if(!confirm('¿Eliminar?'))return;curPt.appointments=curPt.appointments.filter(x=>x.id!==id);save();renderTab();}
function openAddAppt(){
  openModal(`<div class="modal-title">Nueva cita</div>
  <div class="form-row form-full"><div class="form-group"><label>Motivo *</label><input id="f_apr" placeholder="Control, limpieza, extracción..."></div></div>
  <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_apd" type="date" value="${today()}"></div><div class="form-group"><label>Hora</label><input id="f_apt" type="time" value="09:00"></div></div>
  <div class="modal-footer"><button class="btn-sec" onclick="closeModal()">Cancelar</button><button class="btn-primary" onclick="saveAppt()">Guardar</button></div>`);
}
function saveAppt(){const r=v('f_apr').trim();if(!r)return;curPt.appointments.push({id:uid(),reason:r,date:v('f_apd'),time:v('f_apt'),status:'pendiente'});save();closeModal();renderTab();}

function getDefaultWAMsg(){
  // Use Unicode escapes to avoid encoding issues with emojis in localStorage
  const wave='\uD83D\uDC4B';       // 👋
  const cal='\uD83D\uDCC5';        // 📅
  const clock='\uD83D\uDD50';      // 🕐
  const tooth='\uD83E\uDDB7';      // 🦷
  const hosp='\uD83C\uDFE5';       // 🏥
  const smile='\uD83D\uDE0A';      // 😊
  return `Hola {nombre} ${wave}\n\nLe recordamos que tiene una cita dental programada:\n\n${cal} Fecha: {fecha}\n${clock} Hora: {hora}\n${tooth} Motivo: {motivo}\n${hosp} {clinica}\n\nPor favor confirme su asistencia o avisenos con anticipacion si necesita reagendar.\n\n!Le esperamos! ${smile}`;
}

function buildWAMsg(appt, ptName){
  const clinica=document.getElementById('logoText').textContent;
  const template=localStorage.getItem('oa3_wamsg')||getDefaultWAMsg();
  return template
    .replace(/{nombre}/g, ptName)
    .replace(/{fecha}/g, fmtDate(appt.date))
    .replace(/{hora}/g, appt.time)
    .replace(/{motivo}/g, appt.reason||'Consulta dental')
    .replace(/{clinica}/g, clinica);
}

function enviarWA(phone, appt, ptName){
  if(!phone||phone.trim()===''){
    alert(ptName+' no tiene numero de telefono registrado.\nAgregalo en su ficha para poder enviar WhatsApp.');
    return;
  }
  let num=phone.replace(/[\s\-\(\)]/g,'');
  if(num.startsWith('0'))num='593'+num.slice(1);
  else if(!num.startsWith('+')&&!num.startsWith('593'))num='593'+num;
  num=num.replace('+','');
  const msg=buildWAMsg(appt,ptName);
  // Use wa.me with proper encoding
  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(msg),'_blank');
}
