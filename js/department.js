// ============================================================================
// FILE: js/department.js
// Handles Department CRUD, Dual Coordinators, Student Editors & Live Status
// ============================================================================

window.allDepartments = [];
window.activeDepartmentId = null;
window.activeDeptPermissions = { isCoordinator: false, isStudentEditor: false, canEditStocks: false, canUpdateStatus: false };

/**
 * Returns Tailwind badge styling for each department status
 */
function getStatusBadgeMarkup(status) {
    const map = {
        'Open': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
        'Closed': { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
        'Under Maintenance': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
        'In Use': { bg: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' }
    };
    const style = map[status] || map['Closed'];
    return {
        classes: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg}`,
        dotClass: `w-2 h-2 rounded-full ${style.dot}`
    };
}

/**
 * Loads all departments with joined Primary & Co-Coordinator profiles
 */
async function loadDepartments() {
    const { data, error } = await supabaseClient
        .from('departments')
        .select(`
            *,
            primary_coord:profiles!departments_primary_coordinator_id_fkey(id, full_name, teacher_rank, avatar_url),
            co_coord:profiles!departments_co_coordinator_id_fkey(id, full_name, teacher_rank, avatar_url)
        `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading departments:', error);
        return;
    }

    window.allDepartments = data || [];
    renderDepartmentList(window.allDepartments);

    // Auto-select first department if none is currently selected
    if (!window.activeDepartmentId && window.allDepartments.length > 0) {
        selectDepartment(window.allDepartments[0].id);
    } else if (window.activeDepartmentId) {
        selectDepartment(window.activeDepartmentId);
    }

    subscribeToRealtimeDepartments();
}

/**
 * Renders the sidebar directory of departments
 */
function renderDepartmentList(departments) {
    const container = document.getElementById('department-list-container');
    if (!departments.length) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No departments created yet.</div>`;
        return;
    }

    container.innerHTML = departments.map(dept => {
        const isSelected = dept.id === window.activeDepartmentId;
        const badge = getStatusBadgeMarkup(dept.status);
        return `
            <div onclick="selectDepartment('${dept.id}')"
                class="p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80'
                }">
                <div class="min-w-0">
                    <p class="text-xs font-bold truncate">${dept.dept_name}</p>
                    <p class="text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-400'} truncate">
                        ${dept.primary_coord?.full_name || 'Coordinator'}
                    </p>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    isSelected ? 'bg-white/15 text-white' : badge.classes
                }">
                    <span class="${badge.dotClass}"></span>
                    <span>${dept.status}</span>
                </span>
            </div>
        `;
    }).join('');
}

/**
 * Filters the department sidebar list via search input
 */
function filterDepartmentList() {
    const q = document.getElementById('dept-search-input').value.toLowerCase().trim();
    const filtered = window.allDepartments.filter(d => d.dept_name.toLowerCase().includes(q));
    renderDepartmentList(filtered);
}

/**
 * Selects a department and populates its header, coordinators, permissions, and stocks
 */
async function selectDepartment(deptId) {
    window.activeDepartmentId = deptId;
    renderDepartmentList(window.allDepartments);

    const dept = window.allDepartments.find(d => d.id === deptId);
    if (!dept) return;

    document.getElementById('empty-workspace-state').classList.add('hidden');
    document.getElementById('active-workspace').classList.remove('hidden');

    // Header Info
    document.getElementById('active-dept-name').textContent = dept.dept_name;
    document.getElementById('active-dept-desc').textContent = dept.description || 'Senior High School Department Workspace';

    // Status Badge
    const badge = getStatusBadgeMarkup(dept.status);
    const statusBadgeEl = document.getElementById('active-dept-status-badge');
    statusBadgeEl.className = badge.classes;
    statusBadgeEl.innerHTML = `<span class="${badge.dotClass}"></span><span>${dept.status}</span>`;

    // Status Dropdown Value
    document.getElementById('status-select-dropdown').value = dept.status;

    // Primary Coordinator Card
    const pCoord = dept.primary_coord;
    document.getElementById('primary-coord-avatar').src = pCoord?.avatar_url || `https://ui-avatars.com/api/?name=PC&background=0f172a&color=fff`;
    document.getElementById('primary-coord-name').textContent = pCoord?.full_name || 'Assigned Coordinator';
    document.getElementById('primary-coord-rank').textContent = pCoord?.teacher_rank || 'Department Head';

    // Co-Coordinator Card (2nd Coordinator)
    const cCoord = dept.co_coord;
    if (cCoord) {
        document.getElementById('co-coord-avatar').src = cCoord.avatar_url || `https://ui-avatars.com/api/?name=CC&background=334155&color=fff`;
        document.getElementById('co-coord-name').textContent = cCoord.full_name;
        document.getElementById('co-coord-rank').textContent = cCoord.teacher_rank || 'Co-Coordinator';
    } else {
        document.getElementById('co-coord-avatar').src = `https://ui-avatars.com/api/?name=None&background=e2e8f0&color=64748b`;
        document.getElementById('co-coord-name').textContent = 'Not Assigned';
        document.getElementById('co-coord-rank').textContent = 'Optional 2nd Teacher';
    }

    // Evaluate Current User's Permissions for this Department
    const perms = await checkDepartmentPermissions(deptId, window.currentUserProfile.id);
    window.activeDeptPermissions = perms;

    // Update User Access Badge & Controls
    const accessBadge = document.getElementById('user-access-level-badge');
    const statusControl = document.getElementById('status-switcher-control');
    const btnCoCoord = document.getElementById('btn-assign-cocoord');
    const btnManageEditors = document.getElementById('btn-manage-editors');
    const btnAddStock = document.getElementById('btn-add-stock');

    if (perms.isCoordinator) {
        accessBadge.textContent = 'Coordinator (Full Access)';
        accessBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200';
        statusControl.classList.remove('hidden');
        btnCoCoord.classList.remove('hidden');
        btnManageEditors.classList.remove('hidden');
        btnManageEditors.classList.add('inline-flex');
        btnAddStock.classList.remove('hidden');
        btnAddStock.classList.add('inline-flex');
    } else if (perms.isStudentEditor) {
        accessBadge.textContent = 'Authorized Student Editor';
        accessBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200';
        statusControl.classList.toggle('hidden', !perms.canUpdateStatus);
        btnCoCoord.classList.add('hidden');
        btnManageEditors.classList.add('hidden');
        btnAddStock.classList.toggle('hidden', !perms.canEditStocks);
        if (perms.canEditStocks) btnAddStock.classList.add('inline-flex');
    } else {
        accessBadge.textContent = 'View-Only Access';
        accessBadge.className = 'px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold uppercase bg-slate-100 text-slate-600';
        statusControl.classList.add('hidden');
        btnCoCoord.classList.add('hidden');
        btnManageEditors.classList.add('hidden');
        btnAddStock.classList.add('hidden');
    }

    // Count Authorized Student Editors
    await updateStudentEditorCount(deptId);

    // Trigger Phase 4 Inventory & Phase 5 Analytics refresh if loaded
    if (typeof loadDepartmentInventory === 'function') {
        loadDepartmentInventory(deptId);
    }
    if (typeof loadAnalytics === 'function' && !document.getElementById('view-analytics-tab').classList.contains('hidden')) {
        loadAnalytics('daily');
    }

    lucide.createIcons();
}

/**
 * Updates the count of authorized student editors shown on the department bar
 */
async function updateStudentEditorCount(deptId) {
    const { count } = await supabaseClient
        .from('department_student_editors')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', deptId);

    document.getElementById('student-editors-count').textContent = `${count || 0} Authorized`;
}

// ============================================================================
// CREATE NEW DEPARTMENT (TEACHERS ONLY)
// ============================================================================
async function openCreateDeptModal() {
    // Load other teachers so the creator can optionally pick a Co-Coordinator right away
    const { data: teachers } = await supabaseClient
        .from('profiles')
        .select('id, full_name, teacher_rank')
        .eq('role', 'teacher')
        .neq('id', window.currentUserProfile.id);

    const selectEl = document.getElementById('new-dept-cocoord');
    selectEl.innerHTML = `<option value="">-- None (Only Me for Now) --</option>` +
        (teachers || []).map(t => `<option value="${t.id}">${t.full_name} (${t.teacher_rank})</option>`).join('');

    openModal('modal-create-dept');
}

document.getElementById('form-create-dept').addEventListener('submit', async (e) => {
    e.preventDefault();
    const deptName = document.getElementById('new-dept-name').value.trim();
    const description = document.getElementById('new-dept-desc').value.trim();
    const status = document.getElementById('new-dept-status').value;
    const coCoordId = document.getElementById('new-dept-cocoord').value || null;

    const { data, error } = await supabaseClient
        .from('departments')
        .insert([{
            dept_name: deptName,
            description: description,
            status: status,
            primary_coordinator_id: window.currentUserProfile.id,
            co_coordinator_id: coCoordId
        }])
        .select()
        .single();

    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }

    closeModal('modal-create-dept');
    document.getElementById('form-create-dept').reset();
    window.activeDepartmentId = data.id;
    await loadDepartments();
    Swal.fire({ icon: 'success', title: 'Department Created', timer: 1200, showConfirmButton: false });
});

