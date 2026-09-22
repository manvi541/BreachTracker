const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = {
    "CA": 1, "TX": 2, "FL": 3, "NY": 4, "PA": 5, "IL": 6, "OH": 7, "GA": 8, "NC": 9, "MI": 10,
    "NJ": 11, "VA": 12, "WA": 13, "AZ": 14, "MA": 15, "TN": 16, "IN": 17, "MD": 18, "MO": 19, "WI": 20,
    "CO": 21, "MN": 22, "SC": 23, "AL": 24, "LA": 25, "KY": 26, "OR": 27, "OK": 28, "CT": 29, "UT": 30,
    "IA": 31, "NV": 32, "AR": 33, "MS": 34, "KS": 35, "NM": 36, "NE": 37, "ID": 38, "WV": 39, "HI": 40,
    "NH": 41, "ME": 42, "RI": 43, "MT": 44, "DE": 45, "SD": 46, "ND": 47, "AK": 48, "VT": 49, "WY": 50
};

const reverseStateMap = Object.fromEntries(Object.entries(stateMap).map(([st, rank]) => [rank, st]));

const vectorMap = {
    "Hacking/IT Incident": 1,
    "Unauthorized Access/Disclosure": 2,
    "Theft": 3,
    "Loss": 4,
    "Improper Disposal": 5,
    "Other / Undetermined": 6
};

