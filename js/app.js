// Global State
const API_URL = window.location.origin.includes(':5000') ? window.location.origin : 'http://127.0.0.1:5000';
let currentData = [];
let chartInstance = null;
let currentMSE = Infinity;
let currentScenarioMeta = {};

// DOM Elements - Steps & Navigation
const step1 = document.getElementById('step-1');
const interactiveWorkspace = document.getElementById('interactive-workspace');
const step4 = document.getElementById('step-4');
const navStep1 = document.getElementById('nav-step-1');
const navStep2 = document.getElementById('nav-step-2');
const navStep3 = document.getElementById('nav-step-3');
const navStep4 = document.getElementById('nav-step-4');
const subtitle = document.getElementById('scenario-subtitle');

let missingPoints = [];
let plottedMissingCount = 0;

// DOM Elements - Step 1: Data
const scenarioSelect = document.getElementById('scenario-select');
const newDatasetBtn = document.getElementById('new-dataset-btn');
const dataPreviewSection = document.getElementById('data-preview-section');
const dataTableBody = document.getElementById('data-table-body');
const tableColX = document.getElementById('table-col-x');
const tableColY = document.getElementById('table-col-y');
const selectX = document.getElementById('select-x');
const selectY = document.getElementById('select-y');
const btnToStep2 = document.getElementById('btn-to-step-2');

// DOM Elements - Shared Interactive Workspace (Steps 2 & 3)
const workspaceTitle = document.getElementById('workspace-title');
const workspaceSubtitle = document.getElementById('workspace-subtitle');
const metricsPanelContainer = document.getElementById('metrics-panel-container');
const btnWorkspaceNext = document.getElementById('btn-workspace-next');

// DOM Elements - Step 2 Controls (Plot Data)
const step2Controls = document.getElementById('step-2-controls');
const missingPointsList = document.getElementById('missing-points-list');
const plotErrorMsg = document.getElementById('plot-error-msg');

// DOM Elements - Step 3 Controls (Model Training)
const step3Controls = document.getElementById('step-3-controls');
const slopeSlider = document.getElementById('slopeSlider');
const interceptSlider = document.getElementById('interceptSlider');
const slopeValue = document.getElementById('slopeValue');
const interceptValue = document.getElementById('interceptValue');
const mseValue = document.getElementById('mse-value');
const r2Value = document.getElementById('r2-value');
const feedbackBadge = document.getElementById('score-feedback');
const conclusionText = document.getElementById('learning-conclusion');
const instructionGoal = document.getElementById('instruction-goal');
const labelIntercept = document.getElementById('label-intercept');
const tooltipIntercept = document.getElementById('tooltip-intercept');
const labelSlope = document.getElementById('label-slope');
const tooltipSlope = document.getElementById('tooltip-slope');
const autoFitBtn = document.getElementById('auto-fit-btn');
const sliderHints = document.getElementById('slider-hints');
const hintText = document.getElementById('hint-text');

// DOM Elements - Step 4: Forecasting
const forecastInputX = document.getElementById('forecast-input-x');
const forecastBtn = document.getElementById('forecast-btn');
const forecastOutputY = document.getElementById('forecast-output-y');
const forecastLabelX = document.getElementById('forecast-label-x');
const forecastLabelY = document.getElementById('forecast-label-y');
const btnRestart = document.getElementById('btn-restart');

let hasFiredConfetti = false;

