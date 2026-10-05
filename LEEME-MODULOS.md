# Cómo se organiza un módulo (convención)

Pacientes es el primer módulo migrado (`js/patients.js`). Los demás siguen igual hasta que les toque.

## 1. Eventos sin `onclick`
En el HTML se declara *qué* se quiere; un solo oyente (`js/app.js`) lo ejecuta:

    <button data-action="patients.select" data-id="12">…</button>      ← clic
    <input  data-on-input="search.run">                                 ← otros eventos

Eventos disponibles: `data-action` (clic), `data-on-input`, `-change`, `-keydown`, `-focusin`, `-focusout`,
`-mousedown`, `-mouseover`, `-mouseout` (estos dos se comportan como *enter/leave*).
Cada acción recibe `ctx = { el, event, id, data, value }` (`id` ya viene como número si lo es).

    App.actions({ 'patients.select': c => Patients.select(c.id) });

**Regla:** los textos del usuario nunca van dentro de código JavaScript en un atributo; van en `data-*` escapados con `esc()`.

## 2. Una API por módulo
`Patients` es la única que crea, valida, cambia y elimina pacientes. El resto de la app usa
`Patients.add / get / update / remove / check` en vez de tocar el arreglo `patients` a mano.
Dentro del módulo, las llamadas entre funciones públicas van por `api.xxx` (no por la función local)
para que las auditorías del PIN (`hookOn(Patients,'select',…)` en `security.js`) las vean siempre.

## 3. Compatibilidad mientras se migra
Los nombres antiguos (`selectPt`, `openNewPt`…) siguen existiendo como alias que llaman a `Patients.*` en el momento
de usarse. Cuando ningún otro módulo los use, se borran del final de `patients.js`.

## 4. Para migrar el siguiente módulo
1. Crear su namespace (`const Finance = (function(){ … })()`) con funciones públicas y un `check()` de validación.
2. Cambiar cada `onclick="f(x)"` de sus plantillas por `data-action` y registrar las acciones con `App.actions`.
3. Dejar alias con los nombres viejos y cambiar los `hook(...)` de `security.js` a `hookOn(Modulo,'funcion',…)`.
4. Escribir `tests/<modulo>.test.js` que haga las acciones **por clic**, no llamando a las funciones.
