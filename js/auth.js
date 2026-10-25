// ============================================================================
// FILE: js/auth.js
// Multi-Identifier Login (Email / Full Name / LRN) + Gmail OTP Password Reset
// ============================================================================

let hasCustomAvatarSelected = false;
let recoveryTargetEmail = "";

document.addEventListener('DOMContentLoaded', async () => {
    injectForgotPasswordModal();
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
    }
});

/**
 * Resolves a user's input (Email, 12-Digit LRN, or Full Name) into their registered Email
 */
async function resolveUserIdentifierToEmail(rawInput) {
    const identifier = (rawInput || "").trim();
    if (!identifier) throw new Error("Please enter your Email, Full Name, or LRN.");

    // 1. If it already looks like an email address, use it directly
    if (identifier.includes('@')) {
        return identifier.toLowerCase();
    }

    // 2. If it is a 12-digit number, look up by Student LRN
    if (/^\d{12}$/.test(identifier)) {
        const { data: studentByLrn, error: lrnErr } = await window.supabaseClient
            .from('profiles')
            .select('email, full_name')
            .eq('lrn', identifier)
            .maybeSingle();

        if (lrnErr) throw new Error("Database lookup error. Make sure the public SELECT policy on 'profiles' is enabled.");
        if (!studentByLrn || !studentByLrn.email) {
            throw new Error(`No student account found with LRN: ${identifier}`);
        }
        return studentByLrn.email;
    }

    // 3. Otherwise, look up by Full Name (case-insensitive match)
    const { data: matchedProfiles, error: nameErr } = await window.supabaseClient
        .from('profiles')
        .select('email, full_name')
        .ilike('full_name', identifier)
        .limit(2);

    if (nameErr) throw new Error("Could not look up name. Please ensure the public SELECT policy on 'profiles' is active.");

    // If exact match wasn't found, try partial name search
    if (!matchedProfiles || matchedProfiles.length === 0) {
        const { data: partialMatches } = await window.supabaseClient
            .from('profiles')
            .select('email, full_name')
            .ilike('full_name', `%${identifier}%`)
            .limit(2);

        if (!partialMatches || partialMatches.length === 0) {
            throw new Error(`No registered account found matching "${identifier}". Check your spelling or sign in with your email.`);
        }
        if (partialMatches.length > 1) {
            throw new Error(`Multiple accounts match "${identifier}". Please enter your full name (Last, First, M.I.), LRN, or Email.`);
        }
        return partialMatches[0].email;
    }

    return matchedProfiles[0].email;
}

/**
 * Switches between Sign In and Create Account views
 */
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
    if (!input || !icon) return;
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

// ============================================================================
// HANDLE LOGIN SUBMISSION (SUPPORTS EMAIL, FULL NAME, OR 12-DIGIT LRN)
// ============================================================================
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawIdentifierEl = document.getElementById('login-identifier') || document.getElementById('login-email');
    const rawIdentifier = rawIdentifierEl ? rawIdentifierEl.value.trim() : '';
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    btn.disabled = true;
    btn.innerHTML = `<span>Verifying credentials...</span>`;

    try {
        // Resolve Name / LRN / Email to the user's actual email
        const resolvedEmail = await resolveUserIdentifierToEmail(rawIdentifier);

        const { error } = await window.supabaseClient.auth.signInWithPassword({
            email: resolvedEmail,
            password: password
        });

        if (error) throw error;
        window.location.href = 'dashboard.html';
    } catch (err) {
        Swal.fire('Sign In Failed', err.message || 'Invalid credentials.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In to Workspace</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        if (window.lucide) lucide.createIcons();
    }
});

