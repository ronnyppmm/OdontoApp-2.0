/* ═══ CLÍNICA — consentimientos, CIE-10, recetas y presupuestos ═══
   Cuatro módulos con API propia (Consents, Cie10, Prescriptions, Quotes):
   • La lógica (crear, validar, firmar, aprobar, eliminar) vive en funciones sin pantalla y se prueba por separado.
   • Todo documento que se imprime se genera con una función que DEVUELVE el HTML (printHtml / rxHtml…).
   • El HTML no lleva onclick: usa data-action (ver app.js). Ya no existen alias globales: se llama siempre al módulo (Prescriptions.saveNew, Quotes.view…). */

const CONSENT_TEMPLATES=[
  {id:'extraccion',titulo:'Extracción Dental',icono:'🦷',
   texto:`CONSENTIMIENTO INFORMADO PARA EXTRACCIÓN DENTAL\n\nYo, el/la paciente o su representante legal, declaro que el/la profesional odontólogo/a me ha informado de manera clara y comprensible sobre:\n\n1. PROCEDIMIENTO: La extracción dental consiste en la remoción quirúrgica del diente o sus fragmentos del alvéolo dental.\n\n2. ALTERNATIVAS: El profesional me ha explicado otras opciones terapéuticas posibles antes de tomar la decisión de extraer la pieza.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Dolor e inflamación postoperatoria\n   • Sangrado prolongado\n   • Infección del alvéolo (alveolitis)\n   • Lesión de nervios adyacentes (parestesia temporal o permanente)\n   • Apertura al seno maxilar (en extracciones superiores)\n   • Fractura de raíces o del hueso alveolar\n   • Trismus (dificultad para abrir la boca)\n\n4. CUIDADOS POSTOPERATORIOS: Me han sido explicados los cuidados necesarios tras el procedimiento.\n\n5. ANESTESIA LOCAL: Se utilizará anestesia local, con los riesgos inherentes a la misma.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para que se realice el procedimiento indicado.`},

  {id:'endodoncia',titulo:'Endodoncia / Tratamiento de Conductos',icono:'⚕️',
   texto:`CONSENTIMIENTO INFORMADO PARA ENDODONCIA\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento endodóntico (tratamiento de conductos) consiste en la eliminación del tejido pulpar infectado o necrótico del interior del diente, la limpieza, conformación y obturación del sistema de conductos radiculares.\n\n2. OBJETIVO: Conservar el diente en boca, eliminando la infección y previniendo su propagación.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Fractura de instrumentos endodónticos en el interior del conducto\n   • Perforación radicular o de la cámara pulpar\n   • Sobreobturación del material de relleno\n   • Fractura vertical de la raíz\n   • Fallo del tratamiento que requiera retratamiento o extracción\n   • Dolor e inflamación temporal después del procedimiento\n   • Reacción alérgica a los materiales utilizados\n\n4. SESIONES: El tratamiento puede requerir una o varias sesiones clínicas.\n\n5. RESTAURACIÓN POSTERIOR: Tras la endodoncia, el diente requiere una restauración adecuada (corona u obturación) para protegerlo.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la realización del tratamiento endodóntico.`},

  {id:'anestesia',titulo:'Anestesia Local',icono:'💉',
   texto:`CONSENTIMIENTO INFORMADO PARA ANESTESIA LOCAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre la administración de anestesia local en el ámbito odontológico:\n\n1. PROCEDIMIENTO: La anestesia local consiste en la inyección de un fármaco anestésico (generalmente articaína o lidocaína con vasoconstrictor) para bloquear temporalmente la sensibilidad en el área de trabajo.\n\n2. EFECTOS ESPERADOS: Adormecimiento de la zona tratada durante el procedimiento, que puede extenderse varias horas después.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Hematoma en el sitio de punción\n   • Lesión temporal del nervio (parestesia)\n   • Reacción alérgica o tóxica al anestésico\n   • Taquicardia o palpitaciones por el vasoconstrictor\n   • Síncope vasovagal (desmayo)\n   • Trismus temporal\n   • Necrosis isquémica (muy rara)\n\n4. PRECAUCIONES ESPECIALES: He informado al profesional sobre mis antecedentes médicos, alergias, medicamentos actuales, enfermedades cardiovasculares, diabetes, embarazo u otras condiciones relevantes.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la administración de anestesia local.`},

  {id:'implante',titulo:'Implante Dental',icono:'🔩',
   texto:`CONSENTIMIENTO INFORMADO PARA IMPLANTE DENTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El implante dental es un dispositivo de titanio que se inserta quirúrgicamente en el hueso maxilar o mandibular para reemplazar la raíz de un diente perdido.\n\n2. FASES:\n   • Fase quirúrgica: colocación del implante en el hueso\n   • Período de oseointegración (3-6 meses)\n   • Fase protésica: colocación de la corona sobre el implante\n\n3. RIESGOS Y COMPLICACIONES:\n   • Infección postquirúrgica\n   • Fracaso de la oseointegración\n   • Lesión de nervios (parestesia)\n   • Perforación del seno maxilar\n   • Fractura del implante\n   • Periimplantitis (infección crónica)\n   • Rechazo del implante\n\n4. CONTRAINDICACIONES: He informado al profesional sobre diabetes, osteoporosis, tratamientos con bifosfonatos, radioterapia, tabaquismo u otras condiciones que puedan afectar el resultado.\n\n5. CUIDADOS: El éxito del implante depende en gran medida de una higiene oral estricta y controles periódicos.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la colocación del implante dental.`},

  {id:'blanqueamiento',titulo:'Blanqueamiento Dental',icono:'✨',
   texto:`CONSENTIMIENTO INFORMADO PARA BLANQUEAMIENTO DENTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El blanqueamiento dental consiste en la aplicación de agentes oxidantes (peróxido de hidrógeno o carbamida) sobre la superficie dental para aclarar el tono del esmalte.\n\n2. RESULTADOS: Los resultados varían según el tipo y causa de la tinción. No se garantiza un resultado específico ni permanente.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Sensibilidad dental temporal (durante o después del tratamiento)\n   • Irritación gingival\n   • Irregularidad del color entre dientes naturales y restauraciones\n   • Reabsorción cervical externa (muy rara, en blanqueamiento interno)\n\n4. DURACIÓN: Los resultados son temporales y dependen de los hábitos de alimentación, tabaquismo e higiene del paciente.\n\n5. CONTRAINDICACIONES: No se recomienda en embarazadas, lactantes, menores de 18 años, ni en pacientes con caries activas o enfermedad periodontal sin tratar.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el blanqueamiento dental.`},

  {id:'cirugia',titulo:'Cirugía Oral / Periodontal',icono:'🏥',
   texto:`CONSENTIMIENTO INFORMADO PARA CIRUGÍA ORAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre el procedimiento quirúrgico indicado:\n\n1. PROCEDIMIENTO: Cirugía oral (puede incluir: exodoncia quirúrgica, frenectomía, apicectomía, cirugía periodontal, quistectomía, entre otros).\n\n2. ANESTESIA: Se utilizará anestesia local. En casos especiales, puede requerirse sedación o anestesia general.\n\n3. RIESGOS GENERALES DE CIRUGÍA:\n   • Sangrado e inflamación postoperatoria\n   • Infección de la herida quirúrgica\n   • Dehiscencia de suturas\n   • Lesión de estructuras anatómicas adyacentes (nervios, vasos, seno maxilar)\n   • Trismus temporal\n   • Cicatrización deficiente\n\n4. MEDICACIÓN POSTOPERATORIA: Se prescribirán analgésicos, antiinflamatorios y/o antibióticos según el caso.\n\n5. CUIDADOS: Seguiré estrictamente las indicaciones postoperatorias para favorecer la correcta cicatrización.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para la realización del procedimiento quirúrgico indicado.`},

  {id:'ortodoncia',titulo:'Ortodoncia',icono:'😁',
   texto:`CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE ORTODONCIA\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento ortodóntico tiene como objetivo corregir la posición de los dientes y las relaciones oclusales mediante el uso de aparatos (brackets, alineadores u otros dispositivos).\n\n2. DURACIÓN: El tiempo de tratamiento varía según la complejidad del caso (generalmente entre 12 y 36 meses).\n\n3. RIESGOS Y COMPLICACIONES:\n   • Caries y descalcificaciones por deficiente higiene durante el tratamiento\n   • Reabsorción radicular\n   • Recidiva (retorno de los dientes a su posición original) si no se usan los retenedores\n   • Molestias y dolor durante los primeros días de cada activación\n   • Lesiones en mucosa oral por los aparatos\n   • Enfermedad periodontal si no se mantiene una higiene adecuada\n\n4. COLABORACIÓN: El éxito del tratamiento depende en gran parte de la colaboración del paciente (uso de elásticos, asistencia a controles, higiene oral).\n\n5. RETENCIÓN: Una vez finalizado el tratamiento activo, es obligatorio el uso de retenedores indefinidamente.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el tratamiento de ortodoncia.`},

  {id:'periodoncia',titulo:'Tratamiento Periodontal',icono:'🦠',
   texto:`CONSENTIMIENTO INFORMADO PARA TRATAMIENTO PERIODONTAL\n\nYo, el/la paciente o su representante legal, declaro haber sido informado/a sobre:\n\n1. PROCEDIMIENTO: El tratamiento periodontal comprende procedimientos para tratar la enfermedad de las encías y el hueso de soporte dental (raspado y alisado radicular, cirugía periodontal, etc.).\n\n2. OBJETIVO: Eliminar la placa bacteriana y el cálculo dental subgingival, controlar la infección y estabilizar la enfermedad periodontal.\n\n3. RIESGOS Y COMPLICACIONES:\n   • Sensibilidad dental por exposición de cuellos dentales\n   • Aumento aparente de los espacios entre dientes\n   • Recesión gingival\n   • Inflamación y molestias temporales\n   • Necesidad de cirugía adicional si la respuesta no es satisfactoria\n\n4. MANTENIMIENTO: El tratamiento periodontal requiere controles periódicos y mantenimiento profesional cada 3-6 meses.\n\n5. FACTORES DE RIESGO: He informado sobre tabaquismo, diabetes u otras condiciones sistémicas que afectan la respuesta al tratamiento.\n\nLuego de haber leído y comprendido la información, OTORGO MI CONSENTIMIENTO para el tratamiento periodontal.`},
];
const CIE10_ODO=[
  ['A422','ACTINOMICOSIS CERVICOFACIAL'],['B002','GINGIVOESTOMATITIS Y FARINGOAMIGDALITIS HERPETICA'],
  ['B009','INFECCION DEBIDA AL VIRUS DEL HERPES, NO ESPECIFICADA'],['B084','ESTOMATITIS VESICULAR ENTEROVIRAL CON EXANTEMA'],
  ['B370','ESTOMATITIS CANDIDIASICA'],['B378','CANDIDIASIS DE OTROS SITIOS'],['B99','OTRAS ENFERMEDADES INFECCIOSAS Y LAS NO ESPECIFICADAS'],
  ['C000','TUMOR MALIGNO DEL LABIO SUPERIOR, CARA EXTERNA'],['C001','TUMOR MALIGNO DEL LABIO INFERIOR, CARA EXTERNA'],
  ['C002','TUMOR MALIGNO DEL LABIO, CARA EXTERNA, SIN OTRA ESPECIFICACION'],['C003','TUMOR MALIGNO DEL LABIO SUPERIOR, CARA INTERNA'],
  ['C004','TUMOR MALIGNO DEL LABIO INFERIOR, CARA INTERNA'],['C005','TUMOR MALIGNO DEL LABIO, CARA INTERNA, SIN OTRA ESPECIFICACION'],
  ['C006','TUMOR MALIGNO DE LA COMISURA LABIAL'],['C008','LESION DE SITIOS CONTIGUOS DEL LABIO'],
  ['C009','TUMOR MALIGNO DEL LABIO, PARTE NO ESPECIFICADA'],['C01','TUMOR MALIGNO DE LA BASE DE LA LENGUA'],
  ['C020','TUMOR MALIGNO DE LA CARA DORSAL DE LA LENGUA'],['C021','TUMOR MALIGNO DEL BORDE DE LA LENGUA'],
  ['C022','TUMOR MALIGNO DE LA CARA VENTRAL DE LA LENGUA'],['C024','TUMOR MALIGNO DE LA AMIGDALA LINGUAL'],
  ['C029','TUMOR MALIGNO DE LA LENGUA, PARTE NO ESPECIFICADA'],['C030','TUMOR MALIGNO DE LA ENCIA SUPERIOR'],
  ['C031','TUMOR MALIGNO DE LA ENCIA INFERIOR'],['C039','TUMOR MALIGNO DE LA ENCIA, PARTE NO ESPECIFICADA'],
  ['C040','TUMOR MALIGNO DE LA PARTE ANTERIOR DEL PISO DE LA BOCA'],['C041','TUMOR MALIGNO DE LA PARTE LATERAL DEL PISO DE LA BOCA'],
  ['C049','TUMOR MALIGNO DEL PISO DE LA BOCA, PARTE NO ESPECIFICADA'],['C050','TUMOR MALIGNO DEL PALADAR DURO'],
  ['C051','TUMOR MALIGNO DEL PALADAR BLANDO'],['C052','TUMOR MALIGNO DE LA UVULA'],
  ['C059','TUMOR MALIGNO DEL PALADAR, PARTE NO ESPECIFICADA'],['C060','TUMOR MALIGNO DE LA MUCOSA DE LA MEJILLA'],
  ['C061','TUMOR MALIGNO DEL VESTIBULO DE LA BOCA'],['C062','TUMOR MALIGNO DEL AREA RETROMOLAR'],
  ['C069','TUMOR MALIGNO DE LA BOCA, PARTE NO ESPECIFICADA'],['C07','TUMOR MALIGNO DE LA GLANDULA PAROTIDA'],
  ['C080','TUMOR MALIGNO DE LA GLANDULA SUBMAXILAR'],['C081','TUMOR MALIGNO DE LA GLANDULA SUBLINGUAL'],
  ['C089','TUMOR MALIGNO DE GLANDULA SALIVAL MAYOR, NO ESPECIFICADA'],['C310','TUMOR MALIGNO DEL SENO MAXILAR'],
  ['C410','TUMOR MALIGNO DE LOS HUESOS DEL CRANEO Y DE LA CARA'],['C411','TUMOR MALIGNO DEL HUESO DEL MAXILAR INFERIOR'],
  ['C430','MELANOMA MALIGNO DEL LABIO'],['C440','TUMOR MALIGNO DE LA PIEL DEL LABIO'],
  ['C462','SARCOMA DE KAPOSI DEL PALADAR'],['C760','TUMOR MALIGNO DE LA CABEZA, CARA Y CUELLO'],
  ['D100','TUMOR BENIGNO DEL LABIO'],['D101','TUMOR BENIGNO DE LA LENGUA'],['D102','TUMOR BENIGNO DEL PISO DE LA BOCA'],
  ['D103','TUMOR BENIGNO DE OTRAS PARTES DE LA BOCA'],['D164','TUMOR BENIGNO DE LOS HUESOS DEL CRANEO Y DE LA CARA'],
  ['D165','TUMOR BENIGNO DEL MAXILAR INFERIOR'],
  ['G500','NEURALGIA DEL TRIGEMINO'],['G501','DOLOR FACIAL ATIPICO'],['G508','OTROS TRASTORNOS DEL TRIGEMINO'],
  ['G510','PARALISIS DE BELL'],['G513','ESPASMO HEMIFACIAL CLONICO'],['G518','OTROS TRASTORNOS DEL NERVIO FACIAL'],
  ['J320','SINUSITIS MAXILAR CRONICA'],
  ['K000','ANODONCIA'],['K001','DIENTES SUPERNUMERARIOS'],['K002','ANOMALIAS DEL TAMAÑO Y DE LA FORMA DEL DIENTE'],
  ['K003','DIENTES MOTEADOS'],['K004','ALTERACIONES EN LA FORMACION DENTARIA'],
  ['K005','ALTERACIONES HEREDITARIAS DE LA ESTRUCTURA DENTARIA'],['K006','ALTERACIONES EN LA ERUPCION DENTARIA'],
  ['K007','SINDROME DE LA ERUPCION DENTARIA'],['K008','OTROS TRASTORNOS DEL DESARROLLO DE LOS DIENTES'],
  ['K009','TRASTORNO DEL DESARROLLO DE LOS DIENTES, NO ESPECIFICADO'],
  ['K010','DIENTES INCLUIDOS'],['K011','DIENTES IMPACTADOS'],
  ['K020','CARIES LIMITADA AL ESMALTE'],['K021','CARIES DE LA DENTINA'],['K022','CARIES DEL CEMENTO'],
  ['K023','CARIES DENTARIA DETENIDA'],['K024','ODONTOCLASIA'],['K028','OTRAS CARIES DENTALES'],['K029','CARIES DENTAL, NO ESPECIFICADA'],
  ['K030','ATRICION EXCESIVA DE LOS DIENTES'],['K031','ABRASION DE LOS DIENTES'],['K032','EROSION DE LOS DIENTES'],
  ['K033','REABSORCION PATOLOGICA DE LOS DIENTES'],['K034','HIPERCEMENTOSIS'],['K035','ANQUILOSIS DENTAL'],
  ['K036','DEPOSITOS EN LOS DIENTES'],['K037','CAMBIOS POSTERUPTIVOS DEL COLOR DE LOS TEJIDOS DENTALES DUROS'],
  ['K040','PULPITIS'],['K041','NECROSIS DE LA PULPA'],['K042','DEGENERACION DE LA PULPA'],
  ['K043','FORMACION ANORMAL DE TEJIDO DURO EN LA PULPA'],
  ['K044','PERIODONTITIS APICAL AGUDA ORIGINADA EN LA PULPA'],['K045','PERIODONTITIS APICAL CRONICA'],
  ['K046','ABSCESO PERIAPICAL CON FISTULA'],['K047','ABSCESO PERIAPICAL SIN FISTULA'],['K048','QUISTE RADICULAR'],
  ['K049','OTRAS ENFERMEDADES DE LA PULPA Y DEL TEJIDO PERIAPICAL'],
  ['K050','GINGIVITIS AGUDA'],['K051','GINGIVITIS CRONICA'],['K052','PERIODONTITIS AGUDA'],['K053','PERIODONTITIS CRONICA'],
  ['K054','PERIODONTOSIS'],['K055','OTRAS ENFERMEDADES PERIODONTALES'],['K056','ENFERMEDAD DE PERIODONTO, NO ESPECIFICADA'],
  ['K060','RETRACCION GINGIVAL'],['K061','HIPERPLASIA GINGIVAL'],
  ['K062','LESIONES DE LA ENCIA Y DE LA ZONA EDENTULA ASOCIADAS CON TRAUMATISMO'],
  ['K068','OTROS TRASTORNOS DE LA ENCIA Y DE LA ZONA EDENTULA'],
  ['K070','ANOMALIAS EVIDENTES DEL TAMAÑO DE LOS MAXILARES'],['K071','ANOMALIAS DE LA RELACION MAXILOBASILAR'],
  ['K072','ANOMALIAS DE LA RELACION ENTRE LOS ARCOS DENTARIOS'],['K073','ANOMALIAS DE LA POSICION DEL DIENTE'],
  ['K074','MALOCLUSION DE TIPO NO ESPECIFICADO'],['K075','ANOMALIAS DENTOFACIALES FUNCIONALES'],
  ['K076','TRASTORNOS DE LA ARTICULACION TEMPOROMAXILAR'],['K078','OTRAS ANOMALIAS DENTOFACIALES'],
  ['K079','ANOMALIA DENTOFACIAL, NO ESPECIFICADA'],
  ['K080','EXFOLIACION DE LOS DIENTES DEBIDA A CAUSAS SISTEMICAS'],
  ['K081','PERDIDA DE DIENTES DEBIDA A ACCIDENTE, EXTRACCION O ENFERMEDAD PERIODONTAL LOCAL'],
  ['K082','ATROFIA DE REBORDE ALVEOLAR DESDENTADO'],['K083','RAIZ DENTAL RETENIDA'],
  ['K088','OTRAS AFECCIONES DE LOS DIENTES Y DE SUS ESTRUCTURAS DE SOSTEN'],
  ['K090','QUISTES ORIGINADOS POR EL DESARROLLO DE LOS DIENTES'],['K091','QUISTES DE LAS FISURAS'],
  ['K092','OTROS QUISTES DE LOS MAXILARES'],['K098','OTROS QUISTES DE LA REGION BUCAL'],
  ['K100','TRASTORNOS DEL DESARROLLO DE LOS MAXILARES'],['K101','GRANULOMA CENTRAL DE CELULAS GIGANTES'],
  ['K102','AFECCIONES INFLAMATORIAS DE LOS MAXILARES'],['K103','ALVEOLITIS DEL MAXILAR'],
  ['K108','OTRAS ENFERMEDADES ESPECIFICADAS DE LOS MAXILARES'],
  ['K110','ATROFIA DE GLANDULA SALIVAL'],['K111','HIPERTROFIA DE GLANDULA SALIVAL'],['K112','SIALADENITIS'],
  ['K113','ABSCESO DE GLANDULA SALIVAL'],['K114','FISTULA DE GLANDULA SALIVAL'],['K115','SIALOLITIASIS'],
  ['K116','MUCOCELE DE GLANDULA SALIVAL'],['K117','ALTERACIONES DE LA SECRECION SALIVAL'],
  ['K118','OTRAS ENFERMEDADES DE LAS GLANDULAS SALIVALES'],
  ['K120','ESTOMATITIS AFTOSA RECURRENTE'],['K121','OTRAS FORMAS DE ESTOMATITIS'],['K122','CELULITIS Y ABSCESO DE BOCA'],
  ['K130','ENFERMEDADES DE LOS LABIOS'],['K131','MORDEDURA DEL LABIO Y DE LA MEJILLA'],
  ['K132','LEUCOPLASIA Y OTRAS ALTERACIONES DEL EPITELIO BUCAL'],['K133','LEUCOPLASIA PILOSA'],
  ['K134','GRANULOMA Y LESIONES SEMEJANTES DE LA MUCOSA BUCAL'],['K135','FIBROSIS DE LA SUBMUCOSA BUCAL'],
  ['K136','HIPERPLASIA IRRITATIVA DE LA MUCOSA BUCAL'],['K137','OTRAS LESIONES DE LA MUCOSA BUCAL'],
  ['K140','GLOSITIS'],['K141','LENGUA GEOGRAFICA'],['K142','GLOSITIS ROMBOIDEA MEDIANA'],
  ['K143','HIPERTROFIA DE LAS PAPILAS LINGUALES'],['K144','ATROFIA DE LAS PAPILAS LINGUALES'],
  ['K145','LENGUA PLEGADA'],['K146','GLOSODINIA'],['K148','OTRAS ENFERMEDADES DE LA LENGUA'],
  ['Q351','FISURA DEL PALADAR DURO'],['Q353','FISURA DEL PALADAR BLANDO'],['Q355','FISURA DEL PALADAR DURO Y BLANDO'],
  ['Q360','LABIO LEPORINO, BILATERAL'],['Q361','LABIO LEPORINO, LINEA MEDIA'],['Q369','LABIO LEPORINO, UNILATERAL'],
  ['Q381','ANQUILOGLOSIA'],['Q382','MACROGLOSIA'],['Q383','OTRAS MALFORMACIONES CONGENITAS DE LA LENGUA'],
  ['Q384','MALFORMACIONES CONGENITAS DE LAS GLANDULAS SALIVALES'],
  ['S014','HERIDA DE LA MEJILLA Y DE LA REGION TEMPOROMANDIBULAR'],['S015','HERIDA DEL LABIO Y DE LA CAVIDAD BUCAL'],
  ['S023','FRACTURA DEL SUELO DE LA ORBITA'],['S024','FRACTURA DEL MALAR Y DEL HUESO MAXILAR SUPERIOR'],
  ['S025','FRACTURA DE LOS DIENTES'],['S026','FRACTURA DEL MAXILAR INFERIOR'],
  ['S030','LUXACION DEL MAXILAR'],['S032','LUXACION DE DIENTE'],
  ['T784','ALERGIA NO ESPECIFICADA'],['T882','CHOQUE DEBIDA A ANESTESIA'],
  ['T885','OTRAS COMPLICACIONES DE LA ANESTESIA'],
  ['T886','CHOQUE ANAFILACTICO DEBIDO A EFECTO ADVERSO DE DROGA O MEDICAMENTO'],
  ['Z012','EXAMEN ODONTOLOGICO'],['Z463','PRUEBA Y AJUSTE DE PROTESIS DENTAL'],
  ['Z464','PRUEBA Y AJUSTE DE DISPOSITIVO ORTODONCICO'],['Z965','PRESENCIA DE IMPLANTES DENTALES'],
];
let MEDICAMENTOS_COMUNES=[
  'Amoxicilina 500mg','Amoxicilina + Ácido Clavulánico 875/125mg','Azitromicina 500mg',
  'Clindamicina 300mg','Metronidazol 500mg','Ibuprofeno 400mg','Ibuprofeno 600mg',
  'Paracetamol 500mg','Naproxeno 500mg','Ketorolaco 10mg','Diclofenaco 50mg',
  'Dexametasona 4mg','Prednisona 5mg','Cloruro de Sodio 0.9% (Suero Fisiológico)',
  'Clorhexidina 0.12% enjuague bucal','Gel de Clorhexidina 1%','Clorfenamina 4mg',
  'Loratadina 10mg','Omeprazol 20mg'
];
// ═══ CATÁLOGO CON POSOLOGÍA ESTÁNDAR (Receta en 1 toque) ═══
const CATALOGO_MEDS=[
{nombre:'Amoxicilina 500mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21,indicacion:'Tomar con alimentos'},
{nombre:'Amoxicilina + Ácido Clavulánico 875/125mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'7 días',cantidad:14,indicacion:'Tomar con alimentos'},
{nombre:'Ibuprofeno 400mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15,indicacion:'Tomar después de los alimentos'},
{nombre:'Ibuprofeno 600mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15,indicacion:'Tomar después de los alimentos'},
{nombre:'Paracetamol 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'5 días',cantidad:15},
{nombre:'Naproxeno 550mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'5 días',cantidad:10},
{nombre:'Ketorolaco 10mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 6 horas',duracion:'3 días',cantidad:12,indicacion:'Máximo 3 días por riesgo gástrico'},
{nombre:'Dexametasona 4mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'3 días',cantidad:3,indicacion:'Por la mañana con alimentos'},
{nombre:'Metronidazol 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21,indicacion:'No consumir alcohol'},
{nombre:'Clindamicina 300mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 8 horas',duracion:'7 días',cantidad:21},
{nombre:'Azitromicina 500mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'3 días',cantidad:3},
{nombre:'Clorhexidina 0.12% enjuague',forma:'Enjuague bucal',via:'Tópica',dosis:'15 ml',frecuencia:'2 veces al día',duracion:'7 días',cantidad:1,indicacion:'Enjuagar 1 min, no ingerir'},
{nombre:'Nistatina suspensión 100.000 UI/ml',forma:'Suspensión oral',via:'Oral',dosis:'5 ml',frecuencia:'4 veces al día',duracion:'7 días',cantidad:1,indicacion:'Retener en boca antes de tragar'},
{nombre:'Omeprazol 20mg',forma:'Cápsula',via:'Oral',dosis:'1 cápsula',frecuencia:'Cada 24 horas',duracion:'7 días',cantidad:7,indicacion:'En ayunas'},
{nombre:'Diclofenaco 50mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 12 horas',duracion:'5 días',cantidad:10},
{nombre:'Loratadina 10mg',forma:'Tableta',via:'Oral',dosis:'1 tableta',frecuencia:'Cada 24 horas',duracion:'7 días',cantidad:7}
];

function saveMeds(){
  localStorage.setItem('oa3_meds',JSON.stringify(MEDICAMENTOS_COMUNES));
}
function loadMeds(){
  const m=localStorage.getItem('oa3_meds');
  if(m)MEDICAMENTOS_COMUNES=JSON.parse(m);
}
let CIE10_FULL=null;
let factItemCount=0;   // legado: closeModal() (ui.js) lo reinicia; ya no se usa

/* ═══════════════════ CONSENTIMIENTOS ═══════════════════ */
const Consents=(function(){
  'use strict';
  function tmpl(id){for(var i=0;i<CONSENT_TEMPLATES.length;i++){if(CONSENT_TEMPLATES[i].id===id)return CONSENT_TEMPLATES[i];}return null;}
  function find(p,id){var a=(p&&p.consents)||[];for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id))return a[i];}return null;}
  function name(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max);}

  /* ── datos ── */
  function checkSign(f){
    f=f||{};var nombre=name(f.nombre,200),rep=name(f.representante,200),fecha=String(f.fecha||'').trim();
    if(!nombre)return {ok:false,error:'El nombre de quien firma es obligatorio'};
    if(nombre.length>120||rep.length>120)return {ok:false,error:'El nombre es demasiado largo (máximo 120 caracteres)'};
    if(!Finance.validDate(fecha))return {ok:false,error:'La fecha de la firma no es válida'};
    if(fecha>today())return {ok:false,error:'La fecha de la firma no puede ser futura'};
    return {ok:true,clean:{nombre:nombre,representante:rep,fecha:fecha}};
  }
  function checkCustom(f){
    f=f||{};var titulo=name(f.titulo,300),texto=String(f.texto==null?'':f.texto).trim();
    if(!titulo||!texto)return {ok:false,error:'Completa el título y el texto'};
    if(titulo.length>120)return {ok:false,error:'El título es demasiado largo (máximo 120 caracteres)'};
    return {ok:true,clean:{titulo:titulo,texto:texto}};
  }
  function make(p,templateId,titulo,texto){
    return {id:uid(),templateId:templateId,titulo:titulo,texto:texto,fecha:today(),firmado:false,fechaFirma:null,nombrePaciente:p.name,nombreRepresentante:''};
  }
  function addFromTemplate(ptId,templateId){            // el texto se COPIA: cambiar la plantilla después no altera lo ya emitido
    var p=Patients.get(ptId),t=tmpl(templateId);if(!p||!t)return null;
    var c=make(p,t.id,t.titulo,t.texto);(p.consents=p.consents||[]).push(c);save();return c;
  }
  function addCustom(ptId,clean){
    var p=Patients.get(ptId);if(!p)return null;
    var c=make(p,'custom',clean.titulo,clean.texto);(p.consents=p.consents||[]).push(c);save();return c;
  }
  function sign(ptId,id,clean){
    var p=Patients.get(ptId),c=find(p,id);
    if(!c)return {ok:false,error:'notfound'};
    if(c.firmado)return {ok:false,error:'signed'};       // ya firmado (p. ej. desde otro dispositivo): no se pisa la firma
    c.firmado=true;c.fechaFirma=clean.fecha;c.nombrePaciente=clean.nombre;c.nombreRepresentante=clean.representante;
    save();return {ok:true,consent:c};
  }
  function remove(ptId,id){
    var p=Patients.get(ptId),a=(p&&p.consents)||[];
    for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id)){var r=a.splice(i,1)[0];save();return r;}}
    return null;
  }
  // Documento listo para imprimir. Antes el botón usaba window.print() y la hoja de impresión oculta la ventana donde vive el consentimiento.
  function printHtml(c,p){
    var clinica=esc(document.getElementById('logoText').textContent),prof=esc(document.getElementById('logoProfesional').textContent);
    var sub=[clinicaRUC?'RUC: '+esc(clinicaRUC):'',clinicaDireccion?esc(clinicaDireccion):'',clinicaTelefono?'Tel: '+esc(clinicaTelefono):''].filter(Boolean).join(' · ');
    var firmante=c.firmado&&c.nombrePaciente?esc(c.nombrePaciente):'Firma del paciente / representante';
    return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Consentimiento — '+esc(c.titulo)+'</title><style>'+
      '*{box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#0f172a;margin:0;padding:36px 44px;font-size:12.5px;line-height:1.7}'+
      '.head{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:16px}.head h1{font-size:17px;margin:0 0 2px}.head div{font-size:11px;color:#475569}'+
      'h2{text-align:center;font-size:15px;text-transform:uppercase;letter-spacing:.04em;margin:14px 0}.meta{display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:14px;color:#334155}'+
      '.txt{white-space:pre-wrap;text-align:justify;margin-bottom:34px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px}'+
      '.sign div{border-top:1px solid #0f172a;padding-top:6px;text-align:center;font-size:11px}.sign small{display:block;color:#64748b;font-size:10px}'+
      '.bar{position:fixed;top:10px;right:14px;display:flex;gap:8px}.bar button{padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-weight:600}'+
      '@media print{.bar{display:none}body{padding:0}}</style></head><body>'+
      '<div class="bar"><button id="btnPrint" style="background:#0ea5e9;color:#fff">🖨️ Imprimir</button><button id="btnClose" style="background:#e2e8f0">Cerrar</button></div>'+
      '<div class="head"><h1>'+clinica+'</h1>'+(sub?'<div>'+sub+'</div>':'')+'</div>'+
      '<h2>'+esc(c.titulo)+'</h2><div class="meta"><span><b>Paciente:</b> '+esc(p.name)+(p.cedula?' · CI: '+esc(p.cedula):'')+'</span><span><b>Fecha:</b> '+fmtDate(c.fecha)+'</span></div>'+
      '<div class="txt">'+esc(c.texto)+'</div>'+
      '<div class="sign"><div>'+firmante+(c.nombreRepresentante?'<small>Representante: '+esc(c.nombreRepresentante)+'</small>':'')+(c.firmado?'<small>Firmado el '+fmtDate(c.fechaFirma)+'</small>':'<small>Firma del paciente / representante</small>')+'</div>'+
      '<div>'+prof+'<small>Firma del profesional</small></div></div>'+
      '<script>document.getElementById("btnPrint").addEventListener("click",function(){window.print();});document.getElementById("btnClose").addEventListener("click",function(){window.close();});<\/script></body></html>';
  }

  /* ── pantallas ── */
  function render(){
    const p=Patients.current();
    if(!p.consents)p.consents=[];
    return`
    <div class="card">
      <div class="action-row">
        <div class="card-title" style="margin:0">Consentimientos informados</div>
        <button class="btn-primary" data-action="consents.openSelect">+ Agregar consentimiento</button>
      </div>
      ${p.consents.length===0?`
        <div style="text-align:center;padding:40px 20px;color:var(--text3)">
          <div style="font-size:40px;margin-bottom:12px">📋</div>
          <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin consentimientos registrados</div>
          <div style="font-size:12px">Agrega los consentimientos informados firmados por el paciente antes de cada procedimiento</div>
        </div>`:
      p.consents.map(c=>`
        <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="font-size:22px">${CONSENT_TEMPLATES.find(t=>t.id===c.templateId)?.icono||'📋'}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:var(--text)">${esc(c.titulo)}</div>
              <div style="font-size:11px;color:var(--text3)">Fecha: ${fmtDate(c.fecha)} · ${c.firmado?'<span style="color:var(--green);font-weight:600">✓ Firmado</span>':'<span style="color:var(--amber);font-weight:600">⏳ Pendiente de firma</span>'}</div>
            </div>
            <div style="display:flex;gap:6px">
              ${!c.firmado?`<button class="done-btn" data-action="consents.openSign" data-id="${c.id}">✓ Marcar firmado</button>`:''}
              <button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="consents.view" data-id="${c.id}">Ver</button>
              <button class="del-btn" data-action="consents.delete" data-id="${c.id}">✕</button>
            </div>
          </div>
          ${c.firmado?`<div style="display:flex;gap:16px;padding:8px 12px;background:var(--bg);border-radius:8px;font-size:11px;color:var(--text2)">
            <span>👤 Paciente: <strong>${esc(c.nombrePaciente||p.name)}</strong></span>
            ${c.nombreRepresentante?`<span>👤 Representante: <strong>${esc(c.nombreRepresentante)}</strong></span>`:''}
            <span>📅 Firmado: <strong>${fmtDate(c.fechaFirma)}</strong></span>
          </div>`:''}
        </div>`).join('')}
    </div>
    <div style="background:#f0e7d8;border:1px solid #dcc39c;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
      <div style="font-size:18px">⚖️</div>
      <div style="font-size:12px;color:#6b4a2f">Los consentimientos informados son un requisito legal y ético. Deben obtenerse antes de cada procedimiento. Se recomienda imprimir, firmar físicamente y archivar el documento original.</div>
    </div>`;
  }
  function openSelect(){
    openModal(`<div class="modal-title">Seleccionar consentimiento informado</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      ${CONSENT_TEMPLATES.map(t=>`
        <div data-action="consents.add" data-id="${esc(t.id)}" style="display:flex;align-items:center;gap:10px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all .15s" data-hover>
          <div style="font-size:24px">${t.icono}</div>
          <div style="font-size:13px;font-weight:500;color:var(--text)">${esc(t.titulo)}</div>
        </div>`).join('')}
      <div data-action="consents.openCustom" style="display:flex;align-items:center;gap:10px;padding:12px;border:1.5px dashed var(--border);border-radius:10px;cursor:pointer;transition:all .15s" data-hover>
        <div style="font-size:24px">✏️</div>
        <div style="font-size:13px;font-weight:500;color:var(--text2)">Personalizado</div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button></div>`);
    document.querySelector('.modal').style.width='620px';
  }
  function openCustom(){
    closeModal();
    openModal(`<div class="modal-title">Consentimiento personalizado</div>
    <div class="form-row form-full"><div class="form-group"><label>Título del consentimiento *</label><input id="f_ctit" placeholder="Ej: Blanqueamiento con láser, Implante cigomático..."></div></div>
    <div class="form-row form-full"><div class="form-group"><label>Texto del consentimiento *</label><textarea id="f_ctxt" style="min-height:200px" placeholder="Escribe el texto completo del consentimiento informado..."></textarea></div></div>
    <div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="consents.saveCustom">Agregar</button></div>`);
  }
  function view(id){
    const c=Patients.current().consents.find(x=>x.id===id);if(!c)return;
    const clinicaNombre=document.getElementById('logoText').textContent;
    const profesional=document.getElementById('logoProfesional').textContent;
    const tmpl=CONSENT_TEMPLATES.find(t=>t.id===c.templateId);
    openModal(`<div class="modal-title">${tmpl?.icono||'📋'} ${esc(c.titulo)}</div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--text)">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(clinicaNombre)}</div>
          <div style="font-size:11px;color:var(--text2)">${esc(profesional)}</div>
          <div style="font-size:11px;color:var(--text2)">RUC: ${esc(clinicaRUC||'—')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase">Consentimiento Informado</div>
          <div style="font-size:11px;color:var(--text2)">Fecha: ${fmtDate(c.fecha)}</div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text);line-height:1.8;white-space:pre-line;margin-bottom:20px">${esc(c.texto)}</div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px">
          <div style="border-top:1px solid var(--text);padding-top:6px;text-align:center">
            <div style="font-size:11px;color:var(--text2)">${c.firmado&&c.nombrePaciente?esc(c.nombrePaciente):'Firma del paciente / representante'}</div>
            ${c.firmado?`<div style="font-size:10px;color:var(--green);margin-top:2px">✓ Firmado el ${fmtDate(c.fechaFirma)}</div>`:''}
          </div>
          <div style="border-top:1px solid var(--text);padding-top:6px;text-align:center">
            <div style="font-size:11px;color:var(--text2)">${esc(profesional)}</div>
            <div style="font-size:10px;color:var(--text3)">Firma del profesional</div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-sec" data-action="app.closeModal">Cerrar</button>
      ${!c.firmado?`<button class="btn-primary" style="background:var(--green)" data-action="consents.openSign" data-id="${c.id}">✓ Marcar como firmado</button>`:''}
      <button class="btn-primary" data-action="consents.print" data-id="${c.id}">🖨️ Imprimir</button>
    </div>`);
    document.querySelector('.modal').style.width='680px';
  }
  function openSign(id){
    const c=Patients.current().consents.find(x=>x.id===id);if(!c)return;
    openModal(`<div class="modal-title">Registrar firma del consentimiento</div>
    <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Confirma que el paciente o su representante legal ha firmado físicamente el documento <strong>${esc(c.titulo)}</strong>.</p>
    <div class="form-row form-full"><div class="form-group"><label>Nombre del paciente / firmante</label><input id="f_fnpac" value="${esc(c.nombrePaciente||Patients.current().name)}"></div></div>
    <div class="form-row form-full"><div class="form-group"><label>Nombre del representante (si aplica)</label><input id="f_fnrep" placeholder="Solo si el firmante no es el paciente"></div></div>
    <div class="form-row form-full"><div class="form-group"><label>Fecha de firma</label><input id="f_ffirma" type="date" value="${today()}"></div></div>
    <div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" style="background:var(--green)" data-action="consents.confirmSign" data-id="${id}">✓ Confirmar firma</button></div>`);
  }
  function add(templateId){var p=Patients.current();if(!p||!api.addFromTemplate(p.id,templateId))return;closeModal();Ficha.render();}
  function saveCustom(){
    var p=Patients.current();if(!p)return;
    var r=checkCustom({titulo:v('f_ctit'),texto:v('f_ctxt')});if(!r.ok){alert(r.error);return;}
    api.addCustom(p.id,r.clean);closeModal();Ficha.render();
  }
  function confirmSign(id){
    var p=Patients.current();if(!p)return;
    var r=checkSign({nombre:v('f_fnpac'),representante:v('f_fnrep'),fecha:v('f_ffirma')});
    if(!r.ok){alert(r.error);return;}
    var s=api.sign(p.id,id,r.clean);
    if(!s.ok){alert(s.error==='signed'?'Este consentimiento ya fue firmado (quizá desde otro dispositivo).':'No se encontró el consentimiento.');}
    closeModal();Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),c=find(p,id);if(!c)return;
    var msg=c.firmado?'⚠️ Este consentimiento ya está FIRMADO ('+fmtDate(c.fechaFirma)+') y es un documento legal.\n\nSi lo eliminas se pierde el registro de la firma.\n\n¿Eliminar de todos modos?':'¿Eliminar este consentimiento?';
    if(!confirm(msg))return;
    api.remove(p.id,id);Ficha.render();
  }
  function printDoc(id){
    var p=Patients.current(),c=find(p,id);if(!c)return;
    var w=safeOpen('','_blank','width=900,height=800');w.document.write(printHtml(c,p));w.document.close();
  }
  var api={tmpl:tmpl,find:find,checkSign:checkSign,checkCustom:checkCustom,addFromTemplate:addFromTemplate,addCustom:addCustom,sign:sign,remove:remove,printHtml:printHtml,
    render:render,openSelect:openSelect,openCustom:openCustom,view:view,openSign:openSign,add:add,saveCustom:saveCustom,confirmSign:confirmSign,deleteUI:deleteUI,printDoc:printDoc};
  return api;
})();

/* ═══════════════════ CIE-10 ═══════════════════ */
const Cie10=(function(){
  'use strict';
  var CODE=/^[A-Z][0-9]{2}[0-9A-Z.\-]*$/,loading=null;
  function norm(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();}   // «Cólera» = «COLERA»
  function splitLine(line,delim){
    var out=[],cur='',inQ=false;
    for(var i=0;i<line.length;i++){
      var ch=line[i];
      if(inQ){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else inQ=false;}else cur+=ch;}
      else if(ch==='"')inQ=true;else if(ch===delim){out.push(cur);cur='';}else cur+=ch;
    }
    out.push(cur);return out;
  }
  // CSV → [[código, descripción], …]. Acepta «código,descripción» y el formato de 7 columnas (código en la 1.ª y descripción en la 7.ª).
  // Detecta el separador (, ; tabulador), ignora cabeceras y filas que no tengan un código CIE-10 válido, y no repite códigos.
  function parse(text){
    text=String(text||'').replace(/^\uFEFF/,'');
    var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});if(!lines.length)return [];
    var first=lines[0],delim=',';
    if(first.split(';').length>first.split(',').length)delim=';';else if(first.indexOf('\t')>-1&&first.split('\t').length>first.split(',').length)delim='\t';
    var out=[],seen={};
    lines.forEach(function(line){
      var c=splitLine(line,delim),cod=String(c[0]||'').trim().toUpperCase();
      if(!CODE.test(cod))return;
      var desc=String((c.length>=7&&c[6])?c[6]:(c[1]||'')).trim();                // splitLine ya quitó las comillas de CSV; las internas son parte del texto
      if(!desc||seen[cod])return;seen[cod]=1;out.push([cod,desc]);
    });
    return out;
  }
  function search(query){
    if(!query||String(query).length<2)return [];
    var q=norm(query),base=(CIE10_FULL&&CIE10_FULL.length)?CIE10_FULL:CIE10_ODO,byCode=[],byDesc=[];
    for(var i=0;i<base.length;i++){
      var cod=String(base[i][0]).toUpperCase();
      if(cod.indexOf(q)===0)byCode.push(base[i]);else if(norm(base[i][1]).indexOf(q)>-1)byDesc.push(base[i]);
    }
    return byCode.concat(byDesc).slice(0,8);
  }
  function updateCount(){var el=document.getElementById('cie10count');if(el&&CIE10_FULL&&CIE10_FULL.length)el.textContent='✓ '+CIE10_FULL.length.toLocaleString()+' códigos cargados';}
  // Un solo lugar de guardado (IndexedDB). Lo que antes quedó en localStorage se traslada y se libera ese espacio.
  function load(force){
    if(loading&&!force)return loading;
    loading=(async function(){
      try{
        var data=await idbGet('cie10full');
        if(!(data&&data.length)){
          var s=null;try{s=localStorage.getItem('oa3_cie10full');}catch(e){}
          if(s){var arr=JSON.parse(s);if(Array.isArray(arr)&&arr.length){data=arr;if(await idbSet('cie10full',arr)){try{localStorage.removeItem('oa3_cie10full');}catch(e){}}}}
        }
        if(data&&data.length){CIE10_FULL=data;updateCount();}
      }catch(e){console.warn('CIE-10:',e);}
    })();
    return loading;
  }
  async function importRows(rows){
    if(!rows.length){alert('No se encontraron códigos CIE-10 válidos en el archivo.');return false;}
    CIE10_FULL=rows;
    var ok=await idbSet('cie10full',rows);
    if(ok){try{localStorage.removeItem('oa3_cie10full');}catch(e){}}
    alert(ok?'✓ CIE-10 cargado: '+rows.length.toLocaleString()+' códigos listos para buscar.':'✓ '+rows.length.toLocaleString()+' códigos cargados, pero no se pudieron guardar en este dispositivo: tendrás que volver a cargarlos al reiniciar.');
    updateCount();return true;
  }
  function decode(buf){                                   // los CSV de Excel suelen venir en Windows-1252: sin esto las tildes se estropean
    try{return new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch(e){return new TextDecoder('windows-1252').decode(buf);}
  }
  function importFile(file){
    return new Promise(function(res){
      var rd=new FileReader();
      rd.onload=function(ev){importRows(parse(decode(ev.target.result))).then(function(ok){if(ok&&typeof showPage==='function')showPage('configuracion');res(ok);});};
      rd.onerror=function(){alert('No se pudo leer el archivo.');res(false);};
      rd.readAsArrayBuffer(file);
    });
  }
  function pickFile(){var i=document.createElement('input');i.type='file';i.accept='.csv,.txt';i.onchange=function(e){var f=e.target.files[0];if(f)importFile(f);};i.click();}
  return {norm:norm,parse:parse,search:search,load:load,importRows:importRows,importFile:importFile,pickFile:pickFile,updateCount:updateCount,decode:decode};
})();

