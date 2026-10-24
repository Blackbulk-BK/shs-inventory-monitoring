// ============================================================================
// FILE: js/inventory.js
// Phase 4: Inventory Stock CRUD, Quick +/- Adjustments, Realtime Sync & Logging
// ============================================================================

window.currentDepartmentStocks = [];
let inventoryRealtimeChannel = null;

document.addEventListener('DOMContentLoaded', () => {
    injectStockModalIntoDOM();
    subscribeToRealtimeInventory();
});

/**
 * Dynamically injects the Add / Edit Stock Modal into dashboard.html
 */
function injectStockModalIntoDOM() {
    if (document.getElementById('modal-stock-item')) return;

    const modalHTML = `
    <div id="modal-stock-item" class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs hidden items-center justify-center p-4 no-print">
        <div class="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl fade-in">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                    <h3 id="stock-modal-title" class="text-base font-bold text-slate-900">Add Inventory Stock</h3>
                    <p class="text-xs text-slate-500">Record equipment, consumables, or tools for this department.</p>
                </div>
                <button type="button" onclick="closeModal('modal-stock-item')" class="text-slate-400 hover:text-slate-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <form id="form-stock-item" class="space-y-4">
                <input type="hidden" id="stock-item-id">

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Item Name / Description *</label>
                    <input type="text" id="stock-item-name" required placeholder="e.g., RJ45 Connectors, Arduino Uno, HDMI Cable"
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
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                        <input type="text" id="stock-item-unit" required value="pcs" placeholder="pcs, boxes, sets"
                            class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
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

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Physical Condition</label>
                    <select id="stock-item-condition"
                        class="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                        <option value="Auto">Auto-Detect (Based on Quantity & Threshold)</option>
                        <option value="Good">Good / Serviceable</option>
                        <option value="Damaged">Damaged / Needs Repair</option>
                    </select>
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

/**
 * Evaluates condition status automatically unless marked 'Damaged'
 */
function computeConditionStatus(quantity, minThreshold, selectedCondition) {
    if (selectedCondition === 'Damaged') return 'Damaged';
    if (quantity <= 0) return 'Out of Stock';
    if (quantity <= minThreshold) return 'Low Stock';
    return 'Good';
}

/**
 * Returns badge styling for stock condition
 */
function getConditionBadge(status) {
    const styles = {
        'Good': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200',
        'Out of Stock': 'bg-rose-50 text-rose-700 border-rose-200',
        'Damaged': 'bg-purple-50 text-purple-700 border-purple-200'
    };
    const cls = styles[status] || styles['Good'];
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cls}">${status}</span>`;
}

/**
 * Loads all inventory stocks for the active department
 */
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
    renderInventoryTable();
};

/**
 * Renders the inventory stocks table with search filtering and role-based action buttons
 */
window.renderInventoryTable = function() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const searchQuery = (document.getElementById('stock-search-input')?.value || '').toLowerCase().trim();
    const canEdit = window.activeDeptPermissions?.canEditStocks === true;

    const filtered = window.currentDepartmentStocks.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery) ||
        item.category.toLowerCase().includes(searchQuery) ||
        item.condition_status.toLowerCase().includes(searchQuery)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 text-center text-xs text-slate-400">
                    ${window.currentDepartmentStocks.length === 0 
                        ? 'No stock items recorded in this department yet. Click "+ Add Stock" to begin.' 
                        : 'No items match your filter.'}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const updatedTime = item.updated_at ? new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
        const updaterName = item.updater?.full_name || 'System';
        const updaterRole = item.updater?.role ? `(${item.updater.role})` : '';

        return `
            <tr class="hover:bg-slate-50/80 transition">
                <td class="py-3 px-3 font-semibold text-slate-900">
                    ${item.item_name}
                    <span class="block text-[10px] font-normal text-slate-400">Min. Threshold: ${item.min_threshold} ${item.unit}</span>
                </td>
                <td class="py-3 px-3 text-slate-600">
                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">${item.category}</span>
                </td>
                <td class="py-3 px-3">
                    <div class="flex items-center gap-2">
                        ${canEdit ? `
                            <button onclick="quickAdjustStock('${item.id}', -1)" title="Deduct 1"
                                class="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center no-print">-</button>
                        ` : ''}
                        <span class="font-mono-code font-bold text-sm text-slate-900">${item.quantity} <span class="text-xs font-normal text-slate-500">${item.unit}</span></span>
                        ${canEdit ? `
                            <button onclick="quickAdjustStock('${item.id}', 1)" title="Add 1"
                                class="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center no-print">+</button>
                        ` : ''}
                    </div>
                </td>
                <td class="py-3 px-3">
                    ${getConditionBadge(item.condition_status)}
                </td>
                <td class="py-3 px-3 text-slate-500">
                    <span class="font-medium text-slate-700 block truncate max-w-[150px]">${updaterName} <span class="text-[10px] text-slate-400">${updaterRole}</span></span>
                    <span class="text-[10px] text-slate-400">${updatedTime}</span>
                </td>
                <td class="py-3 px-3 text-right no-print">
                    ${canEdit ? `
                        <div class="inline-flex items-center gap-1">
                            <button onclick="openStockModal('${item.id}')" title="Edit Item"
                                class="p-1.5 rounded-lg border border-slate-200 hover:border-slate-900 text-slate-600 hover:text-slate-900 transition">
                                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="deleteStockItem('${item.id}', '${item.item_name.replace(/'/g, "\\'")}')" title="Delete Item"
                                class="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    ` : `<span class="text-[11px] text-slate-400">View Only</span>`}
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
};