// ============================================================================
// ASSIGN OR UPDATE 2ND CO-COORDINATOR
// ============================================================================
async function openCoCoordinatorModal() {
    const dept = window.allDepartments.find(d => d.id === window.activeDepartmentId);
    if (!dept) return;

    const { data: teachers } = await supabaseClient
        .from('profiles')
        .select('id, full_name, teacher_rank')
        .eq('role', 'teacher')
        .neq('id', dept.primary_coordinator_id);

    const selectEl = document.getElementById('select-cocoordinator');
    selectEl.innerHTML = `<option value="">-- None / Remove Co-Coordinator --</option>` +
        (teachers || []).map(t => `
            <option value="${t.id}" ${dept.co_coordinator_id === t.id ? 'selected' : ''}>
                ${t.full_name} (${t.teacher_rank})
            </option>
        `).join('');

    openModal('modal-cocoordinator');
}

document.getElementById('form-assign-cocoord').addEventListener('submit', async (e) => {
    e.preventDefault();
    const coCoordId = document.getElementById('select-cocoordinator').value || null;

    const { error } = await supabaseClient
        .from('departments')
        .update({ co_coordinator_id: coCoordId, updated_at: new Date().toISOString() })
        .eq('id', window.activeDepartmentId);

    if (error) {
        Swal.fire('Update Failed', error.message, 'error');
        return;
    }

    closeModal('modal-cocoordinator');
    await loadDepartments();
    Swal.fire({ icon: 'success', title: 'Co-Coordinator Updated', timer: 1200, showConfirmButton: false });
});

