# Cómo se organiza un módulo (convención)

Módulos migrados: **Pacientes** (`js/patients.js`), **Finanzas** (`js/finance.js`), **Clínica** (`js/clinical.js`: `Consents`, `Cie10`, `Prescriptions`, `Quotes`) **Ficha** (`js/chart.js`: `Ficha`, `Diary`, `Odonto`, `Treatments`, `Images`) **Agenda** (`js/agenda.js`: `Appts`, `Agenda`) y **UI** (`js/ui.js`: `Nav`, `Dashboard`, `Settings`, `Services`, `Meds`, `Logo`). **Nube** (`js/sync.js`: `Cloud`, la conexión y su panel). **Seguridad** (`js/security.js`: PIN, bloqueo, registro). **Respaldos** (`js/backup.js`: `Backup`). **Recordatorios** (`js/recalls.js`: `Recalls`). **Migración completa:** `patients`/`curPt` son estado privado de `Patients` y ya no hay alias globales.

## 1. Eventos sin `onclick`
En el HTML se declara *qué* se quiere; un solo oyente (`js/app.js`) lo ejecuta:

    <button data-action="patients.select" data-id="12">…</button>      ← clic
    <input  data-on-input="search.run">                                 ← otros eventos

Eventos disponibles: `data-action` (clic), `data-on-input`, `-change`, `-keydown`, `-focusin`, `-focusout`,
`-mousedown`, `-mouseover`, `-mouseout`, `-dragover`, `-dragleave`, `-drop` (mouseover/out y dragleave se comportan como *enter/leave*).
Cada acción recibe `ctx = { el, event, id, data, value }` (`id` ya viene como número si lo es).

    App.actions({ 'patients.select': c => Patients.select(c.id) });

**Regla:** los textos del usuario nunca van dentro de código JavaScript en un atributo; van en `data-*` escapados con `esc()`.

## 2. Una API por módulo
`Patients` es la única que crea, valida, cambia y elimina pacientes. El resto de la app usa
`Patients.add / get / update / remove / check` en vez de tocar el arreglo `patients` a mano.
Dentro del módulo, las llamadas entre funciones públicas van por `api.xxx` (no por la función local)
para que las auditorías del PIN (`hookOn(Patients,'select',…)` en `security.js`) las vean siempre.

## 3. Sin alias globales
Ya no existen los nombres antiguos (`selectPt`, `openNewPt`, `savePay`…): se llama siempre al módulo (`Patients.select`, `Finance.savePay`…). Lo único global que queda es el armazón (`showPage`, `openModal`, `closeModal`, `renderConfiguracion`, `save`, `esc`, `uid`, `today`, `money`…). `tests/arquitectura.test.js` lo vigila: si alguien vuelve a crear un alias o a tocar `patients`/`curPt` directamente, la prueba falla.

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

## 7. Lo aprendido migrando Clínica
- **Una operación que cambia de estado necesita su guarda de estado.** Aprobar o rechazar un presupuesto solo vale desde `borrador`;
  si no, la doble acción (o el mismo presupuesto desde otro dispositivo) duplica tratamientos y deuda. Lo mismo con firmar un
  consentimiento: una segunda firma no pisa la primera.
- **Un `confirm()` cuyo «Cancelar» sigue adelante es una trampa.** Se reemplazó por un formulario con casilla.
- **Una pantalla que lee un campo debe tenerlo.** El formulario de receta leía un campo «Concentración» que no existía.
- **Lo que se borra puede tener dependientes.** Eliminar un presupuesto aprobado dejaba sus tratamientos huérfanos sumando a la
  deuda: ahora se ofrece eliminarlos (solo los pendientes; nunca los ya realizados).
- **Un solo almacén por dato.** El CIE-10 se guardaba en localStorage y en IndexedDB con dos importadores; hoy es uno
  (`Cie10.load()` migra lo antiguo y libera el espacio).
- **Los constructores de filas también son superficie de ataque** (`addPresupItem`, `addMedItem`, listas de sugerencias):
  no empiezan por `render/ver/open`, así que `xss.test.js` los prueba por nombre.