/**
 * Opens the modal to Add a new stock item or Edit an existing one
 */
window.openStockModal = function(itemId = null) {
    injectStockModalIntoDOM();
    const form = document.getElementById('form-stock-item');
    form.reset();

    if (itemId) {
        const item = window.currentDepartmentStocks.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('stock-modal-title').textContent = 'Edit Inventory Stock';
        document.getElementById('stock-item-id').value = item.id;
        document.getElementById('stock-item-name').value = item.item_name;
        document.getElementById('stock-item-category').value = item.category;
        document.getElementById('stock-item-unit').value = item.unit;
        document.getElementById('stock-item-qty').value = item.quantity;
        document.getElementById('stock-item-threshold').value = item.min_threshold;
        document.getElementById('stock-item-condition').value = item.condition_status === 'Damaged' ? 'Damaged' : 'Auto';
    } else {
        document.getElementById('stock-modal-title').textContent = 'Add Inventory Stock';
        document.getElementById('stock-item-id').value = '';
        document.getElementById('stock-item-condition').value = 'Auto';
    }

    openModal('modal-stock-item');
};

/**
 * Handles saving a new or edited stock item and logs the activity for Phase 5 Analytics
 */
async function handleSaveStockItem(e) {
    e.preventDefault();
    if (!window.activeDepartmentId || !window.currentUserProfile) return;

    const itemId = document.getElementById('stock-item-id').value;
    const itemName = document.getElementById('stock-item-name').value.trim();
    const category = document.getElementById('stock-item-category').value;
    const unit = document.getElementById('stock-item-unit').value.trim() || 'pcs';
    const quantity = parseInt(document.getElementById('stock-item-qty').value, 10) || 0;
    const minThreshold = parseInt(document.getElementById('stock-item-threshold').value, 10) || 5;
    const selectedCondition = document.getElementById('stock-item-condition').value;

    const conditionStatus = computeConditionStatus(quantity, minThreshold, selectedCondition);

    const payload = {
        department_id: window.activeDepartmentId,
        item_name: itemName,
        category: category,
        unit: unit,
        quantity: quantity,
        min_threshold: minThreshold,
        condition_status: conditionStatus,
        last_updated_by: window.currentUserProfile.id,
        updated_at: new Date().toISOString()
    };

    try {
        if (itemId) {
            // Editing existing item
            const oldItem = window.currentDepartmentStocks.find(i => i.id === itemId);
            const qtyDiff = oldItem ? (quantity - oldItem.quantity) : 0;

            const { error } = await window.supabaseClient
                .from('inventory_stocks')
                .update(payload)
                .eq('id', itemId);

            if (error) throw error;

            // Determine action type for statistics
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
                remarks: `Updated ${itemName} (Qty: ${quantity} ${unit}, Status: ${conditionStatus})`
            }]);

        } else {
            // Inserting new item
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
                remarks: `Added new stock: ${itemName} (${quantity} ${unit})`
            }]);
        }

        closeModal('modal-stock-item');
        await loadDepartmentInventory(window.activeDepartmentId);
        Swal.fire({ icon: 'success', title: 'Inventory Saved', timer: 1000, showConfirmButton: false });

    } catch (err) {
        Swal.fire('Error Saving Stock', err.message, 'error');
    }
}

/**
 * Quick +1 / -1 Stock Adjustment directly from the table
 */
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

    // Log the quick addition or deduction for Daily/Weekly/Monthly Analytics
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

/**
 * Deletes a stock item after confirmation
 */
window.deleteStockItem = async function(itemId, itemName) {
    const confirm = await Swal.fire({
        title: `Delete ${itemName}?`,
        text: 'This item will be permanently removed from the department inventory.',
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

/**
 * Subscribes to Supabase Realtime changes on inventory_stocks
 */
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