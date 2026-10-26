// ============================================================================
// FILE: js/inventory.js
// Inventory CRUD, Public vs. Private (Teachers Only) Visibility & KPI Metrics
// ============================================================================

window.currentDepartmentStocks = [];
let inventoryRealtimeChannel = null;

document.addEventListener('DOMContentLoaded', () => {
    injectStockModalIntoDOM();
    subscribeToRealtimeInventory();
});

/**
 * Injects the Add / Edit Stock Modal with Audience Visibility Selector
 */
function injectStockModalIntoDOM() {
    const existing = document.getElementById('modal-stock-item');
    if (existing) existing.remove();

    const modalHTML = `
    <div id="modal-stock-item" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center p-4 no-print">
        <div class="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl fade-in">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                    <h3 id="stock-modal-title" class="text-base font-bold text-slate-900">Add Inventory Stock</h3>
                    <p class="text-xs text-slate-500">Record equipment, consumables, or tools for this facility.</p>
                </div>
                <button type="button" onclick="closeModal('modal-stock-item')" class="text-slate-400 hover:text-slate-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <form id="form-stock-item" class="space-y-4">
                <input type="hidden" id="stock-item-id">

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Item Name / Description *</label>
                    <input type="text" id="stock-item-name" required placeholder="e.g., Desktop PC, RJ45 Connectors, First Aid Kit"
                        class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                        <select id="stock-item-category" required
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                            <option value="Equipment">Equipment</option>
                            <option value="Consumable">Consumable</option>
                            <option value="Tool">Tool</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Measurement Unit *</label>
                        <select id="stock-item-unit" required
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                            <option value="units">units</option>
                            <option value="pcs">pcs</option>
                            <option value="sets">sets</option>
                            <option value="boxes">boxes</option>
                            <option value="packs">packs</option>
                            <option value="rolls">rolls</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Current Quantity *</label>
                        <input type="number" id="stock-item-qty" required min="0" value="1"
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none font-mono-code">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Low-Stock Alert Threshold *</label>
                        <input type="number" id="stock-item-threshold" required min="1" value="5"
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none font-mono-code">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Physical Condition</label>
                        <select id="stock-item-condition"
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                            <option value="Auto">Auto-Detect</option>
                            <option value="Good">Good / Serviceable</option>
                            <option value="Damaged">Damaged / Unusable</option>
                        </select>
                    </div>

                    <!-- NEW: AUDIENCE VISIBILITY (PUBLIC VS TEACHERS ONLY) -->
                    <div id="stock-visibility-wrapper">
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Stock Visibility *</label>
                        <select id="stock-item-visibility"
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                            <option value="public">Public (Students & Teachers)</option>
                            <option value="teachers_only">Private (Teachers Only)</option>
                        </select>
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick="closeModal('modal-stock-item')" class="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                        Cancel
                    </button>
                    <button type="submit" id="btn-save-stock" class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition">
                        Save Stock Item
                    </button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('form-stock-item').addEventListener('submit', handleSaveStockItem);
    if (window.lucide) lucide.createIcons();
}

function computeConditionStatus(quantity, minThreshold, selectedCondition) {
    if (selectedCondition === 'Damaged') return 'Damaged';
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= minThreshold) return 'Low Stock';
    return 'Good';
}

function getConditionBadge(status) {
    const styles = {
        'Good': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
        'Low Stock': 'bg-amber-500/10 text-amber-600 border-amber-500/25',
        'Out of Stock': 'bg-rose-500/10 text-rose-600 border-rose-500/25',
        'Damaged': 'bg-purple-500/10 text-purple-600 border-purple-500/25'
    };
    const cls = styles[status] || styles['Good'];
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}">${status}</span>`;
}

/**
 * Returns only the stocks the current logged-in role is allowed to see
 * - Teachers see ALL stocks ('public' + 'teachers_only')
 * - Students only see 'public' stocks
 */
function getVisibleStocksForCurrentUser(allStocks) {
    const isTeacher = window.currentUserProfile?.role === 'teacher';
    if (isTeacher) return allStocks;
    return allStocks.filter(item => (item.visibility || 'public') !== 'teachers_only');
}

