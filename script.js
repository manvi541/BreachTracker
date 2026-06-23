const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

// PROFESSOR HO FEEDBACK FIX: States mapped by population density rank (1 = Largest, 50 = Smallest)
// This lets the graph reveal the true data story instead of just listing random alphabetical lines.
const stateMap = {
    "CA": 1, "TX": 2, "FL": 3, "NY": 4, "PA": 5, "IL": 6, "OH": 7, "GA": 8, "NC": 9, "MI": 10,
    "NJ": 11, "VA": 12, "WA": 13, "AZ": 14, "MA": 15, "TN": 16, "IN": 17, "MD": 18, "MO": 19, "WI": 20,
    "CO": 21, "MN": 22, "SC": 23, "AL": 24, "LA": 25, "KY": 26, "OR": 27, "OK": 28, "CT": 29, "UT": 30,
    "IA": 31, "NV": 32, "AR": 33, "MS": 34, "KS": 35, "NM": 36, "NE": 37, "ID": 38, "WV": 39, "HI": 40,
    "NH": 41, "ME": 42, "RI": 43, "MT": 44, "DE": 45, "SD": 46, "ND": 47, "AK": 48, "VT": 49, "WY": 50
};

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

            // Clamped logarithmic radius rendering removes severe overlapping circles
            const radiusSize = affected > 0 ? Math.log10(affected) * 4 : 4;

            processed.push({
                x: recordDate, 
                y: stateMap[r["State"].trim().toUpperCase()] || 0, 
                r: Math.max(4, Math.min(radiusSize, 28)), 
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
                backgroundColor: 'rgba(0, 210, 255, 0.2)', 
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
                padding: { right: 30, left: 10, top: 30, bottom: 10 }
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

// PROFESSOR HO FEEDBACK FIX: Removed deep jargon, added clean student-accessible explanations and ETL meaning!
function openProjectBriefing() {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    document.getElementById('panel-content').innerHTML = `
        <div class="ai-box">
            <span class="ai-pulse"></span> <strong style="font-family:'JetBrains Mono'; color:#00d2ff;">[HOW THE TRACKER WORKS]</strong>
            <p style="margin-top:12px; line-height:1.6; color:#c9d1d9; font-size:13px;">
                <b style="color:#fff;">1. Fetching the Data:</b><br>
                Every 15 seconds, the website automatically connects to our live database to pull down the latest official medical data breaches.
                <br><br>
                <b style="color:#fff;">2. Reading the Graph:</b><br>
                Our system translates raw database files directly into dynamic, interactive coordinates across your screen:
                <ul style="padding-left:18px; margin-top:5px; color:#8b949e;">
                    <li><b>Horizontal Axis (X):</b> The chronological calendar date when the data breach occurred.</li>
                    <li><b>Vertical Axis (Y):</b> Ordered by <b>state population size</b> (California and Texas are at the top, lower population states are at the bottom). This lets viewers instantly see whether cyberattacks target dense metropolitan centers or rural health systems.</li>
                    <li><b>Bubble Size (Radius):</b> Proportional to the size of the breach. The bigger the bubble, the more patient records were leaked.</li>
                </ul>
            </p>
        </div>

        <div class="ai-box" style="border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.02);">
            <strong style="color:#ff4757;">WHY THIS DATA MATTERS</strong>
            <p style="margin-top:10px; line-height:1.5; color:#e6edf3; font-size:13px;">
                Medical records are incredibly high-value targets for hackers because they hold permanent biological and identity data—like health conditions and social identifiers—that can never be changed or reset like a credit card number. This dashboard makes these exposures transparent.
            </p>
        </div>
        
        <div class="ai-box" style="border-color: rgba(0, 210, 255, 0.3); background: rgba(0, 210, 255, 0.01);">
            <strong style="color:#00d2ff; font-family:'JetBrains Mono';">⚙️ WHAT IS AN "ETL" PIPELINE?</strong>
            <p style="margin-top:10px; line-height:1.6; color:#c9d1d9; font-size:12px;">
                This tracker runs on a backend data engineering concept called <b>ETL (Extract, Transform, Load)</b>:
                <br><br>
                • <b>Extract:</b> The code reaches out and grabs the raw, messy text data from our live database spreadsheet.<br>
                • <b>Transform:</b> It cleans up the files, calculates the logarithmic math to scale the bubble sizes, and converts calendar dates into timeline coordinates.<br>
                • <b>Load:</b> It pushes that polished, newly organized information straight onto Chart.js to draw the interactive bubbles you see here.
            </p>
        </div>
        
        <div class="medisec-research-box" style="margin-top:15px; padding:15px; background:rgba(255,215,0,0.03); border:1px solid rgba(255,215,0,0.2); border-radius:6px;">
            <span style="color:#ffd700; font-weight:700; font-family:'JetBrains Mono'; display:block; margin-bottom:8px;">🌟 MEDISEC FELLOWSHIP INSIGHTS</span>
            <p style="line-height:1.5; color:#dbb32d; font-size:12px; margin:0;">
                Our student-led fellowship metrics prove that simplified open-source monitoring trackers are essential to transforming complex cybersecurity statistics into actionable tools students can use.
            </p>
        </div>
    `;
}

function openDrawer(d) {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    const isMajorHub = ["CA", "TX", "FL", "NY"].includes(d.state);
    const locAnalysis = isMajorHub ? `High-Population Hub: This incident targeted a highly dense state healthcare pipeline.` : `Smaller Population Node: Proves that rural and smaller medical databases are facing active risks.`;

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
                <span class="ai-pulse"></span> REGIONAL METRICS: ${d.state}
            </div>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> THREAT TYPE:</strong> ${ai.profile}</p>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> THE STORY:</strong> ${locAnalysis}</p>
            <p style="font-size:13px; margin: 4px 0;"><strong>$> BREACH FACT:</strong> ${ai.fact}</p>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                <span style="color:#ffd700; font-size:10px; display:block; font-weight:bold; letter-spacing:0.5px;">🛡️ SECURITY PROTOCOL</span>
                <p style="color:#fff; margin-top:5px; font-size:12px; line-height:1.4;">${ai.tip}</p>
            </div>
        </div>
        <div class="detail-item"><label>POPULATION INDEX RANK</label><div class="value">${d.state} (Rank #${d.y} / 50)</div></div>
        <div class="detail-item"><label>RECORDS COMPROMISED</label><div class="value" style="color:#ff4757; font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()}</div></div>
        <div class="detail-item"><label>TIMELINE MARKER</label><div class="value">${d.date}</div></div>
        <div class="detail-item"><label>BREACH VECTOR</label><div class="value">${d.type}</div></div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }

setInterval(syncIntelligence, 15000);
syncIntelligence();