- **Al extraer funciones con un script, comprobar que no se cortaron** (una función anidada con `}` en la columna 0 engaña a un
  extractor ingenuo): el ensamblador verifica llaves balanceadas.

## 8. Lo aprendido migrando la Ficha
- **Primero cambia el dato, después dibuja.** Al guardar un tratamiento la lista se dibujaba antes de vincularlo con el odontograma,
  y la etiqueta «vinculado» no aparecía hasta el siguiente redibujo. Regla: operación → `save()` → `Ficha.render()` al final.
- **Una foto no es editable.** El registro guardado del odontograma reutilizaba el dibujo interactivo: tocar una zona editaba el
  odontograma *actual*. `Odonto.toothSvg(…, interactive)` solo es clicable en la pantalla viva.
- **Fija el paciente antes de una operación asíncrona.** `Images.upload(files, p)` recibe el paciente al empezar; si se cambia de
  ficha durante la subida, la imagen no se mezcla con otro paciente.
- **Un clic no debe destruir datos en silencio.** Marcar una superficie en un diente con símbolo completo (o al revés) pregunta antes.
- **Valida lo que parece libre.** Fechas reales y no futuras en notas clínicas; costo negativo se rechaza (antes se volvía 0);
  «36 y 37» avisa que no se vinculará (antes se guardaba sin vínculo).
- **Lo que viene de un respaldo no es de fiar.** `Images.safeSrc` solo deja pasar `data:image/…;base64,…` al atributo `src`.
- **Borra el código muerto.** `renderPtHeader`, `openApptFromPt`, `saveApptFromPt` y `openRecetaFromPt` no se llamaban desde ningún lado.

## 9. Lo aprendido migrando la Agenda
- **Un solo almacén.** Las citas rápidas vivían en `localStorage` (`oa3_qa`) fuera de `save()`: no llegaban a IndexedDB ni a la nube, y `saveNow` ni siquiera incluía `quickAppts` en el paquete. Ahora todo pasa por `save()`; `Appts.adoptLegacy()` adopta la copia vieja una sola vez (marca `oa3_qa_ok`).
- **`Appts.check()` devuelve `{ok, clean, error, warnings}`.** Los errores bloquean (nombre, motivo, fecha, hora, estado); los avisos se confirman (fecha pasada, doble reserva).
- **Rejillas que no esconden datos.** La vista Semana amplía sus filas para cubrir citas fuera de 07–19 h; nunca se descarta una cita por no caber.
- **Teléfonos.** `waNumber()` normaliza (09… → 593…, +/00 internacional, quita letras y puntos) y rechaza lo demasiado corto o largo.
- **`String.replace` con datos del usuario:** usar siempre función como reemplazo (`s.replace(re, () => valor)`), porque `$&` y `$1` en un nombre se interpretan.
- **Marcar solo lo que ocurrió:** «recordado» se guarda únicamente si el navegador abrió la ventana de WhatsApp.

## 10. Lo aprendido migrando la UI
- **Un dato, una sola puerta.** Servicios y medicamentos tienen su API (`Services.check/add/update/remove`, `Meds.check/add/remove`). Los servicios se identifican por `id`, no por posición en la lista; los medicamentos por su nombre (viaja en `data-name` escapado).
- **Todo lo que se guarda en un lado debe guardarse en el otro.** Los medicamentos vivían solo en `localStorage`: ahora van también en el paquete de IndexedDB (`meds`) y su alta/baja llama a `save()`.
- **Imágenes de usuario:** el logo solo se acepta como `data:image/png|jpeg|webp|gif;base64,…` (`Logo.isSafeSrc`), máximo 2 MB, y se pinta con `createElement('img')`, nunca con texto. Esto cubre también los respaldos y la nube, que son entrada no confiable.
- **Redibujar sin borrar lo escrito:** `Settings.refresh()` guarda los campos de la página, la vuelve a dibujar y los restaura (más el scroll). Los campos que se acaban de usar se pasan en `refresh([ids])` para vaciarlos.
- **Una sola pantalla de configuración.** El cuadro `openLogoEdit` duplicaba la página; ahora el logo del menú lleva a la página (`openLogoEdit` queda como alias).
- **Relojes y temporizadores:** solo corren mientras su elemento existe (`startClock` se reanuda al entrar a la página).
- **Formularios con `type=number`:** el navegador ya descarta letras y comas antes de que lleguen al código; la validación real vive en `check()`, que se prueba directo.
- **Avisos que se confirman:** `check()` devuelve `warnings`; la pantalla los junta en un solo `confirm()` (RUC que no termina en 001, nombre de servicio repetido, variables de WhatsApp mal escritas, N° de receta ya usado).