const SCENARIO_META = {
    marketing: {
        xName: 'Marketing Spend ($1000s)',
        yName: 'Sales ($1000s)',
        xDesc: 'Marketing Spend',
        yDesc: 'Sales',
        subtitle: `MBA Scenario 1: Model how <strong>Marketing Spend</strong> drives <strong>Sales</strong>.`,
        goal: `<strong>Your Goal:</strong> Adjust your model (the red trendline) so it correctly predicts Sales based on past Marketing Data (blue dots).`,
        intLabel: `Organic Sales (Intercept)`,
        intTooltip: `Business Meaning: If we spend $0 on marketing, how many organic sales will we naturally get? (Moves line Up/Down)`,
        slpLabel: `Marketing ROI (Slope)`,
        slpTooltip: `Business Meaning: For every $1000 spent on marketing, what is the exact financial increase in sales? (Tilts the line)`,
        defaultSlope: 2, defaultIntercept: 20
    },
    training: {
        xName: 'Training Hours',
        yName: 'CSAT Score (0-100)',
        xDesc: 'Training Hours',
        yDesc: 'Customer Satisfaction',
        subtitle: `MBA Scenario 2: Model how <strong>Employee Training</strong> impacts <strong>Customer Satisfaction (CSAT)</strong>.`,
        goal: `<strong>Your Goal:</strong> Find the correct trendline to prove if investing in employee training actually improves customer satisfaction.`,
        intLabel: `Base CSAT (Intercept)`,
        intTooltip: `Business Meaning: If an employee receives absolutely no training, what is their default performance score? (Moves line Up/Down)`,
        slpLabel: `Training Value (Slope)`,
        slpTooltip: `Business Meaning: For every additional hour of training, how many points does the CSAT score go up? (Tilts the line)`,
        defaultSlope: 1, defaultIntercept: 40
    },
    temperature: {
        xName: 'Temperature (°C)',
        yName: 'Daily Revenue ($)',
        xDesc: 'Temperature',
        yDesc: 'Cold Drink Revenue',
        subtitle: `MBA Scenario 3: Create a forecasting model for <strong>Cold Drink Revenues</strong> based on <strong>Temperature</strong>.`,
        goal: `<strong>Your Goal:</strong> Adjust the model to predict how weather changes impact our daily inventory and revenue needs.`,
        intLabel: `Winter Revenue (Intercept)`,
        intTooltip: `Business Meaning: Even on a freezing 0°C day, how much baseline revenue do we still make? (Moves line Up/Down)`,
        slpLabel: `Heat Multiplier (Slope)`,
        slpTooltip: `Business Meaning: For every 1°C increase in temperature, how much extra revenue do we generate? (Tilts the line)`,
        defaultSlope: 5, defaultIntercept: -20
    },
    price_demand: {
        xName: 'Product Price ($)',
        yName: 'Units Sold (Demand)',
        xDesc: 'Product Price',
        yDesc: 'Customer Demand',
        subtitle: `MBA Scenario 4: Understand the <strong>Price Elasticity of Demand</strong>.`,
        goal: `<strong>Your Goal:</strong> Model how much customer demand drops every time you raise the product's price.`,
        intLabel: `Maximum Demand (Intercept)`,
        intTooltip: `Business Meaning: If the product was given away for free ($0), how many units would people take? (Moves line Up/Down)`,
        slpLabel: `Price Sensitivity (Slope)`,
        slpTooltip: `Business Meaning: For every $1 increase in price, how many fewer units do we sell? (Negative Slope, Tilts line downwards)`,
        defaultSlope: -3, defaultIntercept: 600
    },
    rd_revenue: {
        xName: 'R&D Budget ($ Millions)',
        yName: 'New Product Revenue ($ Millions)',
        xDesc: 'R&D Investment',
        yDesc: 'New Product Revenue',
        subtitle: `MBA Scenario 5: Forecasting the ROI of <strong>R&D Innovation</strong>.`,
        goal: `<strong>Your Goal:</strong> Prove how investing millions in Research & Development generates future revenue.`,
        intLabel: `Legacy Revenue (Intercept)`,
        intTooltip: `Business Meaning: If we completely defunded R&D ($0), how much revenue would we still make from old products? (Moves line Up/Down)`,
        slpLabel: `Innovation Multiplier (Slope)`,
        slpTooltip: `Business Meaning: For every $1M invested in R&D, how much new product revenue is generated? (Tilts the line)`,
        defaultSlope: 5, defaultIntercept: 10
    }
};

