// Простая рабочая версия AuthService без лишних сложностей

import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { User, UserRole } from '../types/user';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  hasUsers: boolean;
}

export interface AuthCallbacks {
  onAuthStateChange?: (state: AuthState) => void;
  onError?: (error: Error) => void;
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

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  getCurrentState(): AuthState {
    return { ...this.currentState };
  }

  setCallbacks(callbacks: AuthCallbacks): () => void {
    this.callbacks = callbacks;
    return () => {
      this.callbacks = {};
    };
  }

  clearError(): void {
    this.setState({ error: null });
  }

  private setState(updates: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.callbacks.onAuthStateChange?.(this.currentState);
  }

  async initialize(): Promise<void> {
    try {
      this.setState({ loading: true });

      if (!supabase) {
        this.setState({
          loading: false,
          hasUsers: true,
          error: 'Supabase not configured'
        });
        return;
      }

      // Простая проверка сессии
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await this.loadUserProfile(session);
      } else {
        this.setState({
          session: null,
          user: null,
          loading: false,
          hasUsers: true // Предполагаем, что пользователи есть
        });
      }

      // Устанавливаем слушатель
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await this.loadUserProfile(session);
        } else if (event === 'SIGNED_OUT') {
          this.setState({
            session: null,
            user: null,
            loading: false,
            error: null
          });
        }
      });

    } catch (error) {
      this.setState({
        loading: false,
        error: 'Initialization failed'
      });
    }
  }

  private async loadUserProfile(session: Session): Promise<void> {
    try {
      // Сохраняем токен
      localStorage.setItem('auth_token', session.access_token);

      let userData: User;

      // Пытаемся получить пользователя из БД
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        userData = data;
      } else {
        // Если не найден, создаем базовый профиль
        userData = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
          role: 'admin', // Или определите логику
          office_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
      }

      this.setState({
        session,
        user: userData,
        loading: false,
        error: null
      });

    } catch (error) {
      this.setState({
        loading: false,
        error: 'Failed to load user profile'
      });
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      this.setState({ loading: true, error: null });

      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // loadUserProfile будет вызван автоматически через onAuthStateChange

    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      localStorage.removeItem('auth_token');
      await supabase?.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  getCurrentToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Методы проверки ролей
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

  // Статические методы для проверки прав
  static canUserPerformAction(
    user: User,
    action: string,
    resource: string,
    targetOfficeId?: string
  ): boolean {
    if (user.role === 'admin') return true;
    // Добавьте другую логику по необходимости
    return false;
  }

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

  static getAvailableOfficesForInvitation(user: User, allOffices: any[]): any[] {
    if (user.role === 'admin') return allOffices;
    if (user.role === 'office_admin' && user.office_id) {
      return allOffices.filter(office => office.id === user.office_id);
    }
    return [];
  }
}

export const authService = AuthService.getInstance();