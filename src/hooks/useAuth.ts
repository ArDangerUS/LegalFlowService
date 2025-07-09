// src/hooks/useAuth.ts - Обновленный хук для работы с AuthService

import { useState, useEffect } from 'react';
import { authService, type AuthState } from '../services/AuthService';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => 
    authService.getCurrentState()
  );

  useEffect(() => {
    // Устанавливаем слушатель изменений состояния
    const unsubscribe = authService.setCallbacks({
      onAuthStateChange: (state) => {
        setAuthState(state);
      },
      onError: (error) => {
        console.error('Auth error:', error);
      }
    });

    // Инициализируем сервис авторизации
    authService.initialize().catch(error => {
      console.error('Failed to initialize auth service:', error);
    });

    // Возвращаем функцию для очистки подписки
    return unsubscribe;
  }, []);

  // Методы для работы с авторизацией
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

  const reinitialize = async (): Promise<void> => {
    await authService.initialize();
  };

  return {
    // Состояние
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    hasUsers: authState.hasUsers,
    
    // Методы авторизации
    signIn,
    signOut,
    signUpFirstUser,
    clearError,
    reinitialize,
    
    // Методы проверки ролей (для экземпляра)
    hasRole: authService.hasRole.bind(authService),
    hasAnyRole: authService.hasAnyRole.bind(authService),
    isAdmin: authService.isAdmin.bind(authService),
    isOfficeAdmin: authService.isOfficeAdmin.bind(authService),
    isLawyer: authService.isLawyer.bind(authService),
    isClient: authService.isClient.bind(authService)
  };
}