// ==========================================
// NAVIGATION & STEPS
// ==========================================
let currentStep = 1;
let lineDrawProgress = 1; // used for progressive line drawing animation
let drawInterval = null;

function goToStep(stepNumber) {
    console.log(`Navigating to Step: ${stepNumber}`);
    currentStep = stepNumber;
    
    // Safety check: ensure the app container itself isn't hidden
    const appContainer = document.querySelector('.app-container');
    if(appContainer) appContainer.style.display = 'block';

    if(step1) step1.classList.add('hidden');
    if(interactiveWorkspace) interactiveWorkspace.classList.add('hidden');
    if(step4) step4.classList.add('hidden');
    
    [navStep1, navStep2, navStep3, navStep4].forEach(nav => {
        if(nav) nav.style.color = '#64748b';
    });

    if (stepNumber === 1) {
        if(step1) step1.classList.remove('hidden');
        if(navStep1) navStep1.style.color = 'var(--primary-color)';
        if(dataPreviewSection) dataPreviewSection.classList.add('hidden');
        if(scenarioSelect) scenarioSelect.disabled = false;
        if(newDatasetBtn) newDatasetBtn.disabled = false;
        if(btnToStep2) {
            btnToStep2.disabled = true;
            btnToStep2.style.opacity = '0.5';
            btnToStep2.style.cursor = 'not-allowed';
        }
    } else if (stepNumber === 2 || stepNumber === 3) {
        if(interactiveWorkspace) interactiveWorkspace.classList.remove('hidden');
        const activeNav = stepNumber === 2 ? navStep2 : navStep3;
        if(activeNav) activeNav.style.color = 'var(--primary-color)';
        
        if (stepNumber === 2) {
            if(workspaceTitle) workspaceTitle.innerHTML = 'Step 2: Plot the Data 📌';
            if(workspaceSubtitle) workspaceSubtitle.innerHTML = 'Before an AI model can be trained, you must physically structure the data into a Scatter Plot.';
            if(step2Controls) step2Controls.classList.remove('hidden');
            if(step3Controls) step3Controls.classList.add('hidden');
            if(metricsPanelContainer) metricsPanelContainer.classList.add('hidden');
            
            if(btnWorkspaceNext) {
                if (plottedMissingCount >= 3) {
                    btnWorkspaceNext.disabled = false;
                    btnWorkspaceNext.style.opacity = '1';
                    btnWorkspaceNext.style.cursor = 'pointer';
                    btnWorkspaceNext.innerHTML = 'Proceed to Train Model &rarr;';
                } else {
                    btnWorkspaceNext.disabled = true;
                    btnWorkspaceNext.style.opacity = '0.5';
                    btnWorkspaceNext.style.cursor = 'not-allowed';
                    btnWorkspaceNext.innerHTML = 'Plot all points to proceed';
                }
                btnWorkspaceNext.onclick = () => goToStep(3);
            }
        } else {
            if(workspaceTitle) workspaceTitle.innerHTML = 'Step 3: Train Your Model ⚙️';
            if(workspaceSubtitle) workspaceSubtitle.innerHTML = 'The AI algorithm uses <strong>Linear Regression</strong> to draw a trendline. Your goal is to manually adjust the business assumptions below to perfectly fit the historical data.';
            if(step2Controls) step2Controls.classList.add('hidden');
            if(step3Controls) step3Controls.classList.remove('hidden');
            if(metricsPanelContainer) metricsPanelContainer.classList.remove('hidden');
            
            if(btnWorkspaceNext) {
                btnWorkspaceNext.onclick = () => goToStep(4);
            }
            
            if(drawInterval) clearInterval(drawInterval);
            lineDrawProgress = 0;
            updateMetricsInstant();
            
            drawInterval = setInterval(() => {
                lineDrawProgress += 0.04;
                if (lineDrawProgress >= 1) {
                    lineDrawProgress = 1;
                    clearInterval(drawInterval);
                }
                updateChart();
            }, 30);
        }
        
        // Ensure chart is initialized when we first enter the shared workspace
        if (!chartInstance) initChart();
        updateScenarioUI();
        updateChart();
    } else if (stepNumber === 4) {
        if(step4) step4.classList.remove('hidden');
        if(navStep4) navStep4.style.color = 'var(--primary-color)';
        setupForecasting();
    }
}