## 11. Lo aprendido migrando la Nube (sync.js)
- **Validar sin red, conectar con red.** `Cloud.checkConnect()` no toca internet (URL, clave, correo, ID anterior); `Cloud.connect()` hace el trabajo; `Cloud.connectUI()` solo lee el formulario y muestra el resultado.
- **Un intento fallido no puede romper lo que ya funcionaba.** `connect()` guarda la conexión anterior y la restaura si algo falla; la conexión nueva solo se adopta al final. Si ya se había iniciado sesión con otra cuenta, esa sesión se cierra y la anterior pide volver a entrar.
- **Nunca aceptar claves secretas en el navegador.** Se rechazan `service_role` (se lee el rol del JWT) y `sb_secret_…`.
- **Probar contra un servidor falso.** `tests/cloud.test.js` trae un Supabase en memoria (cuentas, clínicas, `sync_records` con control de versión y error 23505) y usa varias ventanas como si fueran varios dispositivos. No reemplaza `sync.pg.test.js` (PostgreSQL real), pero sí cubre la pantalla y los flujos.
- **`index.html` quedó sin ningún `onclick`:** los botones de respaldo/importación usan `backup.email` / `backup.import` (ahora registrados en `backup.js`) y el de la nube usa `cloud.open`.

## 12. Lo aprendido migrando Seguridad (security.js)
- **Una configuración se reemplaza entera o no se toca.** `fijarPin()` calcula sal y hash nuevos en variables locales y solo al final reemplaza `cfg`. Antes, si el navegador fallaba a mitad de camino, quedaba sal nueva con hash viejo y ni el PIN anterior entraba.
- **Reglas de PIN en un solo lugar:** `Seguridad.validarPin(a, b)` devuelve `{ok, error}` y lo usan activar, cambiar y recuperar. Rechaza no numéricos, distintos, repetidos, consecutivos, pares repetidos (1212) y una lista corta de PIN comunes (2580…).
- **Acciones sensibles con guardia de reentrada.** `intentarEntrar()` ignora un segundo Enter mientras verifica; antes dos Enter seguidos contaban dos intentos fallidos.
- **Entradas numéricas de configuración se validan contra una lista** (`setAuto` solo acepta 0, 5, 10 o 30), porque el valor llega del DOM.
- **Los botones de los modales declaran su acción** (`data-action="security.saveChange"`) y los campos llevan `data-on-keydown="security.modalKey"` con `data-go` para que Enter ejecute la misma acción.
- **Los fallos del portapapeles se dicen** (`✓ Copiado` / «cópialo a mano»), nunca en silencio: el código de recuperación es la única vía si se olvida el PIN.
- **La pantalla de bloqueo ya no usa `addEventListener` propio**: todo pasa por el oyente único de `app.js`; el bloqueo sigue frenando atajos porque su captura corre antes.

