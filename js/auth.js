// ============================================================================
// FILE: js/auth.js
// Handles Login, Dynamic Registration, Live Profile Preview & Optional Photo
// ============================================================================

let hasCustomAvatarSelected = false;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

/**
 * Switches between Sign In and Create Account views
 */
function switchAuthTab(mode) {
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
}

/**
 * Show / Hide Password Toggle
 */
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

/**
 * Dynamically toggles Teacher Rank vs Student LRN/Strand fields
 */
function toggleRoleFields() {
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
}

/**
 * Updates the Live Digital ID Card on the left panel as the user types
 */
function updateLiveIDCard() {
    const role = document.querySelector('input[name="role"]:checked').value;
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
}

/**
 * Shows live image preview on the Digital ID Card when user selects a photo
 */
function previewAvatar(event) {
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
}

// ============================================================================
// HANDLE LOGIN SUBMISSION
// ============================================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.innerHTML = `<span>Signing in...</span>`;

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        window.location.href = 'dashboard.html';
    } catch (err) {
        Swal.fire('Sign In Failed', err.message || 'Invalid email or password.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In to Workspace</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
    }
});

// ============================================================================
// HANDLE REGISTRATION & OPTIONAL FORMAL PICTURE UPLOAD
// ============================================================================
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.querySelector('input[name="role"]:checked').value;
    const fullName = document.getElementById('reg-fullname').value.trim();
    const age = parseInt(document.getElementById('reg-age').value, 10);
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
        // 1. Register user in Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;
        
        // Ensure user ID exists (requires "Confirm Email" to be turned OFF in Supabase Auth)
        const userId = authData.user?.id || authData.session?.user?.id;
        if (!userId) {
            throw new Error("User ID not returned. Please ensure 'Confirm email' is toggled OFF under Supabase Authentication > Providers > Email.");
        }

        // 2. Default avatar URL using initials
        let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=fff&bold=true`;

        // 3. Only attempt storage upload if a file was actually chosen
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${role}s/${userId}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('profile-pictures')
                .upload(filePath, avatarFile, { cacheControl: '3600', upsert: true });

            if (!uploadError) {
                const { data: publicUrlData } = supabaseClient.storage
                    .from('profile-pictures')
                    .getPublicUrl(filePath);
                if (publicUrlData?.publicUrl) {
                    avatarUrl = publicUrlData.publicUrl;
                }
            }
        }

        // 4. Insert unified record into 'profiles' table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert([{
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
            }]);

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
        lucide.createIcons();
    }
});