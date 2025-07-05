import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { User as AppUser } from '../types/legal';
import { LegalCaseService } from './LegalCaseService';

export interface AuthState {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  hasUsers: boolean;
}

export interface AuthCallbacks {
  onAuthStateChange?: (state: AuthState) => void;
  onError?: (error: string) => void;
}

export class AuthService {
  private static instance: AuthService | null = null;
  private callbacks: AuthCallbacks = {};
  private currentState: AuthState = {
    user: null,
    session: null,
    loading: true,
    error: null,
    hasUsers: false
  };

  private caseService = new LegalCaseService();

  private constructor() {
    // Don't initialize immediately, wait for explicit initialization
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize authentication state listener
   */
  private initializeAuthListener(): void {
    if (!supabase) {
      console.warn('Supabase not configured, skipping auth listener');
      this.updateState({ 
        loading: false, 
        hasUsers: true,
        error: 'Authentication service unavailable - running in demo mode'
      });
      return;
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      try {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await this.handleSignIn(session);
        } else if (event === 'SIGNED_OUT') {
          this.handleSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await this.handleTokenRefresh(session);
        } else if (event === 'USER_UPDATED' && session?.user) {
          await this.handleUserUpdate(session);
        } else if (event === 'INITIAL_SESSION' && !session?.user) {
          // No session found, ensure we're not loading
          this.updateState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        
        // Check if it's a network error
        const isNetworkError = error instanceof Error && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('fetch'));
        
        this.updateState({
          loading: false,
          error: isNetworkError 
            ? 'Authentication service unavailable - please check your connection'
            : (error instanceof Error ? error.message : 'Authentication error')
        });
      }
    });
  }

  /**
   * Handle user sign in
   */
  private async handleSignIn(session: Session): Promise<void> {
    try {
      const appUser = await this.loadUserProfile(session.user);
      
      if (!appUser) {
        // User exists in auth but not in our database - sign them out
        console.warn('User exists in auth but not in database, signing out');
        if (supabase) {
          await supabase.auth.signOut();
        }
        throw new Error('User profile not found. Please contact your administrator.');
      }

      if (!appUser.isActive) {
        // User is deactivated - sign them out
        if (supabase) {
          await supabase.auth.signOut();
        }
        throw new Error('Your account has been deactivated. Please contact your administrator.');
      }

      // Update last login
      await this.updateLastLogin(appUser.id);

      this.updateState({
        user: appUser,
        session,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Check if it's a network error
      const isNetworkError = error instanceof Error && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('NetworkError') ||
         error.message.includes('fetch'));
      
      this.updateState({
        loading: false,
        error: isNetworkError 
          ? 'Unable to connect to authentication service. Please check your connection and try again.'
          : (error instanceof Error ? error.message : 'Failed to load user profile')
      });
    }
  }

  /**
   * Handle user sign out
   */
  private handleSignOut(): void {
    this.updateState({
      user: null,
      session: null,
      loading: false,
      error: null
    });
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(session: Session): Promise<void> {
    try {
      const appUser = await this.loadUserProfile(session.user);
      
      if (appUser) {
        this.updateState({
          user: appUser,
          session,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Don't sign out on token refresh failure, just log the error
      console.warn('Token refresh failed, but continuing with existing session');
    }
  }

  /**
   * Handle user profile updates
   */
  private async handleUserUpdate(session: Session): Promise<void> {
    try {
      const appUser = await this.loadUserProfile(session.user);
      
      if (appUser) {
        this.updateState({
          user: appUser,
          session,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('User update error:', error);
      // If user update fails, sign out
      await this.signOut();
    }
  }

  /**
   * Load user profile from database
   */
  private async loadUserProfile(authUser: User): Promise<AppUser | null> {
    try {
      if (!supabase) {
        throw new Error('Database not configured');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found in our users table
          console.warn('User exists in auth but not in users table:', authUser.email);
          return null;
        }
        throw error;
      }

      return this.mapUserRow(data);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      if (!supabase) {
        return;
      }

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Don't throw error for last login update failure
    }
  }

  /**
   * Update internal state and notify callbacks
   */
  private updateState(updates: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    
    if (this.callbacks.onAuthStateChange) {
      this.callbacks.onAuthStateChange(this.currentState);
    }

    if (updates.error && this.callbacks.onError) {
      this.callbacks.onError(updates.error);
    }
  }

  /**
   * Map database row to AppUser interface
   */
  private mapUserRow(row: any): AppUser {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      officeId: row.office_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined
    };
  }

  // Public API methods

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Database not configured');
      }

      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        throw this.mapAuthError(error);
      }

      if (!data.user) {
        throw new Error('Login failed - no user returned');
      }

      // State will be updated via the auth state change listener
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      
      this.updateState({
        loading: false,
        error: errorMessage
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      if (!supabase) {
        this.handleSignOut();
        return;
      }

      this.updateState({ loading: true, error: null });
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // State will be updated via the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error);
      this.updateState({
        loading: false,
        error: 'Failed to sign out. Please try again.'
      });
      throw error;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Session | null> {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }

      return session;
    } catch (error) {
    }
  }

  /**
   * Initialize authentication state
   */
  async initialize(): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });

      // Check if any users exist in the system
      await this.checkIfUsersExist();

      // Set up auth listener
      this.initializeAuthListener();

      try {
        const session = await this.getCurrentSession();
        
        if (session?.user) {
          await this.handleSignIn(session);
        } else {
          this.updateState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
        }
      } catch (sessionError) {
        console.warn('Failed to get current session, continuing without auth:', sessionError);
        this.updateState({
          user: null,
          session: null,
          loading: false,
          error: 'Authentication service unavailable'
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      
      const isNetworkError = error instanceof Error && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('NetworkError') ||
         error.message.includes('fetch'));
      
      this.updateState({
        loading: false,
        error: isNetworkError 
          ? 'Authentication service unavailable - running in offline mode'
          : (error instanceof Error ? error.message : 'Failed to initialize authentication')
      });
    }
  }

  /**
   * Check if any users exist in the database
   */
  private async checkIfUsersExist(): Promise<void> {
    try {
      if (!supabase) {
        this.updateState({ hasUsers: true });
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('Failed to check if users exist, assuming users exist:', error);
        this.updateState({ hasUsers: true });
        return;
      }

      const hasUsers = (data && data.length > 0);
      this.updateState({ hasUsers });
      
      console.log('Users exist in system:', hasUsers);
    } catch (error) {
      console.warn('Error checking if users exist, assuming users exist:', error);
      this.updateState({ hasUsers: true });
    }
  }

  /**
 * Register the first user (space owner)
 */
async signUpFirstUser(email: string, name: string, password: string): Promise<void> {
  try {
    if (!supabase) {
      throw new Error('Database not configured');
    }

    this.updateState({ loading: true, error: null });

    // Create user in Supabase Auth with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: undefined, // Disable email confirmation
        data: {
          name: name.trim(),
          role: 'admin' // This will be used by the trigger
        }
      }
    });

    if (authError) {
      throw this.mapAuthError(authError);
    }

    if (!authData.user) {
      throw new Error('Registration failed - no user returned');
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Wait a moment for the trigger to create the user record
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the user was created in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found in users table after creation:', userError);
      // Try to create manually as fallback
      const { error: manualCreateError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.trim(),
          name: name.trim(),
          role: 'admin',
          is_active: true
        });

      if (manualCreateError) {
        throw new Error('Failed to create user profile. Please try again.');
      }
    }

    // Update state to reflect that users now exist
    this.updateState({ hasUsers: true });

    // Sign in the newly created user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      console.error('Auto sign-in failed after registration:', signInError);
      this.updateState({
        loading: false,
        error: 'Registration successful! Please sign in with your credentials.'
      });
      return;
    }

    console.log('✅ Admin user registered and signed in successfully');

  } catch (error) {
    console.error('Admin user registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again.';

    this.updateState({
      loading: false,
      error: errorMessage
    });

    throw new Error(errorMessage);
  }
}

  /**
   * Register callbacks for auth state changes
   */
  setCallbacks(callbacks: AuthCallbacks): () => void {
    this.callbacks = callbacks;
    
    // Return unsubscribe function
    return () => {
      this.callbacks = {};
    };
  }

  /**
   * Get current auth state
   */
  getCurrentState(): AuthState {
    return { ...this.currentState };
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Map Supabase auth errors to user-friendly messages
   */
  private mapAuthError(error: any): Error {
    let message = 'Login failed. Please try again.';
    
    if (error.message.includes('Invalid login credentials')) {
      message = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.message.includes('Email not confirmed')) {
      message = 'Please check your email and confirm your account before signing in.';
    } else if (error.message.includes('Too many requests')) {
      message = 'Too many login attempts. Please wait a moment and try again.';
    } else if (error.message.includes('User not found')) {
      message = 'Account not found. Please contact your administrator.';
    } else if (error.message.includes('signup_disabled')) {
      message = 'Account registration is disabled. Please contact your administrator.';
    }

    return new Error(message);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: AppUser['role']): boolean {
    return this.currentState.user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: AppUser['role'][]): boolean {
    return this.currentState.user ? roles.includes(this.currentState.user.role) : false;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is lawyer
   */
  isLawyer(): boolean {
    return this.hasRole('lawyer');
  }

  /**
   * Check if user is client
   */
  isClient(): boolean {
    return this.hasRole('client');
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();