## 13. Lo aprendido migrando Respaldos (backup.js, sacado de core.js)
- **Un solo camino para reemplazar datos.** Importar archivo, nube antigua, historial en la nube, copia local y «deshacer» terminan todos en `Backup.replaceAll(raw, motivo)`: `normalize` (valida) → copia de lo actual (`pre_restore`) → `apply`. Antes había tres rutas distintas, sin validar y sin copia previa.
- **`Backup.normalize(raw)` entiende todos los formatos** (archivo, nube antigua `clinica.nombre`, historial, copia diaria `logo.text/prof/color`), descarta registros que no son objetos, arregla ids repetidos y nombres vacíos, ignora logo/color peligrosos y devuelve `warnings` que se muestran en el `confirm`.
- **Los contadores nunca bajan de lo que ya existe** (`nextId`, `nextFactId`, `nextRecetaId`…): se calculan como el máximo entre el valor del archivo y el mayor id pequeño presente (los ids grandes de `uid()` no cuentan).
- **El archivo exportado incluye todo:** logo, color, medicamentos y contadores. La URL del blob se revoca a los 10 s (revocar al instante cancela la descarga en algunos navegadores).
- **Deshacer siempre disponible:** «⬇ Backup» muestra «Deshacer última restauración»; deshacer también guarda lo que había (se puede volver a cambiar de opinión).
- **Copias automáticas locales visibles:** el modal lista las últimas 5 con «Descargar» y «Restaurar».
- **Historial en la nube:** todo texto de la base de datos (`nota`, `version`) va escapado y el botón lleva `data-id`; ya no se arma código JS con datos.
- **Restablecer de fábrica borra también las copias** (`Backup.wipeCopies()`: copias diarias, copia previa, imágenes originales).
- **Auditoría:** `security.js` anota con `hookOn(Backup, …)`; por eso `importUI` llama a `Backup.importFile` (no a la función interna), para que el gancho lo vea.
- **Alias mantenidos:** `exportarDatos`, `importarDatos`, `prepararEmailBackup`, `abrirCorreoBackup`, `descargarBackupLocal`, `crearBackupHistorico`, `mostrarHistorialRespaldos`, `restaurarDesdeHistorial`, `sbLoadNow`.

## 14. Lo aprendido migrando Recordatorios (recalls.js) y la privacidad del registro
- **`Recalls`** es la API (`sendWA, markContacted, postpone, noContact, reactivate, setTab, setCfg, view`); los botones usan `recalls.*` con `data-id`, `data-days`, `data-tab`, `data-key`. Los nombres antiguos (`enviarRecallWA`, `marcarContactado`…) son alias que pasan por `Recalls`, así la auditoría los ve igual.
- **Datos que pueden venir raros:** citas/tratamientos `null` o pacientes no-objeto se ignoran en `calcularRecalls` (antes rompía toda la pantalla). Los ids se comparan como texto (`String(a)===String(b)`), por si un respaldo trae ids de texto. `setCfg` solo acepta claves de `RC_DEF` y números 1–120; las pestañas se validan contra `Recalls.TABS`.
- **El registro de actividad no guarda nombres (LOPDP).** Todo evento sobre un paciente anota «Ficha N° <id>». Para altas (`Creó paciente`, `Creó paciente desde una cita rápida`) el detalle se calcula DESPUÉS de la acción (`hookOn` acepta que `describir` devuelva una función). Los registros antiguos con nombres se limpian una vez (`Seguridad._limpiarNombres`, marca `oa3_audit_fichas`): el nombre pasa a ficha si es único y existe; si no, queda «(paciente no identificado)». **Regla para hooks nuevos:** usar `ptName()`/`nom(id)` (devuelven la ficha) y agregar el evento a `EV_PACIENTE`.

## 15. Estado privado y fin de los alias (v21)
- **El estado de pacientes vive dentro de `Patients`.** Se lee con `Patients.all()` (la misma lista, no una copia) y `Patients.current()`; se cambia con `Patients.setAll(lista)` y `Patients.setCurrent(p)`. `setAll` descarta cualquier cosa que no sea lista y cierra el paciente abierto si ya no está en la lista nueva (antes quedaba un «fantasma» tras restaurar un respaldo o sincronizar).
- **Un módulo nuevo no necesita saber dónde se guarda nada:** `Patients.all().forEach(...)`, `Patients.current()` y listo. Las demás listas (`egresos`, `facturas`, `quickAppts`…) siguen siendo variables de `core.js`; cuando toque, se encapsulan igual.
- **Las pruebas también usan la API** (`E('Patients.all()[0]')`), así que prueban lo mismo que usa la app.
- **El barrido de inyecciones (`xss.test.js`) ahora recorre los métodos de 21 módulos** (79 funciones de dibujo; antes dependía de nombres globales y llegaba a ~50).
- **Regla para hooks de auditoría:** `hookOn(Modulo,'metodo',…)`; ya no hay nombres globales que enganchar.
