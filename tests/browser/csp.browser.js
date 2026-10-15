// Prueba en Chromium REAL (no jsdom): política CSP sin violaciones, impresión, Supabase local. Necesita: npm i -D playwright-core  y un Chromium (variable CHROMIUM = ruta del ejecutable).
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright-core');
const ROOT=process.argv[2]||require('path').resolve(__dirname,'../..');const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'text/plain'});r.end(d);});});
(async()=>{await new Promise(ok=>srv.listen(0,ok));const port=srv.address().port;
const br=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await br.newContext();const pg=await ctx.newPage();const logs=[],errs=[];
const hook=p=>{p.on('console',m=>logs.push(m.type()+': '+m.text()));p.on('pageerror',e=>errs.push(String(e).slice(0,200)));};hook(pg);ctx.on('page',hook);
await pg.goto(`http://localhost:${port}/index.html`);await pg.waitForTimeout(2500);
const info=await pg.evaluate(()=>({sb:typeof supabase,createClient:typeof (window.supabase&&supabase.createClient),pts:Patients.all().length,ficha:Patients.all()[0]&&Patients.all()[0].ficha}));
console.log('app:',JSON.stringify(info));
// recibo
await pg.evaluate(()=>{Patients.select(Patients.all()[0].id);});await pg.waitForTimeout(300);
const [pop]=await Promise.all([ctx.waitForEvent('page'),pg.evaluate(()=>Finance.printReceipt(1))]);
await pop.waitForLoadState();await pop.waitForTimeout(300);
await pop.evaluate(()=>{window.__p=0;window.print=()=>{window.__p++;};});
const hasBtn=await pop.evaluate(()=>!!document.getElementById('btnPrint'));
await pop.click('#btnPrint');const printed=await pop.evaluate(()=>window.__p);
console.log('recibo: botón',hasBtn,'imprimir llamado',printed,'scripts en el documento',await pop.evaluate(()=>document.scripts.length));
// consentimiento: documento escrito + wirePrint
const r2=await pg.evaluate(()=>{const p=Patients.current();const w=window.open('','_blank');const c={id:1,titulo:'T',texto:'texto',fecha:'2026-01-01',tipo:'x'};try{w.document.write(Consents.printHtml(c,p));w.document.close();wirePrint(w);w.__n=0;w.print=()=>{w.__n++;};w.document.getElementById('btnPrint').click();return {n:w.__n,scripts:w.document.scripts.length};}catch(e){return {err:String(e)};}});
console.log('consentimiento:',JSON.stringify(r2));
// receta con auto-impresión
const [pop3]=await Promise.all([ctx.waitForEvent('page'),pg.evaluate(()=>{const p=Patients.current();p.recetas=p.recetas||[];p.recetas.push({id:1,fecha:'2026-01-01',medico:'Dr X',edad:30,meds:[],diag:[],items:[]});try{Prescriptions.printRx(1);}catch(e){console.log('rx err '+e);} })]);
await pop3.waitForTimeout(800);console.log('receta: abierta, scripts',await pop3.evaluate(()=>document.scripts.length));
const viol=logs.filter(l=>/Content.Security.Policy|Refused to/i.test(l));
console.log('violaciones CSP:',viol.length);viol.slice(0,8).forEach(v=>console.log('  ',v.slice(0,260)));
console.log('errores JS:',errs.length,errs.slice(0,5));
const other=logs.filter(l=>/^(error|warning)/.test(l)&&!/Content.Security|Refused|ERR_|fonts\.g|Failed to load resource/i.test(l));console.log('otros avisos:',other.slice(0,6));
await br.close();srv.close();})().catch(e=>{console.error('FALLO',e);process.exit(1);});