const BREACH_COLOR_MAP = {
    'Hacking/IT Incident': '#ef4444',          
    'Unauthorized Access/Disclosure': '#f59e0b',
    'Theft': '#10b981',                          
    'Loss': '#3b82f6',                           
    'Improper Disposal': '#8b5cf6',              
    'Other / Undetermined': '#6b7280'            
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

function getHashJitter(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return ((hash % 100) / 100) * 0.4 - 0.2; // Slightly wider distribution offset
}

let mainChart;
let allProcessedData = [];
let selectedYear = 'AUTO';
let currentMode = 'VECTOR'; 

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

function populateYearDropdown(data) {
    const yearSelect = document.getElementById('year-select');
    if (!yearSelect) return;

    const availableYears = Array.from(new Set(data.map(d => d.x.getFullYear())))
        .filter(y => !isNaN(y))
        .sort((a, b) => b - a);

    if (availableYears.length === 0) return;

    if (selectedYear === 'AUTO' || !availableYears.includes(parseInt(selectedYear, 10))) {
        selectedYear = String(availableYears[0]);
    }

    let optionsHTML = availableYears.map(y => `<option value="${y}">${y}</option>`).join('');
    optionsHTML += `<option value="ALL">All Years (${availableYears[availableYears.length - 1]}–${availableYears[0]})</option>`;
    
    yearSelect.innerHTML = optionsHTML;
    yearSelect.value = selectedYear;
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

            const radiusSize = affected > 0 ? Math.log10(affected) * 1.8 : 2.5;
            const breachType = r["Type of Breach"] || "Other / Undetermined";

            const rawStates = r["Affected States"] || r["State"] || "Unknown";
            const affectedStatesList = rawStates.split(',').map(s => s.trim().toUpperCase());

            const primaryState = r["State"].trim().toUpperCase();
            const stateRank = stateMap[primaryState] || 51;
            const vectorRank = getVectorYIndex(breachType);

            const entityName = r["Name of Covered Entity"] || "Unknown Provider";
            const jitter = getHashJitter(entityName + rawDateStr);

            processed.push({
                x: recordDate, 
                yState: stateRank,
                yVector: vectorRank,
                jitter: jitter,
                r: Math.max(3, Math.min(radiusSize, 12)), // Scaled down max radius to avoid clutter
                entity: entityName,
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

        populateYearDropdown(allProcessedData);
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

function onYearChange(val) {
    selectedYear = val;
    updateFilteredChart();
}

function setChartMode(mode) {
    currentMode = mode;
    document.getElementById('btn-vector').classList.toggle('active', mode === 'VECTOR');
    document.getElementById('btn-state').classList.toggle('active', mode === 'STATE');
    updateFilteredChart();
}

function updateFilteredChart() {
    let filteredData = allProcessedData;

    if (selectedYear !== 'ALL') {
        const targetYear = parseInt(selectedYear, 10);
        filteredData = allProcessedData.filter(d => d.x.getFullYear() === targetYear);
    }

    const chartData = filteredData.map(d => ({
        ...d,
        y: (currentMode === 'VECTOR' ? d.yVector : d.yState) + d.jitter
    })).filter(d => d.y > 0);

    const bgColors = chartData.map(d => d.color + '55'); // Higher transparency for dense clusters
    const borderColors = chartData.map(d => d.color);

    if (mainChart) {
        mainChart.data.datasets[0].data = chartData;
        mainChart.data.datasets[0].backgroundColor = bgColors;
        mainChart.data.datasets[0].borderColor = borderColors;

        if (currentMode === 'VECTOR') {
            mainChart.options.scales.y.min = 0.5;
            mainChart.options.scales.y.max = 6.5;
            mainChart.options.scales.y.ticks.stepSize = 1;
            mainChart.options.scales.y.ticks.callback = function(v) {
                const rounded = Math.round(v);
                return Object.keys(vectorMap).find(k => vectorMap[k] === rounded) || '';
            };
        } else {
            mainChart.options.scales.y.min = 0;
            mainChart.options.scales.y.max = 51;
            mainChart.options.scales.y.ticks.stepSize = 5; // Step by 5 to prevent Y-axis text overlap
            mainChart.options.scales.y.ticks.callback = function(v) {
                const rounded = Math.round(v);
                return reverseStateMap[rounded] ? `${reverseStateMap[rounded]} (#${rounded})` : '';
            };
        }

        if (selectedYear !== 'ALL' && filteredData.length > 0) {
            // Adapt view bounds strictly to months with data
            const minMonth = new Date(Math.min(...filteredData.map(d => d.x.getTime())));
            const maxMonth = new Date(Math.max(...filteredData.map(d => d.x.getTime())));
            
            // Set bounds with padding
            mainChart.options.scales.x.min = new Date(minMonth.getFullYear(), minMonth.getMonth(), 1);
            mainChart.options.scales.x.max = new Date(maxMonth.getFullYear(), maxMonth.getMonth() + 1, 0);
            mainChart.options.scales.x.time.unit = 'month';
            mainChart.options.scales.x.time.displayFormats = { month: 'MMM' };
        } else {
            if (allProcessedData.length > 0) {
                mainChart.options.scales.x.min = allProcessedData[0].x;
                mainChart.options.scales.x.max = allProcessedData[allProcessedData.length - 1].x;
            }
            mainChart.options.scales.x.time.unit = 'year';
            mainChart.options.scales.x.time.displayFormats = { year: 'yyyy' };
        }

        mainChart.update('none');
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
                borderWidth: 1,
                hoverBackgroundColor: '#38bdf8',
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: { padding: { right: 30, left: 10, top: 20, bottom: 10 } },
            scales: {
                x: {
                    type: 'time',
                    time: { 
                        unit: 'month', 
                        displayFormats: { year: 'yyyy', month: 'MMM' } 
                    },
                    grid: { color: 'rgba(255, 255, 255, 0.04)', borderDash: [2, 2] },
                    ticks: { 
                        color: '#8b949e', 
                        font: { family: 'JetBrains Mono', size: 10 },
                        autoSkip: false
                    },
                    title: {
                        display: true,
                        text: 'TIMELINE OF INCIDENTS',
                        color: '#6e7681',
                        font: { family: 'JetBrains Mono', size: 10, weight: 'bold' }
                    }
                },
                y: {
                    min: 0.5,
                    max: 6.5,
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: {
                        color: '#8b949e',
                        font: { size: 10, family: 'JetBrains Mono' },
                        stepSize: 1,
                        autoSkip: false,
                        callback: function(v) {
                            const rounded = Math.round(v);
                            return Object.keys(vectorMap).find(k => vectorMap[k] === rounded) || '';
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#161b22',
                    titleFont: { family: 'JetBrains Mono', size: 11 },
                    bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
                    borderColor: 'rgba(0, 210, 255, 0.4)',
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
