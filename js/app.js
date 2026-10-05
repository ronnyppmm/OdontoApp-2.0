/* ═══ APP — registro de acciones y delegación de eventos ═══
   En vez de escribir  onclick="selectPt(12)"  dentro del HTML, el HTML declara QUÉ quiere y un único oyente lo ejecuta:

       <div data-action="patients.select" data-id="12">…</div>

   • Clic            →  data-action="modulo.accion"
   • Otros eventos   →  data-on-input, data-on-change, data-on-keydown, data-on-focusin, data-on-focusout,
                        data-on-mousedown, data-on-mouseover, data-on-mouseout   (mouseover/out se comportan como enter/leave)
   • Datos           →  data-id (se convierte a número si lo es), cualquier data-*; value del campo en ctx.value
   Ventajas: los textos del usuario viajan en atributos escapados (no dentro de código JavaScript), un error en una acción
   no rompe a las demás, y cada módulo declara sus acciones en un solo lugar:  App.actions({ 'modulo.accion': ctx => … })  */
const App=(function(){
  'use strict';
  var reg=Object.create(null);
  var EVENTS=['click','input','change','keydown','focusin','focusout','mousedown','mouseover','mouseout'];

  function parseId(raw){
    if(raw===undefined||raw===null)return undefined;
    if(/^-?\d+$/.test(raw)){var n=Number(raw);if(Number.isSafeInteger(n))return n;}
    return raw;
  }
  function makeCtx(el,e){
    var d=el.dataset||{},t=e&&e.target;
    return {el:el,event:e,data:d,id:parseId(d.id),value:(t&&t.value!==undefined)?t.value:undefined};
  }
  function run(name,ctx){
    var fn=reg[name];
    if(!fn){console.warn('Acción no registrada:',name);return;}
    try{return fn(ctx);}catch(err){console.error('Error en la acción "'+name+'":',err);}
  }
  function actions(map){
    Object.keys(map).forEach(function(k){
      if(typeof map[k]!=='function')throw new Error('La acción "'+k+'" no es una función');
      reg[k]=map[k];
    });
  }
  EVENTS.forEach(function(type){
    var attr=type==='click'?'data-action':'data-on-'+type;
    document.addEventListener(type,function(e){
      var el=e.target&&e.target.closest?e.target.closest('['+attr+']'):null;
      if(!el)return;
      if((type==='mouseover'||type==='mouseout')&&e.relatedTarget&&el.contains(e.relatedTarget))return;   // equivale a mouseenter/mouseleave
      run(el.getAttribute(attr),makeCtx(el,e));
    });
  });

  // Acciones generales (disponibles para cualquier módulo)
  actions({
    'app.closeModal':function(){closeModal();},
    'app.showPage':function(c){showPage(c.data.page);}
  });
  return {actions:actions,has:function(n){return !!reg[n];},list:function(){return Object.keys(reg).sort();},dispatch:function(name,ctx){return run(name,ctx||{data:{}});}};
})();