// ==========================================
// STEP 1: LOAD DATA AND MAPPING
// ==========================================
async function fetchDataset() {
    try {
        const scenario = scenarioSelect.value;
        currentScenarioMeta = SCENARIO_META[scenario];
        subtitle.innerHTML = currentScenarioMeta.subtitle;
        
        const response = await fetch(`${API_URL}/dataset?scenario=${scenario}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const result = await response.json();
        const fullData = result.data;
        
        // Hide 3 points for the interactive Plotting Step!
        missingPoints = fullData.splice(fullData.length - 3, 3);
        plottedMissingCount = 0;
        
        currentData = fullData; // remaining data
        hasFiredConfetti = false;
        
        // Populate the missing points UI
        if (missingPointsList) {
            missingPointsList.innerHTML = '';
            missingPoints.forEach((pt, i) => {
                missingPointsList.innerHTML += `<li id="missing-pt-${i}">Data Point: <strong>X = ${pt.x}</strong>, &nbsp; <strong>Y = ${pt.y}</strong></li>`;
            });
        }
        if (plotErrorMsg) plotErrorMsg.classList.add('hidden');
        
        populateDataPreview();
        dataPreviewSection.classList.remove('hidden');
        
        // Reset assignments
        selectX.value = "";
        selectY.value = "";
        checkVariableAssignment();
        
        scenarioSelect.disabled = true;
        newDatasetBtn.disabled = true;

    } catch (error) {
        console.error("Failed to fetch dataset:", error);
        alert("Failed to connect to backend. Make sure app.py is running!");
    }
}

function populateDataPreview() {
    tableColX.textContent = currentScenarioMeta.xName;
    tableColY.textContent = currentScenarioMeta.yName;
    
    dataTableBody.innerHTML = '';
    // Show only first 5 rows
    for (let i = 0; i < Math.min(5, currentData.length); i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">#${i+1}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${currentData[i].x}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: var(--primary-color);">${currentData[i].y}</td>
        `;
        dataTableBody.appendChild(tr);
    }

    // Populate selects randomly so users have to read
    const opts = [
        {val: 'x', text: currentScenarioMeta.xName},
        {val: 'y', text: currentScenarioMeta.yName}
    ].sort(() => Math.random() - 0.5); // shuffle

    selectX.innerHTML = '<option value="">-- Select Feature --</option>';
    selectY.innerHTML = '<option value="">-- Select Target --</option>';
    
    opts.forEach(opt => {
        selectX.innerHTML += `<option value="${opt.val}">${opt.text}</option>`;
        selectY.innerHTML += `<option value="${opt.val}">${opt.text}</option>`;
    });
}

function checkVariableAssignment() {
    // Correct assignment: X => 'x', Y => 'y'
    if (selectX.value === 'x' && selectY.value === 'y') {
        btnToStep2.disabled = false;
        btnToStep2.style.opacity = '1';
        btnToStep2.style.cursor = 'pointer';
        btnToStep2.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        btnToStep2.innerHTML = 'Correct! Proceed to Data Plotting &rarr;';
    } else {
        btnToStep2.disabled = true;
        btnToStep2.style.opacity = '0.5';
        btnToStep2.style.cursor = 'not-allowed';
        btnToStep2.style.background = '';
        btnToStep2.innerHTML = 'Select the correct variables to proceed';
    }
}

// ==========================================
// AI ASSISTANT LOGIC
// ==========================================
function getOptimalFit() {
    if (currentData.length === 0) return { slope: 0, intercept: 0 };
    let xSum = 0, ySum = 0;
    currentData.forEach(p => { xSum += p.x; ySum += p.y; });
    const xMean = xSum / currentData.length;
    const yMean = ySum / currentData.length;
    
    let num = 0, den = 0;
    currentData.forEach(p => {
        num += (p.x - xMean) * (p.y - yMean);
        den += (p.x - xMean) * (p.x - xMean);
    });
    
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    return { slope, intercept };
}

function updateHints(currentSlope, currentIntercept) {
    if (!sliderHints || !hintText) return;
    sliderHints.classList.remove('hidden');
    
    const { slope: optSlope, intercept: optIntercept } = getOptimalFit();
    const maxSlope = parseFloat(slopeSlider.max) || 25;
    const minSlope = parseFloat(slopeSlider.min) || -20;
    const maxInt = parseFloat(interceptSlider.max) || 250;
    const minInt = parseFloat(interceptSlider.min) || -100;
    
    const slopeDiffNorm = (optSlope - currentSlope) / (maxSlope - minSlope);
    const intDiffNorm = (optIntercept - currentIntercept) / (maxInt - minInt);
    
    let hint = "You are close! Fine-tune the sliders slightly.";
    if (Math.abs(intDiffNorm) > Math.abs(slopeDiffNorm) && Math.abs(intDiffNorm) > 0.05) {
        hint = intDiffNorm > 0 ? "The model line is too low. Try <strong>increasing</strong> the Fixed Baseline (Intercept)." : "The model line is too high. Try <strong>decreasing</strong> the Fixed Baseline (Intercept).";
    } else if (Math.abs(slopeDiffNorm) > 0.05) {
        hint = slopeDiffNorm > 0 ? "The angle is wrong. Try <strong>increasing</strong> the Strategic Impact (Slope)." : "The angle is wrong. Try <strong>decreasing</strong> the Strategic Impact (Slope).";
    }
    hintText.innerHTML = hint;
}

// ==========================================
// STEP 2: MODEL TRAINING
// ==========================================
function updateScenarioUI() {
    instructionGoal.innerHTML = currentScenarioMeta.goal;
    labelIntercept.innerText = currentScenarioMeta.intLabel;
    tooltipIntercept.innerText = currentScenarioMeta.intTooltip;
    labelSlope.innerText = currentScenarioMeta.slpLabel;
    tooltipSlope.innerText = currentScenarioMeta.slpTooltip;
    
    slopeSlider.value = currentScenarioMeta.defaultSlope;
    interceptSlider.value = currentScenarioMeta.defaultIntercept;
    slopeValue.textContent = currentScenarioMeta.defaultSlope;
    interceptValue.textContent = currentScenarioMeta.defaultIntercept;
    currentMSE = Infinity;
    
    if (chartInstance) {
        chartInstance.options.scales.x.title.text = currentScenarioMeta.xName;
        chartInstance.options.scales.y.title.text = currentScenarioMeta.yName;
        chartInstance.update();
    }
}

function updateMetricsInstant() {
    if (currentData.length === 0) return;
    
    const slope = parseFloat(slopeSlider.value);
    const intercept = parseFloat(interceptSlider.value);
    
    // Calculate MSE & R2 Locally for zero latency
    let sumSquaredError = 0;
    let ySum = 0;
    currentData.forEach(p => ySum += p.y);
    const yMean = ySum / currentData.length;
    let totalSumSquares = 0;
    
    currentData.forEach(p => {
        const yPred = slope * p.x + intercept;
        const error = p.y - yPred;
        sumSquaredError += error * error;
        totalSumSquares += (p.y - yMean) * (p.y - yMean);
    });
    
    const mse = sumSquaredError / currentData.length;
    let r2 = 1 - (sumSquaredError / totalSumSquares);
    if (r2 < -1) r2 = -1; // cap visually
    
    // Display animations logic
    if (mse < currentMSE && currentMSE !== Infinity) {
        feedbackBadge.classList.remove('hidden');
        feedbackBadge.style.animation = 'none';
        feedbackBadge.offsetHeight;
        feedbackBadge.style.animation = null; 
        setTimeout(() => { feedbackBadge.classList.add('hidden'); }, 800);
    }
    
    currentMSE = mse;
    mseValue.textContent = Math.round(mse).toLocaleString();
    let r2Percent = Math.max(0, Math.round(r2 * 100));
    r2Value.textContent = `${r2Percent}%`;

    // Dynamic Learning Conclusion
    if (r2Percent > 80) {
        conclusionText.innerHTML = `🌟 <strong>Strong Business Model!</strong> With an R-Squared of ${r2Percent}%, you have statistically proven the relationship. You can confidentally present this model to the board for strategic planning!`;
        btnWorkspaceNext.disabled = false;
        btnWorkspaceNext.style.opacity = '1';
        btnWorkspaceNext.style.cursor = 'pointer';
        btnWorkspaceNext.innerHTML = 'Proceed to Business Forecasting &rarr;';
        if (sliderHints) sliderHints.classList.add('hidden');
        if (!hasFiredConfetti && typeof confetti !== "undefined") {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            hasFiredConfetti = true;
        }
    } else if (r2Percent > 40) {
        conclusionText.innerHTML = `👍 <strong>Almost There!</strong> Your model is ${r2Percent}% accurate. Keep adjusting your Baseline and ROI assumptions to shrink those prediction errors!`;
        hasFiredConfetti = false;
        btnWorkspaceNext.disabled = true;
        btnWorkspaceNext.style.opacity = '0.5';
        btnWorkspaceNext.style.cursor = 'not-allowed';
        btnWorkspaceNext.innerHTML = `Reach >80% Score to Unlock Forecasting (${r2Percent}%)`;
        updateHints(slope, intercept);
    } else {
        conclusionText.innerHTML = `🧐 <strong>High Financial Risk:</strong> Right now, your forecast is totally inaccurate compared to historical data. Adjust the Intercept slider to change the base, and use the Slope slider to adjust your multiplier!`;
        hasFiredConfetti = false;
        btnWorkspaceNext.disabled = true;
        btnWorkspaceNext.style.opacity = '0.5';
        btnWorkspaceNext.style.cursor = 'not-allowed';
        btnWorkspaceNext.innerHTML = `Reach >80% Score to Unlock Forecasting (${r2Percent}%)`;
        updateHints(slope, intercept);
    }
}

const errorLinesPlugin = {
    id: 'errorLines',
    afterDraw: (chart) => {
        if (currentStep !== 3 || currentData.length === 0) return;
        
        const slope = parseFloat(slopeSlider.value);
        const intercept = parseFloat(interceptSlider.value);
        
        const { ctx, scales: { x, y }, chartArea } = chart;
        ctx.save();
        
        const xValues = currentData.map(p => p.x);
        const allXValues = missingPoints.filter(p => p !== null).map(p => p.x).concat(xValues);
        const dataMinX = allXValues.length > 0 ? Math.min(...allXValues) - 5 : x.min;
        const dataMaxX = allXValues.length > 0 ? Math.max(...allXValues) + 5 : x.max;
        const currentTargetX = dataMinX + (dataMaxX - dataMinX) * lineDrawProgress;
        
        // Clip to chart bounds to prevent spilling into padding
        ctx.beginPath();
        ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        ctx.clip();
        
        // Draw the dashed error lines
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        currentData.forEach(point => {
            // Progressive reveal of prediction errors
            if (point.x <= currentTargetX) {
                const predictedY = slope * point.x + intercept;
                const startDX = x.getPixelForValue(point.x);
                const startDY = y.getPixelForValue(point.y);
                const endDY = y.getPixelForValue(predictedY);
                
                ctx.beginPath();
                ctx.moveTo(startDX, startDY);
                ctx.lineTo(startDX, endDY);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // Red dashed
                ctx.stroke();
            }
        });
        
        ctx.restore();
    }
};

function initChart() {
    if (chartInstance) { chartInstance.destroy(); }
    
    const ctx = document.getElementById('regressionChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'True Past Data',
                    data: [],
                    backgroundColor: '#4f46e5',
                    pointRadius: 6,
                    borderWidth: 1,
                    borderColor: '#ffffff',
                    order: 2
                },
                {
                    label: 'AI Forecast Trendline',
                    data: [],
                    type: 'line',
                    borderColor: '#ef4444',
                    borderWidth: 3,
                    fill: false,
                    showLine: true,
                    pointRadius: 0,
                    order: 1
                }
            ]
        },
        plugins: [errorLinesPlugin],
        options: {
            onClick: (e) => {
                const canvasPosition = Chart.helpers.getRelativePosition(e, chartInstance);
                const dataX = chartInstance.scales.x.getValueForPixel(canvasPosition.x);
                const dataY = chartInstance.scales.y.getValueForPixel(canvasPosition.y);
                
                if (currentStep === 2 && missingPoints.length > 0) {
                    let foundMatch = false;
                    const xRange = chartInstance.scales.x.max - chartInstance.scales.x.min;
                    const yRange = chartInstance.scales.y.max - chartInstance.scales.y.min;
                    
                    for (let i = 0; i < missingPoints.length; i++) {
                        const pt = missingPoints[i];
                        if (pt === null) continue;
                        
                        // Tolerance: within 8% of the visible axis range
                        const xDiff = Math.abs(dataX - pt.x) / xRange;
                        const yDiff = Math.abs(dataY - pt.y) / yRange;
                        
                        if (xDiff <= 0.08 && yDiff <= 0.08) {
                            currentData.push(pt);
                            missingPoints[i] = null;
                            plottedMissingCount++;
                            foundMatch = true;
                            
                            
                            const li = document.getElementById(`missing-pt-${i}`);
                            if(li) {
                                li.innerHTML = `✅ Successfully plotted <strong>(X: ${pt.x}, Y: ${pt.y})</strong>`;
                                li.classList.add('success-pulse');
                            }
                            if(plotErrorMsg) plotErrorMsg.classList.add('hidden');
                            
                            updateChart();
                            
                            if (plottedMissingCount >= 3) {
                                btnWorkspaceNext.disabled = false;
                                btnWorkspaceNext.style.opacity = '1';
                                btnWorkspaceNext.style.cursor = 'pointer';
                                btnWorkspaceNext.innerHTML = 'Proceed to Train Model &rarr;';
                            }
                            break; 
                        }
                    }
                    
                    if (!foundMatch && plotErrorMsg) {
                        plotErrorMsg.classList.remove('hidden');
                        setTimeout(() => plotErrorMsg.classList.add('hidden'), 3500);
                    }
                } else if (currentStep === 3) {
                    currentData.push({ x: dataX, y: dataY });
                    hasFiredConfetti = false;
                    updateChart();
                    updateMetricsInstant();
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: {
                legend: { labels: { color: '#1e293b', font: { family: 'Outfit', size: 14 } } },
                tooltip: { enabled: false }
            },
            scales: {
                x: {
                    type: 'linear', position: 'bottom',
                    grid: { color: 'rgba(226, 232, 240, 0.8)' },
                    ticks: { color: '#64748b', font: {family: 'Outfit'} },
                    title: { display: true, text: 'X', color: '#475569', font: {family: 'Outfit', size: 14} }
                },
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.8)' },
                    ticks: { color: '#64748b', font: {family: 'Outfit'} },
                    title: { display: true, text: 'Y', color: '#475569', font: {family: 'Outfit', size: 14} }
                }
            }
        }
    });
}