function updateInventoryKPICards(stocks) {
    const visibleStocks = getVisibleStocksForCurrentUser(stocks);

    const totalItemsEl = document.getElementById('kpi-total-items');
    const totalUnitsEl = document.getElementById('kpi-total-units');
    const lowStockEl = document.getElementById('kpi-low-stock');
    const damagedEl = document.getElementById('kpi-damaged-stock');

    if (!totalItemsEl) return;

    totalItemsEl.textContent = visibleStocks.length;
    totalUnitsEl.textContent = visibleStocks.reduce((sum, item) => sum + (item.quantity || 0), 0);
    lowStockEl.textContent = visibleStocks.filter(item => item.condition_status === 'Low Stock' || item.condition_status === 'Out of Stock').length;
    damagedEl.textContent = visibleStocks.filter(item => item.condition_status === 'Damaged').length;
}

window.loadDepartmentInventory = async function(departmentId) {
    if (!departmentId) return;

    const { data, error } = await window.supabaseClient
        .from('inventory_stocks')
        .select(`
            *,
            updater:profiles!inventory_stocks_last_updated_by_fkey(full_name, role)
        `)
        .eq('department_id', departmentId)
        .order('item_name', { ascending: true });

    if (error) {
        console.error('Error loading inventory:', error);
        return;
    }

    window.currentDepartmentStocks = data || [];
    updateInventoryKPICards(window.currentDepartmentStocks);
    renderInventoryTable();
};

/**
 * Renders the inventory table (hiding Private Teacher-Only items from students)
 */
