// ============================================================================
// FILE: js/analytics.js
// Phase 5: Daily, Weekly, & Monthly Department Monitoring Statistics (Chart.js)
// ============================================================================

let deptChartInstance = null;

window.loadAnalytics = async function(period = 'daily') {
    if (!window.activeDepartmentId) return;

    // Update active period button UI
    ['daily', 'weekly', 'monthly'].forEach(p => {
        const btn = document.getElementById(`period-${p}`);
        if (btn) {
            btn.className = p === period
                ? "px-2.5 py-1 text-xs font-semibold rounded-md bg-white text-slate-900 shadow-2xs"
                : "px-2.5 py-1 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900";
        }
    });

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

    renderAnalyticsChart(logs || [], period);
    renderActivityLogsFeed(logs || []);
};

function renderAnalyticsChart(logs, period) {
    const placeholder = document.getElementById('analytics-content-placeholder');
    const chartWrapper = document.getElementById('chart-wrapper');
    const canvas = document.getElementById('deptAnalyticsChart');

    if (!canvas) return;
    if (placeholder) placeholder.classList.add('hidden');
    if (chartWrapper) chartWrapper.classList.remove('hidden');

    const addedCount = logs.filter(l => l.action_type === 'STOCK_ADDED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const deductedCount = logs.filter(l => l.action_type === 'STOCK_DEDUCTED').reduce((sum, l) => sum + (l.quantity_changed || 1), 0);
    const statusChanges = logs.filter(l => l.action_type === 'STATUS_CHANGED').length;
    const damagedCount = logs.filter(l => l.action_type === 'ITEM_DAMAGED').length;

    if (deptChartInstance) {
        deptChartInstance.destroy();
    }

    deptChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['Stocks Added', 'Stocks Deducted', 'Status Updates', 'Damaged Reports'],
            datasets: [{
                label: `${period.toUpperCase()} Department Activity`,
                data: [addedCount, deductedCount, statusChanges, damagedCount],
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#f43f5e'],
                borderRadius: 8
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

function renderActivityLogsFeed(logs) {
    const container = document.getElementById('activity-log-list');
    if (!container) return;

    if (logs.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No activity recorded for this time period yet.</p>`;
        return;
    }

    container.innerHTML = `
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 pt-3 mb-2">Recent Activity Trail</h4>
    ` + logs.slice(0, 15).map(log => {
        const timeStr = new Date(log.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const actorName = log.actor?.full_name || 'User';
        const actorRole = log.actor?.role ? `(${log.actor.role})` : '';

        return `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                <div>
                    <span class="font-semibold text-slate-900">${actorName}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-mono-code">${actorRole}</span>
                    <p class="text-slate-600 mt-0.5">${log.remarks || log.action_type}</p>
                </div>
                <span class="text-[11px] text-slate-400 shrink-0">${timeStr}</span>
            </div>
        `;
    }).join('');
}