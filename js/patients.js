/* ═══ PACIENTES — módulo con API propia (Patients) + buscador global (Search) ═══
   Reglas del módulo:
   • Un solo lugar define cómo es un paciente (blank) y cómo se valida (check): nuevo, editar y "convertir cita rápida" lo comparten.
   • El resto de la app crea/lee pacientes con  Patients.add / get / update / remove  en vez de tocar el arreglo a mano.
   • El HTML no lleva onclick: usa data-action (ver app.js). Ya no existen alias globales (selectPt, openNewPt…).
   • El ESTADO (la lista de pacientes y el paciente abierto) vive DENTRO de este módulo y es privado: se lee/cambia solo con
     Patients.all() / current() / setAll(lista) / setCurrent(p). */
const Patients=(function(){
  'use strict';
  var ARRAYS=['diary','treatments','payments','appointments','images','consents','recetas','presupuestos','odoHistory'];
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}   // "María" = "maria"
  var $=function(id){return document.getElementById(id);};

  /* ── datos (ESTADO PRIVADO del módulo: el resto de la app usa all/current/setAll/setCurrent) ── */
  var patients=[],curPt=null;
  function setAll(list){
    patients=Array.isArray(list)?list:[];if(curPt&&patients.indexOf(curPt)<0)curPt=null;
    if(assignFichas()>0&&typeof save==='function')save();   // pacientes antiguos o importados sin número de ficha
    return patients;
  }
  /* ── N.° DE FICHA: número corto y secuencial (1, 2, 3…) que identifica al paciente. Es lo ÚNICO que el registro de actividad anota de él. ──
     • Un paciente nuevo recibe el siguiente número (nunca se reutiliza el de uno eliminado: el registro seguiría apuntando a otra persona).
     • Pacientes antiguos: si su id es pequeño lo conservan como ficha; si no, reciben el siguiente número libre, por orden de creación.
     • Si dos dispositivos crean la misma ficha sin conexión, al sincronizar se conserva la del paciente más antiguo y la otra recibe un número nuevo
       (el cálculo es el mismo en todos los dispositivos, por eso convergen). */
  var MAXF=1e9;
  function okF(f){return typeof f==='number'&&isFinite(f)&&f>0&&f<MAXF&&Math.floor(f)===f;}
  function idNum(p){var n=Number(p.id);return isFinite(n)?n:Infinity;}
  function maxFicha(){var m=0;patients.forEach(function(p){if(p&&okF(p.ficha)&&p.ficha>m)m=p.ficha;});return m;}
  function nextFicha(){var f=Math.max(Counters.get('nextId'),maxFicha()+1);Counters.set('nextId',f+1);return f;}
  function assignFichas(){
    var list=patients.filter(function(p){return p&&typeof p==='object';}).sort(function(a,b){var x=idNum(a),y=idNum(b);return x!==y?(x<y?-1:1):(String(a.id)<String(b.id)?-1:1);});
    var used={},max=0,changed=0,pend=[];
    list.forEach(function(p){if(okF(p.ficha)&&!used[p.ficha]){used[p.ficha]=1;if(p.ficha>max)max=p.ficha;}else pend.push(p);});
    pend.forEach(function(p){
      var id=Number(p.id),f;
      if(okF(id)&&!used[id])f=id;
      else{f=Math.max(max,Counters.get('nextId')-1)+1;while(used[f])f++;}
      p.ficha=f;used[f]=1;if(f>max)max=f;changed++;
    });
    Counters.raiseTo('nextId',max+1);
    return changed;
  }
  function fichaOf(p){return p&&okF(p.ficha)?p.ficha:null;}
  function byFicha(n){n=Number(n);for(var i=0;i<patients.length;i++){if(patients[i]&&patients[i].ficha===n)return patients[i];}return null;}
  function setCurrent(p){curPt=p||null;return curPt;}
  function all(){return patients;}
  function get(id){for(var i=0;i<patients.length;i++){if(String(patients[i].id)===String(id))return patients[i];}return null;}
  function current(){return curPt;}
  function blank(f){
    var p={id:uid(),name:'',cedula:'',birthdate:'',phone:'',email:'',alergias:'',antecedentes:'',surfData:{},wholeData:{}};
    Object.assign(p,f||{});
    if(!okF(p.ficha))p.ficha=nextFicha();
    ARRAYS.forEach(function(k){if(!Array.isArray(p[k]))p[k]=[];});
    return p;
  }
  function readForm(){return {name:v('f_name'),cedula:v('f_ced'),birthdate:v('f_birth'),phone:v('f_phone'),email:v('f_email'),alergias:v('f_al'),antecedentes:v('f_ant')};}
  function check(f,opts){
    opts=opts||{};f=f||{};
    var c={name:String(f.name||'').replace(/\s+/g,' ').trim(),cedula:String(f.cedula||'').trim(),birthdate:String(f.birthdate||'').trim(),
      phone:String(f.phone||'').trim(),email:String(f.email||'').trim(),alergias:String(f.alergias||'').trim(),antecedentes:String(f.antecedentes||'').trim()};
    if(!c.name)return {ok:false,error:'El nombre es obligatorio'};
    if(c.name.length>120)return {ok:false,error:'El nombre es demasiado largo (máximo 120 caracteres)'};
    if(c.birthdate){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(c.birthdate)||isNaN(new Date(c.birthdate+'T12:00')))return {ok:false,error:'La fecha de nacimiento no es válida'};
      if(c.birthdate>today())return {ok:false,error:'La fecha de nacimiento no puede ser futura'};
    }
    if(c.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email))return {ok:false,error:'El correo electrónico no es válido'};
    var dup=null;
    if(c.cedula){for(var i=0;i<patients.length;i++){var o=patients[i];if(o.id!==opts.excludeId&&norm(o.cedula)===norm(c.cedula)){dup=o;break;}}}
    return {ok:true,clean:c,duplicate:dup};
  }
  function add(fields,extra){var p=blank(Object.assign({},fields,extra));patients.push(p);save();return p;}
  function update(id,fields){var p=get(id);if(!p)return null;Object.assign(p,fields);save();return p;}
  function remove(id){
    var p=get(id);if(!p)return false;
    patients.splice(patients.indexOf(p),1);
    if(curPt&&curPt===p)curPt=null;
    save();return true;
  }
  // Lee el formulario estándar (f_name…), valida, avisa si la cédula ya existe y crea. Devuelve el paciente o null.
  function addFromForm(extra){
    var r=check(readForm());
    if(!r.ok){alert(r.error);return null;}
    if(r.duplicate&&!confirm('Ya existe un paciente con esa cédula: '+r.duplicate.name+'.\n\n¿Crear otro de todos modos?'))return null;
    return api.add(r.clean,extra);
  }

  /* ── pantalla ── */
  function formHtml(p){
    p=p||{};var val=function(k){return esc(p[k]==null?'':p[k]);};
    return '<div class="form-row"><div class="form-group"><label>Nombre completo *</label><input id="f_name" value="'+val('name')+'" placeholder="Ej: Ana López"></div><div class="form-group"><label>Cédula / ID</label><input id="f_ced" value="'+val('cedula')+'"></div></div>'+
    '<div class="form-row"><div class="form-group"><label>Fecha de nacimiento</label><input id="f_birth" type="date" max="'+today()+'" value="'+val('birthdate')+'"></div><div class="form-group"><label>Teléfono</label><input id="f_phone" value="'+val('phone')+'" placeholder="0987-654-321"></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Email</label><input id="f_email" type="email" value="'+val('email')+'" placeholder="correo@ejemplo.com"></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Alergias</label><input id="f_al" value="'+val('alergias')+'" placeholder="Penicilina, látex..."></div></div>'+
    '<div class="form-row form-full"><div class="form-group"><label>Antecedentes médicos</label><textarea id="f_ant">'+val('antecedentes')+'</textarea></div></div>';
  }
  /* «12», «#12», «ficha 12» o «N° 12» encuentran la ficha número 12 */
  function fichaMatch(p,q){var m=/^\s*(?:ficha\s*)?(?:n\s*[°º]?\s*)?#?\s*(\d{1,9})\s*$/i.exec(String(q||''));return !!m&&p.ficha===Number(m[1]);}
  function renderList(){
    var box=$('ptList');if(!box)return;
    var inp=$('searchInput'),q=norm(inp?inp.value:'');
    box.innerHTML=patients.filter(function(p){return !q||norm(p.name).indexOf(q)>-1||norm(p.cedula).indexOf(q)>-1||fichaMatch(p,inp.value);}).map(function(p){
      return '<div class="sb-pt'+(curPt&&curPt.id===p.id?' active':'')+'" data-action="patients.select" data-id="'+esc(p.id)+'">'+
      '<div class="sb-av" style="background:'+ptColor(p.id)+'">'+esc(initials(p.name||'?'))+'</div>'+
      '<div><div class="sb-pt-name">'+esc(p.name)+'</div><div class="sb-pt-meta">'+(fichaOf(p)?'N° '+esc(fichaOf(p))+' · ':'')+calcAge(p.birthdate)+' años</div></div></div>';
    }).join('');
  }
  function badge(tip,label){return '<button class="ptw-alert-btn amber" data-on-mouseover="patients.alertTip" data-on-mouseout="patients.hideAlertTip" data-tip="'+tip+'">'+label+'</button>';}
  function renderHeader(p){
    var el=$('ptWinHeader');if(!el)return;
    var alergia=p.alergias&&!api.esNegativo(p.alergias),antec=p.antecedentes&&!api.esNegativo(p.antecedentes);
    var badges=(alergia?badge('alergia','⚠️ ALERGIA'):'')+(antec?badge('antec','🩺 ANTECEDENTES'):'');
    var btn=function(act,title,icon,extra){return '<button class="ptw-btn" title="'+title+'" aria-label="'+title+'" data-action="'+act+'"'+(extra||'')+'>'+icon+'</button>';};
    el.innerHTML='<div class="ptw-card"><div class="ptw-info"><div class="ptw-av">'+esc(initials(p.name||'?'))+'</div><div style="min-width:0">'+
      '<div class="ptw-name">'+esc(p.name)+'</div><div class="ptw-meta"><span>📁 N° '+esc(fichaOf(p)==null?'—':fichaOf(p))+'</span><span>·</span><span>🪪 '+esc(p.cedula||'Sin cédula')+'</span><span>·</span><span>📞 '+esc(p.phone||'Sin teléfono')+'</span><span>·</span><span>🎂 '+(p.birthdate?calcAge(p.birthdate):'—')+' años</span></div></div></div>'+
      (badges?'<div class="ptw-alerts-inline">'+badges+'</div>':'')+
      '<div class="ptw-actions">'+btn('patients.openEdit','Editar','✏️')+btn('ptw.addAppt','Cita','📅')+btn('ptw.addPay','Pago','💳')+btn('ptw.addReceta','Receta','💊')+
      btn('patients.openDelete','Eliminar','🗑️')+btn('app.showPage','Cerrar','✕',' data-page="dashboard"')+'</div></div>';
  }
  function select(id){
    var p=get(id);
    if(!p){console.error('Paciente no encontrado con ID:',id);return null;}
    curPt=p;curPage='patient';
    document.body.classList.add('pt-open');
    window._ptAlerts={alergia:p.alergias||'',antec:p.antecedentes||''};   // para los tooltips de alergias
    renderHeader(p);
    var tabsBar=$('tabsBar');if(tabsBar)tabsBar.style.display='flex';
    Ficha.tab('datos');                                                   // fija la pestaña, la resalta y la dibuja
    document.querySelectorAll('.sb-item').forEach(function(i){i.classList.remove('active');});
    renderList();
    return p;
  }
  function openNew(){
    openModal('<div class="modal-title">Nuevo paciente</div>'+formHtml()+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="patients.saveNew">Guardar</button></div>');
  }
  function saveNew(){
    var p=addFromForm();if(!p)return;
    closeModal();renderList();api.select(p.id);
  }
  function openEdit(){
    var p=curPt;if(!p)return;
    openModal('<div class="modal-title">Editar paciente</div>'+formHtml(p)+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="patients.saveEdit">Guardar</button></div>');
  }
  function saveEdit(){
    var p=curPt;if(!p)return;
    var r=check(readForm(),{excludeId:p.id});
    if(!r.ok){alert(r.error);return;}
    if(r.duplicate&&!confirm('Ya existe otro paciente con esa cédula: '+r.duplicate.name+'.\n\n¿Guardar de todos modos?'))return;
    api.update(p.id,r.clean);closeModal();api.select(p.id);
  }
  function openDelete(){
    var p=curPt;if(!p)return;
    var parts=[['pagos',p.payments],['tratamientos',p.treatments],['citas',p.appointments],['notas del diario',p.diary],['recetas',p.recetas],['presupuestos',p.presupuestos],['imágenes',p.images]]
      .filter(function(x){return x[1]&&x[1].length;}).map(function(x){return x[0]+': '+x[1].length;});
    var pagado=(p.payments&&p.payments.length)?resumenCuenta(p).pagado:0;
    openModal('<div class="modal-title">Eliminar paciente</div><p style="font-size:14px;color:var(--text2);margin-bottom:14px">¿Eliminar a <strong>'+esc(p.name)+'</strong>? Esta acción no se puede deshacer.</p>'+
      (parts.length?'<p style="font-size:13px;color:var(--text3);margin-bottom:'+(pagado>0?'8':'20')+'px">También se eliminará su historial → '+esc(parts.join(' · '))+'</p>':'')+
      (pagado>0?'<p style="font-size:13px;color:var(--red);margin-bottom:20px">Incluye '+money(pagado)+' en pagos registrados: dejarán de contar en Finanzas.</p>':'')+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary btn-danger" data-action="patients.confirmDelete">Sí, eliminar</button></div>');
  }
  function confirmDelete(){
    var p=curPt;
    if(p)api.remove(p.id);
    closeModal();renderList();showPage('dashboard');
  }
  // «No refiere», «niega», «ninguna»… no son una alerta: solo se destaca lo que de verdad hay que tener presente
  var NEGATIVOS=['no','no refiere','no refiere nada','nada','ninguna','ninguno','niega','sin alergias','sin alergias conocidas','sin antecedentes','sin antecedentes conocidos','sin','negativo','no conocido','no padece','sano','sana'];
  function esNegativo(txt){
    if(!txt)return true;
    var t=String(txt).trim().toLowerCase().replace(/[.\s]+$/,'');
    if(!t)return true;
    return NEGATIVOS.some(function(n){return t===n||t.indexOf(n+' ')===0;});
  }
  function alertTip(c){
    var d=window._ptAlerts||{},key=c.data.tip,txt=key==='alergia'?d.alergia:d.antec;
    if(!txt||esNegativo(txt))return;
    var tip=$('ptAlertTip');if(!tip){tip=document.createElement('div');tip.id='ptAlertTip';document.body.appendChild(tip);}
    tip.innerHTML=(key==='alergia'?'<strong>⚠️ ALERGIA:</strong> ':'<strong>🩺 ANTECEDENTES:</strong> ')+esc(txt);
    tip.style.display='block';
    var r=c.el.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(r.left,window.innerWidth-328))+'px';
    tip.style.top=(r.bottom+10)+'px';
  }
  function hideAlertTip(){var tip=$('ptAlertTip');if(tip)tip.style.display='none';}

  var api={all:all,setAll:setAll,assignFichas:assignFichas,nextFicha:nextFicha,fichaOf:fichaOf,byFicha:byFicha,fichaMatch:fichaMatch,setCurrent:setCurrent,get:get,current:current,blank:blank,check:check,readForm:readForm,add:add,update:update,remove:remove,addFromForm:addFromForm,
    formHtml:formHtml,renderList:renderList,select:select,openNew:openNew,saveNew:saveNew,openEdit:openEdit,saveEdit:saveEdit,openDelete:openDelete,confirmDelete:confirmDelete,
    alertTip:alertTip,hideAlertTip:hideAlertTip,esNegativo:esNegativo,norm:norm,ARRAYS:ARRAYS};
  return api;
})();

/* ═══ BUSCADOR GLOBAL (pacientes, diario, tratamientos, citas, recetas) ═══ */
const Search=(function(){
  'use strict';
  var activeIdx=-1,current=[];
  var norm=Patients.norm,$=function(id){return document.getElementById(id);};
  var GROUPS={patient:'👤 Pacientes',diary:'📝 Diario clínico',tx:'🦷 Tratamientos',appt:'📅 Citas',rx:'💊 Recetas'};
  // Todo lo que se muestra (label y sub) se escapa AQUÍ, al crear el resultado; render() lo inserta tal cual.
  function openAt(id,tab){return function(){Patients.select(id);if(tab)Ficha.tab(tab);};}
  function run(q){
    q=String(q||'').trim();
    if(!q){hide();return;}
    var nq=norm(q),dq=nq.replace(/\D/g,''),res=[];
    Patients.all().forEach(function(p){
      var name=esc(p.name);
      if(norm(p.name).indexOf(nq)>-1||norm(p.cedula).indexOf(nq)>-1||norm(p.phone).indexOf(nq)>-1||Patients.fichaMatch(p,q)||(dq.length>=3&&String(p.phone||'').replace(/\D/g,'').indexOf(dq)>-1)){
        res.push({type:'patient',icon:'👤',iconBg:'#dbeafe',label:name,sub:(Patients.fichaOf(p)?'Ficha N° '+esc(Patients.fichaOf(p))+' · ':'')+'CI: '+esc(p.cedula||'—')+' · '+calcAge(p.birthdate)+' años · '+esc(p.phone||'sin teléfono'),action:openAt(p.id)});
      }
      (p.diary||[]).forEach(function(n){
        if(norm(n.title).indexOf(nq)>-1||norm(n.body).indexOf(nq)>-1)
          res.push({type:'diary',icon:'📝',iconBg:'#f0fdf4',label:esc(n.title||'Nota'),sub:name+' · '+fmtDate(n.date),action:openAt(p.id,'diario')});
      });
      (p.treatments||[]).forEach(function(t){
        if(norm(t.name).indexOf(nq)>-1)
          res.push({type:'tx',icon:'🦷',iconBg:'#f0e7d8',label:esc(t.name),sub:name+' · '+fmtDate(t.date)+' · '+money(t.cost),action:openAt(p.id,'tratamientos')});
      });
      (p.appointments||[]).forEach(function(a){
        if(norm(a.reason).indexOf(nq)>-1||norm(fmtDate(a.date)).indexOf(nq)>-1)
          res.push({type:'appt',icon:'📅',iconBg:'#ede9fe',label:esc(a.reason||'Cita'),sub:name+' · '+fmtDate(a.date)+' '+esc(a.time||''),action:openAt(p.id,'citas')});
      });
      (p.recetas||[]).forEach(function(r){
        if(norm(r.diagnostico).indexOf(nq)>-1||norm(r.medico).indexOf(nq)>-1)
          res.push({type:'rx',icon:'💊',iconBg:'#fce7f3',label:'Receta N° '+String(r.id).padStart(6,'0'),sub:name+' · '+fmtDate(r.fecha)+' · '+esc(r.diagnostico||''),action:openAt(p.id,'recetas')});
      });
    });
    (Appts.quick()||[]).forEach(function(a){
      if(norm(a.ptName).indexOf(nq)>-1||norm(a.reason).indexOf(nq)>-1)
        res.push({type:'appt',icon:'📅',iconBg:'#f0e7d8',label:esc(a.ptName),sub:'Cita rápida · '+fmtDate(a.date)+' '+esc(a.time||'')+' · '+esc(a.reason||''),action:function(){showPage('agenda');}});
    });
    activeIdx=-1;render(res,q);
  }
  function render(res,q){
    var box=$('searchResults');if(!box)return;
    if(!res.length){box.innerHTML='<div class="sr-empty">Sin resultados para "<strong>'+esc(q)+'</strong>"</div>';box.classList.add('open');current=[];return;}
    var grouped={},html='',idx=0;current=[];
    res.slice(0,20).forEach(function(r){(grouped[r.type]=grouped[r.type]||[]).push(r);});
    Object.keys(GROUPS).forEach(function(type){
      if(!grouped[type])return;
      html+='<div class="sr-label">'+GROUPS[type]+'</div>';
      grouped[type].forEach(function(r){
        current[idx]=r;   // mismo orden en que se muestran
        html+='<div class="sr-item" data-idx="'+idx+'" data-on-mousedown="search.go"><div class="sr-icon" style="background:'+r.iconBg+'">'+r.icon+'</div>'+
          '<div style="flex:1;min-width:0"><div class="sr-main">'+r.label+'</div><div class="sr-sub">'+r.sub+'</div></div></div>';
        idx++;
      });
      html+='<div class="sr-divider"></div>';
    });
    box.innerHTML=html;box.classList.add('open');
  }
  function show(){var b=$('searchResults');if(b&&b.innerHTML)b.classList.add('open');}
  function hide(){var b=$('searchResults');if(b)b.classList.remove('open');activeIdx=-1;}
  function hideSoon(){setTimeout(hide,200);}
  function go(idx){
    var r=current[idx];
    if(!r)return;
    r.action();hide();
    var gs=$('globalSearch');if(gs){gs.value='';gs.blur();}
  }
  function keyNav(e){
    var box=$('searchResults'),items=box?box.querySelectorAll('.sr-item'):[];
    if(!items.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();activeIdx=Math.min(activeIdx+1,items.length-1);}
    else if(e.key==='ArrowUp'){e.preventDefault();activeIdx=Math.max(activeIdx-1,0);}
    else if(e.key==='Enter'){e.preventDefault();if(activeIdx>=0)go(activeIdx);return;}
    else if(e.key==='Escape'){hide();var g=$('globalSearch');if(g)g.blur();return;}
    items.forEach(function(el,i){
      el.classList.toggle('sr-active',i===activeIdx);
      if(i===activeIdx&&el.scrollIntoView)el.scrollIntoView({block:'nearest'});
    });
  }
  document.addEventListener('keydown',function(e){   // Ctrl+K / Cmd+K enfoca el buscador
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();var i=$('globalSearch');if(i){i.focus();i.select();}}
  });
  return {run:run,show:show,hide:hide,hideSoon:hideSoon,go:go,keyNav:keyNav};
})();

