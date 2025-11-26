// Fallback client for Supabase REST API when direct database connection fails
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role key for server-side operations
export const supabaseRestClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Fallback functions for database operations
export async function getSitesByUserEmail(email: string) {
  try {
    // First get the user ID by email
    const { data: users, error: userError } = await supabaseRestClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) throw userError;
    if (!users) throw new Error('User not found');

    // Then get sites for that user
    const { data: sites, error: siteError } = await supabaseRestClient
      .from('sites')
      .select('id, name, createdAt, widgetSettings')
      .eq('userId', users.id)
      .order('createdAt', { ascending: false });

    if (siteError) throw siteError;
    
    return sites || [];
  } catch (error) {
    console.error('Error fetching sites via REST API:', error);
    throw error;
  }
}

export async function getSiteByUserId(userId: string) {
  try {
    const { data: sites, error: siteError } = await supabaseRestClient
      .from('sites')
      .select('id, name, userId, bots(id, name, welcomeMessage, widgetSettings, scriptEmbedId)')
      .eq('userId', userId)
      .limit(1)
      .single();

    if (siteError) throw siteError;
    
    return sites || null;
  } catch (error) {
    console.error('Error fetching site by user ID via REST API:', error);
    throw error;
  }
}

export async function createSite(userId: string, name: string, widgetSettings: any = {}) {
  try {
    const { data, error } = await supabaseRestClient
      .from('sites')
      .insert({
        userId,
        name,
        widgetSettings,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating site via REST API:', error);
    throw error;
  }
}

export async function updateWidgetSettings(siteId: string, widgetSettings: any) {
  try {
    const { data, error } = await supabaseRestClient
      .from('sites')
      .update({ widgetSettings })
      .eq('id', siteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating widget settings via REST API:', error);
    throw error;
  }
}

export async function getSiteById(siteId: string) {
  try {
    const { data, error } = await supabaseRestClient
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching site via REST API:', error);
    throw error;
  }
}