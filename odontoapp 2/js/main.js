/* ═══ ARRANQUE — se ejecuta al final, cuando todos los módulos ya cargaron ═══ */
// ═══ INIT ═══
load();
// Activar backup automático diario (3 segundos después de cargar)
setTimeout(() => {
    if (typeof verificarBackupDiario === 'function') {
        verificarBackupDiario();
        console.log('✅ Backup automático activado');
    }
}, 3000);
loadMeds();
cie10Init();
loadCIE10Full();
loadQuickAppts();
syncStart();
// Migrate: reset WA message if it contains corrupted emoji (? diamond)
const oldWA=localStorage.getItem('oa3_wamsg');
if(oldWA&&(oldWA.includes('\uFFFD')||oldWA.includes('?'+'?')))localStorage.removeItem('oa3_wamsg');
// Restore dark mode
if(localStorage.getItem('oa3_dark')==='1'){document.body.classList.add('dark-mode');const btn=document.getElementById('darkToggle');if(btn)btn.textContent='\u2600\uFE0F';}
renderSidebar();
showPage('dashboard');

// PWA: funciona sin internet (solo bajo http/https, no con file://)
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(e=>console.warn('SW:',e));}
