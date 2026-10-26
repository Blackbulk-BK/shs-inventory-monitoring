// ============================================================================
// FILE: js/department.js
// Emoji-Free Facility Directory, Segmented Inside/Outside Switch & Live Status
// ============================================================================

window.allDepartments = [];
window.activeDepartmentId = null;
window.activeDeptPermissions = {
    isCoordinator: false,
    canEditStocks: false,
    canUpdateStatus: false
};

let selectedNewDeptCoCoordId = null;
let selectedCoCoordId = null;
let selectedStudentToAddId = null;

document.addEventListener('DOMContentLoaded', () => {
    upgradeAssignmentModalsToSearch();
    setupDepartmentForms();
    subscribeToRealtimeDepartments();
});

function upgradeAssignmentModalsToSearch() {
    const newDeptSelect = document.getElementById('new-dept-cocoord');
    if (newDeptSelect) {
        newDeptSelect.outerHTML = `
            <div class="space-y-1.5">
                <input type="text" id="search-new-dept-cocoord" oninput="searchTeacherForAssignment(this.value, 'new-dept')"
                    placeholder="Search teacher by Name or Email..."
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                <div id="selected-new-dept-cocoord-pill" class="hidden"></div>
                <div id="results-new-dept-cocoord" class="space-y-1 max-h-32 overflow-y-auto"></div>
            </div>
        `;
    }

    const coCoordSelect = document.getElementById('select-cocoordinator');
    if (coCoordSelect) {
        coCoordSelect.outerHTML = `
            <div class="space-y-2">
                <div class="relative">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="search-cocoord-input" oninput="searchTeacherForAssignment(this.value, 'existing-dept')"
                        placeholder="Type teacher's Name or Email..."
                        class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none">
                </div>
                <div id="selected-cocoord-pill" class="hidden"></div>
                <div id="results-cocoord-search" class="space-y-1.5 max-h-40 overflow-y-auto"></div>
                <button type="button" onclick="clearSelectedCoCoord()" class="text-[11px] text-rose-600 hover:underline font-medium">
                    Remove current Co-Coordinator
                </button>
            </div>
        `;
    }

    const studentSelect = document.getElementById('select-student-to-add');
    if (studentSelect) {
        studentSelect.outerHTML = `
            <div class="space-y-2">
                <div class="relative">
                    <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    <input type="text" id="search-student-editor-input" oninput="searchStudentForEditorAssignment(this.value)"
                        placeholder="Search student by Name, 12-Digit LRN, or Email..."
                        class="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none">
                </div>
                <div id="selected-student-editor-pill" class="hidden"></div>
                <div id="results-student-editor-search" class="space-y-1.5 max-h-36 overflow-y-auto"></div>
            </div>
        `;
    }

    if (window.lucide) lucide.createIcons();
}