/* ═══════════════════ RECETAS ═══════════════════ */
const Prescriptions=(function(){
  'use strict';
  var diagItemCount=0,medItemCount=0,activeDiagId=null,lastViewed=null;
  function clean(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max);}
  function find(p,id){var a=(p&&p.recetas)||[];for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id))return a[i];}return null;}

  /* ── cantidad en letras (1 a 999; fuera de ese rango no se inventa nada) ── */
  function numToLetrasRaw(n){
    const u=['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
    const d=['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
    n=parseInt(n)||0;
    if(n<=20)return u[n];
    if(n<30)return'VEINTI'+u[n-20];
    if(n<100)return d[Math.floor(n/10)]+(n%10?' Y '+u[n%10]:'');
    if(n===100)return'CIEN';
    if(n<200)return('CIENTO '+Prescriptions.numToLetras(n-100)).trim();
    const c=['','','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
    if(n<1000)return(c[Math.floor(n/100)]+' '+Prescriptions.numToLetras(n%100)).trim();
    return String(n);
  }
  function numToLetras(n){n=Math.floor(Number(n));if(!(n>=1))return '';if(n>999)return String(n);return numToLetrasRaw(n);}

  /* ── datos ── */
  // Valida y limpia una receta. Devuelve {ok, clean, warnings}. Los avisos no impiden emitirla: la persona decide.
  function check(f){
    f=f||{};
    var fecha=String(f.fecha||'').trim();
    if(!Finance.validDate(fecha))return {ok:false,error:'La fecha de la receta no es válida'};
    if(fecha>today())return {ok:false,error:'La fecha de la receta no puede ser futura'};
    var medico=clean(f.medico,200);
    if(!medico)return {ok:false,error:'El médico prescriptor es obligatorio'};
    if(medico.length>120)return {ok:false,error:'El nombre del médico es demasiado largo (máximo 120 caracteres)'};
    var diag=(f.diagnosticos||[]).map(function(d){return {cod:clean(d&&d.cod,20).toUpperCase(),desc:clean(d&&d.desc,200)};}).filter(function(d){return d.cod||d.desc;});
    var meds=[],warnings=[];
    for(var i=0;i<(f.medicamentos||[]).length;i++){
      var m=f.medicamentos[i],nombre=clean(m&&m.nombre,200);
      if(!nombre)continue;
      if(nombre.length>120)return {ok:false,error:'El nombre del medicamento "'+nombre.slice(0,30)+'…" es demasiado largo (máximo 120 caracteres)'};
      var cant=String((m&&m.cantidadNum)==null?'':m.cantidadNum).trim();
      if(cant&&!(/^\d+$/.test(cant)&&+cant>=1&&+cant<=999))return {ok:false,error:'La cantidad de "'+nombre+'" debe ser un número entero de 1 a 999'};
      var med={nombre:nombre,formaFarmaceutica:clean(m.formaFarmaceutica,40),concentracion:clean(m.concentracion,40),via:clean(m.via,40)||'Oral',cantidadNum:cant,
        cantidadLetras:cant?Prescriptions.numToLetras(cant):'',dosis:clean(m.dosis,80),frecuencia:clean(m.frecuencia,40),duracion:clean(m.duracion,80)};
      if(!med.dosis)warnings.push(nombre+': falta la dosis por toma');
      if(!med.duracion)warnings.push(nombre+': falta la duración del tratamiento');
      if(!med.cantidadNum)warnings.push(nombre+': falta la cantidad a dispensar');
      meds.push(med);
    }
    if(!meds.length)return {ok:false,error:'Agrega al menos un medicamento'};
    if(!diag.length)warnings.unshift('No se indicó ningún diagnóstico');
    return {ok:true,warnings:warnings,clean:{fecha:fecha,tipo:clean(f.tipo,20)||'agudo',medico:medico,especialidad:clean(f.especialidad,80),registro:clean(f.registro,40),hc:clean(f.hc,40),
      diagnosticos:diag,indicaciones:String(f.indicaciones==null?'':f.indicaciones).trim().slice(0,1000),medicamentos:meds}};
  }
  function add(ptId,c){
    var p=Patients.get(ptId);if(!p)return null;
    var r={id:nextRecetaId++,fecha:c.fecha,tipo:c.tipo,medico:c.medico,especialidad:c.especialidad,registro:c.registro,hc:c.hc,diagnosticos:c.diagnosticos,
      cie10cod:c.diagnosticos[0]?c.diagnosticos[0].cod:'',diagnostico:c.diagnosticos[0]?c.diagnosticos[0].desc:'',indicaciones:c.indicaciones,medicamentos:c.medicamentos,
      paciente:p.name,cedula:p.cedula,edad:calcAge(p.birthdate)};
    (p.recetas=p.recetas||[]).push(r);save();return r;
  }
  function remove(ptId,id){
    var p=Patients.get(ptId),a=(p&&p.recetas)||[];
    for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id)){var r=a.splice(i,1)[0];save();return r;}}
    return null;
  }

  /* ── pantallas ── */
  function renderList(){
    const p=Patients.current();
    if(!p.recetas)p.recetas=[];
    return`
    <div class="card">
      <div class="action-row">
        <div class="card-title" style="margin:0">Recetas médicas</div>
        <button class="btn-primary" data-action="rx.openNew">+ Nueva receta</button>
      </div>
      ${p.recetas.length===0?`
        <div style="text-align:center;padding:40px 20px;color:var(--text3)">
          <div style="font-size:40px;margin-bottom:12px">💊</div>
          <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:6px">Sin recetas registradas</div>
          <div style="font-size:12px">Crea recetas médicas siguiendo el formato del Ministerio de Salud del Ecuador</div>
        </div>`
      :p.recetas.slice().reverse().map(r=>`
        <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:40px;height:40px;background:#dbeafe;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">💊</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:700;color:var(--text)">Receta N° ${String(r.id).padStart(6,'0')}</div>
              <div style="font-size:11px;color:var(--text3)">${fmtDate(r.fecha)} · ${r.medicamentos.length} medicamento${r.medicamentos.length!==1?'s':''} · Dr. ${esc(r.medico)}</div>
              ${(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod,desc:r.diagnostico}]).filter(d=>d.cod||d.desc).map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;margin-top:3px;margin-right:4px">${d.cod?`<span style="font-family:monospace;font-weight:700;color:var(--accent);font-size:10px;background:#e8f0fe;padding:1px 6px;border-radius:4px">${esc(d.cod)}</span>`:''}<span style="font-size:10px;color:var(--text2)">${esc(d.desc||'')}</span></span>`).join('')}
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="rx.view" data-id="${r.id}">Ver / Imprimir</button>
              <button class="del-btn" data-action="rx.delete" data-id="${r.id}">✕</button>
            </div>
          </div>
          <div style="margin-top:10px;padding:8px 12px;background:var(--bg);border-radius:8px">
            ${r.medicamentos.map((m,i)=>`<div style="font-size:11px;color:var(--text2);padding:2px 0"><strong>${i+1}.</strong> ${esc(m.nombre)} ${esc(m.dosis)} — ${esc(m.frecuencia)} por ${esc(m.duracion)}</div>`).join('')}
          </div>
        </div>`).join('')}
    </div>
    <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px">
      <div style="font-size:18px">⚕️</div>
      <div style="font-size:12px;color:#1e40af">Las recetas siguen el formato oficial del Ministerio de Salud Pública del Ecuador. Solo pueden ser emitidas por profesionales de salud habilitados.</div>
    </div>`;
  }
  function openNew(){
  diagItemCount=0;medItemCount=0;   // cada formulario empieza en la fila 1 (antes solo se reiniciaba al guardar)
    const profesional=document.getElementById('logoProfesional').textContent;
    openModal(`<div class="modal-title">💊 Nueva Receta — Formato MSP Ecuador</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div class="form-group"><label>Fecha</label><input id="f_rdate" type="date" value="${today()}"></div>
      <div class="form-group"><label>Tipo</label><select id="f_rtipo"><option value="agudo">AGUDA</option><option value="cronico">CRÓNICA</option></select></div>
      <div class="form-group"><label>Médico prescriptor</label><input id="f_rmed" value="${esc(profesional)}"></div>
      <div class="form-group"><label>Especialidad</label><input id="f_resp" value="Odontología General"></div>
      <div class="form-group"><label>Reg. SENESCYT</label><input id="f_rreg" placeholder="N° registro"></div>
      <div class="form-group"><label>N° Historia Clínica</label><input id="f_rhc" placeholder="H.C."></div>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Diagnósticos (CIE-10)</div>
  </div>
      <div id="diag-items"></div>
      <button data-action="rx.addDiag" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar diagnóstico</button>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:10px">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
  <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Rp/ Medicamentos</div>
  <button data-action="rx.addMed" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar medicamento</button>
  </div>
  <div id="med-items"></div>
  </div>
    <div class="form-group" style="margin-bottom:10px"><label>Indicaciones para el paciente</label>
      <textarea id="f_rind" style="min-height:60px" placeholder="Tomar con alimentos, completar el tratamiento, no mezclar con alcohol..."></textarea></div>
    <div class="modal-footer">
      <button class="btn-sec" data-action="app.closeModal">Cancelar</button>
      <button class="btn-primary" data-action="rx.save">Emitir receta</button>
    </div>`);
    document.querySelector('.modal').style.width='650px';
    Prescriptions.addDiagItem(); Prescriptions.addMedItem();
  }
  function addMedItem(catIdx){
  medItemCount++;
  const id=medItemCount;
  const c=(typeof catIdx==='number')?CATALOGO_MEDS[catIdx]:null;
  const dl=`<datalist id="med-dl-${id}">${MEDICAMENTOS_COMUNES.map(m=>`<option value="${esc(m)}">`).join('')}</datalist>`;
  const div=document.createElement('div');
  div.id=`med-item-${id}`;
  div.style.cssText='background:var(--card);border:1px solid '+(c?'var(--accent)':'var(--border)')+';border-radius:10px;padding:12px;margin-bottom:10px';
  div.innerHTML=dl+`
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
  <div style="font-size:12px;font-weight:700;color:var(--accent)">Medicamento ${id}${c?' · ⚡ posología auto':''}</div>
  <button data-action="rx.removeMed" data-id="${id}" style="padding:2px 8px;border:1px solid #fca5a5;border-radius:6px;background:#fee2e2;color:#991b1b;cursor:pointer;font-size:11px">Eliminar</button>
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px">
  <div class="form-group" style="margin:0"><label>Nombre genérico DCI (sin abreviaturas) *</label>
  <input list="med-dl-${id}" id="mn_${id}" value="${c?c.nombre:''}" style="font-weight:600"></div>
  <div class="form-group" style="margin:0"><label>Concentración</label>
  <input id="mc_${id}" placeholder="500 mg" maxlength="40"></div>
  <div class="form-group" style="margin:0"><label>Forma farmacéutica</label>
  <select id="mff_${id}">${['Tableta','Cápsula','Jarabe','Suspensión oral','Solución inyectable','Gel tópico','Crema','Gotas','Enjuague bucal','Comprimido'].map(f=>`<option${c&&c.forma===f?' selected':''}>${f}</option>`).join('')}</select></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
  <div class="form-group" style="margin:0"><label>Vía de administración</label>
  <select id="mv_${id}">${['Oral','Tópica','Sublingual','Inyectable IM','Inyectable IV','Ótica','Rectal'].map(f=>`<option${c&&c.via===f?' selected':''}>${f}</option>`).join('')}</select></div>
  <div class="form-group" style="margin:0"><label>Cantidad (números)</label>
  <input id="mqn_${id}" type="number" min="1" value="${c?c.cantidad:''}" data-on-input="rx.qty" data-id="${id}"></div>
  <div class="form-group" style="margin:0"><label>Cantidad en letras (auto)</label>
  <input id="mql_${id}" value="${c?Prescriptions.numToLetras(c.cantidad):''}" style="text-transform:uppercase;font-size:11px"></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
  <div class="form-group" style="margin:0"><label>Dosis por toma</label><input id="md_${id}" value="${c?c.dosis:''}"></div>
  <div class="form-group" style="margin:0"><label>Frecuencia</label>
  <select id="mf_${id}">${['Cada 6 horas','Cada 8 horas','Cada 12 horas','Cada 24 horas','2 veces al día','3 veces al día','4 veces al día','Según dolor','En caso necesario'].map(f=>`<option${c&&c.frecuencia===f?' selected':''}>${f}</option>`).join('')}</select></div>
  </div>
  <div class="form-group" style="margin:0"><label>Duración del tratamiento</label>
  <input id="mdu_${id}" value="${c?c.duracion:''}"></div>
  ${c&&c.indicacion?`<div style="margin-top:8px;font-size:11px;color:var(--text2);background:var(--bg);border-radius:6px;padding:6px 8px">💡 ${esc(c.indicacion)}</div>`:''}`;
  document.getElementById('med-items').appendChild(div);
  }
  function view(id){
    const r=Patients.current().recetas.find(x=>x.id===id);if(!r)return;
    lastViewed=r.id;
    const diags=(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod||'',desc:r.diagnostico||''}]).filter(d=>d.cod||d.desc);
    const tipoLabel=(r.tipo==='cronico')?'CRÓNICA':'AGUDA';
    openModal(`<div class="modal-title">💊 Receta Médica — N° ${String(r.id).padStart(6,'0')}</div>
    <div style="background:var(--bg);border-radius:12px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(r.paciente)}</div>
          <div style="font-size:11px;color:var(--text3)">${fmtDate(r.fecha)} · Dr. ${esc(r.medico)} · ${esc(r.especialidad)}</div>
        </div>
        <span style="font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;background:${r.tipo==='cronico'?'#dbeafe':'#dcfce7'};color:${r.tipo==='cronico'?'#1e40af':'#166534'}">${tipoLabel}</span>
      </div>
      ${diags.length?`<div style="font-size:11px;color:var(--text2);margin-bottom:10px">📋 <strong>Diagnóstico:</strong> ${diags.map(d=>`${d.cod?esc(d.cod)+' — ':''}${esc(d.desc)}`).join(' | ')}</div>`:''}
      <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Rp/ Medicamentos</div>
      ${r.medicamentos.map((m,i)=>`
        <div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:var(--text);text-transform:uppercase">${i+1}. ${esc(m.nombre)} ${m.concentracion?esc(m.concentracion):''}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${esc(m.formaFarmaceutica||m.forma||'')} · Vía ${esc(m.via||'Oral')}</div>
          <div style="display:flex;gap:16px;margin-top:6px;font-size:11px;color:var(--text2)">
            <span>💉 ${esc(m.dosis||'—')}</span>
            <span>⏰ ${esc(m.frecuencia||'—')}</span>
            <span>📅 ${esc(m.duracion||'—')}</span>
            ${m.cantidadNum?`<span>📦 ${esc(m.cantidadNum)} und. (${esc(m.cantidadLetras||'')})</span>`:''}
          </div>
        </div>`).join('')}
      ${r.indicaciones?`<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px;font-size:12px;color:#0369a1;margin-top:4px"><strong>Indicaciones:</strong> ${esc(r.indicaciones)}</div>`:''}
    </div>
    <div class="modal-footer">
      <button class="btn-sec" data-action="app.closeModal">Cerrar</button>
      <button class="btn-primary" data-action="rx.print" data-id="${r.id}">🖨️ Imprimir receta A4</button>
    </div>`);
    document.querySelector('.modal').style.width='580px';
  }
  function rxHtml(r){

    function horarioPaciente(freq){
  if(!freq)return'—';
  if(freq.includes('6'))return'Cada 6 horas · Mañana · Mediodía · Tarde · Noche';
  if(freq.includes('8'))return'Cada 8 horas · Mañana · Tarde · Noche';
  if(freq.includes('12'))return'Cada 12 horas · Mañana · Noche';
  if(freq.includes('24')||/1 vez/i.test(freq))return'Cada 24 horas · Una vez al día';
  if(/2 veces/i.test(freq))return'2 veces al día · Mañana · Noche';
  if(/3 veces/i.test(freq))return'3 veces al día · Mañana · Tarde · Noche';
  return esc(freq);
  }

  const clinica=esc(document.getElementById('logoText').textContent);
  const logoHtml=logoImg?`<img src="${esc(logoImg)}" style="width:100%;height:100%;object-fit:contain">`:`<div style="width:100%;height:100%;background:#1e3a5f;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px">🦷</div>`;
  const numStr=String(r.id).padStart(6,'0');
  const dia=esc(String(r.fecha.split('-')[2]).padStart(2,'0'));
  const mes=esc(r.fecha.split('-')[1]);
  const anio=esc(r.fecha.split('-')[0]);
  const edadAnios=r.edad||'—';
  const tipoLabel=(r.tipo==='cronico')?'CRÓNICA':'AGUDA';
  const diags=(r.diagnosticos&&r.diagnosticos.length?r.diagnosticos:[{cod:r.cie10cod||'',desc:r.diagnostico||''}]).filter(d=>d.cod||d.desc);
  const compact=r.medicamentos.length>3;
  const medsHtml=r.medicamentos.map((m,i)=>`
  <tr>
  <td style="text-align:center;font-weight:700;color:#1e3a5f">${i+1}</td>
  <td><strong style="text-transform:uppercase">${esc(m.nombre)}</strong>${m.concentracion?' · '+esc(m.concentracion):''}<br><span style="color:#64748b">${esc(m.formaFarmaceutica||m.forma||'Tableta')}</span></td>
  <td style="text-align:center">${esc(m.via||'Oral')}</td>
  <td style="text-align:center">${esc(m.dosis||m.concentracion||'—')}</td>
  <td style="text-align:center">${esc(m.frecuencia||'—')}</td>
  <td style="text-align:center">${esc(m.duracion||'—')}</td>
  <td style="text-align:center">${esc(m.cantidadNum||'—')}${m.cantidadLetras?` (${esc(m.cantidadLetras)})`:''}</td>
  </tr>`).join('');
  const pautaHtml=r.medicamentos.map((m,i)=>`<div style="margin-bottom:3px;font-size:8.5px;line-height:1.35"><strong style="color:#1e3a5f">${i+1}. ${esc(m.nombre)}:</strong> ${esc(m.dosis||'—')} · ${esc(m.frecuencia||'—')} · ${esc(m.duracion||'—')}</div>`).join('');
  const instrHtml=r.medicamentos.map((m,i)=>`
  <tr>
  <td style="padding:3px 6px;border:1px solid #cbd5e1;font-weight:600">${esc(m.nombre)} ${esc(m.concentracion||'')}</td>
  <td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${esc(m.dosis||'—')}</td>
  <td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${horarioPaciente(m.frecuencia)}</td>
  <td style="padding:3px 6px;border:1px solid #cbd5e1;text-align:center">${esc(m.duracion||'—')}</td>
  </tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Receta Médica — ${clinica}</title>
  <style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:A4;margin:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;background:#fff;font-size:10px}
  .page{width:210mm;margin:0 auto;padding:8mm 10mm 6mm}
  .header{display:flex;align-items:center;gap:10px;padding-bottom:6px;border-bottom:2px solid #1e3a5f;margin-bottom:7px}
  .logo-box{width:42px;height:42px;flex-shrink:0;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0}
  .clinic-name{font-size:13px;font-weight:800;color:#1e3a5f;text-transform:uppercase;letter-spacing:.04em}
  .clinic-sub{font-size:8.5px;color:#64748b;margin-top:1px;line-height:1.4}
  .header-right{margin-left:auto;text-align:right}
  .header-title{font-size:11px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.05em}
  .tipo-badge{display:inline-block;font-size:8.5px;font-weight:700;padding:1px 8px;border-radius:20px;margin-top:2px;letter-spacing:.04em;background:${r.tipo==='cronico'?'#dbeafe':'#dcfce7'};color:${r.tipo==='cronico'?'#1e40af':'#166534'}}
  .fecha-txt{font-size:8.5px;color:#64748b;margin-top:2px}
  .sec-title{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:#1e3a5f;padding:3px 8px}
  .pt-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1e3a5f;border-top:none;overflow:hidden;margin-bottom:7px}
  .pt-cell{padding:3px 8px;border-bottom:1px solid #cbd5e1;border-right:1px solid #cbd5e1;font-size:9.5px}
  .pt-cell:nth-child(even){border-right:none}
  .pt-cell:last-child,.pt-cell:nth-last-child(2){border-bottom:none}
  .pt-label{font-size:7.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:1px}
  .pt-val{font-weight:600;color:#0f172a}
  .rp-title{font-size:14px;font-weight:800;color:#1e3a5f;font-style:italic;margin:3px 0}
  .rp-note{font-size:8px;color:#64748b;font-style:italic;margin-top:3px}
  table.meds{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:7px}
  .meds th{background:#1e3a5f;color:#fff;padding:3px 5px;font-size:7.5px;text-transform:uppercase;letter-spacing:.03em;text-align:left}
  .meds td{padding:3px 5px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .two-col{display:grid;grid-template-columns:1fr 1fr;border:1px solid #1e3a5f;border-radius:4px;overflow:hidden;margin-bottom:7px}
  .prescriptor{padding:7px 8px;border-right:1px solid #1e3a5f}
  .pauta{padding:7px 8px}
  .col-title{font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:#1e3a5f;padding:2px 6px;margin:-7px -8px 6px}
  .sign-space{height:24px}
  .sign-line{border-top:1px solid #0f172a;padding-top:3px;font-size:8px;color:#64748b}
  .ind-box{border:1px solid #1e3a5f;border-radius:4px;padding:5px 8px;margin-bottom:7px}
  .ind-title{font-size:7.5px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:.06em;margin-bottom:2px}
  .ind-txt{font-size:9px;line-height:1.5}
  .footer-note{font-size:7.5px;color:#94a3b8;text-align:center;margin-bottom:6px}
  .cut-line{border:none;border-top:1.5px dashed #94a3b8;margin:6px 0;position:relative}
  .cut-label{position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#fff;padding:0 8px;font-size:8px;color:#94a3b8;white-space:nowrap}
  .patient-box{border:1px solid #0ea5e9;border-radius:6px;padding:7px 8px}
  .patient-title{font-size:11px;font-weight:800;color:#0ea5e9;margin-bottom:2px}
  .patient-sub{font-size:8px;color:#0369a1;margin-bottom:5px}
  table.ptab{width:100%;border-collapse:collapse;font-size:8.5px}
  .ptab th{background:#0ea5e9;color:#fff;padding:3px 6px;font-size:7.5px;font-weight:700;text-transform:uppercase;text-align:left}
  .ptab td{padding:3px 6px;border:1px solid #cbd5e1;vertical-align:top}
  .patient-foot{font-size:7.5px;color:#64748b;margin-top:4px;text-align:center}
  .imp-box{margin-top:5px;padding:4px 6px;background:#f0f9ff;border-radius:4px;border:1px solid #bae6fd;font-size:8.5px;line-height:1.4}
  .page.compact .meds td{padding:2px 4px}
  .page.compact .ptab td{padding:2px 4px}
  .page.compact .sign-space{height:18px}
  @media print{body{margin:0}.page{padding:6mm 8mm 5mm}}
  </style></head><body>
  <div class="page${compact?' compact':''}">
  <div class="header">
  <div class="logo-box">${logoHtml}</div>
  <div>
  <div class="clinic-name">${clinica}</div>
  <div class="clinic-sub">${esc(clinicaDireccion||'')} ${clinicaTelefono?'· Tel: '+esc(clinicaTelefono):''}${clinicaRUC?' · RUC: '+esc(clinicaRUC):''}</div>
  </div>
  <div class="header-right">
  <div class="header-title">Receta Médica<br>Ministerio de Salud Pública</div>
  <div><span class="tipo-badge">PRESCRIPCIÓN ${tipoLabel}</span></div>
  <div class="fecha-txt">Fecha: ${dia}/${mes}/${anio}</div>
  <div style="font-size:12px;font-weight:800;color:#1e3a5f;font-family:'Courier New',monospace;margin-top:4px">N° ${String(r.id).padStart(6,'0')}</div>
  </div>
  </div>
  <div class="sec-title">Datos del Paciente</div>
  <div class="pt-grid">
  <div class="pt-cell" style="grid-column:1/-1"><span class="pt-label">Nombres y Apellidos</span><span class="pt-val" style="font-size:11px">${esc(r.paciente)}</span></div>
  <div class="pt-cell"><span class="pt-label">Documento de Identidad</span><span class="pt-val">${esc(r.cedula||'—')}</span></div>
  <div class="pt-cell"><span class="pt-label">Historia Clínica</span><span class="pt-val">${esc(r.hc||'—')}</span></div>
  <div class="pt-cell"><span class="pt-label">Edad</span><span class="pt-val">${edadAnios} años</span></div>
  <div class="pt-cell"><span class="pt-label">Diagnóstico CIE-10</span><span class="pt-val">${diags.map(d=>`${d.cod?esc(d.cod)+' - ':''}${esc(d.desc)}`).join(' | ')||'—'}</span></div>
  </div>
  <div class="sec-title">Datos del Medicamento — Prescripción ${tipoLabel}</div>
  <div class="rp-note">Nombre genérico o DCI, concentración, forma farmacéutica, cantidad en números y letras. Prohibido el uso de abreviaturas.</div>
  <div class="rp-title">Rp/</div>
  <table class="meds">
  <thead><tr><th style="width:14px">#</th><th>Medicamento</th><th>Vía</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Cantidad</th></tr></thead>
  <tbody>${medsHtml}</tbody>
  </table>
  <div class="two-col">
  <div class="prescriptor">
  <div class="col-title">Datos del Prescriptor</div>
  <div style="font-size:10px;font-weight:700">${esc(r.medico)}</div>
  <div style="font-size:8.5px;color:#475569">${esc(r.especialidad)}</div>
  ${r.registro?`<div style="font-size:8.5px;color:#475569">Reg. SENESCYT: ${esc(r.registro)}</div>`:''}
  <div class="sign-space"></div>
  <div class="sign-line">Firma y sello del prescriptor</div>
  </div>
  <div class="pauta">
  <div class="col-title">Pauta de Administración</div>
  ${pautaHtml}
  </div>
  </div>
  ${r.indicaciones?`<div class="ind-box"><div class="ind-title">Indicaciones generales</div><div class="ind-txt">${esc(r.indicaciones)}</div></div>`:''}
  <div class="footer-note">Receta válida por 30 días · Servicio odontológico IVA 0% (Art. 56 LRTI Ecuador) · ${clinica}</div>
  <div class="cut-line"><span class="cut-label">✂ Recortar y entregar al paciente</span></div>
  <div class="patient-box">
  <div class="patient-title">📋 Mis medicamentos — ${esc(r.paciente)}</div>
  <div class="patient-sub">Receta N° ${String(r.id).padStart(6,'0')} · Fecha: ${dia}/${mes}/${anio} · Dr. ${esc(r.medico)} · ${esc(r.especialidad)}</div>
  <table class="ptab">
  <thead><tr><th>Medicamento</th><th style="text-align:center">Cantidad por toma</th><th style="text-align:center">Horario</th><th style="text-align:center">Por cuánto tiempo</th></tr></thead>
  <tbody>${instrHtml}</tbody>
  </table>
  ${r.indicaciones?`<div class="imp-box"><strong>⚠️ IMPORTANTE:</strong> ${esc(r.indicaciones)}</div>`:''}
  <div class="patient-foot">Conserve este comprobante · Para dudas llame a: ${clinicaTelefono?esc(clinicaTelefono):clinica}</div>
  </div>
  </div>
  <script>window.onload=function(){window.print()}<\/script>
  ${'</bo'+'dy></html>'}`;
  return html;
  }

  // filas de diagnóstico (CIE-10)
  function addDiagItem(){
    diagItemCount++;var id=diagItemCount,div=document.createElement('div');
    div.id='diag-item-'+id;div.style.cssText='background:var(--card);border:1px solid var(--border);border-radius:9px;padding:10px;margin-bottom:8px;position:relative';
    var inp='width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;outline:none;background:#f8fafc';
    div.innerHTML='<div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:0 0 110px"><div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px">Código CIE-10</div>'+
      '<input id="dcie_'+id+'" type="text" placeholder="K021..." autocomplete="off" data-on-input="rx.diagCode" data-on-focusin="rx.diagCode" data-id="'+id+'" style="'+inp+';font-family:monospace;font-weight:700;text-transform:uppercase;color:var(--accent)"></div>'+
      '<div style="flex:1;position:relative"><div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:3px">Descripción / Diagnóstico</div>'+
      '<input id="ddesc_'+id+'" type="text" placeholder="Escribe o busca por nombre..." autocomplete="off" data-on-input="rx.diagDesc" data-on-focusin="rx.diagDesc" data-id="'+id+'" style="'+inp+';color:var(--text);font-family:inherit">'+
      '<div id="diag-results-'+id+'" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--card);border:1px solid var(--border);border-radius:0 0 10px 10px;z-index:600;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.15)"></div></div>'+
      '<button data-action="rx.removeDiag" data-id="'+id+'" aria-label="Quitar diagnóstico" style="margin-top:18px;width:32px;height:32px;border:1px solid #fca5a5;border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;font-size:13px;flex-shrink:0">✕</button></div>';
    document.getElementById('diag-items').appendChild(div);
  }
  function removeDiagItem(id){var el=document.getElementById('diag-item-'+id);if(el)el.remove();}
  function showDiagResults(id,results,fromCode){
    var box=document.getElementById('diag-results-'+id);if(!box)return;
    if(!results.length){box.style.display='none';return;}
    box.style.display='block';
    box.innerHTML=results.map(function(r){
      return '<div class="diag-res" data-action="rx.pickDiag" data-id="'+id+'" data-cod="'+esc(r[0])+'" data-desc="'+esc(r[1])+'" data-hover-bg style="padding:8px 12px;cursor:pointer;font-size:11px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:center;background:var(--card)">'+
        '<span style="font-weight:700;color:var(--accent);min-width:44px;font-family:monospace;font-size:12px">'+esc(r[0])+'</span><span style="color:var(--text)">'+esc(r[1])+'</span></div>';
    }).join('');
  }
  function diagInput(id,value,fromCode){activeDiagId=id;Prescriptions.showDiagResults(id,Cie10.search(value),fromCode);}
  function pickDiag(id,cod,desc){
    var c=document.getElementById('dcie_'+id),d=document.getElementById('ddesc_'+id),box=document.getElementById('diag-results-'+id);
    if(c)c.value=cod;if(d)d.value=desc;if(box)box.style.display='none';
  }
  document.addEventListener('click',function(e){            // cerrar las listas al hacer clic fuera
    document.querySelectorAll('[id^="diag-results-"]').forEach(function(box){if(!e.target.closest('#'+box.id)&&!e.target.closest('input'))box.style.display='none';});
  });

  function readForm(){
    var diag=[],meds=[];
    document.querySelectorAll('#diag-items > div').forEach(function(row){
      var ci=row.querySelector('input[id^="dcie_"]'),di=row.querySelector('input[id^="ddesc_"]');
      diag.push({cod:ci?ci.value:'',desc:di?di.value:''});
    });
    document.querySelectorAll('#med-items > div').forEach(function(row){
      var g=function(sel){var e=row.querySelector(sel);return e?e.value:'';};
      meds.push({nombre:g('input[id^="mn_"]'),formaFarmaceutica:g('select[id^="mff_"]'),concentracion:g('input[id^="mc_"]'),via:g('select[id^="mv_"]'),cantidadNum:g('input[id^="mqn_"]'),
        dosis:g('input[id^="md_"]'),frecuencia:g('select[id^="mf_"]'),duracion:g('input[id^="mdu_"]')});
    });
    return {fecha:v('f_rdate'),tipo:v('f_rtipo'),medico:v('f_rmed'),especialidad:v('f_resp'),registro:v('f_rreg'),hc:v('f_rhc'),diagnosticos:diag,indicaciones:v('f_rind'),medicamentos:meds};
  }
  function saveNew(){
    var p=Patients.current();if(!p)return;
    var r=check(readForm());
    if(!r.ok){alert(r.error);return;}
    if(r.warnings.length&&!confirm('Revisa antes de emitir la receta:\n\n• '+r.warnings.join('\n• ')+'\n\n¿Emitirla de todos modos?'))return;
    api.add(p.id,r.clean);closeModal();medItemCount=0;diagItemCount=0;Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),r=find(p,id);if(!r)return;
    if(!confirm('¿Eliminar la receta N° '+String(r.id).padStart(6,'0')+' del '+fmtDate(r.fecha)+'?\n\nEs un documento médico: el número NO se reutiliza y quedará un hueco en la numeración.'))return;
    api.remove(p.id,id);Ficha.render();
  }
  function printRx(id){
    if(id===undefined)id=lastViewed;
    var p=Patients.current(),r=find(p,id);if(!r)return;
    var w=safeOpen('','_blank','width=900,height=950');if(!w)return;
    w.document.write(rxHtml(r));w.document.close();
  }
  function removeMed(id){var el=document.getElementById('med-item-'+id);if(el)el.remove();}
  function qtyInput(id,value){var e=document.getElementById('mql_'+id);if(e)e.value=Prescriptions.numToLetras(value);}

  var api={find:find,numToLetras:numToLetras,check:check,add:add,remove:remove,rxHtml:rxHtml,readForm:readForm,
    renderList:renderList,openNew:openNew,addMedItem:addMedItem,addDiagItem:addDiagItem,removeDiagItem:removeDiagItem,removeMed:removeMed,qtyInput:qtyInput,
    diagInput:diagInput,pickDiag:pickDiag,showDiagResults:showDiagResults,view:view,saveNew:saveNew,deleteUI:deleteUI,printRx:printRx};
  return api;
})();

/* ═══════════════════ PRESUPUESTOS ═══════════════════ */
const Quotes=(function(){
  'use strict';
  var presupItemCount=0;
  function clean(s,max){return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max);}
  function find(p,id){var a=(p&&p.presupuestos)||[];for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id))return a[i];}return null;}
  function num(id){return String(id).padStart(4,'0');}

  /* ── datos ── */
  // Valida y calcula un presupuesto. Todo error se explica; nada se "corrige" en silencio (antes un precio inválido pasaba a $0).
  function check(f){
    f=f||{};
    var fecha=String(f.fecha||'').trim();
    if(!Finance.validDate(fecha))return {ok:false,error:'La fecha del presupuesto no es válida'};
    var vr=String(f.validez==null?'':f.validez).trim(),validez=30;
    if(vr){if(!/^\d+$/.test(vr)||+vr<1||+vr>365)return {ok:false,error:'La validez debe ser de 1 a 365 días'};validez=+vr;}
    var items=[],warnings=[],sub=0;
    for(var i=0;i<(f.items||[]).length;i++){
      var it=f.items[i],nombre=clean(it&&it.nombre,200);
      if(!nombre)continue;
      if(nombre.length>120)return {ok:false,error:'El nombre del ítem "'+nombre.slice(0,30)+'…" es demasiado largo (máximo 120 caracteres)'};
      var pr=String(it.precio==null?'':it.precio).trim(),precio=0;
      if(!pr)return {ok:false,error:'Falta el precio de "'+nombre+'" (escribe 0 si es una cortesía)'};
      precio=parseMonto(pr);if(isNaN(precio))return {ok:false,error:'El precio de "'+nombre+'" no es válido'};
      var qr=String(it.qty==null?'':it.qty).trim(),qty=1;
      if(qr){if(!/^\d+$/.test(qr)||+qr<1||+qr>999)return {ok:false,error:'La cantidad de "'+nombre+'" debe ser un número entero de 1 a 999'};qty=+qr;}
      var subtotal=mulM(precio,qty);sub=addM(sub,subtotal);
      items.push({nombre:nombre,precio:precio,qty:qty,subtotal:subtotal});
    }
    if(!items.length)return {ok:false,error:'Agrega al menos un ítem al presupuesto'};
    var dr=String(f.descuento==null?'':f.descuento).trim(),desc=0;
    if(dr){desc=parseMonto(dr);if(isNaN(desc))return {ok:false,error:'El descuento no es válido'};}
    if(desc>sub)return {ok:false,error:'El descuento ('+money(desc)+') no puede ser mayor al subtotal ('+money(sub)+')'};
    var total=subM(sub,desc);
    if(total===0)warnings.push('El total del presupuesto es $0.00');
    return {ok:true,warnings:warnings,clean:{fecha:fecha,validez:validez,observaciones:String(f.observaciones==null?'':f.observaciones).trim().slice(0,1000),items:items,descuento:desc,subtotal:sub,total:total}};
  }
  function add(ptId,c){
    var p=Patients.get(ptId);if(!p)return null;
    var pr={id:nextPresupId++,fecha:c.fecha,validez:c.validez,observaciones:c.observaciones,items:c.items,descuento:c.descuento,subtotal:c.subtotal,total:c.total,estado:'borrador',fechaAprobacion:null,firmaPaciente:''};
    (p.presupuestos=p.presupuestos||[]).push(pr);save();return pr;
  }
  function linked(p,pr){                                   // tratamientos que nacieron de este presupuesto
    var all=((p&&p.treatments)||[]).filter(function(t){return String(t.presupId)===String(pr.id);});
    var pend=all.filter(function(t){return t.status!=='realizado';});
    return {todos:all,pendientes:pend,realizados:all.length-pend.length,montoPend:pend.reduce(function(s,t){return addM(s,t.cost);},0)};
  }
  function checkApprove(f){
    f=f||{};var firma=clean(f.firma,200),fecha=String(f.fecha||'').trim();
    if(!firma)return {ok:false,error:'El nombre de quien aprueba es obligatorio'};
    if(firma.length>120)return {ok:false,error:'El nombre es demasiado largo (máximo 120 caracteres)'};
    if(!Finance.validDate(fecha))return {ok:false,error:'La fecha de aprobación no es válida'};
    if(fecha>today())return {ok:false,error:'La fecha de aprobación no puede ser futura'};
    return {ok:true,clean:{firma:firma,fecha:fecha}};
  }
  // Solo un borrador se puede aprobar. Antes aprobar dos veces (doble acción, o el mismo presupuesto desde otro dispositivo) duplicaba los tratamientos y la deuda.
  function approve(ptId,id,o){
    var p=Patients.get(ptId),pr=find(p,id);
    if(!pr)return {ok:false,error:'notfound'};
    if(pr.estado!=='borrador')return {ok:false,error:'state',estado:pr.estado};
    pr.estado='aprobado';pr.fechaAprobacion=o.fecha;pr.firmaPaciente=o.firma;
    var created=[];
    if(o.createTreatments&&!(p.treatments||[]).some(function(t){return String(t.presupId)===String(pr.id);})){
      p.treatments=p.treatments||[];
      var factor=pr.subtotal>0?pr.total/pr.subtotal:1,acum=0;                        // el descuento se reparte entre los ítems
      pr.items.forEach(function(it,i){
        var costo=r2(it.subtotal*factor);
        if(i===pr.items.length-1)costo=r2(pr.total-acum);                              // el último ajusta centavos: la suma = total del presupuesto
        acum=r2(acum+costo);
        var t={id:uid(),name:it.nombre,tooth:'Según presupuesto',date:today(),cost:costo,status:'pendiente',presupId:pr.id};
        p.treatments.push(t);created.push(t);
      });
    }
    save();return {ok:true,created:created};
  }
  function reject(ptId,id){
    var p=Patients.get(ptId),pr=find(p,id);
    if(!pr)return {ok:false,error:'notfound'};
    if(pr.estado!=='borrador')return {ok:false,error:'state',estado:pr.estado};      // uno aprobado ya generó tratamientos: no se "rechaza"
    pr.estado='rechazado';save();return {ok:true};
  }
  function remove(ptId,id,o){
    var p=Patients.get(ptId),a=(p&&p.presupuestos)||[],idx=-1;
    for(var i=0;i<a.length;i++){if(String(a[i].id)===String(id)){idx=i;break;}}
    if(idx<0)return null;
    var pr=a.splice(idx,1)[0],n=0;
    if(o&&o.removePending){                                                           // solo los pendientes: lo ya realizado no se toca
      for(var j=p.treatments.length-1;j>=0;j--){var t=p.treatments[j];if(String(t.presupId)===String(pr.id)&&t.status!=='realizado'){p.treatments.splice(j,1);n++;}}
    }
    save();return {removed:pr,treatmentsRemoved:n};
  }
  function printDocHtml(inner){
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Presupuesto Dental</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;color:#0f172a}@media print{body{padding:12px}}</style></head><body>'+inner+'</body></html>';
  }

  /* ── pantallas ── */
  function renderList(){
    const p=Patients.current();
    if(!p.presupuestos)p.presupuestos=[];
    const cta=resumenCuenta(p),totalPresup=cta.aprobado,totalPagado=cta.pagado;
    return`
    ${p.presupuestos.length?`
    <div class="grid3" style="margin-bottom:14px">
      <div class="kpi"><div class="kpi-label">Presupuesto aprobado</div><div class="kpi-val" style="color:var(--accent)">${money(totalPresup)}</div>${cta.borrador>0?`<div class="kpi-sub">Borradores sin aprobar: ${money(cta.borrador)} (no incluidos)</div>`:''}</div>
      <div class="kpi"><div class="kpi-label">Total pagado</div><div class="kpi-val" style="color:var(--green)">${money(totalPagado)}</div></div>
      <div class="kpi"><div class="kpi-label">Saldo del presupuesto aprobado</div><div class="kpi-val" style="color:${cta.aprobadoPendiente>0?'var(--red)':'var(--green)'}">${money(cta.aprobadoPendiente)}</div></div>
    </div>`:''}
    <div class="card">
      <div class="action-row">
        <div class="card-title" style="margin:0">Presupuestos</div>
        <button class="btn-primary" data-action="quotes.openNew">+ Nuevo presupuesto</button>
      </div>
      ${p.presupuestos.length===0?`
        <div style="text-align:center;padding:32px 20px;color:var(--text3)">
          <div style="font-size:36px;margin-bottom:10px">💰</div>
          <div style="font-size:14px;font-weight:500;color:var(--text2);margin-bottom:4px">Sin presupuestos</div>
          <div style="font-size:12px">Crea un presupuesto formal para presentar al paciente antes del tratamiento</div>
        </div>`
      :p.presupuestos.slice().reverse().map(pr=>{
        const pct=pr.total>0?Math.min(100,Math.round((totalPagado/pr.total)*100)):0;
        const statusColor={borrador:'#64748b',aprobado:'#10b981',rechazado:'#ef4444'}[pr.estado]||'#64748b';
        const statusBg={borrador:'#f1f5f9',aprobado:'#d1fae5',rechazado:'#fee2e2'}[pr.estado]||'#f1f5f9';
        const statusLabel={borrador:'Borrador',aprobado:'✓ Aprobado',rechazado:'✕ Rechazado'}[pr.estado]||'Borrador';
        return`
        <div style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="font-size:13px;font-weight:700;color:var(--text)">Presupuesto N° ${String(pr.id).padStart(4,'0')}</div>
                <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;background:${statusBg};color:${statusColor}">${statusLabel}</span>
              </div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">${fmtDate(pr.fecha)} · ${pr.items.length} ítem${pr.items.length!==1?'s':''} · Total: <strong>$${pr.total.toFixed(2)}</strong></div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn-sm" style="font-size:11px;padding:4px 10px" data-action="quotes.view" data-id="${pr.id}">👁 Ver</button>
              ${pr.estado==='borrador'?`
                <button class="btn-sm" style="font-size:11px;padding:4px 10px;background:#d1fae5;color:#065f46;border-color:#6ee7b7" data-action="quotes.approve" data-id="${pr.id}">✓ Aprobar</button>
                <button class="btn-sm" style="font-size:11px;padding:4px 10px;background:#fee2e2;color:#991b1b;border-color:#fca5a5" data-action="quotes.reject" data-id="${pr.id}">✕ Rechazar</button>`:''}
              <button class="del-btn" data-action="quotes.delete" data-id="${pr.id}">✕</button>
            </div>
          </div>
          ${pr.estado==='aprobado'?`
          <div style="margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:4px">
              <span>Progreso de pago</span>
              <span><strong>$${totalPagado.toFixed(2)}</strong> de $${pr.total.toFixed(2)} (${pct}%)</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${pct>=100?'var(--green)':'var(--accent)'};border-radius:4px;transition:width .3s"></div>
            </div>
          </div>`:''}
          <div style="font-size:11px;color:var(--text3)">${pr.items.slice(0,3).map(it=>`${esc(it.nombre)} (${it.qty})`).join(' · ')}${pr.items.length>3?` · +${pr.items.length-3} más`:''}</div>
        </div>`;
      }).join('')}
    </div>`;
  }
  function openNew(){
    presupItemCount=0;
    openModal(`<div class="modal-title">💰 Nuevo presupuesto</div>
    <div class="form-row"><div class="form-group"><label>Fecha</label><input id="f_pfd" type="date" value="${today()}"></div><div class="form-group"><label>Validez</label><select id="f_pfval"><option value="15">15 días</option><option value="30" selected>30 días</option><option value="60">60 días</option><option value="90">90 días</option></select></div></div>
    <div class="form-row form-full"><div class="form-group"><label>Observaciones / Plan de tratamiento</label><input id="f_pfobs" placeholder="Descripción del plan, condiciones, acuerdos..."></div></div>
    <div style="background:var(--bg);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em">Ítems del presupuesto</div>
        <button data-action="quotes.addBlank" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;font-weight:600">+ Agregar ítem</button>
      </div>
      <div id="presup-items"></div>
      ${servicios.length?`<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">
        <div style="font-size:10px;color:var(--text3);margin-bottom:6px">⚡ Del catálogo:</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${servicios.map(s=>`<button data-action="quotes.addFromSvc" data-nombre="${esc(s.nombre)}" data-precio="${esc(s.precio)}" style="padding:4px 10px;border:1px solid var(--border);border-radius:16px;background:var(--card);font-size:11px;cursor:pointer;color:var(--text)">${esc(s.nombre)} <span style="color:var(--green);font-weight:600">$${s.precio.toFixed(2)}</span></button>`).join('')}
        </div></div>`:''}
    </div>
    <div class="form-row"><div class="form-group"><label>Descuento ($)</label><input id="f_pfdesc" type="number" min="0" step="0.01" value="0" data-on-input="quotes.recalc"></div><div class="form-group"><label>Total</label><div id="f_pftotal" style="font-size:22px;font-weight:700;color:var(--accent);padding:8px 0">$0.00</div></div></div>
    <div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" data-action="quotes.save">Crear presupuesto</button></div>`);
    document.querySelector('.modal').style.width='640px';
    Quotes.addPresupItem();
  }
  function addPresupItem(nombre='',precio=0,qty=1){
    presupItemCount++;
    const id=presupItemCount;
    const div=document.createElement('div');
    div.id=`pi-${id}`;
    div.style.cssText='display:grid;grid-template-columns:2fr 1fr 70px auto;gap:8px;align-items:end;margin-bottom:8px';
    div.innerHTML=`
      <div class="form-group" style="margin:0"><label style="font-size:10px">Servicio / Descripción *</label><input id="pin_${id}" value="${esc(nombre)}" placeholder="Obturación, extracción..." data-on-input="quotes.recalc"></div>
      <div class="form-group" style="margin:0"><label style="font-size:10px">Precio unitario</label><input id="pip_${id}" type="number" min="0" step="0.01" value="${precio}" data-on-input="quotes.recalc"></div>
      <div class="form-group" style="margin:0"><label style="font-size:10px">Cant.</label><input id="piq_${id}" type="number" min="1" value="${qty}" data-on-input="quotes.recalc"></div>
      <button data-action="quotes.removeItem" data-id="${id}" style="height:36px;padding:0 10px;border:1px solid #fca5a5;border-radius:8px;background:#fee2e2;color:#991b1b;cursor:pointer;margin-bottom:1px">✕</button>`;
    document.getElementById('presup-items').appendChild(div);
    Quotes.recalc();
  }
  function addPresupItemFromSvc(nombre,precio){ Quotes.addPresupItem(nombre,precio,1); }
  function recalc(){
    let sub=0;
    document.querySelectorAll('[id^="pi-"]').forEach(row=>{
      const id=row.id.replace('pi-','');
      const p=parseMonto(document.getElementById(`pip_${id}`)?.value)||0;
      const q=parseInt(document.getElementById(`piq_${id}`)?.value)||1;
      sub=addM(sub,mulM(p,q));
    });
    const desc=Math.min(parseMonto(document.getElementById('f_pfdesc')?.value)||0,sub);
    const el=document.getElementById('f_pftotal');
    if(el)el.textContent=money(subM(sub,desc));
  }
  function view(id){
    const pr=Patients.current().presupuestos.find(x=>x.id===id);if(!pr)return;
    const clinicaNombre=document.getElementById('logoText').textContent;
    const profesional=document.getElementById('logoProfesional').textContent;
    const totalPagado=Patients.current().payments.reduce((s,py)=>addM(s,py.amount),0);
    const pct=pr.total>0?Math.min(100,Math.round((totalPagado/pr.total)*100)):0;
    const statusColor={borrador:'#64748b',aprobado:'#10b981',rechazado:'#ef4444'}[pr.estado];
    const statusLabel={borrador:'BORRADOR',aprobado:'APROBADO ✓',rechazado:'RECHAZADO'}[pr.estado];
    openModal(`<div class="modal-title">💰 Presupuesto N° ${String(pr.id).padStart(4,'0')}</div>
    <div id="presup-print-area" style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:20px;color:#0f172a;font-size:12px;font-family:Arial,sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0f172a">
        <div>
          <div style="font-size:16px;font-weight:700">${esc(clinicaNombre)}</div>
          <div style="font-size:11px;color:#64748b">${esc(profesional)} · RUC: ${esc(clinicaRUC||'—')}</div>
          <div style="font-size:11px;color:#64748b">${esc(clinicaDireccion||'')} ${clinicaTelefono?'· Tel: '+esc(clinicaTelefono):''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:16px;font-weight:700">PRESUPUESTO DENTAL</div>
          <div style="font-size:13px;font-weight:700;color:${statusColor};margin-top:2px">${statusLabel}</div>
          <div style="font-size:11px;color:#64748b">N° ${String(pr.id).padStart(4,'0')} · ${fmtDate(pr.fecha)}</div>
          <div style="font-size:11px;color:#64748b">Válido por ${esc(pr.validez)} días</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;padding:10px;background:#f8fafc;border-radius:8px">
        <div><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Paciente</div><div style="font-size:13px;font-weight:600">${esc(Patients.current().name)}</div></div>
        <div><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Cédula</div><div style="font-size:13px;font-weight:600">${esc(Patients.current().cedula||'—')}</div></div>
        ${pr.observaciones?`<div style="grid-column:1/-1"><div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px">Plan de tratamiento</div><div style="font-size:12px">${esc(pr.observaciones)}</div></div>`:''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Descripción</th>
          <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Cant.</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">P. Unitario</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Total</th>
        </tr></thead>
        <tbody>
          ${pr.items.map(it=>`<tr style="border-bottom:1px solid #e2e8f0">
            <td style="padding:9px 10px">${esc(it.nombre)}</td>
            <td style="padding:9px 10px;text-align:center">${it.qty}</td>
            <td style="padding:9px 10px;text-align:right">$${it.precio.toFixed(2)}</td>
            <td style="padding:9px 10px;text-align:right;font-weight:600">$${it.subtotal.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-bottom:14px;padding:10px;background:#f8fafc;border-radius:8px;display:inline-block;min-width:220px;float:right">
        <div style="font-size:12px;color:#64748b;margin-bottom:3px">Subtotal: $${pr.subtotal.toFixed(2)}</div>
        ${pr.descuento?`<div style="font-size:12px;color:#10b981;margin-bottom:4px">Descuento: -$${pr.descuento.toFixed(2)}</div>`:''}
        <div style="font-size:20px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;padding-top:6px">TOTAL: $${pr.total.toFixed(2)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">IVA 0% — Servicio de salud (Art. 56 LRTI Ecuador)</div>
      </div>
      <div style="clear:both"></div>
      ${pr.estado==='aprobado'?`
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin-bottom:14px;font-size:11px;color:#15803d">
        ✓ Aprobado el ${fmtDate(pr.fechaAprobacion)}${pr.firmaPaciente?' · Firmado por: '+esc(pr.firmaPaciente):''}
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px">
          <span>Progreso de pago</span><span>$${totalPagado.toFixed(2)} de $${pr.total.toFixed(2)} (${pct}%)</span>
        </div>
        <div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pct>=100?'#10b981':'#0ea5e9'};border-radius:5px"></div>
        </div>
      </div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
        <div style="text-align:center"><div style="height:44px"></div><div style="border-top:1px solid #0f172a;padding-top:6px">
          <div style="font-size:12px;font-weight:700">${esc(Patients.current().name)}</div>
          <div style="font-size:10px;color:#64748b">Firma del paciente · C.I. ${esc(Patients.current().cedula||'—')}</div>
        </div></div>
        <div style="text-align:center"><div style="height:44px"></div><div style="border-top:1px solid #0f172a;padding-top:6px">
          <div style="font-size:12px;font-weight:700">${esc(profesional)}</div>
          <div style="font-size:10px;color:#64748b">Firma del profesional</div>
        </div></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-sec" data-action="app.closeModal">Cerrar</button>
      ${pr.estado==='borrador'?`<button class="btn-primary" style="background:var(--green)" data-action="quotes.approve" data-id="${pr.id}">✓ Aprobar</button>`:''}
      <button class="btn-primary" data-action="quotes.print">🖨️ Imprimir</button>
    </div>`);
    document.querySelector('.modal').style.width='700px';
  }
  function readForm(){
    var items=[];
    document.querySelectorAll('[id^="pi-"]').forEach(function(row){
      var id=row.id.replace('pi-',''),g=function(p){var e=document.getElementById(p+'_'+id);return e?e.value:'';};
      items.push({nombre:g('pin'),precio:g('pip'),qty:g('piq')});
    });
    return {fecha:v('f_pfd'),validez:v('f_pfval'),observaciones:v('f_pfobs'),items:items,descuento:v('f_pfdesc')};
  }
  function saveNew(){
    var p=Patients.current();if(!p)return;
    var r=check(readForm());
    if(!r.ok){alert(r.error);return;}
    if(r.warnings.length&&!confirm(r.warnings.join('\n')+'\n\n¿Guardarlo de todos modos?'))return;
    api.add(p.id,r.clean);closeModal();presupItemCount=0;Ficha.render();
  }
  function removeItem(id){var el=document.getElementById('pi-'+id);if(el)el.remove();recalc();}
  function openApprove(id){
    var p=Patients.current(),pr=find(p,id);if(!pr)return;
    if(pr.estado!=='borrador'){alert('Este presupuesto ya está '+pr.estado+'.');Ficha.render();return;}
    openModal('<div class="modal-title">✓ Aprobar presupuesto</div>'+
      '<p style="font-size:13px;color:var(--text2);margin-bottom:14px">Confirma que <strong>'+esc(p.name)+'</strong> aprobó el presupuesto N° '+num(pr.id)+' por <strong>'+money(pr.total)+'</strong>.</p>'+
      '<div class="form-row form-full"><div class="form-group"><label>Nombre del paciente / representante que firma</label><input id="f_pfirma" value="'+esc(p.name)+'"></div></div>'+
      '<div class="form-row form-full"><div class="form-group"><label>Fecha de aprobación</label><input id="f_pfecha" type="date" max="'+today()+'" value="'+today()+'"></div></div>'+
      '<label style="display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text);margin:4px 0 14px;cursor:pointer"><input id="f_ptx" type="checkbox" checked style="margin-top:3px"><span>Agregar los ítems como <b>tratamientos pendientes</b> (el descuento se reparte entre ellos)</span></label>'+
      '<div class="modal-footer"><button class="btn-sec" data-action="app.closeModal">Cancelar</button><button class="btn-primary" style="background:var(--green)" data-action="quotes.confirmApprove" data-id="'+esc(id)+'">✓ Confirmar</button></div>');
  }
  function confirmApprove(id){
    var p=Patients.current();if(!p)return;
    var r=checkApprove({firma:v('f_pfirma'),fecha:v('f_pfecha')});if(!r.ok){alert(r.error);return;}
    var cb=document.getElementById('f_ptx'),res=api.approve(p.id,id,{firma:r.clean.firma,fecha:r.clean.fecha,createTreatments:cb?cb.checked:true});
    if(!res.ok)alert(res.error==='state'?'Este presupuesto ya fue aprobado o rechazado (quizá desde otro dispositivo). No se hizo ningún cambio.':'No se encontró el presupuesto.');
    closeModal();Ficha.render();
  }
  function rejectUI(id){
    var p=Patients.current(),pr=find(p,id);if(!pr)return;
    if(pr.estado!=='borrador'){alert('Este presupuesto ya está '+pr.estado+': solo se puede rechazar un borrador.'+(pr.estado==='aprobado'?'\nSi fue un error, elimínalo.':''));Ficha.render();return;}
    if(!confirm('¿Marcar el presupuesto N° '+num(pr.id)+' como rechazado?'))return;
    api.reject(p.id,id);closeModal();Ficha.render();
  }
  function deleteUI(id){
    var p=Patients.current(),pr=find(p,id);if(!pr)return;
    var l=linked(p,pr);
    if(!l.pendientes.length){
      if(!confirm('¿Eliminar el presupuesto N° '+num(pr.id)+'?'+(l.realizados?'\n\nSus '+l.realizados+' tratamiento(s) ya realizados se conservan.':'')))return;
      api.remove(p.id,id);Ficha.render();return;
    }
    openModal('<div class="modal-title">Eliminar presupuesto N° '+num(pr.id)+'</div>'+
      '<p style="font-size:13px;color:var(--text2);margin-bottom:10px">Este presupuesto ya generó <b>'+l.pendientes.length+' tratamiento'+(l.pendientes.length>1?'s':'')+' pendiente'+(l.pendientes.length>1?'s':'')+'</b> por <b>'+money(l.montoPend)+'</b>, que hoy suma'+(l.pendientes.length>1?'n':'')+' al saldo del plan del paciente.'+(l.realizados?' Sus '+l.realizados+' tratamiento(s) ya realizados se conservan en cualquier caso.':'')+'</p>'+
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px">'+
      '<button class="btn-primary" data-action="quotes.deleteWithTx" data-id="'+esc(id)+'" style="background:var(--red)">Eliminar el presupuesto y sus tratamientos pendientes</button>'+
      '<button class="btn-sec" data-action="quotes.deleteOnly" data-id="'+esc(id)+'">Eliminar solo el presupuesto (los tratamientos quedan)</button>'+
      '<button class="btn-sec" data-action="app.closeModal">Cancelar</button></div>');
  }
  function confirmDelete(id,withTx){var p=Patients.current();if(!p)return;api.remove(p.id,id,{removePending:!!withTx});closeModal();Ficha.render();}
  function printQuote(){
    var area=document.getElementById('presup-print-area');if(!area)return;
    var w=safeOpen('','_blank','width=820,height=900');if(!w)return;
    w.document.write(printDocHtml(area.innerHTML));w.document.close();
    setTimeout(function(){try{w.print();}catch(e){}},400);
  }
  var api={find:find,check:check,add:add,linked:linked,checkApprove:checkApprove,approve:approve,reject:reject,remove:remove,printDocHtml:printDocHtml,readForm:readForm,
    renderList:renderList,openNew:openNew,addPresupItem:addPresupItem,addPresupItemFromSvc:addPresupItemFromSvc,removeItem:removeItem,recalc:recalc,view:view,
    saveNew:saveNew,openApprove:openApprove,confirmApprove:confirmApprove,rejectUI:rejectUI,deleteUI:deleteUI,confirmDelete:confirmDelete,printQuote:printQuote};
  return api;
})();

/* ═══ Acciones del módulo (reemplazan los onclick del HTML) ═══ */
App.actions({
  'consents.openSelect':function(){Consents.openSelect();},
  'consents.add':function(c){Consents.add(c.id);},
  'consents.openCustom':function(){Consents.openCustom();},
  'consents.saveCustom':function(){Consents.saveCustom();},
  'consents.view':function(c){Consents.view(c.id);},
  'consents.openSign':function(c){Consents.openSign(c.id);},
  'consents.confirmSign':function(c){Consents.confirmSign(c.id);},
  'consents.delete':function(c){Consents.deleteUI(c.id);},
  'consents.print':function(c){Consents.printDoc(c.id);},
  'rx.openNew':function(){Prescriptions.openNew();},
  'rx.view':function(c){Prescriptions.view(c.id);},
  'rx.delete':function(c){Prescriptions.deleteUI(c.id);},
  'rx.print':function(c){Prescriptions.printRx(c.id);},
  'rx.save':function(){Prescriptions.saveNew();},
  'rx.addDiag':function(){Prescriptions.addDiagItem();},
  'rx.removeDiag':function(c){Prescriptions.removeDiagItem(c.id);},
  'rx.addMed':function(c){Prescriptions.addMedItem(c.id);},
  'rx.removeMed':function(c){Prescriptions.removeMed(c.id);},
  'rx.qty':function(c){Prescriptions.qtyInput(c.id,c.value);},
  'rx.diagCode':function(c){Prescriptions.diagInput(c.id,c.value,true);},
  'rx.diagDesc':function(c){Prescriptions.diagInput(c.id,c.value,false);},
  'rx.pickDiag':function(c){Prescriptions.pickDiag(c.id,c.data.cod,c.data.desc);},
  'quotes.openNew':function(){Quotes.openNew();},
  'quotes.view':function(c){Quotes.view(c.id);},
  'quotes.save':function(){Quotes.saveNew();},
  'quotes.addBlank':function(){Quotes.addPresupItem();},
  'quotes.addFromSvc':function(c){Quotes.addPresupItemFromSvc(c.data.nombre,parseMonto(c.data.precio)||0);},
  'quotes.removeItem':function(c){Quotes.removeItem(c.id);},
  'quotes.recalc':function(){Quotes.recalc();},
  'quotes.approve':function(c){Quotes.openApprove(c.id);},
  'quotes.confirmApprove':function(c){Quotes.confirmApprove(c.id);},
  'quotes.reject':function(c){Quotes.rejectUI(c.id);},
  'quotes.delete':function(c){Quotes.deleteUI(c.id);},
  'quotes.deleteOnly':function(c){Quotes.confirmDelete(c.id,false);},
  'quotes.deleteWithTx':function(c){Quotes.confirmDelete(c.id,true);},
  'quotes.print':function(){Quotes.printQuote();}
});
