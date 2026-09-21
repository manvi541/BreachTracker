const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = {
    "CA": 1, "TX": 2, "FL": 3, "NY": 4, "PA": 5, "IL": 6, "OH": 7, "GA": 8, "NC": 9, "MI": 10,
    "NJ": 11, "VA": 12, "WA": 13, "AZ": 14, "MA": 15, "TN": 16, "IN": 17, "MD": 18, "MO": 19, "WI": 20,
    "CO": 21, "MN": 22, "SC": 23, "AL": 24, "LA": 25, "KY": 26, "OR": 27, "OK": 28, "CT": 29, "UT": 30,
    "IA": 31, "NV": 32, "AR": 33, "MS": 34, "KS": 35, "NM": 36, "NE": 37, "ID": 38, "WV": 39, "HI": 40,
    "NH": 41, "ME": 42, "RI": 43, "MT": 44, "DE": 45, "SD": 46, "ND": 47, "AK": 48, "VT": 49, "WY": 50
};

// COLOR ENCODING BY BREACH TYPE
const BREACH_COLOR_MAP = {
    'Hacking/IT Incident': '#ef4444',          // Red
    'Unauthorized Access/Disclosure': '#f59e0b',// Amber
    'Theft': '#10b981',                          // Emerald
    'Loss': '#3b82f6',                           // Blue
    'Improper Disposal': '#8b5cf6',              // Purple
    'Other': '#6b7280'                           // Gray
};

function getBreachColor(typeStr = '') {
    for (const [key, color] of Object.entries(BREACH_COLOR_MAP)) {
        if (typeStr.toLowerCase().includes(key.toLowerCase().split('/')[0])) {
            return color;
        }
    }
    return BREACH_COLOR_MAP['Other'];
}

let mainChart;
let allProcessedData = [];
let currentTimeScale = '1Y'; // Default 1 year view

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

            const affected = parseInt(r["Individuals Affected"]) || 0;
            grandTotal += affected;

            let rawDateStr = r["Breach Submission Date"].trim();
            let recordDate = new Date(rawDateStr);
            
            if (isNaN(recordDate.getTime()) && rawDateStr.includes('/')) {
                const parts = rawDateStr.split('/');
                if (parts.length === 3) {
                    recordDate = new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }

            if (isNaN(recordDate.getTime())) continue;

            const radiusSize = affected > 0 ? Math.log10(affected) * 4 : 4;
            const breachType = r["Type of Breach"] || "Undetermined Vector";

            // Multi-State Parsing if listed
            const rawStates = r["Affected States"] || r["State"] || "Unknown";
            const affectedStatesList = rawStates.split(',').map(s => s.trim().toUpperCase());

            processed.push({
                x: recordDate, 
                y: stateMap[r["State"].trim().toUpperCase()] || 0, 
                r: Math.max(4, Math.min(radiusSize, 28)), 
                entity: r["Name of Covered Entity"] || "Unknown Provider",
                state: r["State"] || "Unknown",
                affectedStates: affectedStatesList,
                type: breachType,
                color: getBreachColor(breachType),
                date: rawDateStr,
                totalExposed: affected,
                hhsUrl: r["Weblink"] || "https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf"
            });
        }

        allProcessedData = processed.filter(d => d.y > 0);
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

// TIME SCALE FILTERING
function filterByTime(data, scale) {
    if (!data.length) return [];
    const now = new Date();

    return data.filter(item => {
        const itemDate = new Date(item.x);
        if (scale === '3M') {
            const target = new Date();
            target.setMonth(now.getMonth() - 3);
            return itemDate >= target;
        }
        if (scale === '6M') {
            const target = new Date();
            target.setMonth(now.getMonth() - 6);
            return itemDate >= target;
        }
        if (scale === '1Y') {
            const target = new Date();
            target.setFullYear(now.getFullYear() - 1);
            return itemDate >= target;
        }
        return true; // 'ALL' Multi-Year Historical Data
    });
}

function setTimeRange(scale) {
    currentTimeScale = scale;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(scale) || (scale === 'ALL' && btn.innerText.includes('Multi-Year')));
    });
    updateFilteredChart();
}

