import { useState, useEffect } from 'react';
import { authService, type AuthState } from '../services/AuthService';
import type { User } from '../types/legal';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => authService.getCurrentState());

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      // Set up auth state change listener
      const unsubscribe = authService.setCallbacks({
        onAuthStateChange: (state) => {
          setAuthState(state);
        },
        onError: (error) => {
          console.error('Auth error:', error);
        }
      });

      // Initialize authentication
      await authService.initialize();
      
      return unsubscribe;
    };

    let unsubscribe: (() => void) | null = null;
    
    initializeAuth().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    await authService.signIn(email, password);
  };

  const signOut = async (): Promise<void> => {
    await authService.signOut();
  };

  const signUpFirstUser = async (email: string, name: string, password: string): Promise<void> => {
    await authService.signUpFirstUser(email, name, password);
  };

  const clearError = (): void => {
    authService.clearError();
  };

  const initializeUser = async (): Promise<void> => {
    await authService.initialize();
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    hasUsers: authState.hasUsers,
    signIn,
    signOut,
    signUpFirstUser,
    clearError,
    initializeUser,
    // Role checking utilities
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    isAdmin: authService.isAdmin.bind(authService),
    isLawyer: authService.isLawyer.bind(authService),
    isClient: authService.isClient.bind(authService)
  };
}