const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = { "AL":1,"AK":2,"AZ":3,"AR":4,"CA":5,"CO":6,"CT":7,"DE":8,"FL":9,"GA":10,"HI":11,"ID":12,"IL":13,"IN":14,"IA":15,"KS":16,"KY":17,"LA":18,"ME":19,"MD":20,"MA":21,"MI":22,"MN":23,"MS":24,"MO":25,"MT":26,"NE":27,"NV":28,"NH":29,"NJ":30,"NM":31,"NY":32,"NC":33,"ND":34,"OH":35,"OK":36,"OR":37,"PA":38,"RI":39,"SC":40,"SD":41,"TN":42,"TX":43,"UT":44,"VT":45,"VA":46,"WA":47,"WV":48,"WI":49,"WY":50 };

let mainChart;

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

            processed.push({
                x: recordDate, 
                y: stateMap[r["State"].trim().toUpperCase()] || 0, 
                r: Math.sqrt(affected) / 12 + 5, 
                entity: r["Name of Covered Entity"] || "Unknown Provider",
                state: r["State"] || "Unknown",
                type: r["Type of Breach"] || "Undetermined Vector",
                date: rawDateStr,
                totalExposed: affected
            });
        }

        const filteredData = processed.filter(d => d.y > 0);

        document.getElementById('total-affected').innerText = grandTotal.toLocaleString();

        if (mainChart) {
            filteredData.sort((a, b) => a.x - b.x);
            mainChart.data.datasets[0].data = filteredData;
            mainChart.update();
        } else {
            initChart(filteredData);
        }
        document.getElementById('sync-status').innerText = `SYSTEM ONLINE: ${new Date().toLocaleTimeString()}`;
    } catch (e) { 
        console.error("Pipeline breakdown caught safely:", e); 
        document.getElementById('sync-status').innerText = "DATA PIPELINE DISCONNECTED (RETRYING...)";
    } finally {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}

function initChart(data) {
    const ctx = document.getElementById('breachChart').getContext('2d');
    
    // Explicit chronological sorting for unified timeline compilation
    data.sort((a, b) => a.x - b.x);

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: data,
                backgroundColor: 'rgba(0, 210, 255, 0.35)',
                borderColor: '#00d2ff',
                borderWidth: 1.5,
                hoverBackgroundColor: '#ff4757',
                hoverBorderColor: '#ff4757'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    right: 40,
                    top: 20
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        parser: 'MM/dd/yyyy', 
                        unit: 'day',
                        displayFormats: { day: 'MMM d, yyyy' }
                    },
                    grid: { 
                        color: 'rgba(255, 255, 255, 0.05)',
                        borderDash: [5, 5] 
                    },
                    ticks: { 
                        color: '#8b949e', 
                        font: { family: 'JetBrains Mono', size: 10 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    title: {
                        display: true,
                        text: 'TIMELINE OF INCIDENTS',
                        color: '#777',
                        font: { family: 'JetBrains Mono', size: 10, weight: 'bold' }
                    }
                },
                y: {
                    min: 0,
                    max: 51,
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: {
                        color: '#8b949e',
                        font: { size: 10, family: 'JetBrains Mono' },
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
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    borderColor: 'rgba(0, 210, 255, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                        label: c => ` ${c.raw.entity} [${c.raw.totalExposed.toLocaleString()} records]`
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
            <span class="ai-pulse"></span> <strong>ETL PIPELINE DOCUMENTATION</strong>
            <p style="margin-top:10px; line-height:1.5; color:#8b949e;">
                <strong>Extract:</strong> Direct client-side fetch streams isolate raw CSV rows from your cloud layout configuration while applying cache parameters to avoid network lag.<br><br>
                <strong>Transform:</strong> D3 conversions map strings into structured graph values. Calendar inputs structure horizontal time coordinates (x), territorial boundaries designate row placements (y), and cumulative sizes determine bubble radii (r).<br><br>
                <strong>Load:</strong> Renders target data configurations directly inside modern HTML5 Chart layouts natively.
            </p>
        </div>
        <div class="ai-box" style="border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.02);">
            <strong>WHY THIS TRACKER IS CRITICAL</strong>
            <p style="margin-top:10px; line-height:1.5; color:#e6edf3;">
                Healthcare systems are prime vectors for security intrusion threats because user profiles connect non-resettable attributes, including permanent diagnostics, system insurance identification codes, and biometric arrays.<br><br>
                Unlike basic compromised credit profiles, foundational healthcare identifiers can never be re-issued following security architecture failures. This platform charts corporate risk visibility in near real-time.
            </p>
        </div>
        <div class="medisec-research-box">
            <span style="color:#ffd700; font-weight:700;">🌟 CRITICAL RESEARCH CORE: MEDISEC FINDINGS</span>
            <p style="margin-top:8px; line-height:1.5; color:#fff;">
                <strong>Infrastructure Threat Analysis:</strong> Display indicators coordinate patterns with historic dataset models archived inside <strong>MediSec's global cybersecurity research documentation database</strong>.<br><br>
                Empirical records suggest approximately 93% of studied medical frameworks fell victim to critical system data tracking leak events during multi-year testing schedules, costing targets massive infrastructure overhead margins.
            </p>
        </div>
    `;
}

function openDrawer(d) {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    const isMajorHub = ["CA", "TX", "NY", "FL", "IL"].includes(d.state);
    const locAnalysis = isMajorHub ? `High-Priority Target: Primary metropolitan network hub.` : `Regional Node: Localized network impact.`;

    let ai = {
        profile: "Standard security anomaly.",
        fact: "Medical records are high-value targets for identity theft operations.",
        tip: "Monitor financial statements for unauthorized medical billing."
    };

    if (d.type.includes("Hacking")) {
        ai = { profile: "Active Network Intrusion detected.", fact: "Hacking represents the majority of modern healthcare data loss.", tip: "Update patient portal credentials and enable 2FA immediately." };
    } else if (d.type.includes("Unauthorized")) {
        ai = { profile: "Internal Access Breach detected.", fact: "Internal snooping remains a significant risk for patient privacy.", tip: "Request an access audit log from the provider for your specific patient ID." };
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

// 15-second loop auto-refetches in background so it recovers seamlessly from loading states
setInterval(syncIntelligence, 15000);
syncIntelligence();