/* ═══ Acciones del módulo (reemplazan los onclick del HTML) ═══ */
App.actions({
  'patients.select':function(c){Patients.select(c.id);},
  'patients.openNew':function(){Patients.openNew();},
  'patients.saveNew':function(){Patients.saveNew();},
  'patients.openEdit':function(){Patients.openEdit();},
  'patients.saveEdit':function(){Patients.saveEdit();},
  'patients.openDelete':function(){Patients.openDelete();},
  'patients.confirmDelete':function(){Patients.confirmDelete();},
  'patients.filter':function(){Patients.renderList();},
  'patients.alertTip':function(c){Patients.alertTip(c);},
  'patients.hideAlertTip':function(){Patients.hideAlertTip();},
  // botones de la ficha que abren pantallas de módulos aún no migrados
  'ptw.addAppt':function(){Agenda.openAdd();},
  'ptw.addPay':function(){Finance.openAddPay();},
  'ptw.addReceta':function(){Prescriptions.openNew();},
  'search.run':function(c){Search.run(c.value);},
  'search.keyNav':function(c){Search.keyNav(c.event);},
  'search.show':function(c){if(c.el.value)Search.show();},
  'search.hideSoon':function(){Search.hideSoon();},
  'search.go':function(c){Search.go(Number(c.data.idx));}
});
