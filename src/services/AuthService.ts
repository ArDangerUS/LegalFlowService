// src/services/AuthService.ts - Полный объединенный AuthService

import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User, Office, UserRole } from '../types/user';
import { LegalCaseService } from './LegalCaseService';

export interface AuthState {
  user: User | null;
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
    // Приватный конструктор для Singleton
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Получение текущего состояния
  getCurrentState(): AuthState {
    return { ...this.currentState };
  }

  // Установка колбэков
  setCallbacks(callbacks: AuthCallbacks): () => void {
    this.callbacks = callbacks;
    return () => {
      this.callbacks = {};
    };
  }

  // Очистка ошибки
  clearError(): void {
    this.updateState({ error: null });
  }

  // Обновление состояния
  private updateState(updates: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    if (this.callbacks.onAuthStateChange) {
      this.callbacks.onAuthStateChange(this.currentState);
    }
  }

  // Инициализация сервиса
  async initialize(): Promise<void> {
    try {
      this.updateState({ loading: true, error: null });

      if (!supabase) {
        console.warn('Supabase not configured, running in demo mode');
        this.updateState({
          loading: false,
          hasUsers: true,
          error: 'Authentication service unavailable - running in demo mode'
        });
        return;
      }

      // Проверяем, есть ли пользователи в системе
      await this.checkIfUsersExist();

      // Устанавливаем слушатель авторизации
      this.initializeAuthListener();

      // Проверяем текущую сессию
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Session error:', error);
      }

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

    } catch (error) {
      console.error('Auth initialization error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication initialization failed'
      });
    }
  }

  // Инициализация слушателя авторизации
  private initializeAuthListener(): void {
    if (!supabase) return;

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      try {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await this.handleSignIn(session);
        } else if (event === 'SIGNED_OUT') {
          this.handleSignOut();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          await this.handleTokenRefresh(session);
        } else if (event === 'INITIAL_SESSION' && !session?.user) {
          this.updateState({
            user: null,
            session: null,
            loading: false,
            error: null
          });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        this.updateState({
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        });
      }
    });
  }

  // Обработка входа пользователя
  private async handleSignIn(session: Session): Promise<void> {
    try {
      const appUser = await this.loadUserProfile(session.user);

      if (!appUser) {
        console.warn('User exists in auth but not in database, signing out');
        if (supabase) {
          await supabase.auth.signOut();
        }
        throw new Error('User profile not found. Please contact your administrator.');
      }

      if (!appUser.isActive) {
        if (supabase) {
          await supabase.auth.signOut();
        }
        throw new Error('Your account has been deactivated. Please contact your administrator.');
      }

      // Обновляем время последнего входа
      await this.updateLastLogin(appUser.id);

      this.updateState({
        user: appUser,
        session,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Sign in error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load user profile'
      });
    }
  }

  // Обработка выхода пользователя
  private handleSignOut(): void {
    this.updateState({
      user: null,
      session: null,
      loading: false,
      error: null
    });
  }

  // Обработка обновления токена
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
    }
  }

  // Загрузка профиля пользователя
  private async loadUserProfile(user: SupabaseUser): Promise<User | null> {
    try {
      if (!supabase) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !userData) {
        console.error('User profile not found:', error);
        return null;
      }

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        officeId: userData.office_id,
        isActive: userData.is_active,
        createdAt: userData.created_at,
        lastLogin: userData.last_login
      };

    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  }

  // Обновление времени последнего входа
  private async updateLastLogin(userId: string): Promise<void> {
    try {
      if (!supabase) return;

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  // Проверка существования пользователей
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
        console.warn('Failed to check if users exist:', error);
        this.updateState({ hasUsers: true });
        return;
      }

      const hasUsers = data && data.length > 0;
      this.updateState({ hasUsers });

    } catch (error) {
      console.warn('Error checking if users exist:', error);
      this.updateState({ hasUsers: true });
    }
  }

  // Вход в систему
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

      if (data.user) {
        await this.handleSignIn({ ...data.session, user: data.user } as Session);
      }

    } catch (error) {
      console.error('Sign in error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
      throw error;
    }
  }

  // Выход из системы
  async signOut(): Promise<void> {
    try {
      if (!supabase) {
        this.updateState({ user: null, session: null });
        return;
      }

      this.updateState({ loading: true });

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      this.updateState({
        user: null,
        session: null,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Sign out error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      });
    }
  }

  // Регистрация первого пользователя
  async signUpFirstUser(email: string, name: string, password: string): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Database not configured');
      }

      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            role: 'admin'
          }
        }
      });

      if (error) {
        throw this.mapAuthError(error);
      }

      if (data.user) {
        // Ждем создания профиля
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          // Создаем профиль вручную
          await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: email.trim(),
              name: name.trim(),
              role: 'admin',
              is_active: true
            });
        }

        this.updateState({ hasUsers: true });

        if (data.session) {
          await this.handleSignIn(data.session);
        }
      }

    } catch (error) {
      console.error('Sign up error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
      throw error;
    }
  }

  // Маппинг ошибок авторизации
  private mapAuthError(error: any): Error {
    let message = error.message || 'Authentication error occurred';

    if (error.message?.includes('Invalid login credentials')) {
      message = 'Invalid email or password. Please check your credentials and try again.';
    } else if (error.message?.includes('Email not confirmed')) {
      message = 'Please confirm your email address before signing in.';
    } else if (error.message?.includes('Too many requests')) {
      message = 'Too many login attempts. Please try again later.';
    } else if (error.message?.includes('signup_disabled')) {
      message = 'Account registration is disabled. Please contact your administrator.';
    }

    return new Error(message);
  }

  // МЕТОДЫ ПРОВЕРКИ ПРАВ (ваши новые методы)

  // Проверка прав пользователя
  static canUserPerformAction(
    user: User,
    action: string,
    resource: string,
    targetOfficeId?: string
  ): boolean {
    const { role, officeId } = user;

    switch (role) {
      case 'admin':
        return true; // Полный доступ

      case 'office_admin':
        if (action === 'create_invitation' || action === 'manage_users') {
          // Может приглашать только в свой офис
          return !!(officeId && (!targetOfficeId || officeId === targetOfficeId));
        }
        if (action === 'view_cases' || action === 'assign_cases') {
          return !!(officeId && (!targetOfficeId || officeId === targetOfficeId));
        }
        return false;

      case 'lawyer':
        if (action === 'view_cases' || action === 'view_messages') {
          // Может видеть дела своего офиса
          return !!(officeId && (!targetOfficeId || officeId === targetOfficeId));
        }
        return false;

      default:
        return false;
    }
  }

  // Получение доступных ролей для приглашения
  static getAvailableRolesForInvitation(userRole: UserRole): UserRole[] {
    switch (userRole) {
      case 'admin':
        return ['admin', 'office_admin', 'lawyer', 'client'];
      case 'office_admin':
        return ['lawyer', 'client'];
      default:
        return [];
    }
  }

  // Получение доступных офисов для приглашения
  static getAvailableOfficesForInvitation(
    user: User,
    allOffices: Office[]
  ): Office[] {
    if (user.role === 'admin') {
      return allOffices;
    }
    if (user.role === 'office_admin' && user.officeId) {
      return allOffices.filter(office => office.id === user.officeId);
    }
    return [];
  }

  // МЕТОДЫ ПРОВЕРКИ РОЛЕЙ (для экземпляра)

  hasRole(role: UserRole): boolean {
    return this.currentState.user?.role === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return this.currentState.user ? roles.includes(this.currentState.user.role) : false;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isOfficeAdmin(): boolean {
    return this.hasRole('office_admin');
  }

  isLawyer(): boolean {
    return this.hasRole('lawyer');
  }

  isClient(): boolean {
    return this.hasRole('client');
  }
}

// Экспортируем экземпляр
export const authService = AuthService.getInstance();