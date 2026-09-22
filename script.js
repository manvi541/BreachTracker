const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = {
    "CA": 1, "TX": 2, "FL": 3, "NY": 4, "PA": 5, "IL": 6, "OH": 7, "GA": 8, "NC": 9, "MI": 10,
    "NJ": 11, "VA": 12, "WA": 13, "AZ": 14, "MA": 15, "TN": 16, "IN": 17, "MD": 18, "MO": 19, "WI": 20,
    "CO": 21, "MN": 22, "SC": 23, "AL": 24, "LA": 25, "KY": 26, "OR": 27, "OK": 28, "CT": 29, "UT": 30,
    "IA": 31, "NV": 32, "AR": 33, "MS": 34, "KS": 35, "NM": 36, "NE": 37, "ID": 38, "WV": 39, "HI": 40,
    "NH": 41, "ME": 42, "RI": 43, "MT": 44, "DE": 45, "SD": 46, "ND": 47, "AK": 48, "VT": 49, "WY": 50
};

// CATEGORICAL BREACH VECTOR MAPPING FOR DEFAULT Y-AXIS VIEW
const vectorMap = {
    "Hacking/IT Incident": 1,
    "Unauthorized Access/Disclosure": 2,
    "Theft": 3,
    "Loss": 4,
    "Improper Disposal": 5,
    "Other / Undetermined": 6
};

// COLOR MAPPING BY VECTOR
const BREACH_COLOR_MAP = {
    'Hacking/IT Incident': '#ef4444',          // Red
    'Unauthorized Access/Disclosure': '#f59e0b',// Amber
    'Theft': '#10b981',                          // Emerald
    'Loss': '#3b82f6',                           // Blue
    'Improper Disposal': '#8b5cf6',              // Purple
    'Other / Undetermined': '#6b7280'            // Gray
};

function getBreachColor(typeStr = '') {
    for (const [key, color] of Object.entries(BREACH_COLOR_MAP)) {
        if (typeStr.toLowerCase().includes(key.toLowerCase().split('/')[0])) {
            return color;
        }
    }
    return BREACH_COLOR_MAP['Other / Undetermined'];
}

function getVectorYIndex(typeStr = '') {
    for (const key of Object.keys(vectorMap)) {
        if (typeStr.toLowerCase().includes(key.toLowerCase().split('/')[0])) {
            return vectorMap[key];
        }
    }
    return vectorMap['Other / Undetermined'];
}

let mainChart;
let allProcessedData = [];
let currentTimeScale = '1Y';
let currentMode = 'VECTOR'; // Default mode: 'VECTOR' or 'STATE'

function renderLegend() {
    const legendEl = document.getElementById('legend-container');
    if (!legendEl) return;
    legendEl.innerHTML = Object.entries(BREACH_COLOR_MAP)
        .map(([type, color]) => `
            <div style="display: flex; align-items: center; gap: 6px; color: #8b949e;">
                <span style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; display: inline-block;"></span>
                <span>${type}</span>
            </div>
        `).join('');
}

function parseFlexibleDate(dateStr) {
    if (!dateStr) return null;
    let str = String(dateStr).trim();

    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const m = parseInt(parts[0], 10) - 1;
            const day = parseInt(parts[1], 10);
            let y = parseInt(parts[2], 10);
            if (y < 100) y += 2000;
            d = new Date(y, m, day);
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
}

