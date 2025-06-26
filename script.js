let sipChartInstance = null;
let lumpsumChartInstance = null;
let comparisonChartInstance = null;
let portfolioChartInstance = null;

const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function loadInputs() {
    const inputs = ['initial', 'stepUp', 'years', 'rate', 'lumpsumAmount', 'lumpsumYears', 'lumpsumRate', 'stockPrice', 'eps', 'compareYears', 'compareRate', 'compareSIPInitial', 'compareLumpsumAmount', 'riskTolerance'];
    inputs.forEach(id => {
        const value = localStorage.getItem(id);
        if (value) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
                console.log(`Loaded ${id}: ${value}`);
            }
        }
    });
}

function saveInputs() {
    const inputs = ['initial', 'stepUp', 'years', 'rate', 'lumpsumAmount', 'lumpsumYears', 'lumpsumRate', 'stockPrice', 'eps', 'compareYears', 'compareRate', 'compareSIPInitial', 'compareLumpsumAmount', 'riskTolerance'];
    inputs.forEach(id => {
        const value = document.getElementById(id).value;
        if (value) {
            localStorage.setItem(id, value);
            console.log(`Saved ${id}: ${value}`);
        } else {
            localStorage.removeItem(id);
            console.log(`Cleared ${id}`);
        }
    });
}

function validateInput(input) {
    const id = input.id;
    const value = parseFloat(input.value);
    const errorElement = document.getElementById(`${id}-error`);
    let error = '';

    input.classList.remove('invalid');
    console.log(`Validating ${id}: ${value}`);

    if (['initial', 'years', 'lumpsumAmount', 'lumpsumYears', 'compareYears', 'compareSIPInitial', 'compareLumpsumAmount'].includes(id)) {
        if (isNaN(value) || value <= 0) {
            error = 'Value must be greater than 0.';
            input.classList.add('invalid');
        }
    } else if (['stepUp', 'rate', 'lumpsumRate', 'compareRate'].includes(id)) {
        if (isNaN(value) || value < 0 || value > 100) {
            error = 'Value must be between 0 and 100.';
            input.classList.add('invalid');
        }
    } else if (['stockPrice', 'eps'].includes(id)) {
        if (isNaN(value) || value <= 0) {
            error = 'Value must be greater than 0.';
            input.classList.add('invalid');
        }
    } else if (id === 'riskTolerance') {
        if (!input.value) {
            error = 'Please select a risk tolerance.';
            input.classList.add('invalid');
        }
    }

    errorElement.textContent = error;
    console.log(`Validation ${id}: ${error || 'Valid'}`);
    return !error;
}

function destroyCharts() {
    try {
        if (sipChartInstance) {
            sipChartInstance.destroy();
            sipChartInstance = null;
            console.log('SIP chart destroyed.');
        }
        if (lumpsumChartInstance) {
            lumpsumChartInstance.destroy();
            lumpsumChartInstance = null;
            console.log('Lumpsum chart destroyed.');
        }
        if (comparisonChartInstance) {
            comparisonChartInstance.destroy();
            comparisonChartInstance = null;
            console.log('Comparison chart destroyed.');
        }
        if (portfolioChartInstance) {
            portfolioChartInstance.destroy();
            portfolioChartInstance = null;
            console.log('Portfolio chart destroyed.');
        }
    } catch (error) {
        console.error('Error destroying charts:', error);
    }
}

function resetInputs(section) {
    const inputs = {
        sip: ['initial', 'stepUp', 'years', 'rate'],
        lumpsum: ['lumpsumAmount', 'lumpsumYears', 'lumpsumRate'],
        comparison: ['compareYears', 'compareRate', 'compareSIPInitial', 'compareLumpsumAmount'],
        stock: ['stockPrice', 'eps'],
        portfolio: ['riskTolerance']
    };

    inputs[section].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.value = '';
            input.classList.remove('invalid');
            document.getElementById(`${id}-error`).textContent = '';
            localStorage.removeItem(id);
            console.log(`Reset ${id}`);
        }
    });

    if (section === 'sip') {
        document.getElementById('sipResult').innerHTML = '<p>Please enter valid inputs to see results.</p>';
        destroyCharts();
    } else if (section === 'lumpsum') {
        document.getElementById('lumpsumResult').innerHTML = '<p>Please enter valid inputs to see results.</p>';
        destroyCharts();
    } else if (section === 'comparison') {
        document.getElementById('comparisonResult').innerHTML = '<p>Please enter valid inputs to see comparison.</p>';
        destroyCharts();
    } else if (section === 'stock') {
        document.getElementById('peResult').innerHTML = '';
    } else if (section === 'portfolio') {
        document.getElementById('portfolioResult').innerHTML = '<p>Please select risk tolerance to see allocation.</p>';
        destroyCharts();
    }
}