function updateFilteredChart() {
    const filteredData = filterByTime(allProcessedData, currentTimeScale);
    filteredData.sort((a, b) => a.x - b.x);

    const bgColors = filteredData.map(d => d.color + '55');
    const borderColors = filteredData.map(d => d.color);

    if (mainChart) {
        mainChart.data.datasets[0].data = filteredData;
        mainChart.data.datasets[0].backgroundColor = bgColors;
        mainChart.data.datasets[0].borderColor = borderColors;
        mainChart.update();
    } else {
        initChart(filteredData);
    }
}

function initChart(data) {
    const ctx = document.getElementById('breachChart').getContext('2d');
    data.sort((a, b) => a.x - b.x);

    const bgColors = data.map(d => d.color + '55');
    const borderColors = data.map(d => d.color);

    if (mainChart) {
        mainChart.destroy();
    }

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
            layout: {
                padding: { right: 30, left: 10, top: 30, bottom: 10 }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'MM/dd/yyyy', 
                        unit: 'month',
                        displayFormats: { month: 'MMM yyyy', day: 'MMM d, yyyy' }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.03)',
                        borderDash: [3, 3] 
                    },
                    ticks: { 
                        color: '#8b949e', 
                        font: { family: 'JetBrains Mono', size: 10 },
                        maxRotation: 30,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    title: {
                        display: true,
                        text: 'TIMELINE OF INCIDENTS',
                        color: '#555',
                        font: { family: 'JetBrains Mono', size: 10, weight: 'bold' }
                    }
                },
                y: {
                    min: 0, 
                    max: 51, 
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: {
                        color: '#8b949e',
                        font: { size: 9, family: 'JetBrains Mono' },
                        stepSize: 1,
                        autoSkip: false, 
                        callback: function(v) {
                            return Object.keys(stateMap).find(k => stateMap[k] === Math.round(v)) || '';
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleFont: { family: 'JetBrains Mono', size: 11 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 13 },
                    borderColor: 'rgba(0, 210, 255, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: c => `📍 ${c.raw.entity}\n🏷️ Vector: ${c.raw.type}\n📊 ${c.raw.totalExposed.toLocaleString()} records exposed`
                    }
                }
            },
            onClick: (e, el) => { 
                if (el[0]) {
                    openDrawer(mainChart.data.datasets[0].data[el[0].index]); 
                }
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
                <b style="color:#fff;">2. Reading the Graph:</b><br>
                <ul style="padding-left:18px; margin-top:5px; color:#8b949e;">
                    <li><b>X-Axis:</b> Timeline of incidents (use buttons above the chart to adjust the date range).</li>
                    <li><b>Y-Axis:</b> State sorting by population rank (California at the top, Wyoming at the bottom).</li>
                    <li><b>Colors:</b> Indicates breach vector type (Red = Hacking/IT, Amber = Unauthorized Access, Green = Theft).</li>
                </ul>
            </p>
        </div>
    `;
}

// OPEN DRAWER: Includes Multi-State listing & direct HHS link
function openDrawer(d) {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');

    const isMajorHub = ["CA", "TX", "FL", "NY"].includes(d.state);
    const locAnalysis = isMajorHub ? `High-Population Hub: Targeted a dense state healthcare network.` : `Regional Node: Demonstrates risks facing mid-to-small healthcare providers.`;

    const multiStateDisplay = (d.affectedStates && d.affectedStates.length > 1) 
        ? d.affectedStates.join(', ')
        : d.state;

    document.getElementById('panel-content').innerHTML = `
        <div class="detail-item"><label>TARGET ENTITY</label><div class="value" style="color:#00d2ff; font-weight:bold;">${d.entity}</div></div>
        <div class="ai-box" style="margin-top:15px; margin-bottom:15px;">
            <div style="color:${d.color}; font-weight:bold; margin-bottom:12px; display:flex; align-items:center; font-family:'JetBrains Mono';">
                <span class="ai-pulse" style="background-color:${d.color}"></span> VECTOR: ${d.type}
            </div>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> SCOPE ANALYSIS:</strong> ${locAnalysis}</p>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> ALL IMPACTED STATES:</strong> ${multiStateDisplay}</p>
        </div>
        <div class="detail-item"><label>PRIMARY STATE RANK</label><div class="value">${d.state} (Rank #${d.y} / 50)</div></div>
        <div class="detail-item"><label>RECORDS COMPROMISED</label><div class="value" style="color:#ff4757; font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()}</div></div>
        <div class="detail-item"><label>INCIDENT DATE</label><div class="value">${d.date}</div></div>
        
        <!-- PROMINENT DIRECT CITATION SOURCE -->
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
