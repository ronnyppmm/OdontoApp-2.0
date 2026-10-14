# Sincronización con Supabase — guía rápida

La app guarda todo en tu navegador (funciona sin internet). La nube es **opcional** y sirve para usar la app en varios
dispositivos y tener un respaldo. Cada paciente, cita, pago, receta, etc. se sincroniza **por separado**, así que dos
dispositivos que editan cosas distintas **no se pisan**.

## Configuración (una sola vez, ~5 minutos)
1. Crea un proyecto en https://supabase.com (plan gratuito).
2. **SQL Editor** → pega todo `supabase/schema.sql` → *Run*. (También puedes usar el botón «Copiar SQL» dentro de la app.)
3. **Authentication → Users → Add user**: tu correo y contraseña, marca *Auto Confirm*.
4. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*.
5. En la app: botón de nube → pega **Project URL** y **anon public key** (Settings → API) + tu correo y contraseña → *Conectar*.

Cada dispositivo nuevo repite solo el paso 5 con la misma cuenta.

## Si ya usabas la nube antigua
En el paso 5 escribe tu «ID de clínica anterior». Después de conectar verás «Importar de la nube antigua».
Cuando compruebes que todo está en el sistema nuevo, ejecuta las líneas comentadas al final de `schema.sql`
para cerrar las tablas antiguas (la política `public_access` dejaba los datos abiertos a cualquiera con la clave pública).

## Qué esperar
- Los cambios suben a los ~3 segundos y se descargan cada minuto, al volver a la pestaña y al recuperar internet.
- Sin internet sigues trabajando; al volver, todo se sube.
- Si dos dispositivos cambian **el mismo dato**, gana el que sincroniza después y lo descartado queda en
  «Cambios descartados al fusionar» (panel de la nube) para que puedas recuperarlo.
- Si este dispositivo se queda sin pacientes (por ejemplo, los datos no cargaron), **no se borra la nube**:
  la app lo detecta y te pregunta.
- Los pacientes de ejemplo (María García, Carlos Ruiz) no se suben.
- Las radiografías a tamaño completo se guardan solo en cada dispositivo; en la nube va la miniatura.

## Pruebas
`npm i && npm test`. Las pruebas de sincronización contra una base real (`tests/sync.pg.test.js`) necesitan PostgreSQL y
PostgREST locales (`bash tests/pg/start.sh`); si no están, se omiten.
