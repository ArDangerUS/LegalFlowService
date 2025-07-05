import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables
console.log('Environment variables loaded:', {
  url: supabaseUrl ? '✓ Present' : '❌ Missing',
  key: supabaseAnonKey ? '✓ Present' : '❌ Missing'
});

// Validate if URL is actually valid (not just a placeholder)
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidSupabaseUrl = !!(
  supabaseUrl && 
  typeof supabaseUrl === 'string' &&
  supabaseUrl.trim() !== '' &&
  supabaseUrl !== 'your_supabase_project_url' && 
  isValidUrl(supabaseUrl) &&
  supabaseUrl.includes('.supabase.co')
);

const isValidSupabaseKey = !!(
  supabaseAnonKey && 
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim() !== '' &&
  supabaseAnonKey !== 'your_supabase_anon_key' &&
  supabaseAnonKey.length > 50 // JWT tokens are typically much longer
);

// Validate environment variables
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: !!(isValidSupabaseUrl && isValidSupabaseKey)
};

if (!supabaseConfig.isConfigured) {
  console.warn('⚠️ Supabase not configured. Running in offline mode. Please check your .env file and restart the development server.');
}

export const supabase = supabaseConfig.isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  : null;

// Test Supabase connection
export const testSupabaseConnection = async (retries = 2): Promise<{ success: boolean; error?: string; details?: any }> => {
  if (!supabase) {
    return { 
      success: false, 
      error: 'Supabase not configured. Missing environment variables.',
      details: { configured: false, url: !!supabaseUrl, key: !!supabaseAnonKey }
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // First, test basic connectivity with a simple REST endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
      
      try {
        // Test basic connectivity first
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // If we can't even reach the server, it's a network issue
        if (!response.ok && (response.status >= 500 || response.status === 0)) {
          throw new Error(`Supabase server error: ${response.status} ${response.statusText}`);
        }
        
        // Now try a simple database query
        const queryResult = await supabase!
          .from('conversations')
          .select('count')
          .limit(1);
        
        const { data, error } = queryResult;
        
        if (error) {
          // If it's the last attempt, return the error
          if (attempt === retries) {
            return { 
              success: false, 
              error: `Database query failed: ${error.message}`,
              details: { 
                supabaseError: error, 
                url: supabaseUrl,
                attempt: attempt + 1,
                totalAttempts: retries + 1,
                errorCode: error.code,
                errorHint: error.hint
              }
            };
          }
          // Otherwise, continue to next attempt
          continue;
        }
        
        return { success: true };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('Failed to fetch') ||
                           errorMessage.includes('NetworkError') ||
                           errorMessage.includes('Connection timeout') ||
                           errorMessage.includes('ERR_NETWORK') ||
                           errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
                           errorMessage.includes('AbortError') ||
                           errorMessage.includes('TypeError: Failed to fetch') ||
                           err instanceof TypeError;
      
      // If it's the last attempt, return the final error
      if (attempt === retries) {
        if (isNetworkError) {
          return { 
            success: false, 
            error: `Cannot connect to Supabase database. This appears to be a network connectivity issue.`,
            details: {
              isNetworkError: true,
              url: supabaseUrl,
              originalError: errorMessage,
              suggestions: [
                'Check your internet connection',
                'Verify your Supabase project is active (not paused) at https://supabase.com/dashboard',
                'Check if any firewall, VPN, or corporate network is blocking the connection',
                'Verify the VITE_SUPABASE_URL is correct in your .env file',
                'Ensure VITE_SUPABASE_ANON_KEY is valid in your .env file',
                'Try restarting your development server after updating .env',
                'Test the connection from a different network if possible'
              ]
            }
          };
        }
        
        return { 
          success: false, 
          error: `Connection error: ${errorMessage}`,
          details: { 
            originalError: err, 
            url: supabaseUrl,
            attempt: attempt + 1,
            totalAttempts: retries + 1
          }
        };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  // This shouldn't be reached, but just in case
  return { 
    success: false, 
    error: 'Connection test failed after multiple attempts',
    details: { retries, url: supabaseUrl }
  };
};

// Alternative connection test that's more lenient
export const testBasicSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { 
      success: false, 
      error: 'Supabase not configured' 
    };
  }

  try {
    // Test with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Just test if we can reach the Supabase URL
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseAnonKey
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 401 || response.status === 403) {
        // 401/403 means we reached Supabase but auth failed, which is still a "connection"
        return { success: true };
      }
      
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { 
        success: false, 
        error: 'Connection timeout - Supabase is unreachable' 
      };
    }
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          type: string;
          name: string;
          created_at: string;
          updated_at: string;
          last_message_id: string | null;
          unread_count: number;
          is_archived: boolean;
          is_muted: boolean;
          settings: any;
          metadata: any;
          telegram_chat_identifier: string | null;
        };
        Insert: {
          id?: string;
          type?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          unread_count?: number;
          is_archived?: boolean;
          is_muted?: boolean;
          settings?: any;
          metadata?: any;
          telegram_chat_identifier?: string | null;
        };
        Update: {
          id?: string;
          type?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          unread_count?: number;
          is_archived?: boolean;
          is_muted?: boolean;
          settings?: any;
          metadata?: any;
          telegram_chat_identifier?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          sender_name: string;
          recipient_id: string;
          recipient_name: string;
          content: string;
          message_type: string;
          timestamp: string;
          edited_at: string | null;
          is_edited: boolean;
          status: string;
          attachments: any;
          metadata: any;
          thread_id: string | null;
          reply_to_id: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          telegram_message_id: number | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          sender_name: string;
          recipient_id: string;
          recipient_name: string;
          content: string;
          message_type?: string;
          timestamp?: string;
          edited_at?: string | null;
          is_edited?: boolean;
          status?: string;
          attachments?: any;
          metadata?: any;
          thread_id?: string | null;
          reply_to_id?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          telegram_message_id?: number | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          sender_name?: string;
          recipient_id?: string;
          recipient_name?: string;
          content?: string;
          message_type?: string;
          timestamp?: string;
          edited_at?: string | null;
          is_edited?: boolean;
          status?: string;
          attachments?: any;
          metadata?: any;
          thread_id?: string | null;
          reply_to_id?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          telegram_message_id?: number | null;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          user_name: string;
          role: string;
          joined_at: string;
          last_seen_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          user_name: string;
          role?: string;
          joined_at?: string;
          last_seen_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          user_name?: string;
          role?: string;
          joined_at?: string;
          last_seen_at?: string | null;
          is_active?: boolean;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          token: string;
          role: string;
          office_id: string | null;
          created_by: string;
          expires_at: string;
          status: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          role: string;
          office_id?: string | null;
          created_by: string;
          expires_at: string;
          status?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          token?: string;
          role?: string;
          office_id?: string | null;
          created_by?: string;
          expires_at?: string;
          status?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
      };
    };
  };
};