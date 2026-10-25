// ============================================================================
// FILE: js/analytics.js
// Phase 5: Daily, Weekly & Monthly Statistics, Dual Charts, CSV Export & Print
// ============================================================================

let deptActivityChart = null;
let deptConditionChart = null;
window.currentAnalyticsPeriod = 'daily';

document.addEventListener('DOMContentLoaded', () => {
    enhanceAnalyticsLayout();
});

/**
 * Enhances the Analytics Tab in dashboard.html with KPI counters, a second chart
 * for stock conditions, a CSV Export button, and a formal Print Report header.
 */
function enhanceAnalyticsLayout() {
    const analyticsTab = document.getElementById('view-analytics-tab');
    if (!analyticsTab || document.getElementById('analytics-enhanced-grid')) return;

    // 1. Add Export CSV button next to Print Report button
    const printBtn = analyticsTab.querySelector('button[onclick="window.print()"]');
    if (printBtn && !document.getElementById('btn-export-csv')) {
        const csvBtnHTML = `
            <button id="btn-export-csv" onclick="exportDepartmentInventoryCSV()" 
                class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                <span>Export CSV</span>
            </button>
        `;
        printBtn.insertAdjacentHTML('beforebegin', csvBtnHTML);
    }

    // 2. Inject Formal Print-Only Header + Period Summary Cards + Dual Chart Grid
    const chartWrapper = document.getElementById('chart-wrapper');
    if (chartWrapper) {
        const enhancedHTML = `
            <!-- Formal Print Header (Only visible when printing PDF/Paper) -->
            <div id="print-report-header" class="hidden print:block pb-4 mb-4 border-b-2 border-slate-900">
                <p class="text-[11px] font-bold uppercase tracking-widest text-slate-500">Republic of the Philippines • Department of Education</p>
                <h1 class="text-lg font-bold text-slate-900">Luis Y. Ferrer Jr. Senior High School</h1>
                <p class="text-xs text-slate-600">Official Department Inventory & Status Monitoring Report</p>
                <div class="mt-3 grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div><span class="text-slate-400 block text-[10px] uppercase">Department</span><strong id="print-dept-name">---</strong></div>
                    <div><span class="text-slate-400 block text-[10px] uppercase">Coordinator</span><strong id="print-coord-name">---</strong></div>
                    <div><span class="text-slate-400 block text-[10px] uppercase">Date Generated</span><strong id="print-date-now">---</strong></div>
                </div>
            </div>

            <!-- Period Summary KPI Strip -->
            <div id="analytics-enhanced-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div class="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Units Added</span>
                    <p id="stat-units-added" class="text-xl font-bold text-emerald-900 font-mono-code mt-0.5">0</p>
                </div>
                <div class="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Units Deducted</span>
                    <p id="stat-units-deducted" class="text-xl font-bold text-amber-900 font-mono-code mt-0.5">0</p>
                </div>
                <div class="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Status Changes</span>
                    <p id="stat-status-changes" class="text-xl font-bold text-blue-900 font-mono-code mt-0.5">0</p>
                </div>
                <div class="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Damaged Reports</span>
                    <p id="stat-damaged-reports" class="text-xl font-bold text-rose-900 font-mono-code mt-0.5">0</p>
                </div>
            </div>

            <!-- Dual Chart Row: Activity Bar Chart + Condition Doughnut Chart -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div class="lg:col-span-8 p-4 rounded-xl border border-slate-200/80 bg-slate-50/40">
                    <div class="flex items-center justify-between mb-3">
                        <h4 id="activity-chart-title" class="text-xs font-bold uppercase tracking-wider text-slate-700">Daily Activity Movement</h4>
                        <span class="text-[11px] text-slate-400">Stock & Status Events</span>
                    </div>
                    <div class="h-60">
                        <canvas id="deptAnalyticsChart"></canvas>
                    </div>
                </div>

                <div class="lg:col-span-4 p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex flex-col justify-between">
                    <div class="mb-3">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700">Current Stock Health</h4>
                        <p class="text-[11px] text-slate-400">Distribution by item condition</p>
                    </div>
                    <div class="h-52 flex items-center justify-center">
                        <canvas id="deptConditionChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        chartWrapper.outerHTML = enhancedHTML;
    }

    if (window.lucide) lucide.createIcons();
}

/**
 * Loads and computes Daily, Weekly, or Monthly statistics for the active department
 */
window.loadAnalytics = async function(period = 'daily') {
    if (!window.activeDepartmentId) return;
    window.currentAnalyticsPeriod = period;
    enhanceAnalyticsLayout();

    // Update active period button UI
    ['daily', 'weekly', 'monthly'].forEach(p => {
        const btn = document.getElementById(`period-${p}`);
        if (btn) {
            btn.className = p === period
                ? "px-3 py-1 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-2xs"
                : "px-3 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900";
        }
    });

    // Populate Print Header Info
    const dept = (window.allDepartments || []).find(d => d.id === window.activeDepartmentId);
    if (dept) {
        const pDept = document.getElementById('print-dept-name');
        const pCoord = document.getElementById('print-coord-name');
        const pDate = document.getElementById('print-date-now');
        if (pDept) pDept.textContent = `${dept.dept_name} (${dept.status})`;
        if (pCoord) pCoord.textContent = dept.primary_coord?.full_name || 'Assigned Coordinator';
        if (pDate) pDate.textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
    }

    const { data: logs, error } = await window.supabaseClient
        .from('activity_logs')
        .select(`
            *,
            actor:profiles!activity_logs_user_id_fkey(full_name, role)
        `)
        .eq('department_id', window.activeDepartmentId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading analytics:', error);
        return;
    }

    const safeLogs = logs || [];
    updatePeriodSummaryCards(safeLogs, period);
    renderAnalyticsChart(safeLogs, period);
    renderConditionDoughnutChart(window.currentDepartmentStocks || []);
    renderActivityLogsFeed(safeLogs);
};

/**
 * Updates the 4 Period KPI counters inside the Analytics tab
 */
function updatePeriodSummaryCards(logs, period) {
    const addedCount = logs.filter(l => l.action_type === 'STOCK_ADDED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const deductedCount = logs.filter(l => l.action_type === 'STOCK_DEDUCTED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const statusChanges = logs.filter(l => l.action_type === 'STATUS_CHANGED').length;
    const damagedCount = logs.filter(l => l.action_type === 'ITEM_DAMAGED').length;

    const elAdded = document.getElementById('stat-units-added');
    const elDeducted = document.getElementById('stat-units-deducted');
    const elStatus = document.getElementById('stat-status-changes');
    const elDamaged = document.getElementById('stat-damaged-reports');
    const elTitle = document.getElementById('activity-chart-title');

    if (elAdded) elAdded.textContent = addedCount;
    if (elDeducted) elDeducted.textContent = deductedCount;
    if (elStatus) elStatus.textContent = statusChanges;
    if (elDamaged) elDamaged.textContent = damagedCount;

    const labelMap = {
        daily: 'Daily Activity Movement (Today)',
        weekly: 'Weekly Activity Movement (Last 7 Days)',
        monthly: 'Monthly Activity Movement (Last 30 Days)'
    };
    if (elTitle) elTitle.textContent = labelMap[period] || 'Activity Movement';
}

/**
 * Renders the Bar Chart for Daily, Weekly, or Monthly Activity
 */
function renderAnalyticsChart(logs, period) {
    const canvas = document.getElementById('deptAnalyticsChart');
    if (!canvas) return;

    const addedCount = logs.filter(l => l.action_type === 'STOCK_ADDED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const deductedCount = logs.filter(l => l.action_type === 'STOCK_DEDUCTED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const statusChanges = logs.filter(l => l.action_type === 'STATUS_CHANGED').length;
    const damagedCount = logs.filter(l => l.action_type === 'ITEM_DAMAGED').length;

    if (deptActivityChart) {
        deptActivityChart.destroy();
    }

    deptActivityChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Units Added', 'Units Deducted', 'Status Broadcasts', 'Damaged Reports'],
            datasets: [{
                label: `${period.toUpperCase()} Count`,
                data: [addedCount, deductedCount, statusChanges, damagedCount],
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e'],
                borderRadius: 8,
                barThickness: 36
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/**
 * Renders the Doughnut Chart showing current Stock Health breakdown
 */
function renderConditionDoughnutChart(stocks) {
    const canvas = document.getElementById('deptConditionChart');
    if (!canvas) return;

    const good = stocks.filter(s => s.condition_status === 'Good').length;
    const low = stocks.filter(s => s.condition_status === 'Low Stock').length;
    const out = stocks.filter(s => s.condition_status === 'Out of Stock').length;
    const damaged = stocks.filter(s => s.condition_status === 'Damaged').length;

    if (deptConditionChart) {
        deptConditionChart.destroy();
    }

    const total = good + low + out + damaged;

    deptConditionChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Good', 'Low Stock', 'Out of Stock', 'Damaged'],
            datasets: [{
                data: total > 0 ? [good, low, out, damaged] : [1, 0, 0, 0],
                backgroundColor: total > 0 ? ['#10b981', '#f59e0b', '#f43f5e', '#a855f7'] : ['#e2e8f0'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * Renders the timestamped audit trail of recent department actions
 */
function renderActivityLogsFeed(logs) {
    const container = document.getElementById('activity-log-list');
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">No activity recorded for this time period yet.</p>`;
        return;
    }

    const badgeColors = {
        'STOCK_ADDED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'STOCK_DEDUCTED': 'bg-amber-50 text-amber-700 border-amber-200',
        'STATUS_CHANGED': 'bg-blue-50 text-blue-700 border-blue-200',
        'ITEM_DAMAGED': 'bg-rose-50 text-rose-700 border-rose-200',
        'STOCK_EDITED': 'bg-slate-100 text-slate-700 border-slate-200',
        'EDITOR_ADDED': 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };

    container.innerHTML = `
        <div class="flex items-center justify-between pt-3 mb-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Timestamped Audit Trail</h4>
            <span class="text-[11px] text-slate-400">Showing latest ${Math.min(logs.length, 20)} events</span>
        </div>
    ` + logs.slice(0, 20).map(log => {
        const timeStr = new Date(log.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const actorName = log.actor?.full_name || 'System User';
        const actorRole = log.actor?.role ? log.actor.role.toUpperCase() : '';
        const actionBadge = badgeColors[log.action_type] || badgeColors['STOCK_EDITED'];

        return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
                <div class="space-y-0.5">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold border ${actionBadge}">
                            ${log.action_type.replace('_', ' ')}
                        </span>
                        <span class="font-bold text-slate-900">${actorName}</span>
                        ${actorRole ? `<span class="text-[10px] text-slate-400 font-mono-code">(${actorRole})</span>` : ''}
                    </div>
                    <p class="text-slate-600 pl-0.5">${log.remarks || log.action_type}</p>
                </div>
                <span class="text-[11px] text-slate-400 font-mono-code shrink-0">${timeStr}</span>
            </div>
        `;
    }).join('');
}

/**
 * Exports the current department's inventory stocks to a clean CSV file for Excel
 */
window.exportDepartmentInventoryCSV = function() {
    const stocks = window.currentDepartmentStocks || [];
    const dept = (window.allDepartments || []).find(d => d.id === window.activeDepartmentId);
    const deptName = dept ? dept.dept_name.replace(/[^a-z0-9]/gi, '_') : 'Department';

    if (stocks.length === 0) {
        Swal.fire('No Data to Export', 'This department currently has no inventory items to export.', 'info');
        return;
    }

    const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Min Threshold', 'Condition Status', 'Last Updated By', 'Last Updated At'];
    const rows = stocks.map(item => [
        `"${(item.item_name || '').replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        item.quantity || 0,
        `"${/^\d+$/.test(item.unit) ? 'units' : (item.unit || 'units')}"`,
        item.min_threshold || 5,
        `"${item.condition_status || 'Good'}"`,
        `"${(item.updater?.full_name || 'System').replace(/"/g, '""')}"`,
        `"${item.updated_at ? new Date(item.updated_at).toLocaleString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${deptName}_Inventory_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};