function updateChart() {
    if (!chartInstance) return;
    const slope = parseFloat(slopeSlider.value) || 0;
    const intercept = parseFloat(interceptSlider.value) || 0;
    
    // Dataset 0: True Data Points
    chartInstance.data.datasets[0].data = currentData;
    
    const xValues = currentData.map(p => p.x);
    const allXValues = missingPoints.filter(p => p !== null).map(p => p.x).concat(xValues);
    
    if(allXValues.length > 0) {
        const minX = Math.min(...allXValues) - 5;
        const maxX = Math.max(...allXValues) + 5;
        
        // Dataset 1: AI Forecast Trendline
        if (currentStep === 3) {
            const currentTargetX = minX + (maxX - minX) * lineDrawProgress;
            chartInstance.data.datasets[1].data = [
                { x: minX, y: slope * minX + intercept },
                { x: currentTargetX, y: slope * currentTargetX + intercept }
            ];
        } else {
            chartInstance.data.datasets[1].data = [];
        }
    } else {
        chartInstance.data.datasets[1].data = [];
    }
    
    chartInstance.update('none'); // Update without internal Chart.js animations to prevent jitter
}

// ==========================================
// STEP 3: FORECASTING
// ==========================================
function setupForecasting() {
    forecastLabelX.innerHTML = `If we set <strong>${currentScenarioMeta.xDesc}</strong> to:`;
    forecastLabelY.innerHTML = `Forecasted <strong>${currentScenarioMeta.yDesc}</strong> output:`;
    forecastOutputY.innerHTML = '--';
    forecastInputX.value = currentData[currentData.length - 1].x; // default to a recent point
}