async function syncIntelligence() {
    try {
        const response = await fetch(`${CSV_URL}&nocache=${Date.now()}`);
        if (!response.ok) throw new Error(`Network fault: ${response.status}`);
        
        const csv = await response.text();
        const raw = d3.csvParse(csv);
        
        if (!raw || raw.length === 0) {
            document.getElementById('sync-status').innerText = "SHEET LOADING... RETRYING";
            return;
        }

        let grandTotal = 0;
        const processed = [];

        for (const r of raw) {
            if (!r || !r["State"] || !r["Breach Submission Date"]) continue;

            const affected = parseInt(r["Individuals Affected"], 10) || 0;
            grandTotal += affected;

            const rawDateStr = r["Breach Submission Date"].trim();
            const recordDate = parseFlexibleDate(rawDateStr);
            if (!recordDate) continue;

            const radiusSize = affected > 0 ? Math.log10(affected) * 4 : 4;
            const breachType = r["Type of Breach"] || "Other / Undetermined";

            const rawStates = r["Affected States"] || r["State"] || "Unknown";
            const affectedStatesList = rawStates.split(',').map(s => s.trim().toUpperCase());

            const primaryState = r["State"].trim().toUpperCase();
            const stateRank = stateMap[primaryState] || 0;
            const vectorRank = getVectorYIndex(breachType);

            processed.push({
                x: recordDate, 
                yState: stateRank,
                yVector: vectorRank,
                r: Math.max(4, Math.min(radiusSize, 28)), 
                entity: r["Name of Covered Entity"] || "Unknown Provider",
                state: primaryState,
                affectedStates: affectedStatesList,
                type: breachType,
                color: getBreachColor(breachType),
                date: rawDateStr,
                totalExposed: affected,
                hhsUrl: r["Weblink"] || "https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf"
            });
        }

        allProcessedData = processed.sort((a, b) => a.x.getTime() - b.x.getTime());
        document.getElementById('total-affected').innerText = grandTotal.toLocaleString();

        updateFilteredChart();
        document.getElementById('sync-status').innerText = `SYSTEM ONLINE: ${new Date().toLocaleTimeString()}`;
    } catch (e) { 
        console.error("Pipeline breakdown caught safely:", e); 
        document.getElementById('sync-status').innerText = "DATA PIPELINE DISCONNECTED (RETRYING...)";
    } finally {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function setChartMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', 
            (mode === 'VECTOR' && btn.innerText.includes('Vector')) ||
            (mode === 'STATE' && btn.innerText.includes('State'))
        );
    });
    updateFilteredChart();
}

function filterByTime(data, scale) {
    if (!data.length) return [];
    
    const maxTimestamp = Math.max(...data.map(d => d.x.getTime()));
    const latestDate = new Date(maxTimestamp);

    return data.filter(item => {
        const itemDate = item.x;
        if (scale === '3M') {
            const target = new Date(latestDate);
            target.setMonth(target.getMonth() - 3);
            return itemDate >= target;
        }
        if (scale === '6M') {
            const target = new Date(latestDate);
            target.setMonth(target.getMonth() - 6);
            return itemDate >= target;
        }
        if (scale === '1Y') {
            const target = new Date(latestDate);
            target.setFullYear(target.getFullYear() - 1);
            return itemDate >= target;
        }
        return true;
    });
}

function setTimeRange(scale) {
    currentTimeScale = scale;
    document.querySelectorAll('.time-btn').forEach(btn => {
        const text = btn.innerText.toUpperCase();
        btn.classList.toggle('active', 
            (scale === '3M' && text.includes('3M')) ||
            (scale === '6M' && text.includes('6M')) ||
            (scale === '1Y' && text.includes('1Y')) ||
            (scale === 'ALL' && text.includes('MULTI-YEAR'))
        );
    });
    updateFilteredChart();
}

function updateFilteredChart() {
    const rawFiltered = filterByTime(allProcessedData, currentTimeScale);

    // Map Y coordinate according to selected view mode
    const chartData = rawFiltered.map(d => ({
        ...d,
        y: currentMode === 'VECTOR' ? d.yVector : d.yState
    })).filter(d => d.y > 0);

    const bgColors = chartData.map(d => d.color + '55');
    const borderColors = chartData.map(d => d.color);

    if (mainChart) {
        mainChart.data.datasets[0].data = chartData;
        mainChart.data.datasets[0].backgroundColor = bgColors;
        mainChart.data.datasets[0].borderColor = borderColors;

        // Dynamic Y-Scale reconfiguration
        if (currentMode === 'VECTOR') {
            mainChart.options.scales.y.min = 0;
            mainChart.options.scales.y.max = 7;
            mainChart.options.scales.y.ticks.callback = function(v) {
                return Object.keys(vectorMap).find(k => vectorMap[k] === Math.round(v)) || '';
            };
        } else {
            mainChart.options.scales.y.min = 0;
            mainChart.options.scales.y.max = 51;
            mainChart.options.scales.y.ticks.callback = function(v) {
                return Object.keys(stateMap).find(k => stateMap[k] === Math.round(v)) || '';
            };
        }

        // Dynamic X-Scale limits
        if (chartData.length > 0) {
            mainChart.options.scales.x.min = chartData[0].x;
            mainChart.options.scales.x.max = chartData[chartData.length - 1].x;

            if (currentTimeScale === 'ALL') {
                mainChart.options.scales.x.time.unit = 'year';
                mainChart.options.scales.x.time.displayFormats = { year: 'yyyy' };
            } else {
                mainChart.options.scales.x.time.unit = 'month';
                mainChart.options.scales.x.time.displayFormats = { month: 'MMM yyyy' };
            }
        }

        if (typeof mainChart.resetZoom === 'function') mainChart.resetZoom();
        mainChart.update();
    } else {
        initChart(chartData);
    }
}

