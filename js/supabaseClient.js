// ============================================================================
// FILE: js/supabaseClient.js
// Initializes global window.supabaseClient connection
// ============================================================================

const RAW_SUPABASE_URL = "https://tavluoibxqvcfpigzvqu.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdmx1b2lieHF2Y2ZwaWd6dnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjM5MjYsImV4cCI6MjEwODMzOTkyNn0.Hx_U-mM0CDzJmrBvbgc7yPvKMBvpKoIiEREcwXqI2rM";

/**
 * Automatically cleans the URL into https://<project-id>.supabase.co
 */
function sanitizeSupabaseUrl(rawUrl) {
    let url = (rawUrl || "").trim();

    const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
    if (dashboardMatch && dashboardMatch[1]) {
        return `https://${dashboardMatch[1]}.supabase.co`;
    }

    if (/^[a-z0-9]{15,25}$/i.test(url)) {
        return `https://${url}.supabase.co`;
    }

    const apiMatch = url.match(/(https:\/\/[a-z0-9-]+\.supabase\.co)/i);
    if (apiMatch && apiMatch[1]) {
        return apiMatch[1];
    }

    return url.replace(/\/+$/, "");
}

const SUPABASE_URL = sanitizeSupabaseUrl(RAW_SUPABASE_URL);

// Attach directly to window so auth.js, profile.js, and department.js can always find it
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY.trim());
const supabaseClient = window.supabaseClient;

/**
 * Helper: Evaluates if the currently logged-in user has permission to edit a department
 */
window.checkDepartmentPermissions = async function(departmentId, currentUserId) {
    if (!departmentId || !currentUserId) {
        return { isCoordinator: false, isStudentEditor: false, canEditStocks: false, canUpdateStatus: false };
    }

    const { data: dept, error: deptErr } = await window.supabaseClient
        .from('departments')
        .select('primary_coordinator_id, co_coordinator_id')
        .eq('id', departmentId)
        .single();

    if (!deptErr && dept) {
        if (dept.primary_coordinator_id === currentUserId || dept.co_coordinator_id === currentUserId) {
            return {
                isCoordinator: true,
                isStudentEditor: false,
                canEditStocks: true,
                canUpdateStatus: true
            };
        }
    }

    const { data: editorRecord, error: editorErr } = await window.supabaseClient
        .from('department_student_editors')
        .select('can_edit_stocks, can_update_status')
        .eq('department_id', departmentId)
        .eq('student_id', currentUserId)
        .maybeSingle();

    if (!editorErr && editorRecord) {
        return {
            isCoordinator: false,
            isStudentEditor: true,
            canEditStocks: editorRecord.can_edit_stocks,
            canUpdateStatus: editorRecord.can_update_status
        };
    }

    return { isCoordinator: false, isStudentEditor: false, canEditStocks: false, canUpdateStatus: false };
};