// Analytics Dashboard Script
// Using Demo/Fake Data for Presentation Purposes
// Later this can be replaced with real database queries

let charts = {};

// Demo Data by Period
const demoData = {
    '7d': {
        categoryChart: {
            labels: ['Child', 'Elderly', 'Woman', 'Man', 'Alzheimer'],
            data: [8, 3, 5, 4, 2],
            colors: ['#4361ee', '#00f2fe', '#38ef7d', '#f72585', '#fca311']
        },
        genderChart: {
            labels: ['Male', 'Female', 'Other'],
            data: [12, 8, 2],
            colors: ['#4361ee', '#f72585', '#fca311']
        },
        missingVsFoundChart: {
            labels: ['Missing Person Reports', 'Found Person Reports'],
            data: [22, 5],
            colors: ['#e63946', '#38ef7d']
        },
        monthlyTrendChart: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            missing_data: [3, 4, 2, 5, 3, 2, 3],
            found_data: [1, 0, 1, 2, 1, 0, 0]
        },
        resolutionRateChart: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            active_data: [18, 19, 21, 18, 20, 22, 22],
            resolved_data: [4, 5, 6, 9, 7, 5, 8]
        },
        matchSuccessChart: {
            labels: ['Confirmed', 'Pending', 'Rejected'],
            data: [3, 2, 0],
            colors: ['#38ef7d', '#fca311', '#e63946']
        }
    },
    '30d': {
        categoryChart: {
            labels: ['Child', 'Elderly', 'Woman', 'Man', 'Alzheimer'],
            data: [34, 18, 22, 16, 10],
            colors: ['#4361ee', '#00f2fe', '#38ef7d', '#f72585', '#fca311']
        },
        genderChart: {
            labels: ['Male', 'Female', 'Other'],
            data: [56, 38, 6],
            colors: ['#4361ee', '#f72585', '#fca311']
        },
        missingVsFoundChart: {
            labels: ['Missing Person Reports', 'Found Person Reports'],
            data: [100, 24],
            colors: ['#e63946', '#38ef7d']
        },
        monthlyTrendChart: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            missing_data: [24, 28, 25, 23],
            found_data: [5, 7, 6, 6]
        },
        resolutionRateChart: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            active_data: [76, 68, 68, 72],
            resolved_data: [24, 32, 32, 28]
        },
        matchSuccessChart: {
            labels: ['Confirmed', 'Pending', 'Rejected'],
            data: [16, 5, 3],
            colors: ['#38ef7d', '#fca311', '#e63946']
        }
    },
    '90d': {
        categoryChart: {
            labels: ['Child', 'Elderly', 'Woman', 'Man', 'Alzheimer'],
            data: [92, 54, 68, 52, 34],
            colors: ['#4361ee', '#00f2fe', '#38ef7d', '#f72585', '#fca311']
        },
        genderChart: {
            labels: ['Male', 'Female', 'Other'],
            data: [158, 118, 24],
            colors: ['#4361ee', '#f72585', '#fca311']
        },
        missingVsFoundChart: {
            labels: ['Missing Person Reports', 'Found Person Reports'],
            data: [300, 68],
            colors: ['#e63946', '#38ef7d']
        },
        monthlyTrendChart: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12', 'Week 13'],
            missing_data: [22, 28, 25, 23, 26, 24, 28, 25, 22, 24, 23, 25, 26],
            found_data: [5, 7, 6, 6, 5, 8, 7, 6, 5, 6, 7, 8, 7]
        },
        resolutionRateChart: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12', 'Week 13'],
            active_data: [278, 273, 273, 276, 275, 275, 273, 276, 279, 277, 277, 276, 273],
            resolved_data: [22, 27, 27, 24, 25, 25, 27, 24, 21, 23, 23, 24, 27]
        },
        matchSuccessChart: {
            labels: ['Confirmed', 'Pending', 'Rejected'],
            data: [48, 12, 8],
            colors: ['#38ef7d', '#fca311', '#e63946']
        }
    },
    '1y': {
        categoryChart: {
            labels: ['Child', 'Elderly', 'Woman', 'Man', 'Alzheimer'],
            data: [380, 220, 280, 210, 140],
            colors: ['#4361ee', '#00f2fe', '#38ef7d', '#f72585', '#fca311']
        },
        genderChart: {
            labels: ['Male', 'Female', 'Other'],
            data: [640, 480, 90],
            colors: ['#4361ee', '#f72585', '#fca311']
        },
        missingVsFoundChart: {
            labels: ['Missing Person Reports', 'Found Person Reports'],
            data: [1210, 285],
            colors: ['#e63946', '#38ef7d']
        },
        monthlyTrendChart: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            missing_data: [92, 105, 98, 108, 95, 112, 115, 102, 95, 108, 115, 112],
            found_data: [22, 24, 18, 28, 24, 32, 35, 28, 24, 28, 30, 32]
        },
        resolutionRateChart: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            active_data: [908, 908, 908, 908, 908, 908, 908, 908, 908, 908, 908, 908],
            resolved_data: [302, 407, 505, 613, 708, 840, 955, 1057, 1152, 1260, 1375, 1487]
        },
        matchSuccessChart: {
            labels: ['Confirmed', 'Pending', 'Rejected'],
            data: [198, 48, 39],
            colors: ['#38ef7d', '#fca311', '#e63946']
        }
    }
};

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    setupPeriodFilter();
});