function initChart(data) {
    const ctx = document.getElementById('breachChart').getContext('2d');
    const bgColors = data.map(d => d.color + '55');
    const borderColors = data.map(d => d.color);

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: data,
                backgroundColor: bgColors, 
                borderColor: borderColors,
                borderWidth: 1.5,
                hoverBackgroundColor: '#ff4757',
                hoverBorderColor: '#ff4757',
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 30, left: 10, top: 30, bottom: 10 } },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month', displayFormats: { year: 'yyyy', month: 'MMM yyyy' } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)', borderDash: [3, 3] },
                    ticks: { color: '#8b949e', font: { family: 'JetBrains Mono', size: 10 } },
                    title: {
                        display: true,
                        text: 'TIMELINE OF INCIDENTS (CLICK & DRAG TO PAN / SCROLL TO ZOOM)',
                        color: '#555',
                        font: { family: 'JetBrains Mono', size: 10, weight: 'bold' }
                    }
                },
                y: {
                    min: 0,
                    max: 7,
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: {
                        color: '#8b949e',
                        font: { size: 10, family: 'JetBrains Mono' },
                        stepSize: 1,
                        autoSkip: false,
                        callback: function(v) {
                            return Object.keys(vectorMap).find(k => vectorMap[k] === Math.round(v)) || '';
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                zoom: {
                    pan: { enabled: true, mode: 'x' },
                    zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
                },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleFont: { family: 'JetBrains Mono', size: 11 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                    borderColor: 'rgba(0, 210, 255, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: c => `📍 ${c.raw.entity}\n🏷️ Vector: ${c.raw.type}\n🌎 Region(s): ${c.raw.affectedStates.join(', ')}\n📊 ${c.raw.totalExposed.toLocaleString()} records exposed`
                    }
                }
            },
            onClick: (e, el) => { 
                if (el[0]) openDrawer(mainChart.data.datasets[0].data[el[0].index]); 
            }
        }
    });
}

function openProjectBriefing() {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    document.getElementById('panel-content').innerHTML = `
        <div class="ai-box">
            <span class="ai-pulse"></span> <strong style="font-family:'JetBrains Mono'; color:#00d2ff;">[HOW THE TRACKER WORKS]</strong>
            <p style="margin-top:12px; line-height:1.6; color:#c9d1d9; font-size:13px;">
                <b style="color:#fff;">1. Data Source & Attribution:</b><br>
                All data is pulled from the official 
                <a href="https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf" target="_blank" style="color:#38bdf8; text-decoration:underline;">
                    U.S. HHS OCR Public Breach Register
                </a>.
                <br><br>
                <b style="color:#fff;">2. Views & Layouts:</b><br>
                <ul style="padding-left:18px; margin-top:5px; color:#8b949e;">
                    <li><b>By Attack Vector (Default):</b> Clusters breaches by vector category to cleanly display multi-state incidents.</li>
                    <li><b>By State Population Rank:</b> Plots breaches against state population rank (#1 CA to #50 WY).</li>
                </ul>
            </p>
        </div>
    `;
}

function openDrawer(d) {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');

    const multiStateDisplay = (d.affectedStates && d.affectedStates.length > 0) 
        ? d.affectedStates.join(', ')
        : d.state;

    document.getElementById('panel-content').innerHTML = `
        <div class="detail-item"><label>TARGET ENTITY</label><div class="value" style="color:#00d2ff; font-weight:bold;">${d.entity}</div></div>
        <div class="ai-box" style="margin-top:15px; margin-bottom:15px;">
            <div style="color:${d.color}; font-weight:bold; margin-bottom:12px; display:flex; align-items:center; font-family:'JetBrains Mono';">
                <span class="ai-pulse" style="background-color:${d.color}"></span> VECTOR: ${d.type}
            </div>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> ALL IMPACTED REGIONS:</strong> ${multiStateDisplay}</p>
        </div>
        <div class="detail-item"><label>PRIMARY STATE RANK</label><div class="value">${d.state} (Rank #${d.yState || 'N/A'} / 50)</div></div>
        <div class="detail-item"><label>RECORDS COMPROMISED</label><div class="value" style="color:#ff4757; font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()}</div></div>
        <div class="detail-item"><label>INCIDENT DATE</label><div class="value">${d.date}</div></div>
        
        <div class="detail-item" style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
            <label>VERIFIED DATA SOURCE</label>
            <div class="value">
                <a href="${d.hhsUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:underline; font-size:12px;">
                    U.S. HHS OCR Public Breach Record ↗
                </a>
            </div>
        </div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }

document.addEventListener('DOMContentLoaded', () => {
    renderLegend();
});

setInterval(syncIntelligence, 15000);
syncIntelligence();