window.searchTeacherForAssignment = async function(rawQuery, mode) {
    const query = (rawQuery || '').trim();
    const resultsBox = document.getElementById(mode === 'new-dept' ? 'results-new-dept-cocoord' : 'results-cocoord-search');
    if (!resultsBox) return;
    if (query.length < 2) { resultsBox.innerHTML = ''; return; }

    const { data: teachers } = await window.supabaseClient
        .from('profiles')
        .select('id, full_name, email, teacher_rank, last_seen_at')
        .eq('role', 'teacher')
        .neq('id', window.currentUserProfile?.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(6);

    if (!teachers || teachers.length === 0) {
        resultsBox.innerHTML = `<p class="text-[11px] text-slate-400 py-1.5 px-2">No teacher found matching "${query}".</p>`;
        return;
    }

    resultsBox.innerHTML = teachers.map(t => {
        const online = window.isUserOnline ? window.isUserOnline(t.last_seen_at) : false;
        return `
            <div onclick="pickTeacherAsCoCoord('${t.id}', '${t.full_name.replace(/'/g, "\\'")}', '${t.teacher_rank || 'Teacher'}', '${mode}')"
                class="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-900 cursor-pointer flex items-center justify-between text-xs transition">
                <div>
                    <p class="font-bold text-slate-900">${t.full_name}</p>
                    <p class="text-[10px] text-slate-500">${t.teacher_rank || 'Teacher'} • ${t.email}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold ${online ? 'text-emerald-600' : 'text-slate-400'}">
                    <span class="w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                    <span>${online ? 'Online' : 'Offline'}</span>
                </span>
            </div>
        `;
    }).join('');
};

window.pickTeacherAsCoCoord = function(id, name, rank, mode) {
    if (mode === 'new-dept') {
        selectedNewDeptCoCoordId = id;
        const pill = document.getElementById('selected-new-dept-cocoord-pill');
        const results = document.getElementById('results-new-dept-cocoord');
        if (pill) {
            pill.classList.remove('hidden');
            pill.innerHTML = `<div class="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs flex justify-between items-center"><span>Selected: <strong>${name}</strong> (${rank})</span><button type="button" onclick="selectedNewDeptCoCoordId=null;this.parentElement.parentElement.classList.add('hidden')" class="font-bold">Remove</button></div>`;
        }
        if (results) results.innerHTML = '';
    } else {
        selectedCoCoordId = id;
        const pill = document.getElementById('selected-cocoord-pill');
        const results = document.getElementById('results-cocoord-search');
        if (pill) {
            pill.classList.remove('hidden');
            pill.innerHTML = `<div class="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs flex justify-between items-center"><span>Selected: <strong>${name}</strong> (${rank})</span><button type="button" onclick="clearSelectedCoCoord()" class="font-bold">Clear</button></div>`;
        }
        if (results) results.innerHTML = '';
    }
};

window.clearSelectedCoCoord = function() {
    selectedCoCoordId = null;
    const pill = document.getElementById('selected-cocoord-pill');
    if (pill) {
        pill.classList.remove('hidden');
        pill.innerHTML = `<div class="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">Co-Coordinator will be removed upon saving.</div>`;
    }
};

window.searchStudentForEditorAssignment = async function(rawQuery) {
    const query = (rawQuery || '').trim();
    const resultsBox = document.getElementById('results-student-editor-search');
    if (!resultsBox) return;
    if (query.length < 2) { resultsBox.innerHTML = ''; return; }

    const { data: students } = await window.supabaseClient
        .from('profiles')
        .select('id, full_name, lrn, email, strand, last_seen_at')
        .eq('role', 'student')
        .or(`full_name.ilike.%${query}%,lrn.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);

    if (!students || students.length === 0) {
        resultsBox.innerHTML = `<p class="text-[11px] text-slate-400 py-1.5 px-2">No student found matching "${query}".</p>`;
        return;
    }

    resultsBox.innerHTML = students.map(s => {
        const online = window.isUserOnline ? window.isUserOnline(s.last_seen_at) : false;
        return `
            <div onclick="pickStudentForEditor('${s.id}', '${s.full_name.replace(/'/g, "\\'")}', '${s.lrn || 'N/A'}')"
                class="p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-900 cursor-pointer flex items-center justify-between text-xs transition">
                <div>
                    <p class="font-bold text-slate-900">${s.full_name}</p>
                    <p class="text-[10px] text-slate-500 font-mono-code">LRN: ${s.lrn || 'N/A'} • ${s.strand || 'SHS'}</p>
                </div>
                <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold ${online ? 'text-emerald-600' : 'text-slate-400'}">
                    <span class="w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                    <span>${online ? 'Online' : 'Offline'}</span>
                </span>
            </div>
        `;
    }).join('');
};

window.pickStudentForEditor = function(id, name, lrn) {
    selectedStudentToAddId = id;
    const pill = document.getElementById('selected-student-editor-pill');
    const results = document.getElementById('results-student-editor-search');
    const input = document.getElementById('search-student-editor-input');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    if (pill) {
        pill.classList.remove('hidden');
        pill.innerHTML = `
            <div class="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex justify-between items-center">
                <span>Selected: <strong>${name}</strong> (LRN: ${lrn})</span>
                <button type="button" onclick="selectedStudentToAddId=null;this.parentElement.parentElement.classList.add('hidden')" class="font-bold">Clear</button>
            </div>
        `;
    }
};

function getStatusBadgeMarkup(status) {
    const map = {
        'Open': { classes: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25', dotClass: 'w-2 h-2 rounded-full bg-emerald-500 status-dot' },
        'In Use': { classes: 'bg-blue-500/10 text-blue-600 border border-blue-500/25', dotClass: 'w-2 h-2 rounded-full bg-blue-500 status-dot' },
        'Under Maintenance': { classes: 'bg-amber-500/10 text-amber-600 border border-amber-500/25', dotClass: 'w-2 h-2 rounded-full bg-amber-500 status-dot' },
        'Closed': { classes: 'bg-rose-500/10 text-rose-600 border border-rose-500/25', dotClass: 'w-2 h-2 rounded-full bg-rose-500' }
    };
    return map[status] || map['Open'];
}

window.loadDepartments = async function() {
    const { data, error } = await window.supabaseClient
        .from('departments')
        .select(`
            *,
            primary_coord:profiles!departments_primary_coordinator_id_fkey(id, full_name, email, teacher_rank, avatar_url, last_seen_at),
            co_coord:profiles!departments_co_coordinator_id_fkey(id, full_name, email, teacher_rank, avatar_url, last_seen_at)
        `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading departments:', error);
        return;
    }

    window.allDepartments = data || [];
    renderDepartmentList(window.allDepartments);

    if (window.activeDepartmentId) {
        const stillExists = window.allDepartments.find(d => d.id === window.activeDepartmentId);
        if (stillExists) {
            await selectDepartment(window.activeDepartmentId);
        }
    } else if (window.allDepartments.length > 0) {
        await selectDepartment(window.allDepartments[0].id);
    }
};

/**
 * Renders the sidebar list of Facilities with clean geometry, zero emojis, and clear status/presence pills
 */
function renderDepartmentList(departments) {
    const container = document.getElementById('department-list-container');
    if (!container) return;

    if (!departments.length) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No facilities registered yet.</div>`;
        return;
    }

    container.innerHTML = departments.map(dept => {
        const isSelected = dept.id === window.activeDepartmentId;
        const badge = getStatusBadgeMarkup(dept.status);
        const anyCoordInside = dept.coord1_inside || dept.coord2_inside;

        return `
            <div onclick="selectDepartment('${dept.id}')"
                class="p-3.5 rounded-xl border transition-all cursor-pointer hover-lift ${
                    isSelected 
                    ? 'bg-slate-950 text-white border-slate-900 shadow-md' 
                    : 'bg-white hover:border-slate-400 text-slate-900 border-slate-200/90'
                }">
                <!-- Row 1: Full Facility Name + Status Pill -->
                <div class="flex items-center justify-between gap-2">
                    <h4 class="text-xs font-bold tracking-tight truncate">${dept.dept_name}</h4>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        isSelected ? 'bg-white/10 text-white border border-white/15' : badge.classes
                    }">
                        <span class="${badge.dotClass}"></span>
                        <span>${dept.status}</span>
                    </span>
                </div>

                <!-- Row 2: Coordinator Name + Clean Inside/Outside Indicator -->
                <div class="mt-2.5 pt-2 border-t ${isSelected ? 'border-slate-800' : 'border-slate-100'} flex items-center justify-between gap-2 text-[11px]">
                    <span class="truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}">
                        ${dept.primary_coord?.full_name || 'Assigned Coordinator'}
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                        anyCoordInside
                            ? (isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-600')
                            : (isSelected ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                    }">
                        <span class="w-1.5 h-1.5 rounded-full ${anyCoordInside ? 'bg-emerald-500 status-dot' : 'bg-slate-400'}"></span>
                        <span>${anyCoordInside ? 'Coord Inside' : 'Coord Outside'}</span>
                    </span>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

window.filterDepartmentList = function() {
    const query = document.getElementById('dept-search-input').value.toLowerCase();
    const filtered = window.allDepartments.filter(d =>
        d.dept_name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
    );
    renderDepartmentList(filtered);
};

/**
 * Selects a facility and renders the Segmented Status Broadcaster and Segmented Inside/Outside Switch
 */
window.selectDepartment = async function(deptId) {
    window.activeDepartmentId = deptId;
    const dept = window.allDepartments.find(d => d.id === deptId);
    if (!dept) return;

    renderDepartmentList(window.allDepartments);

    document.getElementById('empty-workspace-state').classList.add('hidden');
    document.getElementById('active-workspace').classList.remove('hidden');

    document.getElementById('active-dept-name').textContent = dept.dept_name;
    document.getElementById('active-dept-desc').textContent = dept.description || 'Luis Y. Ferrer Jr. Senior High School Facility';

    const badgeStyle = getStatusBadgeMarkup(dept.status);
    const statusBadge = document.getElementById('active-dept-status-badge');
    statusBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${badgeStyle.classes}`;
    statusBadge.innerHTML = `<span class="${badgeStyle.dotClass}"></span><span>${dept.status}</span>`;

    // Highlight active button in the Emoji-Free Segmented Status Broadcaster
    document.querySelectorAll('.status-seg-btn').forEach(btn => {
        const btnStatus = btn.getAttribute('data-status');
        if (btnStatus === dept.status) {
            btn.className = "status-seg-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-xs transition flex items-center gap-1.5";
        } else {
            btn.className = "status-seg-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5";
        }
    });

    const myId = window.currentUserProfile?.id;
    const isPrimaryCoord = dept.primary_coordinator_id === myId;
    const isCoCoord = dept.co_coordinator_id === myId;

    // 1. Render Primary Coordinator Card with Segmented [ Inside | Outside ] Switch
    const pCoord = dept.primary_coord;
    const pCard = document.getElementById('primary-coord-card');
    if (pCoord && pCard) {
        const pOnline = window.isUserOnline ? window.isUserOnline(pCoord.last_seen_at) : false;
        const pInside = dept.coord1_inside === true;
        const pAvatar = pCoord.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(pCoord.full_name)}&background=0f172a&color=fff`;

        pCard.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="relative shrink-0">
                        <img src="${pAvatar}" class="w-11 h-11 rounded-xl object-cover border border-slate-300 bg-white">
                        <span title="${pOnline ? 'Active Now' : 'Offline'}" class="w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${pOnline ? 'bg-emerald-500 status-dot' : 'bg-slate-300'}"></span>
                    </div>
                    <div class="min-w-0">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Coordinator 1</span>
                        <p class="text-xs font-bold text-slate-900 truncate mt-0.5">${pCoord.full_name}</p>
                        <p class="text-[11px] text-slate-500 truncate">${pCoord.teacher_rank || 'Teacher'}</p>
                    </div>
                </div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 border ${
                    pInside ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' : 'bg-slate-100 text-slate-500 border-slate-200'
                }">
                    <span class="w-1.5 h-1.5 rounded-full ${pInside ? 'bg-emerald-500 status-dot' : 'bg-slate-400'}"></span>
                    <span>${pInside ? 'Inside Dept' : 'Outside Dept'}</span>
                </span>
            </div>

            ${isPrimaryCoord ? `
                <div class="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">My Presence</span>
                    <div class="inline-flex p-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60">
                        <button type="button" onclick="toggleCoordinatorPresence('coord1', true)"
                            class="px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                pInside ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }">
                            <span>Inside</span>
                        </button>
                        <button type="button" onclick="toggleCoordinatorPresence('coord1', false)"
                            class="px-2.5 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 ${
                                !pInside ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }">
                            <span>Outside</span>
                        </button>
                    </div>
                </div>
            ` : `
                <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Account Status</span>
                    <span class="font-semibold ${pOnline ? 'text-emerald-600' : 'text-slate-400'}">${window.formatLastSeen ? window.formatLastSeen(pCoord.last_seen_at) : 'Offline'}</span>
                </div>
            `}
        `;
    }

    // 2. Render Co-Coordinator Card with Segmented [ Inside | Outside ] Switch
    const cCoord = dept.co_coord;
    const coFooter = document.getElementById('co-coord-presence-footer');
    if (cCoord) {
        const cOnline = window.isUserOnline ? window.isUserOnline(cCoord.last_seen_at) : false;
        const cInside = dept.coord2_inside === true;
        document.getElementById('co-coord-avatar').src = cCoord.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cCoord.full_name)}&background=334155&color=fff`;
        document.getElementById('co-coord-name').textContent = cCoord.full_name;
        document.getElementById('co-coord-rank').textContent = `${cCoord.teacher_rank || 'Teacher'} • ${cOnline ? 'Active Now' : 'Offline'}`;

        if (coFooter) {
            coFooter.innerHTML = isCoCoord ? `
                <div class="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">My Presence</span>
                    <div class="inline-flex p-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60">
                        <button type="button" onclick="toggleCoordinatorPresence('coord2', true)"
                            class="px-2.5 py-1 rounded-md text-[10px] font-bold transition ${cInside ? 'bg-emerald-600 text-white' : 'text-slate-600'}">
                            Inside
                        </button>
                        <button type="button" onclick="toggleCoordinatorPresence('coord2', false)"
                            class="px-2.5 py-1 rounded-md text-[10px] font-bold transition ${!cInside ? 'bg-slate-900 text-white' : 'text-slate-600'}">
                            Outside
                        </button>
                    </div>
                </div>
            ` : `
                <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span class="text-slate-500">Room Presence</span>
                    <span class="inline-flex items-center gap-1.5 font-semibold ${cInside ? 'text-emerald-600' : 'text-slate-500'}">
                        <span class="w-1.5 h-1.5 rounded-full ${cInside ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
                        <span>${cInside ? 'Inside Dept' : 'Outside Dept'}</span>
                    </span>
                </div>
            `;
        }
    } else {
        document.getElementById('co-coord-avatar').src = `https://ui-avatars.com/api/?name=NA&background=f1f5f9&color=64748b`;
        document.getElementById('co-coord-name').textContent = 'Not Assigned';
        document.getElementById('co-coord-rank').textContent = 'Optional 2nd Coordinator';
        if (coFooter) {
            coFooter.innerHTML = `
                <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Room Presence</span>
                    <span>Unassigned</span>
                </div>
            `;
        }
    }

    await evaluateUserPermissionsForDept(dept);
};

