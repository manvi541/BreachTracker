:root {
    --bg-main: #0b0e14;
    --bg-side: #11141b;
    --bg-card: #161b22;
    --accent: #e1eaec;
    --medisec-gold: #ffd700;
    --danger: #ff4757;
    --text-dim: #8b949e;
    --border: rgba(255, 255, 255, 0.05);
}

body { 
    background: var(--bg-main); 
    color: #e6edf3; 
    font-family: 'Plus Jakarta Sans', sans-serif; 
    margin: 0; 
    overflow-x: hidden; 
}

.app-shell { display: flex; height: 100vh; width: 100vw; }

.sidebar-nav { width: 260px; background: var(--bg-side); border-right: 1px solid var(--border); padding: 30px 20px; display: flex; flex-direction: column; gap: 40px; flex-shrink: 0; }
.logo-area { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 1.2rem; }
.logo-area small { font-weight: 400; color: var(--accent); font-size: 0.6rem; border: 1px solid var(--accent); padding: 2px 4px; border-radius: 3px; margin-left: 5px; }

.stats-summary label { font-size: 10px; font-weight: 700; color: var(--text-dim); letter-spacing: 1.5px; }
.big-num { font-family: 'JetBrains Mono', monospace; font-size: 1.8rem; color: #fff; margin: 5px 0; }

.nav-item { color: var(--text-dim); text-decoration: none; display: block; padding: 12px 15px; border-radius: 8px; font-size: 14px; transition: 0.2s; }
.nav-item.active { background: rgba(0, 210, 255, 0.1); color: var(--accent); font-weight: 600; }

.nav-item.active-highlight { 
    border: 1px dashed var(--medisec-gold); 
    color: var(--medisec-gold); 
    font-weight: 600; 
    margin-top: 10px; 
    background: rgba(255, 215, 0, 0.05); 
}

.viewport { flex: 1; display: flex; flex-direction: column; padding: 20px; overflow-y: auto; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; font-size: 12px; }
.cta-pill { background: #fff; color: #000; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-weight: 700; }
.chart-container { flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); position: relative; min-height: 450px; }

.spinner { 
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
    width: 35px; height: 35px; border: 3px solid rgba(0, 210, 255, 0.1); 
    border-top: 3px solid var(--accent); border-radius: 50%; 
    animation: spin 1s linear infinite; 
}
@keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }

.ai-box { background: rgba(0, 210, 255, 0.04); border: 1px solid rgba(0, 210, 255, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 25px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.medisec-research-box { background: rgba(255, 215, 0, 0.04); border: 1px solid var(--medisec-gold); border-radius: 12px; padding: 20px; margin-bottom: 25px; font-size: 12px; }
.ai-pulse { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; display: inline-block; margin-right: 8px; animation: glow 1.5s infinite; }
@keyframes glow { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

.intel-drawer { width: 420px; background: var(--bg-side); border-left: 1px solid var(--border); position: fixed; right: -420px; top: 0; height: 100%; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); padding: 40px; box-sizing: border-box; z-index: 1000; overflow-y: auto; }
.intel-drawer.open { right: 0; box-shadow: -20px 0 60px rgba(0,0,0,0.6); }
.detail-item { margin-bottom: 25px; }
.detail-item label { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
.value { font-size: 16px; color: #fff; font-weight: bold; margin-top: 5px; }
.close-btn { background: none; border: none; color: #fff; font-size: 32px; cursor: pointer; float: right; }

@media (max-width: 768px) {
    .app-shell { flex-direction: column; height: auto; }
    .sidebar-nav { width: 100%; border-right: none; border-bottom: 1px solid var(--border); box-sizing: border-box; }
    .chart-container { min-height: 600px; }
    .intel-drawer { width: 100%; right: -100%; }
}
