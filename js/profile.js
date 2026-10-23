/**
 * Allows the user to upload or change their formal picture anytime from the Dashboard
 */
async function uploadPhotoLater(event) {
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

        const { error: uploadError } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);

        const newAvatarUrl = publicUrlData.publicUrl;

        const { error: updateErr } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: newAvatarUrl })
            .eq('id', profile.id);

        if (updateErr) throw updateErr;

        window.currentUserProfile.avatar_url = newAvatarUrl;
        renderUserProfileCard(window.currentUserProfile);

        if (typeof loadDepartments === 'function') {
            await loadDepartments();
        }

        Swal.fire({ icon: 'success', title: 'Formal Photo Updated!', timer: 1200, showConfirmButton: false });
    } catch (err) {
        Swal.fire('Upload Failed', err.message || 'Could not update photo.', 'error');
    }
}