// Setup period filter listener
function setupPeriodFilter() {
    const periodSelect = document.getElementById('analyticsperiod');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            updateAllCharts(this.value);
        });
    }
}

// Initialize all charts
function initializeCharts() {
    const period = document.getElementById('analyticsperiod')?.value || '30d';
    
    initCategoryChart(period);
    initGenderChart(period);
    initMissingVsFoundChart(period);
    initMatchSuccessChart(period);
    initMonthlyTrendChart(period);
    initResolutionRateChart(period);
}

// Category Distribution Chart
function initCategoryChart(period = '30d') {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (charts.categoryChart) {
        charts.categoryChart.destroy();
    }

    const data = demoData[period].categoryChart;

    charts.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Gender Distribution Chart
function initGenderChart(period = '30d') {
    const ctx = document.getElementById('genderChart');
    if (!ctx) return;

    if (charts.genderChart) {
        charts.genderChart.destroy();
    }

    const data = demoData[period].genderChart;

    charts.genderChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// Missing vs Found Chart
function initMissingVsFoundChart(period = '30d') {
    const ctx = document.getElementById('missingVsFoundChart');
    if (!ctx) return;

    if (charts.missingVsFoundChart) {
        charts.missingVsFoundChart.destroy();
    }

    const data = demoData[period].missingVsFoundChart;

    charts.missingVsFoundChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Reports',
                data: data.data,
                backgroundColor: data.colors,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
}

// Match Success Rate Chart
function initMatchSuccessChart(period = '30d') {
    const ctx = document.getElementById('matchSuccessChart');
    if (!ctx) return;

    if (charts.matchSuccessChart) {
        charts.matchSuccessChart.destroy();
    }

    const data = demoData[period].matchSuccessChart;

    charts.matchSuccessChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (context.parsed) {
                                label += ': ' + context.parsed + ' (' + 
                                        Math.round((context.parsed / context.dataset.data.reduce((a,b) => a+b, 0)) * 100) + '%)';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// Monthly Trend Chart
function initMonthlyTrendChart(period = '30d') {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    if (charts.monthlyTrendChart) {
        charts.monthlyTrendChart.destroy();
    }

    const data = demoData[period].monthlyTrendChart;

    charts.monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Missing Person Reports',
                    data: data.missing_data,
                    borderColor: '#e63946',
                    backgroundColor: 'rgba(230, 57, 70, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#e63946',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Found Person Reports',
                    data: data.found_data,
                    borderColor: '#38ef7d',
                    backgroundColor: 'rgba(56, 239, 125, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#38ef7d',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Resolution Rate Chart
function initResolutionRateChart(period = '30d') {
    const ctx = document.getElementById('resolutionRateChart');
    if (!ctx) return;

    if (charts.resolutionRateChart) {
        charts.resolutionRateChart.destroy();
    }

    const data = demoData[period].resolutionRateChart;

    charts.resolutionRateChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Active Cases',
                    data: data.active_data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Resolved Cases',
                    data: data.resolved_data,
                    borderColor: '#38ef7d',
                    backgroundColor: 'rgba(56, 239, 125, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#38ef7d',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update all charts when period changes
function updateAllCharts(period) {
    initCategoryChart(period);
    initGenderChart(period);
    initMissingVsFoundChart(period);
    initMatchSuccessChart(period);
    initMonthlyTrendChart(period);
    initResolutionRateChart(period);
}