function resetPortfolioInputs() {
    resetInputs('portfolio');
}

function calculateSIP() {
    console.log('Calculating SIP...');
    saveInputs();

    const initialInvestment = parseFloat(document.getElementById('initial').value) || 0;
    const stepUp = parseFloat(document.getElementById('stepUp').value) / 100 || 0;
    const years = parseInt(document.getElementById('years').value) || 0;
    const annualRate = parseFloat(document.getElementById('rate').value) / 100 || 0;

    const inputsValid = [
        validateInput(document.getElementById('initial')),
        validateInput(document.getElementById('stepUp')),
        validateInput(document.getElementById('years')),
        validateInput(document.getElementById('rate'))
    ].every(v => v);

    if (!inputsValid) {
        document.getElementById('sipResult').innerHTML = '<p style="color: red;">Please correct invalid inputs.</p>';
        destroyCharts();
        console.log('Invalid SIP inputs.');
        return;
    }

    try {
        const monthlyRate = (1 + annualRate) ** (1/12) - 1;
        let totalInvested = 0;
        let totalFV = 0;
        let table = '<table><tr><th>Year</th><th>Monthly Savings (₹)</th><th>Annual Savings (₹)</th><th>Cumulative Invested (₹)</th><th>End Balance (₹)</th></tr>';
        const chartLabels = [];
        const chartInvested = [];
        const chartFuture = [];

        for (let t = 0; t < years; t++) {
            const monthlyInvestment = initialInvestment * (1 + stepUp) ** t;
            const annualInvestment = monthlyInvestment * 12;
            totalInvested += annualInvestment;

            let fvYear = 0;
            for (let m = 0; m < 12; m++) {
                const monthsRemaining = (years - t - 1) * 12 + (12 - m);
                const fvMonth = monthlyInvestment * (1 + monthlyRate) ** monthsRemaining;
                fvYear += fvMonth;
            }
            totalFV += fvYear;

            table += `<tr><td>${t + 1}</td><td>${formatter.format(monthlyInvestment)}</td><td>${formatter.format(annualInvestment)}</td><td>${formatter.format(totalInvested)}</td><td>${formatter.format(fvYear)}</td></tr>`;
            chartLabels.push(`Year ${t + 1}`);
            chartInvested.push(totalInvested);
            chartFuture.push(totalFV);
        }

        table += `<tr><td><strong>Total</strong></td><td>-</td><td>-</td><td><strong>${formatter.format(totalInvested)}</strong></td><td><strong>${formatter.format(totalFV)}</strong></td></tr>`;
        table += '</table>';

        const wealthCreated = totalFV - totalInvested;
        document.getElementById('sipResult').innerHTML = `
            <div class="table-wrapper">${table}</div>
            <p><strong>Total Wealth Created: ${formatter.format(wealthCreated)}</strong></p>
            <p><strong>Total Invested: ${formatter.format(totalInvested)}</strong></p>
            <p><strong>Final Value: ${formatter.format(totalFV)}</strong></p>
        `;

        destroyCharts();
        sipChartInstance = new Chart(document.getElementById('sipChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Cumulative Invested (₹)',
                        data: chartInvested,
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Future Value (₹)',
                        data: chartFuture,
                        borderColor: '#2196F3',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatter.format(context.raw)}`
                        }
                    },
                    legend: {
                        labels: {
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₹)', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    },
                    x: {
                        title: { display: true, text: 'Year', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
        console.log('SIP chart rendered successfully.');
    } catch (error) {
        console.error('Error in calculateSIP:', error);
        document.getElementById('sipResult').innerHTML = '<p style="color: red;">Error calculating SIP. Please check inputs.</p>';
    }
}

function calculateLumpsum() {
    console.log('Calculating Lumpsum...');
    saveInputs();

    const amount = parseFloat(document.getElementById('lumpsumAmount').value) || 0;
    const years = parseInt(document.getElementById('lumpsumYears').value) || 0;
    const annualRate = parseFloat(document.getElementById('lumpsumRate').value) / 100 || 0;

    const inputsValid = [
        validateInput(document.getElementById('lumpsumAmount')),
        validateInput(document.getElementById('lumpsumYears')),
        validateInput(document.getElementById('lumpsumRate'))
    ].every(v => v);

    if (!inputsValid) {
        document.getElementById('lumpsumResult').innerHTML = '<p style="color: red;">Please correct invalid inputs.</p>';
        destroyCharts();
        console.log('Invalid Lumpsum inputs.');
        return;
    }

    try {
        let table = '<table><tr><th>Year</th><th>Invested Amount (₹)</th><th>Future Value (₹)</th><th>Wealth Created (₹)</th></tr>';
        const chartLabels = [];
        const chartInvested = [];
        const chartFuture = [];

        for (let t = 0; t <= years; t++) {
            const fv = amount * (1 + annualRate) ** t;
            const wealthCreated = fv - amount;
            table += `<tr><td>${t}</td><td>${formatter.format(amount)}</td><td>${formatter.format(fv)}</td><td>${formatter.format(wealthCreated)}</td></tr>`;
            chartLabels.push(`Year ${t}`);
            chartInvested.push(amount);
            chartFuture.push(fv);
        }

        table += '</table>';

        const finalFV = amount * (1 + annualRate) ** years;
        const finalWealthCreated = finalFV - amount;
        document.getElementById('lumpsumResult').innerHTML = `
            <div class="table-wrapper">${table}</div>
            <p><strong>Invested Amount: ${formatter.format(amount)}</strong></p>
            <p><strong>Future Value: ${formatter.format(finalFV)}</strong></p>
            <p><strong>Wealth Created: ${formatter.format(finalWealthCreated)}</strong></p>
        `;

        destroyCharts();
        lumpsumChartInstance = new Chart(document.getElementById('lumpsumChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'Invested Amount (₹)',
                        data: chartInvested,
                        borderColor: '#4CAF50',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Future Value (₹)',
                        data: chartFuture,
                        borderColor: '#2196F3',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatter.format(context.raw)}`
                        }
                    },
                    legend: {
                        labels: {
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₹)', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    },
                    x: {
                        title: { display: true, text: 'Year', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
        console.log('Lumpsum chart rendered successfully.');
    } catch (error) {
        console.error('Error in calculateLumpsum:', error);
        document.getElementById('lumpsumResult').innerHTML = '<p style="color: red;">Error calculating lumpsum. Please check inputs.</p>';
    }
}

function calculateComparison() {
    console.log('Calculating Comparison...');
    saveInputs();

    const years = parseInt(document.getElementById('compareYears').value) || 0;
    const annualRate = parseFloat(document.getElementById('compareRate').value) / 100 || 0;
    const sipInitial = parseFloat(document.getElementById('compareSIPInitial').value) || 0;
    const lumpsumAmount = parseFloat(document.getElementById('compareLumpsumAmount').value) || 0;

    const inputsValid = [
        validateInput(document.getElementById('compareYears')),
        validateInput(document.getElementById('compareRate')),
        validateInput(document.getElementById('compareSIPInitial')),
        validateInput(document.getElementById('compareLumpsumAmount'))
    ].every(v => v);

    if (!inputsValid) {
        document.getElementById('comparisonResult').innerHTML = '<p style="color: red;">Please correct invalid inputs.</p>';
        destroyCharts();
        console.log('Invalid Comparison inputs.');
        return;
    }

    try {
        const monthlyRate = (1 + annualRate) ** (1/12) - 1;
        let sipFV = 0;
        let totalSIPInvested = 0;

        for (let t = 0; t < years; t++) {
            const monthlyInvestment = sipInitial;
            totalSIPInvested += monthlyInvestment * 12;
            for (let m = 0; m < 12; m++) {
                const monthsRemaining = (years - t - 1) * 12 + (12 - m);
                const fvMonth = monthlyInvestment * (1 + monthlyRate) ** monthsRemaining;
                sipFV += fvMonth;
            }
        }

        const lumpsumFV = lumpsumAmount * (1 + annualRate) ** years;

        const table = `
            <table>
                <tr><th>Parameter</th><th>SIP</th><th>Lumpsum</th></tr>
                <tr><td>Total Invested</td><td>${formatter.format(totalSIPInvested)}</td><td>${formatter.format(lumpsumAmount)}</td></tr>
                <tr><td>Future Value</td><td>${formatter.format(sipFV)}</td><td>${formatter.format(lumpsumFV)}</td></tr>
                <tr><td>Wealth Created</td><td>${formatter.format(sipFV - totalSIPInvested)}</td><td>${formatter.format(lumpsumFV - lumpsumAmount)}</td></tr>
            </table>
        `;

        document.getElementById('comparisonResult').innerHTML = `<div class="table-wrapper">${table}</div>`;

        const chartLabels = Array.from({ length: years + 1 }, (_, i) => `Year ${i}`);
        const sipData = [];
        const lumpsumData = [];
        let cumulativeSIPFV = 0;

        for (let t = 0; t <= years; t++) {
            if (t === 0) {
                sipData.push(0);
                lumpsumData.push(lumpsumAmount);
                continue;
            }
            let fvYear = 0;
            for (let m = 0; m < 12; m++) {
                const monthsRemaining = (years - t) * 12 + (12 - m);
                if (monthsRemaining >= 0) {
                    const fvMonth = sipInitial * (1 + monthlyRate) ** monthsRemaining;
                    fvYear += fvMonth;
                }
            }
            cumulativeSIPFV += fvYear;
            sipData.push(cumulativeSIPFV);
            lumpsumData.push(lumpsumAmount * (1 + annualRate) ** t);
        }

        destroyCharts();
        comparisonChartInstance = new Chart(document.getElementById('comparisonChart').getContext('2d'), {
            type: 'line',
            data: {
                labels: chartLabels,
                datasets: [
                    {
                        label: 'SIP Future Value (₹)',
                        data: sipData,
                        borderColor: '#2196F3',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Lumpsum Future Value (₹)',
                        data: lumpsumData,
                        borderColor: '#FF9800',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatter.format(context.raw)}`
                        }
                    },
                    legend: {
                        labels: {
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Amount (₹)', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    },
                    x: {
                        title: { display: true, text: 'Year', font: { size: 12 } },
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
        console.log('Comparison chart rendered successfully.');
    } catch (error) {
        console.error('Error in calculateComparison:', error);
        document.getElementById('comparisonResult').innerHTML = '<p style="color: red;">Error calculating comparison. Please check inputs.</p>';
    }
}

function calculatePortfolio() {
    console.log('Calculating Portfolio Diversification...');
    saveInputs();

    const riskTolerance = document.getElementById('riskTolerance').value;

    const inputsValid = [
        validateInput(document.getElementById('riskTolerance'))
    ].every(v => v);

    if (!inputsValid) {
        document.getElementById('portfolioResult').innerHTML = '<p style="color: red;">Please correct invalid inputs.</p>';
        destroyCharts();
        console.log('Invalid Portfolio inputs.');
        return;
    }

    try {
        const allocations = {
            low: { mutualFunds: 40, stocks: 10, etfs: 10, gold: 15, bonds:25 },
            medium: { mutualFunds: 30, stocks: 20, etfs: 20, gold: 10 , bonds:20 },
            high: { mutualFunds: 20, stocks: 30, etfs: 20, gold: 15 , bonds: 15 }
        };

        const allocation = allocations[riskTolerance];

        const table = `
            <table>
                <tr><th>Asset Class</th><th>Percentage</th></tr>
                <tr><td>Mutual Funds</td><td>${allocation.mutualFunds}%</td></tr>
                <tr><td>Stocks</td><td>${allocation.stocks}%</td></tr>
                <tr><td>ETFs</td><td>${allocation.etfs}%</td></tr>
                <tr><td>Gold</td><td>${allocation.gold}%</td></tr>
                <tr><td>Bonds</td><td>${allocation.bonds}%</td></tr>
            </table>
        `;

        document.getElementById('portfolioResult').innerHTML = `
            <div class="table-wrapper">${table}</div>
            <p><strong>Risk Tolerance: ${riskTolerance.charAt(0).toUpperCase() + riskTolerance.slice(1)}</strong></p>
        `;

        destroyCharts();
        portfolioChartInstance = new Chart(document.getElementById('portfolioChart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Mutual Funds', 'Stocks', 'ETFs', 'Gold', 'Bonds'],
                datasets: [{
                    data: [allocation.mutualFunds, allocation.stocks, allocation.etfs, allocation.gold, allocation.bonds],
                    backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#795548'],
                    borderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: context => `${context.label}: ${context.raw}%`
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: { font: { size: 12 } }
                    }
                }
            }
        });
        console.log('Portfolio chart rendered successfully.');
    } catch (error) {
        console.error('Error in calculatePortfolio:', error);
        document.getElementById('portfolioResult').innerHTML = '<p style="color: red;">Error calculating portfolio allocation. Please check inputs.</p>';
    }
}

function exportSIPToCSV() {
    console.log('Exporting SIP to CSV...');
    const initialInvestment = parseFloat(document.getElementById('initial').value) || 0;
    const stepUp = parseFloat(document.getElementById('stepUp').value) / 100 || 0;
    const years = parseInt(document.getElementById('years').value) || 0;
    const annualRate = parseFloat(document.getElementById('rate').value) / 100 || 0;

    if (initialInvestment <= 0 || years <= 0 || annualRate < 0 || stepUp < 0) {
        alert('Please enter valid inputs to export CSV.');
        console.log('Invalid inputs for SIP CSV export.');
        return;
    }

    try {
        const monthlyRate = (1 + annualRate) ** (1/12) - 1;
        let csv = 'Year,Monthly Investment (₹),Annual Investment (₹),Cumulative Invested (₹),Future Value (₹)\n';
        let totalInvested = 0;
        let totalFV = 0;

        for (let t = 0; t < years; t++) {
            const monthlyInvestment = initialInvestment * (1 + stepUp) ** t;
            const annualInvestment = monthlyInvestment * 12;
            totalInvested += annualInvestment;
            let fvYear = 0;
            for (let m = 0; m < 12; m++) {
                const monthsRemaining = (years - t - 1) * 12 + (12 - m);
                const fvMonth = monthlyInvestment * (1 + monthlyRate) ** monthsRemaining;
                fvYear += fvMonth;
            }
            totalFV += fvYear;
            csv += `${t + 1},${monthlyInvestment.toFixed(2)},${annualInvestment.toFixed(2)},${totalInvested.toFixed(2)},${fvYear.toFixed(2)}\n`;
        }

        csv += `Total,-,-,${totalInvested.toFixed(2)},${totalFV.toFixed(2)}\n`;

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sip_calculation.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('SIP CSV exported successfully.');
    } catch (error) {
        console.error('Error exporting SIP CSV:', error);
        alert('Error exporting CSV. Please try again.');
    }
}

function exportLumpsumToCSV() {
    console.log('Exporting Lumpsum to CSV...');
    const amount = parseFloat(document.getElementById('lumpsumAmount').value) || 0;
    const years = parseInt(document.getElementById('lumpsumYears').value) || 0;
    const annualRate = parseFloat(document.getElementById('lumpsumRate').value) / 100 || 0;

    if (amount <= 0 || years <= 0 || annualRate < 0) {
        alert('Please enter valid inputs to export CSV.');
        console.log('Invalid inputs for Lumpsum CSV export.');
        return;
    }

    try {
        let csv = 'Year,Invested Amount (₹),Future Value (₹),Wealth Created (₹)\n';
        for (let t = 0; t <= years; t++) {
            const fv = amount * (1 + annualRate) ** t;
            const wealthCreated = fv - amount;
            csv += `${t},${amount.toFixed(2)},${fv.toFixed(2)},${wealthCreated.toFixed(2)}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lumpsum_calculation.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('Lumpsum CSV exported successfully.');
    } catch (error) {
        console.error('Error exporting Lumpsum CSV:', error);
        alert('Error exporting CSV. Please try again.');
    }
}

function calculatePE() {
    console.log('Calculating P/E Ratio...');
    saveInputs();

    const stockPrice = parseFloat(document.getElementById('stockPrice').value) || 0;
    const eps = parseFloat(document.getElementById('eps').value) || 0;

    const inputsValid = [
        validateInput(document.getElementById('stockPrice')),
        validateInput(document.getElementById('eps'))
    ].every(v => v);

    if (!inputsValid) {
        document.getElementById('peResult').innerHTML = '<p style="color: red;">Please correct invalid inputs.</p>';
        console.log('Invalid Stock Valuation inputs.');
        return;
    }

    try {
        const peRatio = stockPrice / eps;
        document.getElementById('peResult').innerHTML = `<p><strong>P/E Ratio: ${peRatio.toFixed(2)}</strong></p>`;
        console.log('P/E Ratio calculated:', peRatio);
    } catch (error) {
        console.error('Error in calculatePE:', error);
        document.getElementById('peResult').innerHTML = '<p style="color: red;">Error calculating P/E ratio. Please check inputs.</p>';
    }
}

function showPDF(previewId) {
    console.log('Showing PDF:', previewId);
    try {
        const previews = document.querySelectorAll('.pdf-preview');
        previews.forEach(preview => {
            preview.style.display = 'none';
        });
        document.getElementById(previewId).style.display = 'block';
        console.log('PDF displayed successfully:', previewId);
    } catch (error) {
        console.error('Error showing PDF:', error);
    }
}

function toggleMenu() {
    console.log('Toggling menu...');
    try {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('active');
        document.querySelectorAll('.mobile-menu .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        console.log('Menu toggled:', menu.classList.contains('active') ? 'open' : 'closed');
    } catch (error) {
        console.error('Error in toggleMenu:', error);
    }
}

function toggleSubMenu(event) {
    console.log('Toggling submenu...');
    try {
        event.preventDefault();
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                navItem.classList.toggle('active');
                document.querySelectorAll('.mobile-menu .nav-item').forEach(item => {
                    if (item !== navItem) item.classList.remove('active');
                });
                console.log('Submenu toggled for:', navItem);
            }
        }
    } catch (error) {
        console.error('Error in toggleSubMenu:', error);
    }
}

function scrollToSection(sectionId) {
    console.log('Scrolling to section:', sectionId);
    try {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
        document.getElementById('mobileMenu').classList.remove('active');
        document.querySelectorAll('.mobile-menu .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        console.log('Scrolled to:', sectionId);
    } catch (error) {
        console.error('Error in scrollToSection:', error);
    }
}

function backToTop() {
    console.log('Scrolling to top...');
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('Scrolled to top.');
    } catch (error) {
        console.error('Error in backToTop:', error);
    }
}

window.addEventListener('scroll', () => {
    try {
        const backToTopButton = document.querySelector('.back-to-top');
        if (window.scrollY > 100) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in scroll event:', error);
    }
});

window.addEventListener('resize', () => {
    try {
        if (sipChartInstance) sipChartInstance.resize();
        if (lumpsumChartInstance) lumpsumChartInstance.resize();
        if (comparisonChartInstance) comparisonChartInstance.resize();
        if (portfolioChartInstance) portfolioChartInstance.resize();
        console.log('Charts resized.');
    } catch (error) {
        console.error('Error in resize event:', error);
    }
});

// Initialize
try {
    loadInputs();
    console.log('Inputs loaded.');
} catch (error) {
    console.error('Error during initialization:', error);
}