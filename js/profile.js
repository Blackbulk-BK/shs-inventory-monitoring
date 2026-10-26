// ============================================================================
// FILE: js/profile.js
// Fault-Tolerant Session Init, Dark Mode, Switch Profile & People Directory
// ============================================================================

window.currentUserProfile = null;
let heartbeatInterval = null;

// Initialize saved Dark Mode preference immediately
(function initTheme() {
    if (localStorage.getItem('lyfjshs_theme') === 'dark') {
        document.documentElement.classList.add('dark');
    }
})();

window.toggleDarkMode = function() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('lyfjshs_theme', isDark ? 'dark' : 'light');
    const icon = document.getElementById('dark-mode-icon');
    if (icon) {
        icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
        if (window.lucide) lucide.createIcons();
    }
};

window.logoutUser = async function() {
    try {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.error('Sign out error:', err);
    } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        window.location.replace('index.html');
    }
};

window.openModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
};

window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
};

window.isUserOnline = function(lastSeenAt) {
    if (!lastSeenAt) return true; // Default to active if column is not yet migrated
    return (Date.now() - new Date(lastSeenAt).getTime()) < 5 * 60 * 1000;
};

window.formatLastSeen = function(lastSeenAt) {
    if (!lastSeenAt) return 'Active';
    if (window.isUserOnline(lastSeenAt)) return 'Active Now';
    const mins = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60000);
    if (mins < 60) return `Active ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Active ${hours}h ago`;
    return `Active ${Math.floor(hours / 24)}d ago`;
};

window.switchWorkspaceTab = function(tab) {
    const invTabBtn = document.getElementById('subtab-inventory');
    const anaTabBtn = document.getElementById('subtab-analytics');
    const invView = document.getElementById('view-inventory-tab');
    const anaView = document.getElementById('view-analytics-tab');

    if (tab === 'inventory') {
        invView.classList.remove('hidden');
        anaView.classList.add('hidden');
        invTabBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-slate-900 text-slate-900 transition flex items-center gap-2";
        anaTabBtn.className = "px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition flex items-center gap-2";
    } else {
        invView.classList.add('hidden');
        anaView.classList.remove('hidden');
        anaTabBtn.className = "px-4 py-2.5 text-xs font-bold border-b-2 border-slate-900 text-slate-900 transition flex items-center gap-2";
        invTabBtn.className = "px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition flex items-center gap-2";
        if (typeof window.loadAnalytics === 'function' && window.activeDepartmentId) {
            window.loadAnalytics('daily');
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const icon = document.getElementById('dark-mode-icon');
        if (icon && document.documentElement.classList.contains('dark')) {
            icon.setAttribute('data-lucide', 'sun');
        }
        injectDirectoryAndSwitchProfileModals();
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.warn('UI init warning:', e);
    }
    await initUserSession();
});

