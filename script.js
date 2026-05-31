const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = { "AL":1,"AK":2,"AZ":3,"AR":4,"CA":5,"CO":6,"CT":7,"DE":8,"FL":9,"GA":10,"HI":11,"ID":12,"IL":13,"IN":14,"IA":15,"KS":16,"KY":17,"LA":18,"ME":19,"MD":20,"MA":21,"MI":22,"MN":23,"MS":24,"MO":25,"MT":26,"NE":27,"NV":28,"NH":29,"NJ":30,"NM":31,"NY":32,"NC":33,"ND":34,"OH":35,"OK":36,"OR":37,"PA":38,"RI":39,"SC":40,"SD":41,"TN":42,"TX":43,"UT":44,"VT":45,"VA":46,"WA":47,"WV":48,"WI":49,"WY":50 };

let mainChart;

// Change 5: Specific milestone benchmark date configuration (January 1, 2025)
const TRACKING_BENCHMARK = new Date("2025-01-01");

async function syncIntelligence() {
    try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
        const csv = await response.text();
        const raw = d3.csvParse(csv);
        let dynamicImpactSum = 0;
        
        const processed = raw.map(r => {
            const affected = parseInt(r["Individuals Affected"]) || 0;
            const recordDate = new Date(r["Breach Submission Date"]);
            
            // Change 5: Cumulative aggregate filtering records exclusively following milestone anchor
            if (recordDate >= TRACKING_BENCHMARK) {
                dynamicImpactSum += affected;
            }

            return {
                // Change 2: X-Axis mapped cleanly to chronological timeline entries
                x: recordDate,
                // Change 2: Y-Axis mapped to state numbers mimicking row indices in spreadsheets
                y: stateMap[r["State"]] || 0,
                // Change 3: Circle size (radius) dynamically mapped to raw breach scale mass via area square root math
                r: Math.sqrt(affected) / 12 + 3,
                entity: r["Name of Covered Entity"],
                state: r["State"],
                type: r["Type of Breach"],
                date: r["Breach Submission Date"],
                totalExposed: affected
            };
        }).filter(d => d.y > 0 && !isNaN(d.x.getTime()));

        // Assigning our post-2025 parsed target summation data back to the sidebar element node
        document.getElementById('total-affected').innerText = dynamicImpactSum.toLocaleString();

        if (mainChart) {
            mainChart.data.datasets[0].data = processed;
            mainChart.update();
        } else {
            initChart(processed);
        }
        document.getElementById('sync-status').innerText = `SYSTEM ONLINE: ${new Date().toLocaleTimeString()}`;
    } catch (e) { 
        console.error(e); 
        document.getElementById('sync-status').innerText = "DATA PIPELINE FAULT";
    } finally {
        // Turning off the background spinner once dataset loading is concluded
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
                // Change 2: Setting up clean temporal Month/Year formats on the timeline X scale
                x: {
                    type: 'time',
                    time: { unit: 'month', displayFormats: { month: 'MMM YYYY' } },
                    grid: { color: 'rgba(255,255,255,0.02)' },
                    ticks: { color: '#777', font: { family: 'JetBrains Mono', size: 10 } }
                },
                // Change 2: Setting up Y axis keys to pull matching text indicators out of stateMap
                y: {
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

// Change 1 & 4: Infusing an explicit breakdown of the system's ETL process and highlighting MediSec research stats
function openProjectBriefing() {
    const drawer = document.getElementById('side-panel');
    drawer.classList.add('open');
    document.getElementById('panel-content').innerHTML = `
        <div class="ai-box">
            <span class="ai-pulse"></span> <strong>SYSTEM BRIEFING & ETL ARCHITECTURE</strong>
            <p style="margin-top:10px; line-height:1.5; color:#8b949e;">
                <strong>Extract:</strong> Pulls dynamic string text payloads directly from cloud spreadsheets utilizing live timestamp append queries to ensure asset freshness.<br><br>
                <strong>Transform:</strong> Normalizes dates to the sequential timeline horizontal axis ($x$), indexes geolocation identifiers to chart rows ($y$), and balances target circle radii using area square root calculations ($r$).<br><br>
                <strong>Load:</strong> Maps clean runtime object sets straight into the UI canvas layout visualization blocks.
            </p>
        </div>
        
        <div class="medisec-research-box">
            <span style="color:#ffd700; font-weight:700;">🌟 CRITICAL RESEARCH CORE: MEDISEC PROFILE</span>
            <p style="margin-top:8px; line-height:1.5; color:#fff;">
                <strong>Baseline Study Framework:</strong> The operational signals charted within this interface correspond with analytical patterns outlined within <strong>MediSec's healthcare industry security research data</strong>.<br><br>
                Historical indicators emphasize that up to 93% of analyzed hospital frameworks sustained critical data leak exposures over previous multi-year testing trajectories, multiplying systemic risk and triggering average remediation fees scaling far above $10 Million.
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
        <div class="detail-item"><label>SPREADSHEET ROW LOCATION</label><div class="value">${d.state}</div></div>
        <div class="detail-item"><label>BREACH MASS CAPACITY (RADIUS)</label><div class="value" style="color:var(--danger); font-size:24px; font-weight:700;">${d.totalExposed.toLocaleString()} Records</div></div>
        <div class="detail-item"><label>TIMELINE MARKER</label><div class="value">${d.date}</div></div>
        <div class="detail-item"><label>METHOD</label><div class="value">${d.type}</div></div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }

// Introducing the essential date management library script to enable timeline parsing features
const chartAdapter = document.createElement('script');
chartAdapter.src = 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns';
document.head.appendChild(chartAdapter);

chartAdapter.onload = () => { syncIntelligence(); };
