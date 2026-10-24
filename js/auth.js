// ============================================================================
// FILE: js/auth.js
// Handles Login, Dynamic Registration, Live Profile Preview & Metadata Backup
// ============================================================================

let hasCustomAvatarSelected = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

window.switchAuthTab = function(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        tabLogin.className = "w-1/2 py-2.5 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-sm transition-all flex items-center justify-center gap-1.5";
        tabRegister.className = "w-1/2 py-2.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5";
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        tabRegister.className = "w-1/2 py-2.5 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-sm transition-all flex items-center justify-center gap-1.5";
        tabLogin.className = "w-1/2 py-2.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-900 transition-all flex items-center justify-center gap-1.5";
        updateLiveIDCard();
    }
};

window.togglePasswordVisibility = function(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    if (window.lucide) lucide.createIcons();
};

window.toggleRoleFields = function() {
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    const teacherFields = document.getElementById('teacher-fields');
    const studentFields = document.getElementById('student-fields');
    const lrnInput = document.getElementById('reg-lrn');
    const strandInput = document.getElementById('reg-strand');

    if (selectedRole === 'teacher') {
        teacherFields.classList.remove('hidden');
        studentFields.classList.add('hidden');
        lrnInput.required = false;
        strandInput.required = false;
    } else {
        teacherFields.classList.add('hidden');
        studentFields.classList.remove('hidden');
        lrnInput.required = true;
        strandInput.required = true;
    }
    updateLiveIDCard();
};

window.updateLiveIDCard = function() {
    const roleEl = document.querySelector('input[name="role"]:checked');
    if (!roleEl) return;
    const role = roleEl.value;
    const fullName = document.getElementById('reg-fullname').value.trim() || 'Your Full Name';
    const age = document.getElementById('reg-age').value.trim() || '--';

    const roleBadge = document.getElementById('card-role-badge');
    const namePreview = document.getElementById('card-name-preview');
    const subPreview = document.getElementById('card-sub-preview');
    const metaPreview = document.getElementById('card-meta-preview');
    const avatarPreview = document.getElementById('avatar-preview');

    namePreview.textContent = fullName;

    if (!hasCustomAvatarSelected) {
        avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e293b&color=cbd5e1&bold=true`;
    }

    if (role === 'teacher') {
        const rank = document.getElementById('reg-teacher-rank').value;
        roleBadge.textContent = 'TEACHER';
        roleBadge.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20';
        subPreview.textContent = `${rank} • Age ${age}`;
        metaPreview.textContent = 'Coordinator / Admin Access';
    } else {
        const grade = document.getElementById('reg-grade').value;
        const track = document.getElementById('reg-track').value;
        const strand = document.getElementById('reg-strand').value.trim() || 'SHS Strand';
        const lrn = document.getElementById('reg-lrn').value.trim() || '------------';

        roleBadge.textContent = 'STUDENT';
        roleBadge.className = 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        subPreview.textContent = `${grade} (${track}) • Age ${age}`;
        metaPreview.textContent = `${strand} • LRN: ${lrn}`;
    }
};

window.previewAvatar = function(event) {
    const file = event.target.files[0];
    const fileLabel = document.getElementById('file-chosen-label');
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
        Swal.fire('File Too Large', 'Please select a formal picture under 3MB.', 'warning');
        event.target.value = '';
        return;
    }

    hasCustomAvatarSelected = true;
    fileLabel.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('avatar-preview').src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// LOGIN HANDLER
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.innerHTML = `<span>Signing in...</span>`;

    try {
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = 'dashboard.html';
    } catch (err) {
        Swal.fire('Sign In Failed', err.message || 'Invalid email or password.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In to Workspace</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        if (window.lucide) lucide.createIcons();
    }
});

// REGISTRATION HANDLER (Saves both Auth User Metadata + Profiles Table Row)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.querySelector('input[name="role"]:checked').value;
    const fullName = document.getElementById('reg-fullname').value.trim();
    const age = parseInt(document.getElementById('reg-age').value, 10) || 18;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const avatarInput = document.getElementById('reg-avatar');
    const avatarFile = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;

    const teacherRank = role === 'teacher' ? document.getElementById('reg-teacher-rank').value : null;
    const lrn = role === 'student' ? document.getElementById('reg-lrn').value.trim() : null;
    const track = role === 'student' ? document.getElementById('reg-track').value : null;
    const strand = role === 'student' ? document.getElementById('reg-strand').value.trim() : null;
    const gradeLevel = role === 'student' ? document.getElementById('reg-grade').value : null;

    if (role === 'student' && !/^\d{12}$/.test(lrn)) {
        Swal.fire('Invalid LRN', 'Student LRN must be exactly 12 digits.', 'warning');
        return;
    }

    const btn = document.getElementById('btn-register');
    btn.disabled = true;
    btn.innerHTML = `<span>Creating profile...</span>`;

    try {
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=fff&bold=true`;

        // 1. Sign up and store metadata backup inside auth.users
        const { data: authData, error: authError } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    full_name: fullName,
                    age,
                    avatar_url: avatarUrl,
                    teacher_rank: teacherRank,
                    lrn,
                    track,
                    strand,
                    grade_level: gradeLevel
                }
            }
        });

        if (authError) throw authError;

        const userId = authData.user?.id || authData.session?.user?.id;
        if (!userId) {
            throw new Error("User ID not returned. Make sure 'Confirm email' is OFF in Supabase Authentication > Providers > Email.");
        }

        // 2. Upload photo if selected
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${role}s/${userId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await window.supabaseClient.storage
                .from('profile-pictures')
                .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

            if (!uploadError) {
                const { data: publicUrlData } = window.supabaseClient.storage
                    .from('profile-pictures')
                    .getPublicUrl(filePath);
                if (publicUrlData?.publicUrl) {
                    avatarUrl = publicUrlData.publicUrl;
                }
            }
        }

        // 3. Upsert into 'profiles' table
        const { error: profileError } = await window.supabaseClient
            .from('profiles')
            .upsert([{
                id: userId,
                email: email,
                role: role,
                full_name: fullName,
                age: age,
                avatar_url: avatarUrl,
                teacher_rank: teacherRank,
                lrn: lrn,
                track: track,
                strand: strand,
                grade_level: gradeLevel
            }], { onConflict: 'id' });

        if (profileError) throw profileError;

        await Swal.fire({
            icon: 'success',
            title: 'Profile Created',
            text: `Welcome, ${fullName}!`,
            timer: 1200,
            showConfirmButton: false
        });

        window.location.href = 'dashboard.html';

    } catch (err) {
        Swal.fire('Registration Error', err.message || 'Could not create your profile.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Create Digital Profile</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        if (window.lucide) lucide.createIcons();
    }
});