// ============================================================================
// MANAGE STUDENT EDITORS (GRANT & REVOKE ACCESS)
// ============================================================================
async function openStudentEditorsModal() {
    if (!window.activeDepartmentId) return;

    // 1. Fetch all registered students for the dropdown
    const { data: students } = await supabaseClient
        .from('profiles')
        .select('id, full_name, lrn, strand, grade_level')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

    const selectEl = document.getElementById('select-student-to-add');
    selectEl.innerHTML = `<option value="">-- Select Student (Name & LRN) --</option>` +
        (students || []).map(s => `<option value="${s.id}">${s.full_name} • LRN: ${s.lrn} (${s.strand})</option>`).join('');

    // 2. Render currently authorized students
    await renderAuthorizedStudentsList();
    openModal('modal-student-editors');
}

async function renderAuthorizedStudentsList() {
    const listContainer = document.getElementById('authorized-students-list');
    const { data: editors, error } = await supabaseClient
        .from('department_student_editors')
        .select(`
            id,
            can_edit_stocks,
            can_update_status,
            student:profiles!department_student_editors_student_id_fkey(id, full_name, lrn, strand, avatar_url)
        `)
        .eq('department_id', window.activeDepartmentId);

    if (error || !editors || editors.length === 0) {
        listContainer.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">No student editors assigned yet.</p>`;
        return;
    }

    listContainer.innerHTML = editors.map(ed => `
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div class="flex items-center gap-2.5 min-w-0">
                <img src="${ed.student?.avatar_url || 'https://ui-avatars.com/api/?name=S'}" class="w-8 h-8 rounded-lg object-cover border border-slate-300">
                <div class="min-w-0">
                    <p class="font-bold text-slate-900 truncate">${ed.student?.full_name}</p>
                    <p class="text-[11px] text-slate-500 font-mono-code">
                        LRN: ${ed.student?.lrn} • 
                        ${ed.can_edit_stocks ? 'Stocks ✓' : ''} 
                        ${ed.can_update_status ? 'Status ✓' : ''}
                    </p>
                </div>
            </div>
            <button onclick="revokeStudentEditor('${ed.id}')" class="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium text-[11px] transition">
                Revoke
            </button>
        </div>
    `).join('');
}

