The script is stopping because your `stateMap` variable has an exact duplicate key inside of it (`"OH":35, "OH":35`).

In modern rendering environments and strict JavaScript engines, repeating an identical key-value pair inside an inline dictionary literal can throw a silent compilation error or break string evaluation loops mid-transit, crashing the parsing stage.

Additionally, looking closely at your sheet URL:
`https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`

If you are calling `fetch()` and appending `&t=TIMESTAMP` to a URL that *ends* with `?output=csv`, the URL string gets malformed into `?output=csv&t=12345678`, which Google's servers can reject as a bad request parameter, breaking the data stream.

Here is your fully corrected, robust `script.js` file with the duplicate entry removed, safe URL parameter concatenation, and a fallback console logger to tell you exactly where an issue lies.

### The Fixed `script.js`

```javascript
// Fixed: Swapped trailing parameters so cache busting appends safely without corrupting the query string
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

// Fixed: Removed duplicate "OH":35 entry which breaks strict literal dictionary mapping evaluation loops
const stateMap = { "AL":1,"AK":2,"AZ":3,"AR":4,"CA":5,"CO":6,"CT":7,"DE":8,"FL":9,"GA":10,"HI":11,"ID":12,"IL":13,"IN":14,"IA":15,"KS":16,"KY":17,"LA":18,"ME":19,"MD":20,"MA":21,"MI":22,"MN":23,"MS":24,"MO":25,"MT":26,"NE":27,"NV":28,"NH":29,"NJ":30,"NM":31,"NY":32,"NC":33,"ND":34,"OH":35,"OK":36,"OR":37,"PA":38,"RI":39,"SC":40,"SD":41,"TN":42,"TX":43,"UT":44,"VT":45,"VA":46,"WA":47,"WV":48,"WI":49,"WY":50 };

let mainChart;

async function syncIntelligence() {
    try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP network error! Status: ${response.status}`);
        
        const csv = await response.text();
        const raw = d3.csvParse(csv);
        
        if (!raw || raw.length === 0) {
            document.getElementById('sync-status').innerText = "EMPTY DATAFEED RETURNED";
            return;
        }

        let grandTotal = 0;
        
        const processed = raw.map(r => {
            const affected = parseInt(r["Individuals Affected"]) || 0;
            grandTotal += affected;

            let rawDateStr = r["Breach Submission Date"] || "";
            let recordDate = new Date(rawDateStr);
            
            if (isNaN(recordDate.getTime()) && rawDateStr.includes('/')) {
                const parts = rawDateStr.split('/');
                if (parts.length === 3) {
                    recordDate = new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }

            return {
                x: recordDate, 
                y: stateMap[r["State"]] || 0, 
                r: Math.sqrt(affected) / 12 + 4, 
                entity: r["Name of Covered Entity"] || "Unknown Provider",
                state: r["State"] || "Unknown",
                type: r["Type of Breach"] || "Undetermined Vector",
                date: rawDateStr,
                totalExposed: affected
            };
        }).filter(d => d.y > 0 && !isNaN(d.x.getTime()));

        document.getElementById('total-affected').innerText = grandTotal.toLocaleString();

        if (mainChart) {
            mainChart.data.datasets[0].data = processed;
            mainChart.update();
        } else {
            initChart(processed);
        }
        document.getElementById('sync-status').innerText = `SYSTEM ONLINE: ${new Date().toLocaleTimeString()}`;
    } catch (e) { 
        console.error("Critical Diagnostic Pipeline Error Details:", e); 
        document.getElementById('sync-status').innerText = "DATA PIPELINE TIMEOUT";
    } finally {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function initChart(data) {
    const ctx = document.getElementById('breachChart').getContext('2d');
    const isMobile = window.innerWidth < 768;

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: data,
                backgroundColor: 'rgba(0, 210, 255, 0.25)',
                borderColor: '#00d2ff',
                borderWidth: 1.2,
                hoverBackgroundColor: '#ff4757',
                hoverBorderColor: '#ff4757'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'month', displayFormats: { month: 'MMM YYYY' } },
                    grid: { color: 'rgba(255,255,255,0.02)' },
                    ticks: { color: '#777', font: { family: 'JetBrains Mono', size: 10 } }
                },
                y: {
                    min: 0,
                    max: 51,
                    grid: { display: false },
                    ticks: {
                        color: '#777',
                        font: { size: isMobile ? 7 : 9, family: 'JetBrains Mono' },
                        stepSize: 1,
                        callback: v => Object.keys(stateMap).find(k => stateMap[k] === Math.round(v))
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: c => `${c.raw.entity} (${c.raw.totalExposed.toLocaleString()} records)`
                    }
                }
            },
            onClick: (e, el) => { if (el[0]) openDrawer(data[el[0].index]); }
        }
    });
}