async function initUserSession() {
    if (!window.supabaseClient) {
        console.error('Supabase client missing!');
        return;
    }

    try {
        const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();
        if (sessionErr || !session) {
            window.location.replace('index.html');
            return;
        }

        const user = session.user;
        const meta = user.user_metadata || {};

        // Build immediate fallback profile from Auth session so UI NEVER hangs on "Loading Profile..."
        const fallbackName = meta.full_name || user.email.split('@')[0];
        const fallbackRole = meta.role || 'teacher';
        let profile = {
            id: user.id,
            email: user.email,
            role: fallbackRole,
            full_name: fallbackName,
            age: meta.age || 19,
            avatar_url: meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0f172a&color=fff&bold=true`,
            teacher_rank: meta.teacher_rank || (fallbackRole === 'teacher' ? 'Teacher I' : null),
            lrn: meta.lrn || null,
            track: meta.track || null,
            strand: meta.strand || null,
            grade_level: meta.grade_level || null
        };

        // Render immediately so user never sees "Loading Profile..."
        window.currentUserProfile = profile;
        renderUserProfileCard(profile);

        // Fetch full database profile row
        const { data: dbProfile } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (dbProfile) {
            profile = dbProfile;
        } else {
            const { data: inserted } = await window.supabaseClient
                .from('profiles')
                .upsert([profile], { onConflict: 'id' })
                .select()
                .maybeSingle();
            if (inserted) profile = inserted;
        }

        window.currentUserProfile = profile;
        saveProfileToRecentSwitcher(profile);
        renderUserProfileCard(profile);

        // Load departments right away (non-blocked by heartbeat)
        if (typeof window.loadDepartments === 'function') {
            await window.loadDepartments();
        }

        // Run background counters and heartbeat safely
        updateMyHeartbeat();
        refreshCampusCounters();
        heartbeatInterval = setInterval(() => {
            updateMyHeartbeat();
            refreshCampusCounters();
        }, 45000);

    } catch (err) {
        console.error('Session initialization error:', err);
        if (typeof window.loadDepartments === 'function') {
            window.loadDepartments();
        }
    }
}

async function updateMyHeartbeat() {
    if (!window.currentUserProfile) return;
    try {
        const nowIso = new Date().toISOString();
        window.currentUserProfile.last_seen_at = nowIso;
        await window.supabaseClient
            .from('profiles')
            .update({ last_seen_at: nowIso })
            .eq('id', window.currentUserProfile.id);
    } catch (e) {
        // Ignore if last_seen_at column hasn't been added yet
    }
}

window.refreshCampusCounters = async function() {
    try {
        const { data: profiles } = await window.supabaseClient
            .from('profiles')
            .select('*');

        if (!profiles) return;

        const totalStudents = profiles.filter(p => p.role === 'student').length;
        const activeCount = profiles.filter(p => window.isUserOnline(p.last_seen_at)).length;

        const navTotalEl = document.getElementById('nav-total-students');
        const cardTotalEl = document.getElementById('card-total-students');
        const activePillEl = document.getElementById('active-users-pill');

        if (navTotalEl) navTotalEl.textContent = totalStudents;
        if (cardTotalEl) cardTotalEl.textContent = totalStudents;
        if (activePillEl) activePillEl.textContent = activeCount;
    } catch (e) {}
};

window.renderUserProfileCard = function(profile) {
    if (!profile) return;

    const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=0f172a&color=fff&bold=true`;

    const navAvatar = document.getElementById('nav-avatar');
    const navName = document.getElementById('nav-name');
    const navRole = document.getElementById('nav-role');
    if (navAvatar) navAvatar.src = avatarUrl;
    if (navName) navName.textContent = profile.full_name;
    if (navRole) navRole.textContent = (profile.role || 'USER').toUpperCase();

    const profAvatar = document.getElementById('profile-avatar');
    const profName = document.getElementById('profile-fullname');
    const roleBadge = document.getElementById('profile-role-badge');
    const subText = document.getElementById('profile-sub');
    const metaText = document.getElementById('profile-meta');
    const createDeptBtn = document.getElementById('btn-open-create-dept');

    if (profAvatar) profAvatar.src = avatarUrl;
    if (profName) profName.textContent = profile.full_name;

    if (profile.role === 'teacher') {
        if (roleBadge) {
            roleBadge.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5"></span>TEACHER`;
            roleBadge.className = 'px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center';
        }
        if (subText) subText.textContent = `${profile.teacher_rank || 'Teacher I'} • Age ${profile.age || '--'}`;
        if (metaText) metaText.textContent = profile.email || 'Coordinator Access';
        if (createDeptBtn) {
            createDeptBtn.classList.remove('hidden');
            createDeptBtn.classList.add('inline-flex');
        }
    } else {
        if (roleBadge) {
            roleBadge.innerHTML = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>STUDENT`;
            roleBadge.className = 'px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center';
        }
        if (subText) subText.textContent = `${profile.grade_level || 'Grade 12'} (${profile.track || 'TVL'}) • Age ${profile.age || '--'}`;
        if (metaText) metaText.textContent = `${profile.strand || 'SHS'} • LRN: ${profile.lrn || 'N/A'}`;
        if (createDeptBtn) {
            createDeptBtn.classList.add('hidden');
        }
    }
};

function saveProfileToRecentSwitcher(profile) {
    try {
        const list = JSON.parse(localStorage.getItem('lyfjshs_recent_profiles') || '[]');
        const filtered = list.filter(item => item.email !== profile.email);
        filtered.unshift({
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            lrn: profile.lrn || null,
            avatar_url: profile.avatar_url
        });
        localStorage.setItem('lyfjshs_recent_profiles', JSON.stringify(filtered.slice(0, 5)));
    } catch (e) {}
}

function injectDirectoryAndSwitchProfileModals() {
    if (document.getElementById('modal-people-directory')) return;

    const modalsHTML = `
    <div id="modal-people-directory" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center p-4 no-print">
        <div class="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl fade-in">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <i data-lucide="users" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Campus Directory & Active Presence</h3>
                        <p class="text-xs text-slate-500">Active users appear automatically. Search anyone by Name, LRN, or Email.</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal('modal-people-directory')" class="text-slate-400 hover:text-slate-700">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="relative mb-4">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                <input type="text" id="global-people-search-input"
                    onfocus="handleGlobalPeopleSearch(this.value)"
                    oninput="handleGlobalPeopleSearch(this.value)"
                    placeholder="Search by Name, 12-Digit LRN, or Email..."
                    class="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-none transition">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div id="global-people-results" class="md:col-span-7 space-y-2 max-h-80 overflow-y-auto pr-1"></div>
                <div id="inspected-profile-card" class="md:col-span-5 bg-slate-950 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
                    <div class="text-center py-10 text-xs text-slate-400">
                        Select any person on the left to inspect their Official Digital ID and live facility location.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="modal-switch-profile" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center p-4 no-print">
        <div class="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl fade-in">
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <i data-lucide="repeat" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Switch Profile</h3>
                        <p class="text-[11px] text-slate-500">Quickly switch between Teacher & Student accounts</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal('modal-switch-profile')" class="text-slate-400 hover:text-slate-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <div class="space-y-2 mb-4" id="recent-profiles-list"></div>

            <form id="form-quick-switch" class="space-y-3 pt-3 border-t border-slate-100">
                <p class="text-xs font-bold text-slate-800">Sign in to another account</p>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-600 mb-1">Email, Full Name, or 12-Digit LRN</label>
                    <input type="text" id="switch-identifier" required placeholder="Enter Email, Name, or LRN"
                        class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-slate-600 mb-1">Password</label>
                    <input type="password" id="switch-password" required placeholder="Enter password"
                        class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-slate-900 focus:outline-none">
                </div>
                <div class="flex justify-end gap-2 pt-1">
                    <button type="button" onclick="logoutUser()" class="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg">
                        Full Sign Out
                    </button>
                    <button type="submit" id="btn-confirm-switch" class="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                        Switch Now
                    </button>
                </div>
            </form>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalsHTML);

    document.getElementById('form-quick-switch').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawId = document.getElementById('switch-identifier').value.trim();
        const password = document.getElementById('switch-password').value;
        const btn = document.getElementById('btn-confirm-switch');
        btn.disabled = true;
        btn.textContent = 'Switching...';

        try {
            let email = rawId;
            if (!rawId.includes('@')) {
                if (/^\d{12}$/.test(rawId)) {
                    const { data } = await window.supabaseClient.from('profiles').select('email').eq('lrn', rawId).maybeSingle();
                    if (!data?.email) throw new Error('No student found with that LRN.');
                    email = data.email;
                } else {
                    const { data } = await window.supabaseClient.from('profiles').select('email').ilike('full_name', `%${rawId}%`).limit(1);
                    if (!data || !data.length) throw new Error('No account found matching that name.');
                    email = data[0].email;
                }
            }

            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            closeModal('modal-switch-profile');
            window.location.reload();
        } catch (err) {
            Swal.fire('Switch Failed', err.message || 'Invalid credentials.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Switch Now';
        }
    });
}

window.openSwitchProfileModal = function() {
    const container = document.getElementById('recent-profiles-list');
    const saved = JSON.parse(localStorage.getItem('lyfjshs_recent_profiles') || '[]');

    if (saved.length > 0 && container) {
        container.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Saved Accounts on This Device</p>` +
            saved.map(acc => {
                const isCurrent = acc.email === window.currentUserProfile?.email;
                return `
                    <div onclick="prefillSwitchAccount('${acc.email}')"
                        class="p-2.5 rounded-xl border ${isCurrent ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-200 hover:border-slate-900'} flex items-center justify-between cursor-pointer transition">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <img src="${acc.avatar_url || 'https://ui-avatars.com/api/?name=U'}" class="w-8 h-8 rounded-lg object-cover">
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-900 truncate">${acc.full_name}</p>
                                <p class="text-[10px] text-slate-500 font-mono-code truncate">${acc.role.toUpperCase()} • ${acc.email}</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${isCurrent ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 text-slate-600'}">
                            ${isCurrent ? 'Current' : 'Select'}
                        </span>
                    </div>
                `;
            }).join('');
    }
    openModal('modal-switch-profile');
};

window.prefillSwitchAccount = function(email) {
    const input = document.getElementById('switch-identifier');
    const pass = document.getElementById('switch-password');
    if (input) input.value = email;
    if (pass) pass.focus();
};

window.openPeopleSearchModal = function() {
    openModal('modal-people-directory');
    const input = document.getElementById('global-people-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    handleGlobalPeopleSearch('');
};

let peopleSearchTimeout = null;
window.handleGlobalPeopleSearch = function(rawQuery) {
    clearTimeout(peopleSearchTimeout);
    const query = (rawQuery || '').trim();
    const resultsContainer = document.getElementById('global-people-results');

    peopleSearchTimeout = setTimeout(async () => {
        let supabaseQuery = window.supabaseClient.from('profiles').select('*').limit(25);

        if (query.length > 0) {
            supabaseQuery = supabaseQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,lrn.ilike.%${query}%`);
        }

        const { data: users, error } = await supabaseQuery;
        if (error || !users || users.length === 0) {
            resultsContainer.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">No matching users found.</div>`;
            return;
        }

        const sortedUsers = users.sort((a, b) => {
            const aOn = window.isUserOnline(a.last_seen_at) ? 1 : 0;
            const bOn = window.isUserOnline(b.last_seen_at) ? 1 : 0;
            return bOn - aOn;
        });

        window.lastSearchedPeople = sortedUsers;

        resultsContainer.innerHTML = sortedUsers.map(u => {
            const online = window.isUserOnline(u.last_seen_at);
            const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=0f172a&color=fff`;
            const subInfo = u.role === 'teacher' ? (u.teacher_rank || 'Teacher') : `${u.grade_level || ''} • LRN: ${u.lrn || 'N/A'}`;

            const insideDepts = (window.allDepartments || []).filter(d =>
                (d.primary_coordinator_id === u.id && d.coord1_inside) ||
                (d.co_coordinator_id === u.id && d.coord2_inside)
            );
            const locationPill = insideDepts.length > 0
                ? `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                       <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       <span>Inside ${insideDepts[0].dept_name}</span>
                   </span>`
                : '';

            return `
                <div onclick="inspectPersonProfile('${u.id}')"
                    class="p-3 rounded-xl border border-slate-200/90 hover:border-slate-900 bg-white transition cursor-pointer flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="relative shrink-0">
                            <img src="${avatar}" class="w-10 h-10 rounded-xl object-cover border border-slate-200">
                            <span class="w-2.5 h-2.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 ${online ? 'bg-emerald-500 status-dot' : 'bg-slate-300'}"></span>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <p class="text-xs font-bold text-slate-900 truncate">${u.full_name}</p>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono-code font-semibold uppercase ${u.role === 'teacher' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}">${u.role}</span>
                            </div>
                            <p class="text-[11px] text-slate-500 truncate">${subInfo}</p>
                            ${locationPill ? `<div class="mt-1">${locationPill}</div>` : ''}
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold ${online ? 'text-emerald-600' : 'text-slate-400'}">
                            <span class="w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 status-dot' : 'bg-slate-300'}"></span>
                            ${window.formatLastSeen(u.last_seen_at)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }, 120);
};

window.inspectPersonProfile = function(userId) {
    const u = (window.lastSearchedPeople || []).find(p => p.id === userId);
    const container = document.getElementById('inspected-profile-card');
    if (!u || !container) return;

    const online = window.isUserOnline(u.last_seen_at);
    const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=0f172a&color=fff`;

    const coordinatedDepts = (window.allDepartments || []).filter(d =>
        d.primary_coordinator_id === u.id || d.co_coordinator_id === u.id
    );

    const deptPresenceHTML = coordinatedDepts.length > 0 ? `
        <div class="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Facility Coordinator Presence</span>
            ${coordinatedDepts.map(d => {
                const isInside = (d.primary_coordinator_id === u.id && d.coord1_inside) ||
                                 (d.co_coordinator_id === u.id && d.coord2_inside);
                return `
                    <div class="flex items-center justify-between text-[11px] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                        <span class="truncate font-medium text-slate-200">${d.dept_name}</span>
                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            isInside ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }">
                            <span class="w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                            <span>${isInside ? 'Inside Dept' : 'Outside Dept'}</span>
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold ${online ? 'text-emerald-400' : 'text-slate-400'}">
                <span class="w-2 h-2 rounded-full ${online ? 'bg-emerald-400 status-dot' : 'bg-slate-500'}"></span>
                ${window.formatLastSeen(u.last_seen_at)}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                u.role === 'teacher' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }">${u.role}</span>
        </div>

        <div class="flex flex-col items-center text-center">
            <img src="${avatar}" class="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-md mb-2.5">
            <h4 class="font-bold text-sm text-white leading-snug">${u.full_name}</h4>
            <p class="text-xs text-slate-300 mt-0.5">
                ${u.role === 'teacher'
                    ? `${u.teacher_rank || 'Teacher I'} • Age ${u.age || '--'}`
                    : `${u.grade_level || 'Grade 12'} (${u.track || 'TVL'}) • Age ${u.age || '--'}`
                }
            </p>
        </div>

        <div class="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 font-mono-code text-slate-300">
            <div class="flex justify-between gap-2">
                <span class="text-slate-500">Email:</span>
                <span class="truncate">${u.email || 'N/A'}</span>
            </div>
            ${u.role === 'student' ? `
                <div class="flex justify-between gap-2">
                    <span class="text-slate-500">Strand:</span>
                    <span class="truncate">${u.strand || 'SHS'}</span>
                </div>
                <div class="flex justify-between gap-2">
                    <span class="text-slate-500">LRN:</span>
                    <span>${u.lrn || 'N/A'}</span>
                </div>
            ` : ''}
        </div>
        ${deptPresenceHTML}
    `;
};

window.uploadPhotoLater = async function(event) {
    const file = event.target.files[0];
    if (!file || !window.currentUserProfile) return;
    if (file.size > 3 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Please select a formal picture under 3MB.', 'warning');
        return;
    }
    Swal.fire({ title: 'Uploading Formal Picture...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const profile = window.currentUserProfile;
        const fileExt = file.name.split('.').pop();
        const filePath = `${profile.role}s/${profile.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await window.supabaseClient.storage.from('profile-pictures').upload(filePath, file, { cacheControl: '3600', upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = window.supabaseClient.storage.from('profile-pictures').getPublicUrl(filePath);
        const newAvatarUrl = publicUrlData.publicUrl;
        const { error: updateErr } = await window.supabaseClient.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', profile.id);
        if (updateErr) throw updateErr;
        window.currentUserProfile.avatar_url = newAvatarUrl;
        saveProfileToRecentSwitcher(window.currentUserProfile);
        renderUserProfileCard(window.currentUserProfile);
        if (typeof window.loadDepartments === 'function') await window.loadDepartments();
        Swal.fire({ icon: 'success', title: 'Formal Photo Updated', timer: 1200, showConfirmButton: false });
    } catch (err) {
        Swal.fire('Upload Failed', err.message || 'Could not update photo.', 'error');
    }
};

window.openEditProfilePrompt = async function() {
    const p = window.currentUserProfile;
    if (!p) return;
    const { value: formValues } = await Swal.fire({
        title: 'Edit Digital ID Details',
        html: `
            <div class="text-left space-y-3 text-xs">
                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Full Name</label>
                    <input id="swal-fullname" class="w-full px-3 py-2 border rounded-lg" value="${p.full_name || ''}">
                </div>
                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Age</label>
                    <input id="swal-age" type="number" class="w-full px-3 py-2 border rounded-lg" value="${p.age || 19}">
                </div>
                ${p.role === 'teacher' ? `
                <div>
                    <label class="block font-semibold text-slate-700 mb-1">Teacher Rank</label>
                    <select id="swal-rank" class="w-full px-3 py-2 border rounded-lg">
                        <option value="Teacher I" ${p.teacher_rank === 'Teacher I' ? 'selected' : ''}>Teacher I</option>
                        <option value="Teacher II" ${p.teacher_rank === 'Teacher II' ? 'selected' : ''}>Teacher II</option>
                        <option value="Teacher III" ${p.teacher_rank === 'Teacher III' ? 'selected' : ''}>Teacher III</option>
                        <option value="Teacher IV" ${p.teacher_rank === 'Teacher IV' ? 'selected' : ''}>Teacher IV</option>
                        <option value="Teacher V" ${p.teacher_rank === 'Teacher V' ? 'selected' : ''}>Teacher V</option>
                        <option value="Teacher VI" ${p.teacher_rank === 'Teacher VI' ? 'selected' : ''}>Teacher VI</option>
                        <option value="Teacher VII" ${p.teacher_rank === 'Teacher VII' ? 'selected' : ''}>Teacher VII</option>
                        <option value="Master Teacher I" ${p.teacher_rank === 'Master Teacher I' ? 'selected' : ''}>Master Teacher I</option>
                        <option value="Master Teacher II" ${p.teacher_rank === 'Master Teacher II' ? 'selected' : ''}>Master Teacher II</option>
                        <option value="Master Teacher III" ${p.teacher_rank === 'Master Teacher III' ? 'selected' : ''}>Master Teacher III</option>
                        <option value="Master Teacher IV" ${p.teacher_rank === 'Master Teacher IV' ? 'selected' : ''}>Master Teacher IV</option>
                        <option value="Master Teacher V" ${p.teacher_rank === 'Master Teacher V' ? 'selected' : ''}>Master Teacher V</option>
                        <option value="School Principal I" ${p.teacher_rank === 'School Principal I' ? 'selected' : ''}>School Principal I</option>
                        <option value="School Principal II" ${p.teacher_rank === 'School Principal II' ? 'selected' : ''}>School Principal II</option>
                        <option value="School Principal III" ${p.teacher_rank === 'School Principal III' ? 'selected' : ''}>School Principal III</option>
                        <option value="School Principal IV" ${p.teacher_rank === 'School Principal IV' ? 'selected' : ''}>School Principal IV</option>
                    </select>
                </div>` : ''}
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        confirmButtonColor: '#0f172a',
        preConfirm: () => ({
            full_name: document.getElementById('swal-fullname').value.trim(),
            age: parseInt(document.getElementById('swal-age').value, 10) || 18,
            teacher_rank: document.getElementById('swal-rank') ? document.getElementById('swal-rank').value : p.teacher_rank
        })
    });

    if (formValues && formValues.full_name) {
        const { error } = await window.supabaseClient.from('profiles').update(formValues).eq('id', p.id);
        if (!error) {
            window.currentUserProfile = { ...p, ...formValues };
            saveProfileToRecentSwitcher(window.currentUserProfile);
            renderUserProfileCard(window.currentUserProfile);
            if (typeof window.loadDepartments === 'function') await window.loadDepartments();
            Swal.fire({ icon: 'success', title: 'Digital ID Updated', timer: 1000, showConfirmButton: false });
        }
    }
};