window.toggleCoordinatorPresence = async function(slot, newState) {
    if (!window.activeDepartmentId) return;
    const updateField = slot === 'coord1' ? { coord1_inside: newState, updated_at: new Date().toISOString() } : { coord2_inside: newState, updated_at: new Date().toISOString() };

    const { error } = await window.supabaseClient
        .from('departments')
        .update(updateField)
        .eq('id', window.activeDepartmentId);

    if (error) {
        Swal.fire('Update Error', error.message, 'error');
        return;
    }

    await window.supabaseClient.from('activity_logs').insert([{
        department_id: window.activeDepartmentId,
        user_id: window.currentUserProfile.id,
        action_type: 'STATUS_CHANGED',
        remarks: `Coordinator updated room presence to ${newState ? 'Inside Department' : 'Outside Department'}`
    }]);

    await loadDepartments();
};

async function evaluateUserPermissionsForDept(dept) {
    const userId = window.currentUserProfile.id;
    const isCoordinator = (dept.primary_coordinator_id === userId) || (dept.co_coordinator_id === userId);

    const { data: editors } = await window.supabaseClient
        .from('department_student_editors')
        .select(`*, student:profiles!department_student_editors_student_id_fkey(id, full_name, lrn, strand, grade_level, avatar_url, last_seen_at)`)
        .eq('department_id', dept.id);

    const safeEditors = editors || [];
    document.getElementById('student-editors-count').textContent = `${safeEditors.length} Authorized`;

    const myStudentRecord = safeEditors.find(e => e.student_id === userId);

    window.activeDeptPermissions = {
        isCoordinator: isCoordinator,
        canEditStocks: isCoordinator || (myStudentRecord ? myStudentRecord.can_edit_stocks : false),
        canUpdateStatus: isCoordinator || (myStudentRecord ? myStudentRecord.can_update_status : false)
    };

    const accessBadge = document.getElementById('user-access-level-badge');
    const statusControl = document.getElementById('status-switcher-control');
    const btnAssignCoCoord = document.getElementById('btn-assign-cocoord');
    const btnManageEditors = document.getElementById('btn-manage-editors');
    const btnAddStock = document.getElementById('btn-add-stock');

    if (isCoordinator) {
        accessBadge.textContent = 'Coordinator (Full Admin)';
        accessBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-mono-code font-semibold uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20';
        btnAssignCoCoord.classList.remove('hidden');
        btnManageEditors.classList.remove('hidden');
        btnManageEditors.classList.add('inline-flex');
    } else if (myStudentRecord) {
        accessBadge.textContent = 'Authorized Student Editor';
        accessBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-mono-code font-semibold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
        btnAssignCoCoord.classList.add('hidden');
        btnManageEditors.classList.add('hidden');
    } else {
        accessBadge.textContent = 'View-Only Access';
        accessBadge.className = 'px-2.5 py-0.5 rounded-md text-[10px] font-mono-code font-semibold uppercase bg-slate-100 text-slate-600';
        btnAssignCoCoord.classList.add('hidden');
        btnManageEditors.classList.add('hidden');
    }

    if (window.activeDeptPermissions.canUpdateStatus) {
        statusControl.classList.remove('hidden');
    } else {
        statusControl.classList.add('hidden');
    }

    if (window.activeDeptPermissions.canEditStocks) {
        btnAddStock.classList.remove('hidden');
        btnAddStock.classList.add('inline-flex');
    } else {
        btnAddStock.classList.add('hidden');
    }

    renderAuthorizedStudentsList(safeEditors);

    if (typeof window.loadDepartmentInventory === 'function') {
        window.loadDepartmentInventory(dept.id);
    }
}