document.getElementById('form-add-student-editor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('select-student-to-add').value;
    const canEditStocks = document.getElementById('perm-edit-stocks').checked;
    const canUpdateStatus = document.getElementById('perm-update-status').checked;

    if (!studentId) return;

    const { error } = await supabaseClient
        .from('department_student_editors')
        .upsert([{
            department_id: window.activeDepartmentId,
            student_id: studentId,
            can_edit_stocks: canEditStocks,
            can_update_status: canUpdateStatus,
            assigned_by: window.currentUserProfile.id
        }], { onConflict: 'department_id,student_id' });

    if (error) {
        Swal.fire('Error', error.message, 'error');
        return;
    }

    // Log editor addition for statistics
    await supabaseClient.from('activity_logs').insert([{
        department_id: window.activeDepartmentId,
        user_id: window.currentUserProfile.id,
        action_type: 'EDITOR_ADDED',
        remarks: 'Authorized a student editor'
    }]);

    await renderAuthorizedStudentsList();
    await updateStudentEditorCount(window.activeDepartmentId);
});

async function revokeStudentEditor(recordId) {
    const { error } = await supabaseClient
        .from('department_student_editors')
        .delete()
        .eq('id', recordId);

    if (!error) {
        await renderAuthorizedStudentsList();
        await updateStudentEditorCount(window.activeDepartmentId);
    }
}

// ============================================================================
// REAL-TIME DEPARTMENT STATUS SWITCHER & BROADCAST LISTENER
// ============================================================================
async function handleDepartmentStatusChange(newStatus) {
    if (!window.activeDepartmentId) return;
    const dept = window.allDepartments.find(d => d.id === window.activeDepartmentId);
    const prevStatus = dept ? dept.status : 'Closed';

    const { error } = await supabaseClient
        .from('departments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', window.activeDepartmentId);

    if (error) {
        Swal.fire('Status Update Failed', error.message, 'error');
        return;
    }

    // Record status change in activity_logs for Daily/Weekly/Monthly tracking
    await supabaseClient.from('activity_logs').insert([{
        department_id: window.activeDepartmentId,
        user_id: window.currentUserProfile.id,
        action_type: 'STATUS_CHANGED',
        previous_status: prevStatus,
        new_status: newStatus,
        remarks: `Status changed from ${prevStatus} to ${newStatus}`
    }]);

    await loadDepartments();
}

let deptRealtimeChannel = null;
function subscribeToRealtimeDepartments() {
    if (deptRealtimeChannel) return;
    deptRealtimeChannel = supabaseClient
        .channel('public:departments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
            loadDepartments();
        })
        .subscribe();
}