/* ═══ ARRANQUE — se ejecuta al final, cuando todos los módulos ya cargaron ═══ */
// ═══ INIT ═══
// Restore dark mode
if(localStorage.getItem('oa3_dark')==='1'){document.body.classList.add('dark-mode');const btn=document.getElementById('darkToggle');if(btn)btn.textContent='\u2600\uFE0F';}
// Con el cifrado activado, NADA de los datos se lee hasta que se ingresa el PIN (la pantalla de bloqueo la pone security.js).
function arrancar(){
load();
// Activar backup automático diario (3 segundos después de cargar)
setTimeout(() => {
    if (typeof verificarBackupDiario === 'function') {
        verificarBackupDiario();
        console.log('✅ Backup automático activado');
    }
}, 3000);
loadMeds();
Cie10.load();
Cie10.load();
syncStart();
// Migrate: reset WA message if it contains corrupted emoji (? diamond)
const oldWA=localStorage.getItem('oa3_wamsg');
if(oldWA&&(oldWA.includes('\uFFFD')||oldWA.includes('?'+'?')))localStorage.removeItem('oa3_wamsg');
Patients.renderList();
showPage('dashboard');
}
Vault.whenOpen().then(arrancar);

// PWA: funciona sin internet (solo bajo http/https, no con file://)
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW:',e));}