window.handleDepartmentStatusChange = async function(newStatus) {
    if (!window.activeDepartmentId) return;

    const { error } = await window.supabaseClient
        .from('departments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', window.activeDepartmentId);

    if (error) {
        Swal.fire('Permission Denied', error.message, 'error');
        return;
    }

    await window.supabaseClient.from('activity_logs').insert([{
        department_id: window.activeDepartmentId,
        user_id: window.currentUserProfile.id,
        action_type: 'STATUS_CHANGED',
        remarks: `Broadcasted facility status as "${newStatus}"`
    }]);

    await loadDepartments();
};

window.openCreateDeptModal = function() {
    upgradeAssignmentModalsToSearch();
    selectedNewDeptCoCoordId = null;
    const pill = document.getElementById('selected-new-dept-cocoord-pill');
    const results = document.getElementById('results-new-dept-cocoord');
    if (pill) pill.classList.add('hidden');
    if (results) results.innerHTML = '';
    openModal('modal-create-dept');
};

window.openCoCoordinatorModal = function() {
    upgradeAssignmentModalsToSearch();
    const dept = window.allDepartments.find(d => d.id === window.activeDepartmentId);
    selectedCoCoordId = dept?.co_coordinator_id || null;
    const input = document.getElementById('search-cocoord-input');
    const results = document.getElementById('results-cocoord-search');
    const pill = document.getElementById('selected-cocoord-pill');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    if (pill) pill.classList.add('hidden');
    openModal('modal-cocoordinator');
};

