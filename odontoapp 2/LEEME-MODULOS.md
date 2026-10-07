# Cómo se organiza un módulo (convención)

Módulos migrados: **Pacientes** (`js/patients.js`) y **Finanzas** (`js/finance.js`). Los demás siguen igual hasta que les toque.

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

## 5. Lo aprendido migrando Finanzas
- **Separa "calcular" de "mostrar".** Las plantillas largas (comprobante, informes) son funciones que *devuelven* el HTML
  (`Finance.receiptHtml`, `monthlyReportHtml`…); abrir la ventana o descargar va aparte. Así se prueban sin abrir nada.
- **Una sola consulta por concepto.** "Qué entró y salió en un mes" estaba copiada 4 veces; ahora es `Finance.monthData(m, y)`.
- **Valida al guardar, no al mostrar.** Un pago sin fecha válida suma en el saldo del paciente pero no aparece en ningún mes:
  `Finance.checkPayment / checkExpense` lo impiden, y `Finance.dataIssues()` detecta los que ya existían.
- **Toda operación destructiva debe tener su inversa o su aviso.** Eliminar un resumen mensual dejaba sus movimientos
  archivados para siempre; ahora es `Finance.reopenMonth`, que los devuelve.
- **Escapa también lo que genera ventanas aparte.** Un comprobante se abre con el origen de la app: lo que se escriba ahí
  (nombres, RUC, tratamientos) debe pasar por `esc()`.

## 6. Regla de seguridad para todo el código nuevo
**Todo texto que escribe una persona y se dibuja como HTML pasa por `esc()`** (y dentro de un `onclick="f('…')"`, por `jsq()`).
Incluye lo que parece inofensivo: datos de la clínica (RUC, logo, dirección), listas editables (medicamentos, servicios) y
los textos de las ventanas de impresión, que se abren con el origen de la app.

`tests/xss.test.js` lo verifica solo: siembra datos hostiles en todos los textos libres y recorre **toda** función cuyo nombre
empiece por `render`, `ver`, `open`, `edit`, `show`, `view`, `abrir` o `imprimir`, exigiendo 0 elementos inyectados.
Por eso conviene nombrar así las funciones que dibujan algo: las de otro nombre quedan fuera del barrido.
También comprueba que el texto normal (con & ' " <) se vea bien, sin doble escapado.
