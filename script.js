const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTJL_YexPfz5paonO8NbvONGHkbgUO4bEuQI1qZDSRxWv3cvwqVoUNhOzfThkiegwnwLOkYM3Z2tlZ7/pub?gid=0&single=true&output=csv';

const stateMap = { "AL":1,"AK":2,"AZ":3,"AR":4,"CA":5,"CO":6,"CT":7,"DE":8,"FL":9,"GA":10,"HI":11,"ID":12,"IL":13,"IN":14,"IA":15,"KS":16,"KY":17,"LA":18,"ME":19,"MD":20,"MA":21,"MI":22,"MN":23,"MS":24,"MO":25,"MT":26,"NE":27,"NV":28,"NH":29,"NJ":30,"NM":31,"NY":32,"NC":33,"ND":34,"OH":35,"OK":36,"OR":37,"PA":38,"RI":39,"SC":40,"SD":41,"TN":42,"TX":43,"UT":44,"VT":45,"VA":46,"WA":47,"WV":48,"WI":49,"WY":50 };

let mainChart;

async function syncIntelligence() {
    try {
        const response = await fetch(`${CSV_URL}&t=${Date.now()}`);
        const csv = await response.text();
        const raw = d3.csvParse(csv);
        let grandTotal = 0;
        const processed = raw.map(r => {
            const affected = parseInt(r["Individuals Affected"]) || 0;
            grandTotal += affected;
            return {
                x: affected,
                y: (stateMap[r["State"]] || 0) + (Math.random() * 0.4 - 0.2),
                r: Math.sqrt(affected) / 10 + 4,
                entity: r["Name of Covered Entity"],
                state: r["State"],
                type: r["Type of Breach"],
                date: r["Breach Submission Date"]
            };
        }).filter(d => d.x > 0);
        document.getElementById('total-affected').innerText = grandTotal.toLocaleString();
        if (mainChart) {
            mainChart.data.datasets[0].data = processed;
            mainChart.update();
        } else {
            initChart(processed);
        }
        document.getElementById('sync-status').innerText = `SYSTEM ONLINE: ${new Date().toLocaleTimeString()}`;
    } catch (e) { console.error(e); }
}

function initChart(data) {
    const ctx = document.getElementById('breachChart').getContext('2d');
    mainChart = new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [{
                data: data,
                backgroundColor: 'rgba(0, 210, 255, 0.2)',
                borderColor: '#00d2ff',
                borderWidth: 1.5,
                hoverBackgroundColor: '#ff4757'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'logarithmic', grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#555' } },
                y: { grid: { display: false }, ticks: { color: '#555', callback: v => Object.keys(stateMap).find(k => stateMap[k] === Math.round(v)) } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `${c.raw.entity}` } }
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
            <span class="ai-pulse"></span> <strong>SYSTEM BRIEFING</strong>
            <p style="margin-top:10px;">This terminal tracks real-time healthcare data leaks to empower citizen awareness and digital protection.</p>
        </div>
        <div class="detail-item"><label>RADAR COORDINATES</label><div class="value">X-Axis: Severity (logarithmic scale). Y-Axis: Regional Nodes (US States).</div></div>
        <div class="detail-item"><label>AI INTERACTION</label><div class="value">Select any data node to perform a diagnostic scan on the incident type and regional impact.</div></div>
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
            <div style="color:var(--accent); font-weight:bold; margin-bottom:12px; display:flex; align-items:center;">
                <span class="ai-pulse"></span> AI DIAGNOSTICS: ${d.state} NODE
            </div>
            <p><strong>$> THREAT PROFILE:</strong> ${ai.profile}</p>
            <p style="margin-top:10px;"><strong>$> GEO-ANALYSIS:</strong> ${locAnalysis}</p>
            <p style="margin-top:10px;"><strong>$> BREACH FACT:</strong> ${ai.fact}</p>
            <div style="margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">
                <span style="color:var(--accent); font-size:10px; display:block;">🛡️ PROTECTION PROTOCOL</span>
                <p style="color:#fff; margin-top:5px;">${ai.tip}</p>
            </div>
        </div>
        <div class="detail-item"><label>STATE</label><div class="value">${d.state}</div></div>
        <div class="detail-item"><label>IMPACT</label><div class="value" style="color:var(--danger); font-size:28px;">${d.x.toLocaleString()}</div></div>
        <div class="detail-item"><label>METHOD</label><div class="value">${d.type}</div></div>
    `;
}

function closePanel() { document.getElementById('side-panel').classList.remove('open'); }
syncIntelligence();
setTimeout(openProjectBriefing, 1500);