// ============================================================================
// FILE: js/profile.js
// Manages User Session, Self-Healing Digital ID Profile, Photo Upload & Logout
// ============================================================================

window.currentUserProfile = null;

/**
 * Global Sign Out Function (Attached to window so the navbar button always works)
 */
window.logoutUser = async function() {
    try {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (err) {
        console.error('Sign out error:', err);
    } finally {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('index.html');
    }
};

/**
 * Global Modal Helpers
 */
window.openModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
};

window.closeModal = function(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};

/**
 * Workspace Sub-Tab Switcher (Inventory vs Analytics)
 */
window.switchWorkspaceTab = function(tab) {
    const invTabBtn = document.getElementById('subtab-inventory');
    const anaTabBtn = document.getElementById('subtab-analytics');
    const invView = document.getElementById('view-inventory-tab');
    const anaView = document.getElementById('view-analytics-tab');

    if (tab === 'inventory') {
        invView.classList.remove('hidden');
        anaView.classList.add('hidden');
        invTabBtn.className = "px-4 py-2.5 text-xs font-semibold border-b-2 border-slate-900 text-slate-900 transition flex items-center gap-2";
        anaTabBtn.className = "px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition flex items-center gap-2";
    } else {
        invView.classList.add('hidden');
        anaView.classList.remove('hidden');
        anaTabBtn.className = "px-4 py-2.5 text-xs font-semibold border-b-2 border-slate-900 text-slate-900 transition flex items-center gap-2";
        invTabBtn.className = "px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition flex items-center gap-2";

        if (typeof window.loadAnalytics === 'function' && window.activeDepartmentId) {
            window.loadAnalytics('daily');
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await initUserSession();
});

/**
 * Validates active session, fetches user profile (or auto-repairs it if missing)
 */
async function initUserSession() {
    if (!window.supabaseClient) {
        Swal.fire('Configuration Error', 'Supabase client is not loaded. Check js/supabaseClient.js.', 'error');
        return;
    }

    const { data: { session }, error: sessionErr } = await window.supabaseClient.auth.getSession();

    if (sessionErr || !session) {
        window.location.replace('index.html');
        return;
    }

    const user = session.user;

    // 1. Try fetching existing profile from 'profiles' table
    let { data: profile, error: profileErr } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    // 2. SELF-HEALING: If profile row doesn't exist yet (e.g. from an earlier partial registration),
    // automatically reconstruct it from user_metadata or prompt once.
    if (!profile) {
        const meta = user.user_metadata || {};
        const fallbackName = meta.full_name || user.email.split('@')[0];
        const fallbackRole = meta.role || 'teacher';
        const fallbackAge = meta.age || 19;
        const fallbackRank = meta.teacher_rank || (fallbackRole === 'teacher' ? 'Teacher I' : null);
        const fallbackAvatar = meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=0f172a&color=fff&bold=true`;

        const newProfilePayload = {
            id: user.id,
            email: user.email,
            role: fallbackRole,
            full_name: fallbackName,
            age: fallbackAge,
            avatar_url: fallbackAvatar,
            teacher_rank: fallbackRank,
            lrn: meta.lrn || null,
            track: meta.track || null,
            strand: meta.strand || null,
            grade_level: meta.grade_level || null
        };

        const { data: insertedProfile, error: insertErr } = await window.supabaseClient
            .from('profiles')
            .upsert([newProfilePayload], { onConflict: 'id' })
            .select()
            .single();

        if (!insertErr && insertedProfile) {
            profile = insertedProfile;
        } else {
            profile = newProfilePayload;
        }
    }

    window.currentUserProfile = profile;
    renderUserProfileCard(profile);

    // Load departments list
    if (typeof window.loadDepartments === 'function') {
        await window.loadDepartments();
    }
}

/**
 * Renders the Top Navbar and Left Sidebar Official Digital ID Card
 */
window.renderUserProfileCard = function(profile) {
    if (!profile) return;

    const avatarUrl = profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=0f172a&color=fff&bold=true`;

    // Update Top Navbar
    const navAvatar = document.getElementById('nav-avatar');
    const navName = document.getElementById('nav-name');
    const navRole = document.getElementById('nav-role');
    if (navAvatar) navAvatar.src = avatarUrl;
    if (navName) navName.textContent = profile.full_name;
    if (navRole) navRole.textContent = (profile.role || 'USER').toUpperCase();

    // Update Sidebar Digital ID Card
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
            roleBadge.textContent = 'TEACHER';
            roleBadge.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20';
        }
        if (subText) subText.textContent = `${profile.teacher_rank || 'Teacher I'} • Age ${profile.age || '--'}`;
        if (metaText) metaText.textContent = profile.email || 'Coordinator Access';

        if (createDeptBtn) {
            createDeptBtn.classList.remove('hidden');
            createDeptBtn.classList.add('inline-flex');
        }
    } else {
        if (roleBadge) {
            roleBadge.textContent = 'STUDENT';
            roleBadge.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        }
        if (subText) subText.textContent = `${profile.grade_level || 'Grade 12'} (${profile.track || 'TVL'}) • Age ${profile.age || '--'}`;
        if (metaText) metaText.textContent = `${profile.strand || 'SHS'} • LRN: ${profile.lrn || 'N/A'}`;
    }

    // Ensure "Upload / Change Photo" & "Edit ID" footer exists inside the Digital ID card
    injectDigitalIDFooterControls();
};

