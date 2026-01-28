# Intelligence Terminal | Healthcare Data Radar

A high-performance, responsive web application designed to visualize and analyze healthcare data breaches across the United States. This terminal transforms raw public records into an interactive intelligence dashboard.

## 🚀 Live Features

- **Logarithmic Threat Radar**: Visualizes breach severity using a bubble chart. The X-axis uses a logarithmic scale to represent victim counts, while the Y-axis maps incidents to regional nodes (US States).
- **AI Diagnostic Engine**: Clicking any data node triggers a real-time analysis of the threat profile (Hacking vs. Unauthorized Access) and geographic risk assessment.
- **Automated Data Sync**: Fetches and processes live research data via CSV integration with D3.js.
- **Mobile Optimized**: Custom responsive design that prevents data clustering on small screens by dynamically adjusting the chart aspect ratio.

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3 (Custom Grid/Flexbox), JavaScript (ES6+)
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) & [D3.js](https://d3js.org/)
- **Typography**: Plus Jakarta Sans & JetBrains Mono
- **Deployment**: Optimized for Netlify/GitHub Pages

## 🧠 Logic Overview



The terminal utilizes a custom logic engine to interpret breach data:
1. **Geometric Scaling**: Bubble radii ($r$) are calculated using the square root of affected individuals ($\sqrt{x}$) to ensure visual balance.
2. **Threat Profiling**: The system parses strings within the "Breach Type" field to categorize incidents into high-intensity (Hacking) or internal (Unauthorized) profiles.
3. **Geo-Assessment**: The AI identifies "High-Priority Target Hubs" based on historical data density in specific US States.

## 📂 Project Structure

- `index.html`: The core application shell and UI layout.
- `style.css`: Modern "Dark Mode" terminal aesthetics and mobile-responsive breakpoints.
- `script.js`: Data fetching, Chart.js configuration, and the AI Analyst logic engine.

## ⚖️ Disclaimer
This tool is for educational and research purposes. Data is sourced from public records provided by the U.S. Department of Health and Human Services (HHS).
