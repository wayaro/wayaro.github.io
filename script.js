let trades = JSON.parse(localStorage.getItem('tradingData')) || {};
let currentEditDate = null;
let myChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initSelectors();
    irAHoy();
    updateDashboard();
});

function initSelectors() {
    const mSel = document.getElementById('month-select');
    const ySel = document.getElementById('year-select');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    months.forEach((m, i) => mSel.innerHTML += `<option value="${i}">${m}</option>`);
    for(let i=2024; i<=2026; i++) ySel.innerHTML += `<option value="${i}">${i}</option>`;
}

function irAHoy() {
    const hoy = new Date();
    document.getElementById('month-select').value = hoy.getMonth();
    document.getElementById('year-select').value = hoy.getFullYear();
    renderCalendar();
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${sectionId}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${sectionId}`).classList.add('active');
    if(sectionId === 'dashboard') updateDashboard();
}

function renderCalendar() {
    const month = parseInt(document.getElementById('month-select').value);
    const year = parseInt(document.getElementById('year-select').value);
    const body = document.getElementById('calendar-body');
    body.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let dayCounter = 1;
    let weekProfit = 0;

    for (let i = 0; i < 6; i++) {
        if (dayCounter > daysInMonth) break;
        for (let j = 0; j < 7; j++) {
            if ((i === 0 && j < firstDay) || dayCounter > daysInMonth) {
                const empty = document.createElement('div');
                empty.className = 'calendar-day opacity-0 pointer-events-none';
                body.appendChild(empty);
            } else {
                const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(dayCounter).padStart(2,'0')}`;
                const t = trades[dateKey];
                const div = document.createElement('div');
                div.className = 'calendar-day flex flex-col items-center justify-start';
                div.onclick = () => abrirModal(dateKey);
                let content = `<div class="w-full text-right day-number">${dayCounter}</div>`;
                if(t) {
                    div.classList.add(t.estado === 'TP' ? 'day-tp' : 'day-sl');
                    const pnlVal = parseFloat(t.pnl) || 0;
                    weekProfit += pnlVal;
                    content += `<div class="trade-profit ${t.estado==='TP'?'text-emerald-400':'text-red-500'}">$${pnlVal}</div>
                        <div class="trade-info-container"><span class="info-tag text-slate-300">${t.simbolo}</span><span class="${t.direccion==='Compra'?'text-emerald-500':'text-red-500'} font-bold">${t.direccion==='Compra'?'L':'S'}</span>${t.notas?'<span>📝</span>':''}</div>`;
                }
                div.innerHTML = content;
                body.appendChild(div);
                dayCounter++;
            }
        }
        const tot = document.createElement('div');
        tot.className = 'total-week-card p-2 text-center';
        tot.innerHTML = `<div class="text-[9px] text-slate-500 font-black">SEMANA</div><div class="text-lg font-black ${weekProfit>=0?'text-cyan-400':'text-red-500'}">$${weekProfit.toLocaleString()}</div>`;
        body.appendChild(tot);
        weekProfit = 0;
    }
}

function updateDashboard() {
    const init = parseInt(document.getElementById('account-type-select').value);
    const sorted = Object.keys(trades).sort();
    let balance = init; let pnl = 0; let wins = 0;
    let cData = [init]; let cLabels = ['Inicio'];

    sorted.forEach(d => {
        const val = parseFloat(trades[d].pnl) || 0;
        pnl += val; balance += val;
        if(trades[d].estado === 'TP') wins++;
        cData.push(balance); cLabels.push(d.split('-').slice(1).join('/'));
    });

    document.getElementById('kpi-balance').innerText = `$${balance.toLocaleString()}`;
    document.getElementById('kpi-pnl').innerText = `${pnl>=0?'+':''}$${pnl.toLocaleString()}`;
    document.getElementById('kpi-pnl').className = `text-3xl font-black ${pnl>=0?'text-emerald-400':'text-red-500'}`;
    document.getElementById('kpi-days').innerText = sorted.length;
    
    const wr = sorted.length > 0 ? ((wins / sorted.length) * 100).toFixed(1) : 0;
    document.getElementById('dial-winrate-text').innerText = `${wr}%`;
    document.getElementById('dial-winrate-circle').style.strokeDashoffset = 175.9 - (175.9 * wr / 100);

    const mll = init - (init * 0.04);
    const target = init + (init * 0.06);
    document.getElementById('kpi-mll').innerText = `$${mll.toLocaleString()}`;
    document.getElementById('target-mll-label').innerText = `$${mll.toLocaleString()} MLL`;
    document.getElementById('target-profit-label').innerText = `$${target.toLocaleString()} TARGET`;
    document.getElementById('stat-drawdown').innerText = `$${(balance - mll).toLocaleString()}`;
    document.getElementById('stat-balance').innerText = `$${balance.toLocaleString()}`;
    document.getElementById('stat-remaining').innerText = `$${Math.max(0, target - balance).toLocaleString()}`;
    document.getElementById('target-progress-bar').style.width = `${Math.min(100, Math.max(0, ((balance - mll)/(target - mll))*100))}%`;

    renderChart(cLabels, cData);
}

function renderChart(l, d) {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, { type: 'line', data: { labels: l, datasets: [{ data: d, borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.05)', fill: true, tension: 0.4, pointRadius: 3 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { size: 9 } } } } } });
}

function abrirModal(d) { 
    currentEditDate = d; 
    const t = trades[d] || { pnl: '', simbolo: 'NQ', direccion: 'Compra', estado: 'TP', notas: '' }; 
    document.getElementById('trade-pnl').value = t.pnl; 
    document.getElementById('trade-simbolo').value = t.simbolo; 
    document.getElementById('trade-direccion').value = t.direccion; 
    document.getElementById('trade-estado').value = t.estado; 
    document.getElementById('trade-notas').value = t.notas || ''; 
    document.getElementById('modal-editor').classList.remove('hidden'); 
}

function guardarCambios() { 
    const v = parseFloat(document.getElementById('trade-pnl').value); 
    if (!isNaN(v)) { 
        trades[currentEditDate] = { 
            pnl: v, 
            simbolo: document.getElementById('trade-simbolo').value, 
            direccion: document.getElementById('trade-direccion').value, 
            estado: document.getElementById('trade-estado').value, 
            notas: document.getElementById('trade-notas').value 
        }; 
        localStorage.setItem('tradingData', JSON.stringify(trades)); 
        cerrarModal(); renderCalendar(); updateDashboard(); 
    } 
}

function eliminarDia() { 
    if(confirm("¿Seguro que quieres eliminar este registro?")) {
        delete trades[currentEditDate]; 
        localStorage.setItem('tradingData', JSON.stringify(trades)); 
        cerrarModal(); renderCalendar(); updateDashboard(); 
    }
}

function cerrarModal() { document.getElementById('modal-editor').classList.add('hidden'); }

function exportarExcel() { 
    const data = Object.keys(trades).sort().map(d => ({ Fecha: d, Simbolo: trades[d].simbolo, Direccion: trades[d].direccion, PnL: trades[d].pnl, Resultado: trades[d].estado, Notas: trades[d].notas || "" })); 
    const ws = XLSX.utils.json_to_sheet(data); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Bitacora"); 
    XLSX.writeFile(wb, "Trading_Report_Oscar.xlsx"); 
}