function runForecast() {
    const slope = parseFloat(slopeSlider.value);
    const intercept = parseFloat(interceptSlider.value);
    const inputX = parseFloat(forecastInputX.value);
    
    const predY = slope * inputX + intercept;
    
    forecastOutputY.innerHTML = predY.toLocaleString(undefined, { maximumFractionDigits: 1 });
    
    if (typeof confetti !== "undefined") {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
newDatasetBtn.addEventListener('click', fetchDataset);
selectX.addEventListener('change', checkVariableAssignment);
selectY.addEventListener('change', checkVariableAssignment);
btnToStep2.addEventListener('click', () => goToStep(2));
btnRestart.addEventListener('click', () => goToStep(1));

if (autoFitBtn) {
    autoFitBtn.addEventListener('click', () => {
        const { slope, intercept } = getOptimalFit();
        const finalSlope = Math.max(parseFloat(slopeSlider.min), Math.min(parseFloat(slopeSlider.max), slope));
        const finalInt = Math.max(parseFloat(interceptSlider.min), Math.min(parseFloat(interceptSlider.max), intercept));
        
        const startSlope = parseFloat(slopeSlider.value);
        const startInt = parseFloat(interceptSlider.value);
        let progress = 0;
        
        autoFitBtn.disabled = true;
        autoFitBtn.style.opacity = '0.5';
        
        const autofitInterval = setInterval(() => {
            progress += 0.04;
            if(progress >= 1) {
                progress = 1;
                clearInterval(autofitInterval);
                autoFitBtn.disabled = false;
                autoFitBtn.style.opacity = '1';
                // Fire confetti on auto-fit success!
                if (typeof confetti !== "undefined") {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
            }
            
            // easeOutQuad
            let easeProgress = progress * (2 - progress);
            
            const currentSlope = startSlope + (finalSlope - startSlope) * easeProgress;
            const currentInt = startInt + (finalInt - startInt) * easeProgress;
            
            slopeSlider.value = currentSlope;
            interceptSlider.value = currentInt;
            slopeValue.textContent = currentSlope.toFixed(1);
            interceptValue.textContent = currentInt.toFixed(0);
            
            updateChart();
            updateMetricsInstant();
        }, 30);
    });
}

slopeSlider.addEventListener('input', (e) => {
    slopeValue.textContent = parseFloat(e.target.value).toFixed(1);
    updateChart();
    updateMetricsInstant();
});
interceptSlider.addEventListener('input', (e) => {
    interceptValue.textContent = e.target.value;
    updateChart();
    updateMetricsInstant();
});

forecastBtn.addEventListener('click', runForecast);

// Initialize App
window.onload = () => {
    goToStep(1);
};
