// ============================================================================
// FILE: js/supabaseClient.js
// Initializes Supabase connection and shared permission helpers
// ============================================================================

const SUPABASE_URL = "https://tavluoibxqvcfpigzvqu.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdmx1b2lieHF2Y2ZwaWd6dnF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjM5MjYsImV4cCI6MjEwODMzOTkyNn0.Hx_U-mM0CDzJmrBvbgc7yPvKMBvpKoIiEREcwXqI2rM";

// Initialize the global Supabase client (loaded via CDN in HTML)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper: Evaluates if the currently logged-in user has permission to edit a department
 * Returns an object: { isCoordinator, isStudentEditor, canEditStocks, canUpdateStatus }
 */
async function checkDepartmentPermissions(departmentId, currentUserId) {
    if (!departmentId || !currentUserId) {
        return { isCoordinator: false, isStudentEditor: false, canEditStocks: false, canUpdateStatus: false };
    }

    // 1. Check if user is the Primary Coordinator or Co-Coordinator
    const { data: dept, error: deptErr } = await supabaseClient
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

    // 2. If not a coordinator, check if the user is an Authorized Student Editor
    const { data: editorRecord, error: editorErr } = await supabaseClient
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

    // 3. Default: Regular Viewer (No edit permissions)
    return { isCoordinator: false, isStudentEditor: false, canEditStocks: false, canUpdateStatus: false };
}