window.openStudentEditorsModal = function() {
    upgradeAssignmentModalsToSearch();
    selectedStudentToAddId = null;
    const input = document.getElementById('search-student-editor-input');
    const results = document.getElementById('results-student-editor-search');
    const pill = document.getElementById('selected-student-editor-pill');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    if (pill) pill.classList.add('hidden');
    openModal('modal-student-editors');
};

function renderAuthorizedStudentsList(editors) {
    const listContainer = document.getElementById('authorized-students-list');
    if (!listContainer) return;

    if (!editors.length) {
        listContainer.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">No student editors assigned yet.</p>`;
        return;
    }

    listContainer.innerHTML = editors.map(ed => {
        const st = ed.student;
        const online = window.isUserOnline ? window.isUserOnline(st?.last_seen_at) : false;
        return `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="relative shrink-0">
                        <img src="${st?.avatar_url || 'https://ui-avatars.com/api/?name=S'}" class="w-8 h-8 rounded-lg object-cover">
                        <span class="w-2 h-2 rounded-full border border-white absolute -bottom-0.5 -right-0.5 ${online ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-semibold text-slate-900 truncate">${st?.full_name || 'Student'}</p>
                        <p class="text-[10px] text-slate-500 font-mono-code">LRN: ${st?.lrn || 'N/A'} • ${ed.can_edit_stocks ? 'Stocks' : ''} ${ed.can_update_status ? 'Status' : ''}</p>
                    </div>
                </div>
                <button onclick="revokeStudentEditor('${ed.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition">
                    Revoke
                </button>
            </div>
        `;
    }).join('');
}