/**
 * Automatically adds the "Upload Photo" and "Edit Details" buttons to the Digital ID Card
 * even if dashboard.html wasn't manually edited
 */
function injectDigitalIDFooterControls() {
    const idCard = document.getElementById('profile-fullname')?.closest('.bg-slate-950');
    if (!idCard || document.getElementById('digital-id-actions-bar')) return;

    const actionsHTML = `
        <div id="digital-id-actions-bar" class="mt-3.5 pt-3 border-t border-slate-800/90 flex items-center justify-between text-[11px]">
            <label for="dashboard-avatar-upload" class="font-semibold text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1.5 transition">
                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                <span>Upload / Change Photo</span>
            </label>
            <input type="file" id="dashboard-avatar-upload" accept="image/png, image/jpeg, image/webp" onchange="uploadPhotoLater(event)" class="hidden">
            
            <button type="button" onclick="openEditProfilePrompt()" class="text-slate-400 hover:text-white font-medium flex items-center gap-1 transition">
                <i data-lucide="user-pen" class="w-3.5 h-3.5"></i>
                <span>Edit ID</span>
            </button>
        </div>
    `;
    idCard.insertAdjacentHTML('beforeend', actionsHTML);
    if (window.lucide) lucide.createIcons();
}

/**
 * Allows uploading or changing the formal ID picture anytime from the dashboard
 */
window.uploadPhotoLater = async function(event) {
    const file = event.target.files[0];
    if (!file || !window.currentUserProfile) return;

    if (file.size > 3 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Please select a formal picture under 3MB.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Uploading Formal Picture...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const profile = window.currentUserProfile;
        const fileExt = file.name.split('.').pop();
        const filePath = `${profile.role}s/${profile.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await window.supabaseClient.storage
            .from('profile-pictures')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = window.supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        const newAvatarUrl = publicUrlData.publicUrl;

        const { error: updateErr } = await window.supabaseClient
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', profile.id);

        if (updateErr) throw updateErr;

        window.currentUserProfile.avatar_url = newAvatarUrl;
        renderUserProfileCard(window.currentUserProfile);

        if (typeof window.loadDepartments === 'function') {
            await window.loadDepartments();
        }

        Swal.fire({ icon: 'success', title: 'Formal Photo Updated!', timer: 1200, showConfirmButton: false });
    } catch (err) {
        Swal.fire('Upload Failed', err.message || 'Could not update photo.', 'error');
    }
};

/**
 * Allows quick editing of Full Name, Age, and Rank/Strand if profile was auto-recovered
 */
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
                </div>
                ` : ''}
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        confirmButtonColor: '#0f172a',
        preConfirm: () => {
            return {
                full_name: document.getElementById('swal-fullname').value.trim(),
                age: parseInt(document.getElementById('swal-age').value, 10) || 18,
                teacher_rank: document.getElementById('swal-rank') ? document.getElementById('swal-rank').value : p.teacher_rank
            };
        }
    });

    if (formValues && formValues.full_name) {
        const { error } = await window.supabaseClient
            .from('profiles')
            .update(formValues)
            .eq('id', p.id);

        if (!error) {
            window.currentUserProfile = { ...p, ...formValues };
            renderUserProfileCard(window.currentUserProfile);
            if (typeof window.loadDepartments === 'function') await window.loadDepartments();
            Swal.fire({ icon: 'success', title: 'Digital ID Updated', timer: 1000, showConfirmButton: false });
        }
    }
};