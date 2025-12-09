import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Load .env from monorepo root before creating clients
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Supabase client for server-side (uses service_role key with full access)
export const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// Supabase client for client-side (uses anon key with RLS)
export const supabaseAnon = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

// Helper function to check connection
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('movies').select('count');
        if (error) throw error;
        return { success: true, message: 'Connected to Supabase' };
    } catch (error) {
        return { success: false, message: `Connection failed: ${error}` };
    }
}