window.revokeStudentEditor = async function(recordId) {
    const { error } = await window.supabaseClient.from('department_student_editors').delete().eq('id', recordId);
    if (!error) await selectDepartment(window.activeDepartmentId);
};

function setupDepartmentForms() {
    document.getElementById('form-create-dept').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-dept-name').value.trim();
        const desc = document.getElementById('new-dept-desc').value.trim();
        const status = document.getElementById('new-dept-status').value;

        const { data, error } = await window.supabaseClient
            .from('departments')
            .insert([{
                dept_name: name,
                description: desc,
                status: status,
                primary_coordinator_id: window.currentUserProfile.id,
                co_coordinator_id: selectedNewDeptCoCoordId || null,
                coord1_inside: true
            }])
            .select()
            .single();

        if (error) {
            Swal.fire('Error Creating Facility', error.message, 'error');
            return;
        }

        closeModal('modal-create-dept');
        e.target.reset();
        window.activeDepartmentId = data.id;
        await loadDepartments();
        Swal.fire({ icon: 'success', title: 'Facility Created', timer: 1200, showConfirmButton: false });
    });

    document.getElementById('form-assign-cocoord').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await window.supabaseClient
            .from('departments')
            .update({ co_coordinator_id: selectedCoCoordId || null })
            .eq('id', window.activeDepartmentId);

        if (error) {
            Swal.fire('Update Error', error.message, 'error');
            return;
        }

        closeModal('modal-cocoordinator');
        await loadDepartments();
        Swal.fire({ icon: 'success', title: 'Co-Coordinator Updated', timer: 1200, showConfirmButton: false });
    });

    document.getElementById('form-add-student-editor').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedStudentToAddId) {
            Swal.fire('Select a Student First', 'Search for a student by Name, LRN, or Email and click their profile.', 'warning');
            return;
        }

        const canStocks = document.getElementById('perm-edit-stocks').checked;
        const canStatus = document.getElementById('perm-update-status').checked;

        const { error } = await window.supabaseClient
            .from('department_student_editors')
            .upsert([{
                department_id: window.activeDepartmentId,
                student_id: selectedStudentToAddId,
                can_edit_stocks: canStocks,
                can_update_status: canStatus,
                granted_by: window.currentUserProfile.id
            }], { onConflict: 'department_id,student_id' });

        if (error) {
            Swal.fire('Error Granting Access', error.message, 'error');
            return;
        }

        selectedStudentToAddId = null;
        const pill = document.getElementById('selected-student-editor-pill');
        if (pill) pill.classList.add('hidden');

        await selectDepartment(window.activeDepartmentId);
        Swal.fire({ icon: 'success', title: 'Student Authorized', timer: 1200, showConfirmButton: false });
    });
}

function subscribeToRealtimeDepartments() {
    window.supabaseClient
        .channel('public:departments_and_profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => {
            loadDepartments();
        })
        .subscribe();
}