window.renderInventoryTable = function() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const searchQuery = (document.getElementById('stock-search-input')?.value || '').toLowerCase().trim();
    const canEdit = window.activeDeptPermissions?.canEditStocks === true;
    const isTeacher = window.currentUserProfile?.role === 'teacher';
    const isCoordinator = window.activeDeptPermissions?.isCoordinator === true;

    const roleFilteredStocks = getVisibleStocksForCurrentUser(window.currentDepartmentStocks);

    const filtered = roleFilteredStocks.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery) ||
        item.condition_status.toLowerCase().includes(searchQuery)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-xs text-slate-400">
                    ${roleFilteredStocks.length === 0 
                        ? 'No visible stock items recorded in this facility yet.' 
                        : 'No items match your filter.'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const displayUnit = /^\d+$/.test(item.unit) ? 'units' : (item.unit || 'pcs');
        const updatedTime = item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const updaterName = item.updater?.full_name || 'System';
        const updaterRole = item.updater?.role ? item.updater.role.toUpperCase() : '';
        const isPrivate = item.visibility === 'teachers_only';

        // Visibility Badge (Teachers can see & click to toggle; Students see Public pill)
        const visibilityBadge = isTeacher ? `
            <button type="button" ${isCoordinator ? `onclick="toggleStockVisibility('${item.id}', '${isPrivate ? 'public' : 'teachers_only'}')"` : ''}
                title="${isCoordinator ? 'Click to switch Public / Private visibility' : 'Visibility setting'}"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
                    isPrivate
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/25 hover:bg-amber-500/20'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400'
                }">
                <i data-lucide="${isPrivate ? 'lock' : 'globe'}" class="w-2.5 h-2.5"></i>
                <span>${isPrivate ? 'Teachers Only' : 'Public'}</span>
            </button>
        ` : '';

        return `
            <tr class="hover:bg-slate-50/90 transition">
                <td class="py-3.5 px-5">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-slate-900 text-xs sm:text-sm">${item.item_name}</p>
                        ${visibilityBadge}
                    </div>
                    <span class="text-[11px] text-slate-400 block mt-0.5">Threshold Alert: ${item.min_threshold} ${displayUnit}</span>
                </td>
                <td class="py-3.5 px-4">
                    <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">${item.category}</span>
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-2">
                        ${canEdit ? `
                            <button onclick="quickAdjustStock('${item.id}', -1)" title="Deduct 1"
                                class="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center no-print shadow-2xs">-</button>
                        ` : ''}
                        <div class="min-w-[70px]">
                            <span class="font-mono-code font-bold text-sm text-slate-900">${item.quantity}</span>
                            <span class="text-xs text-slate-500 ml-1">${displayUnit}</span>
                        </div>
                        ${canEdit ? `
                            <button onclick="quickAdjustStock('${item.id}', 1)" title="Add 1"
                                class="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center no-print shadow-2xs">+</button>
                        ` : ''}
                    </div>
                </td>
                <td class="py-3.5 px-4">
                    ${getConditionBadge(item.condition_status)}
                </td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-1.5">
                        <span class="font-semibold text-slate-800">${updaterName}</span>
                        ${updaterRole ? `<span class="px-1.5 py-0.2 rounded bg-slate-100 text-[9px] font-mono-code text-slate-500">${updaterRole}</span>` : ''}
                    </div>
                    <span class="text-[11px] text-slate-400 block mt-0.5">${updatedTime}</span>
                </td>
                <td class="py-3.5 px-5 text-right no-print">
                    ${canEdit ? `
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="openStockModal('${item.id}')" title="Edit Item"
                                class="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-900 text-slate-600 hover:text-slate-900 transition shadow-2xs">
                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="deleteStockItem('${item.id}', '${item.item_name.replace(/'/g, "\\'")}')" title="Delete Item"
                                class="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition shadow-2xs">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    ` : `<span class="px-2 py-1 rounded bg-slate-50 text-[11px] font-medium text-slate-400">Read-Only</span>`}
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
};

/**
 * One-click toggle between Public (Students & Teachers) and Private (Teachers Only)
 */
window.toggleStockVisibility = async function(itemId, newVisibility) {
    const { error } = await window.supabaseClient
        .from('inventory_stocks')
        .update({
            visibility: newVisibility,
            last_updated_by: window.currentUserProfile.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

    if (error) {
        Swal.fire(
            'Database Column Needed',
            'Please run the SQL snippet in Supabase SQL Editor to add the "visibility" column to inventory_stocks.',
            'info'
        );
        return;
    }

    await loadDepartmentInventory(window.activeDepartmentId);
};

window.openStockModal = function(itemId = null) {
    injectStockModalIntoDOM();
    const form = document.getElementById('form-stock-item');
    form.reset();

    // Only Teachers can mark an item as "Teachers Only"
    const visWrapper = document.getElementById('stock-visibility-wrapper');
    if (visWrapper) {
        if (window.currentUserProfile?.role === 'teacher') {
            visWrapper.classList.remove('hidden');
        } else {
            visWrapper.classList.add('hidden');
        }
    }

    if (itemId) {
        const item = window.currentDepartmentStocks.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('stock-modal-title').textContent = 'Edit Inventory Stock';
        document.getElementById('stock-item-id').value = item.id;
        document.getElementById('stock-item-name').value = item.item_name;
        document.getElementById('stock-item-category').value = item.category;
        document.getElementById('stock-item-unit').value = /^\d+$/.test(item.unit) ? 'units' : (item.unit || 'units');
        document.getElementById('stock-item-qty').value = item.quantity;
        document.getElementById('stock-item-threshold').value = item.min_threshold;
        document.getElementById('stock-item-condition').value = item.condition_status === 'Damaged' ? 'Damaged' : 'Auto';
        document.getElementById('stock-item-visibility').value = item.visibility || 'public';
    } else {
        document.getElementById('stock-modal-title').textContent = 'Add Inventory Stock';
        document.getElementById('stock-item-id').value = '';
        document.getElementById('stock-item-condition').value = 'Auto';
        document.getElementById('stock-item-visibility').value = 'public';
    }

    openModal('modal-stock-item');
};

async function handleSaveStockItem(e) {
    e.preventDefault();
    if (!window.activeDepartmentId || !window.currentUserProfile) return;

    const itemId = document.getElementById('stock-item-id').value;
    const itemName = document.getElementById('stock-item-name').value.trim();
    const category = document.getElementById('stock-item-category').value;
    const unit = document.getElementById('stock-item-unit').value || 'units';
    const quantity = parseInt(document.getElementById('stock-item-qty').value, 10) || 0;
    const minThreshold = parseInt(document.getElementById('stock-item-threshold').value, 10) || 5;
    const selectedCondition = document.getElementById('stock-item-condition').value;
    const visibility = document.getElementById('stock-item-visibility')?.value || 'public';

    const conditionStatus = computeConditionStatus(quantity, minThreshold, selectedCondition);

    const payload = {
        department_id: window.activeDepartmentId,
        item_name: itemName,
        category: category,
        unit: unit,
        quantity: quantity,
        min_threshold: minThreshold,
        condition_status: conditionStatus,
        visibility: visibility,
        last_updated_by: window.currentUserProfile.id,
        updated_at: new Date().toISOString()
    };

    try {
        if (itemId) {
            const oldItem = window.currentDepartmentStocks.find(i => i.id === itemId);
            const qtyDiff = oldItem ? (quantity - oldItem.quantity) : 0;

            const { error } = await window.supabaseClient
                .from('inventory_stocks')
                .update(payload)
                .eq('id', itemId);

            if (error) throw error;

            let actionType = 'STOCK_EDITED';
            if (conditionStatus === 'Damaged' && oldItem?.condition_status !== 'Damaged') {
                actionType = 'ITEM_DAMAGED';
            } else if (qtyDiff > 0) {
                actionType = 'STOCK_ADDED';
            } else if (qtyDiff < 0) {
                actionType = 'STOCK_DEDUCTED';
            }

            await window.supabaseClient.from('activity_logs').insert([{
                department_id: window.activeDepartmentId,
                user_id: window.currentUserProfile.id,
                action_type: actionType,
                item_id: itemId,
                item_name_snapshot: itemName,
                quantity_changed: Math.abs(qtyDiff),
                remarks: `Updated ${itemName} (Qty: ${quantity} ${unit}, Status: ${conditionStatus}, Visibility: ${visibility === 'teachers_only' ? 'Teachers Only' : 'Public'})`
            }]);

        } else {
            const { data: inserted, error } = await window.supabaseClient
                .from('inventory_stocks')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            await window.supabaseClient.from('activity_logs').insert([{
                department_id: window.activeDepartmentId,
                user_id: window.currentUserProfile.id,
                action_type: conditionStatus === 'Damaged' ? 'ITEM_DAMAGED' : 'STOCK_ADDED',
                item_id: inserted.id,
                item_name_snapshot: itemName,
                quantity_changed: quantity,
                remarks: `Added new stock: ${itemName} (${quantity} ${unit}, ${visibility === 'teachers_only' ? 'Teachers Only' : 'Public'})`
            }]);
        }

        closeModal('modal-stock-item');
        await loadDepartmentInventory(window.activeDepartmentId);
        Swal.fire({ icon: 'success', title: 'Inventory Saved', timer: 1000, showConfirmButton: false });

    } catch (err) {
        Swal.fire('Error Saving Stock', err.message, 'error');
    }
}

window.quickAdjustStock = async function(itemId, delta) {
    const item = window.currentDepartmentStocks.find(i => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 0) return;

    const newCondition = computeConditionStatus(
        newQty,
        item.min_threshold,
        item.condition_status === 'Damaged' ? 'Damaged' : 'Auto'
    );

    const { error } = await window.supabaseClient
        .from('inventory_stocks')
        .update({
            quantity: newQty,
            condition_status: newCondition,
            last_updated_by: window.currentUserProfile.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

    if (error) {
        Swal.fire('Update Failed', error.message, 'error');
        return;
    }

    await window.supabaseClient.from('activity_logs').insert([{
        department_id: window.activeDepartmentId,
        user_id: window.currentUserProfile.id,
        action_type: delta > 0 ? 'STOCK_ADDED' : 'STOCK_DEDUCTED',
        item_id: item.id,
        item_name_snapshot: item.item_name,
        quantity_changed: Math.abs(delta),
        remarks: `${delta > 0 ? 'Added' : 'Deducted'} ${Math.abs(delta)} ${item.unit} of ${item.item_name} (Now: ${newQty})`
    }]);

    await loadDepartmentInventory(window.activeDepartmentId);
};

window.deleteStockItem = async function(itemId, itemName) {
    const confirm = await Swal.fire({
        title: `Delete ${itemName}?`,
        text: 'This item will be permanently removed from the facility inventory.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'Yes, delete it'
    });

    if (!confirm.isConfirmed) return;

    const { error } = await window.supabaseClient
        .from('inventory_stocks')
        .delete()
        .eq('id', itemId);

    if (error) {
        Swal.fire('Delete Failed', error.message, 'error');
        return;
    }

    await loadDepartmentInventory(window.activeDepartmentId);
};

function subscribeToRealtimeInventory() {
    if (inventoryRealtimeChannel) return;
    inventoryRealtimeChannel = window.supabaseClient
        .channel('public:inventory_stocks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_stocks' }, () => {
            if (window.activeDepartmentId) {
                loadDepartmentInventory(window.activeDepartmentId);
            }
        })
        .subscribe();
}