// ============================================================================
// FORGOT PASSWORD & GMAIL OTP CODE RESET ENGINE
// ============================================================================
function injectForgotPasswordModal() {
    if (document.getElementById('modal-forgot-password')) return;

    const modalHTML = `
    <div id="modal-forgot-password" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center p-4">
        <div class="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl fade-in">
            
            <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                        <i data-lucide="shield-alert" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-900">Account Password Recovery</h3>
                        <p class="text-[11px] text-slate-500">Reset via Gmail verification code</p>
                    </div>
                </div>
                <button type="button" onclick="closeForgotPasswordModal()" class="text-slate-400 hover:text-slate-700">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- STEP 1: REQUEST CODE TO GMAIL -->
            <form id="form-request-reset-code" class="space-y-4">
                <p class="text-xs text-slate-600 leading-relaxed">
                    Enter your registered <strong>Gmail address</strong>, <strong>Full Name</strong>, or <strong>12-Digit LRN</strong>. We will send a 6-digit verification code to your email.
                </p>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Email, Full Name, or LRN *</label>
                    <input type="text" id="reset-identifier-input" required placeholder="yourname@gmail.com or LRN"
                        class="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none">
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeForgotPasswordModal()" class="px-4 py-2 text-xs font-medium text-slate-600">Cancel</button>
                    <button type="submit" id="btn-send-otp" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Send Code to Gmail</span>
                    </button>
                </div>
            </form>

            <!-- STEP 2: VERIFY 6-DIGIT CODE & SET NEW PASSWORD -->
            <form id="form-verify-reset-code" class="space-y-4 hidden">
                <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                    Verification code sent to <strong id="display-recovery-email">---</strong>. Check your Gmail Inbox or Spam folder.
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">6-Digit Verification Code *</label>
                    <input type="text" id="reset-otp-code" required maxlength="8" placeholder="123456"
                        class="w-full px-3.5 py-2.5 text-center text-base font-mono-code font-bold tracking-widest bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none">
                </div>

                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">New Password (6+ characters) *</label>
                    <div class="relative">
                        <input type="password" id="reset-new-password" required minlength="6" placeholder="Enter new password"
                            class="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none">
                        <button type="button" onclick="togglePasswordVisibility('reset-new-password', 'eye-reset-pass')"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                            <i id="eye-reset-pass" data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2">
                    <button type="button" onclick="backToResetStep1()" class="text-xs font-semibold text-slate-500 hover:text-slate-800">
                        ← Change Email
                    </button>
                    <button type="submit" id="btn-confirm-new-password" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition">
                        Verify & Reset Password
                    </button>
                </div>
            </form>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Step 1 Listener: Send OTP to Gmail
    document.getElementById('form-request-reset-code').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawInput = document.getElementById('reset-identifier-input').value.trim();
        const btn = document.getElementById('btn-send-otp');

        btn.disabled = true;
        btn.innerHTML = `<span>Sending code...</span>`;

        try {
            recoveryTargetEmail = await resolveUserIdentifierToEmail(rawInput);

            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(recoveryTargetEmail);
            if (error) throw error;

            document.getElementById('display-recovery-email').textContent = recoveryTargetEmail;
            document.getElementById('form-request-reset-code').classList.add('hidden');
            document.getElementById('form-verify-reset-code').classList.remove('hidden');
        } catch (err) {
            Swal.fire('Recovery Error', err.message || 'Could not send reset code.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="send" class="w-3.5 h-3.5"></i><span>Send Code to Gmail</span>`;
            if (window.lucide) lucide.createIcons();
        }
    });

    // Step 2 Listener: Verify OTP Code & Update Password
    document.getElementById('form-verify-reset-code').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = document.getElementById('reset-otp-code').value.trim();
        const newPassword = document.getElementById('reset-new-password').value;
        const btn = document.getElementById('btn-confirm-new-password');

        btn.disabled = true;
        btn.textContent = 'Verifying & Updating...';

        try {
            // 1. Verify the 6-digit recovery OTP token
            const { error: verifyError } = await window.supabaseClient.auth.verifyOtp({
                email: recoveryTargetEmail,
                token: token,
                type: 'recovery'
            });

            if (verifyError) throw verifyError;

            // 2. Update the user's password now that recovery session is verified
            const { error: updateError } = await window.supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            closeForgotPasswordModal();
            await Swal.fire({
                icon: 'success',
                title: 'Password Reset Complete',
                text: 'Your password has been updated. Redirecting to your workspace...',
                timer: 1500,
                showConfirmButton: false
            });

            window.location.href = 'dashboard.html';
        } catch (err) {
            Swal.fire('Invalid Code', err.message || 'The verification code is invalid or expired.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verify & Reset Password';
        }
    });

    if (window.lucide) lucide.createIcons();
}

window.openForgotPasswordModal = function() {
    injectForgotPasswordModal();
    const modal = document.getElementById('modal-forgot-password');
    document.getElementById('form-request-reset-code').reset();
    document.getElementById('form-verify-reset-code').reset();
    document.getElementById('form-request-reset-code').classList.remove('hidden');
    document.getElementById('form-verify-reset-code').classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeForgotPasswordModal = function() {
    const modal = document.getElementById('modal-forgot-password');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.backToResetStep1 = function() {
    document.getElementById('form-verify-reset-code').classList.add('hidden');
    document.getElementById('form-request-reset-code').classList.remove('hidden');
};

// ============================================================================
// HANDLE REGISTRATION & OPTIONAL FORMAL PICTURE UPLOAD
// ============================================================================
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