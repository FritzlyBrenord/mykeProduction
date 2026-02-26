import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for server usage (admin operations)
// This will throw an error if called in the browser, which is expected as it should only be used in server-side code
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper to check if user is admin
export async function isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !data) return false;
    return data.role === 'admin';
}

// Helper to log audit actions
export async function logAudit(
    userId: string | null,
    action: string,
    tableName: string | null,
    recordId: string | null,
    oldData: any = null,
    newData: any = null,
    ipAddress: string | null = null,
    userAgent: string | null = null
) {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: newData,
        ip_address: ipAddress,
        user_agent: userAgent,
    });

    if (error) {
        console.error('Failed to log audit:', error);
    }
}