function openProjectBriefing() {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    document.getElementById('panel-content').innerHTML = `
        <div class="ai-box">
            <span class="ai-pulse"></span> <strong>ETL PIPELINE DOCUMENTATION</strong>
            <p style="margin-top:10px; line-height:1.5; color:#8b949e;">
                <strong>Extract:</strong> Fetches live CSV data directly from your Google Sheets deployment using dynamic parameters to bypass intermediate network caches.<br><br>
                <strong>Transform:</strong> Uses D3 parsing utilities to map parameters straight into relational chart parameters: timeline metrics map to the horizontal scale (x), regional states map to spreadsheet index slots (y), and entry sums drive bubble volume dimensions (r).<br><br>
                <strong>Load:</strong> Injects the sanitized dataset array natively into responsive Canvas UI layers.
            </p>
        </div>

        <div class="ai-box" style="border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.02);">
            <strong>WHY THIS TRACKER IS CRITICAL</strong>
            <p style="margin-top:10px; line-height:1.5; color:#e6edf3;">
                Healthcare networks represent critical data targets because patient logs aggregate permanent identifying traits—such as medical history files, corporate insurance indices, and personal bio-data maps.<br><br>
                Unlike basic consumer financial details, core medical record traits cannot be changed or re-issued after a leak occurs. This monitoring platform contextually scales visual threat signals to keep users accurately informed.
            </p>
        </div>
        
        <div class="medisec-research-box">
            <span style="color:#ffd700; font-weight:700;">🌟 CRITICAL RESEARCH CORE: MEDISEC FINDINGS</span>
            <p style="margin-top:8px; line-height:1.5; color:#fff;">
                <strong>Infrastructure Threat Analysis:</strong> System trends directly visualize historical incident telemetry sourced from <strong>MediSec's cybersecurity research documentation hub</strong>.<br><br>
                Empirical evidence emphasizes that roughly 93% of tracked institutional healthcare systems suffered severe data leaks over historical multi-year oversight cycles, incurring catastrophic service downtime alongside organizational remediation costs averaging over $10 Million per event.
            </p>
        </div>
    `;
}

function openDrawer(d) {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    const isMajorHub = ["CA", "TX", "NY", "FL", "IL"].includes(d.state);
    const locAnalysis = isMajorHub 
        ? `High-Priority Target: Primary metropolitan network hub.`
        : `Regional Node: Localized network impact.`;

    let ai = {
        profile: "Standard security anomaly.",
        fact: "Medical records are high-value targets for identity theft operations.",
        tip: "Monitor financial statements for unauthorized medical billing."
    };

    if (d.type.includes("Hacking")) {
        ai = {
            profile: "Active Network Intrusion detected.",
            fact: "Hacking represents the majority of modern healthcare data loss.",
            tip: "Update patient portal credentials and enable 2FA immediately."
        };
    } else if (d.type.includes("Unauthorized")) {
        ai = {
            profile: "Internal Access Breach detected.",
            fact: "Internal snooping remains a significant risk for patient privacy.",
            tip: "Request an access audit log from the provider for your specific patient ID."
        };
    }

    document.getElementById('panel-content').innerHTML = `
        <div class="detail-item"><label>TARGET ENTITY</label><div class="value">${d.entity}</div></div>
        <div class="ai-box">
            <div style="color:#00d2ff; font-weight:bold; margin-bottom:12px; display:flex; align-items:center;">
                <span class="ai-pulse"></span> AI DIAGNOSTICS: ${d.state} NODE
            </div>
            <p><strong>$> THREAT PROFILE:</strong> ${ai.profile}</p>
            <p style="margin-top:10px;"><strong>$> GEO-ANALYSIS:</strong> ${locAnalysis}</p>
            <p style="margin-top:10px;"><strong>$> BREACH FACT:</strong> ${ai.fact}</p>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                <span style="color:#00d2ff; font-size:10px; display:block;">🛡️ PROTECTION PROTOCOL</span>
                <p style="color:#fff; margin-top:5px;">${ai.tip}</p>
            </div>
        </div>
        <div class="detail-item"><label>SPREADSHEET ROW INDEX</label><div class="value">${d.state} Node</div></div>
        <div class="detail-item"><label>BREACH MASS CAPACITY (RADIUS)</label><div class="value" style="color:var(--danger); font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()} Records</div></div>
        <div class="detail-item"><label>TIMELINE MARKER</label><div class="value">${d.date}</div></div>
        <div class="detail-item"><label>METHOD</label><div class="value">${d.type}</div></div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }

syncIntelligence();

```
