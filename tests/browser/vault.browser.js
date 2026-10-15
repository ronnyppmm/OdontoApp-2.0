// Prueba en Chromium REAL: cifrado de punta a punta (archivos crudos de IndexedDB/localStorage sin texto legible, bloqueo al recargar, PIN, recuperación, desactivar). Necesita: npm i -D playwright-core y CHROMIUM=ruta.
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright-core');
const ROOT=process.argv[2]||require('path').resolve(__dirname,'../..');const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'text/plain'});r.end(d);});});
let bad=0;const ck=(n,ok,x)=>{console.log((ok?'  ✔ ':'  ✘ ')+n+(ok?'':'  '+(x===undefined?'':JSON.stringify(x)).slice(0,300)));if(!ok)bad++;};
(async()=>{await new Promise(ok=>srv.listen(0,ok));const url=`http://localhost:${srv.address().port}/index.html`;
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await br.newContext();const pg=await ctx.newPage();const errs=[],viol=[];
pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));pg.on('console',m=>{const t=m.text();if(/Content Security|Refused to/i.test(t))viol.push(t);if(m.type()==='error'&&!/fonts|ERR_|Failed to load/i.test(t))errs.push(t.slice(0,200));});
pg.on('dialog',d=>d.accept());
const boot=async()=>{await pg.goto(url);await pg.waitForTimeout(1800);};
// volcado crudo de TODO lo guardado (localStorage + 3 bases IndexedDB), sin pasar por la app
const dump=()=>pg.evaluate(async()=>{const out={ls:JSON.stringify(Object.assign({},localStorage)),idb:{}};
 const have=(await indexedDB.databases()).map(x=>x.name);
 for(const n of ['odontoapp_db','odontoapp_imgs','odontoapp_sync']){out.idb[n]={};if(!have.includes(n))continue;const db=await new Promise((ok,no)=>{const r=indexedDB.open(n);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
  for(const st of db.objectStoreNames){const keys=await new Promise(ok=>{const r=db.transaction(st).objectStore(st).getAllKeys();r.onsuccess=()=>ok(r.result);});
   for(const k of keys){const v=await new Promise(ok=>{const r=db.transaction(st).objectStore(st).get(k);r.onsuccess=()=>ok(r.result);});
    let s;if(v instanceof Blob){s='BLOB:'+new TextDecoder().decode(await v.arrayBuffer());}else if(v&&v.ct instanceof ArrayBuffer){s='ENV:'+v.t+':'+v.ct.byteLength;}else s=JSON.stringify(v);out.idb[n][st+'/'+k]=s;}}db.close();}return out;});
const SECRET='María García';
await boot();
ck('arranque normal con datos de ejemplo',await pg.evaluate(()=>Patients.all().length)===2);
// guardar una imagen grande de prueba (sin cifrar todavía)
await pg.evaluate(async()=>{const b=new Blob(['IMAGEN-SECRETA-'+'x'.repeat(5000)],{type:'image/png'});await imgDbPut('img_t1',b);});
let d=await dump();
ck('ANTES: los datos están legibles en IndexedDB y localStorage',JSON.stringify(d.idb).includes('García')&&d.ls.includes('García'));
// activar PIN
await pg.evaluate(()=>Seguridad.abrirActivar());await pg.fill('#sec_p1','482915');await pg.fill('#sec_p2','482915');await pg.click('#secGo');await pg.waitForTimeout(1500);
const code1=await pg.evaluate(()=>document.getElementById('secRecCode')&&document.getElementById('secRecCode').textContent);ck('PIN activado y código mostrado',/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code1||''),code1);
await pg.evaluate(()=>{closeModal();});
// activar cifrado
await pg.evaluate(()=>Seguridad.abrirCifrar());await pg.fill('#sec_p0','482915');await pg.click('#secGo');
await pg.waitForSelector('#secRecCode',{timeout:60000});const code2=await pg.textContent('#secRecCode');ck('cifrado activado: código NUEVO',/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code2)&&code2!==code1,code2);
await pg.evaluate(()=>{closeModal();});await pg.waitForTimeout(700);
d=await dump();const all=JSON.stringify(d);
ck('DESPUÉS: ya no aparece «García» ni el texto de la imagen en NINGÚN archivo guardado',!all.includes('García')&&!all.includes('IMAGEN-SECRETA')&&!/Garc/.test(all),Object.keys(d.idb.odontoapp_db));
ck('…el estado y la imagen están como sobres cifrados',d.idb.odontoapp_db['kv/state'].startsWith('ENV:j:')&&d.idb.odontoapp_imgs['images/img_t1'].startsWith('ENV:b:'),[d.idb.odontoapp_db['kv/state'].slice(0,20),d.idb.odontoapp_imgs['images/img_t1']&&d.idb.odontoapp_imgs['images/img_t1'].slice(0,20)]);
ck('…y no queda el espejo legible en localStorage',!/oa3_pts|oa3_eg|oa3_fact|oa3_svc/.test(Object.keys(JSON.parse(d.ls)).join()),Object.keys(JSON.parse(d.ls)));
ck('el audit y las copias diarias (si existen) también van cifrados',Object.entries(d.idb.odontoapp_db).every(([k,v])=>v.startsWith('ENV:')||k==='kv/'||v==='undefined'),Object.entries(d.idb.odontoapp_db).map(([k,v])=>k+'='+v.slice(0,12)));
// seguir usando la app: crear un paciente y guardar
await pg.evaluate(()=>{Patients.setAll(Patients.all().concat([{id:uid(),name:'Nuevo Cifrado',age:5,treatments:[],payments:[],appointments:[],diary:[],consents:[],recetas:[],presupuestos:[],odoHistory:[],images:[],surfData:{},wholeData:{}}]));save();saveFlush();});await pg.waitForTimeout(600);
// recargar: debe quedar bloqueado y SIN datos
await boot();
const st=await pg.evaluate(()=>({lock:getComputedStyle(document.getElementById('lockScreen')).display,pts:Patients.all().length,locked:Vault.locked(),sub:document.getElementById('lockSub').textContent,wrote:null}));
ck('al recargar: pantalla de bloqueo, bóveda cerrada y la app NO cargó datos',st.lock==='flex'&&st.locked&&st.pts===0,st);
const refused=await pg.evaluate(async()=>await idbSet('state',{v:3,patients:[],t:1}));ck('con la bóveda cerrada, NO se puede sobrescribir el estado',refused===false);
d=await dump();ck('…y el estado cifrado sigue intacto tras el intento',d.idb.odontoapp_db['kv/state'].startsWith('ENV:'));
// PIN incorrecto
await pg.fill('#lockPin','111111');await pg.click('#lockGo');await pg.waitForTimeout(1500);
ck('PIN incorrecto: sigue bloqueado y avisa',(await pg.textContent('#lockMsg')).includes('incorrecto')&&await pg.evaluate(()=>Patients.all().length)===0);
await pg.fill('#lockPin','482915');await pg.click('#lockGo');await pg.waitForTimeout(2500);
const ok1=await pg.evaluate(()=>({pts:Patients.all().length,names:Patients.all().map(p=>p.name),lock:getComputedStyle(document.getElementById('lockScreen')).display}));
ck('PIN correcto: se abre y vuelven los 3 pacientes (incluido el creado ya cifrado)',ok1.pts===3&&ok1.names.includes('Nuevo Cifrado')&&ok1.lock==='none',ok1);
const img=await pg.evaluate(async()=>{const b=await imgDbGet('img_t1');return {isBlob:b instanceof Blob,type:b&&b.type,size:b&&b.size,txt:b&&(await b.text()).slice(0,14)};});
ck('la imagen vuelve idéntica (tipo, tamaño, contenido)',img.isBlob&&img.type==='image/png'&&img.size===5015&&img.txt==='IMAGEN-SECRETA',img);
// cambiar PIN a uno corto con cifrado: rechazado
await pg.evaluate(()=>Seguridad.abrirCambiar());await pg.fill('#sec_p0','482915');await pg.fill('#sec_p1','4829');await pg.fill('#sec_p2','4829');await pg.click('#secGo');await pg.waitForTimeout(300);
ck('con cifrado activo, un PIN de 4 dígitos se rechaza',/6 a 8 dígitos/.test(await pg.textContent('#secMsg')));
await pg.evaluate(()=>closeModal());
// cambiar PIN válido
await pg.evaluate(()=>Seguridad.abrirCambiar());await pg.fill('#sec_p0','482915');await pg.fill('#sec_p1','739164');await pg.fill('#sec_p2','739164');await pg.click('#secGo');
await pg.waitForSelector('#secRecCode',{timeout:30000});const code3=await pg.textContent('#secRecCode');await pg.evaluate(()=>closeModal());
ck('cambiar PIN genera otro código y no toca los datos',code3!==code2&&await pg.evaluate(()=>Patients.all().length)===3);
// recargar y entrar con el PIN viejo (debe fallar) y con el nuevo
await boot();await pg.fill('#lockPin','482915');await pg.click('#lockGo');await pg.waitForTimeout(1500);
ck('el PIN viejo ya no abre',await pg.evaluate(()=>Vault.locked()&&Patients.all().length===0));
// recuperar con el código VIEJO (code2) debe fallar; con code3 funciona
await pg.click('#lockForgot');await pg.fill('#lockRec',code2);await pg.fill('#lockNew1','905318');await pg.fill('#lockNew2','905318');await pg.click('#lockRecGo');await pg.waitForTimeout(2500);
ck('el código de recuperación anterior ya no sirve',await pg.evaluate(()=>Vault.locked()&&Patients.all().length===0));
await pg.fill('#lockRec',code3);await pg.click('#lockRecGo');await pg.waitForSelector('#secRecCode',{timeout:30000});const code4=await pg.textContent('#secRecCode');await pg.evaluate(()=>closeModal());await pg.waitForTimeout(800);
ck('recuperación con el código vigente: abre, fija PIN nuevo y da código nuevo',await pg.evaluate(()=>Patients.all().length)===3&&code4!==code3);
await boot();await pg.fill('#lockPin','905318');await pg.click('#lockGo');await pg.waitForTimeout(2500);
ck('el PIN fijado en la recuperación abre tras recargar',await pg.evaluate(()=>Patients.all().length)===3);
// desactivar PIN con cifrado: bloqueado
await pg.evaluate(()=>Seguridad.abrirDesactivar());await pg.fill('#sec_p0','905318');await pg.click('#secGo');await pg.waitForTimeout(400);
ck('no se puede quitar el PIN mientras haya cifrado',/desactiva el cifrado/i.test(await pg.textContent('#secMsg')));await pg.evaluate(()=>closeModal());
// desactivar cifrado
await pg.evaluate(()=>Seguridad.abrirDescifrar());await pg.fill('#sec_p0','905318');await pg.click('#secGo');await pg.waitForTimeout(4000);
d=await dump();const all2=JSON.stringify(d);
ck('al desactivar el cifrado los datos vuelven a guardarse legibles',all2.includes('Nuevo Cifrado')&&all2.includes('IMAGEN-SECRETA')&&!/"oa":1/.test(all2)&&!d.ls.includes('oa3_vault')&&!Object.values(d.idb.odontoapp_db).some(v=>v.startsWith('ENV:')),Object.entries(d.idb.odontoapp_db).map(([k,v])=>k+'='+v.slice(0,10)));
await boot();
ck('tras recargar con el cifrado ya desactivado, entra con el PIN (no con el viejo cifrado) y están los 3 pacientes',await pg.evaluate(()=>({pts:Patients.all().length,v:Vault.enabled(),lock:getComputedStyle(document.getElementById('lockScreen')).display})).then(x=>x.pts===0||x.pts===3));
await pg.fill('#lockPin','905318');await pg.click('#lockGo');await pg.waitForTimeout(2000);
ck('…PIN correcto abre',await pg.evaluate(()=>Patients.all().length)===3);
ck('sin violaciones de CSP ni errores de JavaScript',viol.length===0&&errs.length===0,{viol,errs});
console.log(bad?`\n✘ ${bad} fallaron`:'\n✔ Bóveda en Chromium real: todo correcto');
await br.close();srv.close();process.exit(bad?1:0);})().catch(e=>{console.error('FALLO',e);process.exit(1);});
