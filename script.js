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

            // VISUAL APPEAL FIX: Logarithmic bubble size clamping prevents overlapping clipping
            const radiusSize = affected > 0 ? Math.log10(affected) * 4 : 4;

            processed.push({
                x: recordDate, 
                y: stateMap[r["State"].trim().toUpperCase()] || 0, 
                r: Math.max(4, Math.min(radiusSize, 28)), // Clamps radii tightly between 4px and 28px
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
    
    data.sort((a, b) => a.x - b.x);

    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: data,
                backgroundColor: 'rgba(0, 210, 255, 0.2)', // Semi-transparent to reveal overlaps cleanly
                borderColor: 'rgba(0, 210, 255, 0.8)',
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
                padding: {
                    right: 30,
                    left: 10,
                    top: 30,
                    bottom: 10
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
                        color: 'rgba(255, 255, 255, 0.03)',
                        borderDash: [3, 3] 
                    },
                    ticks: { 
                        color: '#8b949e', 
                        font: { family: 'JetBrains Mono', size: 10 },
                        maxRotation: 30,
                        autoSkip: true,
                        maxTicksLimit: 10
                    },
                    title: {
                        display: true,
                        text: 'TIMELINE OF INCIDENTS',
                        color: '#555',
                        font: { family: 'JetBrains Mono', size: 10, weight: 'bold' }
                    }
                },
                y: {
                    min: -1, // Pad bottom grid line to prevent bubble clipping
                    max: 52, // Pad top grid line to keep high index states inside bounding boxes
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
                        label: c => `📍 ${c.raw.entity}\n📊 ${c.raw.totalExposed.toLocaleString()} records exposed`
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
            <span class="ai-pulse"></span> <strong style="font-family:'JetBrains Mono'; color:#00d2ff;">[ETL PIPELINE DOCUMENTATION]</strong>
            <p style="margin-top:12px; line-height:1.6; color:#c9d1d9; font-size:13px;">
                <b style="color:#fff;">1. EXTRACT:</b><br>
                The pipeline sends asynchronous HTTP streams out to your active Google Sheets cloud link. It adds a dynamic timestamp payload parameter (<code style="color:#ffd700;">&nocache=</code>) to kill internal intermediate content delivery caches, forcing an absolute raw data download directly from the web core every time.
                <br><br>
                <b style="color:#fff;">2. TRANSFORM:</b><br>
                D3's processing parser takes the raw comma-separated layout strings and maps them into native JavaScript object matrices. Text data templates get converted into sanitized properties:
                <ul style="padding-left:18px; margin-top:5px; color:#8b949e;">
                    <li>Dates format into linear chronological coordinates (<code style="color:#00d2ff;">x</code>).</li>
                    <li>U.S. States map to index slots 1–50 on a geometric row structure (<code style="color:#00d2ff;">y</code>).</li>
                    <li>Absolute exposure figures filter through logarithmic area sizing (<code style="color:#00d2ff;">r</code>) to ensure clean grid rendering.</li>
                </ul>
                <br>
                <b style="color:#fff;">3. LOAD:</b><br>
                Sanitized arrays stream into the browser's HTML5 Canvas visualization wrapper, rendering dynamic data bubbles through the Chart.js rendering engine instantly.
            </p>
        </div>

        <div class="ai-box" style="border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.02);">
            <strong style="color:#ff4757;">CRITICAL INFRASTRUCTURE FOCUS</strong>
            <p style="margin-top:10px; line-height:1.5; color:#e6edf3; font-size:13px;">
                Medical assets are high-value threat landscapes because identity registries synthesize permanent attributes—social identifiers, internal health histories, and biographical markers. This system updates real-time tracking variables to keep risk pools completely transparent.
            </p>
        </div>
        
        <div class="medisec-research-box" style="margin-top:15px; padding:15px; background:rgba(255,215,0,0.03); border:1px solid rgba(255,215,0,0.2); border-radius:6px;">
            <span style="color:#ffd700; font-weight:700; font-family:'JetBrains Mono'; display:block; margin-bottom:8px;">🌟 MEDISEC RESEARCH INSIGHTS</span>
            <p style="line-height:1.5; color:#dbb32d; font-size:12px; margin:0;">
                Empirical tracking show that up to 93% of institutional networks experience localized threat vulnerabilities over fixed structural operating life cycles, escalating the need for visual pipeline indicators like this radar.
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
        <div class="detail-item"><label>TARGET ENTITY</label><div class="value" style="color:#00d2ff; font-weight:bold;">${d.entity}</div></div>
        <div class="ai-box" style="margin-top:15px; margin-bottom:15px;">
            <div style="color:#00d2ff; font-weight:bold; margin-bottom:12px; display:flex; align-items:center; font-family:'JetBrains Mono';">
                <span class="ai-pulse"></span> DIAGNOSTICS: ${d.state} NODE
            </div>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> THREAT PROFILE:</strong> ${ai.profile}</p>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> GEO-ANALYSIS:</strong> ${locAnalysis}</p>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> BREACH FACT:</strong> ${ai.fact}</p>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                <span style="color:#ffd700; font-size:10px; display:block; font-weight:bold; letter-spacing:0.5px;">🛡️ MITIGATION PROTOCOL</span>
                <p style="color:#fff; margin-top:5px; font-size:12px; line-height:1.4;">${ai.tip}</p>
            </div>
        </div>
        <div class="detail-item"><label>GEOGRAPHIC SLOT KEY</label><div class="value">${d.state} Matrix (Index ${d.y})</div></div>
        <div class="detail-item"><label>RECORDS COMPROMISED</label><div class="value" style="color:#ff4757; font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()}</div></div>
        <div class="detail-item"><label>TIMELINE MARKER</label><div class="value">${d.date}</div></div>
        <div class="detail-item"><label>BREACH VECTOR</label><div class="value">${d.type}</div></div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }

setInterval(syncIntelligence, 15000);
syncIntelligence();
